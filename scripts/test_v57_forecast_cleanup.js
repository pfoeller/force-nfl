const fs=require('fs'),path=require('path'); const root=path.resolve(__dirname,'..'); const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
ok(app.includes('QB correction active` :'), 'forecast explanation keeps QB correction text');
ok(!app.includes("QB correction active: ${scenarioTeams.map((x) => forecastLogoOnlyMark"), 'forecast explanation no longer injects redundant logo');
ok(app.includes("['RB', 'rbIndex']"), 'unit-change panel exposes RB');
ok(app.includes("sortHeader('RB','rb')"), 'rankings units table exposes RB');
ok(app.includes("duel('RB efficiency'"), 'matchup diagnostics expose RB efficiency');
console.log(`PASS: V57 forecast cleanup/UI (${n} checks)`);
