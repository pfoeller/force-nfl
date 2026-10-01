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

ok(PF.brierEligible('qbCarryover'),'verified QB regime feature must be Brier-eligible');
ok(Q.meta.defaultEnabled===true,'V33 verified regime correction should default on');
ok(Q.meta.promotionDecision==='verified-regime-auto','unexpected V33 promotion decision');

const kc=Q.presets.KC;
ok(R.eligiblePreset(kc),'KC verified preset should be eligible');
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
ok(app.includes('function automaticQbRegimeCorrection(t)'), 'missing automatic V33 QB regime path');
ok(app.includes('function effectiveQbCorrection(t)'), 'missing manual-over-auto correction resolver');
ok(app.includes('if (qbCarryoverActive(t)) return Number(S.qbCarryover.restoreElo || 0);'), 'manual value must override automatic correction');
ok(app.includes('for (const t of Object.keys(QBC.presets || {}))'), 'automatic corrections must flow into active predictive ratings');
ok(app.includes('QR.correction(qbCarryoverPreset(t), teamGamesPlayed(t))'), 'regime correction must decay by completed team games');

console.log(`OK: ${assertions} V33 QB-regime assertions`);
