const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const teams={A:{name:'A',division:'AFC East'},B:{name:'B',division:'AFC North'},C:{name:'C',division:'AFC South'},D:{name:'D',division:'AFC West'}};
const ctx={window:{__FORCE_TEST_MODE__:true,MODEL_DATA:{teams,rankings:[],fallbackSchedule:[],config:{hfa:48,scale:400},meta:{meanElo:1505,anchorMin:1300,anchorMax:1750}},SIGNAL_FORECAST_V2:{},SIGNAL_ADAPTIVE_V3:{},MATCHUP_DATA:{meta:{},profiles:{}},QB_CARRYOVER:{meta:{},presets:{},study:{}},FORCE_SCORE_NORMALIZER:null,FORCE_LIVE_PROFILE:null,FORCE_PREDICTIVE_FEATURES:null,FORCE_QB_REGIME:null,FORCE_EARLY_REGIME:null,FORCE_UNIT_PRIOR:null,OPENING_LINES_2026:{},FORCE_GAME_FLOW_PRIORS_2025:null,FORCE_UNIT_FORCE_BRIDGE_MODEL:null,addEventListener(){}},document:{getElementById(){return null},addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},location:{hash:''},console,fetch:async()=>({ok:false}),URL,Blob,Math,Date,Number,String,Object,Array,Set,Map,RegExp,JSON};
ctx.window.window=ctx.window;ctx.window.document=ctx.document;ctx.window.localStorage=ctx.localStorage;ctx.window.location=ctx.location;
vm.createContext(ctx);vm.runInContext(app,ctx,{filename:'app.js'});
const H=ctx.window.FORCE_PROJECTION_TEST_HOOKS;if(!H) throw new Error('projection hooks missing');
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
const snapshots=[
 {records:{A:{w:17,l:0,t:0},B:{w:16,l:1,t:0},C:{w:15,l:2,t:0},D:{w:14,l:3,t:0}},divisionFinish:{},seedByTeam:{A:1,B:2,C:3,D:4},divisionWinner:['A','B','C','D']},
 {records:{A:{w:14,l:3,t:0},B:{w:13,l:4,t:0},C:{w:12,l:5,t:0},D:{w:11,l:6,t:0}},divisionFinish:{},seedByTeam:{A:1,B:2,C:3,D:4},divisionWinner:['A','B','C','D']},
 {records:{A:{w:12,l:5,t:0},B:{w:12,l:5,t:0},C:{w:12,l:5,t:0},D:{w:12,l:5,t:0}},divisionFinish:{},seedByTeam:{A:2,B:1,C:3,D:4},divisionWinner:['A','B','C','D']}
];
const expected={A:13.8,B:13.2,C:12.1,D:11.3};
const pick=H.selectRepresentativeProjection(snapshots,Object.keys(teams),expected,{}).representative;
ok(pick===snapshots[1],'representative run should be closest to Monte Carlo expected-win vector, not all-favorites extreme');
// Real tiebreak ordering must still respect record before any tie criteria.
const records={A:{w:14,l:3,t:0},B:{w:13,l:4,t:0},C:{w:10,l:7,t:0},D:{w:9,l:8,t:0}};
const field=H.buildConferenceField('AFC',{records,outcomes:[],force:{A:70,B:99,C:80,D:75}});
ok(field.seeds[0]==='A','14-3 division winner must seed above 13-4 regardless of FORCE fallback');
ok(app.includes('one representative simulated season') && app.includes('The playoff, division, and bye percentages use every simulation'),'UI should explain the representative simulated season separately from every-simulation odds (UX-14 tranche B public wording)');
ok(!app.includes('g.pHome>0.5 ? g.home'),'deterministic all-favorites projection path must be absent');
console.log(`PASS: V124 representative playoff projection (${n} checks)`);
