const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('model/live_profiles.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE; let n=0; const ok=(x,m)=>{if(!x)throw new Error(m);n++;};
const schedule=[
 {game_id:'g1',week:1,date:'2026-09-14',home:'KC',away:'DEN',homeScore:31,awayScore:10},
 {game_id:'g2',week:2,date:'2026-09-20',home:'KC',away:'IND',homeScore:33,awayScore:30}
];
// KC-like five-event ledger: three ordinary opponent fumbles (KC recovers 1),
// plus two KC botched snaps recovered by KC. Raw rate = 3/5, but botched snaps
// are expected offense recoveries, so recovery luck should be slightly negative.
const perf=[
 {game_id:'g1',week:1,home:'KC',away:'DEN',home_deserved_win_prob:.97,score_margin_home:21,epa_diff_home:.4,success_diff_home:.12,ypp_diff_home:2.2,ppd_diff_home:1.4,interception_diff_home:1,underlying_margin_home:9,deserved_margin_home:13.8,
  fumble_opportunities:5,fumble_weighted_opportunities:3.6,ordinary_fumble_opportunities:3,botched_snap_fumble_opportunities:2,
  home_fumble_recoveries:3,away_fumble_recoveries:2,home_fumble_weighted_recoveries:1.6,away_fumble_weighted_recoveries:2,
  home_fumble_expected_recoveries:1.98,away_fumble_expected_recoveries:1.62,fumble_events:[]},
 {game_id:'g2',week:2,home:'KC',away:'IND',home_deserved_win_prob:.80,score_margin_home:3,epa_diff_home:.25,success_diff_home:.08,ypp_diff_home:1.5,ppd_diff_home:.4,interception_diff_home:1,underlying_margin_home:6,deserved_margin_home:4.8,
  fumble_opportunities:0,fumble_weighted_opportunities:0,ordinary_fumble_opportunities:0,botched_snap_fumble_opportunities:0,
  home_fumble_recoveries:0,away_fumble_recoveries:0,home_fumble_weighted_recoveries:0,away_fumble_weighted_recoveries:0,
  home_fumble_expected_recoveries:0,away_fumble_expected_recoveries:0,fumble_events:[]}
];
const luck=L.liveLuck('KC',schedule,{},perf);
ok(luck.fumble_opportunities===5 && luck.fumble_recoveries===3,'raw fumble ledger preserved');
ok(Math.abs(luck.fumble_recovery_rate-.6)<1e-9,'raw recovery rate 3/5');
ok(luck.botched_snap_fumble_opportunities===2 && luck.ordinary_fumble_opportunities===3,'event types exposed');
ok(Math.abs(luck.fumble_weighted_opportunities-3.6)<1e-9,'botched snaps downweighted');
ok(Math.abs(luck.fumble_recovery_excess+0.38)<1e-9,'recovery excess uses event-specific baseline');
ok(luck.fumble_luck_score<50 && luck.fumble_luck_score>40,'KC-like ledger is mildly negative fumble luck');
ok(Math.abs(luck.exp_w-1.77)<1e-9,'deserved wins unchanged');
console.log(`PASS: V111 fumble luck event baselines (${n} checks)`);
