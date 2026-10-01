const fs=require('fs');
let n=0; function ok(v,m){n++;if(!v)throw new Error(m)}
const app=fs.readFileSync('assets/app.js','utf8');
const lp=fs.readFileSync('model/live_profiles.js','utf8');
const server=fs.readFileSync('force_server.py','utf8');
ok(server.includes("APP_VERSION = 'V90'"),'server identity');
ok(server.includes("PENALTY_PRIOR_EQUIV_GAMES = 0.0"),'team-specific prior must be zero');
ok(server.includes('_build_wp_state_model'),'WP state model missing');
ok(server.includes("actual_home_wp_post")&&server.includes("counterfactual_home_wp"),'direct post-state WP comparison missing');
ok(!server.includes('cf_home_epa * leverage'),'EPA leverage proxy still present');
ok(app.includes('Penalty Impact is a current-season-only'),'UI must identify current-season-only metric');
ok(!app.includes('2025 RECALCULATED PRIOR'),'2025 prior UI must be removed');
ok(!app.includes('2026 RAW PENALTY IMPACT'),'redundant raw-current card must be removed');
ok(lp.includes('livePenaltyPriorGames: 0.0'),'profile prior must be zero');
ok(lp.includes("source:'V90 nflverse game-state counterfactual WPA + approved 40/25/20/15 blend (2026 only)'"),'current-only profile source missing');
console.log(`PASS: V90 current-season Penalty Impact contract (${n} checks)`);
