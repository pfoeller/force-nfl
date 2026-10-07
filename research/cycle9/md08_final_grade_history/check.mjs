// Offline checker for the MD-08 final-grade history build. No network (the source listing
// is committed evidence), no production write. Usage (repository root):
//   node research/cycle9/md08_final_grade_history/check.mjs [--write-hashes]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as F from '../md08_followup_ol_receivers/lib.mjs';
import * as X from '../md08_historical_standing_prototype/transforms.mjs';
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
assert.equal(a.priorEvidence.b2.currentReference.status,'REPRODUCIBLE FOR CURRENT REFERENCE');
assert(a.priorEvidence.eloChain.maxAbsDiff2025>1);
for(const s of Object.values(a.coverage.unitSpans))assert.match(s.status,/NOT ASSERTABLE/);

const controls=[];const ctl=(label,ok)=>{assert(ok,'control failed: '+label);controls.push(label);};
// B3: fixed-k weeks vs active weeks; continuous k despite unchanged regime class.
ctl('k fixed at 1 in week 1 and weeks 12+, active in weeks 2-11 (source table)',[1,12,13,18].every(w=>!K.kStatus(w).needsEloState)&&[2,3,6,11].every(w=>K.kStatus(w).needsEloState));
const kx=a.priorEvidence.kExperiment.byWeek;
ctl('different preseason Elo changes week-2 k (24 teams, max 0.0197653235) with no regime-class change',kx[2].teamsChanged===24&&kx[2].regimeClassChanges===0&&Math.abs(kx[2].maxAbsChange-0.0197653235)<1e-9);
ctl('different preseason Elo cannot change k in fixed-k weeks (1, 12, 13)',[1,12,13].every(w=>kx[w].teamsChanged===0));
// B4: semantics are distinguished and the FTN contract is not satisfied by the public schema.
ctl('B4 separates historical-as-run (blocked) from retrospective current-policy (owner policy)',/NOT RECONSTRUCTIBLE/.test(K.BLOCKERS.B4_PASS_RUSH_PROVIDER.historicalAsRun)&&/POSSIBLY EXECUTABLE/.test(K.BLOCKERS.B4_PASS_RUSH_PROVIDER.retrospectiveCurrentPolicy)&&a.priorEvidence.b4.ftnCacheHeaderHasPressureField===false);
// Dynamic records: the old universal bound fails on a tied reference; distinct references keep it.
const ce=a.dynamic.counterexample;
ctl('old universal 100/n bound fails on tied reference [0,1,2,3,3] + 4 (shift 30 > 20)',Math.abs(ce.valueAt3After-ce.valueAt3Before)>ce.oldClaimedBound&&X.candidateA([0,1,2,3,3,4],3)===70);
ctl('tie-aware bound holds and is tight on every exhaustive case; old bound holds on distinct cases',a.dynamic.exhaustiveCheck.tieAwareViolations===0&&a.dynamic.exhaustiveCheck.oldBoundViolationsDistinct===0&&Math.abs(a.dynamic.exhaustiveCheck.maxRatioToTieAware-1)<1e-12);

// Validator: a well-formed plan, then malformed variants rejected BEFORE any replay.
const plan=(unit,season=2024,week=13,g=12)=>({unit,team:'KC',season,asOfWeek:week,gameCount:g,inputs:K.UNITS[unit].chain.filter(c=>c.role!=='fixed').map(c=>({component:c.component,role:c.role,season:c.role==='current'?season:season-1,throughWeek:c.role==='current'?week:null,games:c.role==='current'?g:null,source:c.status==='BLOCKED'?'owner-authorized:test':'pinned-public'}))});
for(const u of Object.keys(K.UNITS)){assert.deepEqual(K.validateShape(plan(u)),[],u+' well-formed plan');assert(K.validatePlan(plan(u)).some(e=>/^BLOCKED/.test(e)));assert.throws(()=>K.replayFinalGrade(plan(u)),/REPLAY REFUSED/);}
assert(K.validatePlan(plan('olIndex',2024,4,4)).some(e=>/^B3/.test(e)),'active-k week flagged');
const mut=(unit,fn,args)=>{const p=args?plan(unit,...args):plan(unit);fn(p);return K.validateShape(p);};
const pick=(p,re)=>p.inputs.find(i=>re.test(i.component));
const has=(e,re)=>e.some(x=>re.test(x));
const malformed=[
  ['mixed-role probe (current+priorSeason role)',mut('rbIndex',p=>{pick(p,/receiving EPA/).role='current+priorSeason';}),/invalid role/],
  ['role mismatch (priorSeason component declared current)',mut('olIndex',p=>{const i=pick(p,/Prior/);i.role='current';i.season=2024;i.throughWeek=13;}),/role mismatch/],
  ['null-week probe',mut('olIndex',p=>{pick(p,/disruption/).throughWeek=null;}),/null or invalid week/],
  ['future leakage',mut('olIndex',p=>{pick(p,/disruption/).throughWeek=14;}),/future leakage/],
  ['wrong season',mut('olIndex',p=>{pick(p,/disruption/).season=2025;}),/wrong season/],
  ['wrong prior year (2025 bundle for 2024)',mut('olIndex',p=>{pick(p,/Prior/).season=2025;}),/wrong prior season/],
  ['wrong game-count window',mut('olIndex',p=>{pick(p,/disruption/).games=17;}),/wrong game-count/],
  ['game count exceeds as-of week',mut('olIndex',p=>{p.gameCount=14;}),/game count exceeds/],
  ['missing observation team',mut('olIndex',p=>{delete p.team;}),/observation team/],
  ['invalid as-of week',mut('olIndex',p=>{p.asOfWeek=null;}),/invalid as-of week/],
  ['signal-layer substitute',mut('olIndex',p=>{pick(p,/Prior/).kind='signal-substitute';}),/substituted signal-substitute/],
  ['proxy substitute',mut('receiverIndex',p=>{pick(p,/Live CDF/).kind='proxy';}),/substituted proxy/],
  ['missing stabilization',mut('receiverIndex',p=>{p.inputs=p.inputs.filter(i=>!/Stabilization/.test(i.component));}),/missing component Stabilization/],
  ['missing context adjustment',mut('qbIndex',p=>{p.inputs=p.inputs.filter(i=>!/opponent adjustment/.test(i.component));}),/missing component V139/],
  ['missing recency',mut('qbIndex',p=>{p.inputs=p.inputs.filter(i=>!/recency/.test(i.component));}),/missing component V148/],
  ['duplicated input',mut('olIndex',p=>{p.inputs.push({...p.inputs[0]});}),/duplicated input/],
  ['blocked component from the bundle',mut('olIndex',p=>{pick(p,/Prior/).source='data/matchup-data.js';}),/blocked component/]];
for(const [label,errs,re] of malformed){ctl('validator rejects: '+label,has(errs,re));assert.throws(()=>{const p=plan('olIndex');p.inputs=[];p.team=undefined;K.replayFinalGrade(p);},/MALFORMED PLAN/);}
ctl('unknown unit rejected',has(K.validatePlan({unit:'kickerIndex',inputs:[]}),/unknown unit/));
assert.throws(()=>analyze({pins:{...PINS,'data/matchup-data.js':'0'.repeat(64)}}),/pin/);controls.push('altered pin rejected');
const obs=[{season:2025,team:'A',asOfWeek:4,finalGrade:50},{season:2025,team:'B',asOfWeek:4,finalGrade:60}];
const v0=K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:obs});
ctl('reference version changes with a grade',v0!==K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[0],{...obs[1],finalGrade:60.0000001}]}));
ctl('reference version is order-independent',v0===K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[1],obs[0]]}));
ctl('reference version includes the design',v0!==K.referenceVersion({unit:'olIndex',design:'C',gameCount:4,modelSemantics:{},observations:obs}));

const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(F.lf(DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,F.hash(F.lf(DIR+'/'+f))]));
if(writing){fs.writeFileSync(DIR+'/hashes.json',F.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');
console.log(JSON.stringify({check:'PASS',unitsBlocked:5,controls:controls.length,currentReproductionMaxResidual:a.currentReproduction.maxAbsResidualVsSnapshot,frozenCsvMaxResidual:a.currentReproduction.maxAbsResidualVsFrozenCsv}));
