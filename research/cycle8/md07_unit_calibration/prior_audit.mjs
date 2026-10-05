// Existing prior helper call semantics only: no production source/formula modified.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {DIR} from './architecture.mjs';import {distribution} from './stats.mjs';
export function auditPrior(input){const {api,L}=appHarness({hooks:'M,D'}),profiles=api.M.profiles,values=Object.values(profiles);
 const direct=values.map(L.priorRbOrthogonalComposite),unary=values.map(p=>L.priorRbOrthogonalComposite(p));
 // Array.map supplies (profile,index,array), contrary to this helper's (profile,beta,center).
 // The array cannot convert to finite Number, so partialResidual returns receiving EPA unchanged.
 for(let i=0;i<values.length;i++){const p=values[i],unadjusted=.7*p.rb.rush_epa+.3*p.rb.adj_recv;assert(Math.abs(direct[i]-unadjusted)<1e-12);}
 const rows=Object.keys(profiles).sort().map(t=>{const value=L.priorRbOrthogonalComposite(profiles[t]),actual=L.regressUnitIndex(L.continuousPercentileValue(direct,value,true),api.D.config.reversion),matched=L.regressUnitIndex(L.continuousPercentileValue(unary,value,true),api.D.config.reversion),r=input.teams[t];assert(Math.abs(actual-r.prior.rbIndex)<1e-10);return {team:t,defaultOrthogonalPriorSignal:value,actualPrior:actual,unaryLikeForLikePrior:matched,priorDelta:matched-actual,frozenCurrentPriorOnlyDelta:(matched-actual)*r.metadata.priorGames/(r.metadata.playerStatGames+r.metadata.priorGames)};});
 return {source:'model/live_profiles.js: priorRbOrthogonalValues = Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite); priorRbByTeam calls priorRbOrthogonalComposite(prior) separately',boundary:'Unary callback is a research call-semantics control, not a selected production correction or redesign. No forecast/bridge ablation or historical predictive validation.',directBenchmark:distribution(direct),unaryBenchmark:distribution(unary),rows,maxAbsPriorDelta:Math.max(...rows.map(r=>Math.abs(r.priorDelta))),maxAbsCurrentPriorOnlyDelta:Math.max(...rows.map(r=>Math.abs(r.frozenCurrentPriorOnlyDelta)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const x=JSON.parse(fs.readFileSync(DIR+'/inputs/current_snapshot.json','utf8'));fs.writeFileSync(DIR+'/results/rb_prior_call_audit.json',JSON.stringify(auditPrior(x),null,2)+'\n');console.log('RB prior callback audit: production prior reproduced for all 32 teams');}
