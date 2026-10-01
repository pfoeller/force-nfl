import fs from 'node:fs';
const model=fs.readFileSync('model/live_profiles.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const server=fs.readFileSync('force_server.py','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(model.includes('standardRushPressureWeight:0.75'),'75% standard-rush weight');
ok(model.includes('pressurePerformanceWeight:0.25'),'25% pressure-performance weight');
ok(model.includes('pressureEpaWeight:0.70'),'70% under-pressure EPA');
ok(model.includes('pressureSuccessWeight:0.30'),'30% under-pressure success');
ok(model.includes('pressurePerformanceStabilizerPlays:30.0'),'pressure sample stabilizer');
ok(!model.includes('overallPressureWeight'),'overall pressure removed from adjustment');
ok(model.includes('pressure_performance_adjustment:qbPressurePerformanceAdjustment'),'performance adjustment exposed');
ok(model.includes('pressure_success_rate:r.pressureSuccessRate'),'pressure success exposed');
ok(server.includes("pressure_successes"),'server aggregates disruption success');
ok(app.includes('Pressure Adjustment</th>'),'UI renamed Pressure Adjustment');
ok(app.includes('75% protection difficulty / 25% performance under pressure'),'UI explains decomposition');
ok(app.includes("health?.app_version!=='V149'"),'client expects V137');
ok(server.includes("APP_VERSION = 'V149'"),'server reports V137');
console.log('PASS: V137 pressure adjustment (13 checks)');
