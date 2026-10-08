import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CONFIG} from './config.mjs';
import {noSecrets} from './packet.mjs';
export const SYSTEM=fs.readFileSync(new URL('./reviewer.txt',import.meta.url),'utf8').replaceAll('\r\n','\n');
export function loadSecret(){
 if(process.platform!=='win32')throw new Error('Windows current-user DPAPI is required.');
 try{
  const key=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./read-secret.ps1',import.meta.url))],{encoding:'utf8',maxBuffer:16384,timeout:15000,windowsHide:true,env:{...process.env,FORCE_REVIEW_SECRET_PIPE:'1'},stdio:['ignore','pipe','pipe']}).trim();
  if(key.length<20||/\s/.test(key))throw new Error();return key;
 }catch{throw new Error('Encrypted FORCE review secret unavailable; run setup-secret.ps1 as the same Windows user.');}
}
export function upperCost(bytes,tokens=CONFIG.maxOutputTokens,cache=true){
 return ((bytes+4096)*CONFIG.pricing.input+(Buffer.byteLength(SYSTEM)+4096)*(cache?CONFIG.pricing.cacheWrite5m:CONFIG.pricing.input)+tokens*CONFIG.pricing.output)/1e6;
}
export function usageCost(usage,model){
 if(!usage||model!==CONFIG.model||!Number.isSafeInteger(usage.input_tokens)||!Number.isSafeInteger(usage.output_tokens))return null;
 const fields=['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'];
 if(fields.some(k=>!Number.isSafeInteger(usage[k]??0)||(usage[k]??0)<0))return null;
 if(usage.service_tier&&usage.service_tier!=='standard'||usage.inference_geo&&usage.inference_geo!=='global')return null;
 const w=usage.cache_creation_input_tokens??0,h=usage.cache_creation?.ephemeral_1h_input_tokens??0,f=usage.cache_creation?.ephemeral_5m_input_tokens;
 if(!Number.isSafeInteger(h)||h<0||h>w||(f!==undefined&&(!Number.isSafeInteger(f)||f<0||f+h!==w)))return null;
 const p=CONFIG.pricing;return (usage.input_tokens*p.input+usage.output_tokens*p.output+(w-h)*p.cacheWrite5m+h*p.cacheWrite1h+(usage.cache_read_input_tokens??0)*p.cacheRead)/1e6;
}
function exactKeys(v,keys){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');}
export function parseReview(text,packet){
 let r;try{r=JSON.parse(text);}catch{throw new Error('MALFORMED_REVIEW_JSON');}
 if(!exactKeys(r,['verdict','summary','findings','limitations','scope'])||!['ACCEPTED','ACCEPTED WITH MINORS','CORRECTIONS REQUIRED','REJECTED'].includes(r.verdict)||typeof r.summary!=='string'||!r.summary.trim()||!Array.isArray(r.findings)||!Array.isArray(r.limitations)||r.limitations.some(x=>typeof x!=='string')||!exactKeys(r.scope,['start_sha','end_sha'])||r.scope.start_sha!==packet.start||r.scope.end_sha!==packet.end)throw new Error('INVALID_REVIEW_SCHEMA_OR_SCOPE');
 for(const f of r.findings)if(!exactKeys(f,['severity','kind','location','evidence','impact','correction'])||!['BLOCKER','MATERIAL','MINOR','OPTIONAL'].includes(f.severity)||!['actual defect','methodological disagreement','unproven assumption','useful follow-up','style/preference'].includes(f.kind)||['location','evidence','impact','correction'].some(k=>typeof f[k]!=='string'||!f[k].trim()))throw new Error('INVALID_FINDING_SCHEMA');
 const severities=r.findings.map(f=>f.severity),material=severities.some(x=>x==='BLOCKER'||x==='MATERIAL');
 if(r.verdict==='ACCEPTED'&&severities.some(x=>x!=='OPTIONAL')||r.verdict==='ACCEPTED WITH MINORS'&&(material||!severities.includes('MINOR'))||r.verdict==='CORRECTIONS REQUIRED'&&!material||r.verdict==='REJECTED'&&!severities.includes('BLOCKER'))throw new Error('VERDICT_FINDINGS_CONTRADICTION');
 return r;
}
export function safeTelemetry(raw,requestId,key){
 const omitted=[];const string=(v,label)=>{
  if(v===undefined||v===null)return null;
  try{if(typeof v!=='string'||!v.length||v.length>256||!/^[A-Za-z0-9_.:-]+$/.test(v))throw new Error();return noSecrets(v,key);}catch{omitted.push(label);return null;}
 };
 let usage=null;
 if(raw?.usage&&typeof raw.usage==='object'&&!Array.isArray(raw.usage)){
  usage={};for(const k of ['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens']){
   const v=raw.usage[k];if(v===undefined)continue;if(Number.isSafeInteger(v)&&v>=0)usage[k]=v;else omitted.push('usage.'+k);
  }
  for(const k of ['service_tier','inference_geo'])if(raw.usage[k]!==undefined){const v=string(raw.usage[k],'usage.'+k);if(v!==null)usage[k]=v;}
  if(raw.usage.cache_creation&&typeof raw.usage.cache_creation==='object'){
   const c={};for(const k of ['ephemeral_5m_input_tokens','ephemeral_1h_input_tokens']){const v=raw.usage.cache_creation[k];if(v===undefined)continue;if(Number.isSafeInteger(v)&&v>=0)c[k]=v;else omitted.push('usage.cache_creation.'+k);}if(Object.keys(c).length)usage.cache_creation=c;
  }
 }
 const returnedModel=string(raw?.model,'returnedModel');
 return {returnedModel,requestId:string(requestId,'requestId'),messageId:string(raw?.id,'messageId'),stopReason:string(raw?.stop_reason,'stopReason'),usage,estimatedUsd:usageCost(usage,returnedModel),pricingChecked:CONFIG.pricingChecked,pricingSource:CONFIG.pricingSource,omittedUnsafeFields:omitted};
}
async function boundedJson(response){
 if(!response.body)throw new Error('INVALID_API_BODY');let bytes=0;const chunks=[];
 for await(const c of response.body){bytes+=c.length;if(bytes>CONFIG.maxResponseBytes)throw new Error('API_RESPONSE_BUDGET_EXCEEDED');chunks.push(Buffer.from(c));}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{throw new Error('INVALID_API_JSON');}
}
export async function requestReview(packet,options={},deps={}){
 const maxTokens=options.maxTokens??CONFIG.maxOutputTokens,bound=upperCost(packet.bytes,maxTokens,options.cache!==false);
 if(bound>(options.maxUsd??CONFIG.maxEstimatedUsd))throw new Error('COST_BUDGET_EXCEEDED; nothing sent.');
 if(options.send!==true&&!deps.fetcher)throw new Error('EXPLICIT_SEND_REQUIRED; nothing sent.');
 let key;
 try{key=(deps.secretLoader??loadSecret)();if(typeof key!=='string'||key.length<20||/\s/.test(key))throw new Error();}
 catch{return {status:'REQUEST_FAILED',reason:'SECRET_UNAVAILABLE',review:null,text:null,telemetry:null,apiCalls:0};}
 try{
  noSecrets(packet.packet,key);
  const body={model:CONFIG.model,max_tokens:maxTokens,service_tier:'standard_only',system:[{type:'text',text:SYSTEM,...(options.cache===false?{}:{cache_control:{type:'ephemeral'}})}],messages:[{role:'user',content:packet.packet}]};
  noSecrets(JSON.stringify(body),key);let response;
  try{response=await(deps.fetcher??globalThis.fetch)(CONFIG.endpoint,{method:'POST',headers:{'content-type':'application/json','anthropic-version':CONFIG.apiVersion,'x-api-key':key},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(CONFIG.timeoutMs)});}
  catch{return {status:'REQUEST_FAILED',reason:'NETWORK_OR_TIMEOUT; no retry; billing may be uncertain',review:null,text:null,telemetry:null,apiCalls:1};}
  const requestId=response.headers?.get('request-id');
  if(!response.ok)return {status:'REQUEST_FAILED',reason:`API_HTTP_${response.status}`,review:null,text:null,telemetry:safeTelemetry(null,requestId,key),apiCalls:1};
  let raw;try{raw=await boundedJson(response);}catch(e){return {status:'INVALID_RESPONSE',reason:e.message,review:null,text:null,telemetry:safeTelemetry(null,requestId,key),apiCalls:1};}
  const telemetry=safeTelemetry(raw,requestId,key);
  const invalid=reason=>({status:'INVALID_RESPONSE',reason,review:null,text:null,telemetry,apiCalls:1});
  try{noSecrets(JSON.stringify(raw),key);}catch{return invalid('UNSAFE_RESPONSE_CONTENT_WITHHELD');}
  if(!raw||raw.type!=='message'||raw.model!==CONFIG.model||raw.stop_reason!=='end_turn'||raw.stop_details?.type==='refusal'||!Array.isArray(raw.content)||raw.content.some(b=>!b||!['text','thinking','redacted_thinking'].includes(b.type)||b.type==='text'&&typeof b.text!=='string')||telemetry.omittedUnsafeFields.length)return invalid('INVALID_API_SCHEMA_MODEL_OR_COMPLETION');
  const text=raw.content.filter(b=>b.type==='text').map(b=>b.text).join('\n');
  try{noSecrets(text,key);const review=parseReview(text,packet);return {status:'REVIEW_COMPLETED',reason:null,review,text,telemetry,apiCalls:1};}
  catch(e){return invalid(e.message);}
 }finally{key=null;} // JS strings cannot be securely zeroed; never serialize or log the key.
}
