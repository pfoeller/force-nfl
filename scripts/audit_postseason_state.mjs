import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {scheduleEvidence, outcomeSpace, tiebreakBoundaryEvidence} from './lib/postseason_state_audit.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';
import {appHarness} from './lib/force_app_harness.js';

const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--input')) {
  throw new Error('Usage: node scripts/audit_postseason_state.mjs [--input offline-input.json]');
}
const supplied = args.length ? fs.readFileSync(args[1]) : null;
const inputs = supplied ? [['supplied-unverified',JSON.parse(supplied.toString('utf8'))]] : [
  ['synthetic-four-game',projectionSemanticsFixture()],
  ['synthetic-seventeen-game',projectionSemanticsFixture({fullSchedule:true})],
];
const teams = Object.keys(appHarness().context.window.MODEL_DATA.teams);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = [...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
const sources = ['index.html',...browser,'force_server.py','src/index.js',
  'data/live-cache/c6cb7af1f41f107e7e3f.bin',
  'scripts/audit_postseason_state.mjs','scripts/lib/postseason_state_audit.js',
  'scripts/lib/force_app_harness.js','scripts/lib/projection_semantics_fixture.js',
  'scripts/lib/qb_customize_fixture.js','scripts/lib/qb_input_fixture.js'];
console.log(JSON.stringify({schema:1,nodeVersion:process.version,
  purpose:'offline UX-25 source feasibility evidence; NOT a clinch solver or production gate',
  evidenceKind:supplied ? 'supplied-offline-unverified' : 'synthetic-with-tracked-priors',
  suppliedFileSha256:supplied ? sha(supplied) : null,
  sources:Object.fromEntries(sources.map(p=>[p,sha(fs.readFileSync(p))])),
  reports:inputs.map(([name,input])=>({name,inputSha256:sha(JSON.stringify(input)),
    ...scheduleEvidence(input.schedule,teams)})),
  branchCounts:[0,1,16,32,64,224,272].map(outcomeSpace),
  tiebreakBoundary:tiebreakBoundaryEvidence()},null,2));
