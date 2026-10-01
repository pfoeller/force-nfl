const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const modelSrc = fs.readFileSync(path.join(root,'data/model-data.js'),'utf8');
const context = { window:{} }; vm.createContext(context); vm.runInContext(modelSrc, context);
const D = context.window.MODEL_DATA;
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};
ok(Math.abs(D.config.reversion - 0.30) < 1e-12, 'current-era runtime reversion must be 30%');
ok(Math.abs(D.config.legacyReversion - 0.333) < 1e-12, 'legacy 33.3% reference must remain explicit');
ok(D.config.reversionEra === '2021+', 'reversion era metadata missing');
ok(app.includes('offseasonMean + (Number(x.elo) - offseasonMean) * (1 - offseasonReversion)'), 'seasonEngine must regress preseason ratings before replay');
ok(app.includes('const coreRatings = { ...preseasonRatings };'), 'core Elo replay must start from regressed preseason ratings');
ok(app.includes('preseasonRatings, offseasonMean, offseasonReversion'), 'season engine audit fields missing');
const mean = Number(D.meta.meanElo);
for (const row of D.rankings) {
  const pre = mean + (Number(row.elo)-mean)*(1-D.config.reversion);
  const originalDist = Math.abs(Number(row.elo)-mean);
  const preDist = Math.abs(pre-mean);
  ok(Math.abs(preDist - originalDist*0.70) < 1e-8, `${row.team}: preseason distance should retain 70% of prior distance`);
  if (originalDist > 1e-9) ok(preDist < originalDist, `${row.team}: rating should move toward mean`);
}
const sea = D.rankings.find(x=>x.team==='SEA');
const ten = D.rankings.find(x=>x.team==='TEN');
const seaPre = mean + (sea.elo-mean)*0.70;
const tenPre = mean + (ten.elo-mean)*0.70;
ok(seaPre < sea.elo, 'elite SEA should regress downward');
ok(tenPre > ten.elo, 'low TEN should regress upward');
console.log(`OK: ${n} V51 offseason-reversion assertions; SEA ${sea.elo.toFixed(1)} -> ${seaPre.toFixed(1)}, TEN ${ten.elo.toFixed(1)} -> ${tenPre.toFixed(1)}`);
