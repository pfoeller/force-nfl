import fs from 'node:fs';
import path from 'node:path';
import {hash,git,fail,isId,SHA,json,guarded,writeNew,atomic,readJSON,withLock,iso} from './util.mjs';
import {buildPlan,HARD_LIMIT} from './plan.mjs';
import {buildPlan as legacyPlan} from './literal-plan-v1.mjs';
import {REVIEW_POLICY} from './selection.mjs';
import {requestReview,SYSTEM,upperCost} from '../client.mjs';
import {DEEP_DOCTRINE,parseDeepReview} from './doctrine.mjs';
import {evaluate} from './cadence.mjs';
export const ARTIFACTS='research/claude-api-reviews/deep';
export function runDirectory(root,id,create=false){fail(isId(id),'INVALID_RUN_ID');const rel=ARTIFACTS+'/'+id;fail(git(root,['check-ignore','--no-index',rel+'/plan.json']).trim()===rel+'/plan.json','RUN_ARTIFACTS_MUST_BE_IGNORED');return guarded(root,rel,{directory:true,create});}
export function createRun(root,built,cadence,now){
 const {plan,manifestText,packets}=built,dir=runDirectory(root,plan.runId,true);fail(fs.readdirSync(dir).length===0,'RUN_ALREADY_EXISTS: use status/resume; no overwrite.');
 const saved={...plan,createdAt:iso(now),toolingHead:git(root,['rev-parse','HEAD']).trim(),due:evaluate(cadence,now),manifestFile:'coverage-manifest.json',preview:true};const planText=json(saved);
 writeNew(path.join(dir,'coverage-manifest.json'),manifestText);for(const [id,text]of packets)writeNew(path.join(dir,id+'.packet.json'),text);writeNew(path.join(dir,'plan.json'),planText);
 const state={schema:1,runId:plan.runId,planHash:hash(planText),passes:Object.fromEntries(plan.passes.map(p=>[p.id,{status:'PENDING',resultPath:null,attempts:[]}]))};writeNew(path.join(dir,'run-state.json'),state);return {dir,plan:saved,state};
}
function file(root,id,name){fail(/^[A-Za-z0-9_.-]+$/.test(name)&&!name.startsWith('.'),'INVALID_RUN_ARTIFACT_NAME');return guarded(root,ARTIFACTS+'/'+id+'/'+name);}
export function loadRun(root,id){
 const dir=runDirectory(root,id),planText=fs.readFileSync(file(root,id,'plan.json'),'utf8'),plan=JSON.parse(planText),state=readJSON(file(root,id,'run-state.json'));
 fail(plan.schema===1&&plan.runId===id&&state.schema===1&&state.runId===id&&state.planHash===hash(planText),'RUN_PLAN_STATE_MISMATCH');fail(SHA.test(plan.toolingHead)&&plan.reviewerHash===hash(SYSTEM)&&plan.doctrineHash===hash(DEEP_DOCTRINE),'TOOLING_DOCTRINE_DRIFT');
 const rebuilt=(plan.policy===REVIEW_POLICY?buildPlan:legacyPlan)(root,plan.target,{...plan.options,runId:id});for(const k of Object.keys(rebuilt.plan))fail(json(plan[k])===json(rebuilt.plan[k]),'PLAN_REPRODUCTION_MISMATCH: '+k);
 const manifestText=fs.readFileSync(file(root,id,plan.manifestFile),'utf8');fail(hash(manifestText)===plan.manifestHash&&manifestText===rebuilt.manifestText,'MANIFEST_TAMPER_OR_COVERAGE_DRIFT');
 fail(Object.keys(state.passes).sort().join('|')===plan.passes.map(p=>p.id).sort().join('|'),'RUN_PASS_SET_MISMATCH');
 for(const p of plan.passes){const text=fs.readFileSync(file(root,id,p.packetFile),'utf8');fail(hash(text)===p.packetSha256&&Buffer.byteLength(text)===p.packetBytes&&text===rebuilt.packets.get(p.id),'PACKET_TAMPER');const ps=state.passes[p.id];fail(['PENDING','COMPLETED','REQUEST_FAILED','INVALID_RESPONSE','TRUNCATED_RESPONSE','OWNER_ACTION_REQUIRED'].includes(ps.status)&&Array.isArray(ps.attempts),'INVALID_PASS_STATE');
  const attempts=ps.attempts;
  fail(ps.status!=='PENDING'||attempts.length===0,'PENDING_WITH_PRIOR_ATTEMPTS_REFUSED');
  const resultFiles=fs.readdirSync(dir).filter(n=>n.startsWith(p.id+'.attempt-')&&n.endsWith('.result.json'));
  fail(resultFiles.length===attempts.filter(a=>a.resultPath).length,'ORPHANED_RESULT_OWNER_ACTION_REQUIRED');
  for(const [index,a]of attempts.entries()){
   fail(a.index===index+1&&a.packetHash===p.packetSha256&&a.reservedUsd===p.estimatedCeilingUsd&&['COMPLETED','REQUEST_FAILED','INVALID_RESPONSE','TRUNCATED_RESPONSE','OWNER_ACTION_REQUIRED'].includes(a.status),'INVALID_ATTEMPT_LEDGER');
   if(a.resultPath){fail(a.resultPath===p.id+'.attempt-'+String(index+1).padStart(3,'0')+'.result.json','INVALID_ATTEMPT_PATH');const resultText=fs.readFileSync(file(root,id,a.resultPath),'utf8');fail(hash(resultText)===a.resultSha256,'ATTEMPT_RESULT_TAMPER');const result=JSON.parse(resultText);fail(result.status===a.status&&result.passId===p.id&&result.packetHash===p.packetSha256&&result.apiCalls===a.apiCalls,'ATTEMPT_ARTIFACT_MISMATCH');}
  }
  if(attempts.length){fail(ps.status===attempts.at(-1).status,'STATUS_LEDGER_MISMATCH');if(ps.resultPath)fail(ps.resultPath===attempts.at(-1).resultPath&&ps.resultSha256===attempts.at(-1).resultSha256,'LATEST_RESULT_MISMATCH');}
  if(ps.status==='COMPLETED')validResult(root,plan,p,ps);}
 return {dir,plan,state};
}
export function validResult(root,plan,p,ps){
 fail(ps.status==='COMPLETED'&&ps.resultPath&&ps.resultSha256&&ps.attempts.length>0,'PASS_NOT_COMPLETE');const text=fs.readFileSync(file(root,plan.runId,ps.resultPath),'utf8');fail(hash(text)===ps.resultSha256,'RESULT_TAMPER');const r=JSON.parse(text);
 fail(r.status==='COMPLETED'&&r.runId===plan.runId&&r.passId===p.id&&r.target===plan.target&&r.manifestHash===plan.manifestHash&&r.packetHash===p.packetSha256&&r.apiCalls===1&&r.telemetry?.returnedModel==='claude-opus-5-5'&&r.telemetry?.stopReason==='end_turn','INVALID_COMPLETE_ARTIFACT');
 const parsed=parseDeepReview(r.text,{start:plan.target,end:plan.target,paths:plan.summary?readJSON(file(root,plan.runId,plan.manifestFile)).files.map(f=>f.path):[]});fail(json(parsed)===json(r.review),'RESULT_REVIEW_MISMATCH');const last=ps.attempts.at(-1);fail(last.resultPath===ps.resultPath&&last.resultSha256===ps.resultSha256&&last.status==='COMPLETED'&&last.packetHash===p.packetSha256,'ATTEMPT_RESULT_MISMATCH');return r;
}
export function status(run){const rows=run.plan.passes.map(p=>({id:p.id,kind:p.kind,theme:p.theme,status:run.state.passes[p.id].status,attempts:run.state.passes[p.id].attempts.length,packetBytes:p.packetBytes,ceiling:p.estimatedCeilingUsd}));const complete=rows.every(p=>p.status==='COMPLETED');return {runId:run.plan.runId,target:run.plan.target,manifestHash:run.plan.manifestHash,complete,rows,pending:rows.filter(p=>p.status==='PENDING').map(p=>p.id),ownerActionRequired:rows.filter(p=>!['PENDING','COMPLETED'].includes(p.status)).map(p=>p.id),apiCalls:run.plan.passes.reduce((n,p)=>n+run.state.passes[p.id].attempts.reduce((m,a)=>m+(a.apiCalls??0),0),0),uncertainAttempts:run.plan.passes.flatMap(p=>run.state.passes[p.id].attempts.filter(a=>a.apiCalls===null).map(a=>({passId:p.id,attempt:a.index,billing:'UNKNOWN — inspect before retry'}))),reservedCeilingUsd:run.plan.passes.reduce((n,p)=>n+run.state.passes[p.id].attempts.reduce((m,a)=>m+(a.reservedUsd??0),0),0),spending:'No automated spending; inspect each pass and explicit send guards.'};}
export function verifyCompletion(root,id){const run=loadRun(root,id),s=status(run);fail(s.complete,'INCOMPLETE_RUN_CANNOT_RESET_CADENCE');fail(run.plan.policy===REVIEW_POLICY&&run.plan.auditType==='ROUTINE','ESCALATION_OR_SUPERSEDED_RUN_CANNOT_RESET_CADENCE');const manifest=readJSON(file(root,id,run.plan.manifestFile));return {verifiedComplete:true,policy:REVIEW_POLICY,auditType:run.plan.auditType,auditOrdinal:run.plan.auditOrdinal,directSnapshot:run.plan.options.directState,directSnapshotHash:hash(json(run.plan.options.directState)),directCoverage:manifest.files.filter(f=>f.eligible).map(f=>({path:f.path,tier:f.tier,blob:f.blob,directSelected:f.directSelected,passes:f.contentShards,reasons:f.selectionReasons})),mandatoryReview:run.plan.due.activeMandatoryTriggers.length>0,runId:id,target:run.plan.target,createdAt:run.plan.createdAt,manifestHash:run.plan.manifestHash,toolingHead:run.plan.toolingHead,apiCalls:s.apiCalls,passes:run.plan.passes.length};}
export function verifySendEnvironment(root,plan,options,deps={}){
 const inspect=deps.git??git;fail(process.versions.node==='24.19.0','PINNED_NODE_24_19_0_REQUIRED_BEFORE_SEND');
 fail(options.toolingHead===plan.toolingHead&&options.target===plan.target&&options.manifestHash===plan.manifestHash,'EXACT_SEND_PINS_REQUIRED');fail(inspect(root,['rev-parse','HEAD']).trim()===plan.toolingHead,'TOOLING_HEAD_CHANGED');
 fail(inspect(root,['symbolic-ref','--short','HEAD']).trim()!=='main','SEND_FROM_OFF_MAIN_TOOLING_WORKTREE');fail(inspect(root,['status','--porcelain','--untracked-files=normal']).trim()==='','CLEAN_TOOLING_WORKTREE_REQUIRED');
 fail(inspect(root,['rev-parse','refs/heads/main']).trim()===plan.target&&inspect(root,['rev-parse','refs/remotes/origin/main']).trim()===plan.target,'TARGET_MAIN_MOVED');
 const remote=inspect(root,['remote','get-url','origin']).trim();fail(/^(?:https:\/\/github\.com\/|git@github\.com:)(?:pfoeller\/force-nfl)(?:\.git)?$/.test(remote),'WRONG_FORCE_ORIGIN');
 fail(inspect(root,['ls-remote','origin','refs/heads/main']).trim().split(/\s+/)[0]===plan.target,'REMOTE_MAIN_MOVED');
}
export function authorizeBudget(exposure,options={}){fail(Number.isFinite(exposure)&&exposure>=0,'INVALID_COST_EXPOSURE');if(exposure>10)fail(options.budgetOverride===true&&typeof options.overrideReason==='string'&&options.overrideReason.trim().length>0,'OVER_10_OWNER_OVERRIDE_AND_EXPLANATION_REQUIRED_BEFORE_KEY');if(exposure>=100)fail(options.extraordinaryAuthorization===true,'ROUTINE_PLANNING_FAILURE_REQUIRES_EXTRAORDINARY_OWNER_AUTHORIZATION');}
export async function runPass(root,id,passId,options={},deps={}){
 fail(isId(passId),'EXACT_ONE_PASS_REQUIRED');const initial=loadRun(root,id),p=initial.plan.passes.find(p=>p.id===passId);fail(p,'UNKNOWN_PASS');
 if(options.send!==true)return {...status(initial),mode:'DRY_RUN',selectedPass:passId,apiCallsThisCommand:0,keyReads:0};
 return withLock(path.join(initial.dir,'run.lock'),async()=>{
  const run=loadRun(root,id),ps=run.state.passes[passId];fail(run.plan.policy===REVIEW_POLICY,'SUPERSEDED_LITERAL_PLAN: generate a replacement; no paid sends.');if(run.plan.auditType==='ESCALATION')fail(options.authorizeEscalation===true&&typeof options.escalationReason==='string'&&options.escalationReason.trim(),'SEPARATE_ESCALATION_AUTHORIZATION_REQUIRED_BEFORE_KEY');fail(ps.status!=='COMPLETED','COMPLETED_PASS_CANNOT_RESEND');
  fail(ps.status==='PENDING'||options.retry===true&&typeof options.retryReason==='string'&&options.retryReason.trim(),'OWNER_ACTION_REQUIRED: failed/truncated/interrupted pass needs explicit --retry and rationale; no automatic retry.');
  fail(options.packetHash===p.packetSha256,'EXACT_PACKET_PIN_REQUIRED');
  const reserved=status(run).reservedCeilingUsd,remaining=run.plan.passes.filter(p=>run.state.passes[p.id].status==='PENDING').reduce((n,p)=>n+p.estimatedCeilingUsd,0),retry=ps.status!=='PENDING'?p.estimatedCeilingUsd:0;
  fail(Number.isFinite(options.maxTotalUsd)&&options.maxTotalUsd>0&&run.plan.estimatedCeilingUsd<=options.maxTotalUsd&&reserved+remaining+retry<=options.maxTotalUsd,'TOTAL_COST_BUDGET_EXCEEDED; before key access.');
  const exposure=Math.max(run.plan.estimatedCeilingUsd,reserved+remaining+retry);authorizeBudget(exposure,options);const text=fs.readFileSync(file(root,id,p.packetFile),'utf8'),cost=upperCost(Buffer.byteLength(text)+Buffer.byteLength(DEEP_DOCTRINE),p.maxTokens);fail(p.packetBytes<=HARD_LIMIT&&Number.isFinite(options.maxUsd)&&cost<=options.maxUsd&&cost<=p.maxUsd,'PER_CALL_COST_BUDGET_EXCEEDED; before key access.');
  (deps.environmentVerifier??verifySendEnvironment)(root,run.plan,options);
  const index=ps.attempts.length+1,attempt={index,time:new Date().toISOString(),status:'OWNER_ACTION_REQUIRED',reason:'Request intent persisted; interrupted outcome may be billable. No automatic resend.',packetHash:p.packetSha256,reservedUsd:p.estimatedCeilingUsd,apiCalls:null,retryReason:options.retryReason??null,budgetOverride:options.budgetOverride===true,overrideReason:options.overrideReason??null,extraordinaryAuthorization:options.extraordinaryAuthorization===true,escalationReason:options.escalationReason??null};ps.attempts.push(attempt);ps.status='OWNER_ACTION_REQUIRED';atomic(path.join(run.dir,'run-state.json'),run.state);
  let response;try{response=await requestReview({packet:text,bytes:Buffer.byteLength(text),start:run.plan.target,end:run.plan.target,paths:readJSON(file(root,id,run.plan.manifestFile)).files.map(f=>f.path)},{send:true,maxTokens:p.maxTokens,maxUsd:options.maxUsd,systemSuffix:DEEP_DOCTRINE},{...deps,reviewParser:parseDeepReview});}catch{response={status:'REQUEST_FAILED',reason:'LOCAL_REQUEST_FAILURE; request intent retained; inspect billing before explicit retry.',review:null,text:null,telemetry:null,apiCalls:1};}
  const resultStatus=response.telemetry?.stopReason==='max_tokens'?'TRUNCATED_RESPONSE':response.status==='REVIEW_COMPLETED'?'COMPLETED':response.status;
  const result={schema:1,runId:id,passId,target:run.plan.target,manifestHash:run.plan.manifestHash,packetHash:p.packetSha256,status:resultStatus,reason:response.reason,review:response.review,text:response.text,telemetry:response.telemetry,apiCalls:response.apiCalls,humanDisposition:'PENDING — API verdict does not authorize integration',attempt:index};
  const resultPath=passId+'.attempt-'+String(index).padStart(3,'0')+'.result.json',resultText=json(result);writeNew(file(root,id,resultPath),resultText);Object.assign(attempt,{status:resultStatus,reason:response.reason,resultPath,resultSha256:hash(resultText),apiCalls:response.apiCalls,telemetry:response.telemetry});Object.assign(ps,{status:resultStatus,resultPath,resultSha256:hash(resultText)});atomic(path.join(run.dir,'run-state.json'),run.state);return {runId:id,passId,status:resultStatus,apiCalls:response.apiCalls,telemetry:response.telemetry,resultPath};
 });
}
export function ownerScripts(root,id,nodeExe,cliPath){
 const run=loadRun(root,id),quote=s=>"'"+s.replaceAll("'","''")+"'",base=`& ${quote(nodeExe)} ${quote(cliPath)}`,pins=`--tooling-head ${run.plan.toolingHead} --target ${run.plan.target} --manifest-hash ${run.plan.manifestHash}`;
 for(const p of run.plan.passes){const name='send-'+p.id+'.ps1',command=`${base} pass --run ${id} --pass ${p.id} --send ${pins} --packet-hash ${p.packetSha256} --max-usd ${p.maxUsd} --max-total-usd ${run.plan.maxTotalUsd}`;writeNew(file(root,id,name),`# Owner inspection/authorization required. EXACTLY ONE request; never a send-all script.\n$ErrorActionPreference = 'Stop'\nSet-Location -LiteralPath ${quote(root)}\n${command}\nif ($LASTEXITCODE -ne 0) { throw 'Review incomplete or corrections require human disposition; do not automatically retry.' }\n`);}
 for(const [name,command]of [['status',`${base} run-status --run ${id}`],['resume',`${base} resume --run ${id}`],['synthesize',`${base} synthesize --run ${id}`],['complete',`${base} complete --run ${id} --confirm-complete`]])writeNew(file(root,id,name+'.ps1'),`$ErrorActionPreference = 'Stop'\nSet-Location -LiteralPath ${quote(root)}\n${command}\nif ($LASTEXITCODE -ne 0) { throw 'Command failed.' }\n`);
 return run.plan.passes.map(p=>path.join(run.dir,'send-'+p.id+'.ps1'));
}