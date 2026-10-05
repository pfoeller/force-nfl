// Deterministic summary of the frozen local inventory; never fetches or reconstructs old provider feeds.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {hash} from './runtime.mjs';
const root='research/cycle8/md05_bridge_materiality';
// Only logical root labels and relative paths may be serialized. Scan roots remain transient.
export function assertPathHygiene(value) {
  function visit(v) {
    if (typeof v === 'string') {
      const slash=v.replace(/\\/g,'/');
      assert(!/\b[a-z]:[\\/]/i.test(v) && !slash.startsWith('/') &&
        !/(?:^|\/)users\//i.test(slash) && !/(?:^|\/)home\//i.test(slash) &&
        !new RegExp('app'+'data','i').test(v),'absolute/local machine path in research artifact');
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') for(const [k,x] of Object.entries(v)){visit(k);visit(x);}
  }
  visit(value);return true;
}
export function sanitizeManifest(manifest) {
  // Frozen root order is the identity registry. Preserve it; append, never reorder, future roots.
  const physical=manifest.roots.map(r=>r.replace(/\\/g,'/').replace(/\/$/,''));
  assert.equal(new Set(physical.map(r=>r.toLowerCase())).size,physical.length,'duplicate scan root');
  const roots=physical.map((r,i)=>{
    if(/^<[^>]+>$/.test(r))return r;
    const category=i===0?'repo':/(?:^|\/)\.codex\/worktrees\//i.test(r)?'codex-worktree':
      /(?:^|\/)(?:temp|tmp)(?:\/|$)/i.test(r)?'local-temp':'project-copy';
    return i===0?'<repo>':`<${category}:${String(i+1).padStart(3,'0')}>`;
  });
  assert.equal(new Set(roots).size,roots.length,'logical root collision');
  const registry=physical.map((r,i)=>({physical:r,label:roots[i]})).sort((a,b)=>b.physical.length-a.physical.length);
  const mapped=new Map(),inverse=new Map();
  const normalize=v=>{
    if(typeof v !== 'string')return v;
    const slash=v.replace(/\\/g,'/');
    if(!/\b[a-z]:[\\/]/i.test(v) && !slash.startsWith('/'))return v;
    const found=registry.find(r=>slash.toLowerCase()===r.physical.toLowerCase()||slash.toLowerCase().startsWith(r.physical.toLowerCase()+'/'));
    assert(found,'unregistered absolute path; add its scan root rather than publish it');
    const label=found.label+slash.slice(found.physical.length);
    assert(!inverse.has(label)||inverse.get(label)===slash,'distinct candidate paths collapsed');
    inverse.set(label,slash);mapped.set(slash,label);return label;
  };
  const visit=v=>Array.isArray(v)?v.map(visit):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[normalize(k),visit(x)])):normalize(v);
  const result=visit(manifest);assert.deepEqual(result.roots,roots);assertPathHygiene(result);return result;
}
export function generateInventory(destination=root+'/results/persistence_inventory.json') {
const bytes=fs.readFileSync(root+'/inputs/persistence_candidates.json','utf8').replace(/\r\n/g,'\n');
const manifest=JSON.parse(bytes);assertPathHygiene(manifest);
const eligible=manifest.candidates.filter(c=>c.eligibleNormalized);
assert(eligible.length>0);assert(eligible.every(c=>c.stateLive&&c.base&&c.capturedAt&&c.generation));
const generations=[...new Set(eligible.map(c=>c.generation))];
assert.equal(generations.length,1,'New eligible generation needs explicit provenance/version audit, not silent inclusion');
assert.equal(generations[0],manifest.baselineGeneration);
const counts=Object.fromEntries([...new Set(manifest.candidates.map(c=>c.classification))].sort().map(k=>[k,manifest.candidates.filter(c=>c.classification===k).length]));
const result={schema:1,inventoryDate:manifest.scanDate,inventorySHA256:hash(bytes),method:manifest.method,rootsScanned:manifest.roots.length,fileCandidates:manifest.fileCandidates,
  byteDistinctJSONCandidates:manifest.candidates.length,eligibleNormalizedRecords:eligible.length,eligibleNormalizedFiles:eligible.reduce((s,c)=>s+c.paths.length,0),independentEligibleSnapshots:generations.length,
  eligibleDates:[...new Set(eligible.map(c=>c.capturedAt))],classificationCounts:counts,status:'PERSISTENCE UNRESOLVED: one independent eligible production snapshot; copies/reproductions are not temporal observations',
  historicalReplay:false,gitAllRefCandidatePaths:manifest.gitAllRefCandidatePaths,candidates:manifest.candidates};
assertPathHygiene(result);
const dest=path.resolve(destination);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({independentEligibleSnapshots:1,fileCandidates:result.fileCandidates,byteDistinctJSONCandidates:result.byteDistinctJSONCandidates,classificationCounts:counts,resultSHA256:hash(fs.readFileSync(dest))}));
return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv[2]==='--normalize-manifest'){
    const [source,destination]=process.argv.slice(3);assert(source&&destination,'provide private manifest and sanitized destination');
    const manifest=JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));
    const sanitized=sanitizeManifest(manifest);fs.writeFileSync(destination,JSON.stringify(sanitized,null,2)+'\n');
    console.log(JSON.stringify({roots:sanitized.roots.length,candidates:sanitized.candidates.length,pathHygiene:true}));
  } else generateInventory(process.argv[2]);
}
