const fs=require('fs');
const server=fs.readFileSync('force_server.py','utf8');
const lp=fs.readFileSync('model/live_profiles.js','utf8');
let n=0; function ok(v,m){n++; if(!v) throw new Error(m)}
ok(server.includes("APP_VERSION = 'V93'"),'server identity');
ok(server.includes("PENALTY_PRIOR_EQUIV_GAMES = 0.0"),'penalty prior must remain zero');
ok(server.includes("nflfastr_wp_model.json"),'packaged nflfastR WP model missing');
ok(server.includes('_nflfastr_home_wp'),'nflfastR counterfactual predictor missing');
ok(!server.includes('def _build_wp_state_model'),'surrogate WP surface must be removed');
ok(lp.includes("source:'V93 canonical game-row aggregation + same-model nflfastR counterfactual WPA + approved 40/25/20/15 blend (2026 only)'"),'V93 current-only profile source missing');
ok(lp.includes('priorPenaltyImpactScore:null'),'historical penalty carryover should remain disabled');
console.log(`PASS: V93 current-season nflfastR Penalty Impact contract (${n} checks)`);
