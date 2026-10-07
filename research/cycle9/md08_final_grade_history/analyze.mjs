// MD-08 final-grade history build: evidence generator. Research only. No production
// code, formula, prior, stabilizer, weight, grade or presentation behavior changes.
// Corrected after Codex review C of 25155a5.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as Z0 from '../md08_unit_normalization/lib.mjs';
import * as X from '../md08_historical_standing_prototype/transforms.mjs';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import * as K from './contracts.mjs';

export const DIR='research/cycle9/md08_final_grade_history';
export const START='a1a781019388cd86f5f60f3345b7b6c757ba9d74';
export const PINS={
  'research/cycle7/fixtures/unit_games.csv':'e5012000c97773e4837dbeebfd675be2ffe1cd37daa1e0bf83abe1a5f10b6828',
  'research/season_end_elo.json':'46c006e048876ab594456d98406177572e9f43abf6fcf394655d21b8aff1867c',
  'data/model-data.js':'fa852ce51b25bebd57fa49dca4e2d8e73575ced372e37ea5c6e30fb76217e8ac',
  'data/matchup-data.js':'88b100a3e10158990398b46740c7d01e2048cf05d1601a03ae3c6b0f1613357d',
  'CHANGELOG_V4.md':'ed1b0b7063be019bb9195e0d40cbcaf911407295ee3534abcf81c9fa46eb3bc4',
  'research/cycle9/md08_historical_standing_prototype/hashes.json':'2d2e72197fdb3dd63d78f2d2ad6a344bbaab352ff6d06a9daa230be70cea46af',
  [DIR+'/results/source_listing.json']:'ef1d7cb7d4320452c77b4414a52df41c95e9608475b5d0ceee7618c6b0590898',
  'model/rating_continuity.js':'5b5e5cfdbf11f17a9ae60b649f904aca97782cb14e14f629b327f0522655ffb9',
  'model/unit_prior_controller.js':'d5b62e123bd474ee10e328c6048bcab10754cc7f03a5de57e935953596d6d49e',
  'model/early_regime.js':'f164f33730af3fd84e1c3f5b229e1edd0841f40038d0d90714f33c5db71e8fa5',
  'data/live-cache/2e8d73150c460a0bed43.bin':'f805065157e4ae1aab63f7ba55cad23ca66449d17502bb54871b14c57a5ca301',
  'force_server.py':'d580c4f6cb4d9eeaad86d38f25191444cb2075ddc5d5b38ec0eea4553298a521'
};
const {mean,correlation,close}=F;

function resolveAnchor(a){const [file,...rest]=a.split('#');const s=rest.join('#');const lines=F.lf(file).split('\n');const i=lines.findIndex(l=>l.includes(s));assert(i>=0,'anchor not found: '+a);return {file,line:i+1,match:s};}

// k in the real production engine, optionally with substituted preseason Elo (data/model-data.js rankings).
export function engineK({eloOverride=null,weeks=[1,2,3,6,11,12,13]}={}){
  let sources={};
  if(eloOverride){const obj=JSON.parse(F.lf('data/model-data.js').replace(/^window\.MODEL_DATA\s*=\s*/,'').replace(/;\s*$/,''));
    obj.rankings=obj.rankings.map(r=>({...r,elo:eloOverride[r.team]??eloOverride[r.team==='LAR'?'LA':r.team]}));sources={'data/model-data.js':'window.MODEL_DATA = '+JSON.stringify(obj)+';'};}
  const {api}=appHarness({hooks:'M,D,seasonEngine,unitPriorGamesMap,earlyStatesBeforeWeek,regimeRawCorrectionPoints',sources});
  const e=api.seasonEngine();const out={};
  for(const w of weeks){const st=api.earlyStatesBeforeWeek(w,e);const k=api.unitPriorGamesMap(w,st);
    out[w]={k,regimeClass:Object.fromEntries(Object.keys(k).map(t=>[t,Math.sign(api.regimeRawCorrectionPoints(t,w,st))]))};}
  return {completedGames:api.S.schedule.filter(g=>g.homeScore!=null&&g.awayScore!=null).length,weeks:out};
}

export function analyze({pins=PINS}={}){
  for(const [p,h] of Object.entries(pins))assert.equal(F.hash(F.lf(p)),h,p+' pin');
  const ph=JSON.parse(F.lf('research/cycle9/md08_historical_standing_prototype/hashes.json'));
  for(const [f,h] of Object.entries(ph))assert.equal(F.hash(F.lf('research/cycle9/md08_historical_standing_prototype/'+f)),h,'prototype '+f);
  const {x,L,M,D,seam}=F.load();assert(seam.isIdentity());
  const Zt=x.teams,T=Object.keys(Zt).sort(),P=M.profiles,vals=Object.values(P);

  // ---------- Phase 1: dependency graphs, stale assumptions ----------
  const contracts={transformVersion:K.TRANSFORM_VERSION,blockers:K.BLOCKERS,staleAssumptionsCorrected:K.STALE,validatorHistory:K.VALIDATOR_HISTORY,
    units:Object.fromEntries(Object.entries(K.UNITS).map(([u,v])=>[u,{label:v.label,...K.unitStatus(u),chain:v.chain.map(c=>({...c,anchor:resolveAnchor(c.anchor)}))}])),
    engineering:Object.fromEntries(Object.entries(K.ENGINEERING).map(([k,a])=>[k,resolveAnchor(a)])),
    asOfRule:'A season-Y week-w observation may use season-Y rows with week < w for the engine state (production profileBeforeWeek filters week < beforeWeek) and the rows through the as-of week for the unit grade, plus season Y-1 full-season inputs for priorSeason roles. Anything later is leakage.'};
  for(const u of Object.keys(K.UNITS))assert.equal(contracts.units[u].status,'BLOCKED',u+' expected BLOCKED');

  // ---------- B1: bundle field reproducibility and recoverable rank definitions ----------
  const ug=F.csv('research/cycle7/fixtures/unit_games.csv').filter(r=>r.year==='2025');
  const S={};for(const r of ug){const t=F.canon(r.team),o=S[t]=S[t]||{rn:0,rs:0,qn:0,qs:0,bn:0,bs:0,db:0,d:0};const db=+r.pass_n/(1-+r.sack_rate);
    o.rn+=+r.receiver_n;o.rs+=r.receiver_epa*r.receiver_n;o.qn+=+r.qb_n;o.qs+=r.qb_epa*r.qb_n;o.bn+=+r.rb_n;o.bs+=r.rb_epa*r.rb_n;o.db+=db;o.d+=-r.protection*db;}
  const cmp=(field,a,b,definition)=>{const d=T.map(t=>Math.abs(a(t)-b(t)));return {bundledField:field,publicDefinition:definition,maxAbsDiff:Math.max(...d),meanAbsDiff:mean(d),exactTeams:d.filter(v=>v<1e-6).length,pearson:correlation(T.map(a),T.map(b)).pearson};};
  const fields=[
    cmp('receivers.adj_epa',t=>+P[t].receivers.adj_epa,t=>S[t].rs/S[t].rn,'2025 REG WR/TE EPA per target (team, PBP)'),
    cmp('receivers.targets',t=>+P[t].receivers.targets,t=>S[t].rn,'2025 REG WR/TE targets'),
    cmp('qb.epa_per_play',t=>+P[t].qb.epa_per_play,t=>S[t].qs/S[t].qn,'2025 REG team QB EPA/play'),
    cmp('qb.epaoe',t=>+P[t].qb.epaoe,t=>S[t].qs/S[t].qn,'2025 REG team QB EPA/play (no public expected-EPA model)'),
    cmp('rb.rush_epa',t=>+P[t].rb.rush_epa,t=>S[t].bs/S[t].bn,'2025 REG RB/FB rush EPA per carry'),
    cmp('ol.pressure_rate_allowed',t=>+P[t].ol.pressure_rate_allowed,t=>S[t].d/S[t].db,'2025 REG hit-or-sack per dropback'),
    cmp('ol.dropbacks',t=>+P[t].ol.dropbacks,t=>S[t].db,'2025 REG dropbacks')];
  for(const f of fields)assert(f.exactTeams<32,'unexpected exact reproduction of '+f.bundledField);
  const rankPct=v=>v.map(x=>100*(v.filter(y=>y<x).length+(v.filter(y=>y===x).length-1)/2)/(v.length-1));
  const rankDef=(idx,field,f)=>{const a=T.map(t=>+P[t][idx]),r=rankPct(T.map(f));const d=a.map((v,i)=>Math.abs(v-r[i]));return {index:idx,sourceField:field,maxAbsGapToMidrankPercentile:Math.max(...d),spearman:correlation(a,T.map(f)).spearman};};
  const rankDefs=[rankDef('coverageIndex','cov.rating',t=>+P[t].cov.rating),rankDef('frontIndex','dl.rating',t=>+P[t].dl.rating),rankDef('receiverIndex','receivers.adj_epa',t=>+P[t].receivers.adj_epa),
    rankDef('rushIndex','rb.composite',t=>+P[t].rb.composite),rankDef('olIndex','ol.rating',t=>+P[t].ol.rating),rankDef('offenseIndex','off_epa',t=>+P[t].off_epa),rankDef('qbIndex','qb.epaoe',t=>+P[t].qb.epaoe)];
  const elo=JSON.parse(F.lf('research/season_end_elo.json')),e25=elo['2025'];
  const eloDiff=D.rankings.map(r=>Math.abs((e25[r.team]??e25[r.team==='LAR'?'LA':r.team])-r.elo));

  // ---------- B2: current 2025 reference reproduces exactly ----------
  const center=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite));
  const wrBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:L.priorReceiverWrteEpa(p)})),.5);
  const rbBeta=L.ridgeOrthogonalSlope(vals.map(p=>({x:L.priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),.5);
  const wrRef=vals.map(p=>L.priorReceiverResidual(p,wrBeta,center)).filter(Number.isFinite),rbRef=vals.map(p=>L.priorRbOrthogonalComposite(p,rbBeta,center)).filter(Number.isFinite);
  let wrMax=0,rbMax=0;
  for(const t of T){const r=Zt[t].raw;close(r.receiverOrthogonalBeta,wrBeta,'WR beta');close(r.rbRecvOrthogonalBeta,rbBeta,'RB beta');close(r.receiverEnvironmentCenter,center,'centre');
    const w=L.continuousPercentileValue(wrRef,r.receiverCalibratedResidual,true),b=L.continuousPercentileValue(rbRef,r.rbCalibratedComposite,true);
    wrMax=Math.max(wrMax,Math.abs(w-Zt[t].liveGrade.receiverIndex));rbMax=Math.max(rbMax,Math.abs(b-Zt[t].liveGrade.rbIndex));}
  assert(wrMax<=1e-10&&rbMax<=1e-10,'current receiver/RB references reproduce');
  const b2={currentReference:{status:'REPRODUCIBLE FOR CURRENT REFERENCE',wrBeta,rbBeta,qbCentre:center,referenceN:{receivers:wrRef.length,rb:rbRef.length},maxAbsLiveResidual:{receivers:wrMax,rb:rbMax}},
    historicalReferences:{status:'BLOCKED',reason:'Season Y-1 populations for earlier Y need the B1 bundle fields of season Y-1.'}};

  // ---------- B3: exact k behaviour ----------
  const kTable=Array.from({length:18},(_,i)=>K.kStatus(i+1));
  const base=engineK(),alt=engineK({eloOverride:e25});
  const kExperiment={description:'Production engine (harness) on the embedded completed Week-1 slate; preseason Elo from data/model-data.js versus the repository end-2025 Elo history substituted into the same field.',completedGames:base.completedGames,
    byWeek:Object.fromEntries(Object.keys(base.weeks).map(w=>{const a=base.weeks[w],b=alt.weeks[w];const d=Object.keys(a.k).map(t=>Math.abs(a.k[t]-b.k[t]));
      return [w,{teamsChanged:d.filter(v=>v>1e-12).length,maxAbsChange:Math.max(...d),regimeClassChanges:Object.keys(a.k).filter(t=>a.regimeClass[t]!==b.regimeClass[t]).length,distinctKProduction:[...new Set(Object.values(a.k).map(v=>+v.toFixed(10)))].length}];}))};
  assert.equal(kExperiment.byWeek[2].teamsChanged,24);close(kExperiment.byWeek[2].maxAbsChange,0.0197653235,'Codex week-2 k change',1e-9);assert.equal(kExperiment.byWeek[2].regimeClassChanges,0);
  for(const w of [1,12,13]){assert.equal(kExperiment.byWeek[w].teamsChanged,0);assert(Object.values(base.weeks[w].k).every(v=>v===1));}

  // ---------- B4: provider evidence ----------
  const ftnHeader=F.lf('data/live-cache/2e8d73150c460a0bed43.bin').split('\n')[0].split(',');
  const providers={};for(const z of Object.values(Zt))providers[z.metadata.passRushProvider]=(providers[z.metadata.passRushProvider]||0)+1;
  const b4={cascadeAnchor:resolveAnchor('model/live_profiles.js#const selectedPassRush='),ftnContractFieldsSought:['was_pressure','is_qb_pressure','is_pressure','pressure'],ftnCacheHeaderHasPressureField:ftnHeader.some(h=>['was_pressure','is_qb_pressure','is_pressure','pressure'].includes(h)),
    snapshotProviders2026Week4:providers,historicalAsRun:'NOT RECONSTRUCTIBLE',retrospectiveCurrentPolicy:'OWNER POLICY DECISION; per-season component coverage NOT verified'};
  assert.equal(b4.ftnCacheHeaderHasPressureField,false);

  const priorEvidence={bundle:{path:'data/matchup-data.js',season:2025,firstCommit:'43d2c71 (Initial FORCE V149 web repository; earlier history is not in Git)',changelog:'CHANGELOG_V4.md: "Added data/matchup-data.js ... packages 2025 model diagnostics"',producerInRepositoryOrHistory:false,externalReferences:'Old research cites a "supplied Celo research bundle/archive" that is not in the repository (model/README.md, research/v33_research_audit.py).',
      playerLevelExamples:T.slice(0,4).map(t=>({team:t,qb:P[t].qb.qb,qbGames:P[t].qb.games,rb:P[t].rb.name,rbGames:P[t].rb.games}))},
    fieldReproducibility:fields,recoverableRankDefinitions:rankDefs,
    eloChain:{productionPreseasonSource:'data/model-data.js rankings (end-2025 Elo), regressed 30%',repositoryHistory:'research/season_end_elo.json seasons '+Object.keys(elo)[0]+'-'+Object.keys(elo).at(-1),maxAbsDiff2025:Math.max(...eloDiff),meanAbsDiff2025:mean(eloDiff),verdict:'not the same chain'},
    b2,kTable,kExperiment,b4};

  // ---------- Coverage matrix with evidence labels ----------
  const listing=JSON.parse(F.lf(DIR+'/results/source_listing.json'));
  const yrs=t=>{const s=listing.tags[t].seasons;return [s[0],s.at(-1)];};
  const coverage={labels:{sourceAvailable:'a release file exists for the season (listing only)',componentCoverage:'every field the current definition needs is present and populated (verified only where stated)',semanticCompatibility:'the field means what the current definition assumes (verified only where stated)'},
    sourceListing:{retrievedAt:listing.retrievedAt,source:listing.source},
    inputs:[
      {input:'nflverse play-by-play',sourceAvailable:yrs('pbp'),componentCoverage:'verified only for 2024-2025 disruption/EPA fields (Cycle 7 fixture) and the 2025 V149 windows; not verified for other seasons',semanticCompatibility:'disruption definition verified 2025 (fixture = V149, 544/544); other fields not verified'},
      {input:'nflverse weekly player stats (incl. passing_cpoe)',sourceAvailable:yrs('stats_player'),componentCoverage:'verified for 2026 weeks 1-3 cache only; passing_cpoe coverage by season not verified',semanticCompatibility:'not verified for earlier seasons'},
      {input:'nflverse weekly team stats',sourceAvailable:yrs('stats_team'),componentCoverage:'verified for 2026 weeks 1-3 cache only',semanticCompatibility:'not verified for earlier seasons'},
      {input:'PFR advanced weekly passing',sourceAvailable:yrs('pfr_advstats'),componentCoverage:'verified for 2025 and 2026 weeks 1-3 caches only',semanticCompatibility:'not verified for earlier seasons'},
      {input:'FTN charting',sourceAvailable:yrs('ftn_charting'),componentCoverage:'2026 cache has NO pressure-outcome field, so the FTN provider contract is not ready; earlier seasons not verified',semanticCompatibility:'n/a while no pressure field exists'},
      {input:'StatRankings pressure scrape',sourceAvailable:null,componentCoverage:'no archive',semanticCompatibility:'n/a'},
      {input:'Manual pressure override',sourceAvailable:[2026,2026],componentCoverage:'current only',semanticCompatibility:'n/a'},
      {input:'Bundled prior-season profiles',sourceAvailable:[2025,2025],componentCoverage:'2025 only; producer absent',semanticCompatibility:'legacy'},
      {input:'Preseason Elo (production)',sourceAvailable:[2025,2025],componentCoverage:'2025 only',semanticCompatibility:'repository Elo history is a different chain'}],
    withdrawn:'The earlier conditional spans (OL 2000+, QB 2007+, receivers/RB 2000+, defense 2019+/2023+, common 2019+/2023+) are WITHDRAWN: they were inferred from release dates and missed the 17-game reference requirement, the FTN pressure-field contract and unverified component coverage.',
    unitSpans:{
      qbIndex:{earliestRawSourceYear:1999,theoreticalEarliestDisplayYear:2022,why:'season Y-1 must be a 17-game season (2021+) for a valid reference (B6)',unresolved:['B1 prior','B3 weeks 2-11','passing_cpoe coverage not verified','QB-id source literal (B5)'],status:'NOT ASSERTABLE (B1); 2022 is a necessary lower bound only'},
      olIndex:{earliestRawSourceYear:1999,theoreticalEarliestDisplayYear:2022,why:'valid reference needs a 17-game season Y-1 (B6); otherwise OL falls back to the bundle',unresolved:['B1 prior','B3 weeks 2-11','pbp coverage not verified outside 2024-2025'],status:'NOT ASSERTABLE (B1); 2022 is a necessary lower bound only'},
      receiverIndex:{earliestRawSourceYear:1999,theoreticalEarliestDisplayYear:null,why:'season Y-1 reference population needs B1 fields',unresolved:['B1','B2','B3 weeks 2-11'],status:'NOT ASSERTABLE'},
      rbIndex:{earliestRawSourceYear:1999,theoreticalEarliestDisplayYear:null,why:'as receivers',unresolved:['B1','B2','B3 weeks 2-11'],status:'NOT ASSERTABLE'},
      defenseIndex:{earliestRawSourceYear:1999,theoreticalEarliestDisplayYear:null,why:'coverage and run-defense priors need B1; pass rush depends on the B4 replay policy; the PFR prior branch would need Y-1 >= 2018 and component coverage that is not verified',unresolved:['B1','B4 policy','B3 weeks 2-11','passing_cpoe coverage'],status:'NOT ASSERTABLE'},
      common:{status:'NOT ASSERTABLE',necessaryLowerBound:2022,why:'QB and OL cannot start before 2022 under current semantics; all units remain blocked by B1'}},
    burnIn:'Every unit needs season Y-1 inputs (prior and/or reference) and Y-1 must be a 17-game season for QB/OL; burn-in seasons are not display-eligible. Weeks 2-11 also need a verified Elo chain ending at Y-1.'};

  // ---------- Phase 5: current reproduction gate (unchanged) ----------
  const rbRefGate=rbRef;
  const frozenCsv=Object.fromEntries(F.csv(Z0.DIR+'/results/current_unit_values.csv').map(r=>[r.team,r]));
  const gate={};let maxDisplay=0,maxCsv=0;
  for(const t of T){const z=Zt[t],g=k=>{const b=Z0.blendInputs(z,k);return [b.g,b.k];};
    const rbPrior=L.regressUnitIndex(L.continuousPercentileValue(rbRefGate,L.priorRbOrthogonalComposite(P[t],rbBeta,center),true),D.config.reversion);
    const fin={qbIndex:Z0.displayFromLive(L,z,'qbIndex',z.prior.qbIndex,z.liveGrade.qbIndex),olIndex:L.blend(z.prior.olIndex,z.liveGrade.olIndex,...g('olIndex')),
      receiverIndex:L.blend(z.prior.receiverIndex,z.liveGrade.receiverIndex,...g('receiverIndex')),rbIndex:L.blend(rbPrior,z.liveGrade.rbIndex,...g('rbIndex')),defenseIndex:L.defenseCompositeFrom(z.display)};
    gate[t]={};for(const [k,v] of Object.entries(fin)){const shown=seam.unitDisplayGrade({[k]:v},k);gate[t][k]=shown;
      if(k!=='rbIndex'){const d=Math.abs(shown-z.display[k]);maxDisplay=Math.max(maxDisplay,d);assert(d===0,t+' '+k+' differs from stored snapshot');}
      const dc=Math.abs(shown-Number(frozenCsv[t][k]));maxCsv=Math.max(maxCsv,dc);assert(dc<=5e-7,t+' '+k+' vs frozen post-correction CSV');}}
  const currentReproduction={layers:{
      priorPlusLiveToFinal:'REPRODUCED for qb/OL/receiver (stored snapshot, residual 0), RB (post-correction LIVE_FITTED frame vs frozen CSV, <=5e-7 rounding) and defense (composite recomputed from stored constituents, residual 0), all through the identity seam',
      currentReferences:'Receiver and RB 2025 betas, centre and reference CDFs reproduce the 32 live grades with residual <=1e-10 (B2 current reference)',
      rawToLive:'Reproduced in the accepted follow-up for OL and receivers from snapshot raw signals, and in Cycle 9 for QB components and RB; the raw->snapshot-raw step (PBP -> drive context) is production server code and was not re-run here',
      historicalInputs:'NOT ATTEMPTED: B1/B2 (and B3 for weeks 2-11, B4 for defense) block a historical raw-input gate without substitution'},
    maxAbsResidualVsSnapshot:maxDisplay,maxAbsResidualVsFrozenCsv:maxCsv,teams:32};

  // ---------- Phase 9: dynamic-record mechanics, distinct vs tied references ----------
  const A=X.candidateA;
  const counterexample={reference:[0,1,2,3,3],newObservation:4,valueAt3Before:A([0,1,2,3,3],3),valueAt3After:A([0,1,2,3,3,4],3),oldClaimedBound:K.reanchorBound.distinctOneRecord(5),tieAwareBound:K.reanchorBound.tieAware(5,1,2)};
  assert(Math.abs(counterexample.valueAt3After-counterexample.valueAt3Before)>counterexample.oldClaimedBound,'old universal bound is violated');
  const multisets=(n,lo,hi)=>{const out=[];const rec=(a,s)=>{if(a.length===n){out.push(a.slice());return;}for(let v=s;v<=hi;v++){a.push(v);rec(a,v);a.pop();}};rec([],lo);return out;};
  const brute={cases:0,distinctCases:0,oldBoundViolations:{oneRecord:0,batch:0},oldBoundViolationsDistinct:0,tieAwareViolations:0,maxRatioToTieAware:0,tightExamples:[]};
  for(const n of [3,4,5,6])for(const ref of multisets(n,0,4)){if(new Set(ref).size<2)continue;const t=K.extremeTieBlock(ref);const evals=[...new Set(ref)].flatMap(v=>[v,v+.5]).filter(v=>v<=Math.max(...ref));
    for(const m of [1,2,3])for(const add of multisets(m,-1,5)){brute.cases++;const ref2=[...ref,...add];let mx=0;for(const v of evals)mx=Math.max(mx,Math.abs(A(ref2,v)-A(ref,v)));
      const old=m===1?K.reanchorBound.distinctOneRecord(n):K.reanchorBound.distinctAdd(n,m),tb=K.reanchorBound.tieAware(n,m,t);
      const distinct=new Set(ref2).size===ref2.length;if(distinct){brute.distinctCases++;if(mx>old+1e-9)brute.oldBoundViolationsDistinct++;}
      if(mx>old+1e-9)brute.oldBoundViolations[m===1?'oneRecord':'batch']++;if(mx>tb+1e-9)brute.tieAwareViolations++;
      const ratio=mx/tb;if(ratio>brute.maxRatioToTieAware+1e-12){brute.maxRatioToTieAware=ratio;}if(Math.abs(ratio-1)<1e-12&&brute.tightExamples.length<3&&t>1)brute.tightExamples.push({ref,add,maxShift:mx,bound:tb});}}
  assert.equal(brute.tieAwareViolations,0);assert.equal(brute.oldBoundViolationsDistinct,0);assert(brute.oldBoundViolations.oneRecord>0);
  const R=F.rng(20261007),samples=[];
  for(const n of [64,160,320,640]){const pop=Array.from({length:n},()=>R.normal());const hi=Math.max(...pop)+1,lo=Math.min(...pop)-1;
    const d0=pop.map(v=>A(pop,v)),mx=a=>Math.max(...a.map((v,i)=>Math.abs(v-d0[i])));
    const season=Array.from({length:32},()=>R.normal()+.5);
    samples.push({n,newHighRecord:mx(pop.map(v=>A([...pop,hi],v))),newLowRecord:mx(pop.map(v=>A([...pop,lo],v))),newSeasonOf32:mx(pop.map(v=>A([...pop,...season],v))),distinctBounds:{oneRecord:K.reanchorBound.distinctOneRecord(n),season:K.reanchorBound.distinctAdd(n,32)}});}
  const dynamic={schema:K.METADATA_SCHEMA,
    statements:{
      distinctReferences:'If the old reference and the added observations are all distinct values: one new record moves any previously displayed value by at most 100/n; m added observations by at most 100*m/(n+m-1). (Derived; 0 violations in the exhaustive distinct cases.)',
      tiedReferences:'With ties those bounds are FALSE (counterexample below). Tie-aware statement: max shift <= 100*(2m+t-1)/(2(n+m-1)), t = size of the larger extreme tied block of the old reference. Derived for the extreme-block mechanism and verified exhaustively on small adversarial references (no violations; tight); not proven for all n.',
      contract:'Because the tie-aware form is verified only on small exhaustive cases, the safest production contract is to MEASURE the actual movement of published values whenever the reference version changes, with the closed forms as expectations.'},
    counterexample,exhaustiveCheck:{domain:'n=3..6 reference values in {0..4}, m=1..3 additions in {-1..5}; shifts evaluated at every old distinct value and every midpoint inside the old range',...brute},
    syntheticDistinct:{label:'MECHANICS ONLY: seeded standard-normal (distinct) populations, not FORCE grades',seed:20261007,samples},
    exampleReferenceVersion:{note:'Illustrates the identifier only; the population is the 2026 Week-4 final OL grades, which is NOT a historical reference.',id:K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{'model/live_profiles.js':Z0.PINS['model/live_profiles.js']},observations:T.map(t=>({season:2026,team:t,asOfWeek:4,finalGrade:gate[t].olIndex}))})}};

  // ---------- Revised owner decision package ----------
  const decision=[
    {q:'What exactly remains of B1?',a:'The season Y-1 legacy source fields behind every regressed prior: qb.epaoe/epa_per_play and qbIndex, ol.rating (pressure_rate_allowed, stuff_rate_allowed, avg_opp_dl), cov.rating, off_epa, receivers.adj_epa/targets, rb rush/adj fields, dl.run_stop_rate (and dl.pressure_rate as the pass-rush fallback). Their downstream rank definitions are largely recoverable; the fields themselves are not, and no producer exists in the repository or its history.'},
    {q:'What exactly remains of B2?',a:'Only historical receiver/RB reference populations for seasons before the committed 2025 reference. The current 2025 betas, centre and CDFs reproduce exactly.'},
    {q:'During which game counts/weeks does B3 matter?',a:'Weeks 2-11 (V99 fade > 0). k = 1 exactly in week 1 and from week 12. In the active window k is continuous: different preseason Elo changes week-2 k for 24 teams (max 0.0198) with no regime-class change.'},
    {q:'Is B4 a blocker, a policy decision, or both?',a:'Both: a hard blocker for historical-as-run provider selection; an owner policy decision for retrospective current-policy reconstruction (whose per-season coverage is not verified, and in which FTN is never ready with the public schema).'},
    {q:'Is any unit/year span defensibly assertable?',a:'No. The only defensible statement is a necessary lower bound: QB and OL cannot start before display season 2022 under current semantics (17-game Y-1 reference). No unit is assertable while B1 remains.'},
    {q:'What dynamic-record statements are valid under ties?',a:'For distinct references: 100/n per record and 100m/(n+m-1) per batch. With ties those bounds fail; the tie-aware form 100(2m+t-1)/(2(n+m-1)) holds on all exhaustive small cases but is not proven generally, so production should measure movement per reference version.'},
    {q:'Is the blocker registry complete enough for the intended research use?',a:'Yes for deciding the next step: it now separates current-reference reproducibility, k activity by week, provider semantics, the 17-game reference requirement and engineering literals, each with source anchors. It is not a replay engine.'},
    {q:'Does anything found eliminate the need to recover the legacy producer?',a:'No. Recoverable rank definitions and current-reference reproducibility do not regenerate the season Y-1 source fields.'},
    {q:'What is the single smallest owner decision required next?',a:'Determine whether the original legacy profile producer and its exact definitions can be supplied or recovered from outside this repository.'}];
  return {contracts,priorEvidence,coverage,currentReproduction,dynamic,decision};
}

export function serialize(a){const J=F.json;return {'contracts.json':J(a.contracts),'prior_reproducibility.json':J(a.priorEvidence),'coverage_matrix.json':J(a.coverage),'current_reproduction.json':J(a.currentReproduction),'dynamic_record.json':J(a.dynamic),'decision_package.json':J(a.decision)};}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('md08_final_grade_history/analyze.mjs')){
  const dir=process.argv[2],out=serialize(analyze());
  if(dir){fs.mkdirSync(dir,{recursive:true});for(const [f,s] of Object.entries(out))fs.writeFileSync(dir+'/'+f,s);console.log('wrote',Object.keys(out).join(', '));}
  else console.log(Object.fromEntries(Object.entries(out).map(([f,s])=>[f,s.length])));
}
