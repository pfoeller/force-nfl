// MD-08 Celo replay reassessment: field-by-field semantic classification of every legacy
// bundle field current FORCE consumes, and the revised per-unit, per-stage replay status.
// Research only. Classification follows the owner decision of 2026-10-07: the Celo July 2026
// output is the authoritative provenance record; historical as-of replay may consume only
// the leak-free subset. A full-season Y-1 value is acceptable as a season-Y prior because
// FORCE consumes it only after Y-1 is complete; later-season dependence is not.

export const CLASSES = ['ACCEPTED_LEAK_FREE', 'AUTHENTIC_BUT_LEAKED', 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE', 'STILL_UNRESOLVED'];
const BE = 'Celo/build_entropy.py', EX = 'Celo/export_ui_data.py', LP = 'model/live_profiles.js';
const F = (o) => Object.freeze(o);

// Fields consumed by the current canonical five-unit paths (production policies
// qb v106-current-season-stabilized, receivers/RB v115-partial-orthogonal).
export const FIELDS = [
  F({field: 'qb.epa_per_play -> qbIndex', class: 'ACCEPTED_LEAK_FREE',
    producer: EX + ' _build_qb_display (epa_sum/games, line ~207) via qb_by_season window={s} (line ~554); bundle qbIndex = ordinal 1-dp percentile of the primary QB\'s epa_per_play (recovered: 32/32 for 2025)',
    span: '2008-2025', basis: 'full-season (REG+POST) of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorQbIndex=regressUnitIndex(prior.qbIndex) (QB prior)', safeAsYMinus1Prior: true,
    residuals: ['index ties (14 groups 2008-2025) follow the owner tie rule: preserved Celo source order', 'primary-QB ties on games (9 team-seasons) follow the owner tie rule: preserved Celo QB-row order', 'QB_RELOCATION_GAP: no QB rows for STL 2008-2015, SD 2008-2016, OAK 2008-2019 (LAR/LAC/LV); missing Celo rows caused by producer aliasing, not reconstructed']}),
  F({field: 'ol.rating -> olIndex', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' compute_position_groups OL (pressure_rate_allowed line ~967, stuff_rate_allowed ~968, score_raw 0.7/0.3 z within season, rating max-abs norm); bundle olIndex = ordinal 1-dp percentile of ol.rating (32/32 for 2025)',
    span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorOlIndex=regressUnitIndex(prior.olIndex) (OL prior)', safeAsYMinus1Prior: true,
    residuals: ['index ties (13 groups 2008-2025) follow the owner tie rule: preserved Celo source order']}),
  F({field: 'ol.pressure_rate_allowed', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' OL pressure_rate_allowed = mean(sack|qb_hit|qb_scramble) on the offense\'s dropbacks (line ~967)',
    span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' OL live route 2 priorPercentile(priorProfiles,(p)=>p?.ol?.pressure_rate_allowed, ...) (used when the Y-1 17-game reference is invalid)', safeAsYMinus1Prior: true, residuals: []}),
  F({field: 'cov.rating -> coverageIndex', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' coverage press_adj_epa = epa_allowed + 0.3*(team pressure - league pressure) (line ~1043), rating = 50 - 50*z within season (line ~1054); bundle coverageIndex = ordinal 1-dp percentile (32/32 for 2025)',
    span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorCoverageIndex and preseason defenseCompositeFrom({coverageIndex:prior.coverageIndex,...})', safeAsYMinus1Prior: true,
    residuals: ['index ties (9 groups 2008-2025) follow the owner tie rule: preserved Celo source order']}),
  F({field: 'dl.pressure_rate', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' DL pressure_rate = mean pressure on dropbacks faced', span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorPassRushByTeam fallback priorPercentile(dl.pressure_rate) (when <20 teams have a Y-1 PFR composite)', safeAsYMinus1Prior: true, residuals: []}),
  F({field: 'dl.run_stop_rate', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' DL run_stop_rate = share of rushes faced with epa <= 0 (line ~1002)', span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorRunDefenseByTeam priorPercentile(dl.run_stop_rate)', safeAsYMinus1Prior: true, residuals: []}),
  F({field: 'dl.rating -> frontIndex', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' DL score_raw 0.7/0.3 z within season, rating max-abs norm; bundle frontIndex = ordinal 1-dp percentile (32/32 for 2025)', span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' frontIndex fallback for pass-rush/run-defense priors only when those percentiles are non-finite', safeAsYMinus1Prior: true, residuals: ['index ties (9 groups 2008-2025) follow the owner tie rule']}),
  F({field: 'receivers.adj_epa / receivers.targets', class: 'ACCEPTED_LEAK_FREE',
    producer: BE + ' _compute_receivers (>=25 targets; opponent pass-defense adjustment within season, line ~909); bundle team value = target-weighted mean over the top four receivers by targets (32/32 for 2025)',
    span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorReceiverWrteEpa (receiver beta y, residual population, prior)', safeAsYMinus1Prior: true,
    residuals: ['RECEIVERS_UNDER_FOUR_2008: 8 teams in 2008 have fewer than four qualifying receivers; the FORCE aggregation rule for that case is not established (2025 top-4 aggregation is exact)'],
    note: 'The field is leak-free, but every consumer also needs rb.* and qb.epaoe (below), so the consumer remains blocked.'}),
  F({field: 'rb.rush_epa / rb.adj_recv / rb.targets (lead back)', class: 'AUTHENTIC_BUT_LEAKED',
    producer: BE + ' compute_position_groups RB: rushers with >=30 attempts excluding every name in known_qbs, the set of passers across ALL loaded seasons 2008-2025; lead back = most rush attempts (32/32 for 2025)',
    span: '2008-2025', basis: 'full-season REG of season Y-1', laterGames: 'within Y-1 only', laterSeasons: true, hindsightParameters: false,
    consumer: LP + ' priorReceiverWrteEpa (subtracts the RB room), rbRecvPassBeta, priorRbOrthogonalComposite, priorRbByTeam, RB live CDF', safeAsYMinus1Prior: false,
    leak: 'RB eligibility and lead-back selection depend on passes thrown in LATER seasons (and on abbreviated-name collisions). Under the producer\'s REG-season filtering (rb_leakage.py, pinned play-by-play), 130 distinct player-seasons (131 team/player/season groups) with >=30 qualifying REG rushes were excluded only because the player\'s first REG pass came in a later season; e.g. 2008 LAC L.Tomlinson, 292 carries, first REG pass 2009. Per-player values of included backs are season-local. For Y-1 = 2025 (current production) no later season exists.',
    residuals: []}),
  F({field: 'qb.epaoe (priorQbPassEpa)', class: 'AUTHENTIC_BUT_LEAKED',
    producer: EX + ' _build_qb_display d_epa = qb_epa + (league_def - opp_def) + (smoothed opponent Elo - opponent season-average Elo)/1500 (line ~166); Elo from the Celo model run with sample_data/tuned_config.json',
    span: '2008-2025', basis: 'full-season (REG+POST) of season Y-1', laterGames: 'within Y-1 (forward 4-game Elo smoothing; acceptable for a completed Y-1)', laterSeasons: true, hindsightParameters: true,
    consumer: LP + ' priorQbPassEpa (epaoe first, epa_per_play only when epaoe is non-finite): receiver/RB ridge betas, QB centre, receiver residual population and prior, RB composite population and prior', safeAsYMinus1Prior: false,
    leak: 'The Elo-momentum term uses Celo Elo produced with tuned hyperparameters. run.py tunes on validation seasons[-6:-3] (2020-2022 for 2008-2025), an inferred, unproven window for this tuned_config. Y-1 seasons before the tuning window therefore carry later-season hindsight. Substituting epa_per_play would be a proxy (not authorized).',
    residuals: ['Owner could separately consider Y-1 >= 2022 if the inferred tuning window is accepted; not assumed here.']}),
  F({field: 'qb.cpoe', class: 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE',
    producer: EX + ' picks the first NGS column containing "completion" and "expect", i.e. expected_completion_percentage, not CPOE', span: '2016-2025', basis: 'season NGS rows', laterGames: 'within season', laterSeasons: false, hindsightParameters: false,
    consumer: LP + ' priorCompletionPct (provenance only; never blended)', safeAsYMinus1Prior: false, residuals: []})
];

// Archived Celo fields current canonical paths do NOT consume (kept as provenance only).
export const NOT_CONSUMED = [
  {field: 'qb.pred_adj', class: 'AUTHENTIC_BUT_LEAKED', why: 'global 2008-2025 predictive QB table lookup'},
  {field: 'off_style_rating (oc composite)', class: 'AUTHENTIC_BUT_LEAKED', why: 'OC scheme entropy uses a cross-season pooled baseline (a 2025-only run differs from the full run)'},
  {field: 'qb.clutch_rating', class: 'AUTHENTIC_BUT_LEAKED', why: 'entropy states pooled across all loaded seasons'},
  {field: 'ol.avg_opp_dl / dl.avg_opp_ol', class: 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE', why: 'producer quirk: the team\'s OWN opposite-unit rating, not opponents faced; preserved, not corrected'},
  {field: 'off_epa -> offenseIndex', class: 'ACCEPTED_LEAK_FREE', why: 'consumed by offense composite / scoring-per-drive prior, outside the five canonical units'},
  {field: 'rb.composite -> rushIndex', class: 'AUTHENTIC_BUT_LEAKED', why: 'rushIndex unit and legacy RB policy only; inherits the RB selection leak'},
  {field: 'receiverIndex (bundle)', class: 'ACCEPTED_LEAK_FREE', why: 'fallback only when the v115 residual prior is non-finite'}
];

// Narrow residual semantics no Celo field settles.
export const RESIDUALS = {
  TIE_RULE: 'Owner rule (2026-10-07), compatibility only: ordinal-index ties keep preserved Celo source/team-record order (stable ascending); primary QB = most games then Celo QB-row order; lead RB = most carries then Celo RB dictionary order. No midrank, alphabetical or new football criterion. 53 index tie groups, 9 QB and 2 RB selection ties (2008-2025); the 2025 bundle reproduces 224/224 index values.',
  QB_RELOCATION_GAP: 'The Celo record has no QB rows for STL/LAR 2008-2015, SD/LAC 2008-2016 or OAK/LV 2008-2019. Cause: producer aliasing that left rows missing. data.py joins per-game QB EPA keyed by play-by-play posteam (current codes LA/LAC/LV) onto schedule rows keyed by relocation-era codes (STL/SD/OAK), so those games carry no QB and the QBs never enter qb_by_season. FORCE relocation mapping cannot recover rows that do not exist; none are reconstructed.',
  RECEIVERS_UNDER_FOUR_2008: 'In 2008, CAR (1), CIN, CLE, DET, LV (2 each), ATL, BAL, LAR (3 each) have fewer than four receivers with >=25 targets. The FORCE aggregation rule for fewer than four is not established; historical receiver aggregation is therefore not claimed exact for those team-seasons.',
  HISTORICAL_PRESEASON_ELO: 'Production preseason Elo (data/model-data.js rankings.elo) equals Celo rankings.elo exactly (32/32). No authenticated per-season state of that full-input run is preserved for earlier seasons. The preserved trajectory/by_season_rank values come from a separate Celo run without the supplementary inputs, so its 10.7 gap to rankings.elo (2025) shows non-equivalence of the two runs, not a season-end vs preseason distinction. B3 remains for weeks 2-11; no replacement rule is authorized.'
};

// Revised per-unit dependency table. Stage-specific k: week 1 and 12+ k = 1; weeks 2-11 need B3.
const STAGES = ['week1', 'weeks2to11', 'week12plus'];
export const UNITS = {
  qbIndex: {label: 'QB', components: [
    {component: 'Prior: regressed qbIndex', dependency: 'qb.epa_per_play (primary QB) -> ordinal index', status: 'ACCEPTED_LEAK_FREE', residual: ['TIE_RULE', 'QB_RELOCATION_GAP']},
    {component: 'Live: EPA/success CDF reference', dependency: 'Y-1 17-game windows from public pbp', status: 'CONDITIONAL', blocker: 'B6: display season >= 2022'},
    {component: 'Live: CPOE (passing_cpoe)', dependency: 'public weekly stats', status: 'CONDITIONAL', blocker: 'component coverage unverified'},
    {component: 'Live: other components', dependency: 'public pbp/weekly', status: 'REPRODUCIBLE'},
    {component: 'k', dependency: 'continuity', status: 'STAGE', blocker: 'B3 in weeks 2-11'}]},
  olIndex: {label: 'Offensive line', components: [
    {component: 'Prior: regressed olIndex', dependency: 'ol.rating -> ordinal index', status: 'ACCEPTED_LEAK_FREE', residual: ['TIE_RULE']},
    {component: 'Live route 1 (display >= 2022)', dependency: 'Y-1 same-length window reference', status: 'CONDITIONAL', blocker: 'B6 selects the route'},
    {component: 'Live route 2 (display < 2022)', dependency: 'ol.pressure_rate_allowed percentile', status: 'ACCEPTED_LEAK_FREE'},
    {component: 'Live disruption', dependency: 'public pbp', status: 'CONDITIONAL', blocker: 'component coverage verified only for 2024-2025'},
    {component: 'k', dependency: 'continuity', status: 'STAGE', blocker: 'B3 in weeks 2-11'}]},
  receiverIndex: {label: 'Receivers', components: [
    {component: 'Prior and live CDF reference', dependency: 'receivers.adj_epa/targets, rb.adj_recv/targets, qb.epaoe', status: 'AUTHENTIC_BUT_LEAKED', blocker: 'qb.epaoe hindsight; rb selection uses later seasons', residual: ['RECEIVERS_UNDER_FOUR_2008', 'QB_RELOCATION_GAP']},
    {component: 'Ridge beta and QB centre', dependency: 'qb.epaoe, receivers, rb', status: 'AUTHENTIC_BUT_LEAKED', blocker: 'B2: owner-excluded leaked dependencies (decisive) plus historical coverage gaps'},
    {component: 'k', dependency: 'continuity', status: 'STAGE', blocker: 'B3 in weeks 2-11'}]},
  rbIndex: {label: 'RB', components: [
    {component: 'Prior and live CDF reference', dependency: 'rb.rush_epa, rb.adj_recv, qb.epaoe', status: 'AUTHENTIC_BUT_LEAKED', blocker: 'rb selection uses later seasons; qb.epaoe hindsight', residual: ['QB_RELOCATION_GAP']},
    {component: 'Receiving ridge beta', dependency: 'rb.adj_recv, qb.epaoe', status: 'AUTHENTIC_BUT_LEAKED', blocker: 'B2: owner-excluded leaked dependencies (decisive) plus historical coverage gaps'},
    {component: 'k', dependency: 'continuity', status: 'STAGE', blocker: 'B3 in weeks 2-11'}]},
  defenseIndex: {label: 'Defense overall', components: [
    {component: 'Coverage prior', dependency: 'cov.rating -> coverageIndex', status: 'ACCEPTED_LEAK_FREE', residual: ['TIE_RULE']},
    {component: 'Run-defense prior', dependency: 'dl.run_stop_rate', status: 'ACCEPTED_LEAK_FREE'},
    {component: 'Pass-rush prior', dependency: 'Y-1 PFR (>=2018) else dl.pressure_rate', status: 'ACCEPTED_LEAK_FREE'},
    {component: 'Live pass rush', dependency: 'provider cascade', status: 'BLOCKED', blocker: 'B4 (as-run blocked; retrospective is an owner policy)'},
    {component: 'Live coverage CPOE', dependency: 'passing_cpoe', status: 'CONDITIONAL', blocker: 'component coverage unverified'},
    {component: 'k', dependency: 'continuity', status: 'STAGE', blocker: 'B3 in weeks 2-11'}]}
};

const LEAKED = new Set(['AUTHENTIC_BUT_LEAKED', 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE', 'STILL_UNRESOLVED', 'BLOCKED']);
// Stage status: BLOCKED if any component is leaked/blocked (or B3 in weeks 2-11);
// otherwise CONDITIONAL when exactness still needs verification or a narrow owner rule.
export function stageStatus(unit, stage) {
  if (!STAGES.includes(stage)) throw new Error('unknown stage ' + stage);
  const U = UNITS[unit]; if (!U) throw new Error('unknown unit ' + unit);
  const blockers = [];
  for (const c of U.components) {
    if (c.status === 'STAGE') { if (stage === 'weeks2to11') blockers.push('B3'); continue; }
    if (LEAKED.has(c.status)) blockers.push(c.component + ': ' + (c.blocker || c.status));
  }
  if (blockers.length) return {unit, stage, status: 'BLOCKED', blockers};
  const conditions = U.components.filter(c => c.status === 'CONDITIONAL' || (c.residual || []).length)
    .map(c => c.component + ': ' + (c.blocker || c.residual.join(', ')));
  return {unit, stage, status: conditions.length ? 'CONDITIONAL' : 'REPLAYABLE', conditions};
}

export function replayability() {
  const out = {};
  for (const u of Object.keys(UNITS)) out[u] = Object.fromEntries(STAGES.map(s => [s, stageStatus(u, s)]));
  return out;
}
