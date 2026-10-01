const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('model/live_profiles.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE; let n=0; const ok=(x,m)=>{if(!x)throw new Error(m);n++;};
const schedule=[
 {game_id:'g1',week:1,date:'2026-09-14',home:'KC',away:'DEN',homeScore:31,awayScore:10},
 {game_id:'g2',week:2,date:'2026-09-20',home:'KC',away:'IND',homeScore:33,awayScore:30}
];
const perf=[
 {game_id:'g1',week:1,home:'KC',away:'DEN',home_deserved_win_prob:.97,score_margin_home:21,epa_diff_home:.40,success_diff_home:.12,ypp_diff_home:2.2,ppd_diff_home:1.4,interception_diff_home:1,underlying_margin_home:9,deserved_margin_home:13.8,fumble_opportunities:2,home_fumble_recoveries:1,away_fumble_recoveries:1},
 {game_id:'g2',week:2,home:'KC',away:'IND',home_deserved_win_prob:.80,score_margin_home:3,epa_diff_home:.25,success_diff_home:.08,ypp_diff_home:1.5,ppd_diff_home:.4,interception_diff_home:1,underlying_margin_home:6,deserved_margin_home:4.8,fumble_opportunities:1,home_fumble_recoveries:0,away_fumble_recoveries:1}
];
const luck=L.liveLuck('KC',schedule,{},perf);
ok(Math.abs(luck.exp_w-1.77)<1e-9,'game deserved wins summed');
ok(luck.exp_w>luck.pythagorean_exp_w,'strong underlying play can exceed Pythagorean expectation');
ok(luck.deserved_games.length===2,'per-game debug rows');
ok(luck.fumble_opportunities===3 && luck.fumble_recoveries===1,'fumble opportunities/recoveries aggregate');
ok(luck.fumble_luck_score>40 && luck.fumble_luck_score<50,'low recovery rate shrunk below neutral');
const fallback=L.liveLuck('KC',schedule,{},[]);
ok(Math.abs(fallback.exp_w-fallback.pythagorean_exp_w)<1e-9,'Pythagorean fallback if new server payload absent');
console.log(`PASS: V110 deserved-win + fumble Luck (${n} checks)`);
