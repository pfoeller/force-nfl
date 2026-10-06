// Offline MD-08 research check. No network, provider fetch, production write or retune.
// Usage (repository root): node research/cycle9/md08_unit_normalization/check.mjs [--write-hashes]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as H from './lib.mjs';
import {analyze,serialize} from './analyze.mjs';

const RESULTS=['reconstruction.json','architecture_inventory.json','current_distributions.json','current_unit_values.csv','midpoint_thresholds.json','cross_unit_thresholds.json','cross_season.json','bridge_effective_sensitivity.json','candidate_display_mappings.json','md07_interaction.json'];
const PACKAGE=['README.md','ARCHITECTURE.md','inputs.json','lib.mjs','analyze.mjs','check.mjs',...RESULTS.map(f=>'results/'+f)];

// 1. Pins, source drift and exact reconstruction run inside analyze()/load().
const out=serialize(analyze());
assert.deepEqual(Object.keys(out).sort(),[...RESULTS].sort());

// 2. Recorded results must equal a fresh regeneration byte for byte (LF).
for(const f of RESULTS)assert.equal(H.lf(H.DIR+'/results/'+f),out[f],'results/'+f+' reproduces');

// 3. Declared inputs manifest matches the pins actually enforced.
const manifest=JSON.parse(H.lf(H.DIR+'/inputs.json'));
assert.equal(manifest.researchBase,H.BASE);assert.equal(manifest.snapshotBase,H.SNAPSHOT_BASE);
assert.deepEqual(manifest.pins,H.PINS);

// 4. Semantic invariants of the findings.
const P=JSON.parse(out['candidate_display_mappings.json']),B=JSON.parse(out['bridge_effective_sensitivity.json']);
const A=JSON.parse(out['architecture_inventory.json']),R=JSON.parse(out['reconstruction.json']);
for(const kind of ['C','D','N']){
  assert.equal(P[kind].twoLayerModelNeutrality.maxAbsEloChange,0,kind+' two-layer neutral');
  assert(P[kind].naiveSingleLayerRisk.maxAbsEloChange>1,kind+' single-layer remap must move Elo');
  for(const [k,u] of Object.entries(P[kind].units))assert(u.spearman>1-1e-12,kind+' '+k+' rank preserved');
}
assert.deepEqual(A.canonicalBridgeKeys.map(r=>r.key),H.BRIDGE_KEYS);
close(A.weightSum,1,'weights sum');
assert.equal(B.units.length,9);close(B.units.reduce((s,u)=>s+u.varianceContributionShare,0),1,'variance shares sum');
assert(R.postFixRb.maxAbsDisplay>1&&R.postFixRb.rbRankChanges===15,'post-fix RB differs from frozen pre-fix display as MD-07 frame B recorded');
function close(a,b,l){H.close(a,b,l,1e-9);}

// 5. Negative controls: each must detect a deliberate defect.
const {x,L,U,M,D,reference}=H.load();
const vals=Object.values(M.profiles),T=Object.keys(x.teams).sort();
const fails=(fn,label)=>{let threw=false;try{fn();}catch{threw=true;}assert(threw,'negative control did not fail: '+label);return label;};
const controls=[
  fails(()=>{const z=structuredClone(x.teams.KC);z.display.olIndex+=.01;const {g,k}=H.blendInputs(z,'olIndex');H.close(L.blend(z.prior.olIndex,z.liveGrade.olIndex,g,k),z.display.olIndex,'tampered display');},'tampered display grade breaks blend reconstruction'),
  fails(()=>{for(const t of T){const r=x.teams[t].raw;H.close(L.continuousPercentileValue(L.historicalWindowValues(reference,'ol_disruption_rate',17),r.pbpPressureAllowedRate,false),x.teams[t].liveGrade.olIndex,'OL wrong window');}},'wrong OL reference window breaks OL reproduction'),
  fails(()=>{const c=L.medianValue(vals.map(L.priorQbPassEpa).filter(Number.isFinite)),ref=vals.map(p=>L.priorReceiverResidual(p,1,c)).filter(Number.isFinite);for(const t of T)H.close(L.continuousPercentileValue(ref,x.teams[t].raw.receiverCalibratedResidual,true),x.teams[t].liveGrade.receiverIndex,'WR unfitted beta');},'unfitted WR beta breaks WR reproduction'),
  fails(()=>{const frameB=JSON.parse(H.lf(H.MD07_RB_AUDIT)).frames.find(f=>f.name==='B live fitted');const ref=vals.map(L.priorRbOrthogonalComposite).filter(Number.isFinite);for(const row of frameB.rows)H.close(L.regressUnitIndex(L.continuousPercentileValue(ref,L.priorRbOrthogonalComposite(M.profiles[row.team]),true),D.config.reversion),row.matchedPrior,'pre-fix frame');},'pre-fix RB frame cannot pass the LIVE_FITTED cross-check'),
  fails(()=>{const t=T.find(q=>Math.abs(U.compute(x.teams[q].core,x.teams[q].display,x.teams[q].prior,D.meta).bridgePoints)<5),z=x.teams[t],m={...z.display,qbIndex:z.display.qbIndex+10};assert.equal(U.compute(z.core,m,z.prior,D.meta).elo,z.current);},'changing a shared model field moves bridge Elo (uncapped team)'),
  fails(()=>{const arr=L.historicalWindowValues(reference,'qb_epa_per_play',17),inv=H.inverseCdf(arr,70,true);H.close(L.continuousPercentileValue(arr,inv.value+.01,true),70,'perturbed inverse',1e-8);},'perturbed threshold fails the inverse round trip'),
  fails(()=>{const bad={...H.PINS,'data/model-data.js':'0'.repeat(64)};for(const [p,pin] of Object.entries(bad))assert.equal(H.hash(H.lf(p)),pin);},'altered pin is rejected')
];

// 6. Package checksums.
const writing=process.argv.includes('--write-hashes'),pins=writing?{}:JSON.parse(H.lf(H.DIR+'/hashes.json'));
const now=Object.fromEntries(PACKAGE.map(f=>[f,H.hash(H.lf(H.DIR+'/'+f))]));
if(writing){fs.writeFileSync(H.DIR+'/hashes.json',H.json(now));console.log('hashes.json written');}
else for(const f of PACKAGE)assert.equal(now[f],pins[f],f+' checksum');

console.log(JSON.stringify({check:'PASS',teams:T.length,bridgeKeys:H.BRIDGE_KEYS.length,results:RESULTS.length,negativeControls:controls.length,twoLayerMaxAbsElo:0,
  naiveMaxAbsElo:Object.fromEntries(['C','D','N'].map(k=>[k,+P[k].naiveSingleLayerRisk.maxAbsEloChange.toFixed(6)]))}));
