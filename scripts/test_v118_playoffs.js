const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
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
const ids=Object.keys(teams), records=Object.fromEntries(ids.map(t=>[t,{w:9,l:8,t:0}])), force=Object.fromEntries(ids.map((t,i)=>[t,80-i])), outcomes=[];
const add=(a,b,w)=>outcomes.push({home:a,away:b,winner:w,tie:false});

// Three-team division tie: head-to-head cycle is level; division record decides.
const east=ids.filter(t=>teams[t].division==='AFC East'); const [a,b,c,d]=east;
add(a,b,a); add(b,c,b); add(c,a,c); // each 1-1 among tied three
add(a,d,d); add(b,d,b); add(c,d,d); // B owns best division record
ok(H.resolveDivisionTie([a,b,c],{records,outcomes,force})===b,'three-team division tie must advance best division record after level H2H');

// Cross-division three-team wildcard tie: no H2H sweep, conference record decides.
const north=ids.filter(t=>teams[t].division==='AFC North');
const south=ids.filter(t=>teams[t].division==='AFC South');
const west=ids.filter(t=>teams[t].division==='AFC West');
const [n1,n2,n3]=[north[1],south[1],west[1]];
// Give n1 two conference wins, n2 one, n3 zero; avoid games between tied candidates.
add(n1,north[2],n1); add(n1,north[3],n1);
add(n2,south[2],n2); add(n2,south[3],south[3]);
add(n3,west[2],west[2]); add(n3,west[3],west[3]);
ok(H.resolveCrossDivisionWildcardTie([n1,n2,n3],{records,outcomes,force})===n1,'multi-team wildcard tie must use conference record after no H2H sweep');

// Wild-card procedure must reduce multiple tied clubs from one division before cross-division comparison.
records[a]={w:10,l:7,t:0};records[b]={w:10,l:7,t:0};records[n1]={w:10,l:7,t:0};
// A beat B directly, so B must be removed at the division-reduction stage.
add(a,b,a);
const wc=H.selectWildcardTeam([a,b,n1],{records,outcomes,force});
ok(wc!==b,'wildcard multi-team tie must eliminate lower same-division club before conference comparison');
// Original same-division seeding must persist on subsequent Wild Card passes.
const seededCtx={records,outcomes,force,divisionOrders:{'AFC East':[a,b,c,d]}};
const reduced=H.selectWildcardTeam([b,c,n1],seededCtx);
ok(reduced!==c,'subsequent wildcard pass must preserve original within-division seed order');

// Conference field structure: 4 division winners, 3 wild cards, unique seeds, #1 is division champion.
for(const conf of ['AFC','NFC']){
  const field=H.buildConferenceField(conf,{records,outcomes,force});
  ok(field.winners.length===4,`${conf}: four division winners`);
  ok(field.wild.length===3,`${conf}: three wild cards`);
  ok(field.seeds.length===7 && new Set(field.seeds).size===7,`${conf}: seven unique seeds`);
  ok(field.winnerSet.has(field.seeds[0]),`${conf}: only bye seed starts with division winner`);
}

// Rendering: conferences stack full width, both use the same explicit Bye column.
ok(css.includes('.playoff-grid{grid-template-columns:1fr!important}'),'playoff conferences should stack full-width so NFC Bye is not clipped');
ok(app.includes('<th>Bye</th>'),'playoff table must expose Bye odds');
ok(app.includes("for (const conf of ['AFC','NFC'])") && app.includes('if(i===0) stats[t].bye++'),'both AFC and NFC must increment No. 1 seed bye odds');
ok(app.includes('Official NFL tiebreak order through strength of schedule'),'UI should disclose exact supported tiebreak depth');
console.log(`OK: ${n} V118 playoff/tiebreak assertions`);
