const fs=require('fs'),vm=require('vm');
let passed=0;
function ok(c,m){ if(!c) throw new Error(m); passed++; }
function near(a,b,e=1e-9,m=''){ if(Math.abs(a-b)>e) throw new Error(`${m}: ${a} != ${b}`); passed++; }
const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/matchup-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/model-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('model/live_profiles.js','utf8'),ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE, M=ctx.window.MATCHUP_DATA, D=ctx.window.MODEL_DATA;
const teams=Object.keys(D.teams);
function pfrRow(season,week,def,rate,hits,sacks,hurries){
  const db=40, pressures=rate*db;
  return {season:String(season),week:String(week),game_type:'REG',game_id:`${season}_${String(week).padStart(2,'0')}_OFF_${def}`,team:'OFF',opponent:def,
    times_pressured:String(pressures),times_pressured_pct:String(rate*100),times_hit:String(hits),times_sacked:String(sacks),times_hurried:String(hurries)};
}
const prior=[];
for(let w=1;w<=2;w++) teams.forEach((t,i)=>{
  const rate=.16+(i/31)*.18+(w-1)*.004, sacks=1+(i%3), hits=2+(i%4), hurries=Math.max(1,rate*40-hits-sacks);
  prior.push(pfrRow(2025,w,t,rate,hits,sacks,hurries));
});
const current=teams.map((t)=>pfrRow(2026,1,t,.28,4,2,5));
const kcIdx=teams.indexOf('KC');
Object.assign(current[kcIdx],pfrRow(2026,1,'KC',.10,0,4,0)); // partial: sacks only
ok(LP.pfrChartingReady(current),'league feed can be broadly ready');
const kcMetric=LP.combinePassRushGames(LP.pfrDefenseGames(current).KC);
ok(!LP.pfrTeamChartingReady(kcMetric,{defQbHits:5,defSacks:4}),'KC sacks-only row rejected when weekly hits prove incompleteness');
const fullMetric={...kcMetric,pressures:18,hurries:9,hits:5,sacks:4,dropbacks:40,pressureRate:.45,hitRate:.125,sackRate:.10,compositeRate:LP.passRushCompositeRate({pressureRate:.45,hitRate:.125,sackRate:.10})};
ok(LP.pfrTeamChartingReady(fullMetric,{defQbHits:5,defSacks:4}),'complete KC pressure sample accepted');

const teamRows=[
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'KC',opponent_team:'DEN',attempts:'27',sacks_suffered:'0',carries:'38',def_qb_hits:'5',def_sacks:'4',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'DEN',opponent_team:'KC',attempts:'28',sacks_suffered:'4',carries:'15',def_qb_hits:'1',def_sacks:'0',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'}
];
const schedule=[{season:2026,week:1,game_type:'REG',game_id:'2026_01_DEN_KC',away:'DEN',home:'KC',awayScore:10,homeScore:31,date:'2026-09-14'}];
const profiles=LP.buildProfiles({teamRows,playerRows:[],pfrPassRows:current,priorPfrPassRows:prior,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
const kc=profiles.KC;
ok(kc._live.pfrPressureReady===true,'global feed remains ready');
ok(kc._live.passRushPressureReady===true,'KC incomplete PFR sample should activate the weekly disruption fallback');
ok(kc._live.passRushGames===1 && kc._live.passRushWeight>0,'weekly disruption fallback receives current live weight');
ok(kc._live.passRushDataState==='live-current','KC fallback is a current-season measurement');
ok(/weekly QB-hit\+sack disruption fallback/.test(kc.dl.source),'KC source discloses weekly disruption fallback');
ok(Number.isFinite(Number(kc.passRushIndex)),'V99 fallback keeps a finite KC Pass Rush grade');

const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
ok(app.includes("p?._live?.passRushPressureReady"),'Units tooltip uses team-level pressure readiness');
ok(app.includes("nflverse-weekly-disruption") && app.includes("2026 disruption proxy"),'matchup note/provider map must expose the weekly disruption fallback');
ok(app.includes("teamToken(away, 'sm')") && app.includes("teamToken(home, 'sm')"),'duel rows request larger team marks');
ok(app.includes("logoizeTeamCodes(lineLabel, 'xs')") || app.includes("logoizeForecastTeamCodes(lineLabel, 'xs')"),'forecast line requests larger team marks');
ok(css.includes('.duel-side .team-token .team-mark-sm{width:38px;height:38px'), 'duel logo size is materially larger');
ok(css.includes('.prediction-finale .rich-team-line .team-mark-xs{width:34px;height:34px'), 'bottom forecast logos are enlarged');
console.log(`PASS: V42 pressure-readiness + matchup-logo regression (${passed} checks)`);
