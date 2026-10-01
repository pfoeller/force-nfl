const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const app={innerHTML:''}; const callbacks={};
const ctx={console,Math,Date,JSON,Number,String,Array,Object,Set,Map,RegExp,Promise,
  AbortController:class{constructor(){this.signal={}} abort(){}},
  location:{hash:'#game/'+encodeURIComponent('1|2026-09-14|DEN|KC')},
  localStorage:{getItem(){return null},setItem(){}},
  document:{visibilityState:'visible',getElementById(id){return id==='app'?app:null},querySelectorAll(){return[]},addEventListener(){}},
  setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},fetch:()=>new Promise(()=>{})};
ctx.window=ctx;ctx.global=ctx;ctx.addEventListener=(n,cb)=>callbacks[n]=cb;ctx.window.addEventListener=ctx.addEventListener;
vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','model/forecast_v2.js','model/adaptive_v3.js','assets/app.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
// Embedded KC_DEN spreadLine is +2.5 in nflverse/home-margin convention.
if(!app.innerHTML.includes('KC -2.5 · DEN +2.5')) throw new Error('market line did not convert internal +2.5 home margin to sportsbook notation');
if(app.innerHTML.includes('KC +2.5 · total')) throw new Error('raw internal spread leaked into sportsbook display');
if(!app.innerHTML.includes('negative = favorite')) throw new Error('spread convention helper text missing');
const V2=ctx.SIGNAL_FORECAST_V2;
if(!(V2.spreadToProbability(2.5)>0.5)) throw new Error('positive internal spread should favor home probability');
if(!(V2.spreadToProbability(-2.5)<0.5)) throw new Error('negative internal spread should favor away probability');
console.log('v16 spread sign + display convention: PASS');
