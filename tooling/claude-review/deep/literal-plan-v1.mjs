import {inventory,THEMES,EXCLUSIONS,POLICY_VERSION,architectureContext} from './inventory.mjs';
import {hash,fail,json,isId,compare} from './util.mjs';
import {noSecrets} from '../packet.mjs';
import {upperCost,SYSTEM} from '../client.mjs';
import {CONFIG} from '../config.mjs';
import {DEEP_DOCTRINE} from './doctrine.mjs';
export const HARD_LIMIT=1048576;
export const DEFAULTS=Object.freeze({chunkBytes:32768,coverageBytes:393216,themeBytes:524288,maxTokens:8192,maxUsd:5,maxTotalUsd:200});
export function chunkBuffer(buffer,limit=DEFAULTS.chunkBytes){
 fail(Number.isInteger(limit)&&limit>=4,'INVALID_CHUNK_LIMIT');new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buffer);const chunks=[];let start=0,line=1;
 do{let end=Math.min(start+limit,buffer.length),boundary='LINE';if(end<buffer.length){const lf=buffer.lastIndexOf(10,end-1);if(lf>=start)end=lf+1;else{boundary='UTF8_BYTE_SPLIT';while(end>start&&(buffer[end]&0xc0)===0x80)end--;}}fail(end>start||buffer.length===0,'CHUNK_STALLED');const b=buffer.subarray(start,end),text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b),newlines=b.filter(x=>x===10).length;chunks.push({sequence:chunks.length+1,start,end,lineStart:line,lineEnd:line+newlines-(b.at(-1)===10?1:0),boundary,sha256:hash(b),text});line+=newlines;start=end;}while(start<buffer.length);return chunks;
}
function counts(items,key){return Object.fromEntries([...new Set(items.map(x=>x[key]).filter(Boolean))].sort(compare).map(k=>[k,items.filter(x=>x[key]===k).length]));}
export function summary(files){const yes=files.filter(f=>f.eligible),no=files.filter(f=>!f.eligible);return {tracked:files.length,eligible:yes.length,excluded:no.length,eligibleBytes:yes.reduce((n,f)=>n+f.bytes,0),excludedBytes:no.reduce((n,f)=>n+f.bytes,0),classifications:counts(files,'classification'),exclusions:counts(no,'exclusionReason'),ambiguousIncluded:yes.filter(f=>f.ambiguity.length).map(f=>f.path),uncoveredEligible:0};}
function compactInventory(files){return files.map(f=>({path:f.path,blob:f.blob,bytes:f.bytes,text:f.text,class:f.classification,disposition:f.disposition,reason:f.exclusionReason,coverage:f.contentShards,ambiguous:f.ambiguity.length>0}));}
function packetText(target,runId,passId,kind,theme,chunks,manifestHash,repoSummary,context,fullInventory){
 return json({mode:'DEEP_FRESH_EYES_ACTUAL_CONTENT',target_sha:target,run_id:runId,pass_id:passId,kind,theme:theme?.id??null,manifest_sha256:manifestHash,instructions:theme?.instruction??'Inspect the supplied actual content independently for correctness, hidden assumptions, stale/parallel execution, security/error handling, model/data semantics, suspicious interactions, missing validation and contradictions. Identify cross-file dependencies to investigate. Do not claim whole-repo correctness from this shard.',coverageSummary:repoSummary,...(theme?{fullTrackedInventory:fullInventory,sourceBackedArchitecture:context,selection:'Deterministic eligibility + documented class/path selectors; every selected file is fully included across this theme’s numbered subpasses. Other source regions are in content shards; themes never replace coverage.',themeTitle:theme.title}:{}),content:chunks});
}
function pack(target,runId,kind,theme,chunks,budget,repoSummary,context,fullInventory){
 const groups=[];let current=[];
 const fits=cs=>Buffer.byteLength(packetText(target,runId,'PASS-ID-PLACEHOLDER-000',kind,theme,cs,'0'.repeat(64),repoSummary,context,fullInventory))<=budget-1024;
 fail(fits([]),'THEME_INVENTORY_OVERHEAD_EXCEEDS_BUDGET; planning stopped, no truncation.');
 for(const c of chunks){if(!fits([...current,c])){fail(current.length>0,'SINGLE_CHUNK_EXCEEDS_PACKET_BUDGET');groups.push(current);current=[];}fail(fits([c]),'SINGLE_CHUNK_EXCEEDS_PACKET_BUDGET');current.push(c);}if(current.length)groups.push(current);fail(groups.length>0,'EMPTY_REQUIRED_PASS');return groups;
}
export function buildPlan(root,target,options={}){
 const o={...DEFAULTS,...options},runId=o.runId??'FORCE-DEEP-PREVIEW';fail(isId(runId),'INVALID_RUN_ID');
 for(const k of ['coverageBytes','themeBytes'])fail(Number.isInteger(o[k])&&o[k]>=8192&&o[k]<=HARD_LIMIT-65536,'INVALID_PACKET_MARGIN');
 fail(Number.isInteger(o.maxTokens)&&o.maxTokens>=256&&o.maxTokens<=32768&&Number.isFinite(o.maxUsd)&&o.maxUsd>0&&Number.isFinite(o.maxTotalUsd)&&o.maxTotalUsd>0,'INVALID_BUDGET');
 const inv=inventory(root,target),chunks=[];
 for(const f of inv.files.filter(x=>x.eligible))for(const c of chunkBuffer(inv.contents.get(f.path),o.chunkBytes))chunks.push({path:f.path,target,blob:f.blob,fileSha256:f.sha256,...c});
 const repoSummary=summary(inv.files),context=architectureContext(inv),passes=[];
 const add=(kind,theme,groups)=>groups.forEach((cs,i)=>{const id=(theme?'theme-'+theme.id:'coverage')+'-'+String(i+1).padStart(3,'0');passes.push({id,kind,theme:theme?.id??null,chunks:cs,themeDefinition:theme});for(const c of cs){const f=inv.files.find(x=>x.path===c.path);if(theme){if(!f.thematicPasses.includes(id))f.thematicPasses.push(id);}else{f.ranges.push({start:c.start,end:c.end,lineStart:c.lineStart,lineEnd:c.lineEnd,boundary:c.boundary,sequence:c.sequence,sha256:c.sha256,shard:id});if(!f.contentShards.includes(id))f.contentShards.push(id);}}});
 add('CONTENT',null,pack(target,runId,'CONTENT',null,chunks,o.coverageBytes,repoSummary,[],[]));
 const fullInventory=compactInventory(inv.files);
 for(const theme of THEMES){const selected=new Set(inv.files.filter(f=>f.eligible&&theme.select(f)).map(f=>f.path));add('THEMATIC',theme,pack(target,runId,'THEMATIC',theme,chunks.filter(c=>selected.has(c.path)),o.themeBytes,repoSummary,context,fullInventory));}
 const manifest={schema:1,policy:POLICY_VERSION,target,runId,byteRanges:'zero-based [start,end); original Git bytes, UTF8/BOM/CRLF preserved; ranges do not overlap',summary:repoSummary,files:inv.files};
 const manifestText=json(manifest),manifestHash=hash(manifestText);
 const packets=new Map();const definitions=passes.map(p=>{const text=packetText(target,runId,p.id,p.kind,p.themeDefinition,p.chunks,manifestHash,repoSummary,context,fullInventory);noSecrets(text);const bytes=Buffer.byteLength(text),ceiling=Math.ceil(upperCost(bytes+Buffer.byteLength(DEEP_DOCTRINE),o.maxTokens)*1e6)/1e6;fail(bytes<=HARD_LIMIT&&bytes<=(p.kind==='CONTENT'?o.coverageBytes:o.themeBytes),'PACKET_LIMIT');fail(ceiling<=o.maxUsd,'PER_CALL_COST_BUDGET_EXCEEDED');packets.set(p.id,text);return {id:p.id,kind:p.kind,theme:p.theme,paths:[...new Set(p.chunks.map(c=>c.path))],chunks:p.chunks.length,packetFile:p.id+'.packet.json',packetSha256:hash(text),packetBytes:bytes,maxTokens:o.maxTokens,estimatedCeilingUsd:ceiling,maxUsd:o.maxUsd,status:'PENDING',resultPath:null,attempts:[]};});
 const total=Math.ceil(definitions.reduce((n,p)=>n+p.estimatedCeilingUsd,0)*1e6)/1e6;fail(total<=o.maxTotalUsd,'TOTAL_COST_BUDGET_EXCEEDED; nothing sent or key-read.');
 const plan={schema:1,runId,target,targetRef:'main',manifestHash,doctrineHash:hash(DEEP_DOCTRINE),reviewerHash:hash(SYSTEM),policy:POLICY_VERSION,pricing:CONFIG.pricing,pricingChecked:CONFIG.pricingChecked,pricingSource:CONFIG.pricingSource,cache:'Stable reviewer.txt ephemeral 5m; full cache-write worst case, no hit assumed.',options:{chunkBytes:o.chunkBytes,coverageBytes:o.coverageBytes,themeBytes:o.themeBytes,maxTokens:o.maxTokens,maxUsd:o.maxUsd,maxTotalUsd:o.maxTotalUsd},summary:repoSummary,contentCalls:definitions.filter(p=>p.kind==='CONTENT').length,thematicCalls:definitions.filter(p=>p.kind==='THEMATIC').length,plannedCalls:definitions.length,estimatedCeilingUsd:total,maxTotalUsd:o.maxTotalUsd,paidSynthesis:false,passes:definitions};
 validateCoverage(manifest,packets,inv);return {plan,manifest,manifestText,packets};
}
export function validateCoverage(manifest,packets,inv){
 fail(manifest.target===inv.target&&manifest.files.length===inv.files.length,'INVENTORY_COUNT_OR_TARGET');const names=new Set();
 for(const original of inv.files){const f=manifest.files.find(x=>x.path===original.path);fail(f&&!names.has(f.path),'MISSING_DUPLICATE_FILE');names.add(f.path);for(const k of ['blob','sha256','bytes','eligible','text','classification','disposition','exclusionReason'])fail(f[k]===original[k],'ALTERED_INVENTORY_DISPOSITION');
  if(!f.eligible){fail(f.disposition==='EXCLUDED'&&Object.hasOwn(EXCLUSIONS,f.exclusionReason)&&f.ranges.length===0,'INVALID_EXCLUSION');continue;}
  fail(f.disposition==='INCLUDED'&&f.ranges.length>0&&f.exclusionReason===null,'ELIGIBLE_FILE_EXCLUDED');let cursor=0;const restored=[];
  for(const r of f.ranges){fail(r.start===cursor&&r.end>=r.start&&r.end<=f.bytes,'COVERAGE_GAP_OR_OVERLAP');const body=JSON.parse(packets.get(r.shard)??'null');fail(body?.target_sha===manifest.target&&body.kind==='CONTENT','MISSING_ACTUAL_CONTENT_SHARD');const c=body.content.find(c=>c.path===f.path&&c.sequence===r.sequence&&c.start===r.start&&c.end===r.end);fail(c&&hash(Buffer.from(c.text))===r.sha256,'ACTUAL_CONTENT_MISMATCH');restored.push(Buffer.from(c.text));cursor=r.end;}
  fail(cursor===f.bytes&&Buffer.concat(restored).equals(inv.contents.get(f.path)),'INCOMPLETE_BYTE_COVERAGE');fail([...new Set(f.ranges.map(r=>r.shard))].join('|')===f.contentShards.join('|'),'SHARD_MEMBERSHIP_MISMATCH');
 }
 return true;
}