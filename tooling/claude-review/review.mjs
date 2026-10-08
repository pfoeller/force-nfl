import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CONFIG} from './config.mjs';
import {contextAdmission} from './context.mjs';
import {buildPacket,git,hash,noSecrets} from './packet.mjs';
import {SYSTEM,loadSecret,requestReview,upperCost} from './client.mjs';
export function parseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length<3)throw new Error('Provide START END and exactly one of --dry-run or --send.');
 const [start,end,...rest]=argv,o={start,end,batches:[],context:[],artifacts:[],summaries:[]},seen=new Set();
 const values=new Map([['--batch','batches'],['--context','context'],['--artifact','artifacts'],['--summary','summaries'],['--brief','brief'],['--focus','focus'],['--max-bytes','maxBytes'],['--max-tokens','maxTokens'],['--max-usd','maxUsd']]);
 for(let i=0;i<rest.length;i++){
  const a=rest[i],repeat=['--batch','--context','--artifact','--summary'].includes(a);
  if(!repeat&&seen.has(a))throw new Error('Duplicate option.');seen.add(a);
  if(a==='--send')o.send=true;else if(a==='--dry-run')o.dryRun=true;else if(a==='--no-cache')o.cache=false;
  else if(values.has(a)){const v=rest[++i];if(!v||v.startsWith('--'))throw new Error('Missing option value.');const k=values.get(a);if(repeat)o[k].push(v);else o[k]=v;}
  else throw new Error('Unknown option; consult --help.');
 }
 if(Boolean(o.send)===Boolean(o.dryRun))throw new Error('Exactly one --send or --dry-run required.');
 for(const [k,min,max,integer] of [['maxBytes',1024,1048576,true],['maxTokens',256,32768,true],['maxUsd',.01,25,false]])if(o[k]!==undefined){o[k]=Number(o[k]);if(!Number.isFinite(o[k])||o[k]<min||o[k]>max||integer&&!Number.isInteger(o[k]))throw new Error('Invalid budget override.');}
 if(o.focus&&!['statistical','engineering','interpretation','football','all'].includes(o.focus))throw new Error('Invalid focus.');
 if(new Set(o.batches).size!==o.batches.length||o.batches.some(x=>!/^[A-Za-z0-9_-]{1,80}$/.test(x)))throw new Error('Invalid/duplicate batch ID.');
 return o;
}
function outputDirectory(root){
 const dest=path.join(root,CONFIG.artifacts);
 for(let p=dest;p!==path.dirname(p);p=path.dirname(p)){
  if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new Error('Review output path must not traverse a symlink/junction.');if(p===root)break;
 }
 const relative=path.relative(root,dest).replaceAll('\\','/');if(relative!==CONFIG.artifacts)throw new Error('Review output path escaped root.');
 // Output must be locally ignored; never create tracked review records.
 if(!git(root,['check-ignore','--no-index',relative+'/guard.json']).trim())throw new Error('Review output directory must be ignored.');
 fs.mkdirSync(dest,{recursive:true});return dest;
}
export async function runReview(argv,root=process.cwd(),deps={}){
 const options=parseArgs(argv);
 if(options.help)return {exitCode:0,message:'node tooling/claude-review/review.mjs START END (--dry-run|--send) --batch ID --brief PATH [--context PATH#L1-L100] [--artifact PATH] [--summary PATH] [--focus statistical|engineering|interpretation|football] [--max-bytes N] [--max-tokens N] [--max-usd N] [--no-cache]'};
 const expectedRoot=deps.expectedRoot??fileURLToPath(new URL('../../',import.meta.url));
 const p=buildPacket(root,options.start,options.end,{...options,expectedRoot});
 if(p.empty)return {exitCode:0,message:'EMPTY_RANGE: no changed files, no API call, no review disposition.'};
 contextAdmission(p.bytes,options.maxTokens??CONFIG.maxOutputTokens,Buffer.byteLength(SYSTEM));
 const ceiling=upperCost(p.bytes,options.maxTokens??CONFIG.maxOutputTokens,options.cache!==false);
 if(ceiling>(options.maxUsd??CONFIG.maxEstimatedUsd))throw new Error(`COST_BUDGET_EXCEEDED: estimated ceiling $${ceiling.toFixed(4)}; no secret loaded or request sent.`);
 const dir=outputDirectory(p.identity.root),timestamp=(deps.now??(()=>new Date().toISOString()))(),stamp=timestamp.replace(/[:.]/g,'-');
 const base=`${stamp}-${p.start.slice(0,12)}-${p.end.slice(0,12)}-${p.packetHash.slice(0,16)}`;
 const packetPath=path.join(dir,base+'.packet.txt'),resultPath=path.join(dir,base+'.review.json');
 if(fs.existsSync(packetPath)||fs.existsSync(resultPath))throw new Error('Review artifact identity already exists; no overwrite or paid request.');
 let response,key=null;
 try{
  if(options.send){
   try{key=(deps.secretLoader??loadSecret)();if(typeof key!=='string'||key.length<20||/\s/.test(key))throw new Error();noSecrets(p.packet,key);noSecrets(SYSTEM,key);}
   catch{response={status:'REQUEST_FAILED',reason:'SECRET_UNAVAILABLE_OR_UNSAFE_PACKET; nothing sent',review:null,text:null,telemetry:null,apiCalls:0};}
  }
  if(!response){
   fs.writeFileSync(packetPath,p.packet,{encoding:'utf8',flag:'wx'});
   response=options.send?await requestReview(p,options,{...deps,secretLoader:()=>key}):{status:'DRY_RUN',reason:null,review:null,text:null,telemetry:null,apiCalls:0,spentUsd:0};
  }
 }finally{key=null;}
 const result={schema:1,project:'FORCE',timestamp,startSha:p.start,endSha:p.end,inspectedHead:p.identity.head,worktree:p.identity.root,branch:p.identity.branch,packetHash:p.packetHash,systemHash:hash(SYSTEM),packetBytes:p.bytes,selectedFiles:p.included,changedFiles:p.changed,postEndChanges:p.postEndChanges,outsideReviewFiles:p.outsideReviewFiles,handoffRevision:p.handoffRevision,warnings:p.warnings,focus:p.focus,requestedModel:CONFIG.model,cacheMode:options.cache===false?'off':'stable-prefix-5m',inference:'global Standard; no Fast or tools',estimatedCeilingUsd:ceiling,pricing:CONFIG.pricing,pricingChecked:CONFIG.pricingChecked,pricingSource:CONFIG.pricingSource,...response,reviewHash:response.text?hash(response.text):null,humanDisposition:'PENDING; API verdict does not authorize integration or release'};
 const serialized=noSecrets(JSON.stringify(result,null,2)+'\n');fs.writeFileSync(resultPath,serialized,{encoding:'utf8',flag:'wx'});
 const completed=response.status==='REVIEW_COMPLETED',exitCode=completed?(response.review.verdict.startsWith('ACCEPTED')?0:1):response.status==='DRY_RUN'?0:2;
 const u=response.telemetry?.usage,message=completed?`REVIEW_COMPLETED: ${response.review.verdict}; ${p.bytes} bytes; input=${u?.input_tokens??'unknown'}; output=${u?.output_tokens??'unknown'}; cache-write=${u?.cache_creation_input_tokens??'unknown'}; cache-read=${u?.cache_read_input_tokens??'unknown'}; estimated $${response.telemetry?.estimatedUsd?.toFixed(4)??'unknown'}`:`${response.status}: ${p.bytes} bytes; estimated paid ceiling $${ceiling.toFixed(4)}; API calls=${response.apiCalls}; human disposition PENDING`;
 return {exitCode,message,packetPath:fs.existsSync(packetPath)?packetPath:null,resultPath,result};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await runReview(process.argv.slice(2));console.log(r.message);if(r.packetPath)console.log('Packet: '+r.packetPath);if(r.resultPath)console.log('Result: '+r.resultPath);process.exitCode=r.exitCode;}
 catch(e){let message='Harness failed safely; no review disposition applied.';try{message=noSecrets(e.message);}catch{}console.error(message);process.exitCode=2;}
}
