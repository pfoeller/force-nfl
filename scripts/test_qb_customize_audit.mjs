import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {qbAuditHarness,auditQbCustomize} from './lib/qb_customize_audit.js';
import {qbCustomizeFixture} from './lib/qb_customize_fixture.js';

let checks=0;
const equal=(a,b,label)=>{assert.ok(Math.abs(a-b)<1e-9,`${label}: ${a} != ${b}`);checks++;};
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const clamp=x=>Math.max(0,Math.min(100,x));
const h=qbAuditHarness(qbCustomizeFixture());
const profiles=h.api.liveProfiles();
const before=JSON.stringify(profiles), controls=JSON.stringify(h.api.S.qbWeights);
const report=auditQbCustomize(h);
assert.equal(report.summary.visibleCompared,32);
assert.equal(report.summary.unavailable,0);
ok(report.rows.some(r=>Math.abs(r.context.opponent)>0),'fixture exercises opponent context');
ok(report.rows.some(r=>Math.abs(r.context.pressure)>0),'fixture exercises pressure context');
ok(report.rows.some(r=>Math.abs(r.context.recency)>0),'fixture exercises actual recency context');
ok(report.summary.maxAbsoluteGap>1,'audit does not falsely equate untouched Customize and Default');
for (const row of report.rows) {
  const {raw,context:c,continuity:p,final:f,gap:g}=row;
  equal(raw.canonical,raw.custom,'default weights reproduce Raw');
  equal(p.liveBeforeBlend,clamp(raw.canonical+c.opponent+c.pressure),'canonical context stage');
  const weight=p.games/(p.games+p.priorGames);
  equal(p.canonicalBeforeRecency,p.prior*(1-weight)+p.liveBeforeBlend*weight,'observed continuity blend');
  equal(f.canonicalMeasured,clamp(p.canonicalBeforeRecency+c.recency),'canonical includes recency once');
  equal(f.custom,clamp(raw.custom+c.opponent+c.pressure+c.recency),'custom includes all three context terms');
  equal(g.customMinusDisplayed,g.continuityAndRawGap+g.clippingOrderGap-g.scenarioGap,'complete gap decomposition');
}
assert.equal(JSON.stringify(profiles),before,'audit must not mutate canonical profiles');
assert.equal(JSON.stringify(h.api.S.qbWeights),controls,'audit must not mutate controls');

// Compare the diagnostic against the actual public cells, not a parallel rating.
function cells(html) {
  return new Map([...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)].flatMap(([tr])=>{
    const team=tr.match(/Synthetic QB ([A-Z]+)/)?.[1];
    if (!team) return [];
    const values=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]*>/g,''));
    return [[team,{final:Number(values[2]),raw:Number(values[3])}]];
  }));
}
for (const mode of ['default','custom']) {
  h.api.S.qbRankingMode=mode;
  const shown=cells(h.api.qbRankingsPage());
  assert.equal(shown.size,32);
  for (const row of report.rows) {
    equal(shown.get(row.team).final,Number((mode==='default'?row.final.canonicalDisplayed:row.final.custom).toFixed(1)),`${mode} rendered Final`);
    equal(shown.get(row.team).raw,Number(row.raw[mode==='default'?'canonical':'custom'].toFixed(1)),`${mode} rendered Raw`);
  }
}

const low=auditQbCustomize(qbAuditHarness(qbCustomizeFixture({priorQbIndex:5})));
const high=auditQbCustomize(qbAuditHarness(qbCustomizeFixture({priorQbIndex:95})));
for (let i=0;i<low.rows.length;i++) {
  equal(low.rows[i].raw.canonical,high.rows[i].raw.canonical,'changing only prior does not change Raw');
  equal(low.rows[i].final.custom,high.rows[i].final.custom,'changing only prior does not change Customize');
  ok(high.rows[i].final.canonicalMeasured>low.rows[i].final.canonicalMeasured,'prior changes canonical Final');
}
const anya={epa:0,anya:100,success:0,rushing:0,cpoe:0};
const custom=auditQbCustomize(h,anya);
const doubled=auditQbCustomize(h,{...anya,anya:200});
for (let i=0;i<custom.rows.length;i++) {
  equal(custom.rows[i].raw.custom,h.L.calibrateQbComposite(custom.rows[i].components.anya),'custom Raw uses selected components');
  equal(custom.rows[i].final.custom,doubled.rows[i].final.custom,'weights normalize');
}
const zero=auditQbCustomize(h,{epa:0,anya:0,success:0,rushing:0,cpoe:0});
ok(zero.rows.every(row=>row.raw.custom===0 && Number.isFinite(row.final.custom)),'all-zero controls are observed without NaN');
for (const weights of [{...anya,epa:NaN},{...anya,epa:-1},{...anya,epa:null},{...anya,extra:1},{anya:100}]) {
  assert.throws(()=>auditQbCustomize(h,weights),/five finite, nonnegative/);
}

// Controlled stage fixture: prior=live=100; negative recency follows an earlier
// canonical clamp. The actual custom function clamps all context at the end.
const p=profiles.ARI, q=p.qb;
Object.assign(q,{pass_epa_score:100,any_a_score:100,pass_success_score:100,rushing_value_score:100,cpoe_score:100,
  raw_live_qb_score:100,live_qb_score:100,pre_recency_qb_index:100,recency_adjustment:-4,
  opponent_rating_adjustment:8,ol_rating_adjustment:0,prior_games_used:1});
p.qbIndex=96;p._preseasonUnitPrior.qbIndex=100;
const edge=auditQbCustomize(h).rows.find(row=>row.team==='ARI');
equal(edge.final.custom,100,'custom single final clamp');
equal(edge.final.canonicalMeasured,96,'canonical staged clamp');
equal(edge.gap.clippingOrderGap,4,'gap is not attributed solely to the prior');

q.raw_live_qb_score=null;
const missing=auditQbCustomize(h).rows.find(row=>row.team==='ARI');
assert.equal(missing.status,'unavailable');
ok(!('final' in missing),'null stage must not become a neutral/zero comparison');
q.raw_live_qb_score=100;q.unavailable=true;
assert.equal(auditQbCustomize(h).rows.find(row=>row.team==='ARI').status,'unavailable');
q.unavailable=false;q.primary_qb_dropback_share=0.59;
assert.equal(auditQbCustomize(h).summary.visibleCompared,31,'respect published qualification');
const stale=qbCustomizeFixture();stale.gameFlow.qb_epa_definition='v149-all-play-v1';
const staleReport=auditQbCustomize(qbAuditHarness(stale));
assert.equal(staleReport.summary.visibleCompared,0);
assert.equal(staleReport.summary.unavailable,32);
assert.equal(staleReport.summary.meanAbsoluteGap,null);
ok(staleReport.rows.every(row=>!('final' in row)),'reject incompatible semantics');
assert.throws(()=>qbAuditHarness({}),/teamRows/);

const cli=spawnSync(process.execPath,['scripts/audit_qb_customize.mjs'],{encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024,windowsHide:true});
assert.equal(cli.status,0,cli.stderr);
const output=JSON.parse(cli.stdout);
assert.equal(output.evidenceKind,'synthetic-fixtures-with-tracked-V5-reference');
assert.equal(output.reports.length,3);
ok(output.sources['model/rating_continuity.js'] && output.sources['model/unit_prior_controller.js'],'hash complete ordered model dependencies');
ok(output.reports.every(r=>r.inputSha256.length===64 && r.summary.visibleCompared===32),'reproducible labeled evidence');
console.log(`PASS: QB Customize audit (${checks} behavioral checks plus schema/availability/CLI checks)`);
