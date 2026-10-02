const fs = require('fs');
const vm = require('vm');
let assertions = 0;
function ok(x,msg){ assertions++; if(!x) throw new Error(msg); }
const app = fs.readFileSync('assets/app.js','utf8');
const forecast = fs.readFileSync('model/forecast_v2.js','utf8');
const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(forecast,sandbox);
const F=sandbox.window.SIGNAL_FORECAST_V2;
// Demonstrate the V35 defect algebraically: a rating shift must affect model share only,
// not the market-owned share of an already blended probability.
const oldModel=.27, market=F.spreadToProbability(2.5); // KC home market favorite by 2.5 in project sign convention
const oldBlend=F.blendLogits(oldModel,market,.25); // W1 = 25% model
const shiftedModel=.75;
const nextBlend=F.blendLogits(shiftedModel,market,.50); // W2 = 50% model
ok(Math.abs(F.marketWeightForWeek(2)-.5)<1e-12,'Week 2 market weight must be 50%');
ok(nextBlend > oldBlend,'updated model should move rematch forecast');
ok(app.includes("const frozenMarketP=baselineFc?.marketAvailable ? baselineFc.market : null"),'must preserve market component, not blended probability');
ok(app.includes("F.blendLogits(independentRematchP,frozenMarketP,1-nextMarketWeight)"),'rematch must reblend updated model with frozen market');
ok(!app.includes("F.applyEloDelta(baselineFc.probability, netRatingShift"),'old double-application rematch path must be gone');
ok(app.includes("week:nextWeek"),'rematch projection must carry next week semantics');
// Units board contract.
ok(app.includes("sortHeader('Offense','off')"),'units missing Offense');
ok(app.includes("sortHeader('Defense','def')"),'units missing Defense');
ok(app.includes("sortHeader('O-Line','ol')"),'units missing O-Line');
ok(app.includes("sortHeader('Receiver','rec')"),'units missing Receiver');
ok(app.includes("function rawUnitCell"),'raw unit cell helper missing');
ok(app.includes("data-export-row-group=\"16\""),'Units table must request 16-row export grouping');
ok(app.includes("rows.slice(i, i + forcedRows)"),'forced row grouping not implemented');
ok(app.includes("shellTable.appendChild(head.cloneNode(true))"),'each export chunk must repeat headers');
ok(app.includes("shell.setAttribute('data-export-force-page', '1')"),'each 16-team rankings chunk must force its own PNG page');
ok(app.includes('packed.push({ blocks: [block], used: block.height, forcePage: true })'),'forced Units pages must bypass ordinary packing');
ok(app.includes("S.ratingView === 'units' ? '' : diagnosticNotice(S.ratingView, { afterFlagIntro: S.ratingView === 'penalties' })"),'Units note must be suppressed');
ok(!/if \(S\.ratingView === 'units'\)[^\n]+\$\{action\}/.test(app),'Units row must not include QB-return action');
console.log(`OK: ${assertions} V36 rematch/units/export assertions`);
