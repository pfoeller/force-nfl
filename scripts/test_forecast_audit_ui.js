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

// Matchup Center must include completed, current-week, and upcoming games.
location.hash = '#matchups';
callbacks.hashchange();
const completed = (app.innerHTML.match(/data-status="completed"/g) || []).length;
const current = (app.innerHTML.match(/data-status="current"/g) || []).length;
const upcoming = (app.innerHTML.match(/data-status="upcoming"/g) || []).length;
if (completed !== 15) throw new Error(`expected 15 completed fallback games, got ${completed}`);
if (current < 1) throw new Error('current-week game classification missing');
if (upcoming < 1) throw new Error('upcoming game classification missing');
if (!app.innerHTML.includes('Pred line') || !app.innerHTML.includes('Pred score') || !app.innerHTML.includes('<b>Final</b>')) {
  throw new Error('forecast audit fields missing from matchup cards');
}

// Open a known completed Week 1 game and verify frozen prediction + actual final.
const completedMatch = app.innerHTML.match(/data-status="completed"[\s\S]*?data-game="([^"]+)"/);
if (!completedMatch) throw new Error('could not locate completed clickable game');
location.hash = '#game/' + completedMatch[1];
callbacks.hashchange();
for (const needle of ['FORCEcast','Predicted line','Predicted final score','Actual final','margin error','What changed','Predicted rematch line','Predicted rematch score']) {
  if (!app.innerHTML.includes(needle)) throw new Error('completed game audit missing: ' + needle);
}

// Team page should show both prediction and final for completed games.
location.hash = '#teams/BUF';
callbacks.hashchange();
if (!app.innerHTML.includes('schedule-audit') || !app.innerHTML.includes('<b>Pred</b>') || !app.innerHTML.includes('<b>Final</b>') || !app.innerHTML.includes('<b>Rating</b>') || !app.innerHTML.includes('<b>Rematch</b>')) {
  throw new Error('team schedule forecast-vs-actual audit missing');
}
console.log('forecast audit UI tests: PASS');
