const fs=require('fs'),vm=require('vm');
let checks=0; const ok=(c,m)=>{checks++; if(!c) throw new Error(m)};
const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(rel,'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
const teams=['KC','DEN','IND','HOU'];
function teamRow(team,opp,week){return {season:'2026',week:String(week),season_type:'REG',game_id:`2026_${String(week).padStart(2,'0')}_${team}_${opp}`,team,opponent_team:opp,attempts:'32',sacks_suffered:'2',passing_epa:String(3+week),passing_cpoe:'2',carries:'25',rushing_epa:String(1+week/10),targets:'29',receiving_epa:String(2+week/10),def_qb_hits:'6',def_sacks:'2'};}
function playerRows(r){return [
 {season:'2026',week:r.week,season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'QB',position_group:'QB',player_display_name:`${r.team} QB`,attempts:r.attempts,sacks_suffered:r.sacks_suffered,passing_epa:r.passing_epa,passing_cpoe:r.passing_cpoe,carries:'3',rushing_epa:'.1',targets:'0',receiving_epa:'0'},
 {season:'2026',week:r.week,season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'WR',position_group:'WR',player_display_name:`${r.team} WR`,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'',carries:'0',rushing_epa:'0',targets:'20',receiving_epa:r.receiving_epa}
];}
const rows1=[]; [['DEN','KC'],['HOU','IND']].forEach(([a,h])=>{rows1.push(teamRow(a,h,1),teamRow(h,a,1));});
const players1=rows1.flatMap(playerRows);
const sched1=[
 {week:1,date:'2026-09-13',away:'HOU',home:'IND',awayScore:17,homeScore:24,status:'closed'},
 {week:1,date:'2026-09-14',away:'DEN',home:'KC',awayScore:10,homeScore:31,status:'closed'}
];
let p=LP.buildProfiles({teamRows:rows1,playerRows:players1,priorProfiles:M.profiles,schedule:sched1,teamIds:teams,priorGames:1,useChartedPassRush:false});
ok(p.KC._live.freshness.teamStats.current,'Week 1 KC team feed is current when schedule has one game');
ok(p.KC._live.freshness.playerStats.current,'Week 1 KC player feed is current when schedule has one game');
for(const k of ['offenseIndex','olIndex','rushIndex','coverageIndex','runDefenseIndex','qbIndex','receiverIndex']) ok(Number.isFinite(Number(p.KC[k])),`fresh KC ${k} is available`);

const sched2=[...sched1,{week:2,date:'2026-09-20',away:'KC',home:'DEN',awayScore:20,homeScore:21,status:'closed'}];
p=LP.buildProfiles({teamRows:rows1,playerRows:players1,priorProfiles:M.profiles,schedule:sched2,teamIds:teams,priorGames:1,useChartedPassRush:false});
ok(!p.KC._live.freshness.teamStats.current,'team feed one week behind latest completed KC game is stale');
ok(!p.KC._live.freshness.playerStats.current,'player feed one week behind latest completed KC game is stale');
ok(p.KC._live.freshness.teamStats.usable && p.KC._live.freshness.teamStats.pending,'one-week-behind KC team feed is retained as pending');
ok(p.KC._live.freshness.playerStats.usable && p.KC._live.freshness.playerStats.pending,'one-week-behind KC player feed is retained as pending');
for(const k of ['offenseIndex','olIndex','rushIndex','coverageIndex','runDefenseIndex','qbIndex','receiverIndex']) ok(Number.isFinite(Number(p.KC[k])),`pending KC ${k} retains last-known-good 2026 value`);

const rkc2=teamRow('KC','DEN',2), rden2=teamRow('DEN','KC',2);
const rows2=[...rows1,rkc2,rden2];
p=LP.buildProfiles({teamRows:rows2,playerRows:players1,priorProfiles:M.profiles,schedule:sched2,teamIds:teams,priorGames:1,useChartedPassRush:false});
ok(p.KC._live.freshness.teamStats.current,'team feed catches up independently');
ok(!p.KC._live.freshness.playerStats.current,'player feed may remain stale independently');
for(const k of ['offenseIndex','olIndex','rushIndex','coverageIndex','runDefenseIndex']) ok(Number.isFinite(Number(p.KC[k])),`fresh team-stat family restores ${k}`);
for(const k of ['qbIndex','receiverIndex']) ok(Number.isFinite(Number(p.KC[k])),`pending player-stat family retains last-known-good ${k}`);

const players2=[...players1,...playerRows(rkc2),...playerRows(rden2)];
p=LP.buildProfiles({teamRows:rows2,playerRows:players2,priorProfiles:M.profiles,schedule:sched2,teamIds:teams,priorGames:1,useChartedPassRush:false});
ok(p.KC._live.freshness.teamStats.current && p.KC._live.freshness.playerStats.current,'both metric families become current after complete update');
ok(Number.isFinite(Number(p.KC.qbIndex)) && Number.isFinite(Number(p.KC.receiverIndex)),'player units restore only after player feed catches up');
console.log(`PASS: V45 all-metric freshness regression (${checks} checks)`);
