const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const liveCode=fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const server=fs.readFileSync(path.join(root,'force_server.py'),'utf8');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
ok(server.includes("APP_VERSION = 'V129'"),'server version');
ok(server.includes("'epa_margin':{"),'historical EPA-margin calibration missing');
ok(server.includes("margin_intercept + margin_slope*epa_diff"),'live EPA-implied margin missing');
ok(liveCode.includes('epa_scoring_luck_score'),'live luck EPA realization score missing');
ok(app.includes('0.60*epaScore+0.20*penaltyScore+0.15*fumbleScore+0.05*'),'EPA-heavy Luck blend missing');
ok(!/\bluck\b/i.test(fs.readFileSync(path.join(root,'model/unit_force_bridge.js'),'utf8')),'Luck leaked into unit bridge');
ok(!/\bluck\b/i.test(fs.readFileSync(path.join(root,'model/forecast_v2.js'),'utf8')),'Luck leaked into forecast');
// Synthetic behavior: actual +6 PD versus EPA-implied +18 should be negative EPA luck,
// even for a winning record. The liveLuck function consumes server-provided margins.
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(liveCode,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE;
const schedule=[
 {game_id:'g1',week:1,date:'2026-09-01',home:'AAA',away:'BBB',homeScore:24,awayScore:21},
 {game_id:'g2',week:2,date:'2026-09-08',home:'AAA',away:'CCC',homeScore:24,awayScore:21}
];
const common={fumble_opportunities:0,fumble_weighted_opportunities:0,ordinary_fumble_opportunities:0,botched_snap_fumble_opportunities:0,home_fumble_recoveries:0,away_fumble_recoveries:0,home_fumble_weighted_recoveries:0,away_fumble_weighted_recoveries:0,home_fumble_expected_recoveries:0,away_fumble_expected_recoveries:0,fumble_events:[],epa_margin_residual_sd:10,epa_margin_r2:.35};
const perf=[
 {game_id:'g1',week:1,home:'AAA',away:'BBB',home_deserved_win_prob:.80,score_margin_home:3,epa_diff_home:.25,success_diff_home:.08,ypp_diff_home:1.2,yards_diff_home:90,ppd_diff_home:.4,interception_diff_home:0,underlying_margin_home:6,deserved_margin_home:5,epa_expected_margin_home:9,...common},
 {game_id:'g2',week:2,home:'AAA',away:'CCC',home_deserved_win_prob:.80,score_margin_home:3,epa_diff_home:.25,success_diff_home:.08,ypp_diff_home:1.2,yards_diff_home:90,ppd_diff_home:.4,interception_diff_home:0,underlying_margin_home:6,deserved_margin_home:5,epa_expected_margin_home:9,...common}
];
const luck=L.liveLuck('AAA',schedule,{},perf);
ok(luck.actual_point_diff===6,'actual PD');
ok(luck.epa_expected_point_diff===18,'EPA expected PD');
ok(luck.epa_scoring_residual===-12,'EPA realization residual');
ok(luck.epa_scoring_luck_score<50,'strong EPA but modest PD must rate unlucky on EPA realization');
console.log(`PASS: V121 EPA/play-heavy Luck (${n} checks)`);
