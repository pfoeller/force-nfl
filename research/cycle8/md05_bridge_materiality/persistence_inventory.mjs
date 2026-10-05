// Deterministic summary of the frozen local inventory; never fetches or reconstructs old provider feeds.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hash} from './runtime.mjs';
const root='research/cycle8/md05_bridge_materiality';
const bytes=fs.readFileSync(root+'/inputs/persistence_candidates.json','utf8').replace(/\r\n/g,'\n');
const manifest=JSON.parse(bytes),eligible=manifest.candidates.filter(c=>c.eligibleNormalized);
assert(eligible.length>0);assert(eligible.every(c=>c.stateLive&&c.base&&c.capturedAt&&c.generation));
const generations=[...new Set(eligible.map(c=>c.generation))];
assert.equal(generations.length,1,'New eligible generation needs explicit provenance/version audit, not silent inclusion');
assert.equal(generations[0],manifest.baselineGeneration);
const counts=Object.fromEntries([...new Set(manifest.candidates.map(c=>c.classification))].sort().map(k=>[k,manifest.candidates.filter(c=>c.classification===k).length]));
const result={schema:1,inventoryDate:manifest.scanDate,inventorySHA256:hash(bytes),method:manifest.method,rootsScanned:manifest.roots.length,fileCandidates:manifest.fileCandidates,
  byteDistinctJSONCandidates:manifest.candidates.length,eligibleNormalizedRecords:eligible.length,eligibleNormalizedFiles:eligible.reduce((s,c)=>s+c.paths.length,0),independentEligibleSnapshots:generations.length,
  eligibleDates:[...new Set(eligible.map(c=>c.capturedAt))],classificationCounts:counts,status:'PERSISTENCE UNRESOLVED: one independent eligible production snapshot; copies/reproductions are not temporal observations',
  historicalReplay:false,gitAllRefCandidatePaths:manifest.gitAllRefCandidatePaths,candidates:manifest.candidates};
const dest=path.resolve(process.argv[2]||root+'/results/persistence_inventory.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({independentEligibleSnapshots:1,fileCandidates:result.fileCandidates,byteDistinctJSONCandidates:result.byteDistinctJSONCandidates,classificationCounts:counts,resultSHA256:hash(fs.readFileSync(dest))}));
