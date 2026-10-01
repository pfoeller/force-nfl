const {appVersion,diagnosticVersion}=require('./lib/current_version.cjs');
const fs=require('fs');
const a=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x){console.error('FAIL:',m);process.exit(1)} console.log('PASS:',m)}
ok(a.includes(`health?.app_version!=='${appVersion}'`),'current bootstrap comparison requires release');
ok(a.includes(`expected FORCE ${appVersion}`),'current error text requires release');
ok(!a.includes("health?.app_version!=='V139'"),'no stale V139 bootstrap comparison');
ok(a.includes(`const FORCE_DIAG_VERSION = '${diagnosticVersion}'`),'current client diagnostic identity release');
