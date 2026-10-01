const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
for (const rel of ['model/forecast_v2.js','model/score_normalizer.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}
const F = context.window.SIGNAL_FORECAST_V2;
const SN = context.window.FORCE_SCORE_NORMALIZER;
let assertions = 0;
function ok(x, msg) { assertions++; if (!x) throw new Error(msg); }
function near(a,b,t=1e-12,msg='values differ'){ assertions++; if(Math.abs(a-b)>t) throw new Error(`${msg}: ${a} vs ${b}`); }

// Canonical week schedule: Week 2 is exactly half market, half rating model.
near(F.marketWeightForWeek(2), 0.50, 1e-12, 'Week 2 market weight');

// Reproduce the shape of the KC example: independent model near 93%, market
// corresponding to a 6.5-point favorite. V35's public FORCE forecast is the
// 50/50 logit blend, not the independent 93% stream.
const market = F.spreadToProbability(6.5);
const blended = F.blendLogits(0.93, market, 0.50);
ok(blended > 0.85 && blended < 0.87, `expected ~86% blended probability, got ${blended}`);
const publicSpread = F.probabilityToSpread(blended);
ok(publicSpread < -11 && publicSpread > -12.5, `expected coherent ~KC -11.5 line, got ${publicSpread}`);

// Football normalization: a raw 47-total / +11 margin arithmetic projection
// should prefer the nearby canonical 28-17 representation while preserving
// the full 11-point margin.
const normalized = SN.normalize(47, 11);
ok(normalized.home === 28 && normalized.away === 17, `expected 28-17, got ${normalized.home}-${normalized.away}`);
ok(normalized.margin === 11, 'normalizer must preserve target margin');
ok(Math.abs(normalized.total - 47) <= 2, 'normalizer moved total too far');
ok(SN.scorePenalty(28) + SN.scorePenalty(17) < SN.scorePenalty(29) + SN.scorePenalty(18), '28-17 should be more football-plausible than 29-18');

// Symmetry: flipping the margin flips home/away without changing the total.
const flipped = SN.normalize(47, -11);
ok(flipped.home === 17 && flipped.away === 28, `symmetric normalization failed: ${flipped.home}-${flipped.away}`);
ok(flipped.total === normalized.total, 'symmetric total mismatch');

const app = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes("forecastMode: 'smart'"), 'public forecast must default/fix to smart blend');
ok(!app.includes('FORCE only'), 'main app must not expose FORCE-only probability/line language');
ok(!app.includes('FORCE ONLY'), 'main app must not expose FORCE ONLY labels');
ok(app.includes('line: predictedLineLabel(g, proj)'), 'audit line must use same projection as public probability/score');
ok(app.includes('const lineLabel = predictedLineLabel(g, proj)'), 'matchup line must use blended projection');
ok(app.includes('Football-normalized point estimate'), 'UI must disclose football score normalization');
ok(app.includes('Win probability, predicted line, and predicted score all come from that same blended probability stream.'), 'methodology must state single forecast stream');
ok(!app.includes('id="forecastMode"'), 'main UI must not expose competing forecast-mode selector');

console.log(`OK: ${assertions} V35 forecast-coherence assertions; blended=${blended.toFixed(6)} spread=${publicSpread.toFixed(3)} normalized=${normalized.home}-${normalized.away}`);
