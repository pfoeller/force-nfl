const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
for (const rel of ['data/predictive-feature-gates.js','model/predictive_features.js','model/forecast_v2.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}
const G = context.window.PREDICTIVE_FEATURE_GATES;
const PF = context.window.FORCE_PREDICTIVE_FEATURES;
const F = context.window.SIGNAL_FORECAST_V2;
let assertions = 0;
function ok(x, msg) { assertions++; if (!x) throw new Error(msg); }

// Hard contract: nothing can have positive predictive weight unless its measured
// Brier delta is finite and non-harmful.
for (const [name, f] of Object.entries(G.features)) {
  const w = Number(f.predictiveWeight || 0);
  if (w > 0) {
    ok(Number.isFinite(Number(f.deltaBrier)), `${name}: positive weight without measured Brier delta`);
    ok(Number(f.deltaBrier) <= 0, `${name}: positive weight despite harmful Brier delta ${f.deltaBrier}`);
    ok(PF.brierEligible(name), `${name}: registry/helper disagreement`);
  } else {
    ok(PF.predictiveWeight(name) === 0, `${name}: zero-weight feature leaked into prediction`);
  }
}

for (const name of ['offenseComposite','offenseIndex','qbIndex','receiverIndex','olIndex','defenseIndex','coverageIndex','passRushIndex','runDefenseIndex','rbIndex']) {
  ok(PF.predictiveWeight(name) === 0, `${name} must not be double-counted as a separate additive forecast feature`);
  ok(String(G.features[name]?.status||'').includes('rating-input'), `${name} must be registered as a V45 canonical-rating input`);
}
ok(PF.predictiveWeight('rushIndex') === 0, 'team rushIndex remains non-additive diagnostic');
ok(G.features.rushIndex?.status === 'diagnostic-v57', 'team rushIndex should be diagnostic after RB promotion');
for (const name of ['luck','penalties']) {
  ok(PF.predictiveWeight(name) === 0, `${name} must remain diagnostic/display-only`);
  ok(G.features[name]?.status === 'display-only', `${name} display-only status changed unexpectedly`);
}
ok(PF.brierEligible('qbCarryover'), 'QB carryover should be eligible under its measured aggregate Brier improvement');
ok(G.features.qbCarryover.deltaBrier < 0, 'QB carryover benchmark must show aggregate Brier improvement');

// Regression for the reported bug: a +47.3 Elo QB correction must move the
// model-implied FORCE line. Smart/market probability is allowed to move less.
const home = 1479, away = 1500, restore = 47.3, hfa = 15, scale = 340;
const baseP = F.forecastProbability({}, home, away, { mode:'independent', hfa, scale }).probability;
const adjP = F.forecastProbability({}, home + restore, away, { mode:'independent', hfa, scale }).probability;
function probToSpread(p) { return F.probabilityToSpread(p); }
const baseLine = probToSpread(baseP), adjLine = probToSpread(adjP);
ok(Math.abs(adjLine - baseLine) > 1.0, `QB correction should materially move FORCE line; got ${baseLine} -> ${adjLine}`);
ok(adjP > baseP, 'positive home QB correction must raise home win probability');

const app = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes("function forceLineForecastFor(g, ratings)"), 'missing dedicated FORCE-line forecast path');
ok(app.includes("return forecastFor(g, ratings, 'independent')"), 'FORCE line must use independent predictive ratings, not market blend');
ok(app.includes('line: predictedLineLabel(g, proj)'), 'V35 public line must use canonical blended projection');
ok(!app.includes("line: predictedLineLabel(g, forceLineProj)"), 'V35 must not expose model-only line in game cards');
ok(app.includes("const lineLabel = predictedLineLabel(g, proj)"), 'V35 matchup page must display canonical blended line');
ok(app.includes("predictiveQbCarryoverAllowed()"), 'QB predictive path must be feature-gated');

console.log(`OK: ${assertions} V30 predictive-gate/QB-line assertions`);
