const fs=require('fs');
const app=fs.readFileSync(require('path').join(__dirname,'../assets/app.js'),'utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(app.includes("window.FORCE_PENALTY_DEBUG=penaltyDebugSnapshot"),'missing browser penalty debug hook');
ok(app.includes("V93: game rows are the canonical source of truth"),'missing canonical game-row aggregation');
ok(!app.includes("if (beforeWeek == null && direct && typeof direct === 'object') return direct"),'must not trust direct penalty_profiles aggregate');
ok(app.includes("diag('penalty:aggregation-audit'"),'missing aggregate mismatch diagnostic');
ok(app.includes("gameWpa.reduce((a,b)=>a+b,0)/gameWpa.length"),'debug must expose arithmetic game-level WPA mean');
console.log('PASS: V93 browser penalty source-of-truth diagnostics');
