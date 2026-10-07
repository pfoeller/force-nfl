// MD-08 final-grade history build: evidence generator. Research only. No production
// code, formula, prior, stabilizer, weight, grade or presentation behavior changes.
import assert from 'node:assert/strict';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as Z0 from '../md08_unit_normalization/lib.mjs';
import * as X from '../md08_historical_standing_prototype/transforms.mjs';
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
  [DIR+'/results/source_listing.json']:'ef1d7cb7d4320452c77b4414a52df41c95e9608475b5d0ceee7618c6b0590898'
};
const {mean,correlation,close}=F;

function resolveAnchor(a){const [file,...rest]=a.split('#');const s=rest.join('#');const lines=F.lf(file).split('\n');const i=lines.findIndex(l=>l.includes(s));assert(i>=0,'anchor not found: '+a);return {file,line:i+1,match:s};}

export function analyze({pins=PINS}={}){
  for(const [p,h] of Object.entries(pins))assert.equal(F.hash(F.lf(p)),h,p+' pin');
  const ph=JSON.parse(F.lf('research/cycle9/md08_historical_standing_prototype/hashes.json'));
  for(const [f,h] of Object.entries(ph))assert.equal(F.hash(F.lf('research/cycle9/md08_historical_standing_prototype/'+f)),h,'prototype '+f);
  const {x,L,M,D,seam}=F.load();assert(seam.isIdentity());
  const Zt=x.teams,T=Object.keys(Zt).sort(),P=M.profiles;

  // ---------- Phase 1: dependency graphs with resolved code anchors ----------
  const contracts={transformVersion:K.TRANSFORM_VERSION,blockers:K.BLOCKERS,
    units:Object.fromEntries(Object.entries(K.UNITS).map(([u,v])=>[u,{label:v.label,...K.unitStatus(u),chain:v.chain.map(c=>({...c,anchor:resolveAnchor(c.anchor)}))}])),
    engineering:Object.fromEntries(Object.entries(K.ENGINEERING).map(([k,a])=>[k,resolveAnchor(a)])),
    asOfRule:'A season-Y week-g observation may use season-Y rows with week <= g (the production profileBeforeWeek filter, app.js) plus season Y-1 full-season inputs for priorSeason roles. Anything later is leakage.'};
  for(const u of Object.keys(K.UNITS))assert.equal(contracts.units[u].status,'BLOCKED',u+' expected BLOCKED');

  // ---------- Phase 2/3 evidence: the prior bundle is not reproducible from public raw data ----------
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
  const elo=JSON.parse(F.lf('research/season_end_elo.json')),e25=elo['2025'];
  const eloDiff=D.rankings.map(r=>Math.abs((e25[r.team]??e25[r.team==='LAR'?'LA':r.team])-r.elo));
  const priorEvidence={bundle:{path:'data/matchup-data.js',season:2025,firstCommit:'43d2c71 (Initial FORCE V149 web repository; history before V149 is not in Git)',changelog:'CHANGELOG_V4.md: "Added data/matchup-data.js ... packages 2025 model diagnostics"',generatorInRepository:false,
      playerLevelExamples:T.slice(0,4).map(t=>({team:t,qb:P[t].qb.qb,qbGames:P[t].qb.games,rb:P[t].rb.name,rbGames:P[t].rb.games}))},
    fieldReproducibility:fields,
    eloChain:{productionPreseasonSource:'data/model-data.js rankings (end-2025 Elo), regressed 30%',repositoryHistory:'research/season_end_elo.json seasons '+Object.keys(elo)[0]+'-'+Object.keys(elo).at(-1),maxAbsDiff2025:Math.max(...eloDiff),meanAbsDiff2025:mean(eloDiff),verdict:'not the same semantic chain'},
    conclusion:'No bundled prior field is reproduced exactly from public 2025 data (0 of 32 teams for every field tested). The fields are player-level, adjusted or legacy-ranked constructs whose generator is absent. Historical priors under current semantics are therefore BLOCKED (B1), as are receiver/RB live references (B2).'};

  // ---------- Phase 2: coverage matrix ----------
  const listing=JSON.parse(F.lf(DIR+'/results/source_listing.json'));
  const yrs=t=>{const s=listing.tags[t].seasons;return [s[0],s.at(-1)];};
  const coverage={sourceListing:{retrievedAt:listing.retrievedAt,source:listing.source},
    inputs:[
      {input:'nflverse play-by-play',source:'nflverse-data releases pbp',seasons:yrs('pbp'),committed:'2024/2025 only as derived fixture; V149 2025 windows',production:'2026 live; 2025 reference',semantics:'same definitions via force_server.py builders',reconstructibleAtDate:'yes (filter week <= g)',note:'Release revisions: the Cycle 7 and V149 2025 pins differ (2f135887 vs 8ce00018).'},
      {input:'nflverse weekly player stats',source:'nflverse-data releases stats_player',seasons:yrs('stats_player'),committed:'2026 weeks 1-3 cache',production:'2026 live',semantics:'same',reconstructibleAtDate:'yes'},
      {input:'nflverse weekly team stats',source:'nflverse-data releases stats_team',seasons:yrs('stats_team'),committed:'2026 weeks 1-3 cache',production:'2026 live',semantics:'same',reconstructibleAtDate:'yes'},
      {input:'PFR advanced weekly passing',source:'nflverse-data releases pfr_advstats',seasons:yrs('pfr_advstats'),committed:'2025 full, 2026 weeks 1-3 caches',production:'pass-rush provider (complete teams) and prior',semantics:'same',reconstructibleAtDate:'data yes; per-date completeness/readiness state no (B4)'},
      {input:'FTN charting',source:'nflverse-data releases ftn_charting',seasons:yrs('ftn_charting'),committed:'2026 cache',production:'first-choice pass-rush provider when ready',semantics:'same',reconstructibleAtDate:'data yes from 2022; readiness state no (B4)'},
      {input:'StatRankings pressure scrape',source:'statrankings.com (scraped HTML)',seasons:null,committed:'no',production:'pass-rush provider when fresh',semantics:'n/a',reconstructibleAtDate:'no historical archive (B4)'},
      {input:'Manual current pressure override',source:'data/pressure-current.manual.json',seasons:[2026,2026],committed:'yes (current only)',production:'highest-priority provider',semantics:'n/a',reconstructibleAtDate:'no history (B4)'},
      {input:'Bundled prior-season profiles',source:'data/matchup-data.js',seasons:[2025,2025],committed:'yes',production:'every unit prior; receiver/RB references',semantics:'legacy, generator absent',reconstructibleAtDate:'no (B1/B2)'},
      {input:'Preseason Elo / season engine',source:'data/model-data.js rankings',seasons:[2025,2025],committed:'yes',production:'core Elo -> V34 regime -> V37 prior games',semantics:'repository history differs (season_end_elo.json)',reconstructibleAtDate:'no verified chain (B3)'},
      {input:'nflverse schedules/results',source:'nflverse nfldata games.csv',seasons:null,committed:'2026 cache',production:'schedule, drives, freshness',semantics:'same',reconstructibleAtDate:'yes'}],
    unitSpans:{
      honest:'NONE: every intended displayed unit is BLOCKED for every historical season (B1, plus B2/B3/B4 by unit).',
      conditionalIfBlockersResolved:{
        olIndex:{earliest:2000,why:'pbp from 1999 gives the season Y-1 window reference'},
        qbIndex:{earliest:2007,why:'pbp CPOE from 2006 plus a 1-season reference burn-in'},
        receiverIndex:{earliest:2000,why:'player stats from 1999 plus burn-in, IF B1/B2 resolved by a reproducible prior/reference generator'},
        rbIndex:{earliest:2000,why:'as receivers'},
        defenseIndex:{earliest:'2019 with PFR pass rush (2018 burn-in) or 2023 with FTN (2022 burn-in); earlier only if the owner fixes a nflverse-weekly-only provider rule',why:'B4 provider semantics'},
        commonAllUnits:'2019+ (PFR-based pass rush) or 2023+ (FTN-ready semantics), conditional on B1-B4 resolution; not established'},
      burnIn:'Every unit needs season Y-1 as burn-in (prior and/or reference); burn-in seasons are not display-eligible. The Elo/regime chain needs a verified replay start before the first display season.'}};

  // ---------- Phase 5: current-state reproduction gate (as far as inputs exist) ----------
  const center=L.medianValue(Object.values(P).map(L.priorQbPassEpa).filter(Number.isFinite));
  const rbBeta=L.ridgeOrthogonalSlope(Object.values(P).map(p=>({x:L.priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),.5);
  const rbRef=Object.values(P).map(p=>L.priorRbOrthogonalComposite(p,rbBeta,center)).filter(Number.isFinite);
  const frozenCsv=Object.fromEntries(F.csv(Z0.DIR+'/results/current_unit_values.csv').map(r=>[r.team,r]));
  const gate={};let maxDisplay=0,maxCsv=0;
  for(const t of T){const z=Zt[t],g=k=>{const b=Z0.blendInputs(z,k);return [b.g,b.k];};
    const rbPrior=L.regressUnitIndex(L.continuousPercentileValue(rbRef,L.priorRbOrthogonalComposite(P[t],rbBeta,center),true),D.config.reversion);
    const fin={qbIndex:Z0.displayFromLive(L,z,'qbIndex',z.prior.qbIndex,z.liveGrade.qbIndex),olIndex:L.blend(z.prior.olIndex,z.liveGrade.olIndex,...g('olIndex')),
      receiverIndex:L.blend(z.prior.receiverIndex,z.liveGrade.receiverIndex,...g('receiverIndex')),rbIndex:L.blend(rbPrior,z.liveGrade.rbIndex,...g('rbIndex')),defenseIndex:L.defenseCompositeFrom(z.display)};
    gate[t]={};for(const [k,v] of Object.entries(fin)){const shown=seam.unitDisplayGrade({[k]:v},k);gate[t][k]=shown;
      if(k!=='rbIndex'){const d=Math.abs(shown-z.display[k]);maxDisplay=Math.max(maxDisplay,d);assert(d===0,t+' '+k+' differs from stored snapshot');}
      const dc=Math.abs(shown-Number(frozenCsv[t][k]));maxCsv=Math.max(maxCsv,dc);assert(dc<=5e-7,t+' '+k+' vs frozen post-correction CSV');}}
  const currentReproduction={layers:{
      priorPlusLiveToFinal:'REPRODUCED for qb/OL/receiver (stored snapshot, residual 0), RB (post-correction LIVE_FITTED frame vs frozen CSV, <=5e-7 rounding) and defense (composite recomputed from stored constituents, residual 0), all through the identity seam',
      rawToLive:'Reproduced in the accepted follow-up for OL and receivers from snapshot raw signals, and in Cycle 9 for QB components and RB; the raw->snapshot-raw step (PBP -> drive context) is production server code and was not re-run here',
      historicalInputs:'NOT ATTEMPTED: blocked inputs (B1-B4) make a raw-history gate impossible without substitution'},
    maxAbsResidualVsSnapshot:maxDisplay,maxAbsResidualVsFrozenCsv:maxCsv,teams:32};

  // ---------- Phase 9: dynamic-record mechanics (synthetic, mechanics only) ----------
  const R=F.rng(20261007),samples=[];
  for(const n of [64,160,320,640]){const pop=Array.from({length:n},()=>R.normal());const hi=Math.max(...pop)+1,lo=Math.min(...pop)-1;
    const d0=pop.map(v=>X.candidateA(pop,v)),dHi=pop.map(v=>X.candidateA([...pop,hi],v)),dLo=pop.map(v=>X.candidateA([...pop,lo],v));
    const season=Array.from({length:32},()=>R.normal()+.5),dS=pop.map(v=>X.candidateA([...pop,...season],v));
    const mx=a=>Math.max(...a.map((v,i)=>Math.abs(v-d0[i])));
    samples.push({n,newHighRecord:{maxShift:mx(dHi),bound:K.reanchorBound.oneRecord(n)},newLowRecord:{maxShift:mx(dLo),bound:K.reanchorBound.oneRecord(n)},newSeasonOf32:{maxShift:mx(dS),meanShift:mean(dS.map((v,i)=>Math.abs(v-d0[i]))),bound:K.reanchorBound.addObservations(n,32)}});}
  for(const s of samples){assert(s.newHighRecord.maxShift<=s.newHighRecord.bound+1e-9);assert(s.newLowRecord.maxShift<=s.newLowRecord.bound+1e-9);assert(s.newSeasonOf32.maxShift<=s.newSeasonOf32.bound+1e-9);}
  const dynamic={schema:K.METADATA_SCHEMA,boundsCandidateA:{oneNewRecord:'max shift of any existing value = 100/n',addMObservations:'max shift <= 100*m/(n+m-1)',table:[64,160,320,640].map(n=>({n,seasonsAt32PerSeason:n/32,oneRecord:K.reanchorBound.oneRecord(n),oneSeason:K.reanchorBound.addObservations(n,32)}))},
    syntheticCheck:{label:'MECHANICS ONLY: seeded standard-normal populations, not FORCE grades',seed:20261007,samples},
    exampleReferenceVersion:{note:'Illustrates the identifier only; the population is the 2026 Week-4 final OL grades, which is NOT a historical reference.',id:K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{'model/live_profiles.js':Z0.PINS['model/live_profiles.js']},observations:T.map(t=>({season:2026,team:t,asOfWeek:4,finalGrade:gate[t].olIndex}))})}};

  // ---------- Phase 12: decision package ----------
  const decision=[
    {q:'Can final canonical grades be replayed historically for every intended unit?',a:'No. QB, OL, receivers, RB and defense overall are all BLOCKED for every historical season under current semantics.'},
    {q:'Which units/years are blocked and why?',a:'All units, all years: B1 (prior bundle with no generator). Receivers and RB also B2 (live reference is the same bundle). All blended units B3 (preseason Elo / regime state for prior games). Defense B4 (pass-rush provider state).'},
    {q:'Maximum common historical span?',a:'None established. Conditional on resolving B1-B4: 2019+ with PFR-based pass rush or 2023+ with FTN-ready semantics, each needing a Y-1 burn-in.'},
    {q:'Deep enough for historical 0/100 semantics?',a:'Not assessable: there is no final-grade history. The prototype\'s two signal-layer seasons remain the only historical populations, and they are not final grades.'},
    {q:'Does Candidate A behave well on final grades?',a:'Not testable on historical final grades. On a single common reference it is monotone in the final grade by construction; the re-anchoring bounds are exact.'},
    {q:'S or C with deeper evidence?',a:'Not testable without final-grade history; unresolved.'},
    {q:'How much does dynamic re-anchoring move published values?',a:'Exactly bounded for Candidate A: one new record moves any value by at most 100/n (1.56 at n=64, 0.31 at n=320); one added season of 32 by at most 100*32/(n+31) (33.7 at n=64, 9.1 at n=320; measured on synthetic populations 11.5 and 1.7). Measured shifts on synthetic populations sit inside the bounds.'},
    {q:'What metadata/versioning is required?',a:'transformVersion, referenceVersion (sha256 of the canonical population serialization including model source hashes), unit, design (S/C), gameCount, asOf, population size and source-history span (schema in dynamic_record.json).'},
    {q:'Remaining owner decisions before implementation?',a:'(1) How to resolve B1/B2: recover the legacy matchup-data generator or authorize a new versioned prior/reference definition (a model change, outside MD-08). (2) A historical rule or verified replay for B3 (prior games / Elo chain). (3) A historical pass-rush provider policy for B4. Then (4) S vs C and (5) Candidate A adoption on real final-grade history.'},
    {q:'Ready for production-transform authorization?',a:'No. The blocking dependency is the prior/state reconstruction (B1-B3) and provider policy (B4); without them no final-grade historical population exists for the transform to use.'}];
  return {contracts,priorEvidence,coverage,currentReproduction,dynamic,decision};
}

export function serialize(a){const J=F.json;return {'contracts.json':J(a.contracts),'prior_reproducibility.json':J(a.priorEvidence),'coverage_matrix.json':J(a.coverage),'current_reproduction.json':J(a.currentReproduction),'dynamic_record.json':J(a.dynamic),'decision_package.json':J(a.decision)};}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('md08_final_grade_history/analyze.mjs')){
  const dir=process.argv[2],out=serialize(analyze());
  if(dir){const fs=await import('node:fs');fs.mkdirSync(dir,{recursive:true});for(const [f,s] of Object.entries(out))fs.writeFileSync(dir+'/'+f,s);console.log('wrote',Object.keys(out).join(', '));}
  else console.log(Object.fromEntries(Object.entries(out).map(([f,s])=>[f,s.length])));
}
