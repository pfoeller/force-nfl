const fs=require('fs');
const py=fs.readFileSync('force_server.py','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(py.includes("'observable-pressure-proxy'"),'proxy source label');
ok(py.includes("truth(r.get('qb_hit')) or truth(r.get('sack')) or truth((f or {}).get('is_throw_away'))"),'narrow proxy definition');
ok(py.includes("'pressure_context':v143_pressure_meta"),'pressure metadata emitted');
ok(app.includes('FORCE pressure context:'),'console diagnostic');
ok(app.includes("health?.app_version!=='V143'"),'V143 bootstrap identity');
ok(app.includes('EPA Under Pressure*'),'proxy-aware header');
console.log('PASS: V143 pressure fallback (6 checks)');
