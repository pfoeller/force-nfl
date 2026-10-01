import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {qbAuditHarness,auditQbCustomize} from './lib/qb_customize_audit.js';
import {qbCustomizeFixture} from './lib/qb_customize_fixture.js';

const args=process.argv.slice(2);
if (args.length && !(args.length===2 && args[0]==='--input')) {
  throw new Error('Usage: node scripts/audit_qb_customize.mjs [--input offline-input.json]');
}
const inputs=args.length
  ? [['offline-input',JSON.parse(fs.readFileSync(args[1],'utf8'))]]
  : [['tracked-priors',qbCustomizeFixture()],['low-priors',qbCustomizeFixture({priorQbIndex:5})],
    ['high-priors',qbCustomizeFixture({priorQbIndex:95})]];
const browserSources=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
const hashes=Object.fromEntries(['index.html',...browserSources,'data/live-cache/c6cb7af1f41f107e7e3f.bin',
  'scripts/audit_qb_customize.mjs','scripts/lib/force_app_harness.js','scripts/lib/qb_customize_audit.js','scripts/lib/qb_customize_fixture.js']
  .map(file => [file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const output={schema:1,nodeVersion:process.version,evidenceKind:args.length ? 'supplied-offline-input-unverified-provenance' : 'synthetic-fixtures-with-tracked-V5-reference',
  sources:hashes, reports:inputs.map(([name,input]) => ({name,
    inputSha256:createHash('sha256').update(JSON.stringify(input)).digest('hex'),
    ...auditQbCustomize(qbAuditHarness(input))}))};
console.log(JSON.stringify(output,null,2));
