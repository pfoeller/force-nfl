// Offline intent validation: only accepted RB bracket recomputed, no measurement rerun or frame selection.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {DIR,BASE,ORIGINAL,ACCEPTED,ROOT,SOURCE_COMMITS,git,blob,sha,extract,serialize,classify} from './extract.mjs';
import {auditPrior} from '../prior_audit.mjs';
const PACKAGE='research/cycle8/md07_unit_calibration',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function validateIntent(h,c,m){
 assert.equal(h.base,BASE);assert.equal(h.original,ORIGINAL);assert.equal(h.accepted,ACCEPTED);assert.equal(h.localRoot,ROOT);assert.deepEqual(h.history.map(r=>r.commit),SOURCE_COMMITS);
 assert.deepEqual(m.frames.DEFAULT,{beta:1,center:0,meaning:'Full receiving subtraction'});
 assert.deepEqual(m.frames.UNADJUSTED,{beta:0,center:0,meaning:'No receiving subtraction'});
 assert.equal(m.frames.LIVE_FITTED.beta,'reference-population ridge fit');assert.equal(m.frames.LIVE_FITTED.center,'reference QB median');
 assert.equal(m.classification,'D. SAME-FRAME INVARIANT UNAMBIGUOUS, FRAME CHOICE AMBIGUOUS');assert.equal(m.fixEligibility,'B. OWNER MODEL DECISION REQUIRED BEFORE FIX');assert.equal(m.ownerDecision,'PENDING; production correction NOT AUTHORIZED');
 for(const r of c.sourceSnapshots){const calls=r.occurrences.filter(x=>['EXPLICIT CALL','DIRECT ARRAY CALLBACK'].includes(x.kind));assert.equal(calls.length,3,'all three production callers');assert.equal(calls.filter(x=>x.kind==='DIRECT ARRAY CALLBACK').length,1);assert.equal(calls.filter(x=>x.kind==='EXPLICIT CALL'&&x.arguments==='prior').length,1);assert.equal(calls.filter(x=>x.kind==='EXPLICIT CALL'&&x.arguments.includes("rbPolicy==='v115-partial-orthogonal'")).length,1);}
 assert.equal(c.acceptedTree.length,17,'full accepted-tree occurrence inventory');assert.equal(c.otherFileVersions.length,6,'test/research historical versions');
 for(const r of m.rows){assert.equal(Object.keys(r.support).length,5);for(const cell of Object.values(r.support)){assert(['STRONG','MODERATE','WEAK','NONE'].includes(cell.strength));assert(cell.explanation);for(const id of cell.references)assert(h.evidence[id],id+' source reference');}}
 assert.equal(m.rows.length,10);assert(h.evidence['root.effective-reference'].text.includes('.map(priorRbOrthogonalComposite)'));assert(h.evidence['root.effective-individual'].text.includes('priorRbOrthogonalComposite(prior)'));
 assert.equal(classify(h.evidence['root.effective-reference'].text),'DIRECT ARRAY CALLBACK');
 assert(h.evidence['root.wr-reference'].text.includes('receiverPassBeta')&&h.evidence['root.wr-reference'].text.includes('orthogonalQbCenter'));
 assert(h.fittedProvenance.requiredFieldsComplete);assert.equal(h.fittedProvenance.season,2025);assert.equal(h.fittedProvenance.profileCount,32);assert.equal(h.fittedProvenance.finitePairs,32);
 return true;
}
const first=serialize(extract()),second=serialize(extract());assert.deepEqual(first,second,'two complete history extractions byte identity');
for(const [p,t] of Object.entries(first))assert.equal(fs.readFileSync(DIR+'/'+p,'utf8').replace(/\r\n/g,'\n'),t,p+' extraction parity');
const h=read(DIR+'/history.json'),c=read(DIR+'/callsite_inventory.json'),m=read(DIR+'/intent_matrix.json');validateIntent(h,c,m);
let negatives=0;
for(const mutate of [
 (h,c,m)=>{c.sourceSnapshots[0].occurrences=c.sourceSnapshots[0].occurrences.filter(r=>!(r.kind==='EXPLICIT CALL'&&r.arguments==='prior'));},
 (h,c,m)=>{c.sourceSnapshots[0].occurrences.find(r=>r.kind==='DIRECT ARRAY CALLBACK').kind='EXPLICIT CALL';},
 (h,c,m)=>{h.history[0].commit='wrong-history-SHA';},
 (h,c,m)=>{[m.frames.DEFAULT,m.frames.LIVE_FITTED]=[m.frames.LIVE_FITTED,m.frames.DEFAULT];}
]){const hh=structuredClone(h),cc=structuredClone(c),mm=structuredClone(m);mutate(hh,cc,mm);assert.throws(()=>validateIntent(hh,cc,mm));negatives++;}
// Immutable accepted numerical evidence/provenance/facts/scripts: original Git blobs are the oracle.
const files=git('ls-tree','-r','--name-only',ACCEPTED,'--',PACKAGE).trim().split('\n');
const governance=new Set([PACKAGE+'/README.md',PACKAGE+'/hashes.json']);let parity=0;
for(const p of files){if(governance.has(p))continue;assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),blob(ACCEPTED,p),p+' accepted parity');parity++;}
const input=fs.readFileSync(PACKAGE+'/inputs/current_snapshot.json','utf8').replace(/\r\n/g,'\n');assert.equal(sha(input),'b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247');
const guard=auditPrior(JSON.parse(input));assert.equal(JSON.stringify(guard,null,2)+'\n',blob(ACCEPTED,PACKAGE+'/results/rb_prior_call_audit.json'));
assert(guard.frames.every(f=>f.KC.matchedRank===3));
const pins=read(PACKAGE+'/hashes.json');for(const [p,pin] of Object.entries(pins))assert.equal(sha(fs.readFileSync(PACKAGE+'/'+p,'utf8').replace(/\r\n/g,'\n')),pin,p+' checksum');
console.log(JSON.stringify({result:'PASS',historicalSourceCommits:3,productionCallsPerSnapshot:3,sourceSnapshots:4,acceptedTreeOccurrences:17,otherHistoricalFileVersions:6,intentRows:10,negativeControls:negatives,twoRunByteIdentity:true,acceptedFileParity:parity,hashPins:Object.keys(pins).length,frozenInputUnchanged:true,impactBracket:guard.frames.map(f=>f.maxAbsCurrentDelta),KCAllFramesRank3:true,classification:m.classification,fixEligibility:m.fixEligibility}));
