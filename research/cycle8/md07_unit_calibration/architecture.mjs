// Research-only definitions and source assertions. No production imports this package.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
export const BASE='fd585891214db483112f52d4746106c606afeb43';
export const DIR='research/cycle8/md07_unit_calibration';
export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const units=[
 ['QB play','qbIndex','qbEpaPerPlay',true,'QB all-play EPA proxy; complete vector also includes ANY/A, success, rushing and CPOE'],
 ['Receivers','receiverIndex','receiverResidualEpa',true,'WR/TE EPA/target after partial QB-environment subtraction'],
 ['Offensive line','olIndex','pbpPressureAllowedRate',false,'PBP de-duplicated hit-or-sack disruption allowed/dropback; pass protection only'],
 ['RB','rbIndex','rbCompositeOrthogonal',true,'RB/FB 70% rushing EPA/carry + 30% partially residualized receiving EPA/target'],
 ['Coverage','coverageIndex','oppPassEpa',false,'Sack-free pass-attempt EPA allowed proxy; complete grade also uses CPOE allowed'],
 ['Pass rush','passRushIndex','selectedPassRushComposite',true,'Selected provider pressure + .20 hit-rate + .60 sack-rate'],
 ['Run defense','runDefenseIndex','oppRushEpa',false,'Opponent rushing EPA/carry; includes QB runs in team outcomes'],
 ['Scoring/drive','pointsScoredPerDriveIndex','offensivePointsPerDrive',true,'Qualifying offensive points/drive'],
 ['Pts/drive prevention','pointsAllowedPerDriveIndex','defensivePointsPerDrive',false,'Opponent offensive points/drive allowed'],
 ['Overall offense','offenseComposite','offenseCompositeRaw',true,'Weighted already-normalized unit grades, not a physical raw signal'],
 ['Overall defense','defenseIndex','defenseCompositeRaw',true,'Weighted already-normalized unit grades, not a physical raw signal'],
 ['Team efficiency (diagnostic)','offenseIndex','offEpa',true,'Team EPA/play; compatibility/debug grade, not current offense-composite outcome key']
].map(([label,key,raw,higher,scope])=>({label,key,raw,higher,scope}));
export const pairs=[['qbIndex','receiverIndex'],['qbIndex','olIndex'],['qbIndex','rbIndex'],['receiverIndex','olIndex'],['receiverIndex','rbIndex'],['rbIndex','olIndex'],...['qbIndex','receiverIndex','olIndex','rbIndex'].map(k=>['pointsScoredPerDriveIndex',k]),['coverageIndex','passRushIndex'],['coverageIndex','runDefenseIndex'],['passRushIndex','runDefenseIndex'],...['coverageIndex','passRushIndex','runDefenseIndex'].map(k=>['pointsAllowedPerDriveIndex',k])];
export const benchmarkSpecs={
 qbIndex:[['qbEpaPerPlay',true,'ingredient'],['qbAnyA',true,'ingredient'],['qbPassSuccessRate',true,'ingredient'],['qbCpoe',true,'ingredient']],
 receiverIndex:[['wrteYardsPerTarget',true,'non-formula same-source outcome'],['wrteFirstDownRate',true,'non-formula same-source outcome'],['recvEpa',true,'pre-residual ingredient']],
 olIndex:[['sackAllowed',false,'adjacent non-formula outcome'],['pbpPressureAllowedRate',false,'ingredient'],['teamRushYpc',true,'scope contrast, not pass-protection ground truth']],
 rbIndex:[['rbYpc',true,'non-formula same-source outcome'],['rbFirstDownRate',true,'non-formula same-source outcome'],['rbExplosive20Rate',true,'non-formula same-source outcome'],['rbRushEpa',true,'ingredient'],['rbReceivingYardsPerTarget',true,'non-formula same-source outcome']],
 coverageIndex:[['coverageSuccessAllowed',false,'non-formula same-source outcome'],['passYardsAllowedPerAttempt',false,'non-formula same-source outcome'],['oppPassEpa',false,'ingredient']],
 passRushIndex:[['frontSackRate',true,'ingredient/adjacent'],['frontPressureRate',true,'provider-heterogeneous ingredient/proxy']],
 runDefenseIndex:[['rushYpcAllowed',false,'non-formula same-source outcome'],['rushFirstDownRateAllowed',false,'first-down proxy, not EPA success rate'],['rushExplosive20Allowed',false,'non-formula same-source outcome'],['oppRushEpa',false,'ingredient']],
 pointsScoredPerDriveIndex:[['offensivePointsPerDrive',true,'ingredient'],['pointsForPerGame',true,'related outcome, includes non-offensive scoring']],
 pointsAllowedPerDriveIndex:[['defensivePointsPerDrive',false,'ingredient'],['pointsAgainstPerGame',false,'related outcome, includes non-offensive scoring']],
 offenseComposite:[['offEpa',true,'related same-source outcome'],['offensivePointsPerDrive',true,'component input']],
 defenseIndex:[['defEpa',true,'related same-source outcome'],['defensivePointsPerDrive',false,'component input']],
 offenseIndex:[['offEpa',true,'ingredient']]
};
export function sources(){return Object.fromEntries([...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(([,p])=>[p,hash(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))]));}
export function sourceContract(){
 const lp=fs.readFileSync('model/live_profiles.js','utf8').replace(/\r\n/g,'\n'),app=fs.readFileSync('assets/app.js','utf8').replace(/\r\n/g,'\n');
 for(const s of ["receiverPolicy: 'v115-partial-orthogonal'","rbPolicy: 'v115-partial-orthogonal'","olPolicy: 'v102-pass-protection'","coveragePolicy: 'v101-attempts'","offenseOutcomePolicy: 'v102-ppd'",'p.qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency))'])assert(app.includes(s),s);
 for(const s of ['orthogonalRidgeFraction:0.50','receiverResidualStabilizerTargets:80.0','rbRushStabilizerCarries:50.0','rbRecvResidualStabilizerTargets:40.0','.70*Number(r.rbRushEpa)+.30*Number(rbRecvResidual)','.75*scorePassDef[t]+.25*(scoreCpoeDef[t]??50)','const priorPointsAllowedPerDriveIndex=50','passRushProvider===\'nflverse-weekly-disruption\'','const DEFENSE_WEIGHTS = { coverageIndex: 0.36','const QB_COMPOSITE_EXPANSION = 1.20'])assert(lp.includes(s),s);
 return true;
}
export function validateInput(x){
 assert.equal(x.base,BASE);assert.equal(x.state.live,true);assert.equal(x.state.integrity.ready,true);assert.equal(x.state.freshness.stale,false);
 assert.deepEqual(x.sourceHashes,sources());assert.deepEqual(x.sourceHashes,x.publicSourceHashes);sourceContract();
 assert.equal(Object.keys(x.teams).length,32);assert.equal(x.state.unscoredStarted.length,0);
 for(const [t,row] of Object.entries(x.teams)){
  assert(row.metadata.freshness.teamStats.current&&row.metadata.freshness.playerStats.current,t+' current feeds');
  assert.equal(row.metadata.passRushDataState,'live-current');
  assert(row.metadata.passRushProvider!=='prior-held');
  for(const u of units){assert(finite(row.display[u.key]),t+' display '+u.key);assert(finite(row.raw[u.raw]),t+' raw '+u.raw);}
  assert.equal(row.metadata.qbDataState,'live-current');
  assert.equal(row.raw.receiverResidualEpa,row.raw.recvEpa-row.raw.receiverOrthogonalBeta*(row.raw.qbAttemptEpa-row.raw.receiverEnvironmentCenter));
 }
 return true;
}
