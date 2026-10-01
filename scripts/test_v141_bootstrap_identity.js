const fs=require('fs');
const a=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x){console.error('FAIL:',m);process.exit(1)} console.log('PASS:',m)}
ok(a.includes("health?.app_version!=='V141'"),'bootstrap comparison requires V141');
ok(a.includes('expected FORCE V141'),'error text requires V141');
ok(!a.includes("health?.app_version!=='V139'"),'no stale V139 bootstrap comparison');
ok(a.includes("const FORCE_DIAG_VERSION = 'V141-DIAG-1'"),'client diagnostic identity V141');
