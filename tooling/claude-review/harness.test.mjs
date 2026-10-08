import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CONFIG} from './config.mjs';
import {git,buildPacket,noSecrets,localText,summary,context,identity,selectHandoff} from './packet.mjs';
import {SYSTEM,parseReview,requestReview,usageCost,upperCost} from './client.mjs';
import {runReview,parseArgs} from './review.mjs';
const fakeKey='disposable-review-test-'+ 'x'.repeat(32); // Synthetic only, never an owner credential.
const brief={ownerIntent:'Owner-authorized fixture',summary:'Bounded fixture change',modelDataEffect:'No real model',mathematicalAssumptions:'None',validation:'Mock only',knownRisks:'Fixture',reviewFocus:'Safety',doNotReproduce:'No broad work'};
function outcome(p,verdict='ACCEPTED',findings=[]){return {verdict,summary:'Bounded mock review',findings,limitations:[],scope:{start_sha:p.start,end_sha:p.end}};}
const finding=severity=>({severity,kind:'actual defect',location:'source.js:1',evidence:'Mock evidence',impact:'Mock impact',correction:'Bounded mock correction'});
function response(p,review=outcome(p),extra={}){return new Response(JSON.stringify({type:'message',id:'msg_mock',model:CONFIG.model,stop_reason:'end_turn',content:[{type:'text',text:typeof review==='string'?review:JSON.stringify(review)}],usage:{input_tokens:100,output_tokens:20,cache_creation_input_tokens:512,cache_read_input_tokens:0},...extra}),{headers:{'request-id':'req_mock'}});}
function removeTemp(dir){const real=path.resolve(dir),parent=path.resolve(os.tmpdir());assert(real.startsWith(parent+path.sep)&&path.basename(real).startsWith('force-review-'));fs.rmSync(real,{recursive:true,force:true});}
async function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'force-review-test-'));
 try{
  git(root,['init','-q']);git(root,['config','user.name','Disposable FORCE Test']);git(root,['config','user.email','test@example.invalid']);git(root,['config','commit.gpgsign','false']);git(root,['config','core.autocrlf','false']);git(root,['remote','add','origin','https://github.com/pfoeller/force-nfl.git']);git(root,['checkout','-qb','codex/fixture']);
  fs.writeFileSync(path.join(root,'.gitignore'),CONFIG.artifacts+'/\n');fs.writeFileSync(path.join(root,'source.js'),'export const value = 1;\n');git(root,['add','.']);git(root,['commit','-qm','base']);const start=git(root,['rev-parse','HEAD']).trim();
  fs.writeFileSync(path.join(root,'source.js'),'export const value = 2;\n');git(root,['add','.']);git(root,['commit','-qm','candidate']);const end=git(root,['rev-parse','HEAD']).trim();fs.writeFileSync(path.join(root,'brief.json'),JSON.stringify(brief));
  const packet=buildPacket(root,start,end);await fn({root,start,end,packet});
 }finally{removeTemp(root);}
}
const args=(p,mode='--send')=>[p.start,p.end,mode,'--brief','brief.json'];
const dep=(root,extra={})=>({expectedRoot:root,secretLoader:()=>fakeKey,...extra});
async function send(p,extra={}){return requestReview(p,{}, {secretLoader:()=>fakeKey,fetcher:async()=>response(p),...extra});}

test('mock completed review preserves safe telemetry and Standard/cache request without serializing key',()=>fixture(async p=>{
 let calls=0;const r=await runReview(args(p),p.root,dep(p.root,{fetcher:async(url,opt)=>{
  calls++;assert.equal(url,CONFIG.endpoint);assert.equal(opt.headers['x-api-key'],fakeKey);assert.equal(opt.redirect,'error');assert(!opt.body.includes(fakeKey));const b=JSON.parse(opt.body);assert.equal(b.service_tier,'standard_only');assert.equal(b.model,'claude-opus-5-5');assert.deepEqual(b.system[0].cache_control,{type:'ephemeral'});assert(!b.speed&&!b.tools&&!b.thinking);return response(p);
 }}));assert.equal(calls,1);assert.equal(r.result.status,'REVIEW_COMPLETED');assert.equal(r.exitCode,0);assert.equal(r.result.humanDisposition.startsWith('PENDING'),true);
 for(const f of [r.packetPath,r.resultPath])assert(!fs.readFileSync(f,'utf8').includes(fakeKey));assert.equal(r.result.telemetry.requestId,'req_mock');assert(r.result.telemetry.estimatedUsd>0);
}));
test('dry-run has zero network calls, no secret access and no acceptance',()=>fixture(async p=>{const r=await runReview(args(p,'--dry-run'),p.root,dep(p.root,{secretLoader:()=>assert.fail('secret access'),fetcher:()=>assert.fail('network')}));assert.equal(r.result.status,'DRY_RUN');assert.equal(r.result.apiCalls,0);assert.equal(r.result.spentUsd,0);assert.equal(r.result.review,null);}));
test('missing secret fails exact status without API or leaked exception',()=>fixture(async p=>{const r=await runReview(args(p),p.root,dep(p.root,{secretLoader:()=>{throw new Error(fakeKey);},fetcher:()=>assert.fail('network')}));assert.equal(r.result.status,'REQUEST_FAILED');assert.equal(r.result.apiCalls,0);assert.equal(r.result.review,null);assert.equal(r.packetPath,null);assert(!fs.readFileSync(r.resultPath,'utf8').includes(fakeKey));}));
test('invalid SHA and ref injection rejected',()=>fixture(p=>{for(const ref of ['missing-ref','--help','HEAD..main','HEAD;evil'])assert.throws(()=>buildPacket(p.root,ref,p.end));}));
test('wrong repo, wrong worktree and uncontained END rejected',()=>fixture(p=>{assert.throws(()=>identity(p.root,os.tmpdir()),/Wrong FORCE worktree/);git(p.root,['remote','set-url','origin','https://github.com/other/force-nfl.git']);assert.throws(()=>buildPacket(p.root,p.start,p.end),/repository origin/);}));
test('Git routing environment cannot silently select another repository',()=>fixture(p=>{const old=process.env.GIT_DIR;try{process.env.GIT_DIR='does-not-exist';assert.equal(buildPacket(p.root,p.start,p.end).end,p.end);}finally{if(old===undefined)delete process.env.GIT_DIR;else process.env.GIT_DIR=old;}}));
test('empty range performs no writes, secret access or paid calls',()=>fixture(async p=>{const r=await runReview([p.end,p.end,'--send'],p.root,dep(p.root,{secretLoader:()=>assert.fail('secret')}));assert.match(r.message,/EMPTY_RANGE/);assert.equal(r.resultPath,undefined);}));
test('oversized packet and cost blocked before spending; no truncation',()=>fixture(async p=>{assert.throws(()=>buildPacket(p.root,p.start,p.end,{maxBytes:100}),/budget/);await assert.rejects(requestReview(p.packet,{maxUsd:.00001},{secretLoader:()=>assert.fail('secret')}),/COST_BUDGET/);assert(upperCost(p.packet.bytes)>0);}));
for(const status of [401,403,429,500])test(`HTTP ${status} fails closed and retains safe request ID`,()=>fixture(async p=>{let calls=0;const r=await runReview(args(p),p.root,dep(p.root,{fetcher:async()=>{calls++;return new Response(fakeKey,{status,headers:{'request-id':'req_failure'}});}}));assert.equal(calls,1);assert.equal(r.result.status,'REQUEST_FAILED');assert.equal(r.result.telemetry.requestId,'req_failure');assert.equal(r.result.review,null);assert(!fs.readFileSync(r.resultPath,'utf8').includes(fakeKey));}));
test('network failure never retries or persists raw exceptions',()=>fixture(async p=>{let calls=0;const r=await runReview(args(p),p.root,dep(p.root,{fetcher:async()=>{calls++;throw new Error(fakeKey);}}));assert.equal(calls,1);assert.equal(r.result.status,'REQUEST_FAILED');assert.equal(r.result.review,null);assert(!fs.readFileSync(r.resultPath,'utf8').includes(fakeKey));}));
test('malformed API JSON exact INVALID_RESPONSE',()=>fixture(async p=>{const r=await send(p.packet,{fetcher:async()=>new Response('bad json',{headers:{'request-id':'req_bad'}})});assert.equal(r.status,'INVALID_RESPONSE');assert.equal(r.reason,'INVALID_API_JSON');assert.equal(r.review,null);assert.equal(r.telemetry.requestId,'req_bad');}));
for(const [name,change] of [['truncated',{stop_reason:'max_tokens'}],['wrong-model',{model:'other-model'}],['refusal',{stop_details:{type:'refusal'}}],['missing-content',{content:null}],['tool-response',{content:[{type:'tool_use',name:'unrequested'}]}]])test(`${name} exact INVALID_RESPONSE`,()=>fixture(async p=>{const r=await send(p.packet,{fetcher:async()=>response(p.packet,outcome(p.packet),change)});assert.equal(r.status,'INVALID_RESPONSE');assert.equal(r.review,null);}));
test('malformed review and well-formed contradiction have exact invalid statuses/reasons',()=>fixture(async p=>{
 for(const [v,reason] of [['not json','MALFORMED_REVIEW_JSON'],[{verdict:'ACCEPTED'},'INVALID_REVIEW_SCHEMA_OR_SCOPE'],[outcome(p.packet,'ACCEPTED',[finding('MATERIAL')]),'VERDICT_FINDINGS_CONTRADICTION'],[outcome(p.packet,'CORRECTIONS REQUIRED',[]),'VERDICT_FINDINGS_CONTRADICTION'],[outcome(p.packet,'ACCEPTED WITH MINORS',[]),'VERDICT_FINDINGS_CONTRADICTION']]){const r=await send(p.packet,{fetcher:async()=>response(p.packet,v)});assert.equal(r.status,'INVALID_RESPONSE');assert.equal(r.reason,reason);assert.equal(r.review,null);}
 const wrong=outcome(p.packet);wrong.scope.end_sha=p.start;assert.throws(()=>parseReview(JSON.stringify(wrong),p.packet),/SCOPE/);
}));
test('unsafe prose and exact credential echoes withheld without losing safe billing telemetry',()=>fixture(async p=>{
 for(const text of ['-----BEGIN PRIVATE'+' KEY-----',fakeKey,'sk'+'-ant-'+ 'q'.repeat(30)]){
  const v=outcome(p.packet);v.summary=text;const r=await runReview(args(p),p.root,dep(p.root,{fetcher:async()=>response(p.packet,v)}));assert.equal(r.result.status,'INVALID_RESPONSE');assert.equal(r.result.text,null);assert.equal(r.result.review,null);assert.equal(r.result.telemetry.requestId,'req_mock');assert.equal(r.result.telemetry.usage.output_tokens,20);assert(r.result.telemetry.estimatedUsd>0);assert(!fs.readFileSync(r.resultPath,'utf8').includes(text));
 }
}));
test('unsafe metadata omitted field-by-field while independent usage remains',()=>fixture(async p=>{const r=await send(p.packet,{fetcher:async()=>response(p.packet,outcome(p.packet),{id:fakeKey})});assert.equal(r.status,'INVALID_RESPONSE');assert.equal(r.telemetry.messageId,null);assert.equal(r.telemetry.requestId,'req_mock');assert.equal(r.telemetry.usage.input_tokens,100);assert(r.telemetry.estimatedUsd>0);}));
test('cost metadata absence does not crash or invent a cost',()=>fixture(async p=>{const r=await send(p.packet,{fetcher:async()=>response(p.packet,outcome(p.packet),{usage:undefined})});assert.equal(r.status,'REVIEW_COMPLETED');assert.equal(r.telemetry.usage,null);assert.equal(r.telemetry.estimatedUsd,null);}));
test('unknown actual key in brief blocked before persistence or network',()=>fixture(async p=>{fs.writeFileSync(path.join(p.root,'brief.json'),JSON.stringify({...brief,summary:fakeKey}));const r=await runReview(args(p),p.root,dep(p.root,{fetcher:()=>assert.fail('network')}));assert.equal(r.result.apiCalls,0);assert.equal(r.packetPath,null);assert(!fs.readFileSync(r.resultPath,'utf8').includes(fakeKey));}));
test('stale unrelated handoff excluded with named warning; explicit stale selection fails closed',()=>fixture(async p=>{
 const text=`# Existing canonical ledger\n## API Batch: stale\nStart SHA: ${'0'.repeat(40)}\nEnd SHA: ${p.end}\nUNRELATED_STALE_SENTINEL\n## API Batch: valid\nStart SHA: ${p.start}\nEnd SHA: ${p.end}\nRELEVANT_EVIDENCE\n`;
 assert.match(selectHandoff(p.root,text,p.start,p.end,['valid']),/RELEVANT_EVIDENCE/);const warnings=[];assert(!selectHandoff(p.root,text,p.start,p.end,[],warnings).includes('UNRELATED_STALE'));assert.match(warnings[0],/stale.*unresolvable/);assert.throws(()=>selectHandoff(p.root,text,p.start,p.end,['stale']),/stale.*unresolvable/);
 fs.mkdirSync(path.join(p.root,'research/handoffs'),{recursive:true});fs.writeFileSync(path.join(p.root,CONFIG.handoff),text);git(p.root,['add',CONFIG.handoff]);git(p.root,['commit','-qm','index']);
 const r=await runReview([...args(p,'--dry-run'),'--batch','valid'],p.root,dep(p.root,{fetcher:()=>assert.fail('network')}));assert.match(r.result.warnings[0],/stale/);assert.equal(fs.readFileSync(path.join(p.root,CONFIG.handoff),'utf8'),text);
}));
test('path traversal, sensitive files and non-UTF8/binary content rejected',()=>fixture(p=>{for(const s of ['../outside','C:/outside','/outside','.git/config','.env','.aws/config','api-key.clixml'])assert.throws(()=>localText(p.root,s));fs.writeFileSync(path.join(p.root,'bad.txt'),Buffer.from([0xff,0xfe]));fs.writeFileSync(path.join(p.root,'binary.bin'),Buffer.from([0,1]));assert.throws(()=>localText(p.root,'bad.txt'),/UTF-8/);assert.throws(()=>localText(p.root,'binary.bin'),/Binary/);fs.writeFileSync(path.join(p.root,'large.txt'),'a'.repeat(CONFIG.maxFileBytes+1));assert.throws(()=>localText(p.root,'large.txt'),/bounded/);}));
test('symlink/junction traversal and output redirection rejected',()=>fixture(async p=>{fs.symlinkSync(os.tmpdir(),path.join(p.root,'escape'),process.platform==='win32'?'junction':'dir');const outside=path.join(os.tmpdir(),'force-review-external-'+path.basename(p.root)+'.txt');fs.writeFileSync(outside,'NONSECRET_EXTERNAL');try{assert.throws(()=>localText(p.root,'escape/'+path.basename(outside)),/escapes repository/);}finally{fs.unlinkSync(outside);}fs.mkdirSync(path.join(p.root,'product'));fs.symlinkSync(path.join(p.root,'product'),path.join(p.root,'research'),process.platform==='win32'?'junction':'dir');await assert.rejects(runReview(args(p,'--dry-run'),p.root,dep(p.root)),/symlink/);assert.equal(fs.readdirSync(path.join(p.root,'product')).length,0);}));
test('END-pinned excerpts and summaries do not substitute local untracked data',()=>fixture(p=>{
 fs.writeFileSync(path.join(p.root,'sample.csv'),'team,value\nA,"line1\nline2"\nB,2\n');fs.writeFileSync(path.join(p.root,'sample.json'),JSON.stringify([{team:'A',v:1},{team:'B',v:2}]));git(p.root,['add','sample.csv','sample.json']);git(p.root,['commit','-qm','evidence']);const sha=git(p.root,['rev-parse','HEAD']).trim();
 assert.equal(JSON.parse(summary(p.root,sha,'sample.csv')).dataRecords,2);assert.equal(JSON.parse(summary(p.root,sha,'sample.json')).rows,2);assert.match(context(p.root,p.end,'source.js#L1-L1'),/value = 2/);assert.throws(()=>context(p.root,p.end,'source.js#L1-L999'),/exceeds file/);
 fs.writeFileSync(path.join(p.root,'unrelated.txt'),'UNRELATED_PRIVATE');assert(!buildPacket(p.root,p.start,p.end).packet.includes('UNRELATED_PRIVATE'));fs.writeFileSync(path.join(p.root,'source.js'),'dirty');assert.throws(()=>buildPacket(p.root,p.start,p.end),/dirty/);
}));
test('CLI explicit-send, bounded overrides and focus validation',()=>{for(const a of [['HEAD~1','HEAD'],['HEAD~1','HEAD','--send','--dry-run'],['HEAD~1','HEAD','--dry-run','--max-usd','NaN'],['HEAD~1','HEAD','--send','--max-bytes','90000000'],['HEAD~1','HEAD','--dry-run','--max-tokens','3'],['HEAD~1','HEAD','--dry-run','--focus','unknown'],['HEAD~1','HEAD','--dry-run','--dry-run']])assert.throws(()=>parseArgs(a));assert.equal(parseArgs(['--help']).help,true);} );
test('paid mode requires complete brief and non-main worktree',()=>fixture(p=>{assert.throws(()=>buildPacket(p.root,p.start,p.end,{send:true}),/eight/);git(p.root,['branch','-m','main']);assert.throws(()=>buildPacket(p.root,p.start,p.end,{send:true,brief:'brief.json'}),/off-main/);}));
test('cache off and precise cache-write/read cost accounting',()=>fixture(async p=>{assert(SYSTEM.length>3000);const r=await requestReview(p.packet,{cache:false},{secretLoader:()=>fakeKey,fetcher:async(_u,opt)=>{assert(!JSON.parse(opt.body).system[0].cache_control);return response(p.packet);}});assert.equal(r.status,'REVIEW_COMPLETED');assert.equal(usageCost({input_tokens:1000000,output_tokens:1000000,cache_creation_input_tokens:1000000,cache_read_input_tokens:1000000},CONFIG.model),29.2);assert.equal(usageCost({input_tokens:0,output_tokens:0,cache_creation_input_tokens:10,cache_creation:{ephemeral_5m_input_tokens:9,ephemeral_1h_input_tokens:2}},CONFIG.model),null);}));
test('PowerShell files syntax-parse without accessing stored keys',{skip:process.platform!=='win32'},()=>{
 for(const file of ['setup-secret.ps1','read-secret.ps1','secret-storage.ps1']){const f=fileURLToPath(new URL(file,import.meta.url)).replaceAll("'","''");execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$t=$null;$e=$null;[System.Management.Automation.Language.Parser]::ParseFile('${f}',[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}`],{windowsHide:true,stdio:'pipe'});}
});
test('disposable DPAPI round-trip/ACL/removal; no owner secret inspection',{skip:process.platform!=='win32'},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'force-review-dpapi-')),dir=fileURLToPath(new URL('.',import.meta.url)),env={...process.env,LOCALAPPDATA:fs.realpathSync(temp),FORCE_REVIEW_SECRET_PIPE:'1'};
 try{
  const setup=path.join(dir,'setup-secret.ps1').replaceAll("'","''");
  const code=`function Read-Host {param($Prompt,[switch]$AsSecureString);if(-not $AsSecureString){throw 'Unexpected prompt'};$s=New-Object Security.SecureString;('disposable-dpapi-'+('x'*32)).ToCharArray()|ForEach-Object {$s.AppendChar($_)};$s.MakeReadOnly();return $s}; & '${setup}'`;
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',code],{env,windowsHide:true,stdio:'pipe'});
  const f=path.join(temp,'FORCE/claude-review/api-key.clixml'),cipher=fs.readFileSync(f,'utf16le');assert(!cipher.includes('disposable-dpapi-'));assert.match(cipher,/<SS>01000000d08c9ddf/);
  const got=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(dir,'read-secret.ps1')],{env,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});assert.equal(got,'disposable-dpapi-'+'x'.repeat(32));
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(dir,'setup-secret.ps1'),'-Remove'],{env,windowsHide:true,stdio:'pipe'});assert(!fs.existsSync(f));
 }finally{removeTemp(temp);}
});
test('DPAPI redirected into a Git checkout rejected before hidden prompt',{skip:process.platform!=='win32'},()=>fixture(p=>{assert.throws(()=>execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./setup-secret.ps1',import.meta.url))],{env:{...process.env,LOCALAPPDATA:p.root},windowsHide:true,stdio:'pipe'}));assert(!fs.existsSync(path.join(p.root,'FORCE')));}));

// A direct helper import must not accidentally contact the real endpoint.
test('real-client helper requires explicit send before secret access',async()=>{
 await assert.rejects(requestReview({bytes:1,packet:'fixture'},{},{secretLoader:()=>assert.fail('secret')}),/EXPLICIT_SEND_REQUIRED/);
});
test('sensitive changed paths cannot enter the automatic Git diff',()=>fixture(p=>{
 fs.writeFileSync(path.join(p.root,'.env.local'),'NONSECRET_SENTINEL=1\n');git(p.root,['add','.env.local']);git(p.root,['commit','-qm','sensitive path']);
 const end=git(p.root,['rev-parse','HEAD']).trim();assert.throws(()=>buildPacket(p.root,p.start,end),/Sensitive path/);
}));
test('candidate outside checkout HEAD ancestry is rejected',()=>fixture(p=>{
 git(p.root,['checkout','-qb','other',p.start]);fs.writeFileSync(path.join(p.root,'source.js'),'export const value = 3;\n');git(p.root,['add','source.js']);git(p.root,['commit','-qm','uncontained']);
 const other=git(p.root,['rev-parse','HEAD']).trim();git(p.root,['checkout','-q','codex/fixture']);assert.throws(()=>buildPacket(p.root,p.start,other),/Git inspection failed/);
}));
// F1: exact metadata from the first completed live batch; no live request or key.
test('reviewed live model identifier and Standard usage retain strict matching and cost',()=>{
 const model='claude-opus-5-5',usage={input_tokens:40670,output_tokens:8035,cache_creation_input_tokens:2375,cache_read_input_tokens:0,service_tier:'standard',inference_geo:'global',cache_creation:{ephemeral_5m_input_tokens:2375,ephemeral_1h_input_tokens:0}};
 assert.equal(model,CONFIG.model);assert.equal(usageCost(usage,model),.335255);
 assert.equal(usageCost(usage,'unverified-snapshot'),null);
});
// F2: a capped response stays invalid and retains safe usage; defaults unchanged.
test('output-cap truncation never accepts prose and preserves billing metadata',()=>fixture(async p=>{
 const r=await send(p.packet,{fetcher:async()=>response(p.packet,outcome(p.packet),{stop_reason:'max_tokens'})});
 assert.equal(r.status,'INVALID_RESPONSE');assert.equal(r.review,null);assert.equal(r.text,null);
 assert.equal(r.telemetry.stopReason,'max_tokens');assert.equal(r.telemetry.usage.output_tokens,20);assert(r.telemetry.estimatedUsd>0);
 assert.equal(CONFIG.maxOutputTokens,8192);assert(upperCost(p.packet.bytes,16384)>upperCost(p.packet.bytes,8192));
}));
// F3: later checkout files are provenance, never implicitly part of review.
test('post-END provenance distinguishes same HEAD, handoff-only and unrelated changes',()=>fixture(async p=>{
 assert.deepEqual(p.packet.postEndChanges,[]);assert.deepEqual(p.packet.outsideReviewFiles,[]);
 const ledger=`## API Batch: valid\nStart SHA: ${p.start}\nEnd SHA: ${p.end}\nBounded fixture\n`;
 fs.mkdirSync(path.join(p.root,'research/handoffs'),{recursive:true});fs.writeFileSync(path.join(p.root,CONFIG.handoff),ledger);git(p.root,['add',CONFIG.handoff]);git(p.root,['commit','-qm','ledger only']);
 const handoff=buildPacket(p.root,p.start,p.end);assert.deepEqual(handoff.postEndChanges,[{status:'A',path:CONFIG.handoff}]);assert.deepEqual(handoff.outsideReviewFiles,[]);assert.deepEqual(handoff.warnings,[]);
 fs.writeFileSync(path.join(p.root,'source.js'),'export const value = 3; // LATER_CONTENT_SENTINEL\n');git(p.root,['add','source.js']);git(p.root,['commit','-qm','later unreviewed file']);
 const r=await runReview([...args(p,'--dry-run'),'--batch','valid'],p.root,dep(p.root,{secretLoader:()=>assert.fail('secret'),fetcher:()=>assert.fail('network')}));
 assert.equal(r.result.apiCalls,0);assert.deepEqual(r.result.outsideReviewFiles,['source.js']);assert.deepEqual(r.result.postEndChanges,[{status:'A',path:CONFIG.handoff},{status:'M',path:'source.js'}]);
 assert.match(r.result.warnings[0],/Outside reviewed range END\.\.HEAD: source\.js/);const packet=fs.readFileSync(r.packetPath,'utf8');assert(packet.includes('"postEndChanges"'));assert(packet.includes('"outsideReviewFiles"'));assert(packet.includes('value = 2'));assert(!packet.includes('LATER_CONTENT_SENTINEL'));
 const saved=JSON.parse(fs.readFileSync(r.resultPath,'utf8'));assert.deepEqual(saved.postEndChanges,r.result.postEndChanges);assert.deepEqual(saved.outsideReviewFiles,['source.js']);
}));
// F4: compare actual bytes, not a terminal's encoding interpretation.
test('selected context headings use exact ASCII separator bytes',()=>fixture(p=>{
 const built=buildPacket(p.root,p.start,p.end,{context:['source.js#L1-L1']});
 const heading=built.packet.split('\n').find(x=>x.startsWith('### source.js'));
 assert.deepEqual(Buffer.from(heading,'utf8'),Buffer.from('### source.js#L1-L1 - END-pinned context','ascii'));
}));
// F5: always-color user config cannot alter packets or conceal binary diffs.
test('forced Git color leaves deterministic packets unchanged and binary rejection intact',()=>fixture(p=>{
 git(p.root,['config','color.ui','always']);git(p.root,['config','color.diff','always']);
 const colored=buildPacket(p.root,p.start,p.end);assert.equal(colored.packet,p.packet.packet);assert.equal(colored.packetHash,p.packet.packetHash);assert(!colored.packet.includes('\x1b'));
 fs.writeFileSync(path.join(p.root,'new.bin'),Buffer.from([0,1,2]));git(p.root,['add','new.bin']);git(p.root,['commit','-qm','binary evidence']);const end=git(p.root,['rev-parse','HEAD']).trim();
 assert.throws(()=>buildPacket(p.root,p.start,end),/Binary diff/);
}));
// F6: bounded section parsing, while the duplicate-ID fail-closed policy stays.
test('API handoff stops at next level-two heading without relaxing duplicate IDs',()=>fixture(p=>{
 const block=`## API Batch: valid\nStart SHA: ${p.start}\nEnd SHA: ${p.end}\n### Focus\nRELEVANT_ONLY\n`;
 const text='# Ledger\n'+block+'## Later checkpoint\nUNRELATED_AFTER_ENTRY\n'+`## API Batch: unrelated\nStart SHA: ${p.end}\nEnd SHA: ${p.end}\nOTHER_ENTRY\n`;
 const selected=selectHandoff(p.root,text,p.start,p.end,['valid']);assert(selected.includes('RELEVANT_ONLY'));assert(!selected.includes('UNRELATED_AFTER_ENTRY'));assert(!selected.includes('OTHER_ENTRY'));
 assert.throws(()=>selectHandoff(p.root,block+block,p.start,p.end,['valid']),/Duplicate/);
}));
