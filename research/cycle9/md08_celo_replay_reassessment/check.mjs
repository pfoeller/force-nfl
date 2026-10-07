// Checker for the MD-08 Celo replay reassessment. Offline; never writes outside this
// package and never touches the external Celo tree (read-only hashing when present).
// Usage (repository root): node research/cycle9/md08_celo_replay_reassessment/check.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as C from './classification.mjs';
import * as M from './celo_mapping.mjs';

const DIR = M.DIR, WRITE = process.argv.includes('--write');
const lf = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const json = v => JSON.stringify(v, null, 1) + '\n';
const controls = [];
const ctl = (label, ok) => { assert(ok, 'control failed: ' + label); controls.push(label); };

// FORCE inputs this reassessment reads (unchanged from the accepted package pins).
const PINS = {
  'data/matchup-data.js': '88b100a3e10158990398b46740c7d01e2048cf05d1601a03ae3c6b0f1613357d',
  'data/model-data.js': 'fa852ce51b25bebd57fa49dca4e2d8e73575ced372e37ea5c6e30fb76217e8ac'
};
for (const [p, h] of Object.entries(PINS)) assert.equal(sha(lf(p)), h, 'pin ' + p);

// Results generated from the classification module.
const generated = {'classification.json': json({fields: C.FIELDS, notConsumed: C.NOT_CONSUMED, residuals: C.RESIDUALS, units: C.UNITS}),
  'replayability.json': json(C.replayability())};
for (const [f, txt] of Object.entries(generated)) {
  if (WRITE) fs.writeFileSync(DIR + '/results/' + f, txt);
  assert.equal(lf(DIR + '/results/' + f), txt, 'results/' + f + ' reproduces');
}

// Classification invariants.
ctl('every consumed field has a valid class and every required attribute',
  C.FIELDS.every(f => C.CLASSES.includes(f.class) && ['producer', 'span', 'basis', 'laterGames', 'consumer'].every(k => typeof f[k] === 'string' && f[k]) && typeof f.laterSeasons === 'boolean' && typeof f.hindsightParameters === 'boolean' && typeof f.safeAsYMinus1Prior === 'boolean'));
ctl('ACCEPTED_LEAK_FREE fields use no later season and no hindsight parameter, and are safe as Y-1 priors',
  C.FIELDS.filter(f => f.class === 'ACCEPTED_LEAK_FREE').every(f => !f.laterSeasons && !f.hindsightParameters && f.safeAsYMinus1Prior));
ctl('leaked or role-incompatible fields are never marked safe as Y-1 priors',
  C.FIELDS.filter(f => f.class !== 'ACCEPTED_LEAK_FREE').every(f => !f.safeAsYMinus1Prior));
ctl('qb.epaoe and the RB lead-back fields are classified AUTHENTIC_BUT_LEAKED',
  ['qb.epaoe', 'rb.rush_epa'].every(k => C.FIELDS.find(f => f.field.startsWith(k)).class === 'AUTHENTIC_BUT_LEAKED'));
ctl('pred_adj, pooled OC style rating and clutch stay excluded from replay',
  ['qb.pred_adj', 'off_style_rating', 'qb.clutch_rating'].every(k => C.NOT_CONSUMED.find(f => f.field.startsWith(k)).class === 'AUTHENTIC_BUT_LEAKED'));
ctl('producer quirks preserved as role-incompatible, not corrected',
  C.NOT_CONSUMED.find(f => f.field.startsWith('ol.avg_opp_dl')).class === 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE' && C.FIELDS.find(f => f.field === 'qb.cpoe').class === 'AUTHENTIC_BUT_ROLE_INCOMPATIBLE');

// Consumer anchors exist in current production source.
const LP = lf('model/live_profiles.js');
for (const a of ['const priorQbIndex=regressUnitIndex(prior.qbIndex', 'const priorOlIndex=regressUnitIndex(prior.olIndex', 'const priorCoverageIndex=regressUnitIndex(prior.coverageIndex',
  '(p)=>p?.ol?.pressure_rate_allowed', '(p)=>p?.dl?.pressure_rate', '(p)=>p?.dl?.run_stop_rate', 'function priorQbPassEpa', 'Number.isFinite(Number(qb.epaoe))?Number(qb.epaoe)',
  'function priorReceiverWrteEpa', 'const rbRecvPassBeta=', 'const receiverPassBeta=', 'const orthogonalQbCenter=medianValue(priorQbPassValues)', 'const priorCompletionPct'])
  ctl('consumer anchor present: ' + a, LP.includes(a));
const APP = lf('assets/app.js');
ctl('production policies are qb v106 and receivers/RB v115', APP.includes("qbPolicy: 'v106-current-season-stabilized'") && APP.includes("receiverPolicy: 'v115-partial-orthogonal'") && APP.includes("rbPolicy: 'v115-partial-orthogonal'"));

// Replayability: no unit fully replayable; QB/OL conditional only in k = 1 stages.
const R = C.replayability();
ctl('no unit is REPLAYABLE in any stage', Object.values(R).every(u => Object.values(u).every(s => s.status !== 'REPLAYABLE')));
ctl('weeks 2-11 are BLOCKED for every unit (B3)', Object.values(R).every(u => u.weeks2to11.status === 'BLOCKED' && u.weeks2to11.blockers.includes('B3')));
ctl('QB and OL are CONDITIONAL (not blocked) in week 1 and week 12+', ['qbIndex', 'olIndex'].every(u => R[u].week1.status === 'CONDITIONAL' && R[u].week12plus.status === 'CONDITIONAL'));
ctl('receivers and RB are BLOCKED in every stage by leaked fields', ['receiverIndex', 'rbIndex'].every(u => Object.values(R[u]).every(s => s.status === 'BLOCKED')));
ctl('defense is BLOCKED in every stage by B4', Object.values(R.defenseIndex).every(s => s.status === 'BLOCKED' && s.blockers.some(b => b.includes('B4'))));
ctl('stageStatus rejects unknown stage and unit', (() => { try { C.stageStatus('qbIndex', 'week0'); return false; } catch { } try { C.stageStatus('kIndex', 'week1'); return false; } catch { return true; } })());

// Committed Celo mapping evidence (verifiable offline).
const mapping = JSON.parse(lf(DIR + '/results/celo_mapping.json'));
const prov = JSON.parse(lf(DIR + '/provenance.json'));
ctl('committed mapping was produced from the pinned Celo ui_data.json', mapping.celoUiDataSha256 === prov.celo.outputs['sample_data/ui_data.json']);
ctl('2025 Celo -> FORCE mapping exact for every B1 field (32/32)', Object.values(mapping.mapping2025.fields).every(v => v.compared === 32 && v.exact === 32) && mapping.mapping2025.missingTeams.length === 0);
ctl('2025 bundle indices rebuild exactly under the owner tie rule (224/224 index values)', Object.values(mapping.mapping2025.indices).every(v => v.exact === 32) && mapping.mapping2025.indexValuesExact === 224 && mapping.mapping2025.indexValuesCompared === 224);
ctl('2025 index ties exist (so tie order matters)', Object.values(mapping.mapping2025.indices).reduce((a, v) => a + v.tiedGroups.length, 0) === 4);
// Owner tie rule evidence, 2008-2025: 53 two-team index tie groups, each with a preserved Celo source order.
{
  const tot = {}; let groups = [];
  for (const h of Object.values(mapping.historical)) for (const [k, v] of Object.entries(h.indexTies)) { tot[k] = (tot[k] || 0) + v.length; groups = groups.concat(v); }
  ctl('53 two-team ordinal-index tie groups 2008-2025 (QB 14, OL 13, coverage 9, front 9, offense 3, receivers 2, rushing 3)',
    JSON.stringify(tot) === JSON.stringify({qbIndex: 14, olIndex: 13, coverageIndex: 9, frontIndex: 9, offenseIndex: 3, receiverIndex: 2, rushIndex: 3}) && groups.length === 53);
  ctl('every tie group is a two-team group listed in preserved Celo source order', groups.every(g => g.split('<').length === 2));
  const qb = {}, rb = {};
  for (const [s, h] of Object.entries(mapping.historical)) { for (const [t, n] of Object.entries(h.selectionPicks.qbSelection)) qb[s + ' ' + t] = n; for (const [t, n] of Object.entries(h.selectionPicks.rbSelection)) rb[s + ' ' + t] = n; }
  ctl('9 primary-QB ties resolved by preserved Celo QB-row order', JSON.stringify(qb) === JSON.stringify({'2010 TEN': 'Vince Young', '2012 KC': 'Matt Cassel', '2013 HOU': 'Case Keenum', '2020 JAX': 'Gardner Minshew II', '2020 WAS': 'Alex Smith', '2022 CAR': 'Sam Darnold', '2023 CLE': 'Joe Flacco', '2023 NYG': 'Tommy DeVito', '2024 DAL': 'Dak Prescott'}));
  ctl('2 lead-RB ties resolved by preserved Celo RB dictionary order (Mostert SF 2019, Wright MIA 2025)', JSON.stringify(rb) === JSON.stringify({'2019 SF': 'R.Mostert', '2025 MIA': 'J.Wright'}));
}
// Correction 2: the 10.7 gap compares two differently fed Celo runs; it is not a temporal decomposition.
const E = mapping.eloProvenance;
ctl('production preseason Elo equals Celo rankings.elo exactly (32/32)', E.eloExact === 32 && E.trajectoryExact === 32);
ctl('10.7 gap is attributed to two runs with different inputs, not to season-end vs preseason', E.mainRunVsTrajectoryRunMaxGap2025 === 10.7 && /WITH supplementary inputs/.test(E.runs.rankingsElo) && /WITHOUT those supplementary inputs/.test(E.runs.trajectoryAndBySeasonRank) && /non-equivalence only/.test(E.note) && /does not establish a season-end vs preseason/.test(E.note));
ctl('no withdrawn season-end-snapshot interpretation remains in the evidence or classification', !('finalEloVsSeasonEndSnapshotMaxGap2025' in E) && !/differ from the final Elo/.test(lf(DIR + '/classification.mjs')));
ctl('B3 retained for weeks 2-11, not for week 1 or week 12+', Object.values(C.replayability()).every(u => u.weeks2to11.blockers.includes('B3') && !(u.week1.blockers || []).includes('B3') && !(u.week12plus.blockers || []).includes('B3')));
ctl('historical record covers 32 teams per season 2008-2025 for OL/DL/coverage', Object.values(mapping.historical).every(h => h.teams === 32));
// Correction 3: B2 completeness is qualified by these historical gaps.
{
  const gap = s => JSON.stringify(mapping.historical[s].teamsWithoutQbRow);
  ctl('QB relocation gap: no QB rows for LAR 2008-2015, LAC 2008-2016, LV 2008-2019',
    [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015].every(s => gap(s) === '["LAC","LAR","LV"]') && gap(2016) === '["LAC","LV"]' && [2017, 2018, 2019].every(s => gap(s) === '["LV"]') && [2020, 2021, 2022, 2023, 2024, 2025].every(s => gap(s) === '[]'));
  ctl('relocation gap classified as missing rows from producer aliasing, not reconstructed', /producer aliasing/.test(C.RESIDUALS.QB_RELOCATION_GAP) && /none are reconstructed/.test(C.RESIDUALS.QB_RELOCATION_GAP));
  ctl('2008 under-four receiver cases: exactly CAR, BAL, CIN, CLE, LV, ATL, DET, LAR',
    JSON.stringify(mapping.historical[2008].teamsUnderFourReceivers) === JSON.stringify({ATL: 3, BAL: 3, CAR: 1, CIN: 2, CLE: 2, DET: 2, LAR: 3, LV: 2}) && Object.entries(mapping.historical).every(([s, h]) => s === '2008' || Object.keys(h.teamsUnderFourReceivers).length === 0));
  ctl('README does not claim historical B2 references are complete', !/every population input exists/.test(lf(DIR + '/README.md')) && /not fully resolved/.test(lf(DIR + '/README.md')));
}
// Correction 1: RB leakage count under the documented producer-consistent definition.
{
  const L = JSON.parse(lf(DIR + '/results/rb_leakage.json'));
  ctl('RB leakage: 130 distinct player-seasons, 131 team/player/season groups (REG passer pool, as the producer)', L.affectedPlayerSeasons === 130 && L.affectedGroups === 131 && L.groups.length === 131 && new Set(L.groups.map(g => g.season + ' ' + g.player)).size === 130);
  ctl('RB leakage: the one multi-team player-season is 2010 M.Lynch', JSON.stringify(L.multiTeamPlayerSeasons) === '["2010 M.Lynch"]');
  ctl('RB leakage: every counted group has >=30 rushes and a first REG pass strictly after its season', L.groups.every(g => g.rushes >= 30 && g.firstPassSeason > g.season));
  ctl('Tomlinson control: 2008 LAC L.Tomlinson, 292 carries, first REG pass 2009', JSON.stringify(L.tomlinson2008) === JSON.stringify([{season: 2008, team: 'LAC', player: 'L.Tomlinson', rushes: 292, firstPassSeason: 2009}]));
  ctl('earlier 127 explained: REG+POST passer pool gives 127 player-seasons (128 groups)', L.withPostseasonPasserPool.affectedPlayerSeasons === 127 && L.withPostseasonPasserPool.affectedGroups === 128);
  ctl('classification states the corrected count', C.FIELDS.find(f => f.field.startsWith('rb.')).leak.includes('130 distinct player-seasons (131 team/player/season groups)'));
  // Recompute from the pinned play-by-play when a directory is supplied (read-only; hashes checked).
  const dir = process.env.MD08_PINNED_PBP_DIR;
  if (dir && fs.existsSync(dir)) {
    const r = spawnSync('python', [DIR + '/rb_leakage.py', dir], {encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}});
    assert.equal(r.status, 0, r.stderr);
    const fresh = JSON.parse(r.stdout);
    ctl('RB leakage recomputed from pinned play-by-play', fresh.affectedPlayerSeasons === 130 && fresh.affectedGroups === 131);
  }
}
ctl('provenance pins: 55 files plus archive, regeneration verdict B, 38 pinned upstream assets', prov.celo.fileCount === 55 && prov.celo.archiveSha256 && prov.regeneration.verdict.startsWith('B.') && prov.regeneration.downloadedUpstream.length === 38);

// External Celo provenance (read-only). Verified when the owner's tree is reachable.
let external = 'SKIPPED (Celo tree not reachable; committed evidence verified above)';
const root = path.dirname(path.dirname(M.celoPath()));
if (fs.existsSync(M.celoPath())) {
  for (const [rel, h] of Object.entries({...prov.celo.sourceAndConfigSha256, ...prov.celo.outputs})) assert.equal(sha(fs.readFileSync(path.join(root, rel))), h, 'Celo pin ' + rel);
  const zip = path.join(path.dirname(root), 'Celo.zip');
  if (fs.existsSync(zip)) assert.equal(sha(fs.readFileSync(zip)), prov.celo.archiveSha256, 'Celo.zip pin');
  const {ui} = M.loadCelo(M.celoPath(), prov.celo.outputs['sample_data/ui_data.json']);
  const fresh = {celoUiDataSha256: mapping.celoUiDataSha256, mapping2025: M.mapping2025(ui, M.loadBundle()), eloProvenance: M.eloProvenance(ui), historical: M.historicalCoverage(ui)};
  assert.equal(JSON.stringify(fresh, null, 1) + '\n', lf(DIR + '/results/celo_mapping.json'), 'celo_mapping.json reproduces from the pinned record');
  external = 'VERIFIED (all Celo pins, archive and mapping reproduce)';
}

// Package checksums.
const PACKAGE = ['README.md', 'provenance.json', 'classification.mjs', 'celo_mapping.mjs', 'rb_leakage.py', 'check.mjs', 'results/classification.json', 'results/replayability.json', 'results/celo_mapping.json', 'results/rb_leakage.json'];
const hashes = Object.fromEntries(PACKAGE.map(f => [f, sha(lf(DIR + '/' + f))]));
if (WRITE) fs.writeFileSync(DIR + '/hashes.json', JSON.stringify(hashes, null, 2) + '\n');
assert.deepEqual(JSON.parse(lf(DIR + '/hashes.json')), hashes, 'hashes.json');

console.log(`PASS (${controls.length} controls; external Celo provenance: ${external})`);
