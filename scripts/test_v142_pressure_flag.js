const fs=require('fs');
let n=0; function ok(x,m){if(!x)throw new Error(m);n++;}
const app=fs.readFileSync('assets/app.js','utf8');
const model=fs.readFileSync('model/live_profiles.js','utf8');
const py=fs.readFileSync('force_server.py','utf8');
ok(app.includes("app_version!=='V142'"),'V142 bootstrap comparison');
ok(app.includes('<th>EPA Under Pressure</th><th>EPA Without Pressure</th><th>Pressure EPA Drop</th>'),'native pressure diagnostic headers');
ok(app.includes('home_standard_rush_pressures'),'client consumes FTN standard-rush pressure counts');
ok(model.includes('standardRushPressures'),'model consumes standard-rush pressure counts');
ok(py.includes("for field in ('was_pressure','is_qb_pressure','is_pressure','pressure')"),'server detects explicit FTN pressure field');
ok(py.includes('if pressured is None:continue'),'missing pressure is unavailable, not inferred');
ok(!py.includes("disrupted=truth(r.get('sack')) or truth(r.get('qb_hit'))"),'hit/sack no longer defines QB pressure context');
ok(py.includes("if pressured:z['standard_pressures']+=1"),'standard-rush component uses charted pressure');
ok(py.includes("if pressured:\n                z['pressure_epa']+=epa"),'pressure EPA uses charted pressure');
console.log(`V142 pressure checks passed: ${n}`);
