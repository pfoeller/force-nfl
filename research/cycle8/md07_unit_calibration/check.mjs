// Offline research validation only. No provider fetch, production write, simulation/model retune.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {DIR,BASE,units,hash,validateInput,sourceContract,finite} from './architecture.mjs';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {analyze,serialize} from './analyze_current.mjs';import {auditPrior} from './prior_audit.mjs';
import {correlation,rank,distribution,partial,packing} from './stats.mjs';
import {negativeSemanticControls,semanticContract} from './semantic_contract.mjs';
import {inventory} from './cache_inventory.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const x=read(DIR+'/inputs/current_snapshot.json');
// This mode never opens hashes or results; semantic failures cannot use frozen outputs as an oracle.
if(process.argv.includes('--semantics-only')){console.log(JSON.stringify({semanticControls:negativeSemanticControls(x),recordedResultsRead:false}));process.exit(0);}
const pins=read(DIR+'/hashes.json');
assert.equal(hash(fs.readFileSync(DIR+'/inputs/current_snapshot.json','utf8').replace(/\r\n/g,'\n')),'b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247');
for(const [p,pin] of Object.entries(pins)){assert.equal(hash(fs.readFileSync(DIR+'/'+p,'utf8').replace(/\r\n/g,'\n')),pin,p+' checksum');}
assert.equal(read(DIR+'/inputs/provenance.json').normalizedSHA256,hash(fs.readFileSync(DIR+'/inputs/current_snapshot.json','utf8').replace(/\r\n/g,'\n')));
validateInput(x);sourceContract();assert.equal(Object.keys(x.sourceHashes).length,18);
const {L,api}=appHarness({hooks:'M,D'});
const close=(a,b,label)=>{assert(finite(a)&&finite(b),label+' finite');assert(Math.abs(a-b)<1e-10,label+': '+a+' vs '+b);};
const clamp=x=>Math.max(0,Math.min(100,x));
const physical={qbIndex:['qbEpaPerPlay','qb','epa_per_qb_play'],receiverIndex:['receiverResidualEpa','receivers','residual_epa'],olIndex:['pbpPressureAllowedRate','ol','pressure_rate_allowed'],rbIndex:['rbCompositeOrthogonal','rb','room_composite'],coverageIndex:['oppPassEpa','cov','epa_allowed'],passRushIndex:['selectedPassRushComposite','dl','pass_rush_composite_rate'],runDefenseIndex:['oppRushEpa','dl','run_epa_allowed']};
export function reconstruct(input){semanticContract(input);validateInput(input);
 const map=(k,higher=true)=>L.percentileMap(Object.fromEntries(Object.entries(input.teams).map(([t,z])=>[t,z.raw[k]])),higher);
 const pct={pass:map('oppPassEpa',false),cpoe:map('oppCpoe',false),run:map('oppRushEpa',false),offDrive:map('offensivePointsPerDrive'),defDrive:map('defensivePointsPerDrive',false),efficiency:map('offEpa'),weeklyRush:map('frontPressureRate'),anya:map('qbAnyA')};
 for(const [t,z] of Object.entries(input.teams)){
  const r=z.raw,q=z.components.qb;
  for(const [key,[raw,group,field]] of Object.entries(physical))close(r[raw],z.components[group][field],t+' physical '+key);
  close(r.receiverResidualEpa,L.partialResidual(r.recvEpa,r.qbAttemptEpa,r.receiverOrthogonalBeta,r.receiverEnvironmentCenter),t+' WR residual');
  close(r.receiverStabilizedResidual,L.stabilizeToward(r.receiverResidualEpa,r.receiverCurrentLeagueResidual,r.receiverRoomTargets,80),t+' WR stabilizer');
  close(r.receiverCalibratedResidual,r.receiverStabilizedResidual-r.receiverCurrentLeagueResidual+r.receiverHistoricalResidualMedian,t+' WR alignment');
  close(r.rbRecvResidualEpa,L.partialResidual(r.rbRecvEpa,r.qbAttemptEpa,r.rbRecvOrthogonalBeta,r.receiverEnvironmentCenter),t+' RB residual');
  close(r.rbCompositeOrthogonal,.7*r.rbRushEpa+.3*r.rbRecvResidualEpa,t+' RB physical composite');
  close(r.rbStabilizedRushEpa,L.stabilizeToward(r.rbRushEpa,r.rbCurrentLeagueRush,r.rbCarries,50),t+' RB rush stabilizer');
  close(r.rbStabilizedRecvResidualEpa,L.stabilizeToward(r.rbRecvResidualEpa,r.rbCurrentLeagueRecvResidual,r.rbTargets,40),t+' RB recv stabilizer');
  close(r.rbStabilizedComposite,.7*r.rbStabilizedRushEpa+.3*r.rbStabilizedRecvResidualEpa,t+' RB stable composite');
  close(r.rbCalibratedComposite,r.rbStabilizedComposite-r.rbCurrentLeagueCompositeCenter+r.rbHistoricalCompositeMedian,t+' RB alignment');
  close(z.liveGrade.coverageIndex,.75*pct.pass[t]+.25*pct.cpoe[t],t+' coverage mapping');
  close(z.liveGrade.runDefenseIndex,pct.run[t],t+' run defense mapping');
  close(z.liveGrade.pointsScoredPerDriveIndex,pct.offDrive[t],t+' offense PPD mapping');
  close(z.liveGrade.pointsAllowedPerDriveIndex,pct.defDrive[t],t+' defense PPD mapping');
  close(z.liveGrade.offenseIndex,pct.efficiency[t],t+' legacy EPA mapping');
  if(z.metadata.passRushProvider==='nflverse-weekly-disruption')close(z.liveGrade.passRushIndex,pct.weeklyRush[t],t+' weekly disruption mapping');
  close(q.any_a_score,pct.anya[t],t+' ANY/A mapping');
  close(r.qbStabilizedEpa,L.stabilizeToward(r.qbEpaPerPlay,r.qbCurrentLeagueEpa,r.qbValuePlays,150),t+' QB EPA stabilizer');
  close(r.qbStabilizedSuccess,L.stabilizeToward(r.qbPassSuccessRate,r.qbCurrentLeagueSuccess,r.qbAttemptPassAttempts,100),t+' QB success stabilizer');
  close(r.qbStabilizedCpoe,L.stabilizeToward(r.qbCpoe,r.qbCurrentLeagueCpoe,r.qbAttemptPassAttempts,60),t+' QB CPOE stabilizer');
  close(q.cpoe_score,clamp(50+50*Math.tanh((r.qbStabilizedCpoe-r.qbCurrentLeagueCpoe)/7.5)),t+' CPOE mapping');
  close(q.rush_bonus,L.qbRushingBonus(r.qbRushEpaTotal,r.qbRushes),t+' rush bonus');
  const ps=Object.values(api.M.profiles),beta=r.receiverOrthogonalBeta,c=r.receiverEnvironmentCenter;
  const priorWr=ps.map(p=>L.priorReceiverResidual(p,beta,c));
  const priorRb=ps.map(p=>L.priorRbOrthogonalComposite(p,r.rbRecvOrthogonalBeta,c));
  close(z.liveGrade.receiverIndex,L.continuousPercentileValue(priorWr,r.receiverCalibratedResidual,true),t+' WR mapping');
  close(z.liveGrade.rbIndex,L.continuousPercentileValue(priorRb,r.rbCalibratedComposite,true),t+' RB mapping');
  close(q.raw_live_qb_score,L.calibrateQbComposite(.3*q.pass_epa_score+.3*q.any_a_score+.2*q.pass_success_score+.1*q.rushing_value_score+.1*q.cpoe_score),t+' QB 5 components');
  close(q.live_qb_score,clamp(q.raw_live_qb_score+q.opponent_rating_adjustment+q.ol_rating_adjustment),t+' QB contexts');
  for(const u of units.filter(u=>!['offenseComposite','defenseIndex'].includes(u.key))){const k=u.key;const pg=k==='pointsAllowedPerDriveIndex'?1:k==='qbIndex'?z.metadata.qbPriorGames:z.metadata.priorGames;const g=k==='passRushIndex'?z.metadata.passRushGames:['qbIndex','receiverIndex','rbIndex'].includes(k)?z.metadata.playerStatGames:k==='pointsAllowedPerDriveIndex'?r.defensiveDriveGames:k==='pointsScoredPerDriveIndex'?r.offensiveDriveGames:z.metadata.statGames;
   let val=L.blend(z.prior[k],z.liveGrade[k],g,pg);if(k==='qbIndex'){close(val,q.pre_recency_qb_index,t+' QB pre-recency');val=clamp(val+q.recency_adjustment);}close(val,z.display[k],t+' blend '+k);
  }
  close(L.rawOffenseCompositeFrom({...z.display,_offenseCompositePolicy:'v102-orthogonal'}),r.offenseCompositeRaw,t+' raw offense');close(L.offenseCompositeFrom({...z.display,_offenseCompositePolicy:'v102-orthogonal'}),z.display.offenseComposite,t+' calibrated offense');
  close(L.rawDefenseCompositeFrom(z.display),r.defenseCompositeRaw,t+' raw defense');close(L.defenseCompositeFrom(z.display),z.display.defenseIndex,t+' calibrated defense');
 }
 return true;
}
reconstruct(x);
const first=serialize(analyze(x)),second=serialize(analyze(x));assert.deepEqual(first,second,'two complete runs byte identity');
for(const [p,txt] of Object.entries(first))assert.equal(txt,fs.readFileSync(DIR+'/results/'+p,'utf8').replace(/\r\n/g,'\n'),p+' accepted result equality');
assert.equal(JSON.stringify(auditPrior(x),null,2)+'\n',fs.readFileSync(DIR+'/results/rb_prior_call_audit.json','utf8').replace(/\r\n/g,'\n'));
const clone=()=>structuredClone(x);let negative=0;
for(const mutate of [
 z=>{z.teams.KC.raw.receiverResidualEpa=z.teams.KC.raw.recvEpa;},
 z=>{z.teams.KC.raw.pbpPressureAllowedRate=z.teams.KC.display.olIndex;},
 z=>{[z.teams.KC.display.receiverIndex,z.teams.KC.display.rbIndex]=[z.teams.KC.display.rbIndex,z.teams.KC.display.receiverIndex];},
 z=>{z.state.live=false;},z=>{z.state.freshness.stale=true;},z=>{z.teams.KC.metadata.passRushDataState='prior-held';},
 z=>{z.teams.KC.metadata.freshness.teamStats.current=false;},z=>{z.teams.KC.raw.rbRushEpa=null;},z=>{delete z.teams.SEA;},
 z=>{z.teams.KC.raw.oppRushEpa=NaN;},z=>{z.base='unreviewed-base';},z=>{z.publicSourceHashes['assets/app.js']='wrong';}
]){const z=clone();mutate(z);assert.throws(()=>reconstruct(z));negative++;}
assert.deepEqual(rank([1,1,3]),[1.5,1.5,3]);close(correlation([1,2,3],[3,2,1]).pearson,-1,'negative Pearson');assert.equal(correlation([null,2,3],[0,3,4]).n,2);assert.equal(correlation([0,0,0],[1,2,3]).pearson,null);close(distribution([0,10,20]).median,10,'quantile');
const xx=Array.from({length:32},(_,i)=>i),yy=xx.map(i=>2*i+Math.sin(i)),control=xx.map(i=>i);assert.equal(partial(xx,yy,[control,control]).r,null,'singular controls rejected');
const facts=read(DIR+'/inputs/independent_facts.json');assert.equal(facts.walker.team,'KC');assert.equal(facts.walker.carries,x.teams.KC.components.rb.rush_att);assert.equal(facts.walker.games,x.teams.KC.metadata.games);assert.equal(facts.teamFacts.length,6);
const bank=read(DIR+'/results/pathology_bank.json').cases;assert.equal(bank.length,22);assert(bank.every(b=>b.checks.length));assert.equal(bank.find(b=>b.unit==='passRushIndex').classification,'QUESTIONABLE');
for(const [k,arr] of Object.entries(read(DIR+'/results/benchmark_alignment.json')))for(const b of arr)assert.equal(b.n,32,k+' complete benchmark '+b.benchmark);
const pairs=read(DIR+'/results/unit_dependencies.json').pairs;assert.equal(pairs.length,16);for(const p of pairs)assert.equal(p.display.n,32);
assert.equal(bank.find(b=>b.team==='PHI'&&b.unit==='receiverIndex').classification,'QUESTIONABLE');
for(const t of ['NE','WAS','BUF','NYJ','SF','LV']){const b=bank.find(b=>b.team===t&&b.unit==='runDefenseIndex');assert.equal(b.classification,'QUESTIONABLE');assert(b.checks.every(c=>Math.abs(c.rank-b.rank)>=10));}
assert.equal(bank.find(b=>b.team==='JAX'&&b.unit==='coverageIndex').classification,'QUESTIONABLE');assert(bank.every(b=>b.classification!=='PASS'&&b.interpretation.includes(b.team)));
const semanticNegatives=negativeSemanticControls(x);
const bm=read(DIR+'/results/benchmark_alignment.json'),flat=Object.values(bm).flat();assert.equal(flat.filter(b=>b.category.startsWith('B.')).length,17);assert.equal(flat.filter(b=>b.category.startsWith('C.')).length,16);
const comp=read(DIR+'/results/compression_robustness.json');close(comp.display.receiverIndex.rank6To15Spread,5.506522330258406,'WR good band');assert.equal(comp.display.receiverIndex.atLeast70,3);assert(comp.mappedStages.receiverIndex.upperBandRatio<.5);assert.equal(comp.display.receiverIndex.rolling6.count,10);
// Broad tails must not hide a dense central band; bands are inclusive and ties counted.
assert.equal(packing([0,...Array(10).fill(50),100]).rolling6.count,10);assert.equal(packing(Array.from({length:32},(_,i)=>3*i)).rolling6.count,3);
assert.equal(JSON.stringify(inventory(),null,2)+'\n',fs.readFileSync(DIR+'/results/historical_availability.json','utf8').replace(/\r\n/g,'\n'));
const inv=inventory();assert.equal(inv.entries.length,22);assert.deepEqual(inv.dates,['2026-09-22','2026-09-23','2026-09-28','2026-10-01']);
const pa=auditPrior(x);assert.equal(pa.frames.length,3);assert.equal(pa.frames[1].rankChangeCount,15);assert(pa.frames.every(f=>f.KC.matchedRank===3));
const list=fs.readdirSync(DIR,{recursive:true}).filter(p=>fs.statSync(DIR+'/'+p).isFile());
for(const p of list){const t=fs.readFileSync(DIR+'/'+p,'utf8');assert(!t.includes('App'+'Data')&&!/\b[A-Za-z]:[\\/]|\/Users\/|\/home\/|\/tmp\/|paul1\.PAUL/i.test(t),p+' local path hygiene');}
console.log(JSON.stringify({result:'PASS',teams:32,units:12,pairs:16,sourceFiles:18,formulaReconstructions:'physical identities; WR/RB residual/stabilizer/historical maps; QB stabilizers/component/context sums; current ranks; all blends/composites',twoRunByteIdentity:true,hashPins:Object.keys(pins).length,negativeMutationControls:negative,independentSemanticControls:semanticNegatives,compressionFacets:true,benchmarkCategories:{A:0,B:17,C:16,D:"official facts outside33"},pathologyCases:22,cacheEntries:22,benchmarkCompleteness:true,rbPriorAudit:true,missingNotZero:true}));
