// MD-08 Celo replay reassessment: rebuild of the FORCE legacy bundle fields from the
// owner-accepted Celo provenance record (read-only), and historical coverage diagnostics.
// Research only. Reads the external Celo ui_data.json (never modified, never imported);
// verifies its pinned SHA-256 first. No production code, formula, prior or grade change.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

export const DIR = 'research/cycle9/md08_celo_replay_reassessment';
export const DEFAULT_CELO_UI = 'C:/Users/paul1.PAUL/Videos/Celo/sample_data/ui_data.json';
export const celoPath = () => process.env.CELO_UI_DATA || DEFAULT_CELO_UI;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const lf = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// nflverse/Celo team codes -> FORCE canonical codes. Position groups already use current
// codes (LA, LAC, LV) for every season; schedule-derived QB rows keep relocation-era codes.
export const ALIAS = {LA: 'LAR', STL: 'LAR', SD: 'LAC', OAK: 'LV'};
export const canon = t => ALIAS[t] || t;

export function loadCelo(path = celoPath(), pin) {
  const buf = fs.readFileSync(path);
  const h = sha(buf);
  if (pin && h !== pin) throw new Error('Celo ui_data.json hash mismatch: ' + h);
  return {ui: JSON.parse(buf.toString('utf8')), sha256: h};
}
export function loadBundle() {
  const ctx = {window: {}};
  vm.runInNewContext(lf('data/matchup-data.js'), ctx);
  return ctx.window.MATCHUP_DATA;
}

// Index transform recovered from the 2025 bundle: ordinal rank (ascending) as a percentile
// 100*pos/(n-1), rounded to one decimal. Owner tie rule (2026-10-07): ties keep the preserved
// Celo source/team-record order (stable ascending sort in that order). Under this rule the
// 2025 bundle reproduces 224/224 index values.
export function ordinalIndex(values, tieOrder) {
  const teams = Object.keys(values);
  const pos = new Map(tieOrder.map((t, i) => [t, i]));
  const sorted = [...teams].sort((a, b) => values[a] - values[b] || pos.get(a) - pos.get(b));
  const n = teams.length;
  return Object.fromEntries(sorted.map((t, i) => [t, Math.round(1000 * i / (n - 1)) / 10]));
}
export function tiedGroups(values) {
  const by = new Map();
  for (const [t, v] of Object.entries(values)) by.set(v, [...(by.get(v) || []), t]);
  return [...by.values()].filter(g => g.length > 1).map(g => g.sort());
}

// Rebuild one season's FORCE-bundle source fields from the Celo record.
export function rebuildSeason(ui, season) {
  const s = String(season), pg = ui.position_groups;
  const ol = pg.ol.by_season[s], dl = pg.dl.by_season[s], cov = pg.cov.by_season[s];
  const teams = Object.keys(ol).map(canon).sort();
  const out = {}, ties = {qbSelection: [], rbSelection: []}, picks = {qbSelection: {}, rbSelection: {}};
  const firstSeen = rows => { const o = []; for (const t of rows) if (!o.includes(t)) o.push(t); return o; };
  const qbs = {};
  for (const r of ui.qb_by_season[s] || []) (qbs[canon(r.team)] ||= []).push(r);
  const rbs = {};
  for (const [name, r] of Object.entries(pg.rb.by_season[s] || {})) (rbs[canon(r.team)] ||= []).push({name, ...r});
  const wrs = {};
  for (const [name, r] of Object.entries(pg.wr.by_season[s] || {})) (wrs[canon(r.team)] ||= []).push({name, ...r});
  const offEpa = ui.oc_entropy.off_epa_by_season[s] || {};
  const raw = Object.fromEntries(Object.entries({ol, dl, cov}).map(([g, d]) => [g, Object.fromEntries(Object.entries(d).map(([t, v]) => [canon(t), v]))]));
  const offEpaC = Object.fromEntries(Object.entries(offEpa).map(([t, v]) => [canon(t), v]));
  for (const t of teams) {
    const p = {ol: raw.ol[t], dl: raw.dl[t], cov: raw.cov[t], off_epa: offEpaC[t]};
    // Primary QB: most games, then preserved Celo QB-row order (stable sort; owner tie rule).
    const q = (qbs[t] || []).slice().sort((a, b) => b.games - a.games);
    if (q.length > 1 && q[0].games === q[1].games) { ties.qbSelection.push(t); picks.qbSelection[t] = q[0].qb; }
    if (q.length) {
      const r = q[0];
      p.qb = {qb: r.qb, epa_per_play: r.epa_per_play, epaoe: r.epaoe, avg_opp_cov: r.avg_opp_cov, avg_opp_dl: r.avg_opp_dl, games: r.games, pred_adj: r.pred_adj, cpoe: r.cpoe, clutch_rating: r.clutch_rating};
    }
    // Lead RB: most rush attempts, then preserved Celo RB dictionary order (owner tie rule).
    const b = (rbs[t] || []).slice().sort((a, c) => c.rush_att - a.rush_att);
    if (b.length > 1 && b[0].rush_att === b[1].rush_att) { ties.rbSelection.push(t); picks.rbSelection[t] = b[0].name; }
    if (b.length) {
      const r = b[0];
      p.rb = {name: r.name, rush_epa: r.rush_epa, adj_rush: r.adj_rush, adj_recv: r.adj_recv, composite: r.composite, rush_att: r.rush_att, targets: r.targets, games: r.games};
    }
    // Receivers: target-weighted adj_epa over the top four receivers by targets; leaders = top three.
    const w = (wrs[t] || []).slice().sort((a, c) => c.targets - a.targets);
    if (w.length) {
      const top = w.slice(0, 4), T = top.reduce((a, r) => a + r.targets, 0);
      p.receivers = {adj_epa: Math.round(1e4 * top.reduce((a, r) => a + r.targets * r.adj_epa, 0) / T) / 1e4, targets: T,
        leaders: w.slice(0, 3).map(r => ({name: r.name, targets: r.targets, adj_epa: r.adj_epa}))};
    }
    out[t] = p;
  }
  // Preserved Celo source/team-record order per index (used only to order ties).
  const sourceOrder = {
    qbIndex: firstSeen((ui.qb_by_season[s] || []).map(r => canon(r.team))),
    olIndex: Object.keys(ol).map(canon), coverageIndex: Object.keys(cov).map(canon), frontIndex: Object.keys(dl).map(canon),
    offenseIndex: Object.keys(offEpa).map(canon),
    receiverIndex: firstSeen(Object.values(pg.wr.by_season[s] || {}).map(r => canon(r.team))),
    rushIndex: firstSeen(Object.values(pg.rb.by_season[s] || {}).map(r => canon(r.team)))};
  return {season: Number(s), teams, profiles: out, selectionTies: ties, selectionPicks: picks, sourceOrder};
}

export const INDEX_SOURCES = {
  qbIndex: p => p.qb?.epa_per_play,
  olIndex: p => p.ol?.rating,
  coverageIndex: p => p.cov?.rating,
  frontIndex: p => p.dl?.rating,
  offenseIndex: p => p.off_epa,
  receiverIndex: p => p.receivers?.adj_epa,
  rushIndex: p => p.rb?.composite
};

const B1_COMPARE = [
  ['ol', ['pressure_rate_allowed', 'stuff_rate_allowed', 'dropbacks', 'rushes', 'score_raw', 'rating', 'avg_opp_dl']],
  ['dl', ['pressure_rate', 'run_stop_rate', 'dropbacks_faced', 'rushes_faced', 'score_raw', 'rating', 'avg_opp_ol']],
  ['cov', ['epa_allowed', 'press_adj_epa', 'comp_rate_allowed', 'adot_allowed', 'targets_faced', 'rating']],
  ['qb', ['qb', 'epa_per_play', 'epaoe', 'avg_opp_cov', 'avg_opp_dl', 'games', 'pred_adj', 'cpoe', 'clutch_rating']],
  ['rb', ['name', 'rush_epa', 'adj_rush', 'adj_recv', 'composite', 'rush_att', 'targets', 'games']],
  ['receivers', ['adj_epa', 'targets']]
];

// 2025 Celo -> FORCE bundle mapping check (every B1 field and every bundle index).
export function mapping2025(ui, bundle) {
  const rebuilt = rebuildSeason(ui, 2025), P = bundle.profiles, fileOrder = Object.keys(P);
  const fields = {};
  const rec = (k, ok) => { fields[k] ||= {compared: 0, exact: 0}; fields[k].compared++; if (ok) fields[k].exact++; };
  for (const t of fileOrder) {
    const r = rebuilt.profiles[t];
    for (const [g, ks] of B1_COMPARE) for (const k of ks) rec(g + '.' + k, r[g]?.[k] === P[t][g]?.[k]);
    rec('off_epa', r.off_epa === P[t].off_epa);
    rec('receivers.leaders', JSON.stringify(r.receivers.leaders) === JSON.stringify(P[t].receivers.leaders));
  }
  const indices = {};
  for (const [I, get] of Object.entries(INDEX_SOURCES)) {
    const vals = Object.fromEntries(fileOrder.map(t => [t, get(rebuilt.profiles[t])]));
    const idx = ordinalIndex(vals, rebuilt.sourceOrder[I]);
    indices[I] = {compared: fileOrder.length, exact: fileOrder.filter(t => idx[t] === P[t][I]).length, tiedGroups: tiedGroups(vals)};
  }
  const missing = fileOrder.filter(t => !rebuilt.teams.includes(t));
  return {season: 2025, teams: fileOrder.length, missingTeams: missing, fields, indices,
    indexValuesExact: Object.values(indices).reduce((a, v) => a + v.exact, 0), indexValuesCompared: Object.values(indices).reduce((a, v) => a + v.compared, 0),
    selectionTies: rebuilt.selectionTies, selectionPicks: rebuilt.selectionPicks,
    schemaNote: 'Only alias LA->LAR is needed in 2025. Celo-only fields dropped by the bundle: clutch, epa_tgt, adot, yac, team, wpa_per_play and entropy excess fields.'};
}

// Historical diagnostics for every season 2008-2024 (possible Y-1 seasons for display 2009-2025).
export function historicalCoverage(ui) {
  const out = {};
  for (let s = 2008; s <= 2025; s++) {
    const r = rebuildSeason(ui, s);
    const tieCount = {};
    for (const [I, get] of Object.entries(INDEX_SOURCES)) {
      const vals = Object.fromEntries(r.teams.filter(t => Number.isFinite(get(r.profiles[t]))).map(t => [t, get(r.profiles[t])]));
      if (tiedGroups(vals).some(g => g.some(t => !r.sourceOrder[I].includes(t)))) throw new Error('tie member without preserved source order ' + s + ' ' + I);
      // Each tie group listed in preserved Celo source order (the order the owner rule applies).
      tieCount[I] = tiedGroups(vals).map(g => g.slice().sort((a, b) => r.sourceOrder[I].indexOf(a) - r.sourceOrder[I].indexOf(b)).join('<'));
    }
    const wrBy = ui.position_groups.wr.by_season[String(s)] || {};
    const recCount = t => Object.values(wrBy).filter(x => canon(x.team) === t).length;
    out[s] = {teams: r.teams.length,
      withQb: r.teams.filter(t => r.profiles[t].qb).length,
      teamsWithoutQbRow: r.teams.filter(t => !r.profiles[t].qb),
      withLeadRb: r.teams.filter(t => r.profiles[t].rb).length,
      teamsWithoutRb: r.teams.filter(t => !r.profiles[t].rb),
      withFourReceivers: r.teams.filter(t => recCount(t) >= 4).length,
      teamsUnderFourReceivers: Object.fromEntries(r.teams.filter(t => recCount(t) < 4).map(t => [t, recCount(t)])),
      indexTies: tieCount, selectionTies: r.selectionTies, selectionPicks: r.selectionPicks};
  }
  return out;
}

// B3 provenance: production preseason Elo (data/model-data.js rankings) vs the Celo record.
export function eloProvenance(ui) {
  const ctx = {window: {}};
  vm.runInNewContext(lf('data/model-data.js'), ctx);
  const M = Object.fromEntries(ctx.window.MODEL_DATA.rankings.map(r => [r.team, r]));
  // Celo keeps relocation-era ghost franchises (STL, SD, OAK) as separate entries; only LA maps to LAR.
  const U = Object.fromEntries(ui.rankings.map(r => [r.team === 'LA' ? 'LAR' : r.team, r]).filter(([t]) => M[t]));
  const teams = Object.keys(M);
  const gaps = teams.map(t => Math.abs(U[t].elo - U[t].trajectory[U[t].trajectory.length - 1]));
  return {teams: teams.length,
    eloExact: teams.filter(t => M[t].elo === U[t].elo).length,
    trajectoryExact: teams.filter(t => JSON.stringify(M[t].trajectory) === JSON.stringify(U[t].trajectory)).length,
    mainRunVsTrajectoryRunMaxGap2025: Math.round(Math.max(...gaps) * 10) / 10,
    mainRunEqualsTrajectoryRun2025: gaps.filter(g => g === 0).length,
    runs: {rankingsElo: 'export_ui_data.py main EloModel run over all games WITH supplementary inputs (roster_ret, personnel_data, team_av, espn_qbr, qb_pressure)',
      trajectoryAndBySeasonRank: 'export_ui_data.py traj_model: a separate EloModel run season by season WITHOUT those supplementary inputs, snapshotted after each season'},
    note: 'Production preseason Elo equals Celo rankings.elo exactly. The 2025 gap to the trajectory run compares two runs with different input construction, so it shows non-equivalence only and does not establish a season-end vs preseason distinction. No per-season state of the main (full-input) run is preserved for earlier seasons; that missing authenticated historical full-run state is the B3 blocker for weeks 2-11.'};
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('celo_mapping.mjs')) {
  const pin = JSON.parse(lf(DIR + '/provenance.json')).celo.outputs['sample_data/ui_data.json'];
  const {ui, sha256} = loadCelo(celoPath(), pin);
  const res = {celoUiDataSha256: sha256, mapping2025: mapping2025(ui, loadBundle()), eloProvenance: eloProvenance(ui), historical: historicalCoverage(ui)};
  fs.writeFileSync(DIR + '/results/celo_mapping.json', JSON.stringify(res, null, 1) + '\n');
  console.log('wrote results/celo_mapping.json');
}
