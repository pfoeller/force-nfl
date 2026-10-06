// MD-08 follow-up research: OL drift and receiver stabilization. Research only.
// No production code, formula, weight, rating, presentation transform or display is
// changed. Every alternative below exists only in these research outputs.
import assert from 'node:assert/strict';
import * as H from './lib.mjs';

const {mean,sd,median,quantile,correlation,fullStats,close,r6}=H;
const varS=a=>{const m=mean(a);return a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1);};
const frozen=f=>JSON.parse(H.lf(H.FROZEN_DIR+'/results/'+f));
const brief=a=>{const s=fullStats(a);return {n:s.n,mean:s.mean,median:s.median,sd:s.sd,min:s.min,max:s.max,p10:s.p10,p25:s.p25,p75:s.p75,p90:s.p90,atOrAbove:s.atOrAbove,below:s.below};};
const span615=a=>{const d=[...a].sort((p,q)=>q-p);return d[5]-d[14];};
const shape=a=>({...brief(a),ranks6to15Span:span615(a)});
const ANCHORS={
  'model/live_profiles.js':['function historicalWindowValues(','function continuousPercentileValue(','function blend(prior, live, games, priorGames)','receiverResidualStabilizerTargets:80.0',
    "const receiverRoomTargets=sum(recRows,'targets');",'r.receiverResidualEpa=receiverResidualPolicyActive(receiverPolicy)','const currentReceiverResidual=weightedLeagueMean(',
    'r.receiverStabilizedResidual=stabilizeToward(','environmentAlignToHistoricalCenter(r.receiverStabilizedResidual','const receiverIndex=playerStatsUsable ? blend(',
    'const priorOlIndex=regressUnitIndex(','const olHistoricalBench=','continuousPercentileValue(olHistoricalBench,effectivePressureAllowedRate,false)','const olIndex=teamStatsUsable ? blend('],
  'force_server.py':['def _v104_reference_from_drive_games(','by_team.setdefault(team,[]).append(rec)',"disrupted=_pbp_truthy(row.get('sack')) or _pbp_truthy(row.get('qb_hit'))","return sorted(out,key=lambda x:(x['week'],x['game_id']))"]
};
export function anchorLines(){
  return Object.fromEntries(Object.entries(ANCHORS).map(([file,list])=>{const lines=H.lf(file).split('\n');
    return [file,Object.fromEntries(list.map(s=>{const i=lines.findIndex(l=>l.includes(s));assert(i>=0,file+' anchor '+s);return [s,i+1];}))];}));
}

export function analyze(){
  const {x,L,M,D,reference,seam}=H.load();
  const Z=x.teams,T=Object.keys(Z).sort(),P=M.profiles,vals=Object.values(P),rev=D.config.reversion;
  const pfr25=H.csv(H.CACHE.pfrPass2025),pfr26=H.csv(H.CACHE.pfrPass2026),ts26=H.csv(H.CACHE.teamStats2026),ps26=H.csv(H.CACHE.playerStats2026);
  const OL='ol_disruption_rate',ORDER=H.referenceTeamOrder(pfr25);
  const olRef=n=>L.historicalWindowValues(reference,OL,n),ref4=olRef(4);
  const olLive=(rate,n=4)=>L.continuousPercentileValue(olRef(n),rate,false);
  const W=(m,len,t,s)=>H.windowAt(reference,m,len,t,s);

  // ================= 0. Reproduction and provenance =================
  const rep={};
  // 0a. 2025 reference windows are team-major and chronological: every 2-game window lies
  // between its two 1-game windows. Shifted alignments are negative controls.
  const bracket=(m,shift)=>{let ok=0,bad=0;const a=reference.sample_windows['1'][m],b=reference.sample_windows['2'][m];
    for(let t=0;t<32;t++)for(let i=0;i<16;i++){const j=(t*16+i+shift)%512,u=a[t*17+i],v=a[t*17+i+1],w=b[j];(w>=Math.min(u,v)-1e-7&&w<=Math.max(u,v)+1e-7)?ok++:bad++;}return {consistent:ok,inconsistent:bad};};
  rep.referenceOrdering={claim:'sample_windows[len][metric] is team-major; within a team, windows are chronological by team game (force_server.py _v104_reference_from_drive_games). 32 teams x 17 games.',
    perMetric:Object.fromEntries(['ol_disruption_rate','qb_epa_per_play','qb_pass_success_rate','qb_pass_epa'].map(m=>[m,{aligned:bracket(m,0),shiftedByOneControl:bracket(m,1)}]))};
  for(const v of Object.values(rep.referenceOrdering.perMetric)){assert.equal(v.aligned.inconsistent,0);assert(v.shiftedByOneControl.inconsistent>100);}
  // 0b. Team identity per slot (Week-1 2025 games by game_id, home then away), validated
  // against an independent provider: PFR per-game (sacked+hit)/dropbacks.
  const pfrGames=rows=>{const m={};for(const r of rows){if(r.game_type!=='REG')continue;const k=r.game_id+'|'+H.canon(r.team);
      const o=m[k]||(m[k]={game_id:r.game_id,week:+r.week,team:H.canon(r.team),sacked:0,hit:0,pressured:0,dropbacks:0,rowsWithoutDropbacks:0});
      const pr=+r.times_pressured||0,pct=+r.times_pressured_pct||0;o.sacked+=+r.times_sacked||0;o.hit+=+r.times_hit||0;o.pressured+=pr;
      if(pr>0&&pct>0)o.dropbacks+=pr/pct;else o.rowsWithoutDropbacks++;}return Object.values(m);};
  const g25=pfrGames(pfr25),g26=pfrGames(pfr26),byTeam25={};
  for(const g of g25)(byTeam25[g.team]=byTeam25[g.team]||[]).push(g);
  for(const a of Object.values(byTeam25)){a.sort((p,q)=>p.week-q.week||p.game_id.localeCompare(q.game_id));assert.equal(a.length,17);}
  const mapCorr=ord=>{const xs=[],ys=[];ord.forEach((team,t)=>{for(let i=0;i<17;i++){const g=byTeam25[team][i];if(g.dropbacks>0){xs.push(W(OL,1,t,i));ys.push((g.sacked+g.hit)/g.dropbacks);}}});return correlation(xs,ys);};
  const swapped=[];for(let i=0;i<32;i+=2)swapped.push(ORDER[i+1],ORDER[i]);
  rep.referenceTeamIdentity={order:ORDER,aligned:mapCorr(ORDER),awayFirstControl:mapCorr(swapped),rotatedControl:mapCorr([...ORDER.slice(1),ORDER[0]]),
    note:'PFR charting is an independent provider; the aligned per-game correlation is far above both controls, so slot identity is established for this research.'};
  assert(rep.referenceTeamIdentity.aligned.pearson>.9&&Math.abs(rep.referenceTeamIdentity.awayFirstControl.pearson)<.2);
  // 0c. Production OL and receiver grades reproduce from committed inputs (BASE formulas).
  const center=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite));
  const beta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:L.priorReceiverWrteEpa(p)})),.5);
  const wrRef=vals.map(p=>L.priorReceiverResidual(p,beta,center)).filter(Number.isFinite),wrMedian=L.medianValue(wrRef);
  const K80=L.UNIT_V115.receiverResidualStabilizerTargets;assert.equal(K80,80);
  const wrCenter=L.weightedLeagueMean(T.map(t=>Z[t].raw),'receiverResidualEpa','receiverRoomTargets');
  const wrPipeline=(t,K,c=wrCenter)=>{const r=Z[t].raw;return L.continuousPercentileValue(wrRef,L.environmentAlignToHistoricalCenter(L.stabilizeToward(r.receiverResidualEpa,c,r.receiverRoomTargets,K),c,wrMedian),true);};
  let maxRes=0;const upd=(a,b,l)=>{close(a,b,l,1e-9);maxRes=Math.max(maxRes,Math.abs(a-b));};
  for(const t of T){const z=Z[t],r=z.raw;
    upd(olLive(r.pbpPressureAllowedRate,r.offensiveDriveGames||r.games),z.liveGrade.olIndex,t+' OL live');
    let {g,k}=H.blendInputs(z,'olIndex');upd(L.blend(z.prior.olIndex,z.liveGrade.olIndex,g,k),z.display.olIndex,t+' OL display');
    upd(L.partialResidual(r.recvEpa,r.qbAttemptEpa,beta,center),r.receiverResidualEpa,t+' WR residual');
    upd(wrPipeline(t,K80),z.liveGrade.receiverIndex,t+' WR live');
    ({g,k}=H.blendInputs(z,'receiverIndex'));upd(L.blend(z.prior.receiverIndex,z.liveGrade.receiverIndex,g,k),z.display.receiverIndex,t+' WR display');}
  rep.productionReproduction={teams:32,maxAbsResidual:maxRes,olLive:'continuousPercentileValue(2025 same-length window reference, team PBP hit-or-sack/dropback, lower better)',
    receiverLive:'partialResidual -> stabilizeToward(80 targets) -> environmentAlignToHistoricalCenter -> continuousPercentileValue(32 2025 team residuals)',wrBeta:beta,qbCenter:center,wrReferenceMedian:wrMedian,wrCurrentCenter:wrCenter};
  // 0d. Frozen Cycle 9 numbers reproduce at BASE (read-only comparison with the frozen results).
  const fz={dist:frozen('current_distributions.json'),bridge:frozen('bridge_effective_sensitivity.json'),md07:frozen('md07_interaction.json'),mid:frozen('midpoint_thresholds.json')};
  const pooled=T.reduce((s,t)=>s+Z[t].raw.pbpPassProtectionDisruptions,0)/T.reduce((s,t)=>s+Z[t].raw.pbpPassProtectionDropbacks,0);
  const delta=k=>T.map(t=>Z[t].display[k]-Z[t].prior[k]);
  const noStab=T.map(t=>wrPipeline(t,0));
  const cyc={olDisplayMean:[mean(T.map(t=>Z[t].display.olIndex)),fz.dist.units.olIndex.display.mean],olDisplaySd:[sd(T.map(t=>Z[t].display.olIndex)),fz.dist.units.olIndex.display.sd],
    olLiveMedian:[median(T.map(t=>Z[t].liveGrade.olIndex)),fz.dist.units.olIndex.live.median],olPooledRate:[pooled,0.16984559491371481],olPooledMapped:[olLive(pooled),37.679727422970636],
    olMeanBridgeDelta:[mean(delta('olIndex')),fz.bridge.units.find(u=>u.key==='olIndex').meanDelta],
    wrDisplayMean:[mean(T.map(t=>Z[t].display.receiverIndex)),fz.dist.units.receiverIndex.display.mean],wrDisplaySd:[sd(T.map(t=>Z[t].display.receiverIndex)),fz.dist.units.receiverIndex.display.sd],
    wrLiveSd:[sd(T.map(t=>Z[t].liveGrade.receiverIndex)),fz.md07.stabilizationVsMapping.receiverIndex.production.stats.sd],
    wrLiveSdWithoutStabilization:[sd(noStab),fz.md07.stabilizationVsMapping.receiverIndex.withoutStabilization.stats.sd],
    wrMedianReliability:[median(T.map(t=>Z[t].raw.receiverReliabilityWeight)),fz.md07.receiverReliabilityWeights.median],
    wrMeanBridgeDelta:[mean(delta('receiverIndex')),fz.bridge.units.find(u=>u.key==='receiverIndex').meanDelta]};
  for(const [k,[a,b]] of Object.entries(cyc))close(a,b,'Cycle 9 '+k,1e-9);
  const olSigns=delta('olIndex');assert.equal(olSigns.filter(v=>v>0).length,13);assert.equal(olSigns.filter(v=>v<0).length,19);
  rep.cycle9Reproduced={values:Object.fromEntries(Object.entries(cyc).map(([k,[a]])=>[k,a])),olDeltaSigns:{positive:13,negative:19},tolerance:1e-9,
    note:'Each value equals the frozen aa0ad397 result (read, not modified). OL and receiver formulas are unchanged since that revision; only the RB prior frame and the presentation seam differ, neither of which touches these two units.'};
  // 0e. Weekly 2026 caches agree with the Week-4 snapshot. Teams on a Week-4 bye must match exactly.
  const wk={};for(const r of ps26){if(r.season_type!=='REG'||!['WR','TE'].includes(String(r.position).toUpperCase()))continue;
    const t=H.canon(r.team),w=+r.week,o=((wk[t]=wk[t]||{})[w]=wk[t][w]||{targets:0,epa:0});o.targets+=+r.targets||0;o.epa+=+r.receiving_epa||0;}
  const byeTeams=T.filter(t=>Z[t].metadata.playerStatGames===3);
  for(const t of T){const z=Z[t].raw,w13={targets:[1,2,3].reduce((s,w)=>s+(wk[t][w]?.targets||0),0),epa:[1,2,3].reduce((s,w)=>s+(wk[t][w]?.epa||0),0)};
    wk[t][4]={targets:z.receiverRoomTargets-w13.targets,epa:z.recvEpa*z.receiverRoomTargets-w13.epa};assert(wk[t][4].targets>=0);
    if(byeTeams.includes(t)){assert.equal(wk[t][4].targets,0);close(wk[t][4].epa,0,t+' bye EPA',1e-9);delete wk[t][4];}}
  rep.weeklyCacheConsistency={weeks1to3:'data/live-cache player-stats (saved 2026-10-01); week 4 = Week-4 snapshot total minus weeks 1-3',byeTeams,byeTeamsExact:true};

  // ================= 1. OL drift =================
  const ol={};
  ol.construction={steps:[
    'Raw: per team-game PBP normal dropbacks (downs 1-4, pass attempt or sack, no spike/no-play); disruption = sack OR qb_hit, counted once (force_server.py).',
    'Team signal: disruptions/dropbacks pooled over the season to date (no opponent, run-block or context adjustment; no stabilization).',
    'Live grade: continuousPercentileValue against every 2025 rolling window of the same game count (all 32 teams, all start weeks; n=448 at 4 games), lower better. No centre alignment to the current league.',
    'Prior: bundled 2025 olIndex (legacy 32-team rank of a different pressure-allowed construct) regressed 30% toward 50.',
    'Display/model value: blend(prior, live, statGames, priorGames); the bridge reads it as delta = value - prior; presentation reads it through the identity seam.'],
    anchors:anchorLines()};
  // 1a. Season stage in 2025: league level by team game, and every 4-game start replayed through production.
  ol.season2025ByTeamGame=Array.from({length:17},(_,g)=>{const v=ORDER.map((_,t)=>W(OL,1,t,g));return {game:g+1,teamMean:mean(v),teamMedian:median(v),teamSd:sd(v)};});
  const replay=(len)=>Array.from({length:18-len},(_,s)=>{const v=ORDER.map((_,t)=>W(OL,len,t,s)),g=v.map(r=>olLive(r,len));
    return {startGame:s+1,games:`${s+1}-${s+len}`,teamMeanRate:mean(v),teamMedianRate:median(v),teamSdRate:sd(v),liveMean:mean(g),liveMedian:median(g),liveSd:sd(g)};});
  const rp4=replay(4),rp3=replay(3);
  const rng=a=>({min:Math.min(...a),max:Math.max(...a)});
  ol.season2025Replay={definition:'Each 2025 team window of the given length and start, mapped through the production OL live map for that length. Start 1 = the same season stage as the 2026 Week-4 snapshot.',
    fourGame:rp4,threeGame:rp3,fourGameRanges:{teamMeanRate:rng(rp4.map(r=>r.teamMeanRate)),liveMean:rng(rp4.map(r=>r.liveMean)),liveMedian:rng(rp4.map(r=>r.liveMedian)),teamSdRate:rng(rp4.map(r=>r.teamSdRate))},
    reference4:{n:ref4.length,mean:mean(ref4),median:median(ref4),sd:sd(ref4),mappedGradeOfReferenceMean:olLive(mean(ref4))}};
  // 1b. 2026 versus 2025 at the same stage, two providers.
  const cur=T.map(t=>Z[t].raw.pbpPressureAllowedRate),cur4=T.filter(t=>(Z[t].raw.offensiveDriveGames||Z[t].raw.games)===4).map(t=>Z[t].raw.pbpPressureAllowedRate);
  const early25=ORDER.map((_,t)=>W(OL,4,t,0));
  const R=H.rng(20261006),boots=[];for(let b=0;b<10000;b++){const s1=Array.from({length:32},()=>cur[Math.floor(R.u()*32)]),s0=Array.from({length:32},()=>early25[Math.floor(R.u()*32)]);boots.push(mean(s1)-mean(s0));}
  boots.sort((p,q)=>p-q);
  const pfrRate=(gs,f)=>{const s=gs.filter(f),db=s.reduce((a,g)=>a+g.dropbacks,0),team={};for(const g of s){const o=team[g.team]=team[g.team]||{sh:0,s:0,p:0,db:0};o.sh+=g.sacked+g.hit;o.s+=g.sacked;o.p+=g.pressured;o.db+=g.dropbacks;}
    const tv=Object.values(team);return {teamGames:s.length,pooledSackOrHitPerDropback:s.reduce((a,g)=>a+g.sacked+g.hit,0)/db,pooledSackPerDropback:s.reduce((a,g)=>a+g.sacked,0)/db,pooledPressurePerDropback:s.reduce((a,g)=>a+g.pressured,0)/db,
      teamSdSackOrHit:sd(tv.map(o=>o.sh/o.db)),teamSdSack:sd(tv.map(o=>o.s/o.db)),teamSdPressure:sd(tv.map(o=>o.p/o.db)),rowsWithoutDerivableDropbacks:s.reduce((a,g)=>a+g.rowsWithoutDropbacks,0)};};
  const pfr={y2025w1to3:pfrRate(g25,g=>g.week<=3),y2025w1to4:pfrRate(g25,g=>g.week<=4),y2025all:pfrRate(g25,()=>true),y2026w1to3:pfrRate(g26,g=>g.week<=3)};
  const pfrTeam26={};for(const g of g26){const o=pfrTeam26[g.team]=pfrTeam26[g.team]||{sh:0,db:0};o.sh+=g.sacked+g.hit;o.db+=g.dropbacks;}
  ol.levelVs2025={
    pbp:{y2025games1to4:{teamMean:mean(early25),teamMedian:median(early25)},y2026week4:{teamMean:mean(cur),teamMedian:median(cur),pooled,teamMeanFourGameTeamsOnly:mean(cur4)},
      differenceTeamMean:mean(cur)-mean(early25),bootstrap95:[quantile(boots,.025),quantile(boots,.975)],bootstrapShareAtOrBelowZero:boots.filter(v=>v<=0).length/boots.length,
      bootstrapDefinition:'Independent resampling of the 32 team rates in each season, 10,000 draws, seed 20261006. Sampling uncertainty of one season stage only; no year-to-year variance is available.',
      within2025RangeOfFourGameLeagueMeans:rng(rp4.map(r=>r.teamMeanRate))},
    pfrIndependentProvider:pfr,
    pfrDifferences2026minus2025weeks1to3:{sackOrHit:pfr.y2026w1to3.pooledSackOrHitPerDropback-pfr.y2025w1to3.pooledSackOrHitPerDropback,sackOnly:pfr.y2026w1to3.pooledSackPerDropback-pfr.y2025w1to3.pooledSackPerDropback,pressure:pfr.y2026w1to3.pooledPressurePerDropback-pfr.y2025w1to3.pooledPressurePerDropback},
    crossProviderAgreement2026:{pbpWeek4VsPfrWeeks1to3:correlation(cur,T.map(t=>pfrTeam26[t].sh/pfrTeam26[t].db))},
    pfrDropbackNote:'PFR dropbacks are derived per QB row as times_pressured / times_pressured_pct; rows with zero pressures cannot be sized and are excluded (count reported).'};
  // 1c. Spread: is the 2026 between-team dispersion larger than sampling noise?
  const db=T.map(t=>Z[t].raw.pbpPassProtectionDropbacks),pBar=pooled;
  const binomSd=Math.sqrt(mean(db.map(n=>pBar*(1-pBar)/n)));
  const sd2025start=rp4.map(r=>r.teamSdRate);
  ol.spreadVs2025={y2026teamSd:sd(cur),y2025fourGameTeamSdByStart:rng(sd2025start),y2025start1TeamSd:rp4[0].teamSdRate,
    binomialSamplingSdAt2026Dropbacks:binomSd,y2026varianceInExcessOfBinomial:varS(cur)-binomSd**2,
    y2025start1VarianceInExcessOfBinomial:varS(early25)-binomSd**2,
    varianceRatio2026over2025start1:varS(cur)/varS(early25),
    pfrTeamSdSackOrHit:{y2025w1to3:pfr.y2025w1to3.teamSdSackOrHit,y2026w1to3:pfr.y2026w1to3.teamSdSackOrHit},
    note:'Binomial SD uses the pooled 2026 rate and each team\'s 2026 dropbacks; it is the dispersion expected if every team had the same true rate.'};
  // 1d. Reliability and persistence (2025 per-game windows; 2025 -> 2026 via slot identity).
  const halves=m=>{const o=ORDER.map((_,t)=>mean(Array.from({length:9},(_,i)=>W(m,1,t,2*i)))),e=ORDER.map((_,t)=>mean(Array.from({length:8},(_,i)=>W(m,1,t,2*i+1))));const c=correlation(o,e);
    const r1=c.pearson/(8.5-7.5*c.pearson);return {oddVsEvenGames:c,perGameReliability:r1,reliabilityAt4Games:4*r1/(1+3*r1),reliabilityAt17Games:17*r1/(1+16*r1)};};
  const s17=Object.fromEntries(ORDER.map((tm,t)=>[tm,W(OL,17,t,0)]));
  ol.reliabilityAndPersistence={ol:halves(OL),qbEpaPerPlay:halves('qb_epa_per_play'),qbPassSuccess:halves('qb_pass_success_rate'),
    olFirst4VsGames5to17:correlation(ORDER.map((_,t)=>W(OL,4,t,0)),ORDER.map((_,t)=>mean(Array.from({length:13},(_,i)=>W(OL,1,t,i+4))))),
    olSeason2025VsWeek4of2026:correlation(T.map(t=>s17[t]),cur),
    priorConstruct:{bundledOlIndexVsPbpSeason2025:correlation(T.map(t=>P[t].olIndex),T.map(t=>s17[t])),olPriorVs2026Live:correlation(T.map(t=>Z[t].prior.olIndex),T.map(t=>Z[t].liveGrade.olIndex))},
    method:'Split-half = mean of 1-game rates over odd vs even 2025 team games (unweighted by dropbacks), stepped to k games with Spearman-Brown from 8.5 games. Pearson on 32 teams; descriptive.'};
  // 1e. Mechanism: where does the negative OL channel mean come from?
  const liveNow=T.map(t=>Z[t].liveGrade.olIndex),shift=mean(cur)-mean(early25);
  const liveShifted=T.map(t=>olLive(Z[t].raw.pbpPressureAllowedRate-shift,Z[t].raw.offensiveDriveGames||Z[t].raw.games));
  const lw=T.map(t=>{const {g,k}=H.blendInputs(Z[t],'olIndex');return g/(g+k);});
  ol.meanDeltaDecomposition={meanBridgeDelta:mean(delta('olIndex')),meanDisplay:mean(T.map(t=>Z[t].display.olIndex)),meanPrior:mean(T.map(t=>Z[t].prior.olIndex)),
    meanLive:mean(liveNow),meanLiveWeight:mean(lw),identity:'delta = w*(live - prior) per team; mean prior is 50 by construction, so a mean live grade below 50 yields a negative channel mean.',
    counterfactualLevelMatchedTo2025Start:{shiftRemoved:shift,meanLive:mean(liveShifted),medianLive:median(liveShifted),meanDelta:mean(T.map((t,i)=>lw[i]*(liveShifted[i]-Z[t].prior.olIndex))),
      positiveDeltaTeams:T.filter((t,i)=>lw[i]*(liveShifted[i]-Z[t].prior.olIndex)>0).length},
    replay2025Start1:{meanLive:rp4[0].liveMean,medianLive:rp4[0].liveMedian},
    pooledVersusTeamMeanFrame:{pooledRateGrade:olLive(pooled),teamMeanRateGrade:olLive(mean(cur)),y2025start1TeamMeanRateGrade:olLive(mean(early25)),referenceMeanGrade:olLive(mean(ref4)),
      note:'The reference CDF is right-skewed in the rate, so a league-average rate maps below 50 even in 2025 (reference mean maps to ~47). The Cycle 9 pooled-rate frame therefore overstates the gap by about 3 points; the like-for-like 2025 start-1 team-mean maps to ~48.'}};
  // 1f. Synthetic probes (seeded).
  const S=H.rng(808),reps=2000;
  const probe=(truth,label)=>{const sds=[],means=[],medians=[],gsd=[];for(let i=0;i<reps;i++){const rates=T.map((t,j)=>S.binomial(db[j],truth[j])/db[j]);const g=rates.map((r,j)=>olLive(r,Z[T[j]].raw.offensiveDriveGames||Z[T[j]].raw.games));sds.push(sd(rates));gsd.push(sd(g));means.push(mean(g));medians.push(median(g));}
    sds.sort((a,b)=>a-b);gsd.sort((a,b)=>a-b);return {label,replications:reps,rateSd:{p05:quantile(sds,.05),p50:quantile(sds,.5),p95:quantile(sds,.95)},shareRateSdAtOrBelowObserved:sds.filter(v=>v<=sd(cur)).length/reps,
      liveSd:{p05:quantile(gsd,.05),p50:quantile(gsd,.5),p95:quantile(gsd,.95)},liveMean:median(means),liveMedian:median(medians)};};
  const s17v=ORDER.map((_,t)=>W(OL,17,t,0)),s17m=mean(s17v);
  ol.syntheticProbes={
    noTrueDifferences:probe(T.map(()=>mean(cur)),'Every team true rate = 2026 team mean; binomial dropbacks as observed in 2026'),
    truth2025SeasonSpreadAt2026Level:probe(T.map((t)=>s17[t]-s17m+mean(cur)),'True rates = each team\'s 2025 17-game rate, re-centred on the 2026 team mean'),
    truth2025SeasonSpreadAt2025Level:probe(T.map((t)=>s17[t]-s17m+mean(early25)),'True rates = 2025 17-game rates re-centred on the 2025 games 1-4 team mean'),
    levelSensitivity:[-.02,-.015,-.01,-.005,0,.005,.01,.015,.02].map(d=>{const g=T.map(t=>olLive(Z[t].raw.pbpPressureAllowedRate+d,Z[t].raw.offensiveDriveGames||Z[t].raw.games));return {addedRate:d,meanLive:mean(g),medianLive:median(g)};}),
    note:'Probes are diagnostics of mechanism only. They hold the 2026 dropback counts fixed and treat every play as an independent Bernoulli trial.'};
  // 1g. Comparable units: 2025 within-season level ranges of the reference-mapped QB signals.
  ol.comparableUnits={qbEpaPerPlayFourGameLeagueMeans:rng(Array.from({length:14},(_,s)=>mean(ORDER.map((_,t)=>W('qb_epa_per_play',4,t,s))))),
    qbPassSuccessFourGameLeagueMeans:rng(Array.from({length:14},(_,s)=>mean(ORDER.map((_,t)=>W('qb_pass_success_rate',4,t,s))))),
    exposure:[
      {unit:'OL',levelExposed:true,why:'Raw rate mapped to 2025 windows with no centre alignment; a league-wide shift moves every grade.'},
      {unit:'Pass rush (4 PFR teams)',levelExposed:true,why:'PFR teams map to 2025 charted windows without centre alignment; weekly-fallback teams are current-rank and not exposed.'},
      {unit:'QB EPA/success components',levelExposed:'partly',why:'Stabilized toward the current league mean before the 2025 17-game CDF; this absorbs part of a league-wide level shift early in the season but does not re-centre the league exactly. Not quantified in this tranche.'},
      {unit:'Receivers, RB',levelExposed:false,why:'Current weighted centre aligned onto the 2025 reference median by construction.'},
      {unit:'Scoring, coverage, run defense, prevention, weekly pass rush, ANY/A',levelExposed:false,why:'Current-season ranks.'}],
    mirror:'The same hit/sack events that lower OL grades raise defensive disruption, but the weekly pass-rush grade is a current rank, so a league-wide rise is charged to offenses (OL mean delta -7.69) with no offsetting league-wide credit to defenses (pass-rush mean delta -0.44 in Cycle 9).'};

  // ================= 2. Receiver stabilization =================
  const wr={};
  wr.construction={steps:[
    'Raw: WR/TE receiving EPA per target from nflverse weekly player stats (positions WR, TE).',
    `QB coupling: residual = EPA/target - beta*(sack-free QB attempt EPA - centre), beta ${beta.toFixed(4)} ridge-fitted on 2025 bundled teams, centre ${center} (2025 median QB pass EPA).`,
    'Stabilization: stabilizeToward(residual, current target-weighted league residual, targets, 80); reliability weight = targets/(targets+80).',
    'Centre alignment: value - current centre + 2025 reference median, so the current league centre maps to live 50 exactly by construction.',
    'Live grade: continuousPercentileValue against the 32 2025 full-season team residuals (unstabilized, ~328 targets each).',
    'Prior: 2025 residual percentile regressed 30%; display/model value = blend(prior, live, playerStatGames, priorGames).'],anchors:anchorLines()['model/live_profiles.js']};
  // 2a. Weekly noise and between-team signal, 2026 weeks 1-4.
  const weekly=T.map(t=>Object.entries(wk[t]).filter(([,o])=>o.targets>0).map(([w,o])=>({week:+w,targets:o.targets,epa:o.epa/o.targets})));
  const sigma2=(()=>{let num=0,df=0;for(const obs of weekly){const N=obs.reduce((s,o)=>s+o.targets,0),m=obs.reduce((s,o)=>s+o.targets*o.epa,0)/N;num+=obs.reduce((s,o)=>s+o.targets*(o.epa-m)**2,0);df+=obs.length-1;}return {value:num/df,df};})();
  const rawE=T.map(t=>Z[t].raw.recvEpa),tg=T.map(t=>Z[t].raw.receiverRoomTargets),resE=T.map(t=>Z[t].raw.receiverResidualEpa);
  const noiseRaw=mean(tg.map(n=>sigma2.value/n));
  // Residual noise under an equal-per-play-variance overlap model: the QB attempt EPA
  // contains the same WR/TE targets, so var(y - b q) = s2*(1/n + (b^2-2b)/N).
  const att=T.map(t=>Z[t].raw.qbAttemptPassAttempts);
  const noiseRes=mean(T.map((t,i)=>sigma2.value*(1/tg[i]+(beta*beta-2*beta)/att[i])));
  const splitHalf=(f)=>{const a=T.map(t=>f(wk[t],[1,3])),b=T.map(t=>f(wk[t],[2,4]));return correlation(a,b);};
  const epaOver=(o,ws)=>{const s=ws.map(w=>o[w]).filter(Boolean);const n=s.reduce((a,v)=>a+v.targets,0);return n?s.reduce((a,v)=>a+v.epa,0)/n:NaN;};
  const sh=splitHalf(epaOver);
  wr.noiseAndSignal={sigma2PerTargetFromWeeklyVariation:sigma2,
    raw:{betweenTeamVariance:varS(rawE),expectedNoiseVariance:noiseRaw,impliedTrueVariance:varS(rawE)-noiseRaw,impliedReliability:(varS(rawE)-noiseRaw)/varS(rawE),impliedStabilizerTargets:sigma2.value/(varS(rawE)-noiseRaw)},
    residual:{betweenTeamVariance:varS(resE),expectedNoiseVarianceOverlapModel:noiseRes,impliedTrueVariance:varS(resE)-noiseRes,
      note:'Implied true variance at or below zero means the Week-4 residual dispersion is not distinguishable from modelled sampling noise. The overlap model assumes equal per-play EPA variance for all attempts and is an approximation.'},
    rawSplitHalfWeeks1and3vs2and4:{...sh,reliabilityAtFourWeeks:2*sh.pearson/(1+sh.pearson)},
    caveat:'sigma2 is estimated from week-to-week variation within each team (94 df), which also contains genuine weekly variation (opponent, game script); it is an upper bound on pure sampling noise. 2026 weekly residuals cannot be formed because sack-free weekly QB attempt EPA is not in the cached weekly feeds.'};
  // 2b. Coupling with QB and with volume, Week 4.
  const wrLive=T.map(t=>Z[t].liveGrade.receiverIndex),wrDisp=T.map(t=>Z[t].display.receiverIndex);
  wr.coupling={rawEpaVsQbAttemptEpa:correlation(rawE,T.map(t=>Z[t].raw.qbAttemptEpa)),residualVsQbAttemptEpa:correlation(resE,T.map(t=>Z[t].raw.qbAttemptEpa)),
    receiverLiveVsQbLive:correlation(wrLive,T.map(t=>Z[t].liveGrade.qbIndex)),receiverDisplayVsQbDisplay:correlation(wrDisp,T.map(t=>Z[t].display.qbIndex)),
    y2025ResidualVsQbPassEpa:correlation(vals.map(p=>L.priorReceiverResidual(p,beta,center)),vals.map(p=>L.priorQbPassEpa(p))),
    y2025RawVsQbPassEpa:correlation(vals.map(p=>L.priorReceiverWrteEpa(p)),vals.map(p=>L.priorQbPassEpa(p))),
    rawToResidualSdRatio2026:sd(resE)/sd(rawE)};
  wr.volume={targetsVsLive:correlation(tg,wrLive),targetsVsAbsLiveMinus50:correlation(tg,wrLive.map(v=>Math.abs(v-50))),targetsVsResidual:correlation(tg,resE),
    reliabilityWeight:brief(T.map(t=>Z[t].raw.receiverReliabilityWeight)),targets:brief(tg)};
  // 2c. Diagnostic alternatives at Week 4 (research space only).
  const alt=(label,vals2)=>({label,...shape(vals2),spearmanWithProduction:correlation(vals2,wrLive).spearman});
  const Ks=[0,40,80,120,200,320];
  wr.week4Alternatives={stabilizerSweep:Ks.map(K=>alt('K='+K+' targets',T.map(t=>wrPipeline(t,K)))),
    currentRankOfProductionValue:alt('current-season rank of the production calibrated residual',Object.values(L.percentileMap(Object.fromEntries(T.map(t=>[t,Z[t].raw.receiverCalibratedResidual])),true))),
    note:'Diagnostics only. None is proposed. Rank preservation across K is reported because stabilization weights differ by team target counts.'};
  // 2d. Synthetic probe: if 2026 receiver quality were exactly the 2025 reference, what
  // would the production pipeline show at Week 4 and later?
  const S2=H.rng(4242),r2025n=vals.map(p=>Number(p.receivers?.targets)).filter(Number.isFinite);
  const truthPct=wrRef.map(v=>L.continuousPercentileValue(wrRef,v,true)),refMean=mean(wrRef),refVar=varS(wrRef);
  // Truth variants: the observed 2025 reference (an upper bound on true spread, since each
  // value carries full-season noise), and the reference deconvolved for that noise.
  const deconvolved=noiseVar=>{const f=Math.sqrt(Math.max(0,refVar-noiseVar/mean(r2025n))/refVar);return {factor:f,values:wrRef.map(v=>refMean+f*(v-refMean))};};
  let wrTruth=wrRef;
  const simulate=(scale,K,noiseVar,label)=>{const out={sd:[],mean:[],ge70:[],span:[],spear:[],mae:[]};
    for(let i=0;i<reps;i++){const n=tg.map(v=>v*scale),obs=wrTruth.map((v,j)=>v+S2.normal()*Math.sqrt(noiseVar/n[j]));
      const c=obs.reduce((s,v,j)=>s+v*n[j],0)/n.reduce((a,b)=>a+b,0);
      const g=obs.map((v,j)=>L.continuousPercentileValue(wrRef,L.environmentAlignToHistoricalCenter(L.stabilizeToward(v,c,n[j],K),c,wrMedian),true));
      out.sd.push(sd(g));out.mean.push(mean(g));out.ge70.push(g.filter(v=>v>=70).length);out.span.push(span615(g));out.spear.push(correlation(g,truthPct).spearman);out.mae.push(mean(g.map((v,j)=>Math.abs(v-truthPct[j]))));}
    const m=a=>median(a);return {label,targetScale:scale,stabilizerTargets:K,noiseVariancePerTarget:noiseVar,liveSd:m(out.sd),liveMean:m(out.mean),teamsAtOrAbove70:m(out.ge70),ranks6to15Span:m(out.span),spearmanWithTruth:m(out.spear),meanAbsErrorVsTruthPercentile:m(out.mae)};};
  const noiseLevels={upper:sigma2.value,overlapModel:sigma2.value*mean(T.map((t,i)=>tg[i]*(1/tg[i]+(beta*beta-2*beta)/att[i])))};
  const truthSets={observedReference:{factor:1,values:wrRef},deconvolvedOverlapNoise:deconvolved(noiseLevels.overlapModel),deconvolvedUpperNoise:deconvolved(noiseLevels.upper)};
  const runs={};
  for(const [name,set] of Object.entries(truthSets)){wrTruth=set.values;
    runs[name]={spreadFactor:set.factor,truthSd:sd(set.values),
      week4:[0,80,320].map(K=>simulate(1,K,name==='deconvolvedUpperNoise'?noiseLevels.upper:noiseLevels.overlapModel,`K=${K}`)),
      bySeasonStage:[1,2,3,4.25].map(s=>simulate(s,80,name==='deconvolvedUpperNoise'?noiseLevels.upper:noiseLevels.overlapModel,`production K=80 at ${Math.round(4*s)} games`))};}
  wr.syntheticProbe={design:'32 synthetic rooms whose true residuals are a truth set below; each keeps a 2026 Week-4 target count (paired in fixed order) scaled by season stage; observed = truth + normal noise of variance noise/targets; then the production stabilize -> align -> 2025 CDF path. Truth percentile = rank percentile of the truth value in the 2025 reference (ordering is identical across truth sets).',
    replications:reps,noiseLevels,referenceTargetsMean:mean(r2025n),observedWeek4:{liveSd:sd(wrLive),teamsAtOrAbove70:wrLive.filter(v=>v>=70).length,ranks6to15Span:span615(wrLive)},runs,
    note:'Observed and deconvolved truth sets bracket plausible true spread. Results describe mechanism under stated noise assumptions only.'};
  // 2e. Mean delta decomposition.
  const lwr=T.map(t=>{const {g,k}=H.blendInputs(Z[t],'receiverIndex');return g/(g+k);});
  wr.meanDeltaDecomposition={meanBridgeDelta:mean(delta('receiverIndex')),meanLive:mean(wrLive),medianLive:median(wrLive),meanPrior:mean(T.map(t=>Z[t].prior.receiverIndex)),meanLiveWeight:mean(lwr),
    liveSkew:{mean:mean(wrLive),median:median(wrLive),p10:quantile(wrLive,.1),p90:quantile(wrLive,.9)},
    note:'The current centre maps to 50 exactly, but the stabilized values are skewed (long lower tail), so the mean live grade is below 50 while the median is above it. The negative channel mean is a shape effect, not a level drift.'};

  // ================= 3. Cross-unit synthesis inputs =================
  const qbWindowDrift=frozen('cross_season.json');
  const X={
    olLevelGapExplainedByStage:{replayStart1MeanLive:rp4[0].liveMean,productionMeanLive:mean(liveNow),levelMatchedMeanLive:mean(liveShifted)},
    receiverWeek4ProductionUnderTruthSets:Object.fromEntries(Object.entries(wr.syntheticProbe.runs).map(([k,v])=>[k,v.week4.find(r=>r.stabilizerTargets===80)])),
    stationarity:{olLiveMeanAcross2025Starts:rng(rp4.map(r=>r.liveMean)),olLiveSdAcross2025Starts:rng(rp4.map(r=>r.liveSd)),
      receiverLiveSdBySeasonStage:Object.fromEntries(Object.entries(wr.syntheticProbe.runs).map(([k,v])=>[k,v.bySeasonStage.map(r=>({games:Math.round(4*r.targetScale),liveSd:r.liveSd,teamsAtOrAbove70:r.teamsAtOrAbove70,spearmanWithTruth:r.spearmanWithTruth}))])),
      qbEpaWindowDriftFromCycle9:qbWindowDrift.withinSeasonSampleSizeDrift},
    rankPreservation:{receiverKSweepMinSpearman:Math.min(...wr.week4Alternatives.stabilizerSweep.map(r=>r.spearmanWithProduction))}};
  // ================= 4. Final-grade sensitivity (correction after Codex review C) =================
  // The presentation seam consumes the FINAL grade: live grade -> production blend with the
  // team's own prior -> unitDisplayGrade (identity). OL and receivers have no post-blend
  // recency or clamp, so this is the complete remaining production path after the live grade
  // (it reproduces every displayed value with residual 0, section 0c).
  const finalOf=(key,t,live,prior=Z[t].prior[key])=>{const {g,k}=H.blendInputs(Z[t],key);return seam.unitDisplayGrade({[key]:L.blend(prior,live,g,k)},key);};
  for(const t of T)for(const key of ['olIndex','receiverIndex'])close(finalOf(key,t,Z[t].liveGrade[key]),Z[t].display[key],t+' '+key+' final via seam',1e-12);
  // Tie convention: exact numeric equality defines a tie; tied teams share the average
  // (mid) rank, descending (1 = highest): rank = 1 + #greater + (#equal - 1)/2.
  const ordinal=v=>v.map(x=>1+v.filter(y=>y>x).length+(v.filter(y=>y===x).length-1)/2);
  const tiedGroups=v=>{const c={};v.forEach((x,i)=>(c[x]=c[x]||[]).push(T[i]));return Object.values(c).filter(a=>a.length>1);};
  const compare=(base,alt)=>{const rb=ordinal(base),ra=ordinal(alt),mv=rb.map((r,i)=>Math.abs(r-ra[i]));let conc=0,disc=0,tieBase=0,tieAlt=0,tieBoth=0;
    for(let i=0;i<base.length;i++)for(let j=i+1;j<base.length;j++){const a=Math.sign(base[i]-base[j]),b=Math.sign(alt[i]-alt[j]);
      if(a===0&&b===0)tieBoth++;else if(a===0)tieBase++;else if(b===0)tieAlt++;else if(a===b)conc++;else disc++;}
    const n0=base.length*(base.length-1)/2,n1=tieBase+tieBoth,n2=tieAlt+tieBoth;
    const top=(r,n)=>T.filter((t,i)=>r[i]<=n),diff=(n)=>{const a=top(rb,n),b=top(ra,n);return {left:a.filter(t=>!b.includes(t)),entered:b.filter(t=>!a.includes(t))};};
    const moves=T.map((t,i)=>({team:t,from:rb[i],to:ra[i]})).filter(m=>m.from!==m.to).sort((p,q)=>Math.abs(q.to-q.from)-Math.abs(p.to-p.from)||p.team.localeCompare(q.team));
    return {spearman:correlation(base,alt).spearman,kendallTauB:(conc-disc)/Math.sqrt((n0-n1)*(n0-n2)),pairs:{total:n0,concordant:conc,discordant:disc,tiedInBaseOnly:tieBase,tiedInAlternativeOnly:tieAlt,tiedInBoth:tieBoth},
      tiedGroups:{base:tiedGroups(base),alternative:tiedGroups(alt)},teamsMoving:moves.length,maxAbsMove:Math.max(...mv),meanAbsMove:mean(mv),medianAbsMove:median(mv),
      pairReversals:disc,top5:diff(5),top10:diff(10),largestMoves:moves.slice(0,5)};};
  const wrFinal=K=>T.map(t=>finalOf('receiverIndex',t,wrPipeline(t,K))),wrLiveK=K=>T.map(t=>wrPipeline(t,K));
  const olLiveCf=T.map((t,i)=>liveShifted[i]),olFinalCf=T.map((t,i)=>finalOf('olIndex',t,olLiveCf[i]));
  const wrFinalProd=wrFinal(80),olFinalProd=T.map(t=>Z[t].display.olIndex);
  const eqPrior=(key,lives)=>T.map((t,i)=>finalOf(key,t,lives[i],50));
  const counterfactuals=[
    ...[40,120,200,320].map(K=>({id:`receiver K 80 -> ${K}`,unit:'receiverIndex',
      live:compare(wrLiveK(80),wrLiveK(K)),final:compare(wrFinalProd,wrFinal(K)),
      finalWithEqualPriorsControl:compare(eqPrior('receiverIndex',wrLiveK(80)),eqPrior('receiverIndex',wrLiveK(K))),
      spread:{liveSdProduction:sd(wrLiveK(80)),liveSdAlternative:sd(wrLiveK(K)),priorSd:sd(T.map(t=>Z[t].prior.receiverIndex))}})),
    {id:'OL production -> exact measured-level-matched (rate - .0107)',unit:'olIndex',
      live:compare(T.map(t=>Z[t].liveGrade.olIndex),olLiveCf),final:compare(olFinalProd,olFinalCf),
      finalWithEqualPriorsControl:compare(eqPrior('olIndex',T.map(t=>Z[t].liveGrade.olIndex)),eqPrior('olIndex',olLiveCf)),
      spread:{liveSdProduction:sd(T.map(t=>Z[t].liveGrade.olIndex)),liveSdAlternative:sd(olLiveCf),priorSd:sd(T.map(t=>Z[t].prior.olIndex))},
      rawRateAdjustment:'Uniform: every team raw disruption rate minus the measured league difference (identical for all teams) before the production CDF map.',
      liveGradeChange:(()=>{const d=T.map((t,i)=>olLiveCf[i]-Z[t].liveGrade.olIndex);return {min:Math.min(...d),max:Math.max(...d),mean:mean(d),sd:sd(d),note:'The same raw-rate adjustment produces team-specific live-grade changes because the 2025 window CDF is nonlinear; in this counterfactual no live rank changed.'};})()}];
  const finalSens={path:'live grade (counterfactual) -> L.blend(team prior, live, games, priorGames) -> FORCE_UNIT_PRESENTATION_TEST_HOOKS.unitDisplayGrade (identity, asserted). Production values reproduce exactly through this path.',
    rankConvention:'Ranks are descending average (mid) ranks: rank = 1 + #teams with a strictly higher grade + (#teams with an exactly equal grade - 1)/2, so tied teams share a rank. A team moves when its midrank changes; moves are absolute midrank differences. Spearman is Pearson on these midranks. Kendall is tau-b over all 496 pairs: (concordant - discordant)/sqrt((496 - pairs tied in base)(496 - pairs tied in alternative)). Pair reversals = discordant pairs (strictly opposite order); pairs tied in either vector are neither concordant nor reversed and are counted separately. Ties are exact numeric equality. The only tie in any compared vector is the OL live grade of DAL and MIA (identical raw rate and game count), which stays tied in the level-matched counterfactual; no final-grade vector has a tie, so final-layer tau-b equals tau-a.',
    counterfactuals,
    mechanism:'A counterfactual live grade (for OL: a uniform shift of the raw disruption rate, which the nonlinear 2025 CDF map turns into team-specific live-grade changes) is blended with unequal team priors with weight w=g/(g+k) (median .82). Teams whose live grades move by different amounts relative to their prior gaps cross. The equal-priors control (every prior set to 50) shows how much of the final-order change disappears when priors are equal.',
    monotoneTransformInvariance:'For any strictly increasing, unrounded presentation transform f (no rounding, bucketing, clipping or other step that can create ties), ordering of f(final) equals ordering of final. The rank statistics above are therefore identical for every monotone presentation candidate (rank/percentile, standardized, normal-score, identity); presentation candidates differ only in spacing.'};
  // Codex review C reproduced values (independent reproduction gate).
  const cx=id=>counterfactuals.find(c=>c.id.startsWith(id)).final;
  close(cx('receiver K 80 -> 40').spearman,.980572,'Codex K40 spearman',5e-7);assert.deepEqual([cx('receiver K 80 -> 40').teamsMoving,cx('receiver K 80 -> 40').maxAbsMove,cx('receiver K 80 -> 40').pairReversals],[19,6,20]);
  close(cx('receiver K 80 -> 320').spearman,.962977,'Codex K320 spearman',5e-7);assert.deepEqual([cx('receiver K 80 -> 320').teamsMoving,cx('receiver K 80 -> 320').maxAbsMove,cx('receiver K 80 -> 320').pairReversals],[21,7,33]);
  close(cx('OL production').spearman,.990469,'Codex OL spearman',5e-7);assert.deepEqual([cx('OL production').teamsMoving,cx('OL production').maxAbsMove,cx('OL production').pairReversals],[18,3,15]);
  finalSens.codexReviewCReproduced={receiverK40:{spearman:.980572,teamsMoving:19,maxMove:6,pairReversals:20},receiverK320:{spearman:.962977,teamsMoving:21,maxMove:7,pairReversals:33},olLevelMatched:{spearman:.990469,teamsMoving:18,maxMove:3,pairReversals:15},reproduced:true};
  // Correction 4: receiver residual noise conclusion conditional on the noise estimate.
  wr.noiseAndSignal.residual.sensitivityToNoiseScale=[1,.95,.9,.85,.8,.7].map(f=>{const n=noiseRes*f,tv=varS(resE)-n;return {noiseScale:f,impliedTrueVariance:tv,impliedReliability:tv/varS(resE)};});
  wr.noiseAndSignal.residual.note='Under the stated overlap model with the upper-bound sigma2, implied true residual variance is slightly negative, i.e. Week-4 residual dispersion is compatible with the modelled noise level and not clearly distinguishable from it under these assumptions. The estimate is sensitive: a 10% smaller noise variance implies reliability of about .06. This does not show that there is no between-team receiver signal.';
  X.rankPreservation={liveLayerReceiverKSweepMinSpearman:X.rankPreservation.receiverKSweepMinSpearman,finalLayer:Object.fromEntries(counterfactuals.map(c=>[c.id,{spearman:c.final.spearman,teamsMoving:c.final.teamsMoving,maxAbsMove:c.final.maxAbsMove,pairReversals:c.final.pairReversals}])),
    note:'Live-layer order is nearly invariant to K; final-grade order (the presentation input) is not, because of blending with unequal team priors.'};
  return {reproduction:rep,ol,wr,cross:X,finalSens};
}

export function serialize(a){
  return {'reproduction.json':H.json(a.reproduction),'ol_drift.json':H.json(a.ol),'receiver_stabilization.json':H.json(a.wr),'cross_unit.json':H.json(a.cross),'final_grade_sensitivity.json':H.json(a.finalSens)};
}

if(import.meta.url===`file://${process.argv[1].replace(/\\/g,'/')}`||process.argv[1]?.endsWith('analyze.mjs')){
  const dir=process.argv[2];
  const out=serialize(analyze());
  if(dir){const fs=await import('node:fs');fs.mkdirSync(dir,{recursive:true});for(const [f,s] of Object.entries(out))fs.writeFileSync(dir+'/'+f,s);console.log('wrote',Object.keys(out).join(', '),'to',dir);}
  else console.log(Object.fromEntries(Object.entries(out).map(([f,s])=>[f,s.length])));
}
