import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectionAuditHarness, auditProjectionSemantics} from './lib/projection_semantics_audit.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';

const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--input')) {
  throw new Error('Usage: node scripts/audit_projection_semantics.mjs [--input offline-input.json]');
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const suppliedBytes = args.length ? fs.readFileSync(args[1]) : null;
const inputs = args.length ? [['supplied-offline-input', JSON.parse(suppliedBytes.toString('utf8'))]] : [
  ['synthetic-four-game-schedule-manual-KC', projectionSemanticsFixture({manualCarryover:true})],
  ['synthetic-seventeen-game-schedule', projectionSemanticsFixture({fullSchedule:true})],
];
const browserSources = [...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
const files = ['index.html', ...browserSources, 'data/live-cache/c6cb7af1f41f107e7e3f.bin',
  'scripts/audit_projection_semantics.mjs', 'scripts/lib/force_app_harness.js',
  'scripts/lib/projection_semantics_audit.js', 'scripts/lib/projection_semantics_fixture.js',
  'scripts/lib/qb_customize_fixture.js', 'scripts/lib/qb_input_fixture.js'];
console.log(JSON.stringify({schema:1, nodeVersion:process.version,
  evidenceKind:args.length ? 'supplied-offline-input-unverified-provenance' : 'synthetic-fixtures-with-tracked-priors-and-reference',
  suppliedFileSha256:suppliedBytes ? sha(suppliedBytes) : null,
  sources:Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(file))])),
  reports:inputs.map(([name,input])=>({name,inputSha256:sha(JSON.stringify(input)),
    ...auditProjectionSemantics(projectionAuditHarness(input))}))}, null, 2));
