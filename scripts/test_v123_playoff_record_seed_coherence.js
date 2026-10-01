const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const teams={};
for(const conf of ['AFC','NFC']) for(const div of ['East','North','South','West']) for(let i=1;i<=4;i++){
  const id=`${conf[0]}${div[0]}${i}${conf==='AFC'?'A':'N'}`;
  teams[id]={name:id,division:`${conf} ${div}`};
}
const ctx={window:{__FORCE_TEST_MODE__:true,MODEL_DATA:{teams,rankings:[],fallbackSchedule:[],config:{hfa:48,scale:400},meta:{meanElo:1505,anchorMin:1300,anchorMax:1750}},SIGNAL_FORECAST_V2:{},SIGNAL_ADAPTIVE_V3:{},MATCHUP_DATA:{meta:{},profiles:{}},QB_CARRYOVER:{meta:{},presets:{},study:{}},FORCE_SCORE_NORMALIZER:null,FORCE_LIVE_PROFILE:null,FORCE_PREDICTIVE_FEATURES:null,FORCE_QB_REGIME:null,FORCE_EARLY_REGIME:null,FORCE_UNIT_PRIOR:null,OPENING_LINES_2026:{},FORCE_GAME_FLOW_PRIORS_2025:null,FORCE_UNIT_FORCE_BRIDGE_MODEL:null,addEventListener(){}},document:{getElementById(){return null},addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},location:{hash:''},console,fetch:async()=>({ok:false}),URL,Blob,Math,Date,Number,String,Object,Array,Set,Map,RegExp,JSON};
ctx.window.window=ctx.window;ctx.window.document=ctx.document;ctx.window.localStorage=ctx.localStorage;ctx.window.location=ctx.location;
vm.createContext(ctx);vm.runInContext(app,ctx,{filename:'app.js'});
const H=ctx.window.FORCE_PROJECTION_TEST_HOOKS;if(!H) throw new Error('projection hooks missing');
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
const ids=Object.keys(teams),records=Object.fromEntries(ids.map(t=>[t,{w:6,l:11,t:0}])),force=Object.fromEntries(ids.map((t,i)=>[t,95-i])),outcomes=[];
const winners={
  'AFC East':{team:ids.find(t=>teams[t].division==='AFC East'),record:{w:14,l:3,t:0}},
  'AFC North':{team:ids.find(t=>teams[t].division==='AFC North'),record:{w:13,l:4,t:0}},
  'AFC South':{team:ids.find(t=>teams[t].division==='AFC South'),record:{w:12,l:5,t:0}},
  'AFC West':{team:ids.find(t=>teams[t].division==='AFC West'),record:{w:11,l:6,t:0}},
};
for(const v of Object.values(winners)) records[v.team]=v.record;
const field=H.buildConferenceField('AFC',{records,outcomes,force});
ok(field.seeds[0]===winners['AFC East'].team,'14-3 division winner must be seeded above 13-4 division winner');
ok(field.seeds[1]===winners['AFC North'].team,'13-4 division winner should follow 14-3 winner');
console.log(`PASS: V124 inherited playoff record/seed coherence (${n} checks)`);
