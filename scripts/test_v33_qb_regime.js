const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}}; vm.createContext(ctx);
for(const rel of ['data/qb-carryover.js','data/predictive-feature-gates.js','model/predictive_features.js','model/qb_regime.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
const Q=ctx.window.QB_CARRYOVER;
const PF=ctx.window.FORCE_PREDICTIVE_FEATURES;
const R=ctx.window.FORCE_QB_REGIME;
let assertions=0;
function ok(v,m){assertions++; if(!v) throw new Error(m);}
function near(a,b,t=1e-10,m='values differ'){assertions++; if(Math.abs(Number(a)-Number(b))>t) throw new Error(`${m}: ${a} vs ${b}`);}

// MD-03 (Cycle 6): the automatic correction is retired from production. The V33
// calculation is still checked below as a research record, using an explicitly
// re-enabled copy of the preset.
ok(!PF.brierEligible('qbCarryover') && PF.predictiveWeight('qbCarryover')===0,'retired QB regime feature must not be Brier-eligible');
ok(Q.meta.defaultEnabled===false,'retired V33 regime correction must default off');
ok(Q.meta.promotionDecision==='retired-md03-cycle6','unexpected V33 retirement decision');
ok(Q.presets.KC.autoEligible===false && !R.eligiblePreset(Q.presets.KC),'bundled KC preset must not be auto-eligible');
near(R.correction(Q.presets.KC,0),0,1e-12,'bundled KC preset yields no V33 restore');

const kc={...Q.presets.KC,autoEligible:true};
ok(R.eligiblePreset(kc),'research copy of the KC preset should be eligible');
near(R.initialRestore(kc),15.75,1e-12,'KC initial restore');
near(R.correction(kc,0),15.75,1e-12,'KC week-zero restore');
near(R.correction(kc,4),7.875,1e-12,'four-game half-life');
near(R.correction(kc,8),3.9375,1e-12,'eight-game decay');
ok(R.correction(kc,5)<R.correction(kc,4),'correction must decay monotonically');

const fake={...kc,autoEligible:false};
near(R.initialRestore(fake),0,1e-12,'unverified preset must fail closed');
const capped={...kc,missedStarts:20,postReversionCarryoverDamage:999};
near(R.initialRestore(capped),42,1e-12,'60 Elo raw cap times 70% survival');
const damageLimited={...kc,missedStarts:10,postReversionCarryoverDamage:12};
near(R.initialRestore(damageLimited),12,1e-12,'measured damage must cap correction');

const audit=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/v33_research_audit.json'),'utf8'));
const q=audit.qb_regime_candidate;
ok(q.delta_brier<=0,'promoted regime candidate must not harm Brier');
near(q.baseline_brier,0.23167603865337003,1e-12,'gated baseline Brier changed');
near(q.candidate_brier,0.22181717427265416,1e-12,'gated candidate Brier changed');
near(q.delta_brier,-0.00985886438071587,1e-12,'gated delta Brier changed');
ok(q.episodes_improved===5 && q.episodes===6,'expected 5/6 gated episodes improved');

const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(!app.includes('automaticQbRegimeCorrection'), 'retired automatic V33 QB regime resolver must not exist in production');
ok(!app.includes('FORCE_QB_REGIME') && !app.includes('QR.correction('), 'production app must not call the V33 regime module');
ok(!app.includes("brierEligible('qbCarryover')"), 'production app must not read the retired qbCarryover gate');
ok(app.includes('return qbCarryoverActive(t) ? Number(S.qbCarryover.restoreElo || 0) : 0;'), 'only a manual value may produce a QB-return correction');
ok(app.includes('for (const t of Object.keys(QBC.presets || {}))'), 'manual preset corrections still flow into active ratings');

console.log(`OK: ${assertions} V33 QB-regime assertions`);
