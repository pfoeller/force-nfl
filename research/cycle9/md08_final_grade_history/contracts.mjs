// MD-08 final-grade historical replay contracts. Research/data-infrastructure only:
// nothing in production imports this file. It records, for every displayed unit, the
// present-day canonical dependency chain (audited source-first against the current code),
// which inputs a historical replay needs, and which cannot be reconstructed under current
// semantics. A malformed or blocked replay request FAILS; nothing is substituted.
// Corrected after Codex review C of 25155a5.
import crypto from 'node:crypto';
import fs from 'node:fs';

// Canonical team identities: the production team set (data/model-data.js MODEL_DATA.teams).
let TEAMS=null;
export function canonicalTeams(){if(!TEAMS){const src=fs.readFileSync('data/model-data.js','utf8').replace(/^\s*window\.MODEL_DATA\s*=\s*/,'').replace(/;\s*$/,'');TEAMS=new Set(Object.keys(JSON.parse(src).teams));}return TEAMS;}

export const TRANSFORM_VERSION='md08-candidate-A-prototype-0';

// ---------- Blocker registry ----------
export const BLOCKERS={
  B1_LEGACY_PRIOR_SOURCE_FIELDS:{kind:'hard blocker',
    scope:'Season Y-1 team state behind every regressed unit prior (QB, OL, receivers, RB, coverage, run defense, scoring) and the bundle fallback of the pass-rush prior',
    missing:['qb.epaoe / qb.epa_per_play (primary-QB, games-played, adjusted)','qbIndex (not a rank of epaoe: max rank-percentile gap 9.7)','ol.rating -> olIndex (olIndex is the rank percentile of ol.rating; ol.rating itself comes from score_raw over pressure_rate_allowed, stuff_rate_allowed and avg_opp_dl)','cov.rating -> coverageIndex (rank percentile, recoverable downstream)','off_epa -> offenseIndex (rank percentile, recoverable downstream)','receivers.adj_epa and receivers.targets (subset, adjusted)','rb.rush_epa / adj_rush / adj_recv / targets (lead-back, adjusted)','dl.run_stop_rate','dl.pressure_rate (pass-rush prior fallback only)'],
    recoverable:'Downstream rank definitions: coverageIndex, frontIndex, receiverIndex and rushIndex equal the midrank percentile of cov.rating, dl.rating, receivers.adj_epa and rb.composite within rounding (max gap 0.05); olIndex and offenseIndex match ol.rating and off_epa ranks up to one tie (1.63).',
    notRecoverable:'The adjusted/legacy input fields themselves. No producer exists in the repository or its history (Git begins at the V149 import 43d2c71; CHANGELOG_V4 added the bundle as "2025 model diagnostics"). The Celo research archive the old research cites is external and not in the repository. No tested field reproduces from public 2025 play-by-play for any team (0/32 exact; correlations .68-.95).',
    consequence:'Season Y-1 priors cannot be generated for any historical season; using the 2025 bundle for an earlier season is future leakage.',
    resolution:'Owner: supply or recover the legacy producer and exact definitions from outside this repository (and verify it reproduces the 2025 bundle exactly), or separately authorize a new versioned prior definition (a model change outside MD-08).'},
  B2_HISTORICAL_RECEIVER_RB_REFERENCES:{kind:'hard blocker for earlier seasons',
    scope:'Receiver and RB live grades for seasons before the committed reference',
    currentReference:'REPRODUCIBLE FOR CURRENT REFERENCE: the 2025 ridge betas (WR .5880, RB from rb.adj_recv), the QB centre (.0615), the 32-team residual / LIVE_FITTED composite CDFs and medians reproduce exactly from the committed bundle with the production functions (all 32 receiver live grades reproduce with residual 0 in the accepted follow-up).',
    missing:'Semantically equivalent season Y-1 reference populations for earlier Y, because they are built from the B1 fields (receivers.adj_epa/targets, rb fields, qb.epaoe) of season Y-1.',
    resolution:'Same as B1.'},
  B3_ACTIVE_CONTINUITY_K:{kind:'blocker only while continuity k is active',
    scope:'Effective prior games k of every blended unit, weeks 2-11',
    fact:'k = FORCE_UNIT_PRIOR.effectivePriorGames(FORCE_RATING_CONTINUITY.rawCorrectionPoints(team, week, state)) (V37 on V99). V99 weekFade is 0 in week 1 and from week 12 on, so k = 1 exactly there. In weeks 2-11 k is continuous in the observation residuals, which come from core result-only Elo (preseason = end-(Y-1) Elo regressed 30% toward the mean) plus completed results, opponent Elo and config HFA/scale; no market input. Substituting the repository end-2025 Elo history changes week-2 k for 24 teams (max 0.0197653235) while every team\'s regime class is unchanged.',
    consequence:'Week 1 and week 12+ observations do not need reconstructed Elo state; week 2-11 observations need an exact current-semantics Elo chain ending at Y-1.',
    resolution:'A verified current-semantics Elo replay that reproduces data/model-data.js 2025 exactly, or a separate owner rule (not proposed here).'},
  B4_PASS_RUSH_PROVIDER:{kind:'hard blocker for historical-as-run; owner policy decision for retrospective current-policy',
    scope:'Pass-rush live grade, hence defense overall',
    cascade:'explicit manual override -> FTN play-level (contract ready: a pressure-outcome field and defensive identity; team rows cover all games) -> StatRankings scrape (fresh, team stats fresh) -> PFR (feed-level charting ready: >=16 rows, >=max(8,20%) advanced rows; team-level: weekly QB hits cannot exceed charted pressures; charted games >= games) -> nflverse weekly hit+sack disruption (team stats usable, dropbacks > 0) -> prior held. Weekly provider: current rank among all 32; PFR provider: same-length season Y-1 charted-window CDF; prior: season Y-1 PFR composite percentile when >=20 teams, else B1 bundle field.',
    historicalAsRun:'NOT RECONSTRUCTIBLE: feed readiness, PFR placeholder states, StatRankings freshness and manual overrides at each historical date are not archived (2026 Week 4 ran 28 weekly / 4 PFR because live PFR rows were partial).',
    retrospectiveCurrentPolicy:'POSSIBLY EXECUTABLE (owner policy): run today\'s cascade on today\'s published files. Manual and StatRankings are absent historically; the public FTN schema has no pressure-outcome field (2026 cache verified), so FTN is never ready unless historical schemas differ (not verified); PFR readiness would be evaluated on today\'s completed rows, so most teams would likely use PFR, unlike live 2026. Component coverage per season is NOT verified.',
    resolution:'Owner chooses replay semantics; no span is claimed until component coverage is verified.'},
  B5_LITERALS_AND_FILTERS:{kind:'engineering (auditable), not semantic',
    fact:'buildProfiles filters season 2026 (current rows) and 2025 (prior PFR); qbReferenceValid requires reference season 2025 and qb_id_source "2025-player-stats-positional".',
    resolution:'A replay harness must relabel consistently and be checked.'},
  B6_SEVENTEEN_GAME_REFERENCE:{kind:'semantic requirement (span-limiting)',
    fact:'The QB EPA/success CDF uses the season Y-1 17-game windows, and qbReferenceValid (app) and _v106_reference_valid (server) require >=30 17-game windows. A 16-game season Y-1 (1999-2020) yields none, so the reference is invalid: QB becomes unavailable (no fallback), while OL switches to its legacy bundle-percentile fallback route (still a finite grade, but B1-dependent).',
    consequence:'QB needs Y-1 >= 2021, i.e. display season >= 2022 (necessary lower bound). For OL, 2022 bounds only the reference-backed route; the fallback route is not bounded by B6 but depends on B1, so no OL span is assertable.'}
};

// ---------- k behavior (source: model/rating_continuity.js V99, model/unit_prior_controller.js V37) ----------
export const V99_WEEK_FADE={1:0,2:1,3:1,4:.85,5:.70,6:.55,7:.40,8:.28,9:.18,10:.10,11:.05,12:0};
export function kStatus(week){const w=Math.floor(Number(week));const fade=w>12?0:(V99_WEEK_FADE[w]??0);
  return fade===0?{week:w,fade,k:'1 exactly (fixed)',needsEloState:false}:{week:w,fade,k:'k = 1 - 0.75*min(|c|/7,1) in [0.25, 1], where c is the signed recency-weighted V99 correction; k = 1 exactly when c = 0 (no observations, all excesses zero, or opposing signed excesses cancelling, e.g. residuals [8,-6])',needsEloState:true};}

// ---------- Dependency graphs (present-day canonical chain; audited source-first) ----------
// role: 'current' = season Y rows through the as-of week; 'priorSeason' = season Y-1;
// 'fixed' = constant/config. status: REPRODUCIBLE | BLOCKED | CONDITIONAL.
const C=(component,role,source,status,anchor,note='',blocker=null,extra={})=>({component,role,source,status,anchor,note,blocker,...extra});
const K_COMPONENT=C('Effective prior games k (V37 on V99 continuity; fixed 1 in week 1 and week 12+)','current','core Elo from end-(Y-1) preseason Elo + completed results','CONDITIONAL','assets/app.js#effectivePriorGames','Blocked only in weeks 2-11 (B3).','B3_ACTIVE_CONTINUITY_K');
export const UNITS={
  qbIndex:{label:'QB',chain:[
    C('All-play QB EPA/play (dropbacks + QB runs, downs 1-4)','current','nflverse pbp via server drive context','REPRODUCIBLE','model/live_profiles.js#const qbEpaPerPlay='),
    C('Actual-pass success rate','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#const qbPassSuccessRate='),
    C('ANY/A (current rank)','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#const qbAnyA='),
    C('CPOE (attempt-weighted passing_cpoe; tanh vs current mean; 60-attempt stabilizer)','current','nflverse weekly player stats passing_cpoe','CONDITIONAL','model/live_profiles.js#const qbCpoe=','Season coverage of passing_cpoe not verified.'),
    C('Rushing bonus','current','nflverse pbp QB rushes','REPRODUCIBLE','model/live_profiles.js#function qbRushingBonus'),
    C('V139 opponent adjustment: leave-one-matchup-out FORCE QB Rating allowed (other teams\' per-game ratings vs each opponent, dropback-weighted, 100-dropback stabilized toward 50); adjustment 4*(50-allowed)/50','current','current-season per-game QB ratings (same pipeline)','REPRODUCIBLE','model/live_profiles.js#raw[t].qbOpponentRatingAdjustment=','Active path. qbOpponentEpaAdjustment is set to 0 and is inactive/diagnostic.'),
    C('V137 pressure adjustment: standard-rush (<=4 rushers) hit-or-sack protection difficulty (current rank) plus QB performance on disrupted dropbacks (70% EPA, 30% success rank, sample-stabilized)','current','nflverse pbp standard-rush and pressure plays','REPRODUCIBLE','model/live_profiles.js#const qbOlRatingAdjustment=','Active path (qbStandardRushPressureAdjustment + qbPressurePerformanceAdjustment). pressureEpaDrop / cleanEpaPerPlay are diagnostic only.'),
    C('Stabilization toward current league means (EPA 150 plays, success 100, CPOE 60)','current','current season','REPRODUCIBLE','model/live_profiles.js#qbStabilizedEpa'),
    C('EPA/success CDF reference (season Y-1 17-game windows)','priorSeason','V149-style reference from Y-1 pbp + Y-1 player-stat QB ids','CONDITIONAL','force_server.py#def _v104_reference_from_drive_games(','Requires a 17-game season Y-1 (B6); without it QB is unavailable (no fallback).','B6_SEVENTEEN_GAME_REFERENCE',{windowRule:'fixed17'}),
    C('Composite x1.20 expansion and clamp','fixed','constants','REPRODUCIBLE','model/live_profiles.js#const QB_COMPOSITE_EXPANSION'),
    C('Prior: regressed bundled qbIndex','priorSeason','data/matchup-data.js (2025 only)','BLOCKED','model/live_profiles.js#const priorQbIndex=','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    K_COMPONENT,
    C('V148 recency (+/-4) after blend, final clamp','current','weekly QB game rows','REPRODUCIBLE','assets/app.js#qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency))')]},
  olIndex:{label:'Offensive line',chain:[
    C('Hit-or-sack disruption per dropback','current','nflverse pbp','REPRODUCIBLE','force_server.py#disrupted=_pbp_truthy(row.get(\'sack\')) or _pbp_truthy(row.get(\'qb_hit\'))'),
    C('Live route 1 - same-length window CDF (season Y-1 reference)','priorSeason','V149-style windows from Y-1 pbp','CONDITIONAL','model/live_profiles.js#const olHistoricalBench=','Valid only when the season Y-1 reference is valid (17-game season, B6).','B6_SEVENTEEN_GAME_REFERENCE',{windowRule:'sameLength'}),
    C('Live route 2 - legacy fallback: percentile of the rate among bundled ol.pressure_rate_allowed','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#priorPercentile(priorProfiles, (p)=>p?.ol?.pressure_rate_allowed','Used when the reference is invalid or has <100 windows; yields a finite grade but depends on B1. Alternative to route 1 (one of the two is supplied).','B1_LEGACY_PRIOR_SOURCE_FIELDS',{alternativeTo:'Live route 1 - same-length window CDF (season Y-1 reference)'}),
    C('Prior: regressed bundled olIndex','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#const priorOlIndex=','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    K_COMPONENT,
    C('Blend','fixed','blend(prior, live, statGames, k)','REPRODUCIBLE','model/live_profiles.js#const olIndex=teamStatsUsable ? blend(')]},
  receiverIndex:{label:'Receivers',chain:[
    C('WR/TE EPA/target','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#const receiverRoomTargets=sum(recRows,\'targets\');'),
    C('Sack-free QB attempt EPA','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#const qbAttemptEpa='),
    C('Ridge beta and QB centre (fitted on season Y-1 profiles)','priorSeason','bundle (current 2025: reproducible)','BLOCKED','model/live_profiles.js#function ridgeOrthogonalSlope','Reproducible for the current 2025 reference only.','B2_HISTORICAL_RECEIVER_RB_REFERENCES'),
    C('Stabilization 80 targets, centre alignment','current','current season','REPRODUCIBLE','model/live_profiles.js#r.receiverStabilizedResidual=stabilizeToward('),
    C('Live CDF reference (32 season Y-1 residuals)','priorSeason','bundle (current 2025: reproducible)','BLOCKED','model/live_profiles.js#continuousPercentileValue(priorReceiverResidualValues','Reproducible for the current 2025 reference only.','B2_HISTORICAL_RECEIVER_RB_REFERENCES'),
    C('Prior: regressed residual percentile','priorSeason','bundle','BLOCKED','model/live_profiles.js#const priorReceiverIndex=','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    K_COMPONENT,
    C('Blend','fixed','blend','REPRODUCIBLE','model/live_profiles.js#const receiverIndex=playerStatsUsable ? blend(')]},
  rbIndex:{label:'RB',chain:[
    C('RB/FB rushing EPA/carry','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#rbRushEpa'),
    C('RB receiving EPA/target and QB attempt EPA','current','nflverse weekly player stats + pbp','REPRODUCIBLE','model/live_profiles.js#const rbRecvResidual='),
    C('RB receiving ridge beta (fitted on season Y-1 profiles)','priorSeason','bundle (current 2025: reproducible)','BLOCKED','model/live_profiles.js#rbRecvPassBeta','Reproducible for the current 2025 reference only.','B2_HISTORICAL_RECEIVER_RB_REFERENCES'),
    C('Stabilization 50 carries / 40 targets, alignment','current','current season','REPRODUCIBLE','model/live_profiles.js#rbStabilizedRushEpa'),
    C('Live CDF reference (LIVE_FITTED season Y-1 composites)','priorSeason','bundle (current 2025: reproducible)','BLOCKED','model/live_profiles.js#priorRbOrthogonalValuesV109','Reproducible for the current 2025 reference only.','B2_HISTORICAL_RECEIVER_RB_REFERENCES'),
    C('Prior: regressed LIVE_FITTED composite percentile','priorSeason','bundle','BLOCKED','model/live_profiles.js#const priorRbIndex=','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    K_COMPONENT,
    C('Blend','fixed','blend','REPRODUCIBLE','model/live_profiles.js#const rbIndex=')]},
  defenseIndex:{label:'Defense overall',chain:[
    C('Coverage: .75 EPA-allowed rank + .25 CPOE-allowed rank (attempt-weighted passing_cpoe)','current','nflverse pbp / weekly stats','CONDITIONAL','model/live_profiles.js#const liveCov=teamStatsUsable','passing_cpoe season coverage not verified.'),
    C('Coverage prior: regressed bundled coverageIndex','priorSeason','bundle','BLOCKED','model/live_profiles.js#const priorCoverageIndex=','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    C('Pass rush: provider cascade (manual -> FTN -> StatRankings -> PFR -> nflverse weekly)','current','see B4','BLOCKED','model/live_profiles.js#const selectedPassRush=','Historical-as-run blocked; retrospective current-policy is an owner policy decision.','B4_PASS_RUSH_PROVIDER'),
    C('Pass-rush prior: season Y-1 PFR composite percentile (>=20 teams), else bundled dl.pressure_rate percentile','priorSeason','nflverse pfr_advstats / bundle','CONDITIONAL','model/live_profiles.js#const priorPassRushByTeam','PFR branch needs Y-1 PFR (2018+); the fallback is B1.'),
    C('Run defense: opponent rush EPA rank (incl. QB runs)','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#const runDefenseIndex='),
    C('Run-defense prior: regressed percentile of bundled dl.run_stop_rate','priorSeason','bundle','BLOCKED','model/live_profiles.js#const priorRunDefenseByTeam','','B1_LEGACY_PRIOR_SOURCE_FIELDS'),
    C('Prevention: opponent points/drive rank, prior fixed 50, k = 1','current','nflverse pbp drives','REPRODUCIBLE','model/live_profiles.js#const priorPointsAllowedPerDriveIndex=50;'),
    K_COMPONENT,
    C('Composite .36/.16/.28/.20, soft-tail softness 42','fixed','constants','REPRODUCIBLE','model/live_profiles.js#const DEFENSE_WEIGHTS')]}
};
export const ENGINEERING={B5_SEASON_FILTER:'model/live_profiles.js#String(r.season)===\'2026\'',B5_REFERENCE_SEASON:'model/live_profiles.js#ref?.season===2025'};

// Earlier assumptions found stale in the source-first audit (recorded, not silently fixed).
export const STALE=[
  {was:'k comes from the V34/V37 early-regime state that fades to zero by week 7',now:'Production uses the V99 rating-continuity layer (FORCE_RATING_CONTINUITY, preferred over V34 when present): fade 1.0 in weeks 2-3, tapering to 0.05 in week 11, 0 from week 12; week 1 is 0.',source:'model/rating_continuity.js, assets/app.js regimeRawCorrectionPoints'},
  {was:'B3 blocks every observation',now:'k = 1 exactly in week 1 and week 12+; Elo state matters only in weeks 2-11.',source:'model/rating_continuity.js weekFade'},
  {was:'QB effective prior games are floored at 1.00 through four games',now:'That floor applies only under qbPolicy v104-historical-calibrated; production runs v106-current-season-stabilized, so qbPriorGames = the team k.',source:'model/live_profiles.js qbPriorGames; assets/app.js qbPolicy'},
  {was:'Receiver/RB betas and reference CDFs are not reproducible',now:'They reproduce exactly for the current 2025 reference; only earlier-season references are blocked.',source:'model/live_profiles.js ridgeOrthogonalSlope/priorReceiverResidual; follow-up reproduction'},
  {was:'RB receiving residual is a single mixed current+prior component',now:'Split into current receiving inputs and the season Y-1 ridge beta.',source:'model/live_profiles.js rbRecvResidual / rbRecvPassBeta'},
  {was:'QB and OL references need only season Y-1 play-by-play (QB 2007+, OL 2000+)',now:'Both need a valid V149-style reference, which requires >=30 17-game windows (a 17-game season Y-1, 2021+); QB is unavailable and OL falls back to the bundle otherwise.',source:'model/live_profiles.js qbReferenceValid; force_server.py _v106_reference_valid'},
  {was:'FTN is the first-choice pass-rush provider from 2022',now:'FTN is selected only when the feed has a pressure-outcome field; the public nflverse FTN schema (2026 cache) has none, so FTN is not ready.',source:'model/live_profiles.js ftnPressureField / ftnPressureContract; data/live-cache ftn-charting header'},
  {was:'Pass-rush provider state is a single hard blocker',now:'Hard blocker for historical-as-run selection; retrospective current-policy selection is a possible owner policy.',source:'model/live_profiles.js provider cascade'},
  {was:'k = 1 in the active window only if every recent residual is within 3 points',now:'k = 1 exactly when the signed recency-weighted correction is 0; opposing surprises can cancel (residuals [8,-6] give 0 with neutral opponents).',source:'model/rating_continuity.js rawCorrectionPoints; model/unit_prior_controller.js effectivePriorGames'},
  {was:'QB opponent adjustment = V139 coverage-allowed / qbOpponentEpaAdjustment',now:'qbOpponentEpaAdjustment is set to 0; the active V139 term is qbOpponentRatingAdjustment from leave-one-matchup-out FORCE QB Rating allowed.',source:'model/live_profiles.js'},
  {was:'QB pressure context = pressureEpaDrop',now:'pressureEpaDrop is diagnostic; the active V137 term is qbOlRatingAdjustment = standard-rush protection difficulty + QB performance on disrupted dropbacks.',source:'model/live_profiles.js'},
  {was:'OL cannot start before display season 2022',now:'2022 bounds only the reference-backed OL route; with an invalid reference OL uses the B1-dependent bundle-percentile fallback and still produces a finite grade.',source:'model/live_profiles.js stableOlPass'},
  {was:'Season literals are confined to buildProfiles filters',now:'qbReferenceValid also requires reference season 2025 and the 2025 QB-id source label.',source:'model/live_profiles.js qbReferenceValid'}];

export function unitStatus(unit){const bl=[...new Set(UNITS[unit].chain.filter(c=>c.status==='BLOCKED').map(c=>c.blocker))];return {unit,status:bl.length?'BLOCKED':'REPLAYABLE',blockers:bl};}

// ---------- Replay-plan validator: rejects malformed plans before any replay attempt ----------
// plan = {unit, team, season, asOfWeek, gameCount, inputs:[{component, role, season, throughWeek, games, source, kind}]}
const ROLES=new Set(['current','priorSeason']);
export function validateShape(plan){
  const errs=[];const U=UNITS[plan?.unit];if(!U)return ['unknown unit '+plan?.unit];
  if(typeof plan.team!=='string'||!canonicalTeams().has(plan.team))errs.push('missing or non-canonical observation team '+plan.team);
  if(!Number.isInteger(plan.season)||plan.season<1999)errs.push('invalid season');
  if(!Number.isInteger(plan.asOfWeek)||plan.asOfWeek<1||plan.asOfWeek>18)errs.push('invalid as-of week');
  if(!('gameCount' in plan)||plan.gameCount==null)errs.push('missing game count');
  else if(!Number.isInteger(plan.gameCount)||plan.gameCount<1||plan.gameCount>17)errs.push('invalid game count');
  else if(Number.isInteger(plan.asOfWeek)&&plan.gameCount>plan.asOfWeek)errs.push('game count exceeds as-of week');
  const seen=new Set();
  for(const i of plan.inputs||[]){
    const comp=U.chain.find(c=>c.component===i.component);
    if(!comp){errs.push('unknown component '+i.component);continue;}
    if(seen.has(i.component))errs.push('duplicated input '+i.component);seen.add(i.component);
    if(!ROLES.has(i.role))errs.push('invalid role '+i.role+' for '+i.component);
    else if(i.role!==comp.role)errs.push('role mismatch for '+i.component+' ('+i.role+' vs '+comp.role+')');
    if(!Number.isInteger(i.season))errs.push('missing season for '+i.component);
    if(comp.role==='current'){
      if(i.season!==plan.season)errs.push('wrong season for '+i.component);
      if(!Number.isInteger(i.throughWeek)||i.throughWeek<1)errs.push('null or invalid week for '+i.component);
      else if(i.throughWeek>plan.asOfWeek)errs.push('future leakage in '+i.component);
      if(i.games!=null&&i.games!==plan.gameCount)errs.push('wrong game-count window for '+i.component);}
    if(comp.role==='priorSeason'){
      if(i.season!==plan.season-1)errs.push('wrong prior season for '+i.component+' (need '+(plan.season-1)+')');
      // A prior-season input is a full-season object: no as-of week, explicit full-season scope.
      if(i.throughWeek!=null)errs.push('prior-season input must not carry a week ('+i.component+')');
      if(i.scope!=='full-season')errs.push('prior-season input must declare scope full-season ('+i.component+')');
      if(comp.windowRule==='fixed17'&&i.windowGames!==17)errs.push('reference window must be 17 games for '+i.component);
      if(comp.windowRule==='sameLength'&&i.windowGames!==plan.gameCount)errs.push('reference window must equal the game count for '+i.component);
      if(!comp.windowRule&&i.windowGames!=null)errs.push('unexpected window on '+i.component);}
    if(i.kind==='signal-substitute'||i.kind==='proxy')errs.push('substituted '+i.kind+' for '+i.component);
    if(comp.status==='BLOCKED'&&!/^owner-authorized:/.test(String(i.source)))errs.push('blocked component '+i.component+' supplied from '+i.source);}
  for(const c of U.chain){if(c.role==='fixed'||seen.has(c.component))continue;
    const alt=U.chain.find(o=>o.alternativeTo===c.component||c.alternativeTo===o.component);if(alt&&seen.has(alt.component))continue;
    errs.push('missing component '+c.component);}
  for(const c of U.chain)if(c.alternativeTo&&seen.has(c.component)&&seen.has(c.alternativeTo))errs.push('both live routes supplied for '+plan.unit);
  return errs;
}
export function validatePlan(plan){const e=validateShape(plan);if(e.length&&/^unknown unit/.test(e[0]))return e;const st=unitStatus(plan.unit);
  const blk=[];if(st.status==='BLOCKED')blk.push('BLOCKED: '+st.blockers.join(', '));
  if(Number.isInteger(plan.asOfWeek)&&kStatus(plan.asOfWeek).needsEloState)blk.push('B3: as-of week '+plan.asOfWeek+' needs reconstructed Elo state');
  return [...e,...blk];}
export function replayFinalGrade(plan){const e=validateShape(plan);if(e.length)throw new Error('MALFORMED PLAN: '+e.join('; '));const b=validatePlan(plan);if(b.length)throw new Error('REPLAY REFUSED: '+b.join('; '));throw new Error('No replay engine is authorized while blockers remain');}

// ---------- Dynamic-record versioning (schema + mechanics; no persistence) ----------
export const METADATA_SCHEMA={transformVersion:'string, e.g. '+TRANSFORM_VERSION,referenceVersion:'sha256 of the canonical population serialization below',unit:'canonical key',design:"'S' (first g games) | 'C' (any g-game window)",gameCount:'integer g',asOf:'ISO date of the newest observation included',population:'n observations',sourceHistorySpan:'[firstSeason, lastSeason]',modelSemantics:'model source hashes the population was replayed under',
  canonicalSerialization:'newline-joined lines: transform=, unit=, design=, gameCount=, model=<sorted key=hash list>, then one line per observation sorted by (season, team, asOfWeek): season|team|asOfWeek|finalGrade, numbers as shortest round-trip decimals; every observation validated (finite grade, canonical team, season >= 1999, week 1-18, unique identity) before hashing'};
// Observations are validated BEFORE hashing. Numbers are serialized only after a finiteness
// check, as ECMAScript shortest round-trip decimal strings (Number.prototype.toString; -0 -> "0"),
// so NaN/Infinity/undefined can never collapse to null or disappear.
export function validateReferenceInput({unit,design,gameCount,modelSemantics,observations}){
  const errs=[];
  if(!UNITS[unit])errs.push('unknown unit');
  if(design!=='S'&&design!=='C')errs.push('invalid design');
  if(!Number.isInteger(gameCount)||gameCount<1||gameCount>17)errs.push('invalid game count');
  if(!modelSemantics||typeof modelSemantics!=='object'||Object.values(modelSemantics).some(v=>typeof v!=='string'))errs.push('invalid model semantics');
  if(!Array.isArray(observations)||!observations.length)errs.push('no observations');
  const keys=new Set();
  (observations||[]).forEach((o,i)=>{
    if(!Number.isInteger(o?.season)||o.season<1999)errs.push('observation '+i+': invalid season');
    if(typeof o?.team!=='string'||!canonicalTeams().has(o.team))errs.push('observation '+i+': invalid team');
    if(!Number.isInteger(o?.asOfWeek)||o.asOfWeek<1||o.asOfWeek>18)errs.push('observation '+i+': invalid week');
    if(typeof o?.finalGrade!=='number'||!Number.isFinite(o.finalGrade))errs.push('observation '+i+': non-finite grade');
    const k=o?.season+'|'+o?.team+'|'+o?.asOfWeek;if(keys.has(k))errs.push('observation '+i+': duplicate identity');keys.add(k);});
  return errs;}
const num=x=>Object.is(x,-0)?'0':String(x);
export function referenceVersion(ref){
  const errs=validateReferenceInput(ref);if(errs.length)throw new Error('INVALID REFERENCE: '+errs.join('; '));
  const obs=ref.observations.map(o=>[o.season,o.team,o.asOfWeek,o.finalGrade]).sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1])||a[2]-b[2]);
  const ms=Object.keys(ref.modelSemantics).sort().map(k=>k+'='+ref.modelSemantics[k]).join(',');
  const canon=['transform='+TRANSFORM_VERSION,'unit='+ref.unit,'design='+ref.design,'gameCount='+ref.gameCount,'model='+ms,...obs.map(o=>[num(o[0]),o[1],num(o[2]),num(o[3])].join('|'))].join('\n');
  return crypto.createHash('sha256').update(canon).digest('hex');}
// Candidate A requires a non-degenerate reference: at least two distinct finite values. With no
// ordering there is no historical standing to express (worst = best), so the scale is undefined.
export function validateReferencePopulation(values){const v=(values||[]).filter(x=>typeof x==='number'&&Number.isFinite(x));
  if(v.length!==(values||[]).length)return ['non-finite value in reference'];return new Set(v).size>=2?[]:['degenerate reference: fewer than two distinct values'];}
// Re-anchoring of previously displayed values (old-population values) under Candidate A.
// distinctOnly: valid when the old reference and the added observations are all distinct values.
// tieAware: t = size of the larger extreme (worst or best) tied block of the old reference;
//   derived for the extreme-block mechanism and verified exhaustively only on NON-DEGENERATE
//   old references (>= 2 distinct values; n = 3-6, values 0-4, m = 1-3 additions in -1..5);
//   NOT proven for every reference size. Degenerate (all-equal) references are invalid for
//   Candidate A (validateReferencePopulation); e.g. [1,1,1] + [0] moves 1 from 0 to 100.
export const reanchorBound={
  distinctOneRecord:n=>100/n,
  distinctAdd:(n,m)=>100*m/(n+m-1),
  tieAware:(n,m,t)=>100*(2*m+t-1)/(2*(n+m-1))};
export function extremeTieBlock(ref){const s=[...ref].sort((p,q)=>p-q);let top=1,bot=1;while(top<s.length&&s[s.length-1-top]===s.at(-1))top++;while(bot<s.length&&s[bot]===s[0])bot++;return Math.max(top,bot);}

// Validator history (Codex review C): what the 25155a5 validator let through at the input layer.
export const VALIDATOR_HISTORY=[
  {probe:'mixed-role component (RB receiving residual declared current+priorSeason)',before:'Passed input validation: the role was neither current nor priorSeason, so no season/week/prior-year rule ran.',stoppedAt:'Only the unit-level BLOCKED status in validatePlan/replayFinalGrade.',now:'validateShape rejects an invalid or mismatched role; the RB component is split into current inputs and the season Y-1 beta.'},
  {probe:'null throughWeek on a current input',before:'Passed: null <= asOfWeek evaluates true in JavaScript, so the future-leakage test was satisfied.',stoppedAt:'Only the unit-level BLOCKED status.',now:'validateShape requires an integer week >= 1 before the leakage comparison.'},
  {probe:'missing observation identity / null as-of week / game count above as-of week',before:'Not checked.',stoppedAt:'Only the unit-level BLOCKED status.',now:'Rejected by validateShape.'}];
