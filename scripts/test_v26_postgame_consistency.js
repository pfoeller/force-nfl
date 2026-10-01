const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
for (const needle of [
  "lineSource:frozenMarketP!=null?'frozen market anchor + next-week FORCE blend':'postgame model forecast'",
  "source:frozenMarketP!=null?'postgame-rematch-market-anchor':'postgame-rematch-model'",
  'function profileBeforeWeek',
  'function unitChangeRows',
  'Pregame → Postgame',
  "'Current FORCE Score'",
  "duel('Postgame FORCE Score'"
]) {
  if (!app.includes(needle)) throw new Error('Missing V26 behavior: '+needle);
}
const ctx = {window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'model/forecast_v2.js'),'utf8'),ctx);
const F = ctx.window.SIGNAL_FORECAST_V2;
const market = 0.58;
const baseModel = 0.40;
const base = F.blendLogits(baseModel, market, 0.50);
const improvedHome = F.blendLogits(0.60, market, 0.50);
const weakenedHome = F.blendLogits(0.25, market, 0.50);
if (!(improvedHome > base)) throw new Error('Positive model update must improve next-week rematch probability');
if (!(weakenedHome < base)) throw new Error('Negative model update must reduce next-week rematch probability');
console.log('V26 postgame consistency regression PASS');
