// MD-08 final-grade historical replay contracts. Research/data-infrastructure only:
// nothing in production imports this file. It records, for every displayed unit, the
// complete present-day canonical dependency chain, which inputs a historical replay
// needs, and which of them cannot be reconstructed under current semantics. A replay
// request that touches a blocked component FAILS; nothing is substituted.
import crypto from 'node:crypto';

export const TRANSFORM_VERSION='md08-candidate-A-prototype-0';

// ---------- Blocker registry ----------
export const BLOCKERS={
  B1_LEGACY_PRIOR_BUNDLE:{scope:'Every unit prior except prevention (fixed 50) and the PFR pass-rush prior',
    fact:'Unit priors are regressed fields of data/matchup-data.js (season 2025 only). The bundle was added in CHANGELOG_V4 as "2025 model diagnostics"; no generator exists in the repository (local Git begins at the V149 import). Its fields are legacy constructs: primary-QB epaoe/epa_per_play with games played, lead-RB rush/receiving "adj" values, a receiver subset with its own target counts, legacy olIndex/qbIndex/coverageIndex/offenseIndex ranks of unpublished score_raw values, dl.run_stop_rate. They do not reproduce from public 2025 play-by-play (results/prior_reproducibility.json).',
    consequence:'A season-Y replay needs the same fields for season Y-1. They cannot be generated under current semantics, and using the 2025 bundle for any earlier season would be future leakage.',
    resolution:'Owner decision: recover the legacy generator (if it exists outside the repository) or authorize a new, versioned prior definition (a model change outside MD-08).'},
  B2_LEGACY_REFERENCE_POPULATION:{scope:'Receiver and RB LIVE grades (and therefore their final grades)',
    fact:'The receiver and RB live maps use the 32 bundled 2025 profiles as their reference CDF and median (priorReceiverResidual / priorRbOrthogonalComposite over M.profiles), and the ridge beta is fitted on the same bundle.',
    consequence:'Even the live grade of a historical season needs a season Y-1 bundle in the legacy schema.',
    resolution:'Same as B1.'},
  B3_PRESEASON_ELO_STATE:{scope:'Effective prior games k for every blended unit (V37 controller)',
    fact:'k comes from the V34 early-regime state, built from core (result-only) Elo replayed from the regressed preseason ratings in data/model-data.js (end-2025). The only repository Elo history (research/season_end_elo.json, 2008-2025) differs from those ratings by up to 10.7 points in 2025, so it is not the same semantic chain.',
    consequence:'k for week g of season Y cannot be reproduced exactly without a verified current-semantics Elo chain ending at Y-1.',
    resolution:'A separate, verified Elo replay that reproduces data/model-data.js 2025 exactly, or an owner rule for historical k.'},
  B4_PASS_RUSH_PROVIDER_STATE:{scope:'Pass rush, hence defense overall',
    fact:'The live pass-rush provider is selected per team at run time: manual override, FTN play-level (when ready), StatRankings scrape (fresh), complete PFR charting, then nflverse weekly disruption. The 2026 Week-4 snapshot used nflverse weekly for 28 teams and PFR for 4. StatRankings has no archive; FTN exists only from 2022; PFR from 2018; readiness/completeness at historical dates is not archived.',
    consequence:'Which provider a historical team-week would have used is undetermined, and different providers map to different populations.',
    resolution:'Owner rule fixing the historical provider policy, or restricting history to a provider-stable span.'},
  B5_SEASON_LITERALS:{scope:'All units (engineering, not semantic)',
    fact:'buildProfiles filters rows with the literal seasons 2026 (current) and 2025 (prior PFR).',
    consequence:'A replay harness must relabel historical rows; harmless if done consistently, but it must be audited.',
    resolution:'Harness relabelling with a checker; no formula change.'}
};

// ---------- Dependency graphs (present-day canonical chain, current policies) ----------
// role: 'current' = season Y through the as-of week; 'priorSeason' = season Y-1 full season;
// 'fixed' = a constant; status: REPRODUCIBLE | BLOCKED | CONDITIONAL.
const C=(component,role,source,status,anchor,note='',blocker=null)=>({component,role,source,status,anchor,note,blocker});
export const UNITS={
  qbIndex:{label:'QB',chain:[
    C('All-play QB EPA/play (dropbacks + QB runs, downs 1-4)','current','nflverse pbp (server drive context)','REPRODUCIBLE','model/live_profiles.js#qbEpaPerPlay'),
    C('Actual-pass success rate','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#qbPassSuccessRate'),
    C('ANY/A (current rank)','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#qbAnyA'),
    C('CPOE (tanh vs current mean, 60-attempt stabilizer)','current','nflverse weekly player stats passing_cpoe (pbp cpoe from 2006)','REPRODUCIBLE','model/live_profiles.js#function qbCpoeScore'),
    C('Rushing bonus','current','nflverse pbp QB rushes','REPRODUCIBLE','model/live_profiles.js#function qbRushingBonus'),
    C('V139 leave-one-matchup-out opponent adjustment','current','current-season coverage allowed','REPRODUCIBLE','model/live_profiles.js#qbOpponentEpaAdjustment'),
    C('V137 pressure context','current','nflverse pbp pressure plays','REPRODUCIBLE','model/live_profiles.js#pressureEpaDrop'),
    C('Stabilization toward current league means (150/100/60)','current','current season','REPRODUCIBLE','model/live_profiles.js#qbStabilizedEpa'),
    C('EPA/success CDF reference (17-game windows)','priorSeason','V149-style reference rebuilt from season Y-1 pbp + player-stat QB ids','REPRODUCIBLE','force_server.py#def _v104_reference_from_drive_games('),
    C('Composite x1.20 expansion and clamp','fixed','constants','REPRODUCIBLE','model/live_profiles.js#const QB_COMPOSITE_EXPANSION'),
    C('Prior: regressed bundled qbIndex','priorSeason','data/matchup-data.js (legacy, 2025 only)','BLOCKED','model/live_profiles.js#const priorQbIndex=','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Effective prior games (QB floor 1.00 through 4 games)','current','V34/V37 regime state on core Elo','BLOCKED','assets/app.js#effectivePriorGames','',`B3_PRESEASON_ELO_STATE`),
    C('V148 recency (+/-4) after blend, final clamp','current','weekly QB game rows','REPRODUCIBLE','assets/app.js#qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency))')]},
  olIndex:{label:'Offensive line',chain:[
    C('Hit-or-sack disruption per dropback','current','nflverse pbp','REPRODUCIBLE','force_server.py#disrupted=_pbp_truthy(row.get(\'sack\')) or _pbp_truthy(row.get(\'qb_hit\'))'),
    C('Same-length window CDF','priorSeason','V149-style windows rebuilt from season Y-1 pbp','REPRODUCIBLE','model/live_profiles.js#const olHistoricalBench='),
    C('Prior: regressed bundled olIndex','priorSeason','data/matchup-data.js (legacy, 2025 only)','BLOCKED','model/live_profiles.js#const priorOlIndex=','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Effective prior games','current','V34/V37 regime state on core Elo','BLOCKED','assets/app.js#effectivePriorGames','',`B3_PRESEASON_ELO_STATE`),
    C('Blend','fixed','blend(prior, live, statGames, k)','REPRODUCIBLE','model/live_profiles.js#const olIndex=teamStatsUsable ? blend(')]},
  receiverIndex:{label:'Receivers',chain:[
    C('WR/TE EPA/target','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#const receiverRoomTargets=sum(recRows,\'targets\');'),
    C('Sack-free QB attempt EPA','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#qbAttemptEpa'),
    C('Ridge beta and QB centre','priorSeason','fitted on bundled 2025 profiles','BLOCKED','model/live_profiles.js#ridgeOrthogonalSlope','',`B2_LEGACY_REFERENCE_POPULATION`),
    C('Stabilization 80 targets, centre alignment','current','current season','REPRODUCIBLE','model/live_profiles.js#r.receiverStabilizedResidual=stabilizeToward('),
    C('Live CDF reference (32 bundled residuals)','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#continuousPercentileValue(priorReceiverResidualValues','',`B2_LEGACY_REFERENCE_POPULATION`),
    C('Prior: regressed bundled residual percentile','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#const priorReceiverIndex=','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Effective prior games','current','V34/V37 regime state','BLOCKED','assets/app.js#effectivePriorGames','',`B3_PRESEASON_ELO_STATE`),
    C('Blend','fixed','blend','REPRODUCIBLE','model/live_profiles.js#const receiverIndex=playerStatsUsable ? blend(')]},
  rbIndex:{label:'RB',chain:[
    C('RB/FB rushing EPA/carry','current','nflverse weekly player stats','REPRODUCIBLE','model/live_profiles.js#rbRushEpa'),
    C('RB receiving residual (beta fitted on bundle)','current+priorSeason','player stats + bundled fit','BLOCKED','model/live_profiles.js#const rbRecvResidual=','',`B2_LEGACY_REFERENCE_POPULATION`),
    C('Stabilization 50 carries / 40 targets, alignment','current','current season','REPRODUCIBLE','model/live_profiles.js#rbStabilizedRushEpa'),
    C('Live CDF reference (LIVE_FITTED bundled composites)','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#priorRbOrthogonalValuesV109','',`B2_LEGACY_REFERENCE_POPULATION`),
    C('Prior: regressed LIVE_FITTED bundled composite percentile','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#const priorRbIndex=','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Effective prior games','current','V34/V37 regime state','BLOCKED','assets/app.js#effectivePriorGames','',`B3_PRESEASON_ELO_STATE`),
    C('Blend','fixed','blend','REPRODUCIBLE','model/live_profiles.js#const rbIndex=')]},
  defenseIndex:{label:'Defense overall',chain:[
    C('Coverage: 75% EPA-allowed rank + 25% CPOE-allowed rank','current','nflverse pbp / team stats','REPRODUCIBLE','model/live_profiles.js#const liveCov=teamStatsUsable'),
    C('Coverage prior: regressed bundled coverageIndex','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#const priorCoverageIndex=','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Pass rush: provider cascade','current','manual / FTN / StatRankings / PFR / nflverse weekly','BLOCKED','model/live_profiles.js#passRushProvider=','',`B4_PASS_RUSH_PROVIDER_STATE`),
    C('Pass-rush prior: Y-1 PFR composite percentile, else bundled dl.pressure_rate','priorSeason','nflverse pfr_advstats (2018+) / bundle','CONDITIONAL','model/live_profiles.js#const priorPassRushIndex','Reproducible from PFR for 2019+ (2018 burn-in) when every team has Y-1 PFR rows; the bundle fallback is B1.'),
    C('Run defense: opponent rush EPA rank (incl. QB runs)','current','nflverse pbp','REPRODUCIBLE','model/live_profiles.js#const runDefenseIndex='),
    C('Run-defense prior: regressed percentile of bundled dl.run_stop_rate','priorSeason','data/matchup-data.js','BLOCKED','model/live_profiles.js#const priorRunDefenseIndex','',`B1_LEGACY_PRIOR_BUNDLE`),
    C('Prevention: opponent points/drive rank, prior fixed 50, k=1','current','nflverse pbp drives','REPRODUCIBLE','model/live_profiles.js#const priorPointsAllowedPerDriveIndex=50;'),
    C('Effective prior games for coverage/pass rush/run','current','V34/V37 regime state','BLOCKED','assets/app.js#effectivePriorGames','',`B3_PRESEASON_ELO_STATE`),
    C('Composite .36/.16/.28/.20, soft-tail softness 42','fixed','constants','REPRODUCIBLE','model/live_profiles.js#function calibrateComposite(')]}
};
export const ENGINEERING={B5_SEASON_LITERALS:'model/live_profiles.js#String(r.season)===\'2026\''};

// A unit-season replay is allowed only if no component is BLOCKED.
export function unitStatus(unit){const bl=[...new Set(UNITS[unit].chain.filter(c=>c.status==='BLOCKED').map(c=>c.blocker))];return {unit,status:bl.length?'BLOCKED':'REPLAYABLE',blockers:bl};}

// ---------- Replay-plan validator (fails rather than substitutes) ----------
// plan = {unit, season, asOfWeek, gameCount, inputs:[{component, season, throughWeek|null, source, kind}]}
export function validatePlan(plan){
  const errs=[];const U=UNITS[plan.unit];if(!U)return ['unknown unit '+plan.unit];
  const st=unitStatus(plan.unit);if(st.status==='BLOCKED')errs.push('BLOCKED: '+st.blockers.join(', '));
  if(!(Number.isInteger(plan.gameCount)&&plan.gameCount>=1&&plan.gameCount<=17))errs.push('invalid game count');
  const seen=new Set();
  for(const i of plan.inputs||[]){
    const comp=U.chain.find(c=>c.component===i.component);
    if(!comp){errs.push('unknown component '+i.component);continue;}
    if(seen.has(i.component))errs.push('duplicated input '+i.component);seen.add(i.component);
    if(comp.role==='current'){if(i.season!==plan.season)errs.push('wrong season for '+i.component);if(!(i.throughWeek<=plan.asOfWeek))errs.push('future leakage in '+i.component);if(i.games!=null&&i.games!==plan.gameCount)errs.push('wrong game-count window for '+i.component);}
    if(comp.role==='priorSeason'){if(i.season!==plan.season-1)errs.push('wrong prior season for '+i.component+' (need '+(plan.season-1)+')');}
    if(i.kind==='signal-substitute'||i.kind==='proxy')errs.push('substituted '+i.kind+' for '+i.component);
    if(i.source&&comp.status==='BLOCKED'&&!/^owner-authorized:/.test(i.source))errs.push('blocked component '+i.component+' supplied from '+i.source);}
  for(const c of U.chain)if(c.role!=='fixed'&&!seen.has(c.component))errs.push('missing component '+c.component);
  return errs;
}
export function replayFinalGrade(plan){const e=validatePlan(plan);if(e.length)throw new Error('REPLAY REFUSED: '+e.join('; '));throw new Error('No replay engine is authorized while blockers remain');}

// ---------- Dynamic-record versioning (schema + mechanics; no persistence) ----------
export const METADATA_SCHEMA={transformVersion:'string, e.g. '+TRANSFORM_VERSION,referenceVersion:'sha256 of the canonical population serialization below',unit:'canonical key',design:"'S' (first g games) | 'C' (any g-game window)",gameCount:'integer g',asOf:'ISO date of the newest observation included',population:'n observations',sourceHistorySpan:'[firstSeason, lastSeason]',modelSemantics:'model source hashes the population was replayed under',
  canonicalSerialization:'JSON of {transformVersion, unit, design, gameCount, modelSemantics, observations: sorted [season, team, asOfWeek, finalGrade(full precision)]}'};
export function referenceVersion({unit,design,gameCount,modelSemantics,observations}){
  const obs=[...observations].map(o=>[o.season,o.team,o.asOfWeek,o.finalGrade]).sort((a,b)=>a[0]-b[0]||String(a[1]).localeCompare(String(b[1]))||a[2]-b[2]);
  return crypto.createHash('sha256').update(JSON.stringify({transformVersion:TRANSFORM_VERSION,unit,design,gameCount,modelSemantics,observations:obs})).digest('hex');}
// Exact re-anchoring bounds for Candidate A on a reference of n distinct values:
// adding one new best changes every knot value d to d*(n-1)/n (shift d/n <= 100/n);
// adding one new worst changes d to (d*(n-1)+100)/n (shift (100-d)/n <= 100/n);
// adding m observations can move any value by at most 100*m/(n+m-1) (all new values on one side).
export const reanchorBound={oneRecord:n=>100/n,addObservations:(n,m)=>100*m/(n+m-1)};
