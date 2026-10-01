const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function render(hash, view='power'){
  const callbacks={}; const app={innerHTML:''};
  const store={forceRatingView:view};
  const ctx={console, __FORCE_ALLOW_DEGRADED_TEST_DATA__:true, Math, Date, JSON, Number, String, Array, Object, Set, Map, RegExp, Promise,
    AbortController: class { constructor(){ this.signal={}; } abort(){} },
    location:{hash}, localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
    document:{visibilityState:'visible',getElementById(id){return id==='app'?app:null},querySelectorAll(){return []},addEventListener(n,cb){callbacks['doc:'+n]=cb}},
    setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout, fetch:async()=>{throw new Error('offline test')}
  };
  ctx.window=ctx; ctx.global=ctx; ctx.addEventListener=(n,cb)=>callbacks[n]=cb; ctx.window.addEventListener=ctx.addEventListener;
  vm.createContext(ctx);
  for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','model/forecast_v2.js','model/adaptive_v3.js','assets/app.js']){
    vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
  }
  return app.innerHTML;
}
let h=render('#home','power');
if(!h.includes('card-head-actions') || !h.includes('data-qbquick="KC"')) throw new Error('home FORCE Rankings missing one-click KC QB fix');
h=render('#rankings','units');
for(const x of ['data-ranksort="off"','data-ranksort="def"','data-ranksort="qb"','data-ranksort="ol"','data-ranksort="passRush"','data-ranksort="runDef"','data-ranksort="cov"','data-ranksort="rb"','data-ranksort="rec"']) if(!h.includes(x)) throw new Error('missing sortable unit '+x);
if(h.includes('data-qbquick="KC"')) throw new Error('Units rankings must not show QB-return controls');
h=render('#teams/KC');
if(!h.includes('data-qbquick="KC"') || !h.includes('Apply QB fix')) throw new Error('team page missing quick QB fix');
h=render('#game/'+encodeURIComponent('1|2026-09-14|DEN|KC'));
if(!h.includes('matchup-pair')) throw new Error('matchup page missing equal-pair layout');
if(!h.includes('<h3>Weaknesses</h3>')) throw new Error('matchup page did not rename Watch-outs');
if(h.includes('Watch-outs')) throw new Error('legacy Watch-outs label remains');
if(!h.includes('--team-accent:#FB4F14') || !h.includes('--team-accent:#E31837')) throw new Error('DEN/KC team accents missing');
if(!h.includes('data-qbquick="KC"')) throw new Error('matchup page missing quick QB fix');
console.log('v10 UI smoke test: PASS');
