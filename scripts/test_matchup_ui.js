const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const callbacks = {};
const app = { innerHTML: '' };
global.window = global;
global.location = { hash: '' };
global.localStorage = { getItem(){ return null; }, setItem(){} };
global.document = {
  visibilityState: 'visible',
  getElementById(id){ return id === 'app' ? app : null; },
  querySelectorAll(){ return []; },
  addEventListener(name, cb){ callbacks['doc:'+name] = cb; }
};
global.addEventListener = (name, cb) => { callbacks[name] = cb; };
global.window.addEventListener = global.addEventListener;
global.setInterval = () => 0;
global.clearInterval = () => {};
global.fetch = async () => { throw new Error('offline test'); };
function run(rel){ vm.runInThisContext(fs.readFileSync(path.join(root, rel), 'utf8'), { filename: rel }); }
run('data/model-data.js');
run('data/opening-lines.js');
run('data/matchup-data.js');
run('model/forecast_v2.js');
run('model/adaptive_v3.js');
run('assets/app.js');
if (!app.innerHTML.includes('NFL strength, explained.')) throw new Error('home did not render');
if (!app.innerHTML.includes('Week 1')) throw new Error('home current-week games missing');
if (!app.innerHTML.includes('Pred line') || !app.innerHTML.includes('Pred score') || !app.innerHTML.includes('<b>Final</b>')) throw new Error('home forecast-vs-actual strip missing');
const m = app.innerHTML.match(/data-game="([^"]+)"/);
if (!m) throw new Error('no clickable game found on home');
location.hash = '#game/' + m[1];
callbacks.hashchange();
for (const needle of ['Matchup edges','Luck, penalties, and market','Predicted line','Predicted final score','FORCEcast','Actual final','Postgame FORCE & rematch']) {
  if (!app.innerHTML.includes(needle)) throw new Error('game report missing: '+needle);
}
if (!/Penalty impact/.test(app.innerHTML)) throw new Error('penalty context missing');
if (!/offense vs/.test(app.innerHTML)) throw new Error('offense-defense detail missing');
console.log('matchup UI smoke test: PASS');
