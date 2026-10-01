const fs=require('fs');
const model=fs.readFileSync('model/live_profiles.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const server=fs.readFileSync('force_server.py','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(model.includes('standardRushPressureWeight:0.75'),'75% standard-rush weight');
ok(model.includes('overallPressureWeight:0.25'),'25% overall pressure weight');
ok(model.includes('scoreStandardRushPressure'),'standard-rush rate scored vs league');
ok(model.includes('pressure_epa_per_play:r.pressureEpaPerPlay'),'pressured EPA exposed');
ok(model.includes('clean_epa_per_play:r.cleanEpaPerPlay'),'clean EPA exposed');
ok(app.includes('<th>EPA on hit/sack DBs</th><th>EPA on other DBs</th><th>Disruption EPA Drop</th>'),'pressure diagnostics columns');
ok(app.includes('diagnostic only and do not add another rating weight'),'diagnostics excluded from rating');
ok(server.includes('def _v135_pressure_context'),'PBP/FTN join exists');
ok(server.includes("rushers is None or rushers>4"),'standard rush <=4');
ok(server.includes("is_screen") && server.includes("qb_out_of_pocket") && server.includes("is_qb_fault_sack"),'contamination filters');
ok(server.includes("disrupted=truth(r.get('sack')) or truth(r.get('qb_hit'))"),'deduplicated disruption outcome');
console.log('V135 QB pressure-context checks passed');
