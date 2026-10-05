// Research counterfactual frames only; production sources and selected model unchanged.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {DIR} from './architecture.mjs';import {distribution,rank} from './stats.mjs';
export function auditPrior(input){
 const {api,L}=appHarness({hooks:'M,D'}),profiles=api.M.profiles,values=Object.values(profiles),ids=Object.keys(profiles).sort();
 const direct=values.map(L.priorRbOrthogonalComposite);
 for(let i=0;i<values.length;i++)assert(Math.abs(direct[i]-(.7*values[i].rb.rush_epa+.3*values[i].rb.adj_recv))<1e-12);
 const actual=ids.map(t=>L.regressUnitIndex(L.continuousPercentileValue(direct,L.priorRbOrthogonalComposite(profiles[t]),true),api.D.config.reversion));
 actual.forEach((v,i)=>assert(Math.abs(v-input.teams[ids[i]].prior.rbIndex)<1e-10));
 const baselineRanks=rank(ids.map(t=>input.teams[t].display.rbIndex));
 const configs=[['A default',1,0],['B live fitted',input.teams.KC.raw.rbRecvOrthogonalBeta,input.teams.KC.raw.receiverEnvironmentCenter],['C unadjusted',0,0]];
 const frames=configs.map(([name,beta,center])=>{
  const reference=values.map(p=>L.priorRbOrthogonalComposite(p,beta,center));
  const rows=ids.map((team,i)=>{const r=input.teams[team],signal=L.priorRbOrthogonalComposite(profiles[team],beta,center),prior=L.regressUnitIndex(L.continuousPercentileValue(reference,signal,true),api.D.config.reversion),priorDelta=prior-actual[i],current=L.blend(prior,r.liveGrade.rbIndex,r.metadata.playerStatGames,r.metadata.priorGames),currentDelta=current-r.display.rbIndex;
   const oldBridgeDelta=r.display.rbIndex-actual[i],newBridgeDelta=current-prior,bridgeDeltaChange=newBridgeDelta-oldBridgeDelta;
   assert(Math.abs(bridgeDeltaChange+priorDelta*r.metadata.playerStatGames/(r.metadata.playerStatGames+r.metadata.priorGames))<1e-10);
   return {team,signal,actualPrior:actual[i],matchedPrior:prior,priorDelta,actualCurrent:r.display.rbIndex,matchedCurrent:current,currentDelta,oldBridgeDelta,newBridgeDelta,bridgeDeltaChange,weightedBridgeChannelChange:.07*bridgeDeltaChange,preCapHalfShareChange:.5*.07*bridgeDeltaChange};
  });
  const ranks=rank(rows.map(r=>r.matchedCurrent));rows.forEach((r,i)=>{r.actualRank=33-baselineRanks[i];r.matchedRank=33-ranks[i];r.rankMovement=r.matchedRank-r.actualRank;});
  const max=k=>Math.max(...rows.map(r=>Math.abs(r[k])));
  return {name,beta,center,reference:distribution(reference),maxAbsPriorDelta:max('priorDelta'),maxAbsCurrentDelta:max('currentDelta'),currentDeltaOverHalfPoint:rows.filter(r=>Math.abs(r.currentDelta)>.5).length,rankChangeCount:rows.filter(r=>r.rankMovement!==0).length,maxRankMovement:max('rankMovement'),maxAbsBridgeDeltaChange:max('bridgeDeltaChange'),maxAbsWeightedBridgeChannelChange:max('weightedBridgeChannelChange'),maxAbsPreCapHalfShareChange:max('preCapHalfShareChange'),KC:rows.find(r=>r.team==='KC'),rows};
 });
 return {source:'Effective prior Array.map callback gets index/array instead of beta/center, unlike unary team scoring.',boundary:'Comparison/reference consistency is a decision-free correctness defect; choosing a canonical frame is a model decision. Three matched frames, unchanged live grade and effective prior games. Bridge delta=current-effective prior; RB weight .07 and pre-cap share .50. Shared cap can change net contribution: these are channel deltas, not total FORCE or forecast ablations. No production correction selected. Bug does not explain KC live90/display76.',directBenchmark:distribution(direct),frames};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const x=JSON.parse(fs.readFileSync(DIR+'/inputs/current_snapshot.json','utf8'));fs.writeFileSync(DIR+'/results/rb_prior_call_audit.json',JSON.stringify(auditPrior(x),null,2)+'\n');console.log('RB prior audit: 32 production priors reproduced; three matched frames and bridge channels');}
