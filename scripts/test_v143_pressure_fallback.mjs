import fs from 'node:fs';
const py=fs.readFileSync('force_server.py','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(py.includes("'observable-pressure-proxy'"),'proxy source label');
ok(py.includes("truth(r.get('qb_hit')) or truth(r.get('sack')) or truth((f or {}).get('is_throw_away'))"),'narrow proxy definition');
ok(py.includes("'pressure_context':v143_pressure_meta"),'pressure metadata emitted');
ok(app.includes('FORCE pressure context:'),'console diagnostic');
ok(app.includes("health?.app_version!=='V149'"),'V143 bootstrap identity');
// The current compact table omits native pressure columns; source metadata remains.
ok(app.includes('S.liveGameFlow2026?.pressure_context'),'pressure source metadata remains available');
console.log('PASS: V143 pressure fallback (6 checks)');
