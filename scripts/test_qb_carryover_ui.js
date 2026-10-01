const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const app={innerHTML:''};
const els={
  qbCarryoverQB:{value:'Patrick Mahomes'},
  qbCarryoverElo:{value:'47.3'},
  qbCarryoverValue:{textContent:''},
  applyQBCarryover:{onclick:null},
  clearQBCarryover:{onclick:null,disabled:false}
};
const ctx={console,__FORCE_ALLOW_DEGRADED_TEST_DATA__:true,Math,Date,JSON,Number,String,Array,Object,Set,Map,RegExp,Promise,
  AbortController:class{constructor(){this.signal={}} abort(){}},
  location:{hash:'#teams/KC'},
  localStorage:{getItem(){return null},setItem(){}},
  document:{visibilityState:'visible',getElementById(id){if(id==='app')return app;return els[id]||null},querySelectorAll(){return[]},addEventListener(){}},
  setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},
  fetch:()=>new Promise(()=>{})
};
ctx.window=ctx;ctx.global=ctx;ctx.addEventListener=()=>{};ctx.window.addEventListener=ctx.addEventListener;
vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','data/predictive-feature-gates.js','model/predictive_features.js','model/qb_regime.js','model/forecast_v2.js','model/adaptive_v3.js','assets/app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
for(const x of ['QB Return Lab','Patrick Mahomes 2025 preset','+47.3 Elo','>AUTO<','QB auto +15.8']) if(!app.innerHTML.includes(x)) throw new Error('initial V33 carryover panel missing '+x);
if(!/Elo \d+\.\d <span class="muted-strike">/.test(app.innerHTML)) throw new Error('automatic adjusted raw Elo not displayed');
els.applyQBCarryover.onclick();
for(const x of ['>MANUAL<','QB manual +47.3 Elo','base projection']) if(!app.innerHTML.includes(x)) throw new Error('manual carryover state missing '+x);
els.clearQBCarryover.onclick();
if(!app.innerHTML.includes('>AUTO<') || !app.innerHTML.includes('QB auto +15.8')) throw new Error('reset must return to automatic verified regime correction');
console.log('QB carryover UI smoke test: PASS');
