const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const callbacks={}; const app={innerHTML:''};
const store={forceRatingView:'advanced'};
const teamIds=[];
const modelText=fs.readFileSync(path.join(root,'data/model-data.js'),'utf8');
const tmp={window:{}}; vm.createContext(tmp); vm.runInContext(modelText,tmp); teamIds.push(...Object.keys(tmp.window.MODEL_DATA.teams));

const schedHeader=['season','game_type','away_team','home_team','gameday','week','away_score','home_score','gametime','away_moneyline','home_moneyline','spread_line','total_line','div_game'];
const sched=[schedHeader.join(',')];
for(let i=0;i<272;i++){
 const a=teamIds[i%teamIds.length], h=teamIds[(i+1)%teamIds.length];
 const completed=i===0; const week=(i%17)+1;
 sched.push(['2026','REG',a,h,`2026-09-${String((i%20)+1).padStart(2,'0')}`,week,completed?'17':'',completed?'24':'','13:00','','','1.5','44.5','0'].join(','));
}
const teamHeader=['season','week','team','season_type','game_id','opponent_team','completions','attempts','sacks_suffered','passing_epa','passing_cpoe','carries','rushing_epa','targets','receiving_epa'];
const teamCsv=[teamHeader.join(',')];
for(let i=0;i<teamIds.length;i++){
 const t=teamIds[i],o=teamIds[(i+1)%teamIds.length];
 teamCsv.push(['2026','1',t,'REG',`2026_01_${t}_${o}`,o,20,30,2,(i-16)/4,(i-16)/3,24,(i-16)/8,28,(i-16)/5].join(','));
}
const playerHeader=['season','week','team','season_type','game_id','opponent_team','position','position_group','player_display_name','attempts','sacks_suffered','passing_epa','passing_cpoe','carries','rushing_epa','targets','receiving_epa','def_penalty','def_penalty_yards'];
const playerCsv=[playerHeader.join(',')];
for(let i=0;i<teamIds.length;i++){
 const t=teamIds[i],o=teamIds[(i+1)%teamIds.length];
 playerCsv.push(['2026','1',t,'REG',`2026_01_${t}_${o}`,o,'QB','QB',`${t} QB`,30,2,(i-16)/4,(i-16)/3,4,(i-16)/12,0,0,0,0].join(','));
 playerCsv.push(['2026','1',t,'REG',`2026_01_${t}_${o}`,o,'WR','WR',`${t} WR`,0,0,0,0,0,0,10,(i-16)/5,0,0].join(','));
 playerCsv.push(['2026','1',t,'REG',`2026_01_${t}_${o}`,o,'DE','DL',`${t} DE`,0,0,0,0,0,0,0,0,1,10].join(','));
}
const fetch=async(url)=>({ok:true,status:200,headers:{get(){return null}},text:async()=> url.includes('/api/health')?JSON.stringify({ok:true,product:'FORCE',app_version:'V121',diagnostic_version:'V116-DIAG-1'}):url.includes('/api/schedule')?sched.join('\n'):url.includes('/api/team-stats')?teamCsv.join('\n'):playerCsv.join('\n')});
const ctx={console,Math,Date,JSON,Number,String,Array,Object,Set,Map,RegExp,Promise,AbortController:class{constructor(){this.signal={}} abort(){}},
 location:{hash:'#teams/'+teamIds[0]},localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},fetch,
 document:{visibilityState:'visible',getElementById(id){return id==='app'?app:null},querySelectorAll(){return []},addEventListener(n,cb){callbacks['doc:'+n]=cb}},
 setInterval(){return 0},clearInterval(){},setTimeout,clearTimeout};
ctx.window=ctx;ctx.global=ctx;ctx.addEventListener=(n,cb)=>callbacks[n]=cb;ctx.window.addEventListener=ctx.addEventListener;
vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/qb-carryover.js','data/predictive-feature-gates.js','data/game-flow-priors-2025.js','model/predictive_features.js','model/qb_regime.js','model/early_regime.js','model/unit_prior_controller.js','model/forecast_v2.js','model/score_normalizer.js','model/unit_force_bridge.js','model/live_profiles.js','model/adaptive_v3.js','assets/app.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
setTimeout(()=>{
 const h=app.innerHTML;
 for(const x of ['OFFENSIVE EPA / PLAY','50% live / 50% prior','metrics refreshed']) if(!h.includes(x)) throw new Error('live refresh integration missing '+x);
 if(h.includes('Unit, luck, and penalty data use the bundled')) throw new Error('stale snapshot warning remains');
 console.log('V25 refresh integration PASS');
},100);
