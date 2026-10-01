const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8'), ctx);
const LP = ctx.window.FORCE_LIVE_PROFILE;
if (!LP) throw new Error('live profile module missing');

const teams=['KC','DEN','BUF'];
const priors={};
for (const t of teams) priors[t]={
  offenseIndex:50, olIndex:50, frontIndex:50, coverageIndex:50, qbIndex:50, receiverIndex:50, rushIndex:50,
  defenseIndex:50, offenseComposite:50, off_epa:0,
  qb:{qb:'Prior QB',epa_per_play:0,cpoe:0}, penalty:{net_pen_epa:1,pen_wp_swing:.01},
  scoring:{ppg_for:22,ppg_against:22}
};
function tr(team,opp,week,passing_epa,rushing_epa,attempts,sacks,carries,receiving_epa,targets,cpoe,penalties=4,penaltyYards=35){
  return {season:'2026',week:String(week),season_type:'REG',game_id:`${week}_${team}_${opp}`,team,opponent_team:opp,
    passing_epa:String(passing_epa),rushing_epa:String(rushing_epa),attempts:String(attempts),sacks_suffered:String(sacks),carries:String(carries),
    receiving_epa:String(receiving_epa),targets:String(targets),passing_cpoe:String(cpoe),penalties:String(penalties),penalty_yards:String(penaltyYards)};
}
const teamRows=[
  tr('KC','DEN',1,8,3,30,1,25,7,28,5,3,25), tr('DEN','KC',1,-4,-2,32,4,22,-3,31,-5,7,60),
  tr('BUF','DEN',1,3,1,30,2,24,2,29,1,4,30), tr('DEN','BUF',1,-2,-1,30,3,21,-1,28,-2,6,50)
];
function pr(team,opp,pos,name,attempts,passEpa,carries,rushEpa,cpoe,targets,recEpa,defPen=0,defYds=0){
 return {season:'2026',week:'1',season_type:'REG',game_id:`1_${team}_${opp}`,team,opponent_team:opp,position:pos,player_display_name:name,
 attempts:String(attempts),sacks_suffered:'1',passing_epa:String(passEpa),carries:String(carries),rushing_epa:String(rushEpa),passing_cpoe:String(cpoe),
 targets:String(targets),receiving_epa:String(recEpa),def_penalty:String(defPen),def_penalty_yards:String(defYds)};
}
const playerRows=[
 pr('KC','DEN','QB','KC QB',30,8,4,1,5,0,0), pr('KC','DEN','WR','KC WR',0,0,0,0,0,10,5), pr('KC','DEN','DE','KC DE',0,0,0,0,0,0,0,1,10),
 pr('DEN','KC','QB','DEN QB',32,-4,3,-1,-5,0,0), pr('DEN','KC','WR','DEN WR',0,0,0,0,0,10,-2), pr('DEN','KC','CB','DEN CB',0,0,0,0,0,0,0,3,30),
 pr('BUF','DEN','QB','BUF QB',30,3,4,1,1,0,0), pr('BUF','DEN','WR','BUF WR',0,0,0,0,0,10,2)
];
const schedule=[
 {week:1,date:'2026-09-01',away:'DEN',home:'KC',awayScore:17,homeScore:27},
 {week:1,date:'2026-09-01',away:'BUF',home:'DEN',awayScore:24,homeScore:20}
];
const gameHistory={
 '1|2026-09-01|DEN|KC':{independent:{probability:.65}},
 '1|2026-09-01|BUF|DEN':{independent:{probability:.45}}
};
const penaltyContextByTeam={KC:{games:1,net_penalty_epa:.5,net_penalty_wpa:.01,first_downs_for:1,first_downs_against:0,tds_negated_benefit:0,tds_negated_harm:0},DEN:{games:2,net_penalty_epa:-.4,net_penalty_wpa:-.01,first_downs_for:0,first_downs_against:1,tds_negated_benefit:0,tds_negated_harm:0},BUF:{games:1,net_penalty_epa:.2,net_penalty_wpa:.005,first_downs_for:0,first_downs_against:0,tds_negated_benefit:0,tds_negated_harm:0}};
const out=LP.buildProfiles({teamRows,playerRows,penaltyContextByTeam,priorProfiles:priors,schedule,gameHistory,teamIds:teams,priorGames:1});
for (const t of teams) {
 if (!out[t]._live || out[t]._live.games < 1) throw new Error(`${t} live sample missing`);
 for (const k of ['offenseIndex','olIndex','frontIndex','coverageIndex','qbIndex','receiverIndex','rushIndex','defenseIndex','offenseComposite','off_epa']) {
   if (!Number.isFinite(Number(out[t][k]))) throw new Error(`${t} ${k} missing`);
 }
 if (!out[t].luck || !String(out[t].luck.source||'').includes('2026')) throw new Error(`${t} live luck missing`);
 if (!out[t].penalty || !out[t].penalty.live) throw new Error(`${t} live penalty context missing`);
 if (!out[t].scoring || !String(out[t].scoring.source||'').includes('2026')) throw new Error(`${t} live scoring missing`);
}
if (out.KC.offenseIndex === 50 || out.KC.qbIndex === 50 || out.KC.receiverIndex === 50) throw new Error('KC unit ratings did not move');
if (!(out.KC.qb.epa_per_play > out.DEN.qb.epa_per_play)) throw new Error('QB EPA ordering wrong');
if (!(out.KC.penalty.net_pen_yards_per_game > 0)) throw new Error('penalty live proxy did not update');

if (!(out.KC.rushIndex >= 45)) throw new Error(`KC elite Week 1 run result remained implausibly low (${out.KC.rushIndex})`);
if (!(out.KC.olIndex >= 45)) throw new Error(`KC elite Week 1 OL result remained implausibly low (${out.KC.olIndex})`);
console.log('V25 live-metrics regression PASS');
