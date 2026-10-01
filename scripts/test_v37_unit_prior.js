const fs = require('fs');
const vm = require('vm');
let assertions = 0;
function ok(x,msg){ assertions++; if(!x) throw new Error(msg); }
function near(a,b,e=1e-9){ return Math.abs(a-b)<=e; }

const sandbox={window:{}}; vm.createContext(sandbox);
for (const f of ['model/early_regime.js','model/unit_prior_controller.js','model/live_profiles.js']) {
  vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
}
const ER=sandbox.window.FORCE_EARLY_REGIME;
const UP=sandbox.window.FORCE_UNIT_PRIOR;
const LP=sandbox.window.FORCE_LIVE_PROFILE;

ok(!!ER && !!UP && !!LP,'V37 modules must load');
ok(near(UP.effectivePriorGames(0),1),'no regime signal must retain one prior game');
ok(near(UP.effectivePriorGames(7),.25),'capped positive signal must reduce prior to .25');
ok(near(UP.effectivePriorGames(-7),.25),'capped negative signal must reduce prior to .25');
ok(near(UP.liveWeight(1,0),.5),'one live game with no regime signal must stay 50/50');
ok(near(UP.liveWeight(1,7),.8),'one live game at max regime signal must become 80% live');

const state={};
ER.addObservation(state,'AAA',20,1600);
const pts=ER.rawCorrectionPoints('AAA',2,state);
ok(pts>0,'strong positive Week-1 surprise should create positive Week-2 regime signal');
const pg=UP.effectivePriorGames(pts);
ok(pg<1 && pg>=.25,'positive regime signal must reduce but bound prior games');
const oldHigh=LP.blend(20,80,1,1);
const fastHigh=LP.blend(20,80,1,pg);
ok(fastHigh>oldHigh && fastHigh<80,'reduced prior must move a strong live unit farther toward its own live grade');
const oldLow=LP.blend(80,20,1,1);
const fastLow=LP.blend(80,20,1,pg);
ok(fastLow<oldLow && fastLow>20,'same positive team signal must move a weak live unit DOWN toward its own evidence, not give a blanket bonus');

const negState={};
ER.addObservation(negState,'AAA',-20,1600);
const negPts=ER.rawCorrectionPoints('AAA',2,negState);
ok(negPts<0,'negative surprise should create negative team signal');
ok(near(UP.effectivePriorGames(negPts),UP.effectivePriorGames(-negPts)),'unit prior confidence must depend on magnitude, not team-signal direction');
ok(near(UP.effectivePriorGames(ER.rawCorrectionPoints('AAA',7,state)),1),'Week 7 must restore ordinary unit prior strength');

const app=fs.readFileSync('assets/app.js','utf8');
const live=fs.readFileSync('model/live_profiles.js','utf8');
const html=fs.readFileSync('index.html','utf8');
ok(html.includes('model/unit_prior_controller.js'),'index must load V37 controller');
ok(app.includes('regimeRawCorrectionPoints(t, week, earlyStates || {})'),'app must derive unit prior confidence from the production continuity signal');
ok(app.includes('priorGamesByTeam: unitPriorGamesMap(engine.nextWeek, engine.earlyStates)'),'current live profiles must consume regime-aware prior map');
ok(app.includes('historicalEarlyStates = earlyStatesBeforeWeek(bw, engine)'),'historical unit views must rebuild leakage-safe early state');
ok(app.includes('priorGamesByTeam: unitPriorGamesMap(bw, historicalEarlyStates)'),'historical profiles must use only pre-week regime state');
ok(live.includes('resolvedPriorGames(team, priorGames, priorGamesByTeam)'),'live profile builder must support team-specific prior strength');
ok(live.includes('priorAccelerated:teamPriorGames < Number(priorGames)-1e-9'),'live profile metadata must expose accelerated prior status');

console.log(`OK: ${assertions} V37 regime-aware unit-prior assertions`);
