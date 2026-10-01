const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function render(hash, view='power'){
  const callbacks={}; const app={innerHTML:''};
  const store={forceRatingView:view};
  const fakeNode=()=>({onclick:null,onchange:null,oninput:null,textContent:'',disabled:false,dataset:{},style:{},appendChild(){},remove(){},insertBefore(){},cloneNode(){return fakeNode()},querySelectorAll(){return []}});
  const doc={visibilityState:'visible',fonts:{ready:Promise.resolve()},styleSheets:[],
    getElementById(id){return id==='app'?app:null},querySelectorAll(){return []},querySelector(){return null},addEventListener(n,cb){callbacks['doc:'+n]=cb},createElement(){return fakeNode()},body:{appendChild(){}}};
  const ctx={console, Math, Date, JSON, Number, String, Array, Object, Set, Map, RegExp, Promise,
    AbortController: class { constructor(){ this.signal={}; } abort(){} },
    Blob: class {}, Image: class {}, URL:{createObjectURL(){return 'blob:x'},revokeObjectURL(){}},
    location:{hash}, localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},document:doc,
    requestAnimationFrame(cb){cb()},setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout,fetch:async()=>{throw new Error('offline test')},alert(){}
  };
  ctx.window=ctx; ctx.global=ctx; ctx.addEventListener=(n,cb)=>callbacks[n]=cb; ctx.window.addEventListener=ctx.addEventListener;
  vm.createContext(ctx);
  for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','model/forecast_v2.js','model/adaptive_v3.js','assets/app.js']){
    vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
  }
  return app.innerHTML;
}
for(const hash of ['#home','#rankings','#matchups','#teams','#teams/KC','#lab','#model','#names']){
  const h=render(hash, hash==='#rankings'?'units':'power');
  if(!h.includes('id="exportPng"')) throw new Error(hash+' missing Export PNG');
  if(!h.includes('id="exportPngMobile"')) throw new Error(hash+' missing mobile PNG export');
  if(!h.includes('id="exportCapture"')) throw new Error(hash+' missing export capture wrapper');
}
const appjs=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
for(const token of ['metricRank[r.team]','function rankLabel','${rankLabel()} rank','function exportCurrentPagePng','social-export-brand','layoutWidth: 1200','canvas.toBlob','function sortKeysForView']){
  if(!appjs.includes(token)) throw new Error('missing V11 behavior: '+token);
}
if(appjs.includes('rows.map((r, i) => rankingRow(r, i + 1')) throw new Error('rank column still uses display row position');
console.log('v11 UI/export smoke test: PASS');
