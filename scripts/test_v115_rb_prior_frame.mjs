// Owner-authorized V115 prior-frame contract. Offline, synthetic + frozen evidence.
// VM observers never enter production or export new runtime hooks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
let checks=0;
const near=(a,b,m)=>{assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-10,m+': '+a+' != '+b);checks++;};
const plain=x=>JSON.parse(JSON.stringify(x));
const source=fs.readFileSync('model/live_profiles.js','utf8').replace(/\r\n/g,'\n');
const ref="rbPolicy==='v115-partial-orthogonal' ? priorRbOrthogonalValuesV109 : Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite).filter(Number.isFinite)";
const individual="rbPolicy==='v115-partial-orthogonal' ? v115RbPriorComposite(prior) : priorRbOrthogonalComposite(prior)";
const liveRef="map((p)=>rbPolicy==='v115-partial-orthogonal'?v115RbPriorComposite(p):priorRbOrthogonalComposite(p,1,0))";
function replace(s,a,b){assert.equal(s.split(a).length,2,'unique mutation target');return s.replace(a,b);}
function load(s=source,observe=false){
 const c={window:{},calls:[],console};vm.createContext(c);
 if(observe)s=replace(s,'function priorRbOrthogonalComposite(profile, recvBeta=1, qbCenter=0) {',
 'function priorRbOrthogonalComposite(profile, recvBeta=1, qbCenter=0) { calls.push({profile,recvBeta,qbCenter,arity:arguments.length});');
 vm.runInContext(s,c);return {L:c.window.FORCE_LIVE_PROFILE,c};
}
const baseline=replace(replace(replace(source,ref,'Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite).filter(Number.isFinite)'),individual,'priorRbOrthogonalComposite(prior)'),liveRef,"map((p)=>priorRbOrthogonalComposite(p,rbPolicy==='v115-partial-orthogonal'?rbRecvPassBeta:1,rbPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0))");
const ids=Array.from({length:32},(_,i)=>'T'+String(i).padStart(2,'0'));
function fixture(shift=0){
 const priorProfiles=Object.fromEntries(ids.map((t,i)=>{
  const x=.2+(i-15.5)/20+shift, recv=.65*x+.13*Math.sin(i*1.7), rush=.14*Math.cos(i*.6);
  const rb={rush_epa:rush,adj_recv:recv,composite:.7*rush+.3*recv,targets:20};
  if(i%7===0){delete rb.rush_epa;rb.adj_rush=rush;}
  const qb=i%6===0?{epa_per_play:x}:{epaoe:x};
  return [t,{qb,rb,receivers:{adj_epa:.1,targets:100},dl:{pressure_rate:.2,run_stop_rate:.5},scoring:{}}];
 }));
 const schedule=ids.map(t=>({season:2026,week:1,date:'2026-09-01',home:t,away:'ZZZ',homeScore:24,awayScore:17}));
 const teamRows=ids.map(t=>({season:2026,week:1,season_type:'REG',team:t,opponent_team:'ZZZ',attempts:30,carries:20,passing_epa:3,rushing_epa:1,targets:10,receiving_epa:2}));
 const playerRows=ids.flatMap((t,i)=>[
 {season:2026,week:1,season_type:'REG',team:t,position:'QB',player_display_name:t+' QB',attempts:30,passing_epa:3+i*.1,carries:2,rushing_epa:0},
 {season:2026,week:1,season_type:'REG',team:t,position:'RB',player_display_name:t+' RB',carries:20,rushing_epa:1+i*.1,targets:10,receiving_epa:2-i*.03}]);
 return {priorProfiles,teamIds:ids,schedule,teamRows,playerRows,priorGames:1,unitPriorReversion:.3,rbPolicy:'v115-partial-orthogonal'};
}
function fittedContract(s,options){
 const {L,c}=load(s,true),p=Object.values(options.priorProfiles);
 const beta=L.ridgeOrthogonalSlope(p.map(q=>({x:L.priorQbPassEpa(q),y:Number(q.rb.adj_recv)})),L.UNIT_V115.orthogonalRidgeFraction);
 const center=L.medianValue(p.map(L.priorQbPassEpa).filter(Number.isFinite));
 assert(beta!==0&&beta!==1&&center!==0,'synthetic fitted/default/unadjusted frames distinct');checks++;
 const transform=q=>.7*(Number.isFinite(Number(q.rb.rush_epa))?Number(q.rb.rush_epa):Number(q.rb.adj_rush))+.3*(Number(q.rb.adj_recv)-beta*(L.priorQbPassEpa(q)-center));
 const reference=p.map(transform),out=L.buildProfiles(options);
 // Two traversals: historical live-CDF population, then individual effective values.
 // Effective reference reuses that population; every call supplies the same fit.
 assert.equal(c.calls.length,64,'shared fitted reference population reused');checks++;
 for(const call of [...c.calls]){assert.equal(call.arity,3,'no Array.map index/array leakage or default frame');near(call.recvBeta,beta,'fitted beta');near(call.qbCenter,center,'fitted center');near(L.priorRbOrthogonalComposite(call.profile,beta,center),transform(call.profile),'independent composite oracle');}
 for(const t of ids){
  const r=out[t],expected=L.regressUnitIndex(L.continuousPercentileValue(reference,transform(options.priorProfiles[t]),true),options.unitPriorReversion);
  near(r._preseasonUnitPrior.rbIndex,expected,t+' effective prior');
  near(r.rb.historical_composite_median,L.medianValue(reference),t+' live-CDF reference');
  near(r._live.rbRecvOrthogonalBeta,beta,t+' live beta');
  near(r.rb.room_recv_residual_epa,L.partialResidual(r.rb.room_recv_epa,r._live.qbAttemptEpa,beta,center),t+' live frame');
  near(r.rbIndex,L.blend(expected,r.rb.live_score,r._live.playerStatGames,r._live.priorGames),t+' current blend');
 }
 const frameValues=[L.priorRbOrthogonalComposite(p[0]),transform(p[0]),L.priorRbOrthogonalComposite(p[0],0,0)];
 assert.equal(new Set(frameValues).size,3);checks++;
 return out;
}
const f=fixture(),out=fittedContract(source,f);fittedContract(source,fixture(.4));
const old=load(baseline).L.buildProfiles(f);
assert(ids.some(t=>old[t].rbIndex!==out[t].rbIndex),'V115 must change');checks++;
// Behavioral mutations, not source-text checks alone.
const mutations=[
 ['bare callback',replace(source,ref,'Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite).filter(Number.isFinite)')],
 ['default individual',replace(source,individual,'priorRbOrthogonalComposite(prior)')],
 ['default live-CDF',replace(source,liveRef,'map((p)=>priorRbOrthogonalComposite(p,1,0))')],
 ['default both',replace(source,'priorRbOrthogonalComposite(p,rbRecvPassBeta,orthogonalQbCenter)','priorRbOrthogonalComposite(p,1,0)')],
 ['unadjusted both',replace(source,'priorRbOrthogonalComposite(p,rbRecvPassBeta,orthogonalQbCenter)','priorRbOrthogonalComposite(p,0,0)')]
];
for(const [name,s] of mutations){assert.throws(()=>fittedContract(s,f),undefined,name+' rejected');checks++;}
for(const policy of [undefined,'v101-legacy','v102-residual-receiving','v109-stabilized-residual','v114-centered-stabilized-residual','unknown-compatibility']){
 for(const live of [false,true]){
  const opts={...f,rbPolicy:policy,...(live?{}:{teamRows:[],playerRows:[],schedule:[]})};
  assert.deepEqual(plain(load().L.buildProfiles(opts)),plain(load(baseline).L.buildProfiles(opts)),String(policy)+' full-profile parity, live='+live);checks++;
 }
}
// All unrelated per-team outputs preserved under V115 (RB display/prior only change).
for(const t of ids){
 const a=plain(out[t]),b=plain(old[t]);delete a.rbIndex;delete b.rbIndex;
 delete a._preseasonUnitPrior.rbIndex;delete b._preseasonUnitPrior.rbIndex;
 assert.deepEqual(a,b,t+' only RB effective/display prior changes');checks++;
}
// Frozen normalized snapshot only: real corrected build supplies effective priors,
// accepted live grades/games supply blend; no new capture, feed replay or forecast claim.
const dir='research/cycle8/md07_unit_calibration/';
const inputBytes=fs.readFileSync(dir+'inputs/current_snapshot.json','utf8').replace(/\r\n/g,'\n');
assert.equal(createHash('sha256').update(inputBytes).digest('hex'),'b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247');
const input=JSON.parse(inputBytes),accepted=JSON.parse(fs.readFileSync(dir+'results/rb_prior_call_audit.json')).frames.find(x=>x.name==='B live fitted');

const h=appHarness({hooks:'M,D'}),L=h.L,priors=h.api.M.profiles;
const corrected=L.buildProfiles({priorProfiles:priors,teamIds:Object.keys(priors),rbPolicy:'v115-partial-orthogonal',unitPriorReversion:h.api.D.config.reversion});
const rows=accepted.rows.map(was=>{
 const r=input.teams[was.team],prior=corrected[was.team]._preseasonUnitPrior.rbIndex;
 near(prior,was.matchedPrior,was.team+' accepted fitted prior');
 const current=L.blend(prior,r.liveGrade.rbIndex,r.metadata.playerStatGames,r.metadata.priorGames);
 near(current,was.matchedCurrent,was.team+' frozen current');
 const delta=current-r.display.rbIndex,channel=(current-prior)-(r.display.rbIndex-r.prior.rbIndex);
 near(delta,was.currentDelta,was.team+' frozen delta');
 near(channel,was.bridgeDeltaChange,was.team+' bridge channel');
 near(.07*channel,was.weightedBridgeChannelChange,was.team+' RB weighted channel');
 near(.5*.07*channel,was.preCapHalfShareChange,was.team+' pre-cap channel');
 return {...was,prior,current,delta,channel};
});
const max=k=>Math.max(...rows.map(r=>Math.abs(r[k])));
near(max('delta'),accepted.maxAbsCurrentDelta,'accepted max current delta');
assert.equal(rows.filter(r=>Math.abs(r.delta)>.5).length,accepted.currentDeltaOverHalfPoint);
const ranked=[...rows].sort((a,b)=>b.current-a.current);
for(const r of rows)assert.equal(ranked.indexOf(r)+1,r.matchedRank,r.team+' corrected rank');
assert.equal(rows.filter(r=>r.actualRank!==r.matchedRank).length,accepted.rankChangeCount);
assert.equal(Math.max(...rows.map(r=>Math.abs(r.rankMovement))),accepted.maxRankMovement);
near(max('channel'),accepted.maxAbsBridgeDeltaChange,'accepted channel maximum');
const kc=rows.find(r=>r.team==='KC');assert.equal(kc.matchedRank,3);near(kc.delta,accepted.KC.currentDelta,'KC modest delta');
console.log(JSON.stringify({result:'PASS',checks,semanticMutations:mutations.length,nonV115Policies:6,policyStates:2,frozenTeams:rows.length,maxCurrentDelta:max('delta'),overHalfPoint:accepted.currentDeltaOverHalfPoint,rankChanges:accepted.rankChangeCount,maxRankMovement:accepted.maxRankMovement,KC:{delta:kc.delta,rank:kc.matchedRank},maxBridgeChannel:max('channel'),maxWeightedChannel:.07*max('channel'),maxPreCapHalfShare:.5*.07*max('channel'),boundary:'Frozen live stages and games, corrected production prior path; channel deltas, not total FORCE or forecasts.'}));
