// Offline check for the MD-08 OL/receiver follow-up package. No network, provider fetch,
// production write or retune. Usage (repository root, LF-clean or CRLF checkout):
//   node research/cycle9/md08_followup_ol_receivers/check.mjs [--write-hashes]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as H from './lib.mjs';
import {analyze,serialize} from './analyze.mjs';

const RESULTS=['reproduction.json','ol_drift.json','receiver_stabilization.json','cross_unit.json','final_grade_sensitivity.json'];
const PACKAGE=['README.md','inputs.json','lib.mjs','analyze.mjs','check.mjs',...RESULTS.map(f=>'results/'+f)];

// 1. Pins, frozen-package integrity, production reproduction and Cycle 9 reproduction all
//    assert inside analyze()/load().
const a=analyze(),out=serialize(a);
assert.deepEqual(Object.keys(out).sort(),[...RESULTS].sort());

// 2. Recorded results equal a fresh regeneration byte for byte (LF).
for(const f of RESULTS)assert.equal(H.lf(H.DIR+'/results/'+f),out[f],'results/'+f+' reproduces');

// 3. Declared manifest matches the enforced pins.
const manifest=JSON.parse(H.lf(H.DIR+'/inputs.json'));
assert.equal(manifest.researchBase,H.BASE);assert.equal(manifest.frozenResearch,H.FROZEN_RESEARCH);assert.deepEqual(manifest.pins,H.PINS);

// 4. Invariants of the reported findings (numeric; interpretation lives in README).
const o=a.ol,w=a.wr,near=(v,x,t,l)=>H.close(v,x,l,t);
near(o.levelVs2025.pbp.differenceTeamMean,.0107,5e-4,'OL 2026-2025 team-mean rate difference');
assert(o.levelVs2025.pbp.bootstrap95[0]<0&&o.levelVs2025.pbp.bootstrap95[1]>0,'OL level difference CI spans zero');
near(o.levelVs2025.pfrDifferences2026minus2025weeks1to3.sackOrHit,.0101,5e-4,'PFR sack-or-hit difference');
assert(o.levelVs2025.pfrDifferences2026minus2025weeks1to3.sackOnly<0,'PFR sack-only rate did not rise');
assert(o.spreadVs2025.y2026teamSd<o.spreadVs2025.y2025fourGameTeamSdByStart.min,'2026 OL dispersion below every 2025 start');
assert(o.spreadVs2025.y2026varianceInExcessOfBinomial<0,'2026 OL dispersion not above binomial noise');
assert(o.spreadVs2025.pfrTeamSdSackOrHit.y2026w1to3<o.spreadVs2025.pfrTeamSdSackOrHit.y2025w1to3,'PFR shows the same narrowing');
near(o.season2025Replay.fourGame[0].liveMean,49.5047,1e-3,'2025 start-1 replay mean live');
near(o.meanDeltaDecomposition.pooledVersusTeamMeanFrame.referenceMeanGrade,47.0812,1e-3,'reference mean maps below 50');
assert(o.meanDeltaDecomposition.counterfactualLevelMatchedTo2025Start.meanDelta>-2.5,'level-matched OL channel mean near zero');
assert(w.noiseAndSignal.residual.impliedTrueVariance<=0,'Week-4 residual dispersion not above modelled noise');
assert(Math.min(...w.week4Alternatives.stabilizerSweep.map(r=>r.spearmanWithProduction))>.99,'K sweep preserves LIVE-layer order only');
// Final-grade layer (presentation input): order is NOT preserved; Codex review C values reproduce.
const fs2=a.finalSens.counterfactuals;
for(const c of fs2)assert(c.final.teamsMoving>c.live.teamsMoving,c.id+': final-layer order moves more than live-layer order');
assert.equal(fs2.find(c=>c.id.startsWith('OL')).live.teamsMoving,0,'OL level shift is order-neutral at the live layer');
assert(a.finalSens.codexReviewCReproduced.reproduced);
const ns=w.noiseAndSignal.residual.sensitivityToNoiseScale;assert(ns[0].impliedReliability<=0&&ns.find(r=>r.noiseScale===.9).impliedReliability>0,'receiver noise conclusion is conditional on the noise estimate');
for(const run of Object.values(w.syntheticProbe.runs))assert(run.week4.find(r=>r.stabilizerTargets===80).liveSd>w.syntheticProbe.observedWeek4.liveSd,'observed WR spread narrower than every probe');

// 5. Negative controls: each must detect a deliberate defect.
const {x,L,M,reference,seam}=H.load(),T=Object.keys(x.teams).sort(),Z=x.teams;
const fails=(fn,label)=>{let threw=false;try{fn();}catch{threw=true;}assert(threw,'negative control did not fail: '+label);return label;};
const pfr25=H.csv(H.CACHE.pfrPass2025);
const controls=[
  fails(()=>{const bad={...H.PINS,[H.CACHE.pfrPass2025]:'0'.repeat(64)};H.load({pins:bad});},'altered input pin is rejected'),
  fails(()=>{const fz=JSON.parse(H.lf(H.FROZEN_DIR+'/hashes.json'));fz['README.md']='0'.repeat(64);for(const [f,h] of Object.entries(fz))assert.equal(H.hash(H.lf(H.FROZEN_DIR+'/'+f)),h);},'a changed frozen-package file is detected'),
  fails(()=>{for(const t of T){const r=Z[t].raw;H.close(L.continuousPercentileValue(L.historicalWindowValues(reference,'ol_disruption_rate',17),r.pbpPressureAllowedRate,false),Z[t].liveGrade.olIndex,'OL wrong window');}},'wrong OL window breaks OL reproduction'),
  fails(()=>{const vals=Object.values(M.profiles),c=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite)),b=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:L.priorReceiverWrteEpa(p)})),.5),ref=vals.map(p=>L.priorReceiverResidual(p,b,c)),med=L.medianValue(ref),cen=L.weightedLeagueMean(T.map(t=>Z[t].raw),'receiverResidualEpa','receiverRoomTargets');
    for(const t of T){const r=Z[t].raw;H.close(L.continuousPercentileValue(ref,L.environmentAlignToHistoricalCenter(L.stabilizeToward(r.receiverResidualEpa,cen,r.receiverRoomTargets,120),cen,med),true),Z[t].liveGrade.receiverIndex,'K=120');}},'a different receiver stabilizer breaks receiver reproduction'),
  fails(()=>{const ord=H.referenceTeamOrder(pfr25),sw=[];for(let i=0;i<32;i+=2)sw.push(ord[i+1],ord[i]);
    const xs=[],ys=[];const g={};for(const r of pfr25){if(r.game_type!=='REG')continue;const k=r.game_id+'|'+H.canon(r.team);const o=g[k]||(g[k]={week:+r.week,id:r.game_id,team:H.canon(r.team),sh:0,db:0});const pr=+r.times_pressured||0,pct=+r.times_pressured_pct||0;o.sh+=(+r.times_sacked||0)+(+r.times_hit||0);if(pr>0&&pct>0)o.db+=pr/pct;}
    const bt={};for(const v of Object.values(g))(bt[v.team]=bt[v.team]||[]).push(v);for(const v of Object.values(bt))v.sort((p,q)=>p.week-q.week||p.id.localeCompare(q.id));
    sw.forEach((tm,t)=>{for(let i=0;i<17;i++){const v=bt[tm][i];if(v.db>0){xs.push(H.windowAt(reference,'ol_disruption_rate',1,t,i));ys.push(v.sh/v.db);}}});
    assert(H.correlation(xs,ys).pearson>.9);},'a wrong 2025 slot-to-team mapping fails the PFR validation'),
  fails(()=>{const a1=reference.sample_windows['1'].ol_disruption_rate,b2=[...reference.sample_windows['2'].ol_disruption_rate].reverse();
    for(let t=0;t<32;t++)for(let i=0;i<16;i++){const u=a1[t*17+i],v=a1[t*17+i+1],q=b2[t*16+i];assert(q>=Math.min(u,v)-1e-7&&q<=Math.max(u,v)+1e-7);}},'a reordered 2-game reference fails the chronology bracket'),
  fails(()=>{const c=a.finalSens.counterfactuals.find(q=>q.id==='receiver K 80 -> 40');assert.deepEqual([c.live.teamsMoving,c.live.maxAbsMove,c.live.pairReversals],[19,6,20]);},'live-layer ranks cannot reproduce the final-grade (presentation-input) movements'),
  fails(()=>{seam.setTransform((k,v)=>Math.min(100,v+10));try{for(const t of T){const {g,k}=H.blendInputs(Z[t],'olIndex');H.close(seam.unitDisplayGrade({olIndex:L.blend(Z[t].prior.olIndex,Z[t].liveGrade.olIndex,g,k)},'olIndex'),Z[t].display.olIndex,'seam');}}finally{seam.reset();}},'a non-identity presentation transform breaks the final-grade path reproduction'),
  fails(()=>{const ps=H.csv(H.CACHE.playerStats2026);let tg=0;for(const r of ps)if(H.canon(r.team)==='ATL'&&['WR','TE'].includes(r.position)&&r.week!=='3')tg+=+r.targets;assert.equal(tg,Z.ATL.raw.receiverRoomTargets);},'a missing week breaks the bye-team weekly reconstruction')
];

// 6. Package checksums.
const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(H.lf(H.DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,H.hash(H.lf(H.DIR+'/'+f))]));
if(writing){fs.writeFileSync(H.DIR+'/hashes.json',H.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');

console.log(JSON.stringify({check:'PASS',teams:T.length,results:RESULTS.length,negativeControls:controls.length,
  productionReproductionMaxAbsResidual:a.reproduction.productionReproduction.maxAbsResidual,cycle9ValuesReproduced:Object.keys(a.reproduction.cycle9Reproduced.values).length}));
