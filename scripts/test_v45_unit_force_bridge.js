const fs=require('fs'),vm=require('vm');
let checks=0; const ok=(c,m)=>{checks++; if(!c) throw new Error(m)}; const near=(a,b,e,m)=>{checks++; if(Math.abs(Number(a)-Number(b))>e) throw new Error(`${m}: ${a} != ${b}`)};
const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','model/unit_force_bridge.js']) vm.runInContext(fs.readFileSync(rel,'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA, U=ctx.window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
ok(U && D,'bridge/model data loaded');
near(Object.values(U.WEIGHTS).reduce((a,b)=>a+b,0),1,1e-12,'unit weights sum to one');
ok(U.SHARE===.5,'bridge share is 50%'); ok(U.CAP===7.5,'bridge cap is 7.5 FORCE points');
const keys=Object.keys(U.WEIGHTS), prior={}, plus10={}; keys.forEach(k=>{prior[k]=50;plus10[k]=60});
const core=D.meta.meanElo;
let x=U.compute(core,plus10,prior,D.meta);
near(x.weightedUnitDelta,10,1e-12,'all units +10 gives +10 weighted unit delta');
near(x.forceDelta,5,1e-12,'50% bridge turns +10 unit delta into +5 FORCE');
near(x.forceScore,55,1e-12,'mean core +5 bridge becomes FORCE 55');
ok(x.elo>core,'positive unit movement raises canonical Elo');
near(U.scoreFromElo(x.elo,D.meta),x.forceScore,1e-10,'Elo conversion round-trips FORCE score');

const missing={...plus10,passRushIndex:null};
x=U.compute(core,missing,prior,D.meta);
const prWeight=U.WEIGHTS.passRushIndex;
near(x.availableWeight,1-prWeight,1e-12,'missing pass rush removes only its configured available weight');
near(x.weightedUnitDelta,10*(1-prWeight),1e-12,'missing unit weight is not redistributed');
near(x.forceDelta,5*(1-prWeight),1e-12,'missing unit cannot amplify remaining units');

const onlyPR={};keys.forEach(k=>onlyPR[k]=50);onlyPR.passRushIndex=60;
x=U.compute(core,onlyPR,prior,D.meta);
near(x.weightedUnitDelta,10*prWeight,1e-12,'Pass Rush +10 contributes its configured weight');
near(x.forceDelta,5*prWeight,1e-12,'Pass Rush movement reaches overall FORCE');

const huge={};keys.forEach(k=>huge[k]=150);
x=U.compute(core,huge,prior,D.meta);
near(x.forceDelta,7.5,1e-12,'aggregate bridge is capped upward');
const awful={};keys.forEach(k=>awful[k]=-50);
x=U.compute(core,awful,prior,D.meta);
near(x.forceDelta,-7.5,1e-12,'aggregate bridge is capped downward');

const app=fs.readFileSync('assets/app.js','utf8');
ok(app.includes('FORCE_UNIT_FORCE_BRIDGE_MODEL'),'app consumes canonical bridge module');
ok(/function currentRatings\(\)[\s\S]*unitForceBridge\(t,core\[t\]\)/.test(app),'currentRatings applies unit bridge to every team');
ok(app.includes('ratingsWithActiveQBCarryover'),'QB path remains downstream of current ratings');
ok(/function ratingsWithActiveQBCarryover\(source = currentRatings\(\)\)/.test(app),'active QB layer defaults to Unit-to-FORCE-adjusted current ratings');
ok(/function matchups\(\)[\s\S]*const ratings = ratingsWithActiveQBCarryover\(\)/.test(app),'matchup forecasts consume Unit-to-FORCE-adjusted ratings');
ok(/function home\(\)[\s\S]*const ratings = ratingsWithActiveQBCarryover\(\)/.test(app),'home rankings/games consume Unit-to-FORCE-adjusted ratings');
ok(/function teams\(\)[\s\S]*const ratings = ratingsWithActiveQBCarryover\(\)/.test(app),'team projections consume Unit-to-FORCE-adjusted ratings');
const html=fs.readFileSync('index.html','utf8');
ok(html.indexOf('model/unit_force_bridge.js')>=0 && html.indexOf('model/unit_force_bridge.js')<html.indexOf('assets/app.js'),'bridge module loads before app');
console.log(`PASS: V45 Unit-to-FORCE bridge regression (${checks} checks)`);
