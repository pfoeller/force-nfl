const fs=require('fs'), vm=require('vm');
const live=fs.readFileSync('model/live_profiles.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(live,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE; let n=0; const ok=(x,m)=>{if(!x)throw new Error(m);n++;};
const schedule=[
 {game_id:'g1',week:1,date:'2026-09-14',home:'KC',away:'DEN',homeScore:31,awayScore:10},
 {game_id:'g2',week:2,date:'2026-09-20',home:'KC',away:'IND',homeScore:33,awayScore:30}
];
const perf=[
 {game_id:'g1',week:1,home:'KC',away:'DEN',home_deserved_win_prob:.97,score_margin_home:21,epa_diff_home:.4,success_diff_home:.12,ypp_diff_home:2.2,ppd_diff_home:1.4,interception_diff_home:1,underlying_margin_home:9,deserved_margin_home:13.8,
  fumble_opportunities:5,fumble_weighted_opportunities:3.6,ordinary_fumble_opportunities:3,botched_snap_fumble_opportunities:2,
  home_fumble_recoveries:3,away_fumble_recoveries:2,home_fumble_weighted_recoveries:1.6,away_fumble_weighted_recoveries:2,
  home_fumble_expected_recoveries:1.98,away_fumble_expected_recoveries:1.62,fumble_events:[]},
 {game_id:'g2',week:2,home:'KC',away:'IND',home_deserved_win_prob:.90,score_margin_home:3,epa_diff_home:.25,success_diff_home:.08,ypp_diff_home:1.5,ppd_diff_home:.4,interception_diff_home:1,underlying_margin_home:6,deserved_margin_home:4.8,
  fumble_opportunities:0,fumble_weighted_opportunities:0,ordinary_fumble_opportunities:0,botched_snap_fumble_opportunities:0,
  home_fumble_recoveries:0,away_fumble_recoveries:0,home_fumble_weighted_recoveries:0,away_fumble_weighted_recoveries:0,
  home_fumble_expected_recoveries:0,away_fumble_expected_recoveries:0,fumble_events:[]}
];
const luck=L.liveLuck('KC',schedule,{},perf);
ok(Math.abs(luck.exp_w-1.87)<1e-9,'expected wins preserved');
ok(Math.abs(luck.outcome_residual-.13)<1e-9,'outcome residual');
ok(luck.outcome_surprise_z>0 && luck.outcome_surprise_z<.5,'dominant 2-0 outcome is inside neutral half-sigma band');
ok(Math.abs(luck.outcome_surprise_excess_z)<1e-12,'neutral band zeroes trivial positive residual');
ok(luck.fumble_luck_score<50 && luck.fumble_luck_score>40,'KC-like fumble ledger remains mildly negative');
ok(app.includes('WIN_LUCK_V113'),'V112 win-luck calibration exists');
ok(app.includes('Most of it asks a simple question: has the scoreboard rewarded a team about as much as its play-by-play efficiency says it should have?') && app.includes('blend:{epaScoringRealization:0.60'),'UI describes the V121 EPA-heavy luck input in plain words; exact weight stays in the Luck debug payload (UX-14 tranche B)');
ok(!app.includes('<th>Outcome z</th>'),'V118 Luck ranking removes Outcome z column while retaining outcome surprise in debug');
console.log(`PASS: V112 standardized outcome-surprise luck (${n} checks)`);
