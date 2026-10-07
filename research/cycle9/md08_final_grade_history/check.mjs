// Offline checker for the MD-08 final-grade history build. No network (the source listing
// is committed evidence), no production write. Usage (repository root):
//   node research/cycle9/md08_final_grade_history/check.mjs [--write-hashes]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as K from './contracts.mjs';
import {analyze,serialize,DIR,PINS} from './analyze.mjs';

const RESULTS=['contracts.json','prior_reproducibility.json','coverage_matrix.json','current_reproduction.json','dynamic_record.json','decision_package.json'];
const PACKAGE=['README.md','inputs.json','contracts.mjs','analyze.mjs','check.mjs','results/source_listing.json',...RESULTS.map(f=>'results/'+f)];

const a=analyze(),out=serialize(a);
for(const f of RESULTS)assert.equal(F.lf(DIR+'/results/'+f),out[f],'results/'+f+' reproduces');
assert.deepEqual(JSON.parse(F.lf(DIR+'/inputs.json')).pins,PINS);

// Invariants.
for(const u of ['qbIndex','olIndex','receiverIndex','rbIndex','defenseIndex'])assert.equal(a.contracts.units[u].status,'BLOCKED');
assert.equal(a.currentReproduction.maxAbsResidualVsSnapshot,0);assert(a.currentReproduction.maxAbsResidualVsFrozenCsv<=5e-7);
for(const f of a.priorEvidence.fieldReproducibility)assert(f.exactTeams<32);
assert(a.priorEvidence.eloChain.maxAbsDiff2025>1,'repository Elo history is not the production preseason state');

// A plan builder that supplies every component correctly (except that blocked ones can only come from the forbidden bundle).
const plan=(unit,season=2024,week=4,g=4)=>({unit,season,asOfWeek:week,gameCount:g,inputs:K.UNITS[unit].chain.filter(c=>c.role!=='fixed').map(c=>({component:c.component,season:c.role.startsWith('current')?season:season-1,throughWeek:week,games:g,source:c.status==='BLOCKED'?'research-replay':'pinned-public'}))});
const has=(errs,re)=>errs.some(e=>re.test(e));
// Every intended unit is refused even with a correctly shaped plan.
for(const u of Object.keys(K.UNITS)){const e=K.validatePlan(plan(u));assert(has(e,/^BLOCKED/),u);assert.throws(()=>K.replayFinalGrade(plan(u)),/REPLAY REFUSED/);}

// Negative controls: each historical-state error must be detected by the validator.
const mut=(unit,fn)=>{const p=plan(unit);fn(p);return K.validatePlan(p);};
const pick=(p,re)=>p.inputs.find(i=>re.test(i.component));
const controls=[
  ['future leakage (current input through week 6 for a week-4 observation)',has(mut('olIndex',p=>{pick(p,/disruption/).throughWeek=6;}),/future leakage/)],
  ['wrong season (2025 rows for a 2024 observation)',has(mut('olIndex',p=>{pick(p,/disruption/).season=2025;}),/wrong season/)],
  ['wrong prior year (2025 bundle for a 2024 prior = leakage)',has(mut('olIndex',p=>{pick(p,/Prior/).season=2025;}),/wrong prior season/)],
  ['wrong game-count window',has(mut('olIndex',p=>{pick(p,/disruption/).games=17;}),/wrong game-count/)],
  ['signal-layer value substituted for a final-grade component',has(mut('olIndex',p=>{pick(p,/Prior/).kind='signal-substitute';}),/substituted signal-substitute/)],
  ['proxy substituted for a blocked component',has(mut('receiverIndex',p=>{pick(p,/Live CDF/).kind='proxy';}),/substituted proxy/)],
  ['missing stabilization',has(mut('receiverIndex',p=>{p.inputs=p.inputs.filter(i=>!/Stabilization/.test(i.component));}),/missing component Stabilization/)],
  ['missing context adjustment',has(mut('qbIndex',p=>{p.inputs=p.inputs.filter(i=>!/opponent adjustment/.test(i.component));}),/missing component V139/)],
  ['missing recency',has(mut('qbIndex',p=>{p.inputs=p.inputs.filter(i=>!/recency/.test(i.component));}),/missing component V148/)],
  ['duplicated observation input',has(mut('olIndex',p=>{p.inputs.push({...p.inputs[0]});}),/duplicated input/)],
  ['blocked component supplied from the 2025 bundle',has(mut('olIndex',p=>{pick(p,/Prior/).source='data/matchup-data.js';}),/blocked component/)],
  ['unknown unit',has(K.validatePlan({unit:'kickerIndex',inputs:[]}),/unknown unit/)],
  ['invalid game count',has(mut('olIndex',p=>{p.gameCount=0;}),/invalid game count/)]];
for(const [label,ok] of controls)assert(ok,'negative control not detected: '+label);
// Pin control: an altered input pin is rejected.
assert.throws(()=>analyze({pins:{...PINS,'data/matchup-data.js':'0'.repeat(64)}}),/pin/);
// Versioning control: changing one observation changes the reference version.
const obs=[{season:2025,team:'A',asOfWeek:4,finalGrade:50},{season:2025,team:'B',asOfWeek:4,finalGrade:60}];
const v0=K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:obs});
assert.notEqual(v0,K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[0],{...obs[1],finalGrade:60.0000001}]}),'reference version detects a changed grade');
assert.equal(v0,K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[1],obs[0]]}),'reference version is order-independent');
assert.notEqual(v0,K.referenceVersion({unit:'olIndex',design:'C',gameCount:4,modelSemantics:{},observations:obs}),'reference version includes the design');

const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(F.lf(DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,F.hash(F.lf(DIR+'/'+f))]));
if(writing){fs.writeFileSync(DIR+'/hashes.json',F.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');
console.log(JSON.stringify({check:'PASS',unitsBlocked:5,negativeControls:controls.length+4,currentReproductionMaxResidual:a.currentReproduction.maxAbsResidualVsSnapshot,frozenCsvMaxResidual:a.currentReproduction.maxAbsResidualVsFrozenCsv}));
