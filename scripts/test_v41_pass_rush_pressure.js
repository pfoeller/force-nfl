const fs=require('fs'),vm=require('vm');
let passed=0;
function ok(c,m){ if(!c) throw new Error(m); passed++; }
function near(a,b,e=1e-9,m=''){ if(Math.abs(a-b)>e) throw new Error(`${m}: ${a} != ${b}`); passed++; }
const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/matchup-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/model-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('model/live_profiles.js','utf8'),ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE, M=ctx.window.MATCHUP_DATA, D=ctx.window.MODEL_DATA;

ok(LP.PASS_RUSH_WEIGHTS.pressure===1 && LP.PASS_RUSH_WEIGHTS.hitBonus===.20 && LP.PASS_RUSH_WEIGHTS.sackBonus===.60,'V41 weights');
near(LP.passRushCompositeRate({pressureRate:.30,hitRate:.10,sackRate:.05}),.35,1e-12,'weighted pressure');
ok(LP.passRushCompositeRate({pressureRate:.30,hitRate:.10,sackRate:.05}) > LP.passRushCompositeRate({pressureRate:.30,hitRate:.05,sackRate:.02}),'finishing bonuses matter');

const teams=Object.keys(D.teams);
function pfrRow(season,week,def,rate,hits,sacks,hurries){
  const db=40, pressures=rate*db;
  return {season:String(season),week:String(week),game_type:'REG',game_id:`${season}_${String(week).padStart(2,'0')}_OFF_${def}`,team:'OFF',opponent:def,
    times_pressured:String(pressures),times_pressured_pct:String(rate*100),times_hit:String(hits),times_sacked:String(sacks),times_hurried:String(hurries)};
}
const prior=[];
for(let w=1;w<=2;w++) teams.forEach((t,i)=>{
  const rate=.14 + (i/31)*.20 + (w-1)*.005;
  const sacks=1+(i%4)*.5, hits=2+(i%5), hurries=Math.max(1,rate*40-hits-sacks);
  prior.push(pfrRow(2025,w,t,rate,hits,sacks,hurries));
});
ok(LP.pfrChartingReady(prior),'2025 pressure charting recognized');
const pg=LP.pfrDefenseGames(prior);
ok(LP.rollingPassRushBenchmarks(pg,1).length===64,'one-game benchmark uses all 2025 team-games');
ok(LP.rollingPassRushBenchmarks(pg,2).length===32,'two-game benchmark uses same-sized rolling windows');

const stale=teams.map((t,i)=>pfrRow(2026,1,t,.05,0,2,0)).map(r=>({...r,times_pressured:r.times_sacked,times_pressured_pct:'5'}));
ok(!LP.pfrChartingReady(stale),'sacks-only placeholder rejected');

const current=teams.map((t,i)=>pfrRow(2026,1,t,.25,3,2,5));
// Deliberately contrast the two cases discussed: Dallas low pressure despite two sacks;
// Kansas City elite pressure, with the same sack count receiving much more base credit.
Object.assign(current[teams.indexOf('DAL')],pfrRow(2026,1,'DAL',.20,2,2,4));
Object.assign(current[teams.indexOf('KC')],pfrRow(2026,1,'KC',.50,4,4,12));
ok(LP.pfrChartingReady(current),'current pressure charting recognized');

const teamRows=[
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DAL_NYG',team:'DAL',opponent_team:'NYG',attempts:'34',sacks_suffered:'0',carries:'18',def_qb_hits:'6',def_sacks:'2',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DAL_NYG',team:'NYG',opponent_team:'DAL',attempts:'29',sacks_suffered:'2',carries:'37',def_qb_hits:'0',def_sacks:'0',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'KC',opponent_team:'DEN',attempts:'30',sacks_suffered:'1',carries:'25',def_qb_hits:'5',def_sacks:'4',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'DEN',opponent_team:'KC',attempts:'28',sacks_suffered:'4',carries:'20',def_qb_hits:'0',def_sacks:'0',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'}
];
const schedule=[
 {season:2026,week:1,game_type:'REG',game_id:'2026_01_DAL_NYG',away:'DAL',home:'NYG',awayScore:24,homeScore:20},
 {season:2026,week:1,game_type:'REG',game_id:'2026_01_DEN_KC',away:'DEN',home:'KC',awayScore:20,homeScore:27}
];
const profiles=LP.buildProfiles({teamRows,playerRows:[],pfrPassRows:current,priorPfrPassRows:prior,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
const dal=profiles.DAL,kc=profiles.KC;
near(dal.dl.pressure_rate,.20,1e-12,'Dallas uses true charted pressure, not hit+sack proxy');
near(kc.dl.pressure_rate,.50,1e-12,'KC uses true charted pressure');
ok(kc.passRushIndex > dal.passRushIndex + 15,`KC must separate materially from DAL (${kc.passRushIndex} vs ${dal.passRushIndex})`);
ok(Math.round(dal.passRushIndex)!==96,`Dallas old 96 pathology removed (${dal.passRushIndex})`);
ok(dal._live.passRushGames===1 && Math.abs(dal._live.passRushWeight-.5)<1e-9,'pass rush has its own charted live weight');
ok(/charted pressure|PFR\/Sportradar pressure fallback|current-season pressure/.test(dal.dl.source),'source names the pressure provider');

// V99: when advanced charting is unavailable, use current nflverse weekly
// QB-hit+sack disruption rather than dropping Pass Rush league-wide.
const held=LP.buildProfiles({teamRows,playerRows:[],pfrPassRows:stale,priorPfrPassRows:prior,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
ok(held.DAL._live.passRushGames===1,'stale advanced charting falls back to the current weekly disruption sample');
ok(held.DAL._live.passRushProvider==='nflverse-weekly-disruption','fallback provenance must be explicit');
ok(Number.isFinite(Number(held.DAL.passRushIndex)),'fallback produces a finite Pass Rush grade');
ok(/weekly QB-hit\+sack disruption fallback/.test(held.DAL.dl.source),'fallback source is disclosed rather than masquerading as charted pressure');

console.log(`PASS: V41 charted-pressure pass-rush regression (${passed} checks)`);
