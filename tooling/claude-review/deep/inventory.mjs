import path from 'node:path';
import {git,hash,fail,SHA,compare,relative} from './util.mjs';
import {noSecrets} from '../packet.mjs';
export const POLICY_VERSION='force-deep-eligibility-v1';
export const EXCLUSIONS=Object.freeze({BINARY_MEDIA:'NUL/non-UTF8 bytes; content is opaque to a text reviewer.',NONREGULAR_OBJECT:'Git symlink or gitlink; target is not followed.',RAW_PROVIDER_CACHE:'Committed provider cache payload/metadata; ingestion logic and contracts are reviewed.',FIXTURE_POPULATION:'Numeric/statistical fixture population; fixture builder, contract and tests are reviewed.',GENERATED_EVIDENCE:'Machine-readable result population with an included local analysis/check source.',EXACT_PUBLIC_MIRROR:'Byte-identical public mirror; authoritative source and public builder are included.',VENDORED_THIRD_PARTY:'Explicit vendor/node_modules directory; own integration code remains included.',REVIEW_OUTPUT:'Recorded API prose/packets under the explicit review-artifact directory, not tooling.'});
export function classify(p){
 if(/\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|pdf)$/i.test(p))return 'binary-media';
 if(/^public\//.test(p))return 'generated-public';
 if(/^data\/live-cache\//.test(p))return 'raw-datasets';
 if(/(^|\/)fixtures\//.test(p))return 'fixtures-snapshots';
 if(/^research\/.*\/results\//.test(p))return 'generated-research-evidence';
 if(/^tooling\//.test(p)||/^research\/claude-/.test(p))return 'review-tooling';
 if(/(^|\/)(?:vendor|third_party|node_modules)\//.test(p))return 'vendored-third-party';
 if(/^scripts\/(?:run_tests|test_catalog|lib\/|TESTING)/.test(p))return 'test-infrastructure';
 if(/^scripts\/test_|(^|\/)tests?\//.test(p))return 'tests';
 if(/FORCE_ROADMAP|research\/handoffs\//.test(p))return 'roadmap-governance';
 if(/\.(md|txt)$/i.test(p))return 'documentation';
 if(/^model\//.test(p))return 'model-statistical-source';
 if(/^research\//.test(p))return /\.(m?js|cjs|py|sh)$/i.test(p)?'research-methodology-source':'research-evidence';
 if(/^force_server|^src\//.test(p))return 'server-runtime';
 if(/^assets\//.test(p)||p==='index.html')return 'frontend';
 if(/^scripts\/(?:seed_|audit_|validate_bundle)/.test(p))return 'provider-ingestion';
 if(/^scripts\/build|^\.github\/|^Dockerfile$|^package(?:-lock)?\.json$|^wrangler\.|^serve_local|^\.(?:gitignore|dockerignore)$|\.(?:ya?ml|toml|ini)$/i.test(p))return 'config-build-deploy';
 if(/^data\//.test(p))return 'production-data-contract';
 if(/^benchmarks\//.test(p))return 'benchmark-evidence';
 return /\.(?:m?js|cjs|py|html|css)$/i.test(p)?'production-source':'other';
}
function textKind(b){if(b.includes(0))return 'BINARY_NUL';try{new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);return 'UTF8';}catch{return 'BINARY_NON_UTF8';}}
export function inventory(root,target){
 fail(SHA.test(target),'EXACT_TARGET_SHA_REQUIRED');fail(git(root,['rev-parse',target+'^{commit}']).trim()===target,'TARGET_MISMATCH');
 const records=git(root,['ls-tree','-rlz',target],64*1024*1024).split('\0').filter(Boolean).map(s=>{const m=/^(\d+) (blob|commit) ([a-f0-9]+) +(-|\d+)\t([\s\S]+)$/.exec(s);fail(m,'UNSUPPORTED_TREE_RECORD');relative(m[5]);return {mode:m[1],type:m[2],blob:m[3],bytes:m[4]==='-'?0:Number(m[4]),path:m[5]};}).sort((a,b)=>compare(a.path,b.path));
 const blobs=records.filter(x=>x.type==='blob'),size=blobs.reduce((s,x)=>s+x.bytes+100,1024);
 const batch=blobs.length?git(root,['cat-file','--batch'],size,null,blobs.map(x=>x.blob).join('\n')+'\n'):Buffer.alloc(0);let at=0;const contents=new Map();
 for(const r of blobs){const e=batch.indexOf(10,at),header=batch.subarray(at,e).toString('ascii');fail(header===`${r.blob} blob ${r.bytes}`,'BLOB_HEADER_MISMATCH');at=e+1;contents.set(r.path,batch.subarray(at,at+r.bytes));at+=r.bytes+1;}fail(at===batch.length,'BLOB_BATCH_TRAILING_DATA');
 const present=new Map(records.map(x=>[x.path,x]));
 const files=records.map(r=>{const b=contents.get(r.path)??Buffer.alloc(0),kind=textKind(b),classification=classify(r.path);let reason=null,sourcePaths=[];
  if(!/^100(?:644|755)$/.test(r.mode))reason='NONREGULAR_OBJECT';
  else if(kind!=='UTF8')reason='BINARY_MEDIA';
  else if(/(^|\/)(?:vendor|third_party|node_modules)\//.test(r.path))reason='VENDORED_THIRD_PARTY';
  else if(/^research\/claude-api-reviews\//.test(r.path))reason='REVIEW_OUTPUT';
  else if(/^data\/live-cache\//.test(r.path))reason='RAW_PROVIDER_CACHE';
  else if(/(^|\/)fixtures\/.*\.csv$/i.test(r.path))reason='FIXTURE_POPULATION';
  else if(/^research\/.*\/results\/.*\.(?:json|csv)$/i.test(r.path)){
   const base=r.path.slice(0,r.path.indexOf('/results/'));
   sourcePaths=['analyze.mjs','analyze_current.mjs','check.mjs','check.py','evaluate.py'].map(x=>base+'/'+x).filter(x=>present.has(x));if(sourcePaths.length)reason='GENERATED_EVIDENCE';
  }
  if(!reason&&r.path.startsWith('public/')){const source=r.path.slice(7);if(present.has(source)&&present.has('scripts/build_public.py')&&contents.get(source)?.equals(b)){reason='EXACT_PUBLIC_MIRROR';sourcePaths=[source,'scripts/build_public.py'];}}
  const eligible=!reason,ambiguity=classification==='other'||classification==='research-evidence'||classification==='benchmark-evidence'?['Unrecognized/evidence text included by default; owner may narrow policy in a separate reviewed change.']:[];
  if(eligible)noSecrets(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b));
  return {...r,sha256:r.type==='blob'?hash(b):null,text:kind,classification,eligible,disposition:eligible?'INCLUDED':'EXCLUDED',exclusionReason:reason,explanation:reason?EXCLUSIONS[reason]:'Human-readable tracked content included; size never excludes.',sourcePaths,ambiguity,ranges:[],contentShards:[],thematicPasses:[]};
 });
 // Generator/mirror exclusions are permitted only when the named truth-owner is itself included.
 for(const f of files)for(const p of f.sourcePaths)fail(files.find(x=>x.path===p)?.eligible,'EXCLUDED_TRUTH_OWNER: '+p);
 return {target,files,contents};
}
export const THEMES=Object.freeze([
 {id:'architecture',title:'Architecture & integration',instruction:'Challenge duplicate truth owners, hidden consumers, stale parallel paths, model/display separation, provider/cache ownership, frontend/server/model divergence, fallback and build/deploy integration. Establish implemented behavior from source, not historical roadmap aspirations.',select:f=>['model-statistical-source','frontend','server-runtime','provider-ingestion','config-build-deploy','production-source','production-data-contract','test-infrastructure'].includes(f.classification)||['README.md','DEPLOYMENT_STRUCTURE.md','model/README.md','FORCE_ROADMAP.md'].includes(f.path)},
 {id:'correctness',title:'Correctness & tests',instruction:'Challenge circular/false-confidence tests, exclusions, stale fixtures, missing negative controls, cache/error/provider failure handling, security and temporal leakage, runtime/build parity, stale version-identity assertions. Test catalogs and assertions are evidence, not proof of correctness.',select:f=>['tests','test-infrastructure','config-build-deploy','server-runtime','provider-ingestion'].includes(f.classification)||['assets/app.js','model/live_profiles.js','PREDICTIVE_FEATURE_POLICY_V30.md'].includes(f.path)},
 {id:'statistical',title:'FORCE statistical / football integrity',instruction:'Challenge implemented FORCE methodology: leakage/look-ahead; opponent adjustment/SOS; normalization and canonical vs display separation; sample size/early season; priors/continuity/recency; smoothing/regression; calibration/Brier/backtest; QB EPA ANY/A CPOE success rushing; QB/OL/pressure; receiver/RB aggregation and cross-unit bridges; defense/pass rush; FLAG/Luck/fumbles/drives/scoring prevention; FORCEcast Monte Carlo distributions and representative scores; playoffs probabilities/seeding/tiebreaks; historical replay/reference semantics; provider assumptions, double-counting/correlation/circularity, uncertainty and football interpretation. Method disagreement is not automatically a defect. Do not invent a replacement model or assume deferred roadmap ideas exist.',select:f=>['model-statistical-source','research-methodology-source','production-data-contract','provider-ingestion'].includes(f.classification)||f.path==='assets/app.js'||(/^scripts\/test_/.test(f.path)&&/qb|forecast|prior|regime|luck|flag|penalty|playoff|calibr|score|normal|unit|histor|brier|pressure|drive|md0/i.test(f.path))||(/\.md$/.test(f.path)&&/MODEL|RESEARCH|SEMANTICS|POLICY|REGIME|FORECAST|PENALTY|DEFENSE|LIVE_METRICS|MD0|research\//i.test(f.path))},
 {id:'adversarial',title:'Adversarial fresh eyes',instruction:'Look beyond recently changed areas. What important thing could be wrong that our normal targeted review workflow would systematically fail to ask about? Challenge forgotten/fallback paths, shared assumptions, plausible output from wrong math, duplicated formulas/cross-language drift, circular validation, rarely-diffed constants, hidden coupling, happy-path-only tests, docs/code divergence and build/runtime mismatches. This pass receives source, not previous reviewer findings.',select:f=>['model-statistical-source','server-runtime','production-source','provider-ingestion','config-build-deploy','production-data-contract'].includes(f.classification)||['assets/app.js','index.html','README.md','AUDIT.md','FORCE_ROADMAP.md','scripts/TESTING.md'].includes(f.path)||f.classification==='tests'&&parseInt(hash(f.path).slice(0,8),16)%7===0}
]);
// Static source-backed context: declarations only, not Codex findings or inferred truth ownership.
export function architectureContext(inv){return inv.files.filter(f=>f.eligible&&/\.(?:m?js|cjs|py|html)$/.test(f.path)&&['frontend','server-runtime','model-statistical-source','config-build-deploy'].includes(f.classification)).map(f=>{const s=inv.contents.get(f.path).toString('utf8');return {path:f.path,blob:f.blob,declaredReferences:[...new Set([...s.matchAll(/(?:from\s*|require\(\s*|src=|import\s+)["']([^"'\n]+)["']/g)].map(m=>m[1]))].sort(compare)};});}