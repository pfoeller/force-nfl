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
const plan=(unit,season=2024,week=13,g=12)=>({unit,team:'KC',season,asOfWeek:week,gameCount:g,inputs:K.UNITS[unit].chain.filter(c=>c.role!=='fixed'&&!c.alternativeTo).map(c=>c.role==='current'
  ?{component:c.component,role:'current',season,throughWeek:week,games:g,source:c.status==='BLOCKED'?'owner-authorized:test':'pinned-public'}
  :{component:c.component,role:'priorSeason',season:season-1,scope:'full-season',...(c.windowRule==='fixed17'?{windowGames:17}:c.windowRule==='sameLength'?{windowGames:g}:{}),source:c.status==='BLOCKED'?'owner-authorized:test':'pinned-public'})});
for(const u of Object.keys(K.UNITS)){assert.deepEqual(K.validateShape(plan(u)),[],u+' well-formed plan');assert(K.validatePlan(plan(u)).some(e=>/^BLOCKED/.test(e)));assert.throws(()=>K.replayFinalGrade(plan(u)),/REPLAY REFUSED/);}
assert(K.validatePlan(plan('olIndex',2024,4,4)).some(e=>/^B3/.test(e)),'active-k week flagged');
const mut=(unit,fn,args)=>{const p=args?plan(unit,...args):plan(unit);fn(p);return K.validateShape(p);};
const pick=(p,re)=>p.inputs.find(i=>re.test(i.component));
const has=(e,re)=>e.some(x=>re.test(x));
const malformed=[
  ['mixed-role probe (current+priorSeason role)',mut('rbIndex',p=>{pick(p,/receiving EPA/).role='current+priorSeason';}),/invalid role/],
  ['role mismatch (priorSeason component declared current)',mut('olIndex',p=>{const i=pick(p,/Prior/);i.role='current';i.season=2024;i.throughWeek=13;}),/role mismatch/],
  ['unknown team ZZZ',mut('olIndex',p=>{p.team='ZZZ';}),/non-canonical observation team/],
  ['missing game count',mut('olIndex',p=>{delete p.gameCount;}),/missing game count/],
  ['null game count',mut('olIndex',p=>{p.gameCount=null;}),/missing game count/],
  ['non-integer game count',mut('olIndex',p=>{p.gameCount=3.5;}),/invalid game count/],
  ['impossible game count (0)',mut('olIndex',p=>{p.gameCount=0;}),/invalid game count/],
  ['prior-season input with throughWeek 100',mut('olIndex',p=>{pick(p,/Prior/).throughWeek=100;}),/unexpected throughWeek on priorSeasonFullSeason/],
  ['prior-season input without full-season scope',mut('olIndex',p=>{delete pick(p,/Prior/).scope;}),/scope full-season/],
  ['OL same-length reference window wrong',mut('olIndex',p=>{pick(p,/route 1/).windowGames=17;}),/must equal the game count/],
  ['QB reference window not 17',mut('qbIndex',p=>{pick(p,/17-game windows/).windowGames=16;}),/must be 17 games/],
  ['both OL live routes supplied',mut('olIndex',p=>{p.inputs.push({component:K.UNITS.olIndex.chain.find(c=>c.alternativeTo).component,role:'priorSeason',season:2023,scope:'full-season',source:'owner-authorized:test'});}),/both live routes/],
  ['current input missing games',mut('olIndex',p=>{delete pick(p,/disruption/).games;}),/missing or invalid games/],
  ['current input null games',mut('olIndex',p=>{pick(p,/disruption/).games=null;}),/missing or invalid games/],
  ['current input non-integer games',mut('olIndex',p=>{pick(p,/disruption/).games=11.5;}),/missing or invalid games/],
  ['current input impossible games (100)',mut('olIndex',p=>{pick(p,/disruption/).games=100;}),/wrong game-count window/],
  ['current input games not equal to plan game count',mut('olIndex',p=>{pick(p,/disruption/).games=11;}),/wrong game-count window/],
  ['windowGames 100 on a current non-window input',mut('olIndex',p=>{pick(p,/disruption/).windowGames=100;}),/unexpected windowGames on currentSeasonToDate/],
  ['scope on a current input',mut('olIndex',p=>{pick(p,/disruption/).scope='full-season';}),/unexpected scope on currentSeasonToDate/],
  ['games 100 on a full-season prior input',mut('olIndex',p=>{pick(p,/Prior/).games=100;}),/unexpected games on priorSeasonFullSeason/],
  ['throughWeek on a prior reference window',mut('qbIndex',p=>{pick(p,/17-game windows/).throughWeek=17;}),/unexpected throughWeek on priorSeasonReferenceWindow/],
  ['games on a prior reference window',mut('qbIndex',p=>{pick(p,/17-game windows/).games=17;}),/unexpected games on priorSeasonReferenceWindow/],
  ['missing windowGames on a reference window',mut('olIndex',p=>{delete pick(p,/route 1/).windowGames;}),/missing or invalid windowGames/],
  ['sparse inputs array',mut('olIndex',p=>{p.inputs=[p.inputs[0],,p.inputs[1]];}),/sparse array hole/],
  ['inherited unit name toString in a plan',K.validateShape({...plan('olIndex'),unit:'toString'}),/unknown unit/],
  ['window on a non-window prior input',mut('olIndex',p=>{pick(p,/Prior/).windowGames=4;}),/unexpected windowGames on priorSeasonFullSeason/],
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
for(const [label,errs,re] of malformed)ctl('validator rejects: '+label,has(errs,re));
for(const u of Object.keys(K.UNITS))ctl('valid '+u+' plan (current, full-season prior and reference-window components) passes shape validation',K.validateShape(plan(u)).length===0);
ctl('malformed temporal component fails MALFORMED PLAN before blocker evaluation',(()=>{try{const p=plan('olIndex');pick(p,/Prior/).games=100;K.replayFinalGrade(p);}catch(e){return /^MALFORMED PLAN/.test(e.message)&&!/BLOCKED/.test(e.message);}return false;})());
ctl('malformed plans fail with MALFORMED PLAN before blocker evaluation',(()=>{try{const p=plan('olIndex');p.team='ZZZ';K.replayFinalGrade(p);}catch(e){return /^MALFORMED PLAN/.test(e.message)&&!/BLOCKED/.test(e.message);}return false;})());
// Reference hashing: invalid observations are rejected before hashing.
const good=[{season:2025,team:'KC',asOfWeek:4,finalGrade:50},{season:2025,team:'BUF',asOfWeek:4,finalGrade:60}];
const ref=o=>({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{'model/live_profiles.js':'abc'},observations:o});
const rejects=o=>{try{K.referenceVersion(ref(o));return false;}catch(e){return /INVALID REFERENCE/.test(e.message);}};
const rejects2=over=>{try{K.referenceVersion({...ref(good),...over});return false;}catch(e){return /INVALID REFERENCE/.test(e.message);}};
ctl('hash rejects NaN grade',rejects([{...good[0],finalGrade:NaN}]));
ctl('hash rejects null grade',rejects([{...good[0],finalGrade:null}]));
ctl('hash rejects infinite grade',rejects([{...good[0],finalGrade:Infinity}])&&rejects([{...good[0],finalGrade:-Infinity}]));
ctl('hash rejects missing season',rejects([{team:'KC',asOfWeek:4,finalGrade:50}]));
ctl('hash rejects missing team',rejects([{season:2025,asOfWeek:4,finalGrade:50}]));
ctl('hash rejects non-canonical team',rejects([{...good[0],team:'ZZZ'}]));
ctl('hash rejects missing week',rejects([{season:2025,team:'KC',finalGrade:50}]));
ctl('hash rejects duplicate observation identity',rejects([good[0],{...good[0],finalGrade:51}]));
ctl('hash is order-independent',K.referenceVersion(ref(good))===K.referenceVersion(ref([good[1],good[0]])));
ctl('a real grade change changes the hash',K.referenceVersion(ref(good))!==K.referenceVersion(ref([good[0],{...good[1],finalGrade:60.0000001}])));
ctl('delimiter collision pair {a:"b,c=d"} vs {a:"b",c:"d"} hashes differently',K.referenceVersion({...ref(good),modelSemantics:{a:'b,c=d'}})!==K.referenceVersion({...ref(good),modelSemantics:{a:'b',c:'d'}}));
ctl('array model-semantics map rejected',rejects2({modelSemantics:['x']}));
ctl('Date model-semantics map rejected',rejects2({modelSemantics:new Date(0)}));
ctl('Map / Set / function model semantics rejected',rejects2({modelSemantics:new Map()})&&rejects2({modelSemantics:new Set()})&&rejects2({modelSemantics:()=>1}));
ctl('unsupported prototype rejected',rejects2({modelSemantics:new (class S{constructor(){this.a='b';}})()}));
ctl('nested unsupported value rejected',rejects2({modelSemantics:{a:{b:1}}})&&rejects2({modelSemantics:{a:[1]}}));
ctl('sparse observation array rejected',(()=>{const o=[good[0]];o[2]=good[1];return rejects2({observations:o});})());
ctl('inherited unit name toString rejected',rejects2({unit:'toString'}));
ctl('17-game reference with a week-4 observation rejected',rejects2({gameCount:17})&&!rejects2({gameCount:17,observations:[{...good[0],asOfWeek:18},{...good[1],asOfWeek:17}]}));
ctl('design C requires a consistent windowEndGame',rejects2({design:'C'})&&!rejects2({design:'C',observations:[{...good[0],windowEndGame:6,asOfWeek:7},{...good[1],windowEndGame:4,asOfWeek:4}]}));
ctl('ordinary valid reference hashes deterministically',K.referenceVersion(ref(good))===K.referenceVersion(ref(good))&&/^[0-9a-f]{64}$/.test(K.referenceVersion(ref(good))));
ctl('valid nested model-semantics difference changes the hash',K.referenceVersion({...ref(good),modelSemantics:{a:{b:'x'}}})!==K.referenceVersion({...ref(good),modelSemantics:{a:{b:'y'}}}));
ctl('serializer type-tags numbers, normalizes -0 and rejects non-finite',K.canonicalEncode(1)!==K.canonicalEncode('1')&&K.canonicalEncode(-0)===K.canonicalEncode(0)&&(()=>{try{K.canonicalEncode(NaN);return false;}catch{return true;}})());
ctl('hash covers design and game count',K.referenceVersion(ref(good))!==K.referenceVersion({...ref(good),design:'C',observations:good.map(o=>({...o,windowEndGame:4}))})&&K.referenceVersion(ref(good))!==K.referenceVersion({...ref(good),gameCount:3}));
// k cancellation, OL routes, QB active paths, degenerate references.
const kc=a.priorEvidence.kCancellation;
ctl('opposing residuals [8,-6] (both beyond 3) cancel to correction 0 and k = 1',kc.residuals.every(r=>Math.abs(r)>3)&&kc.signedCorrection===0&&kc.k===1&&/when the signed recency-weighted V99 correction|signed recency-weighted/.test(K.kStatus(3).k));
ctl('OL: reference-backed route bounded at 2022, legacy fallback route finite but B1-dependent and not bounded',a.coverage.unitSpans.olIndex.routes.referenceBacked.necessaryLowerBound===2022&&a.coverage.unitSpans.olIndex.routes.legacyFallback.necessaryLowerBound===null&&a.priorEvidence.olRoutes.fallbackDemo.every(r=>Number.isFinite(r.fallbackFinal)));
ctl('QB: inactive qbOpponentEpaAdjustment is 0; active qbOpponentRatingAdjustment nonzero for 32 teams',a.priorEvidence.qbActivePaths.qbOpponentEpaAdjustmentAllZero&&a.priorEvidence.qbActivePaths.qbOpponentRatingAdjustmentNonzeroTeams===32);
ctl('degenerate [1,1,1] reference rejected; [1,1,1]+[0] shift 100 exceeds 66.67',K.validateReferencePopulation([1,1,1]).length===1&&K.validateReferencePopulation([0,1,1]).length===0&&a.dynamic.degenerateCase.valueAfter-a.dynamic.degenerateCase.valueBefore===100&&a.dynamic.degenerateCase.tieAwareExpression<100);
ctl('common necessary lower bound 2022 comes from QB (no QB fallback)',a.coverage.unitSpans.common.necessaryLowerBound===2022&&!K.UNITS.qbIndex.chain.some(c=>c.alternativeTo));
ctl('unknown unit rejected',has(K.validatePlan({unit:'kickerIndex',inputs:[]}),/unknown unit/));
assert.throws(()=>analyze({pins:{...PINS,'data/matchup-data.js':'0'.repeat(64)}}),/pin/);controls.push('altered pin rejected');
const obs=[{season:2025,team:'KC',asOfWeek:4,finalGrade:50},{season:2025,team:'BUF',asOfWeek:4,finalGrade:60}];
const v0=K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:obs});
ctl('reference version changes with a grade',v0!==K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[0],{...obs[1],finalGrade:60.0000001}]}));
ctl('reference version is order-independent',v0===K.referenceVersion({unit:'olIndex',design:'S',gameCount:4,modelSemantics:{},observations:[obs[1],obs[0]]}));
ctl('reference version includes the design',v0!==K.referenceVersion({unit:'olIndex',design:'C',gameCount:4,modelSemantics:{},observations:obs.map(o=>({...o,windowEndGame:4}))}));

// Property-domain controls (Codex review B of 35a49b2): hidden own properties are rejected, never ignored.
const hid=(o,k,d)=>Object.defineProperty(o,k,d);
const sym=(o)=>{o[Symbol('hidden')]='x';return o;};
const acc=(o,k)=>Object.defineProperty(o,k,{get(){return 'x';},enumerable:true});
ctl('non-enumerable unsupported numeric model-semantics field rejected',rejects2({modelSemantics:hid({a:'b'},'unsupported',{value:42,enumerable:false})}));
ctl('non-enumerable string model-semantics field rejected',rejects2({modelSemantics:hid({a:'b'},'c',{value:'d',enumerable:false})}));
ctl('nested non-enumerable model-semantics field rejected',rejects2({modelSemantics:{a:hid({b:'c'},'h',{value:'x',enumerable:false})}}));
ctl('symbol-keyed model-semantics field rejected',rejects2({modelSemantics:sym({a:'b'})}));
ctl('accessor model-semantics property rejected',rejects2({modelSemantics:acc({a:'b'},'c')}));
ctl('non-enumerable unexpected observation field rejected',rejects2({observations:[hid({...good[0]},'hidden',{value:'x',enumerable:false}),good[1]]}));
ctl('non-enumerable allowed-name observation field rejected',rejects2({observations:[hid({season:2025,team:'KC',asOfWeek:4},'finalGrade',{value:50,enumerable:false}),good[1]]}));
ctl('symbol-keyed observation field rejected',rejects2({observations:[sym({...good[0]}),good[1]]}));
ctl('accessor observation property rejected',rejects2({observations:[acc({season:2025,team:'KC',asOfWeek:4},'finalGrade'),good[1]]}));
ctl('extra or symbol property on the observations array rejected',(()=>{const o=[...good];o.extra=1;const o2=[...good];o2[Symbol('h')]=1;return rejects2({observations:o})&&rejects2({observations:o2});})());
ctl('hidden or symbol property on the reference object rejected',(()=>{const r1=hid(ref(good),'hidden',{value:1,enumerable:false});const r2=sym(ref(good));const t=r=>{try{K.referenceVersion(r);return false;}catch(e){return /INVALID REFERENCE/.test(e.message);}};return t(r1)&&t(r2);})());
ctl('hidden, symbol or accessor property on a plan or plan input rejected as MALFORMED PLAN',(()=>{const t=f=>{const p=plan('olIndex');f(p);try{K.replayFinalGrade(p);}catch(e){return /^MALFORMED PLAN/.test(e.message);}return false;};
  return t(p=>hid(p,'hidden',{value:1,enumerable:false}))&&t(p=>sym(p))&&t(p=>hid(p.inputs[0],'games2',{value:1,enumerable:false}))&&t(p=>sym(p.inputs[0]))&&t(p=>acc(p.inputs[0],'kind'))&&t(p=>{p.inputs.extra=1;});})());
ctl('equivalent ordinary enumerable model-semantics object validates',K.validateModelSemantics({a:'b',unsupported:'42'}).length===0&&K.validateModelSemantics({a:'b'}).length===0);
ctl('equivalent ordinary enumerable observation validates',!rejects2({observations:[{...good[0]},{...good[1]}]}));
ctl('former hidden-field object cannot share the visible-only fingerprint (rejected before hashing)',rejects2({modelSemantics:hid({a:'b'},'unsupported',{value:42,enumerable:false})})&&/^[0-9a-f]{64}$/.test(K.referenceVersion({...ref(good),modelSemantics:{a:'b'}})));
ctl('canonicalEncode refuses hidden, symbol and accessor properties',['n','s','a'].every(m=>{const o=m==='n'?hid({a:'b'},'h',{value:1,enumerable:false}):m==='s'?sym({a:'b'}):acc({a:'b'},'g');try{K.canonicalEncode(o);return false;}catch{return true;}}));
// Array-safety controls (Codex review B of 27c8aea): subclasses rejected, index-only traversal,
// descriptor errors returned before any element is read.
class DroppingArray extends Array{map(){return [];}}
class SilentArray extends Array{forEach(){}filter(){return [];}sort(){return this;}[Symbol.iterator](){return [][Symbol.iterator]();}}
const freshGood=()=>[{season:2025,team:'KC',asOfWeek:4,finalGrade:50},{season:2025,team:'BUF',asOfWeek:4,finalGrade:60}];
ctl('DroppingArray (overridden map) observations container rejected',(()=>{const r={...ref(good),observations:DroppingArray.from(freshGood())};return K.validateReferenceInput(r).some(e=>/unsupported array prototype/.test(e))&&rejects2({observations:DroppingArray.from(freshGood())});})());
ctl('array subclass with overridden forEach/filter/sort/iterator rejected (observations, plan inputs, populations)',rejects2({observations:SilentArray.from(freshGood())})&&(()=>{const p=plan('olIndex');p.inputs=SilentArray.from(p.inputs);return K.validateShape(p).some(e=>/unsupported array prototype/.test(e));})()&&K.validateReferencePopulation(SilentArray.from([0,1,2])).length===1);
ctl('array with a foreign prototype rejected',rejects2({observations:Object.setPrototypeOf(freshGood(),Object.create(Array.prototype))}));
ctl('observation-index accessor rejected as INVALID REFERENCE without executing the getter',(()=>{let executed=false;const o=freshGood();Object.defineProperty(o,'0',{enumerable:true,get(){executed=true;throw new Error('SHOULD NOT EXECUTE');}});
  let ok=false;try{K.referenceVersion({...ref(good),observations:o});}catch(e){ok=/^INVALID REFERENCE/.test(e.message);}return ok&&executed===false;})());
ctl('plan-input-index accessor rejected as MALFORMED PLAN without executing the getter',(()=>{let executed=false;const p=plan('olIndex');Object.defineProperty(p.inputs,'0',{enumerable:true,get(){executed=true;throw new Error('SHOULD NOT EXECUTE');}});
  let ok=false;try{K.replayFinalGrade(p);}catch(e){ok=/^MALFORMED PLAN/.test(e.message)&&!/BLOCKED/.test(e.message);}return ok&&executed===false;})());
ctl('reference-population index accessor rejected without executing the getter',(()=>{let executed=false;const v=[0,1,2];Object.defineProperty(v,'1',{enumerable:true,get(){executed=true;return 1;}});return K.validateReferencePopulation(v).length>0&&executed===false;})());
ctl('canonicalEncode refuses array subclasses and index accessors',(()=>{let executed=false;const v=[1,2];Object.defineProperty(v,'0',{enumerable:true,get(){executed=true;return 1;}});const t=x=>{try{K.canonicalEncode(x);return false;}catch{return true;}};return t(DroppingArray.from([1,2]))&&t(v)&&executed===false;})());
ctl('ordinary built-in arrays remain valid',!rejects2({observations:freshGood()})&&K.validateShape(plan('olIndex')).length===0&&K.validateReferencePopulation([0,1,1]).length===0);
ctl('mutating a real observation after validation changes the fingerprint',(()=>{const r={...ref(good),observations:freshGood()};const before=K.referenceVersion(r);r.observations[0].finalGrade=99;return K.referenceVersion(r)!==before;})());
ctl('deterministic ordering unchanged for valid inputs',K.referenceVersion(ref(freshGood()))===K.referenceVersion(ref(freshGood().reverse()))&&K.referenceVersion(ref(good))===K.referenceVersion(ref(freshGood())));
ctl('no universal OL 17-game / 2022 claim remains in package text',(()=>{const files=['README.md','contracts.mjs','analyze.mjs',...RESULTS.map(f=>'results/'+f)].map(f=>F.lf(DIR+'/'+f));return !files.some(t=>/both need a valid 17-game|for QB\/OL|QB and OL (both )?need|QB\/OL cannot|QB and OL cannot start/.test(t.replace(/"QB and OL need only season Y.1 play-by-play[^"]*"/g,'').replace(/QB and OL references need only season Y-1 play-by-play/g,'').replace(/Earlier wording \\?"QB and OL cannot start before 2022\\?"/g,'')));})());
ctl('OL route 1 bounded at 2022, route 2 unbounded, common bound 2022 from QB',a.coverage.unitSpans.olIndex.routes.referenceBacked.necessaryLowerBound===2022&&a.coverage.unitSpans.olIndex.routes.legacyFallback.necessaryLowerBound===null&&a.coverage.unitSpans.qbIndex.theoreticalEarliestDisplayYear===2022&&a.coverage.unitSpans.common.necessaryLowerBound===2022);
const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(F.lf(DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,F.hash(F.lf(DIR+'/'+f))]));
if(writing){fs.writeFileSync(DIR+'/hashes.json',F.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');
console.log(JSON.stringify({check:'PASS',unitsBlocked:5,controls:controls.length,currentReproductionMaxResidual:a.currentReproduction.maxAbsResidualVsSnapshot,frozenCsvMaxResidual:a.currentReproduction.maxAbsResidualVsFrozenCsv}));
