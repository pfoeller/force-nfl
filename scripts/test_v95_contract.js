const fs=require('fs');
const server=fs.readFileSync('force_server.py','utf8');
const lp=fs.readFileSync('model/live_profiles.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
let n=0; function ok(v,m){n++; if(!v) throw new Error(m)}
ok(server.includes("APP_VERSION = 'V95'"),'server identity');
ok(server.includes("/api/game-flow-2026-v95"),'V95 game-flow cache');
ok(server.includes('_same_state_causal_epa'),'same-state EPA function');
ok(server.includes('_ep_surface_predict'),'shared EP surface missing');
ok(server.includes("EP_SURFACE_2025_CACHE_KEY = '/derived/ep-state-surface-2025-v95'"),'EP surface cache key');
ok(server.includes('actual_team_ep') && server.includes('counterfactual_team_ep'),'EP audit fields');
ok(lp.includes('V95 canonical game-row aggregation + same-model nflfastR WPA + same-state nflfastR-derived EPA'),'V95 profile source');
ok(lp.includes('livePenaltyWeights: Object.freeze({ epa: 0.40, wpa: 0.25, firstDown: 0.20, erasedTd: 0.15 })'),'approved weights');
ok(app.includes("health?.app_version!=='V95'"),'client health identity');
console.log(`PASS: V95 Penalty Impact contract (${n} checks)`);
