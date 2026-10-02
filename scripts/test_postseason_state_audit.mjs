import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {scheduleEvidence,outcomeSpace,tiebreakBoundaryEvidence} from './lib/postseason_state_audit.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';
import {appHarness} from './lib/force_app_harness.js';

const teams = Object.keys(appHarness().context.window.MODEL_DATA.teams);
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
  const bytes=JSON.stringify({schedule:short.schedule,actualState:{KC:'clinched'},projectedSeed:1,playoffPct:100});
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
console.log('PASS: UX-25 offline source feasibility evidence, real tiebreak boundary, ties, structural counts, validation and deterministic provenance');
