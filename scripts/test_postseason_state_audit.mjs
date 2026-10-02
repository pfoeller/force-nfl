import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {scheduleEvidence,outcomeSpace,tiebreakBoundaryEvidence} from './lib/postseason_state_audit.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';
import {appHarness} from './lib/force_app_harness.js';
import {validateSourceContracts} from './lib/postseason_source_contract.js';

const app = appHarness({hooks:'scheduleFromBootstrapText'});
const teams = Object.keys(app.context.window.MODEL_DATA.teams);
const short = projectionSemanticsFixture(), full = projectionSemanticsFixture({fullSchedule:true});
const before = JSON.stringify(full);
const a = scheduleEvidence(short.schedule,teams), b = scheduleEvidence(full.schedule,teams);
assert.equal(a.games,64); assert.equal(a.remaining,16); assert.equal(a.meetsCountChecks,false);
assert.equal(a.gamesPerTeamMismatches.length,32);
assert.equal(b.games,272); assert.equal(b.completed,48); assert.equal(b.remaining,224);
assert.equal(b.meetsCountChecks,true);
assert.equal(JSON.stringify(full),before,'read-only schedule audit');
for (const report of [a,b]) {
  assert.match(report.sourceAuthority,/unverified/);
  assert.deepEqual(Object.values(report.actualState),['unknown','unknown','unknown','unknown']);
}
// Real tracked nflverse calendar, normalized by the unchanged production parser.
// Its January 2027 games belong to the 2026 REG season, not the 2027 season.
const tracked = app.api.scheduleFromBootstrapText(fs.readFileSync('data/live-cache/9b3c086e80ae9f89bbf3.bin','utf8'));
const trackedBefore = JSON.stringify(tracked);
const real = scheduleEvidence(tracked,teams);
assert.equal(real.games,272);
assert.equal(real.meetsCountChecks,true,'tracked calendar passes structural counts only');
assert.equal(real.gamesPerTeamMismatches.length,0);
const january = tracked.filter(g=>g.date.startsWith('2027-01-'));
assert.ok(january.some(g=>g.week===17) && january.some(g=>g.week===18),'tracked Week 17/18 games cross the calendar year');
for(const g of january) assert.equal(scheduleEvidence([g],teams).games,1,'legitimate January date accepted');
assert.equal(JSON.stringify(tracked),trackedBefore,'tracked schedule remains untouched');
assert.deepEqual(Object.values(real.actualState),['unknown','unknown','unknown','unknown']);
assert.equal(scheduleEvidence(tracked.map(g=>({...g,season:'2026',game_type:'REG'})),teams).games,272);
assert.equal(scheduleEvidence([{...january[0],season:2026,season_type:'REG'}],teams).games,1);
assert.deepEqual(outcomeSpace(1),{remaining:1,binaryVectors:'2',winLossTieVectors:'3'});
assert.deepEqual(outcomeSpace(0),{remaining:0,binaryVectors:'1',winLossTieVectors:'1'});
assert.equal(outcomeSpace(16).winLossTieVectors,'43046721');
assert.equal(outcomeSpace(32).winLossTieVectors,'1853020188851841');
for(const bad of [-1,273,1.5,NaN,null,'2']) assert.throws(()=>outcomeSpace(bad));
const tied = structuredClone(short.schedule);
tied[0].homeScore=17; tied[0].awayScore=17;
assert.equal(scheduleEvidence(tied,teams).actualTies,a.actualTies+1);
for (const change of [
  s=>s.push(s[0]), s=>s[0].home='BAD', s=>s[0].away=s[0].home,
  s=>s[0].homeScore=null, s=>s[0].awayScore=Infinity,
  s=>s[0].homeScore=-1, s=>s[0].homeScore='21',
  s=>s[0].week=19, s=>s[0].date='2026-02-30',s=>s[0].date='2025-09-07',
  s=>s[0].date='2026-01-10',s=>s[0].date='2026-08-31',
  s=>s[0].date='2027-02-01',s=>s[0].date='2027-09-09',s=>s[0].date='2028-01-10',
  s=>s[0].date='2026-09-31',s=>s[0].date='2027-01-32',
  s=>s[0].season=2027,s=>s[0].season='2025',s=>s[0].season=null,
  s=>s[0].game_type='PST',s=>s[0].season_type='PRE',
]) {
  const schedule=structuredClone(short.schedule);change(schedule);
  assert.throws(()=>scheduleEvidence(schedule,teams),'malformed schedule must not produce evidence');
}
assert.throws(()=>scheduleEvidence(null,teams));
assert.throws(()=>scheduleEvidence([],teams.slice(1)));
const e=tiebreakBoundaryEvidence();
assert.deepEqual(e.metrics.KC,e.metrics.LAC,'all modeled division criteria tie');
assert.deepEqual(e.points,{KC:{for:28,against:55},LAC:{for:55,against:28}});
assert.equal(e.strippedScoreFields,true,'completed projection outcomes drop score evidence');
assert.deepEqual(e.winners.map(x=>x.divisionWinner),['KC','LAC','KC']);
assert.deepEqual(e.winners.map(x=>x.sameDivisionWildcardWinner),['KC','LAC','KC']);
assert.deepEqual(e.constructedOutcomeBranches.map(x=>x.records.KC),[
  {w:1,l:0,t:0},{w:0,l:1,t:0},{w:0,l:0,t:1},
]);
assert.match(e.actualState,/unknown/);
assert.equal(JSON.stringify(tiebreakBoundaryEvidence()),JSON.stringify(e),'repeatable real-path evidence across isolated VM realms');
const source=fs.readFileSync('assets/app.js','utf8');
assert.match(source,/rng\(\)<g\.pHome\?g\.home:g\.away/,'traced sampler currently has two future result branches; renew audit if this changes');
const run=()=>{const r=spawnSync(process.execPath,['scripts/audit_postseason_state.mjs'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
const first=run(),second=run();assert.equal(second,first,'complete CLI output is byte-deterministic');
const report=JSON.parse(first);assert.equal(report.schema,1);assert.equal(report.reports.length,2);
assert.equal(Object.keys(report.sources).length,new Set(Object.keys(report.sources)).size);
for(const hash of Object.values(report.sources))assert.match(hash,/^[a-f0-9]{64}$/);
assert.equal(report.suppliedFileSha256,null);
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'force-ux25-input-'));
try {
  const inputPath=path.join(scratch,'input.json');
  const bytes=JSON.stringify({schedule:tracked,actualState:{KC:'clinched'},projectedSeed:1,playoffPct:100});
  fs.writeFileSync(inputPath,bytes);
  const supplied=spawnSync(process.execPath,['scripts/audit_postseason_state.mjs','--input',inputPath],{encoding:'utf8'});
  assert.equal(supplied.status,0,supplied.stderr);
  const parsed=JSON.parse(supplied.stdout);
  assert.equal(parsed.evidenceKind,'supplied-offline-unverified');
  assert.equal(parsed.suppliedFileSha256,createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(Object.values(parsed.reports[0].actualState),['unknown','unknown','unknown','unknown'],'unverified supplied flags, odds and seeds never establish actual state');
  fs.writeFileSync(inputPath,JSON.stringify({schedule:[short.schedule[0],short.schedule[0]]}));
  assert.notEqual(spawnSync(process.execPath,['scripts/audit_postseason_state.mjs','--input',inputPath],{encoding:'utf8'}).status,0,'CLI rejects duplicate input');
} finally {
  if(path.dirname(scratch)!==path.resolve(os.tmpdir())||!path.basename(scratch).startsWith('force-ux25-input-'))throw Error('Unexpected temporary cleanup target');
  fs.rmSync(scratch,{recursive:true,force:true});
}
const bad=spawnSync(process.execPath,['scripts/audit_postseason_state.mjs','--bogus'],{encoding:'utf8'});
assert.notEqual(bad.status,0);
console.log('PASS: UX-25 offline source feasibility evidence, real 2026-season calendar, tiebreak boundary, ties, structural counts, validation and deterministic provenance');

// Cycle 4 documentary inventory is not a runtime source adapter or state proof.
const matrix = JSON.parse(fs.readFileSync('scripts/fixtures/ux25_source_contracts.json','utf8'));
const matrixBefore = JSON.stringify(matrix);
const research = validateSourceContracts(matrix);
assert.equal(JSON.stringify(matrix),matrixBefore,'research validation is read-only');
assert.equal(research.productionReady,false);
assert.equal(research.strategySelected,null);
assert.ok(Object.values(research.coverageClaims).every(n=>n>0),'supported, absent, conditional and unknown all retained');
const candidate = id => matrix.sources.find(s=>s.id===id);
assert.equal(candidate('sportsdataio').outcomes.playoffClinched.status,'INFERABLE','route clinches are not exhaustive berth flags');
assert.equal(candidate('balldontlie').outcomes.exactSeedLocked.status,'NO','current playoff_seed is not a seed-lock field');
assert.equal(candidate('nfl-public-api').outcomes.playoffClinched.status,'UNKNOWN','no API discovery does not prove unsupported');
assert.equal(candidate('sportradar').outcomes.byeEliminated.status,'INFERABLE','conditional other-team proof, not a separate provider flag');
for(const change of [
  m=>m.strategySelected='sportradar', m=>m.productionReady=true,
  m=>m.sources[0].outcomes.playoffClinched.refs=[],
  m=>m.sources[0].outcomes.playoffEliminated.status=false,
  m=>m.sources[0].outcomes.playoffEliminated.proof='divisionOther',
  m=>m.sources[0].outcomes.divisionEliminated.proof='current-rank-is-locked',
  m=>m.proofs.divisionOther.premises=['division clinched'],
  m=>m.sources.find(s=>s.id==='sportradar').priceClass='low/modest',
  m=>m.sources.find(s=>s.id==='balldontlie').minimumMonthlyUsd=0,
  m=>delete m.sources[0].outcomes.byeEliminated,
  m=>m.sources.push(structuredClone(m.sources[0])),
]) { const invalid=structuredClone(matrix); change(invalid); assert.throws(()=>validateSourceContracts(invalid),'overclaim/unknown promotion must fail offline review'); }
console.log('PASS: UX-25 Cycle 4 documentary source coverage, conditional proof boundaries, unknown/unsupported distinction and price provenance');
