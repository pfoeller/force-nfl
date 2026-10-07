// Checker for the MD-08 Celo replay reassessment. Offline; never writes outside this
// package and never touches the external Celo tree (read-only hashing when present).
// Usage (repository root): node research/cycle9/md08_celo_replay_reassessment/check.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
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
ctl('2025 bundle indices rebuild exactly (7 indices, 32/32)', Object.values(mapping.mapping2025.indices).every(v => v.exact === 32));
ctl('2025 index ties exist (so tie order matters)', Object.values(mapping.mapping2025.indices).reduce((a, v) => a + v.tiedGroups.length, 0) === 4);
ctl('production preseason Elo equals Celo rankings exactly; season-end snapshot differs', mapping.eloProvenance.eloExact === 32 && mapping.eloProvenance.trajectoryExact === 32 && mapping.eloProvenance.finalEloVsSeasonEndSnapshotMaxGap2025 === 10.7);
ctl('historical record covers 32 teams per season 2008-2025 for OL/DL/coverage', Object.values(mapping.historical).every(h => h.teams === 32));
ctl('QB relocation gap recorded (29 teams with a QB row 2008-2015)', [2008, 2015].every(s => mapping.historical[s].withQb === 29) && mapping.historical[2021].withQb === 32);
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
const PACKAGE = ['README.md', 'provenance.json', 'classification.mjs', 'celo_mapping.mjs', 'check.mjs', 'results/classification.json', 'results/replayability.json', 'results/celo_mapping.json'];
const hashes = Object.fromEntries(PACKAGE.map(f => [f, sha(lf(DIR + '/' + f))]));
if (WRITE) fs.writeFileSync(DIR + '/hashes.json', JSON.stringify(hashes, null, 2) + '\n');
assert.deepEqual(JSON.parse(lf(DIR + '/hashes.json')), hashes, 'hashes.json');

console.log(`PASS (${controls.length} controls; external Celo provenance: ${external})`);
