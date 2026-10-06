// MD-08 offline unit-scale and normalization audit. Research only.
// No production code, weights, formulas, ratings or display are changed. All alternate
// mappings below exist only in these research outputs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as H from './lib.mjs';

const {UNITS,BRIDGE_KEYS,DISPLAY_ONLY,THRESHOLDS,fullStats,quantile,rank,correlation,packing,close,clamp,finite}=H;
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)));};
const median=a=>quantile(a,.5);
const ANCHORS={
  'model/unit_force_bridge.js':['const WEIGHTS = Object.freeze({','const SHARE = 0.50;','const CAP = 7.50;','const delta=current-prior;','function eloPerMidpointPoint('],
  'model/live_profiles.js':['const QB_COMPOSITE_EXPANSION = 1.20;','function percentileMap(','function continuousPercentileValue(','function regressUnitIndex(','function blend(prior, live, games, priorGames)','const priorPointsAllowedPerDriveIndex=50;','const liveCov=teamStatsUsable','function calibrateComposite(','const COMPOSITE_V108','frontPass=Number.isFinite(scoreFrontPressure[t])','const v115RbPriorComposite','scoreRecvV109[t]=r.playerStatsUsable','scoreRbV109[t]=r.playerStatsUsable','const stableOlPass','scoreQbEpaV106[t]=','const qbRawLiveScore=','const pointsAllowedPerDriveIndex=livePointsAllowedPerDriveIndex!=null'],
  'assets/app.js':['function unitForceBridgeForProfile(','function currentRatings()','unitPriorReversion: Number(D.config?.reversion ?? 0.30)','p.qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency));','function bandClass(powerScore)','function unitMatchupShare(',"matchupSubedge('QB vs coverage'",'function unitBoardRow(','function rawUnitCell(','const V99_UNIT_FORCE_WEIGHTS'],
  'model/unit_prior_controller.js':['minPriorGames: 0.25']
};
export function anchorLines(){
  return Object.fromEntries(Object.entries(ANCHORS).map(([file,list])=>{const lines=H.lf(file).split('\n');return [file,Object.fromEntries(list.map(s=>{const i=lines.findIndex(l=>l.includes(s));assert(i>=0,file+' anchor '+s);return [s,i+1];}))];}));
}

export function analyze(){
  const {x,L,U,M,D,reference}=H.load();
  const T=Object.keys(x.teams).sort(),Z=x.teams,meta=D.meta,rev=D.config.reversion,scale=D.config.scale;
  assert.deepEqual(Object.keys(U.WEIGHTS),BRIDGE_KEYS);assert.deepEqual({...U.WEIGHTS},x.bridgeWeights);
  assert.equal(U.SHARE,.5);assert.equal(U.CAP,7.5);assert.equal(rev,.3);
  const W=U.WEIGHTS,eloUp=U.eloPerMidpointPoint(meta,1),eloDown=U.eloPerMidpointPoint(meta,-1);

  // ---- 1. Exact reconstruction of the frozen (pre-correction) Week-4 state ----
  const recon={};
  for(const t of T){const z=Z[t];
    for(const k of BRIDGE_KEYS){const {g,k:kk}=H.blendInputs(z,k);let b=L.blend(z.prior[k],z.liveGrade[k],g,kk);
      if(k==='qbIndex')b=clamp(b+z.components.qb.recency_adjustment);
      recon[k]=Math.max(recon[k]||0,Math.abs(b-z.display[k]));close(b,z.display[k],t+' '+k+' blend');}
    close(L.blend(z.prior.offenseIndex,z.liveGrade.offenseIndex,z.metadata.statGames,z.metadata.priorGames),z.display.offenseIndex,t+' offenseIndex');
    close(L.offenseCompositeFrom({...z.display,_offenseCompositePolicy:'v102-orthogonal'}),z.display.offenseComposite,t+' offenseComposite');
    close(L.defenseCompositeFrom(z.display),z.display.defenseIndex,t+' defenseIndex');
    close(U.compute(z.core,z.display,z.prior,meta).elo,z.current,t+' bridge Elo',1e-9);}

  // Live mapping reproduction from committed references.
  const P=M.profiles,vals=Object.values(P);
  const center=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite));
  const wrBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:L.priorReceiverWrteEpa(p)})),.5);
  const rbBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),.5);
  for(const t of T){close(Z[t].raw.receiverOrthogonalBeta,wrBeta,'WR beta');close(Z[t].raw.rbRecvOrthogonalBeta,rbBeta,'RB beta');close(Z[t].raw.receiverEnvironmentCenter,center,'QB centre');}
  const wrRef=vals.map(p=>L.priorReceiverResidual(p,wrBeta,center)).filter(Number.isFinite);
  const rbRef=vals.map(p=>L.priorRbOrthogonalComposite(p,rbBeta,center)).filter(Number.isFinite);
  const W17=reference.sample_windows['17'],qbEpaRef=W17.qb_epa_per_play,qbSuccRef=W17.qb_pass_success_rate;
  const olRef=n=>L.historicalWindowValues(reference,'ol_disruption_rate',n);
  for(const t of T){const z=Z[t],r=z.raw,q=z.components.qb;
    close(L.continuousPercentileValue(qbEpaRef,r.qbStabilizedEpa,true),q.pass_epa_score,t+' QB EPA component');
    close(L.continuousPercentileValue(qbSuccRef,r.qbStabilizedSuccess,true),q.pass_success_score,t+' QB success component');
    close(L.continuousPercentileValue(olRef(r.offensiveDriveGames||r.games),r.pbpPressureAllowedRate,false),z.liveGrade.olIndex,t+' OL live');
    close(L.continuousPercentileValue(wrRef,r.receiverCalibratedResidual,true),z.liveGrade.receiverIndex,t+' WR live');
    close(L.continuousPercentileValue(rbRef,r.rbCalibratedComposite,true),z.liveGrade.rbIndex,t+' RB live');}
  const rankOf=(k,higher)=>L.percentileMap(Object.fromEntries(T.map(t=>[t,Z[t].raw[k]])),higher);
  const rk={run:rankOf('oppRushEpa',false),off:rankOf('offensivePointsPerDrive',true),def:rankOf('defensivePointsPerDrive',false),epa:rankOf('oppPassEpa',false),cpoe:rankOf('oppCpoe',false),rush:rankOf('frontPressureRate',true),anya:rankOf('qbAnyA',true)};
  for(const t of T){const z=Z[t];close(rk.run[t],z.liveGrade.runDefenseIndex,t+' run');close(rk.off[t],z.liveGrade.pointsScoredPerDriveIndex,t+' scoring');close(rk.def[t],z.liveGrade.pointsAllowedPerDriveIndex,t+' prevention');
    close(.75*rk.epa[t]+.25*rk.cpoe[t],z.liveGrade.coverageIndex,t+' coverage');close(rk.anya[t],z.components.qb.any_a_score,t+' ANY/A');
    if(z.metadata.passRushProvider==='nflverse-weekly-disruption')close(rk.rush[t],z.liveGrade.passRushIndex,t+' weekly rush');}

  // ---- 2. Owner-accepted post-MD-07 RB prior frame (LIVE_FITTED), offline ----
  const oldRef=vals.map(L.priorRbOrthogonalComposite).filter(Number.isFinite); // reproduces the pre-fix Array.map call semantics
  const priorPost={},rbPost={};
  for(const t of T){const z=Z[t];
    close(L.regressUnitIndex(L.continuousPercentileValue(oldRef,L.priorRbOrthogonalComposite(P[t]),true),rev),z.prior.rbIndex,t+' pre-fix RB prior');
    priorPost[t]=L.regressUnitIndex(L.continuousPercentileValue(rbRef,L.priorRbOrthogonalComposite(P[t],rbBeta,center),true),rev);
    const {g,k}=H.blendInputs(z,'rbIndex');rbPost[t]=L.blend(priorPost[t],z.liveGrade.rbIndex,g,k);}
  const md07=JSON.parse(H.lf(H.MD07_RB_AUDIT)).frames.find(f=>f.name==='B live fitted');
  for(const row of md07.rows){close(priorPost[row.team],row.matchedPrior,row.team+' MD-07 frame B prior');close(rbPost[row.team],row.matchedCurrent,row.team+' MD-07 frame B current');}

  // Canonical research baseline: frozen Week-4 inputs evaluated with BASE source.
  const S={};
  for(const t of T){const z=Z[t],model={},prior={},live={},lam={};
    for(const k of BRIDGE_KEYS){model[k]=k==='rbIndex'?rbPost[t]:z.display[k];prior[k]=k==='rbIndex'?priorPost[t]:z.prior[k];live[k]=z.liveGrade[k];const {g,k:kk}=H.blendInputs(z,k);lam[k]={g,k:kk,liveWeight:g/(g+kk)};}
    const offenseComposite=L.offenseCompositeFrom({...model,offenseIndex:z.display.offenseIndex,_offenseCompositePolicy:'v102-orthogonal'});
    const offenseCompositeRaw=L.rawOffenseCompositeFrom({...model,_offenseCompositePolicy:'v102-orthogonal'},'v102-orthogonal');
    const bridge=U.compute(z.core,model,prior,meta);
    S[t]={model,prior,live,lam,core:z.core,offenseComposite,offenseCompositeRaw,defenseIndex:z.display.defenseIndex,defenseCompositeRaw:L.rawDefenseCompositeFrom(z.display),offenseIndex:z.display.offenseIndex,bridge,force:U.scoreFromElo(bridge.elo,meta),provider:z.metadata.passRushProvider};}
  const col=(k,layer='model')=>T.map(t=>S[t][layer][k]);
  const rbShift={maxAbsDisplay:Math.max(...T.map(t=>Math.abs(rbPost[t]-Z[t].display.rbIndex))),maxAbsPrior:Math.max(...T.map(t=>Math.abs(priorPost[t]-Z[t].prior.rbIndex))),maxAbsElo:Math.max(...T.map(t=>Math.abs(S[t].bridge.elo-Z[t].current))),rbRankChanges:(()=>{const a=rank(T.map(t=>Z[t].display.rbIndex)),b=rank(T.map(t=>rbPost[t]));return a.filter((v,i)=>v!==b[i]).length;})()};

  const reconstruction={snapshot:H.SNAPSHOT,snapshotSha256:H.PINS[H.SNAPSHOT],snapshotBase:H.SNAPSHOT_BASE,researchBase:H.BASE,
    exactness:'Every frozen display grade, composite, QB/OL/WR/RB/rank live mapping and bridge Elo reproduces to <=1e-10 (Elo <=1e-9); max absolute residual by key below.',
    maxAbsBlendResidualByKey:recon,
    sourceDrift:'Only model/live_profiles.js differs from the snapshot base; the difference is the owner-accepted V115 LIVE_FITTED RB effective-prior frame. All other 17 published scripts are byte-identical after LF normalization.',
    postFixRb:{method:'Effective RB prior recomputed with BASE helpers in the LIVE_FITTED frame; live grade and prior games held at frozen values; matches MD-07 matched frame B for all 32 teams.',rbRecvBeta:rbBeta,qbCentre:center,...rbShift},
    boundary:'Research baseline = frozen Week-4 2026 inputs evaluated with BASE formulas. It is an offline recomputation, not a new live capture; no other unit is affected by the MD-07 correction.'};

  // ---- 3. Architecture inventory ----
  const anchors=anchorLines();
  const priorSrc=k=>({qbIndex:'qbIndex',olIndex:'olIndex',coverageIndex:'coverageIndex',pointsScoredPerDriveIndex:'offenseIndex'})[k];
  const architecture={base:H.BASE,
    canonicalBridgeKeys:BRIDGE_KEYS.map(k=>({key:k,weight:W[k]})),weightSum:BRIDGE_KEYS.reduce((s,k)=>s+W[k],0),share:U.SHARE,capMidpointPoints:U.CAP,eloPerMidpointPointUp:eloUp,eloPerMidpointPointDown:eloDown,
    units:UNITS.map(u=>({...u,bridgeWeight:W[u.key],offenseCompositeWeight:x.composite.offense[u.key]??null,defenseCompositeWeight:x.composite.defense[u.key]??null,
      blend:'display = (k*prior + g*live)/(g+k); prior = 50 + 0.70*(source-50)'+(u.key==='qbIndex'?'; then +recency (+/-4) and clamp 0..100':''),
      displayedRating:'Same numeric field as the model value (no separate display field); one decimal on Units board/team cards, whole points in tables and matchup duels',
      modelUse:'Bridge input: weight*(current - effective prior), share 0.50, shared cap +/-7.50 midpoint points before Elo translation',
      missingData:u.key==='pointsAllowedPerDriveIndex'?'Prior 50 held until drives exist':u.key==='passRushIndex'?'Provider cascade; prior held (prior-held) if no current provider; bridge skips the key if null':u.key==='qbIndex'?'Canonical QB is NaN/unavailable when all-play input or reference is invalid; bridge skips it (weight not redistributed)':'Freshness gates suppress stale live values; prior held pre-season; bridge skips null keys (weight not redistributed)',
      bundledPriorField:priorSrc(u.key)??null})),
    displayOnly:DISPLAY_ONLY.map(d=>({...d,bridgeInput:false,reaggregated:'Recomputed from component grades after blending (and after QB recency); never fed back to the bridge'})),
    otherDisplayConsumers:['Units board (10 rows; scoring/drive not shown)','Rankings Units table (9 columns)','Team page unit cards','Matchup subedges compare different units directly: QB vs coverage, receivers vs coverage, OL vs pass rush, RB vs run defense (presentation-only share 50+35*tanh(diff/45), 15..85)','Matchup duels and unit cells colour by bandClass: <41 red, 41..<71 yellow, >=71 green (the overall FORCE band)','unitChangeRows week-over-week deltas','Exports'],
    modelConsumers:['currentRatings() -> every forecast, projection and ranking via unitForceBridge','currentTeamState() / canonicalGameTeamState() (historical states)','week2EntryState()/ratingLedger() decomposition (V99 weights; diagnostic ledger)'],
    anchors};

  // ---- 4. Distributions ----
  const liveBounds={'current-rank':[0,100],'current-rank-composite':[0,100],'mixed-provider':[0,100],multicomponent:[0,100],'historical-cdf':[50/32,100-50/32],'historical-window-cdf':[50/448,100-50/448]};
  // Display path (blend -> QB recency -> final clamp), verified against every model value.
  for(const t of T)for(const k of BRIDGE_KEYS)close(H.displayFromLive(L,Z[t],k,S[t].prior[k],S[t].live[k]),S[t].model[k],t+' '+k+' display path');
  const dist={};
  for(const u of UNITS){const k=u.key,[lo,hi]=liveBounds[u.family];
    const delta=T.map(t=>S[t].model[k]-S[t].prior[k]);
    const liveAtBound=T.filter(t=>Math.abs(S[t].live[k]-lo)<1e-9||Math.abs(S[t].live[k]-hi)<1e-9);
    const bounds=T.map(t=>H.conditionalDisplayBounds(L,Z[t],k,S[t].prior[k],lo,hi));
    dist[k]={label:u.label,family:u.family,display:fullStats(col(k)),live:fullStats(col(k,'live'),{floor:lo,ceiling:hi}),prior:fullStats(col(k,'prior'),{floor:15,ceiling:85}),bridgeDelta:fullStats(delta),
      liveAtTheoreticalBound:liveAtBound.map(t=>({team:t,live:S[t].live[k],display:S[t].model[k]})),
      conditionalDisplayBounds:{lower:Math.min(...bounds.map(b=>b[0])),upper:Math.max(...bounds.map(b=>b[1])),
        definition:'Conditional on the frozen Week-4 inputs: each team\'s own prior, blend weights'+(k==='qbIndex'?' and recency adjustment':'')+' held fixed, live grade set to the family floor/ceiling, then the production display path (blend'+(k==='qbIndex'?' -> recency -> final clamp 0..100':'')+'). Not universal hard bounds.'},
      packing:packing(col(k)),liveWeight:fullStats(T.map(t=>S[t].lam[k].liveWeight))};}
  for(const d of DISPLAY_ONLY){const v=T.map(t=>S[t][d.key]);dist[d.key]={label:d.label,family:'display-only',display:fullStats(v),packing:packing(v)};}
  dist.offenseCompositeRaw={label:'Overall offense raw weighted grade',family:'display-only input',display:fullStats(T.map(t=>S[t].offenseCompositeRaw))};
  dist.defenseCompositeRaw={label:'Overall defense raw weighted grade',family:'display-only input',display:fullStats(T.map(t=>S[t].defenseCompositeRaw))};
  const teamRows=T.map(t=>({team:t,passRushProvider:S[t].provider,...Object.fromEntries(BRIDGE_KEYS.flatMap(k=>[[k,S[t].model[k]],[k+'_live',S[t].live[k]],[k+'_prior',S[t].prior[k]],[k+'_delta',S[t].model[k]-S[t].prior[k]]])),offenseComposite:S[t].offenseComposite,defenseIndex:S[t].defenseIndex,offenseIndex:S[t].offenseIndex,bridgePoints:S[t].bridge.bridgePoints,eloDelta:S[t].bridge.eloDelta,force:S[t].force}));
  const distributions={conventions:'Population SD; quantiles linear at (n-1)p; counts are at-or-above 60/70/80/90 and strictly below 40/30; ties counted on exact, one-decimal (Units board) and whole-point (tables/matchups) values. Live-layer theoretical bounds: current-rank 0/100; 32-team historical CDF 1.5625/98.4375; 448-window CDF 0.1116/99.8884 (two teams use 3-game windows); priors 15/85 from regressing 0..100 sources. Display bounds are conditional on frozen inputs (see conditionalDisplayBounds).',
    units:dist,teams:teamRows};
  const csvKeys=Object.keys(teamRows[0]);
  const csv=[csvKeys.join(','),...teamRows.map(r=>csvKeys.map(k=>typeof r[k]==='number'?r[k].toFixed(6):r[k]).join(','))].join('\n')+'\n';

  // ---- 5. What do 50/60/70/80/90 correspond to (classified per unit; not a blanket inversion) ----
  const med=k=>median(T.map(t=>Z[t].raw[k]));
  const rawMean=k=>mean(T.map(t=>Z[t].raw[k]));
  const cur=(k)=>Z[T[0]].raw[k];
  const curQ=(k,p)=>quantile(T.map(t=>Z[t].raw[k]),p);
  const rt=(arr,X,higher,label)=>{const inv=H.inverseCdf(arr,X,higher),reconstructed=L.continuousPercentileValue(arr,inv.value,higher);
    if(inv.bound==null){close(reconstructed,X,label+' round trip',1e-8);return {...inv,targetRating:X,reconstructedRating:reconstructed,classification:'EXACT / UNIQUE',roundTripAsserted:true};}
    if(inv.bound==='tieJump'){assert(higher?reconstructed<=X:reconstructed>=X,label+' tie jump');return {...inv,targetRating:X,reconstructedRating:reconstructed,classification:'TIE-JUMP / APPROXIMATE',roundTripAsserted:false,reason:'Empirical-CDF tie: the production map jumps over the target; the reported raw value is the tied reference value. Production CDF behaviour is not altered.'};}
    return {...inv,targetRating:X,reconstructedRating:reconstructed,classification:inv.attainable?'EXACT / UNIQUE':'UNREACHABLE',roundTripAsserted:false};};
  const wrW=med('receiverRoomTargets')/(med('receiverRoomTargets')+80),rbWr=med('rbCarries')/(med('rbCarries')+50);
  const qbP=med('qbValuePlays'),qbA=med('qbAttemptPassAttempts'),qbWe=qbP/(qbP+150),qbWs=qbA/(qbA+100),qbWc=qbA/(qbA+60);
  const pooledOl=T.reduce((s,t)=>s+Z[t].raw.pbpPassProtectionDisruptions,0)/T.reduce((s,t)=>s+Z[t].raw.pbpPassProtectionDropbacks,0);
  const dispMed=k=>median(col(k)),liveMed=k=>median(col(k,'live'));
  const rankMid=(k,higher,key)=>({transformMidpoint:'50 = median standing under the current-season rank transform (not the arithmetic mean of the raw metric)',rawMedian:med(k),rawMean:rawMean(k),interpolatedRankGradeAtRawMean:H.rankGradeAt(T.map(t=>Z[t].raw[k]),rawMean(k),higher),empiricalLiveMedian:liveMed(key),empiricalDisplayedMedian:dispMed(key)});
  const assume=o=>({fixedAssumptions:o});
  const thr={};
  thr.receiverIndex={mappedInput:'receiverCalibratedResidual (EPA/target after residualization, stabilization and centre alignment)',reference:'32 bundled 2025 WR/TE residual team-seasons (full season)',
    midpoint:{transformMidpoint:'2025 reference median residual maps to live 50',referenceMedian:cur('receiverHistoricalResidualMedian'),currentWeightedCentre:cur('receiverCurrentLeagueResidual'),currentWeightedCentreDefinition:'Target-weighted 2026 league residual mean; aligned onto the reference median after stabilization',mappedGradeOfCurrentWeightedCentre:L.continuousPercentileValue(wrRef,cur('receiverHistoricalResidualMedian'),true),rawResidualMedian:med('receiverResidualEpa'),rawResidualMean:rawMean('receiverResidualEpa'),empiricalLiveMedian:liveMed('receiverIndex'),empiricalDisplayedMedian:dispMed('receiverIndex')},
    medianTargets:med('receiverRoomTargets'),medianReliability:wrW,
    thresholds:THRESHOLDS.map(X=>{const inv=rt(wrRef,X,true,'WR '+X);return {target:X,referencePercentile:X,referenceScope:"REFERENCE-RELATIVE (2025 reference percentile)",mappedInput:{value:inv.value,classification:inv.classification,reconstructedRating:inv.reconstructedRating,attainable:inv.attainable,roundTripAsserted:inv.roundTripAsserted},impliedRawResidual:{value:cur('receiverCurrentLeagueResidual')+(inv.value-cur('receiverHistoricalResidualMedian'))/wrW,classification:'OPPORTUNITY-ASSUMPTION APPROXIMATION',...assume({targets:med('receiverRoomTargets'),stabilizerTargets:80,reliability:wrW})}};})};
  thr.rbIndex={mappedInput:'rbCalibratedComposite (70/30 room composite after stabilization and centre alignment)',reference:'32 bundled 2025 RB room composites, LIVE_FITTED frame',
    midpoint:{transformMidpoint:'2025 reference median composite maps to live 50',referenceMedian:cur('rbHistoricalCompositeMedian'),currentWeightedCentre:cur('rbCurrentLeagueCompositeCenter'),currentWeightedCentreDefinition:'0.70*carry-weighted 2026 rush EPA mean + 0.30*target-weighted residual receiving mean; aligned onto the reference median after stabilization',mappedGradeOfCurrentWeightedCentre:L.continuousPercentileValue(rbRef,cur('rbHistoricalCompositeMedian'),true),rawCompositeMedian:med('rbCompositeOrthogonal'),rawCompositeMean:rawMean('rbCompositeOrthogonal'),empiricalLiveMedian:liveMed('rbIndex'),empiricalDisplayedMedian:dispMed('rbIndex')},
    medianCarries:med('rbCarries'),medianRushReliability:rbWr,
    thresholds:THRESHOLDS.map(X=>{const inv=rt(rbRef,X,true,'RB '+X);return {target:X,referencePercentile:X,referenceScope:"REFERENCE-RELATIVE (2025 reference percentile)",mappedInput:{value:inv.value,classification:inv.classification,reconstructedRating:inv.reconstructedRating,attainable:inv.attainable,roundTripAsserted:inv.roundTripAsserted},impliedRushEpaPerCarry:{value:cur('rbCurrentLeagueRush')+(inv.value-cur('rbHistoricalCompositeMedian'))/(.7*rbWr),classification:'OPPORTUNITY-ASSUMPTION APPROXIMATION',...assume({carries:med('rbCarries'),stabilizerCarries:50,rushReliability:rbWr,receivingResidual:'held at current centre'})}};})};
  thr.olIndex={mappedInput:'pbpPressureAllowedRate (raw; lower is better)',reference:'448 rolling 4-game 2025 team windows (two teams with 3 drive-games use 480 3-game windows)',
    midpoint:{transformMidpoint:'2025 4-game reference median rate maps to live 50',referenceMedian:quantile(olRef(4),.5),pooledCurrentRate:pooledOl,pooledCurrentRateDefinition:'Sum of 2026 disruptions / sum of dropbacks across all 32 teams',mappedGradeOfPooledCurrentRate:L.continuousPercentileValue(olRef(4),pooledOl,false),rawTeamRateMedian:med('pbpPressureAllowedRate'),rawTeamRateMean:rawMean('pbpPressureAllowedRate'),empiricalLiveMedian:liveMed('olIndex'),empiricalDisplayedMedian:dispMed('olIndex'),
      note:'The pooled-signal grade is the mapped grade of the pooled current signal against the 2025 reference, not the empirical displayed median.'},
    thresholds:THRESHOLDS.map(X=>{const inv=rt(olRef(4),X,false,'OL '+X);return {target:X,referencePercentile:X,referenceScope:"REFERENCE-RELATIVE (2025 reference percentile)",disruptionRateAllowed:inv.value,classification:inv.classification,reconstructedRating:inv.reconstructedRating,attainable:inv.attainable,roundTripAsserted:inv.roundTripAsserted,...(inv.reason?{reason:inv.reason}:{})};})};
  const cLeague={epa:cur('qbCurrentLeagueEpa'),succ:cur('qbCurrentLeagueSuccess'),cpoe:cur('qbCurrentLeagueCpoe')};
  const qbComp=c=>{const e=rt(qbEpaRef,c,true,'QB EPA'),s=rt(qbSuccRef,c,true,'QB success');return {component:c,epaComponentMappedEpa:e.value,epaComponentReconstructed:e.reconstructedRating,epaImpliedRawAtMedianPlays:cLeague.epa+(e.value-cLeague.epa)/qbWe,
    successMapped:s.value,successComponentReconstructed:s.reconstructedRating,successImpliedRawAtMedianAttempts:cLeague.succ+(s.value-cLeague.succ)/qbWs,
    anyAAtCurrentRank:curQ('qbAnyA',c/100),cpoeImpliedRaw:c<100&&c>0?cLeague.cpoe+7.5*Math.atanh((c-50)/50)/qbWc:null,rushingBonusPoints:c>=50?12*(c-50)/50:null};};
  const qbProxy=(()=>{const rush=median(T.map(t=>Z[t].components.qb.rushing_value_score));const e=L.continuousPercentileValue(qbEpaRef,cLeague.epa,true),s=L.continuousPercentileValue(qbSuccRef,cLeague.succ,true);
    return {epaComponent:e,successComponent:s,anyAComponent:50,cpoeComponent:50,medianRushingValueComponent:rush,constructedPreContextProxy:L.calibrateQbComposite(.3*e+.3*50+.2*s+.1*rush+.1*50),
      definition:'Constructed under the current component mappings and weights: EPA and success at the current weighted league means, ANY/A at median standing (50), CPOE at the current mean (50), rushing at the median team rushing component; before opponent, pressure, prior and recency. It is not the empirical displayed median, not a unique raw "average QB" and not a single observed football signal.'};})();
  thr.qbIndex={mappedInput:'Five component scores, expanded 1.20x about 50, plus opponent and pressure context, then blended and recency-adjusted',
    midpoint:{transformMidpoint:'Composite 50 when the weighted component mean is 50',constructedQbProxy:qbProxy,rawQbEpaMedian:med('qbEpaPerPlay'),rawQbEpaMean:rawMean('qbEpaPerPlay'),currentWeightedLeagueEpa:cLeague.epa,currentWeightedLeague:cLeague,empiricalLiveMedian:liveMed('qbIndex'),empiricalDisplayedMedian:dispMed('qbIndex')},
    medianValuePlays:qbP,medianAttempts:qbA,reliability:{epa:qbWe,success:qbWs,cpoe:qbWc},
    thresholds:THRESHOLDS.map(X=>{const cu=50+(X-50)/1.2,c4=(50+(X-50)/1.2-5)/.9;return {target:X,classification:'MULTIDIMENSIONAL PROXY',uniformComponentLevel:cu,componentLevelWithRushingAtFloor50:c4,illustrativeAtUniformLevel:qbComp(cu),...assume({allFiveComponentsEqual:true,opponentAdjustment:0,pressureAdjustment:0,plays:qbP,attempts:qbA})};}),
    note:'Uniform component level, implied EPA and implied ANY/A are illustrative multidimensional proxies, not unique raw thresholds: many component combinations reach the same grade. Rushing value cannot fall below 50 (bonus clamped at 0). Opponent (+/-4) and pressure context are added after expansion.'};
  const rankThr=(k,higher,key,unit)=>({mappedInput:k+' (current-season rank; '+(higher?'higher':'lower')+' is better)',reference:'The 32 current 2026 teams (Week 4)',midpoint:rankMid(k,higher,key),
    thresholds:THRESHOLDS.map(X=>{const raw=curQ(k,higher?X/100:1-X/100),vals=T.map(t=>Z[t].raw[k]),below=Math.max(...vals.filter(v=>v<=raw)),above=Math.min(...vals.filter(v=>v>=raw));
      return {target:X,currentSeasonPercentile:X,raw,classification:'DISCRETE / INTERVAL',interpolatedRankGrade:H.rankGradeAt(vals,raw,higher),bracketingObservedRaw:[below,above],bracketingObservedGrades:[H.rankGradeAt(vals,below,higher),H.rankGradeAt(vals,above,higher)].sort((a,b)=>a-b),
        reason:'Interpolated rank quantile: a snapshot descriptor between observed teams; production ranks observed teams only, so no single observed raw value need map back to the nominal grade.'};}),unit});
  thr.runDefenseIndex=rankThr('oppRushEpa',false,'runDefenseIndex','rush EPA/carry allowed');
  thr.pointsScoredPerDriveIndex=rankThr('offensivePointsPerDrive',true,'pointsScoredPerDriveIndex','points per qualifying drive');
  thr.pointsAllowedPerDriveIndex={...rankThr('defensivePointsPerDrive',false,'pointsAllowedPerDriveIndex','points allowed per opponent drive'),
    displayReachability:THRESHOLDS.map(X=>({display:X,liveNeededAtG4K1:(X-.2*50)/.8,attainable:(X-.2*50)/.8<=100,classification:(X-.2*50)/.8<=100?((X-.2*50)/.8===100?'EXACT / UNIQUE (boundary: league-best only)':'EXACT / UNIQUE'):'UNREACHABLE'})),note:'Prior is fixed at 50 with k=1, so at four drive-games display = 10 + 0.8*live: displayed range is exactly 10..90 and 90 is only the league-best team.'};
  thr.passRushIndex={...rankThr('frontPressureRate',true,'passRushIndex','weekly hit+sack disruption rate (all 32 ranked; grade used for 28 weekly-provider teams)'),pfrStratum:{classification:'NOT INVERTED',reason:'Four PFR-charted teams map against same-sized 2025 charted windows under a different map; not inverted here (four-team stratum; provider rows not parsed in this tranche).'}};
  thr.coverageIndex={mappedInput:'0.75*EPA-allowed rank + 0.25*CPOE-allowed rank (current season)',reference:'The 32 current 2026 teams',midpoint:{...rankMid('oppPassEpa',false,'coverageIndex'),cpoeComponent:rankMid('oppCpoe',false,'coverageIndex')},
    thresholds:THRESHOLDS.map(X=>{const need=(X-12.5)/.75;return {target:X,classification:need<=100?'MULTIDIMENSIONAL PROXY':'UNREACHABLE',epaAllowedAtPercentileX:curQ('oppPassEpa',1-X/100),cpoeAllowedAtPercentileX:curQ('oppCpoe',1-X/100),epaRankNeededIfCpoeNeutral:need,attainableIfCpoeNeutral:need<=100,...assume({cpoeRank:50})};}),
    note:'Two-component rank mix: the EPA/CPOE columns are each component at percentile X, not a joint threshold. With a league-median CPOE rank held fixed the live grade cannot exceed 87.5, so live 90 is UNREACHABLE under that assumption.'};
  const comp={offenseComposite:DISPLAY_ONLY[0],defenseIndex:DISPLAY_ONLY[1]};
  for(const [k,d] of Object.entries(comp))thr[k]={mappedInput:'Weighted average of component grades (raw composite)',map:d.map,thresholds:THRESHOLDS.map(X=>{const raw=L.uncalibrateComposite(X,L.COMPOSITE_V108[d.config]),rec=L.calibrateComposite(raw,L.COMPOSITE_V108[d.config]);close(rec,X,k+' composite round trip',1e-8);return {target:X,rawWeightedGrade:raw,reconstructedRating:rec,classification:'EXACT / UNIQUE',roundTripAsserted:true};})};
  const displayLayer=Object.fromEntries(BRIDGE_KEYS.map(k=>{const lw=median(T.map(t=>S[t].lam[k].liveWeight));return [k,{medianLiveWeight:lw,liveNeeded:THRESHOLDS.map(X=>({display:X,...Object.fromEntries([35,50,65].map(Pr=>[`prior${Pr}`,(X-(1-lw)*Pr)/lw]))})),...(k==='qbIndex'?{note:'QB also adds recency after the blend; shown for zero recency.'}:{})}];}));
  const classes=['EXACT / UNIQUE','DISCRETE / INTERVAL','REFERENCE-RELATIVE','TIE-JUMP / APPROXIMATE','MULTIDIMENSIONAL PROXY','OPPORTUNITY-ASSUMPTION APPROXIMATION','UNREACHABLE','NOT INVERTED'];
  const midpoints={conventions:'Thresholds are classified per unit and per target; no blanket round-trip claim is made. EXACT / UNIQUE round trips are asserted only where that class is recorded (roundTripAsserted true). Historical-reference thresholds are REFERENCE-RELATIVE by nature (a 2025 reference percentile). Implied-raw columns are OPPORTUNITY-ASSUMPTION APPROXIMATIONS with the fixed assumptions listed. Midpoint objects separate the transform/reference midpoint, raw median, raw arithmetic mean, current weighted centre, mapped pooled/centre signal, constructed QB proxy and empirical displayed median. Display = liveWeight*live + (1-liveWeight)*prior (QB adds recency), reported separately.',
    classificationVocabulary:classes,live:thr,displayLayer,
    descriptiveAnswers:Object.fromEntries([...BRIDGE_KEYS,'offenseComposite','defenseIndex'].map(k=>{const v=k in S[T[0]].model?col(k):T.map(t=>S[t][k]);return [k,{empiricalDisplayedMedian:median(v),mean:mean(v),percentileOf50:H.empiricalPercentile(v,50),countAtOrAbove70:v.filter(a=>a>=70).length,countAtOrAbove80:v.filter(a=>a>=80).length,countAtOrAbove90:v.filter(a=>a>=90).length}];}))};

  // ---- 6. Cross-unit percentile comparability ----
  const crossKeys=[...BRIDGE_KEYS,'offenseComposite','defenseIndex'];
  const valsOf=(k,layer)=>layer==='live'?col(k,'live'):(k in S[T[0]].model?col(k):T.map(t=>S[t][k]));
  const nominal={'current-rank':'X = X-th percentile of the current 32 teams (before prior blend)','current-rank-composite':'Weighted mix of two current-season percentiles','mixed-provider':'28 teams: current-season percentile; 4 teams: percentile of 2025 charted windows','multicomponent':'Expanded mixture of 2025 full-season and current-season component percentiles plus context','historical-cdf':'X = X-th percentile of 32 2025 full-season team values after early-season stabilization and centre alignment','historical-window-cdf':'X = X-th percentile of 2025 same-length team windows'};
  const crossUnit={note:'Empirical percentile = 100*(count below + half ties)/32 within the current Week-4 distribution. p99 is not supported with n=32.',
    rows:crossKeys.map(k=>{const u=UNITS.find(v=>v.key===k);const out={key:k,label:u?.label??DISPLAY_ONLY.find(d=>d.key===k).label,nominalMeaning:u?nominal[u.family]:'Soft-tail expansion of a weighted average of component grades'};
      for(const layer of u?['display','live']:['display']){const v=valsOf(k,layer);out[layer]={percentileAt:Object.fromEntries(THRESHOLDS.map(X=>[X,H.empiricalPercentile(v,X)])),ratingAt:{p50:quantile(v,.5),p75:quantile(v,.75),p90:quantile(v,.9),p95:quantile(v,.95),p99:'not supported (n=32)'}};}
      return out;})};
  const spreadP70=crossUnit.rows.filter(r=>BRIDGE_KEYS.includes(r.key)).map(r=>r.display.percentileAt[70]);
  crossUnit.summary={display70PercentileRange:[Math.min(...spreadP70),Math.max(...spreadP70)],display90PercentileRange:(()=>{const a=crossUnit.rows.filter(r=>BRIDGE_KEYS.includes(r.key)).map(r=>r.display.percentileAt[90]);return [Math.min(...a),Math.max(...a)];})()};

  // ---- 7. Cross-season ----
  const bundled=['qbIndex','olIndex','coverageIndex','offenseIndex','receiverIndex','frontIndex','rushIndex','defenseIndex','offenseComposite'];
  const qbWindowReplay=(()=>{const ppg=median(T.map(t=>Z[t].raw.qbValuePlays/Z[t].metadata.playerStatGames));
    return {playsPerGameAssumed:ppg,stabilizerPlays:150,windows:[1,2,3,4,6,8,12,17].map(w=>{const v=reference.sample_windows[String(w)].qb_epa_per_play,c=mean(v),wt=ppg*w/(ppg*w+150);
      const prod=v.map(a=>L.continuousPercentileValue(qbEpaRef,c+wt*(a-c),true)),raw17=v.map(a=>L.continuousPercentileValue(qbEpaRef,a,true)),matched=v.map(a=>L.continuousPercentileValue(v,a,true));
      const s=a=>({sd:sd(a),p10:quantile(a,.1),p90:quantile(a,.9),shareAtOrAbove90:a.filter(q=>q>=90).length/a.length,shareAtOrAbove80:a.filter(q=>q>=80).length/a.length,shareAtOrBelow10:a.filter(q=>q<=10).length/a.length});
      return {games:w,windows:v.length,reliability:wt,currentDesignStabilizedToFullSeason:s(prod),unstabilizedToFullSeason:s(raw17),windowMatched:s(matched)};}),
      boundary:'Replays only the QB EPA component mapping on 2025 rolling windows (reference v5), with an assumed plays/game from the current snapshot and the window-pool mean as stabilization centre. It is not a reconstruction of past whole QB grades.'};})();
  const olWindows=[1,2,4,8,17].map(w=>{const v=olRef(w);return {games:w,n:v.length,p10:quantile(v,.1),p50:quantile(v,.5),p90:quantile(v,.9)};});
  const anchorClass=[
    ['pointsScoredPerDriveIndex','Season-relative (current rank)','Recomputed each season from the current league','Prior from bundled 2025 legacy grade','90 means about top 10% of this season, not a fixed points/drive level'],
    ['qbIndex','Mixed','EPA/success fixed to 2025 full-season QB distribution, but stabilized toward the current league mean; ANY/A current rank; CPOE relative to current league mean; opponent/pressure/recency relative to current season','Bundled 2025 qbIndex prior','Neither purely absolute nor purely relative'],
    ['receiverIndex','Season-relative centre, 2025 spread','Current league centre is aligned to the 2025 median, so 50 is always this season\'s average; spread uses the fixed 2025 shape','Bundled 2025 profiles; ridge beta and centre refitted from them','90 means a residual as far above this season\'s centre as the 2025 90th percentile was above 2025\'s'],
    ['olIndex','Fixed historical anchor','Raw disruption rate versus 2025 same-length windows; no centre alignment, so a league-wide change in disruption shifts every team','Bundled 2025 olIndex prior','Closest to "same absolute performance" but only against 2025 and only for pass protection'],
    ['rbIndex','Season-relative centre, 2025 spread','Same design as receivers (LIVE_FITTED frame)','Bundled 2025 profiles','As receivers'],
    ['coverageIndex','Season-relative (current rank)','Current ranks only','Bundled 2025 coverageIndex prior','Top ~10% of this season'],
    ['passRushIndex','Mixed by provider','Weekly fallback current rank (28); PFR teams fixed 2025 charted windows (4)','2025 PFR or dl.pressure_rate percentile','Depends on provider; also depends on which provider the team gets'],
    ['runDefenseIndex','Season-relative (current rank)','Current ranks only','2025 run_stop_rate percentile (different construct)','Top ~10% of this season'],
    ['pointsAllowedPerDriveIndex','Season-relative (current rank)','Current ranks only','Neutral 50','Top ~10% of this season, capped at display 90 at Week 4']
  ].map(([key,classification,anchor,priorDependence,meaningOf90])=>({key,classification,anchor,priorDependence,meaningOf90,providerSampleDependence:key==='passRushIndex'?'Yes: provider selection changes the mapping family':'Current-season sample only'}));
  const crossSeason={verdict:'Exact cross-season comparability of the CURRENT formulas is UNMEASURABLE from repository inputs. No archived like-for-like 2025 (or earlier) set of current-formula live grades, priors, provider selections and control states exists. The bundled 2025 grades below come from the legacy pipeline with different definitions and are shown descriptively only.',
    anchorClassification:anchorClass,
    bundled2025LegacyGrades:Object.fromEntries(bundled.map(k=>[k,fullStats(vals.map(p=>Number(p[k])).filter(Number.isFinite))])),
    withinSeasonSampleSizeDrift:{qbEpaComponent:qbWindowReplay,olReferenceWindows:olWindows,
      finding:'OL is window-matched, so a percentile keeps its meaning as games accumulate. QB EPA, WR and RB map early-season stabilized values onto a full-season reference, so the share of teams able to reach 80/90 changes with sample size: the meaning of a displayed QB/WR/RB number drifts within a season even with no change in football quality.'},
    requiredArchives:['Dated per-week team/player/PBP inputs (or derived aggregates) for each season to be compared','The historical calibration references in force at each date (QB/OL windows, WR/RB 2025-style team references per season)','Effective priors, prior-games/continuity controller state and QB opponent/pressure/recency context at each date','Pass-rush provider selection per team and date','The bridge weights/share/cap and normalization constants in force at each date','A frozen season-end archive of every unit grade under one formula version']};

  // ---- 8. Bridge effective sensitivity ----
  const tot=T.map(t=>BRIDGE_KEYS.reduce((s,k)=>s+W[k]*(S[t].model[k]-S[t].prior[k]),0)),vt=sd(tot)**2;
  const sens=BRIDGE_KEYS.map(k=>{const d=T.map(t=>S[t].model[k]-S[t].prior[k]),wd=d.map(v=>W[k]*v),m=mean(tot),mw=mean(wd);
    const cov=mean(wd.map((v,i)=>(v-mw)*(tot[i]-m)));
    const theo=Math.max(...T.map(t=>{const u=UNITS.find(v=>v.key===k),[lo,hi]=liveBounds[u.family],[a,b]=H.conditionalDisplayBounds(L,Z[t],k,S[t].prior[k],lo,hi);return Math.max(Math.abs(b-S[t].prior[k]),Math.abs(a-S[t].prior[k]));}));
    const pos=T.filter((t,i)=>d[i]>0),neg=T.filter((t,i)=>d[i]<0),ranked=T.map((t,i)=>({team:t,delta:d[i]})).sort((p,q)=>q.delta-p.delta);
    return {key:k,nominalWeight:W[k],nominalShare:W[k]/BRIDGE_KEYS.reduce((s,q)=>s+W[q],0),sdDisplay:sd(col(k)),sdLive:sd(col(k,'live')),sdPrior:sd(col(k,'prior')),sdDelta:sd(d),meanDelta:mean(d),meanAbsDelta:mean(d.map(Math.abs)),maxAbsDelta:Math.max(...d.map(Math.abs)),
      oneSdDisplayMoveEloUp:W[k]*sd(col(k))*U.SHARE*eloUp,oneSdDeltaEloUp:W[k]*sd(d)*U.SHARE*eloUp,oneSdDeltaEloDown:W[k]*sd(d)*U.SHARE*eloDown,
      practicalMaxPreCapPoints:Math.max(...wd.map(v=>Math.abs(v)))*U.SHARE,practicalMaxPreCapElo:Math.max(...wd.map(v=>Math.abs(v)))*U.SHARE*eloDown,
      signDistribution:{positive:pos.length,negative:neg.length,zero:T.length-pos.length-neg.length,largestPositive:ranked.slice(0,3),largestNegative:ranked.slice(-3).reverse()},
      theoreticalMaxAbsDelta:theo,theoreticalMaxDefinition:"Conditional on frozen inputs through the production display path (QB includes recency and final clamp)",theoreticalMaxPreCapPoints:W[k]*theo*U.SHARE,
      effectiveShareBySdDelta:null,varianceContributionShare:cov/vt,correlationWithTotal:correlation(d,tot).pearson};});
  const sumWsd=sens.reduce((s,r)=>s+r.nominalWeight*r.sdDelta,0);sens.forEach(r=>r.effectiveShareBySdDelta=r.nominalWeight*r.sdDelta/sumWsd);
  const bp=T.map(t=>S[t].bridge.bridgePoints);
  const latticeSd=100/31*Math.sqrt((32*32-1)/12);
  const bridgeSensitivity={eloPerMidpointPoint:{up:eloUp,down:eloDown},share:U.SHARE,cap:U.CAP,
    note:'Delta = displayed/model grade minus effective prior, both on that unit\'s own 0..100 scale. Effective share = w*SD(delta)/sum(w*SD(delta)); variance share = w*cov(delta,total)/var(total). Neither is causal attribution or double counting.',
    units:sens,preCapPoints:fullStats(T.map(t=>.5*tot[T.indexOf(t)])),capBoundTeams:T.filter((t,i)=>Math.abs(bp[i])>=U.CAP-1e-12),
    familyLiveSd:{currentRankLatticeTheoreticalSd:latticeSd,observed:Object.fromEntries(BRIDGE_KEYS.map(k=>[k,sd(col(k,'live'))]))},
    floorCeilingEffects:{pointsAllowedPerDriveIndex:'Prior fixed 50, k=1: |delta| <= 40 at four drive-games, practical ceiling .09*40*.5 = 1.8 midpoint points',priors:'All regressed priors lie in [15,85], so a weak-prior team has more upward room than downward and vice versa'}};

  // ---- 9/10. Candidate display mappings (offline prototypes) ----
  const protoKeys=[...BRIDGE_KEYS,'offenseComposite','defenseIndex'];
  const before=k=>BRIDGE_KEYS.includes(k)?col(k):T.map(t=>S[t][k]);
  const fit=(k,kind)=>{const v=before(k),s=[...v].sort((a,b)=>a-b),m=median(v),r=(quantile(v,.75)-quantile(v,.25))/1.349;
    if(kind==='C')return x0=>50+50*Math.tanh(.3*(x0-m)/r);
    if(kind==='D')return x0=>L.continuousPercentileValue(s,x0,true);
    if(kind==='N')return x0=>clamp(50+15*H.normInv(L.continuousPercentileValue(s,x0,true)/100));
    return x0=>x0;};
  const KINDS={A:'As-is (identity)',C:'Season-standardized: 50+50*tanh(0.3*z), z=(x-median)/(IQR/1.349) of this snapshot',D:'Percentile display: Hazen position within this snapshot (continuous CDF). Under relative-standing semantics its full-range spacing is expected by design; under evidence-strength/absolute-separation semantics it may overstate weakly separated units. Percentile spacing is not performance magnitude.',N:'Normal-score display: 50+15*Phi^-1(Hazen position)'};
  const gaps=a=>{const s=[...a].sort((p,q)=>p-q),g=s.slice(1).map((v,i)=>v-s[i]);return {mean:mean(g),sd:sd(g),min:Math.min(...g),max:Math.max(...g)};};
  const span615=a=>{const s=[...a].sort((p,q)=>q-p);return s[5]-s[14];};
  const prototypes={};
  for(const kind of ['C','D','N']){const per={};
    for(const k of protoKeys){const g=fit(k,kind),b=before(k),a=b.map(g);
      const crossings=[60,70,80,90].map(th=>({threshold:th,up:T.filter((t,i)=>b[i]<th&&a[i]>=th),down:T.filter((t,i)=>b[i]>=th&&a[i]<th)}));
      per[k]={spearman:correlation(b,a).spearman,pearson:correlation(b,a).pearson,before:{min:Math.min(...b),max:Math.max(...b),sd:sd(b),ranks6to15Span:span615(b),gaps:gaps(b),within5OfBounds:b.filter(v=>v<=5||v>=95).length,atOrAbove:Object.fromEntries([60,70,80,90].map(th=>[th,b.filter(v=>v>=th).length]))},
        after:{min:Math.min(...a),max:Math.max(...a),sd:sd(a),ranks6to15Span:span615(a),gaps:gaps(a),within5OfBounds:a.filter(v=>v<=5||v>=95).length,atOrAbove:Object.fromEntries([60,70,80,90].map(th=>[th,a.filter(v=>v>=th).length]))},
        spacingRatioSd:sd(a)/sd(b),crossings,teams:T.map((t,i)=>({team:t,before:b[i],after:a[i]}))};}
    // E: two-layer architecture. Bridge keeps reading model values; display uses the mapping.
    const displayLayer=Object.fromEntries(T.map(t=>[t,Object.fromEntries(BRIDGE_KEYS.map(k=>[k,fit(k,kind)(S[t].model[k])]))]));
    const twoLayer=T.map(t=>U.compute(S[t].core,{...S[t].model,_display:displayLayer[t]},S[t].prior,meta).elo-S[t].bridge.elo);
    assert(twoLayer.every(v=>v===0),kind+' two-layer neutrality');
    // Naive single-layer application (mapping applied to both current and prior): model risk.
    const naive=T.map(t=>{const m={},p={};for(const k of BRIDGE_KEYS){const g=fit(k,kind);m[k]=g(S[t].model[k]);p[k]=g(S[t].prior[k]);}return U.compute(S[t].core,m,p,meta);});
    const dElo=naive.map((b,i)=>b.elo-S[T[i]].bridge.elo),dForce=naive.map((b,i)=>U.scoreFromElo(b.elo,meta)-S[T[i]].force);
    const r0=rank(T.map(t=>-S[t].bridge.elo)),r1=rank(naive.map(b=>-b.elo));
    const wp=d=>1/(1+Math.pow(10,-d/scale))-.5;
    prototypes[kind]={description:KINDS[kind],units:per,
      twoLayerModelNeutrality:{maxAbsEloChange:Math.max(...twoLayer.map(Math.abs)),method:'Bridge computed from unchanged model values with a separate display object attached; Elo identical for all 32 teams by construction.'},
      naiveSingleLayerRisk:{maxAbsEloChange:Math.max(...dElo.map(Math.abs)),meanAbsEloChange:mean(dElo.map(Math.abs)),maxAbsForceScoreChange:Math.max(...dForce.map(Math.abs)),teamForceRankChanges:r0.filter((v,i)=>v!==r1[i]).length,maxTeamForceRankMove:Math.max(...r0.map((v,i)=>Math.abs(v-r1[i]))),capBoundBefore:T.filter(t=>Math.abs(S[t].bridge.bridgePoints)>=U.CAP-1e-12).length,capBoundAfter:naive.filter(b=>Math.abs(b.bridgePoints)>=U.CAP-1e-12).length,maxAbsWinProbShiftVsEqualOpponent:Math.max(...dElo.map(d=>Math.abs(wp(d)))),
        boundary:'Illustrates why a display remap must not be applied to the shared model field. Win-probability shift uses the production logistic scale '+scale+' at zero home field; no predictive validation was run.'}};}
  prototypes.A={description:KINDS.A,twoLayerModelNeutrality:{maxAbsEloChange:0},naiveSingleLayerRisk:{maxAbsEloChange:0}};
  prototypes.B={description:'Fixed absolute anchors: unit-specific raw-anchor -> 0..100 maps',status:'NOT PROTOTYPED AS A NEW MAP. WR, RB, OL and the QB EPA/success components already use fixed 2025 references at the live layer (Section 4 classifies their threshold inversions). Coverage, run defense, both drive outcomes, ANY/A and the weekly pass-rush fallback have no pinned like-for-like historical raw reference in the repository, so a fixed-anchor map for them cannot be built reproducibly here.'};

  // ---- 11. MD-07 interaction ----
  const preRb=T.map(t=>Z[t].display.rbIndex),postRb=col('rbIndex');
  const sdRank=k=>{const a=BRIDGE_KEYS.map(q=>[q,sd(col(q))]).sort((p,q)=>q[1]-p[1]);return a.findIndex(([q])=>q===k)+1;};
  const unstab={
    receiverIndex:T.map(t=>{const r=Z[t].raw;return L.continuousPercentileValue(wrRef,r.receiverHistoricalResidualMedian+(r.receiverResidualEpa-r.receiverCurrentLeagueResidual),true);}),
    rbIndex:T.map(t=>{const r=Z[t].raw;return L.continuousPercentileValue(rbRef,r.rbHistoricalCompositeMedian+(r.rbCompositeOrthogonal-r.rbCurrentLeagueCompositeCenter),true);}),
    qbEpaComponent:T.map(t=>L.continuousPercentileValue(qbEpaRef,Z[t].raw.qbEpaPerPlay,true))};
  const prodStage={receiverIndex:col('receiverIndex','live'),rbIndex:col('rbIndex','live'),qbEpaComponent:T.map(t=>Z[t].components.qb.pass_epa_score)};
  const md07Interaction={
    rbAfterCorrection:{pre:fullStats(preRb),post:fullStats(postRb),prePacking:packing(preRb),postPacking:packing(postRb),sdRankAmongNineBridgeUnits:sdRank('rbIndex'),
      finding:'The LIVE_FITTED correction changes RB priors and therefore RB display/bridge deltas, but leaves the RB live mapping unchanged. Post-correction RB is neither unusually compressed nor unusually expanded relative to the other eight bridge units.'},
    stabilizationVsMapping:Object.fromEntries(Object.keys(unstab).map(k=>[k,{production:{stats:fullStats(prodStage[k]),packing:packing(prodStage[k])},withoutStabilization:{stats:fullStats(unstab[k]),packing:packing(unstab[k])},sdRatioProductionOverUnstabilized:sd(prodStage[k])/sd(unstab[k])}])),
    stabilizationNote:'Without-stabilization rows remove only the opportunity shrinkage (raw residual/composite or raw EPA, same centre alignment and same reference). They show the computational contribution of opportunity stabilization/shrinkage to compression, with reference, centre alignment and downstream mapping held fixed. They do NOT establish that the stabilization is wrong, that the underlying measurement is accurate, that compression should be removed, or that a wider distribution would be more predictive. They are diagnostics, not proposals.',
    receiverReliabilityWeights:fullStats(T.map(t=>Z[t].raw.receiverReliabilityWeight)),
    bridgeComparabilityAssumption:'The bridge multiplies each unit\'s grade-point delta by a fixed weight, implicitly treating one grade point as comparable across units. Current-rank units are uniform by construction (theoretical live SD '+latticeSd.toFixed(2)+'), while historical-CDF units inherit whatever spread stabilization leaves; the bridge therefore gives different effective influence per nominal weight (Section 8).'};
  // ---- 12. Future authorization criteria, branched by owner semantics (structure only; no owner choice encoded) ----
  const successCriteria={note:'Branches are alternatives selected by the owner meaning contract. Universal criteria always apply. No branch is preferred here.',
    universal:['Explicit owner-approved meaning contract per unit (population, season scope, absolute vs relative)','Raw, model and display layers identified for every unit','Anchor/reference provenance recorded (fitted, hand-selected, inherited)','Prior semantics documented and consistent with the live meaning','Missing-data semantics documented','No hidden production effect beyond the declared route','Offline reproducibility with pinned inputs','No unintended mechanical ceilings or floors unless deliberately documented (e.g. prevention display 10..90 at four drive-games)'],
    routes:{
      displayOnlyModelNeutral:{when:'Presentation is separated from the model-consumed value (stored display field, render-time transform or equivalent)',requires:['Bridge/model input values bit-identical','Canonical team Elo and forecast outputs bit-identical','Monotonicity / rank preservation as required by the chosen contract','Threshold labels and legends disclose the reference population','Cross-unit equal-standing criterion applies ONLY if equal-standing semantics is chosen']},
      modelLayerNormalization:{when:'Bridge/model inputs are altered',requires:['Bit-identical Elo is NOT required','Pre-declared predictive non-inferiority or improvement','Full-stack Brier, calibration, rank and stability validation','Bridge weights and cap behaviour revalidated','Historical/reference drift addressed']},
      relativeStandingDisplay:{when:'Percentile-like semantics chosen',requires:['Do not fail merely because spacing is wider than current display','Labels state the number expresses standing, not performance magnitude','Cross-unit percentile consistency under the chosen convention','Small-n and tie behaviour inspected']},
      absoluteHistoricalAnchor:{when:'Absolute-quality semantics chosen',requires:['Stable reference anchors','Cross-season comparability evidence from archived like-for-like inputs','Provider and definition stability (including the OL anchor drift question)','Football-performance thresholds with dimensional meaning']},
      standardizedDistance:{when:'Standardized-distance semantics chosen',requires:['Fixed vs season-relative mean/SD defined','Robustness and tail treatment defined','Early-season stability verified']}},
    spacingCriterion:'Any spacing/tail test must name the statistic (e.g. ranks 6-15 span or SD), its units (displayed grade points or reference percentile) and why the comparison follows from the chosen contract; wider spacing is not an automatic failure.'};

  return {
    'reconstruction.json':reconstruction,
    'architecture_inventory.json':architecture,
    'current_distributions.json':distributions,
    'current_unit_values.csv':csv,
    'midpoint_thresholds.json':midpoints,
    'cross_unit_thresholds.json':crossUnit,
    'cross_season.json':crossSeason,
    'bridge_effective_sensitivity.json':bridgeSensitivity,
    'candidate_display_mappings.json':prototypes,
    'md07_interaction.json':md07Interaction,
    'success_criteria.json':successCriteria
  };
}

export const serialize=out=>Object.fromEntries(Object.entries(out).map(([f,v])=>[f,typeof v==='string'?v:H.json(v)]));

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dest=process.argv[2]||H.DIR+'/results';fs.mkdirSync(dest,{recursive:true});
  for(const [f,s] of Object.entries(serialize(analyze())))fs.writeFileSync(path.join(dest,f),s);
  console.log('MD-08 analysis written to '+dest);
}
