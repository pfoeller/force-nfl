// Independent schema/source bindings: does not read recorded results.
import assert from 'node:assert/strict';
import {units,benchmarkSpecs,sourceContract} from './architecture.mjs';
const rawBindings={qbIndex:'qbEpaPerPlay',receiverIndex:'receiverResidualEpa',olIndex:'pbpPressureAllowedRate',rbIndex:'rbCompositeOrthogonal',coverageIndex:'oppPassEpa',passRushIndex:'selectedPassRushComposite',runDefenseIndex:'oppRushEpa',pointsScoredPerDriveIndex:'offensivePointsPerDrive',pointsAllowedPerDriveIndex:'defensivePointsPerDrive',offenseComposite:'offenseCompositeRaw',defenseIndex:'defenseCompositeRaw',offenseIndex:'offEpa'};
const benchmarkBindings={qbIndex:'qbEpaPerPlay,qbAnyA,qbPassSuccessRate,qbCpoe',receiverIndex:'wrteYardsPerTarget,wrteFirstDownRate,recvEpa',olIndex:'sackAllowed,pbpPressureAllowedRate,teamRushYpc',rbIndex:'rbYpc,rbFirstDownRate,rbExplosive20Rate,rbRushEpa,rbReceivingYardsPerTarget',coverageIndex:'coverageSuccessAllowed,passYardsAllowedPerAttempt,oppPassEpa',passRushIndex:'frontSackRate,frontPressureRate',runDefenseIndex:'rushYpcAllowed,rushFirstDownRateAllowed,rushExplosive20Allowed,oppRushEpa',pointsScoredPerDriveIndex:'offensivePointsPerDrive,pointsForPerGame',pointsAllowedPerDriveIndex:'defensivePointsPerDrive,pointsAgainstPerGame',offenseComposite:'offEpa,offensivePointsPerDrive',defenseIndex:'defEpa,defensivePointsPerDrive',offenseIndex:'offEpa'};
export function semanticContract(x,unitMap=units,benchmarkMap=benchmarkSpecs){
 sourceContract();assert.equal(unitMap.length,12);assert.deepEqual(Object.keys(benchmarkMap).sort(),Object.keys(benchmarkBindings).sort());
 for(const u of unitMap){assert.equal(u.raw,rawBindings[u.key],u.key+' raw source binding');assert.equal(benchmarkMap[u.key].map(b=>b[0]).join(','),benchmarkBindings[u.key],u.key+' benchmark source binding');}
 for(const [team,r] of Object.entries(x.teams)){
  const provider=r.metadata.passRushProvider,dl=r.components.dl;
  assert.equal(provider,dl.pressure_provider,team+' component provider lineage');
  assert.equal(provider,r.metadata.freshness.passRush.provider,team+' freshness provider lineage');
  const weekly=provider==='nflverse-weekly-disruption';assert(weekly||provider==='pfr-advanced');
  assert.equal(dl.source.includes('weekly QB-hit+sack disruption fallback'),weekly,team+' source policy lineage');
  if(weekly)assert.equal(r.raw.frontPressureRate,dl.pressure_rate,team+' ranked weekly signal');
  else {assert(dl.source.includes('PFR/Sportradar pressure fallback'));assert.equal(r.raw.selectedPassRushComposite,dl.pass_rush_composite_rate);}
 }
 return true;
}
export function negativeSemanticControls(x){
 semanticContract(x);const rejected=[];
 const mutations=[['weekly -> PFR',z=>{z.teams.KC.metadata.passRushProvider='pfr-advanced';z.teams.KC.components.dl.pressure_provider='pfr-advanced';z.teams.KC.metadata.freshness.passRush.provider='pfr-advanced';}],['PFR -> weekly',z=>{z.teams.PIT.metadata.passRushProvider='nflverse-weekly-disruption';z.teams.PIT.components.dl.pressure_provider='nflverse-weekly-disruption';z.teams.PIT.metadata.freshness.passRush.provider='nflverse-weekly-disruption';}]];
 for(const [name,mutate] of mutations){const z=structuredClone(x);mutate(z);assert.throws(()=>semanticContract(z));rejected.push(name);}
 const bm=structuredClone(benchmarkSpecs);[bm.receiverIndex[0][0],bm.rbIndex[0][0]]=[bm.rbIndex[0][0],bm.receiverIndex[0][0]];assert.throws(()=>semanticContract(x,units,bm));rejected.push('analysis benchmark-key swap');
 const um=structuredClone(units);[um[1].raw,um[3].raw]=[um[3].raw,um[1].raw];assert.throws(()=>semanticContract(x,um,benchmarkSpecs));rejected.push('analysis raw-key swap');
 return rejected;
}
