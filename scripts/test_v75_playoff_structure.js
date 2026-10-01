const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

const teams={};
for(const conf of ['AFC','NFC']) for(const div of ['East','North','South','West']) for(let i=1;i<=4;i++){
  const id=`${conf[0]}${div[0]}${i}${conf==='AFC'?'A':'N'}`;
  teams[id]={name:id,division:`${conf} ${div}`};
}
const ctx={
  window:{
    __FORCE_TEST_MODE__:true,
    MODEL_DATA:{teams,rankings:[],fallbackSchedule:[],config:{hfa:48,scale:400},meta:{meanElo:1505,anchorMin:1300,anchorMax:1750}},
    SIGNAL_FORECAST_V2:{}, SIGNAL_ADAPTIVE_V3:{}, MATCHUP_DATA:{meta:{},profiles:{}}, QB_CARRYOVER:{meta:{},presets:{},study:{}},
    FORCE_SCORE_NORMALIZER:null, FORCE_LIVE_PROFILE:null, FORCE_PREDICTIVE_FEATURES:null, FORCE_QB_REGIME:null, FORCE_EARLY_REGIME:null,
    FORCE_UNIT_PRIOR:null, OPENING_LINES_2026:{}, FORCE_GAME_FLOW_PRIORS_2025:null, FORCE_UNIT_FORCE_BRIDGE_MODEL:null,
    addEventListener(){}
  },
  document:{getElementById(){return null},addEventListener(){}},
  localStorage:{getItem(){return null},setItem(){}},
  setInterval(){return 0}, clearInterval(){}, setTimeout(){return 0}, clearTimeout(){},
  location:{hash:''}, console, fetch:async()=>({ok:false}), URL, Blob, Math, Date, Number, String, Object, Array, Set, Map, RegExp, JSON
};
ctx.window.window=ctx.window; ctx.window.document=ctx.document; ctx.window.localStorage=ctx.localStorage; ctx.window.location=ctx.location;
vm.createContext(ctx); vm.runInContext(app,ctx,{filename:'app.js'});
const H=ctx.window.FORCE_PROJECTION_TEST_HOOKS;
if(!H) throw new Error('V75 projection test hooks missing');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};

const ids=Object.keys(teams);
const records=Object.fromEntries(ids.map(t=>[t,{w:9,l:8,t:0}]));
const force=Object.fromEntries(ids.map((t,i)=>[t,80-i]));
const outcomes=[];
// Make AFC East A2 beat A1 head-to-head. Both have identical final records,
// and A1 deliberately has the higher FORCE fallback.
const afcEast=ids.filter(t=>teams[t].division==='AFC East');
const [a1,a2]=afcEast;
force[a1]=95; force[a2]=50;
records[afcEast[2]]={w:8,l:9,t:0}; records[afcEast[3]]={w:7,l:10,t:0};
outcomes.push({home:a1,away:a2,winner:a2,tie:false});
// Populate enough neutral games that strength metrics are defined.
for(let i=0;i<ids.length;i+=2){ if(ids[i]&&ids[i+1] && !([ids[i],ids[i+1]].includes(a1)&&[ids[i],ids[i+1]].includes(a2))) outcomes.push({home:ids[i],away:ids[i+1],winner:ids[i],tie:false}); }
const pctx={records,outcomes,force};
const eastRank=H.rankDivisionTeams('AFC East',pctx);
ok(eastRank[0]===a2,'head-to-head must beat FORCE fallback in a tied division');

for(const conf of ['AFC','NFC']){
  const field=H.buildConferenceField(conf,pctx);
  ok(field.seeds.length===7,`${conf} must contain exactly seven playoff teams`);
  ok(field.winners.length===4,`${conf} must contain exactly four division winners`);
  ok(field.wild.length===3,`${conf} must contain exactly three wild cards`);
  ok(new Set(field.seeds).size===7,`${conf} seeds must be unique`);
  for(let i=0;i<4;i++) ok(field.winnerSet.has(field.seeds[i]),`${conf} seed ${i+1} must be a division winner`);
  for(let i=4;i<7;i++) ok(!field.winnerSet.has(field.seeds[i]),`${conf} seed ${i+1} must be a wild card`);
  ok(field.winnerSet.has(field.seeds[0]),`${conf} bye seed must be a division winner`);
}

ok(app.includes('projectedSeedByTeam[t]||\'Out\''),'displayed projected seed must come from one coherent field');
ok(!app.includes("let seed='Out', seedN=PROJECTION_RUNS-s.playoffs"),'independent per-team modal seed logic must be removed');
ok(app.includes('strengthOfVictory')&&app.includes('strengthOfSchedule'),'late tiebreak criteria must be present');
ok(app.includes('commonGamesRecord'),'common-games tiebreak must be present');
console.log(`OK: ${n} V75 playoff-structure/tiebreak assertions`);
