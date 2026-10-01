const fs=require('fs');
const server=fs.readFileSync('force_server.py','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const live=fs.readFileSync('model/live_profiles.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(server.includes("APP_VERSION = 'V97'"),'server identity');
ok(server.includes("SERVER_DIAG_VERSION = 'V97-DIAG-1'"),'diag identity');
ok(server.includes('nflfastR-derived-score-aware-same-state-surface'),'score-aware EPA source');
ok(server.includes("erased-field-goal"),'field-goal counterfactual');
ok(server.includes('direction_guard_applied'),'server direction guard audit');
ok(live.includes('directionGuardApplied'),'browser direction guard');
ok(app.includes("health?.app_version!=='V97'"),'client health identity');
ok(app.includes('actual_team_score_delta'),'client event audit score delta');
console.log('PASS: V97 contract');
