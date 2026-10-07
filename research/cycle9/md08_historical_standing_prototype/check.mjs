// Offline check for the MD-08 historical-standing prototype. No network, provider fetch,
// production write or retune. Usage (repository root):
//   node research/cycle9/md08_historical_standing_prototype/check.mjs [--write-hashes]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as X from './transforms.mjs';
import {analyze,serialize,DIR,PINS} from './analyze.mjs';

const RESULTS=['reproduction.json','availability.json','distributions.json','edge_semantics.json','stage_and_cross_unit.json','sensitivity.json','team_tables.csv'];
const PACKAGE=['README.md','inputs.json','transforms.mjs','analyze.mjs','check.mjs',...RESULTS.map(f=>'results/'+f)];

// 1. Pins, follow-up package integrity, identity seam and exact canonical reproduction assert in analyze().
const a=analyze(),out=serialize(a);
for(const f of RESULTS)assert.equal(F.lf(DIR+'/results/'+f),out[f],'results/'+f+' reproduces');
const manifest=JSON.parse(F.lf(DIR+'/inputs.json'));
assert.deepEqual(manifest.pins,Object.fromEntries(Object.entries(PINS).filter(([,h])=>h!==null)));

// 2. Invariants of the reported findings.
assert.equal(a.reproduction.maxAbsResidualVs6DecimalCsv<=5e-7,true);
assert.equal(a.reproduction.constructValidation.olVsV149.exactWithin1e7,544,'fixture OL equals production V149 2025 windows');
for(const u of ['olIndex','receiverIndex','rbIndex','qbIndex']){
  const e=a.edges[u].probes;assert.equal(e.equalToWorst.A,0);assert.equal(e.equalToBest.A,100);assert.equal(e.worseThanWorst.A,0);assert.equal(e.betterThanBest.A,100);
  for(const key of [u,u+'_3game']){const p=a.edges[key].probes;
    assert(p.equalToBest.C<100&&p.betterThanBest.C>p.equalToBest.C&&p.betterThanBest.C<100,key+': C maps the historical best below 100 and nearby records between it and 100');
    assert.equal(p.distantBetterThanBest.C,100,key+': C saturates to exactly 100 for a distant finite input (double precision)');assert.equal(p.distantWorseThanWorst.C,0,key+': C saturates to exactly 0 for a distant finite input');
    assert(Math.abs(p.historicalMedian.A-50)<=1,key+': A places the sample median near 50 (not an exact guarantee)');}
  for(const k of ['AS','BS','CS'])for(let i=1;i<a.tables[u][k].length;i++){} // tables exist
  for(const ref of new Set(a.tables[u].AS.map(r=>r.reference))){const sorted=a.tables[u].AS.filter(r=>r.reference===ref).sort((p,q)=>p.signal-q.signal);for(let i=1;i<sorted.length;i++)assert(sorted[i].display>=sorted[i-1].display,u+' A monotone in signal within a reference');}
  const lo=a.stage.leaveOneSeasonOut[u];assert(lo.AF.shareAt0or100>lo.AS.shareAt0or100,u+': full-season reference inflates endpoint hits out of sample');}
assert.equal(a.availability.units.defenseIndex.verdict.startsWith('NOT SUPPORTED'),true);
// Correction checks (Codex review B of 2465c8e).
assert.match(a.reproduction.defenseEvidenceLevels.recomputedFromStoredConstituents,/^YES/);assert.match(a.reproduction.defenseEvidenceLevels.historicalInputReplay,/^NO/);
F.close(a.edges.olIndex_3game.probes.historicalMedian.A,49.603175,'OL 3-game median A',5e-7);F.close(a.edges.olIndex_3game.probes.historicalMedian.B,44.040079,'OL 3-game median B',5e-7);F.close(a.edges.olIndex_3game.probes.historicalMedian.C,49.609375,'OL 3-game median C',5e-7);
assert.equal(a.edgeRules.tieMedianExample.A,40);F.close(a.edgeRules.tieMedianExample.C,41.666667,'tie-block median C',5e-7);
assert.equal(a.edgeRules.numericalSaturationExample.C_at_100,100);assert.equal(a.edgeRules.numericalSaturationExample.C_at_minus100,0);assert(a.edgeRules.numericalSaturationExample.C_at_best<100);
assert.equal(a.availability.repositoryHistoricalLayers.otherComponentReferences.metrics.qb_pass_success_rate.fourGame,448);assert.equal(a.availability.repositoryHistoricalLayers.otherComponentReferences.metrics.qb_pass_success_rate.fullSeason,32);
const DISP={olIndex:[.950784,24,8],receiverIndex:[.95088,23,8],rbIndex:[.84934,28,13],qbIndex:[.961877,23,6]};
for(const [u,[sp,mv,mx]] of Object.entries(DISP)){const d=a.sensitivity[u].candidateA_S_displayOrderVsFinalGradeOrder;F.close(d.spearman,sp,u+' display-final spearman',5e-7);assert.deepEqual([d.teamsMoving,d.maxAbsMove],[mv,mx],u+' display-final movement');}
assert.equal(a.sensitivity.olIndex.rawSignalOrderVsFinalGradeOrder.teamsMoving,22);assert.equal(a.sensitivity.receiverIndex.rawSignalOrderVsFinalGradeOrder.teamsMoving,25);
const lo=u=>a.stage.leaveOneSeasonOut[u];for(const u of ['olIndex','receiverIndex','rbIndex','qbIndex'])assert(lo(u).AC.shareAt0or100<=lo(u).AS.shareAt0or100,u+': any-stage C has no more endpoint hits than S (exact calendar-stage matching not shown to be uniquely required)');

// 3. Negative controls.
const fails=(fn,label)=>{let threw=false;try{fn();}catch{threw=true;}assert(threw,'negative control did not fail: '+label);return label;};
const same=(b,label)=>{for(const u of Object.keys(a.tables))for(const k of Object.keys(a.tables[u]))a.tables[u][k].forEach((r,i)=>F.close(r.display,b.tables[u][k][i].display,label+' '+u+' '+k,1e-12));};
const {x,L}=F.load();
const controls=[
  fails(()=>{const z=structuredClone(x.teams.KC.display);z.coverageIndex+=1;assert.equal(L.defenseCompositeFrom(z),x.teams.KC.display.defenseIndex);},'a changed stored constituent grade breaks the defense composite recomputation'),
  fails(()=>{const d=a.sensitivity.olIndex.rawSignalOrderVsFinalGradeOrder;assert.equal(d.teamsMoving,a.sensitivity.olIndex.candidateA_S_displayOrderVsFinalGradeOrder.teamsMoving);},'raw-signal order cannot stand in for the actual displayed order (OL 22 vs 24 movers)'),
  fails(()=>{assert(X.candidateC([0,1,2,3],1e6)<100,'open interval');},'a claimed strictly open C interval is refuted by double-precision saturation'),
  fails(()=>{assert.equal(X.candidateA([0,1,1,1,2,3],1),50);},'a universal exact-50 median claim is refuted by a tied centre block'),
  fails(()=>same(analyze({swapUnit:{olIndex:'receiverIndex'}}),'wrong unit'),'wrong unit reference (OL current values mapped against the receiver population) changes the OL tables'),
  fails(()=>same(analyze({stageOverride:{S:'F'}}),'wrong stage'),'wrong stage reference (full season used where stage-matched is declared) changes the tables'),
  fails(()=>{const b=analyze({flip:{olIndex:true}});assert.equal(b.leaders.units.olIndex.leader.team,a.leaders.units.olIndex.leader.team);},'reversed OL orientation (disruption not sign-flipped) changes the leader'),
  fails(()=>{const ref=[1,2,2,2,3,4];assert.equal(X.candidateA(ref,2,{tie:'min'}),X.candidateA(ref,2));},'incorrect tie handling (first-position instead of midrank) is detected'),
  fails(()=>analyze({refOverride:(u,kind,g,years,out)=>out.slice(0,-1)}),'a missing historical observation is rejected'),
  fails(()=>{for(const u of ['olIndex','receiverIndex','rbIndex','qbIndex']){const ref=a.edges[u];const v=ref.probes.historicalMedian.value;
    // raw min/max interpolation would not put the historical median at 50
    const lo=ref.probes.equalToWorst.value,hi=ref.probes.equalToBest.value;assert(Math.abs(X.rawMinMax([lo,hi],v)-50)<1e-9,u);}},'accidental raw min/max scaling is distinguishable (historical median not at 50)'),
  fails(()=>{const bad={...PINS,'research/cycle7/fixtures/unit_games.csv':'0'.repeat(64)};analyze({pins:bad});},'altered input pin is rejected')
];

// 4. Package checksums.
const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(F.lf(DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,F.hash(F.lf(DIR+'/'+f))]));
if(writing){fs.writeFileSync(DIR+'/hashes.json',F.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');
console.log(JSON.stringify({check:'PASS',units:4,results:RESULTS.length,negativeControls:controls.length,canonicalMaxAbsResidual:a.reproduction.maxAbsResidualVs6DecimalCsv,seamIsIdentity:a.reproduction.seamIsIdentity}));
