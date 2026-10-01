const fs=require('fs');
const server=fs.readFileSync('force_server.py','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(server.includes("APP_VERSION = 'V98'"),'server identity');
ok(server.includes("SERVER_DIAG_VERSION = 'V98-DIAG-1'"),'diag identity');
ok(app.includes("health?.app_version!=='V98'"),'client server identity');
ok(app.includes('FORCE_RETROSPECTIVE_STRENGTH'),'look-behind module binding');
ok(app.includes('FORCE_RATING_LOOKBACK'),'look-behind diagnostic hook');
ok(app.includes('causalCoreRatings'),'causal/current separation');
ok(index.includes('model/retrospective_strength.js'),'look-behind script loaded');
console.log('PASS: V98 contract');
