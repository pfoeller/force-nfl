const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function render(view, hash){
  const callbacks={}; const app={innerHTML:''};
  const store={forceRatingView:view};
  const ctx={console, __FORCE_ALLOW_DEGRADED_TEST_DATA__:true, Math, Date, JSON, Number, String, Array, Object, Set, Map, RegExp, Promise, AbortController: class { constructor(){ this.signal={}; } abort(){} },
    location:{hash},
    localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
    document:{visibilityState:'visible',getElementById(id){return id==='app'?app:null},querySelectorAll(){return []},addEventListener(n,cb){callbacks['doc:'+n]=cb}},
    setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout,
    fetch:async()=>{throw new Error('offline test')}
  };
  ctx.window=ctx; ctx.global=ctx; ctx.addEventListener=(n,cb)=>callbacks[n]=cb; ctx.window.addEventListener=ctx.addEventListener;
  vm.createContext(ctx);
  for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','model/forecast_v2.js','model/live_profiles.js','model/adaptive_v3.js','assets/app.js']){
    vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
  }
  return app.innerHTML;
}
let h=render('luck','#rankings');
for(const x of ['Luck score','Expected','FORCE Rankings','data-ratingview="penalties"']) if(!h.includes(x)) throw new Error('luck rankings missing '+x);
h=render('penalties','#rankings');
for(const x of ['Penalty impact','Causal EPA / WPA','Events for/against','Live games']) if(!h.includes(x)) throw new Error('penalty rankings missing '+x);
h=render('units','#rankings');
for(const x of ['data-ranksort="off"','data-ranksort="def"','data-ranksort="qb"','data-ranksort="ol"','data-ranksort="passRush"','data-ranksort="runDef"','data-ranksort="cov"','data-ranksort="rb"','data-ranksort="rec"']) if(!h.includes(x)) throw new Error('unit rankings missing sortable header '+x);
h=render('advanced','#teams/BUF');
for(const x of ['Choose a view','OFFENSIVE EPA / PLAY','RECENT VS SPREAD','CURRENT VEGAS WEIGHT']) if(!h.includes(x)) throw new Error('advanced team page missing '+x);
h=render('luck','#teams/SEA');
for(const x of ['EXPECTED WINS','LUCK SCORE','ACTUAL 2026 RECORD']) if(!h.includes(x)) throw new Error('luck team page missing '+x);
h=render('penalties','#teams/SEA');
for(const x of ['PENALTY IMPACT','NET PENALTY EPA / WPA','2026 SAMPLE']) if(!h.includes(x)) throw new Error('penalty team page missing '+x);
console.log('diagnostic views smoke test: PASS');
