const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const app={innerHTML:''};
const callbacks={};
const els={
  qbCarryoverQB:{value:'Patrick Mahomes'},
  qbCarryoverElo:{value:'47.3'},
  qbCarryoverValue:{textContent:''},
  applyQBCarryover:{onclick:null},
  clearQBCarryover:{onclick:null,disabled:false}
};
const ctx={console,Math,Date,JSON,Number,String,Array,Object,Set,Map,RegExp,Promise,
  AbortController:class{constructor(){this.signal={}} abort(){}},
  location:{hash:'#teams/KC'},
  localStorage:{getItem(){return null},setItem(){}},
  document:{visibilityState:'visible',getElementById(id){if(id==='app')return app;return els[id]||null},querySelectorAll(){return[]},addEventListener(){}},
  setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},
  fetch:()=>new Promise(()=>{})
};
ctx.window=ctx;ctx.global=ctx;ctx.addEventListener=(name,cb)=>{callbacks[name]=cb};ctx.window.addEventListener=ctx.addEventListener;
vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','model/forecast_v2.js','model/adaptive_v3.js','assets/app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
if(!app.innerHTML.includes('OFFENSE PROFILE') || !app.innerHTML.includes('QB UNIT')) throw new Error('carryover unit preview missing');
const m=app.innerHTML.match(/<span>OFFENSE PROFILE<\/span><strong>([0-9.]+) → ([0-9.]+)<\/strong>/);
if(!m) throw new Error('offense preview values missing');
if(!(Number(m[2]) > Number(m[1]) + 10)) throw new Error('QB return should materially lift offense profile in KC preset');
els.applyQBCarryover.onclick();
ctx.location.hash='#game/'+encodeURIComponent('1|2026-09-14|DEN|KC');
callbacks.hashchange();
for(const needle of ['Overall edge','OL vs defensive front','QB vs coverage','Receivers vs coverage','rows below explain specific matchups','QB-return scenario']){
  if(!app.innerHTML.includes(needle)) throw new Error('matchup clarity missing: '+needle);
}
if(app.innerHTML.includes('Trench edge:')) throw new Error('old trench jargon still present');
if(app.innerHTML.includes('matchup pts')) throw new Error('ambiguous signed matchup-points label still present');
const duel=app.innerHTML.match(/Offensive profile[\s\S]{0,1200}?KC<\/b><strong>([0-9.]+)/);
if(!duel) throw new Error('KC offensive profile not found in matchup duel');
if(!(Number(duel[1]) >= 70)) throw new Error('KC matchup offense did not reflect QB-return scenario');
console.log('v14 matchup clarity + QB unit propagation: PASS');
