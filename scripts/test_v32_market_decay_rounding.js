const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
for (const rel of ['data/model-data.js','data/opening-lines.js','model/forecast_v2.js','model/score_normalizer.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}
const D = context.window.MODEL_DATA;
const O = context.window.OPENING_LINES_2026 || {};
const F = context.window.SIGNAL_FORECAST_V2;
let assertions = 0;
function ok(x, msg) { assertions++; if (!x) throw new Error(msg); }
function near(a,b,t=1e-12,msg='values differ'){ assertions++; if(Math.abs(a-b)>t) throw new Error(`${msg}: ${a} vs ${b}`); }

const expected = [[1,.75],[2,.50],[3,.25],[4,.15],[5,.10],[6,.05],[7,.05],[18,.05]];
for (const [week, weight] of expected) near(F.marketWeightForWeek(week), weight, 1e-12, `bad market weight W${week}`);
for (let w=2; w<=18; w++) ok(F.marketWeightForWeek(w) <= F.marketWeightForWeek(w-1), `market weight must not increase at W${w}`);

const ratings = Object.fromEntries(D.rankings.map(x => [x.team, x.elo]));
let v31 = 0, v32 = 0, n = 0;
for (const x of D.fallbackSchedule.filter(x => x[4] != null && x[5] != null)) {
  const [,week,away,home,awayScore,homeScore] = x;
  const opening = O[`${home}_${away}`];
  if (!opening || !Number.isFinite(Number(opening.spreadLine))) continue;
  const independent = F.independentProbability(ratings[home], ratings[away], D.config.hfa, D.config.scale);
  const market = F.spreadToProbability(opening.spreadLine);
  const p31 = F.blendLogits(independent, market, .02);
  const p32 = F.forecastProbability({week,home,away,spreadLine:opening.spreadLine}, ratings[home], ratings[away], {hfa:D.config.hfa,scale:D.config.scale,mode:'smart'}).probability;
  const y = homeScore === awayScore ? .5 : homeScore > awayScore ? 1 : 0;
  v31 += (p31-y)**2; v32 += (p32-y)**2; n++;
}
v31 /= n; v32 /= n;
near(v31, 0.22707254705253982, 1e-12, 'V31 current-sample Brier changed unexpectedly');
near(v32, 0.22459139744438097, 1e-12, 'V32 current-sample Brier changed unexpectedly');
ok(v32 <= v31, `V32 regressed current Brier: ${v31} -> ${v32}`);
ok(n === 15, `expected 15 completed market games, got ${n}`);

const app = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes('const roundHalf ='), 'missing canonical half-point display helper');
ok(app.includes('const spread = roundHalf(proj.spread)'), 'predicted line must round at display boundary');
ok(app.includes('SN.normalize(rawTotal, rawMargin)'), 'V35 exact score must use football normalizer');
const SN = context.window.FORCE_SCORE_NORMALIZER;
const nscore = SN.normalize(47, 11);
ok(Number.isInteger(nscore.home) && Number.isInteger(nscore.away), 'normalized exact score must use whole points');
ok(app.includes('Week 1 75% market, Week 2 50%, Week 3 25%'), 'methodology must disclose market decay');

// Static source contract for symmetric half-point rounding: abs-before-round is
// required so -1.25 and +1.25 resolve symmetrically to -1.5/+1.5.
ok(app.includes('Math.sign(Number(n) || 0) * Math.round(Math.abs(Number(n) || 0) * 2) / 2'), 'half-point rounding must be symmetric around zero');
console.log(`OK: ${assertions} V32 market-decay/rounding assertions; Brier ${v31.toFixed(6)} -> ${v32.toFixed(6)}`);
