// MD-08 historical-standing display prototype (evidence only). Research only:
// no production code, formula, prior, stabilizer, weight, grade or presentation behavior
// changes. The identity presentation seam is untouched and asserted to be the identity.
import assert from 'node:assert/strict';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as Z0 from '../md08_unit_normalization/lib.mjs';
import * as X from './transforms.mjs';

export const DIR='research/cycle9/md08_historical_standing_prototype';
export const START='4818619cb48b928f187929a75013f575ced5185d';
export const UNIT_GAMES='research/cycle7/fixtures/unit_games.csv';
export const PINS={
  [UNIT_GAMES]:'e5012000c97773e4837dbeebfd675be2ffe1cd37daa1e0bf83abe1a5f10b6828',
  'research/cycle7/inputs.json':'3a4e84e86ec40e5ba95c1ff6393768896729bdf0b3a2743d67af60fcfd62e9bd',
  'research/cycle7/extract.py':'9e8847f347a7784452950e674ff43de3267e16f0014a9aba7fa327b63fea6c31',
  [Z0.DIR+'/results/current_unit_values.csv']:'f4ea94a81dc95e853e08003681828ebe3d71ab49dc9fe575ecd5f55d33a6fc92',
  'research/cycle9/md08_followup_ol_receivers/hashes.json':'d73c354b6b4d2846b5ceea356d639949ad17cb63f1eed2e3b7e14939b22cdcdf',
  [DIR+'/transforms.mjs']:null // pinned through hashes.json, not here
};
const {mean,sd,median,quantile,correlation,close}=F;
const YEARS=[2024,2025];

export function analyze({pins=PINS,refOverride=null,swapUnit={},stageOverride={},flip={}}={}){
  for(const [p,h] of Object.entries(pins))if(h!==null)assert.equal(F.hash(F.lf(p)),h,p+' pin');
  // The accepted follow-up package must be intact (its own checksum list).
  const fh=JSON.parse(F.lf('research/cycle9/md08_followup_ol_receivers/hashes.json'));
  for(const [f,h] of Object.entries(fh))assert.equal(F.hash(F.lf('research/cycle9/md08_followup_ol_receivers/'+f)),h,'follow-up '+f);
  const {x,L,M,D,reference,seam}=F.load();
  assert(seam.isIdentity(),'production presentation seam is the identity');
  const Zt=x.teams,T=Object.keys(Zt).sort(),P=M.profiles,vals=Object.values(P),rev=D.config.reversion;

  // ---------- 0. Canonical model values reproduce exactly before any transform ----------
  const center=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite));
  const wrBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:L.priorReceiverWrteEpa(p)})),.5);
  const rbBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),.5);
  const rbRef=vals.map(p=>L.priorRbOrthogonalComposite(p,rbBeta,center)).filter(Number.isFinite);
  const finalGrade={};
  for(const t of T){const z=Zt[t];
    const rbPrior=L.regressUnitIndex(L.continuousPercentileValue(rbRef,L.priorRbOrthogonalComposite(P[t],rbBeta,center),true),rev);
    const g=k=>{const {g,k:kk}=Z0.blendInputs(z,k);return [g,kk];};
    finalGrade[t]={qbIndex:Z0.displayFromLive(L,z,'qbIndex',z.prior.qbIndex,z.liveGrade.qbIndex),receiverIndex:L.blend(z.prior.receiverIndex,z.liveGrade.receiverIndex,...g('receiverIndex')),
      olIndex:L.blend(z.prior.olIndex,z.liveGrade.olIndex,...g('olIndex')),rbIndex:L.blend(rbPrior,z.liveGrade.rbIndex,...g('rbIndex')),defenseIndex:z.display.defenseIndex};
    for(const k of Object.keys(finalGrade[t]))finalGrade[t][k]=seam.unitDisplayGrade({[k]:finalGrade[t][k]},k);}
  const frozenCsv=F.csv(Z0.DIR+'/results/current_unit_values.csv');let maxRes=0;
  for(const r of frozenCsv)for(const k of ['qbIndex','receiverIndex','olIndex','rbIndex','defenseIndex']){const d=Math.abs(finalGrade[r.team][k]-Number(r[k]));maxRes=Math.max(maxRes,d);assert(d<=5e-7,r.team+' '+k+' canonical reproduction');}
  const reproduction={canonicalValues:'qbIndex, receiverIndex, olIndex, rbIndex (post-correction LIVE_FITTED frame) and defenseIndex for 32 teams, computed through production blend/recency/clamp and the identity seam, equal the frozen Cycle 9 post-correction baseline (current_unit_values.csv, 6-decimal) within 5e-7',maxAbsResidualVs6DecimalCsv:maxRes,seamIsIdentity:true};

  // ---------- 1. Historical reference data: committed Cycle 7 game-level unit fixture ----------
  const ug=F.csv(UNIT_GAMES).map(r=>({...r,team:F.canon(r.team),year:+r.year,week:+r.week}));
  const byTS={};for(const r of ug){(byTS[r.year+'|'+r.team]=byTS[r.year+'|'+r.team]||[]).push(r);}
  for(const a of Object.values(byTS)){a.sort((p,q)=>p.week-q.week);assert.equal(a.length,17);}
  assert.equal(Object.keys(byTS).length,64);
  const num=(r,k)=>Number(r[k]);
  // Per-game sums. Dropbacks are recovered exactly: db = pass_n/(1-sack_rate) (integral in every row).
  const sums=r=>{const db=num(r,'pass_n')/(1-num(r,'sack_rate'));assert(Math.abs(db-Math.round(db))<1e-6);const dbi=Math.round(db);
    return {db:dbi,disrupt:Math.round(-num(r,'protection')*dbi),recvN:num(r,'receiver_n'),recvS:num(r,'receiver_epa')*num(r,'receiver_n'),passN:num(r,'pass_n'),passS:num(r,'pass_epa')*num(r,'pass_n'),
      rbN:num(r,'rb_n'),rbS:num(r,'rb_epa')*num(r,'rb_n'),qbN:num(r,'qb_n'),qbS:num(r,'qb_epa')*num(r,'qb_n')};};
  const S={};for(const [k,a] of Object.entries(byTS))S[k]=a.map(sums);
  const agg=(k,s,len)=>{const o={};for(const g of S[k].slice(s,s+len))for(const [f,v] of Object.entries(g))o[f]=(o[f]||0)+v;return o;};
  // Oriented signals (higher = better).
  const UNITS={
    olIndex:{label:'Offensive line',signal:'Hit-or-sack disruption per dropback allowed (sign-flipped so higher = better)',win:o=>-o.disrupt/o.db,cur:z=>-z.raw.pbpPassProtectionDisruptions/z.raw.pbpPassProtectionDropbacks,games:z=>z.raw.offensiveDriveGames||z.raw.games,status:'SUPPORTED (signal layer)',semantics:'Same de-duplicated PBP definition as production (validated against the V149 2025 windows below).'},
    receiverIndex:{label:'Receivers (WR/TE)',signal:`QB-partial residual EPA/target = WR/TE EPA/target - ${wrBeta.toFixed(4)}*(sack-free attempt EPA - ${center}) (production beta and centre; unstabilized)`,win:o=>o.recvS/o.recvN-wrBeta*(o.passS/o.passN-center),cur:z=>z.raw.receiverResidualEpa,games:z=>z.metadata.playerStatGames,status:'SUPPORTED (signal layer; unstabilized residual)',semantics:'Production residual construct. Current WR/TE EPA comes from weekly player stats, historical from PBP targets; same EPA events, different aggregation provider.'},
    rbIndex:{label:'RB',signal:'RB/FB rushing EPA per carry',win:o=>o.rbS/o.rbN,cur:z=>z.raw.rbRushEpa,games:z=>z.metadata.playerStatGames,status:'PARTIAL (rushing component only; production RB grade is 70% rushing + 30% residual receiving, and historical RB receiving is not in the fixture)',semantics:'Rushing component only.'},
    qbIndex:{label:'QB',signal:'QB EPA per play (dropbacks plus QB runs, downs 1-4)',win:o=>o.qbS/o.qbN,cur:z=>z.raw.qbEpaPerPlay,games:z=>z.metadata.playerStatGames,status:'PARTIAL (EPA/play component only; production QB grade is a five-component composite with opponent, pressure, prior and recency terms that have no historical replay)',semantics:'EPA/play component only.'}};
  // Production receiver residual is exactly the signal used here.
  for(const t of T){const r=Zt[t].raw;close(L.partialResidual(r.recvEpa,r.qbAttemptEpa,wrBeta,center),r.receiverResidualEpa,t+' WR residual',1e-12);}
  const keysOf=years=>Object.keys(S).filter(k=>years.includes(+k.split('|')[0]));
  // Reference kinds: S = stage-matched (each team-season's first g games), C = same game count at any
  // stage (every g-game window), F = full season (17 games).
  const refFor=(unit,kind0,g,years=YEARS)=>{const kind=stageOverride[kind0]||kind0,u=UNITS[swapUnit[unit]||unit],sgn=flip[unit]?-1:1,out=[];for(const k of keysOf(years)){
      if(kind==='S')out.push(sgn*u.win(agg(k,0,g)));else if(kind==='C')for(let s=0;s+g<=17;s++)out.push(sgn*u.win(agg(k,s,g)));else if(kind==='F')out.push(sgn*u.win(agg(k,0,17)));else throw new Error('kind');}
    const final=refOverride?refOverride(unit,kind,g,years,out):out;
    assert.equal(final.length,years.length*32*(kind0==='C'?18-g:1),unit+' '+kind+' reference sample complete');assert(final.every(Number.isFinite),unit+' reference finite');
    return final;};
  // Validation of construct identity against the production V149 2025 reference (OL, QB): team-major slots.
  const order=F.referenceTeamOrder(F.csv(F.CACHE.pfrPass2025));
  const v149=(metric,unitKey)=>{let max=0,exact=0,n=0;const xs=[],ys=[];order.forEach((tm,t)=>{for(let i=0;i<17;i++){const a=F.windowAt(reference,metric,1,t,i),b=UNITS[unitKey].win(agg('2025|'+tm,i,1))*(unitKey==='olIndex'?-1:1);
      xs.push(a);ys.push(b);n++;const d=Math.abs(a-b);max=Math.max(max,d);if(d<1e-7)exact++;}});return {teamGames:n,exactWithin1e7:exact,maxAbsDiff:max,correlation:correlation(xs,ys).pearson};};
  const constructValidation={olVsV149:v149('ol_disruption_rate','olIndex'),qbVsV149:v149('qb_epa_per_play','qbIndex'),
    note:'V149 (production 2025 reference) and the Cycle 7 fixture come from different nflverse 2025 PBP releases (sha 8ce00018 vs 2f135887). Agreement measures definitional identity up to release revisions.'};

  // ---------- 1b. Availability inventory ----------
  const availability={
    sourceOfHistoricalReference:{path:UNIT_GAMES,derivedFrom:'research/cycle7/inputs.json pins (nflverse 2024/2025 regular-season PBP and weekly player positions; committed derived fixture)',seasons:YEARS,form:'game-level, one row per team-game, 17 games per team-season, with counts for exact pooling',futureInformation:'None within a window: a window uses only the games it covers. Position classification is full-season (Cycle 7 boundary).'},
    seamInputQuantity:'The seam consumes the final canonical grade (live grade blended with a regressed 2025 prior; QB adds recency and a clamp). No historical population of FINAL grades exists in the repository for any unit: replaying the current model on past seasons needs past priors, provider selections and context state that are not archived (Cycle 9 Section 6). Every prototype below therefore maps the unit\'s measured SIGNAL, not the final grade.',
    units:{
      qbIndex:{finalQuantity:'qbIndex (five-component composite, opponent/pressure context, prior blend, recency, clamp)',historicalSeasons:YEARS,perSeason:'32 team-seasons x 17 games (EPA/play component only)',forms:'game-level -> rolling or stage windows, full season',identicalSemantics:false,mismatch:'Only the EPA/play component has history; ANY/A, CPOE, success-weighting, rushing bonus, opponent and pressure terms, prior and recency do not.',stageComparable:true,stabilizationDiffers:'Production stabilizes EPA toward the current mean (150 plays); the signal-layer reference is unstabilized.',verdict:'PARTIAL: component-level prototype only; the displayed QB composite cannot honestly be given a historical standing yet.'},
      olIndex:{finalQuantity:'olIndex (live = 2025 window percentile of disruption rate; blended with regressed legacy 2025 olIndex prior)',historicalSeasons:YEARS,perSeason:'32 x 17 games; 32 stage windows; 448 4-game windows',forms:'game-level -> windows, full season',identicalSemantics:true,mismatch:'None at the signal layer (validated). The final grade adds a prior of a different construct.',stageComparable:true,stabilizationDiffers:'None (OL is unstabilized in production too).',verdict:'SUPPORTED at the signal layer.'},
      receiverIndex:{finalQuantity:'receiverIndex (residual stabilized with 80 targets, centre-aligned, 2025 CDF, prior blend)',historicalSeasons:YEARS,perSeason:'32 x 17 games',forms:'game-level -> windows, full season',identicalSemantics:'residual construct yes; stabilization and centre alignment are not applied to the signal-layer reference or current value',mismatch:'Weekly-stat vs PBP aggregation of the same targets.',stageComparable:true,stabilizationDiffers:'Yes: production shrinks toward the current centre; the prototype maps the unshrunk 4-game residual against unshrunk 4-game windows (stage-matched).',verdict:'SUPPORTED at the signal layer (unstabilized residual).'},
      rbIndex:{finalQuantity:'rbIndex (70% rushing + 30% residual receiving, stabilized, centre-aligned, LIVE_FITTED prior)',historicalSeasons:YEARS,perSeason:'32 x 17 games (rushing only)',forms:'game-level -> windows, full season',identicalSemantics:false,mismatch:'Receiving component missing historically.',stageComparable:true,stabilizationDiffers:'Yes (50 carries toward current mean in production).',verdict:'PARTIAL: rushing component only.'},
      defenseIndex:{finalQuantity:'defenseIndex (display-only soft-tail composite of coverage, pass rush, run defense and prevention, each a current-season rank or provider-dependent map)',historicalSeasons:[],perSeason:'none in current semantics',forms:'n/a',identicalSemantics:false,mismatch:'Components are current-season ranks; prevention (points/drive) has no history in the fixture; pass rush is provider-dependent; the fixture run-defense signal is RB-only while production includes QB runs; coverage is 75% EPA + 25% CPOE ranks.',stageComparable:null,stabilizationDiffers:'n/a',verdict:'NOT SUPPORTED: no historical population with current semantics.'},
      defensiveSubunits:{inspected:['coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'],verdict:'NOT PROTOTYPED. The fixture carries pass_rush, coverage and run_defense signals, but each differs from the production construct (provider, CPOE share, QB runs), and prevention has no history. Including them would test a different metric.'}}};

  // ---------- 2-5. Prototypes on 2026 Week-4 signals ----------
  const PROTO=['olIndex','receiverIndex','rbIndex','qbIndex'];
  const REFS=['S','C','F'],CANDS=['A','B','C'];
  const curOf=u=>T.map(t=>(flip[u]?-1:1)*UNITS[u].cur(Zt[t])),gamesOf=u=>T.map(t=>UNITS[u].games(Zt[t]));
  for(const u of PROTO)for(const g of gamesOf(u))assert(g===3||g===4,u+' games');
  const refDef={S:g=>`2024-2025 team-seasons, games 1-${g} (stage-matched), n=64`,C:g=>`2024-2025 every ${g}-game window at any stage, n=${64*(18-g)}`,F:()=>'2024-2025 full seasons (17 games), n=64'};
  const summarize=v=>{const s=Z0.fullStats(v);return {min:s.min,p10:s.p10,p25:s.p25,median:s.median,mean:s.mean,p75:s.p75,p90:s.p90,max:s.max,sd:s.sd,below10:v.filter(a=>a<10).length,above90:v.filter(a=>a>90).length,at0:v.filter(a=>a===0).length,at100:v.filter(a=>a===100).length};};
  const ordinal=v=>v.map(x=>1+v.filter(y=>y>x).length+(v.filter(y=>y===x).length-1)/2);
  const tables={},dist={};
  for(const u of PROTO){const cur=curOf(u),gs=gamesOf(u),fin=T.map(t=>finalGrade[t][u]),finRank=ordinal(fin),sigRank=ordinal(cur);tables[u]={};dist[u]={};
    for(const kind of REFS){const refs={3:refFor(u,kind,3),4:refFor(u,kind,4)};
      for(const c of CANDS){const disp=cur.map((v,i)=>X.CANDIDATES[c](refs[kind==='F'?4:gs[i]],v));
        tables[u][c+kind]=T.map((t,i)=>{const ref=refs[kind==='F'?4:gs[i]];return {team:t,finalGrade:fin[i],finalRank2026:finRank[i],signal:cur[i],signalRank2026:sigRank[i],display:disp[i],historicalStanding:X.standing(ref,cur[i]),referenceN:ref.length,reference:refDef[kind](gs[i]),...X.edge(ref,cur[i])};});
        dist[u][c+kind]=summarize(disp);}}}
  // Dynamic record semantics (A and B, stage-matched): the 2026 values join the reference.
  const dynamic={};
  for(const u of PROTO){const cur=curOf(u),gs=gamesOf(u);dynamic[u]={};
    for(const c of ['A','B']){const disp=cur.map((v,i)=>{const ref=refFor(u,'S',gs[i]);const same=cur.filter((_,j)=>gs[j]===gs[i]);return X.CANDIDATES[c](X.dynamicReference(ref,same),v);});
      dynamic[u][c+'S']={summary:summarize(disp),maxAbsDifferenceFromFrozen:Math.max(...disp.map((v,i)=>Math.abs(v-tables[u][c+'S'][i].display))),teamsAt100:T.filter((_,i)=>disp[i]===100),teamsAt0:T.filter((_,i)=>disp[i]===0)};}}

  // ---------- 3. Edge semantics (probes on each unit's stage-matched 4-game reference) ----------
  const edges={};
  for(const u of PROTO){const ref=refFor(u,'S',4),a=[...ref].sort((p,q)=>p-q),n=a.length,step=(a[n-1]-a[0])/100;
    const med=quantile(a,.5),gapI=a.slice(1).map((v,i)=>v-a[i]).reduce((b,v,i,arr)=>v>arr[b]?i:b,0),between=(a[gapI]+a[gapI+1])/2;
    const tieVal=(()=>{for(let i=1;i<n;i++)if(a[i]===a[i-1])return a[i];return null;})();
    const probes={equalToWorst:a[0],equalToBest:a[n-1],worseThanWorst:a[0]-5*step,betterThanBest:a[n-1]+5*step,tiedValue:tieVal,historicalMedian:med,betweenSparseObservations:between};
    edges[u]={referenceN:n,largestGap:{lower:a[gapI],upper:a[gapI+1]},probes:Object.fromEntries(Object.entries(probes).filter(([,v])=>v!==null).map(([k,v])=>[k,{value:v,A:X.candidateA(ref,v),Amin:X.candidateA(ref,v,{tie:'min'}),Amax:X.candidateA(ref,v,{tie:'max'}),B:X.candidateB(ref,v),C:X.candidateC(ref,v),standing:X.standing(ref,v)}])),
      tiedValuesInReference:a.filter((v,i)=>(i&&v===a[i-1])||(i<n-1&&v===a[i+1])).length};}
  const edgeRules={
    A:{equalToWorst:'0',equalToBest:'100',worseThanWorst:'0, flagged belowWorst (frozen); under dynamic semantics it becomes the new worst and the frame re-anchors',betterThanBest:'100, flagged aboveBest (frozen: 100 = at or beyond the frozen best); under dynamic semantics it becomes the new best = 100 and earlier values remap down',tied:'midrank of the tied block (interior); worst/best blocks forced to 0/100',median:'50 when n is odd; for even n the two middle order statistics map to 100*(n/2-1)/(n-1) and 100*(n/2)/(n-1) and their midpoint is interpolated near 50',sparse:'linear interpolation between the adjacent distinct historical values'},
    B:{equalToWorst:'0',equalToBest:'100',worseThanWorst:'0 flagged (as A)',betterThanBest:'100 flagged (as A)',tied:'no special rule: the kernel CDF treats tied values as coincident kernels',median:'near but not exactly 50 (kernel smoothing)',sparse:'smooth (kernel) rather than linear; same order as A'},
    C:{equalToWorst:'100*(midrank+0.5)/n, e.g. 0.78 at n=64',equalToBest:'100*(1-0.5/n), e.g. 99.22 at n=64',worseThanWorst:'between 0 and the worst knot via a fitted normal tail; never exactly 0',betterThanBest:'between the best knot and 100 via a fitted normal tail; never exactly 100',tied:'midrank Hazen position',median:'50 exactly at the sample median order statistic (odd n) / interpolated (even n)',sparse:'linear between Hazen positions'},
    semanticsTradeoff:{frozen:'Reproducible across a season: the same signal always maps to the same number; 100 means at or beyond the frozen historical best (records are flagged, not distinguished).',dynamic:'0/100 always mean worst/best ever including the current season, but a team\'s number can change because another team set a record, and published numbers are not reproducible without the reference version.',openTail:'Records remain distinguishable above the historical best, but 0/100 become unattained asymptotes and the historical best shows ~99.2 (n=64), contradicting the owner\'s "100 = best observation".'}};

  // ---------- 4/6. Stage fairness and cross-unit calibration (leave-one-season-out) ----------
  // Map each season's games 1-4 team windows against references built from the OTHER season only.
  const loso={};
  for(const u of PROTO){loso[u]={};for(const [test,train] of [[2025,2024],[2024,2025]]){const obs=keysOf([test]).map(k=>UNITS[u].win(agg(k,0,4)));
      for(const kind of REFS){const ref=refFor(u,kind,4,[train]);for(const c of CANDS){const d=obs.map(v=>X.CANDIDATES[c](ref,v));
        (loso[u][c+kind]=loso[u][c+kind]||[]).push(...d);}}}
    for(const k of Object.keys(loso[u])){const d=loso[u][k];loso[u][k]={n:d.length,shareAtOrAbove80:d.filter(v=>v>=80).length/d.length,shareAtOrAbove90:d.filter(v=>v>=90).length/d.length,shareAtOrBelow20:d.filter(v=>v<=20).length/d.length,shareAtOrBelow10:d.filter(v=>v<=10).length/d.length,shareAt0or100:d.filter(v=>v===0||v===100).length/d.length,sd:sd(d)};}}
  const stageEffect={};
  for(const u of PROTO){stageEffect[u]={};for(const c of CANDS){const s=tables[u][c+'S'].map(r=>r.display);
    for(const kind of ['C','F']){const o=tables[u][c+kind].map(r=>r.display),d=o.map((v,i)=>v-s[i]);stageEffect[u][c+'S_vs_'+c+kind]={meanAbsDiff:mean(d.map(Math.abs)),maxAbsDiff:Math.max(...d.map(Math.abs)),meanSignedDiff:mean(d),sdStageMatched:sd(s),sdOther:sd(o),extremesStageMatched:s.filter(v=>v<10||v>90).length,extremesOther:o.filter(v=>v<10||v>90).length};}}}
  // What signal value displays as 80 (Candidate A, stage-matched, 4 games), per unit.
  const inverse=(ref,target)=>{let lo=Math.min(...ref),hi=Math.max(...ref);for(let i=0;i<200;i++){const m=(lo+hi)/2;if(X.candidateA(ref,m)<target)lo=m;else hi=m;}return (lo+hi)/2;};
  const eighty=Object.fromEntries(PROTO.map(u=>{const ref=refFor(u,'S',4);const v=inverse(ref,80);return [u,{signalAt80:u==='olIndex'?{disruptionRate:-v}:{value:v},historicalStanding:X.standing(ref,v),referenceN:ref.length}];}));

  // ---------- 7. Sensitivity ----------
  const diffStats=(a,b)=>{const d=a.map((v,i)=>v-b[i]);return {meanAbsDiff:mean(d.map(Math.abs)),maxAbsDiff:Math.max(...d.map(Math.abs))};};
  const sens={};
  for(const u of PROTO){const cur=curOf(u),gs=gamesOf(u),base=tables[u].AS.map(r=>r.display);
    const seasonOnly=y=>cur.map((v,i)=>X.candidateA(refFor(u,'S',gs[i],[y]),v));
    const tie=m=>cur.map((v,i)=>X.candidateA(refFor(u,'S',gs[i]),v,{tie:m}));
    const fin=T.map(t=>finalGrade[t][u]),rk=v=>ordinal(v);
    const mv=(a,b)=>{const ra=rk(a),rb=rk(b),m=ra.map((r,i)=>Math.abs(r-rb[i]));return {spearman:correlation(a,b).spearman,teamsMoving:m.filter(v=>v>0).length,maxAbsMove:Math.max(...m)};};
    sens[u]={referencePopulation:{S_vs_C:diffStats(base,tables[u].AC.map(r=>r.display)),S_vs_F:diffStats(base,tables[u].AF.map(r=>r.display))},
      seasonInclusion:{only2024:diffStats(seasonOnly(2024),base),only2025:diffStats(seasonOnly(2025),base),only2024VsOnly2025:diffStats(seasonOnly(2024),seasonOnly(2025))},
      tieConvention:{minVsMid:diffStats(tie('min'),base),maxVsMid:diffStats(tie('max'),base)},
      sparseTail:{BvsA:diffStats(tables[u].BS.map(r=>r.display),base),CvsA:diffStats(tables[u].CS.map(r=>r.display),base),
        top5AndBottom5:{A:[...base].sort((p,q)=>q-p).filter((_,i)=>i<5||i>=27),B:[...tables[u].BS.map(r=>r.display)].sort((p,q)=>q-p).filter((_,i)=>i<5||i>=27),C:[...tables[u].CS.map(r=>r.display)].sort((p,q)=>q-p).filter((_,i)=>i<5||i>=27)}},
      signalOrderVsFinalGradeOrder:mv(cur,fin),
      note:'All candidates are monotone in the signal, so within a unit they share the signal order; differences between candidates and references are spacing/level only. The signal order differs from the final model order because the final grade adds stabilization and the prior blend.'};}
  // Prior-blend sensitivity already documented (follow-up package): final-rank movement under K/OL counterfactuals.
  const followup=JSON.parse(F.lf('research/cycle9/md08_followup_ol_receivers/results/final_grade_sensitivity.json'));
  sens.priorBlendFromFollowup=followup.counterfactuals.map(c=>({id:c.id,finalSpearman:c.final.spearman,teamsMoving:c.final.teamsMoving,maxAbsMove:c.final.maxAbsMove}));

  // ---------- 5b. Leaders, worst, and "best in 2026" vs "historically exceptional" ----------
  const EXC=95,AWF=5;
  const leaders=Object.fromEntries(PROTO.map(u=>{const t=tables[u].AS;const best=t.reduce((a,b)=>b.signal>a.signal?b:a),worst=t.reduce((a,b)=>b.signal<a.signal?b:a),finBest=t.reduce((a,b)=>b.finalGrade>a.finalGrade?b:a);
    const cls=(r,hi)=>hi?(r.aboveBest?'beyond the 2024-2025 stage-matched best':r.display>=EXC?'historically exceptional (>= '+EXC+')':'best in 2026 only'):(r.belowWorst?'below the 2024-2025 stage-matched worst':r.display<=AWF?'historically awful (<= '+AWF+')':'worst in 2026 only');
    return [u,{leader:{team:best.team,display:best.display,B:tables[u].BS.find(r=>r.team===best.team).display,C:tables[u].CS.find(r=>r.team===best.team).display,full:tables[u].AF.find(r=>r.team===best.team).display,class:cls(best,true)},
      worst:{team:worst.team,display:worst.display,B:tables[u].BS.find(r=>r.team===worst.team).display,C:tables[u].CS.find(r=>r.team===worst.team).display,full:tables[u].AF.find(r=>r.team===worst.team).display,class:cls(worst,false)},
      finalGradeLeader:{team:finBest.team,finalGrade:finBest.finalGrade,historicalDisplayA_S:finBest.display}}];}));
  const leaderRule=`Research labelling rule only: Candidate A stage-matched display >= ${EXC} = historically exceptional, <= ${AWF} = historically awful, beyond the reference = flagged; otherwise best/worst in 2026 only. Thresholds are illustrative, not proposed labels.`;

  return {reproduction:{...reproduction,constructValidation},availability,tables,distributions:dist,dynamic,edges,edgeRules,stage:{leaveOneSeasonOut:loso,currentStageEffect:stageEffect,whatEightyMeans:eighty},sensitivity:sens,leaders:{rule:leaderRule,units:leaders},
    definitions:{orientation:'All signals oriented so higher = better (OL disruption sign-flipped).',standing:'100*(#reference strictly worse + 0.5*#equal)/n',candidates:{A:'Empirical percentile with exact endpoints; midrank interior ties; linear between distinct values; 0/100 outside the range (flagged).',B:'Gaussian-kernel CDF (Silverman bandwidth), rescaled so worst = 0 and best = 100; 0/100 outside (flagged).',C:'Hazen plotting positions (midrank+0.5)/n with linear interpolation; normal-tail extension beyond the range toward 0/100 asymptotes.'},references:{S:'stage-matched: games 1..g of each 2024/2025 team-season (g = the current team\'s game count, 3 or 4)',C:'same game count, any stage: every g-game window of 2024/2025',F:'full season: 17-game 2024/2025 team-seasons'}}};
}

export function serialize(a){const J=F.json;
  const csvRows=[];for(const [u,t] of Object.entries(a.tables))for(const [k,rows] of Object.entries(t))for(const r of rows)csvRows.push([u,k,r.team,r.finalGrade.toFixed(6),r.finalRank2026,r.signal.toFixed(8),r.signalRank2026,r.display.toFixed(6),r.historicalStanding.toFixed(6),r.referenceN,'"'+r.reference+'"',r.belowWorst,r.aboveBest].join(','));
  return {'reproduction.json':J(a.reproduction),'availability.json':J(a.availability),'distributions.json':J({definitions:a.definitions,distributions:a.distributions,dynamicRecordSemantics:a.dynamic,leaders:a.leaders}),
    'edge_semantics.json':J({rules:a.edgeRules,probes:a.edges}),'stage_and_cross_unit.json':J(a.stage),'sensitivity.json':J(a.sensitivity),
    'team_tables.csv':'unit,candidateReference,team,finalGrade,finalRank2026,signal,signalRank2026,display,historicalStanding,referenceN,reference,belowWorst,aboveBest\n'+csvRows.join('\n')+'\n'};}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('md08_historical_standing_prototype/analyze.mjs')){
  const dir=process.argv[2],out=serialize(analyze());
  if(dir){const fs=await import('node:fs');fs.mkdirSync(dir,{recursive:true});for(const [f,s] of Object.entries(out))fs.writeFileSync(dir+'/'+f,s);console.log('wrote',Object.keys(out).join(', '));}
  else console.log(Object.fromEntries(Object.entries(out).map(([f,s])=>[f,s.length])));
}
