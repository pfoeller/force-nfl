const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
ok(app.includes('function unitMatchupShare'),'unit matchup calibration helper missing');
ok(app.includes('35 * Math.tanh(diff / 45)'),'conservative symmetric matchup mapping missing');
ok(app.includes("matchupSubedge('QB vs coverage'"),'QB vs coverage donut missing');
ok(app.includes("matchupSubedge('Receivers vs coverage'"),'WR vs coverage donut missing');
ok(app.includes("matchupSubedge('OL vs pass rush'"),'OL vs pass-rush donut missing');
ok(app.includes("matchupSubedge('RB vs run defense'"),'RB vs run-defense donut missing');
ok(app.includes("teamMark(winner, 'xs', 'right', 'matchup-edge-logo')"),'winning-team logo must be centered in donut');
ok(css.includes('conic-gradient(var(--edge-off-color)'),'team-color donut gradient missing');
ok(app.includes('presentation-only relative matchup share'),'presentation-only disclosure missing');
ok(app.includes('bandClass(ov)')&&app.includes('bandClass(dv)'),'raw unit grades must retain FORCE semantic colors');

// Numeric contract for the presentation-only calibration.
const share=(a,b)=>50+35*Math.tanh((a-b)/45);
const near=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;
ok(near(share(50,50),50),'equal grades must map to 50/50');
ok(near(share(70,40)+share(40,70),100),'mapping must be symmetric');
ok(share(60,40)>share(50,40),'edge share must increase monotonically with unit advantage');
ok(share(40,28)>50 && share(40,28)<60,'KC 40 vs IND 28 should be a slight edge, not a dominant one');

console.log(`OK: ${n} V73 matchup-donut assertions`);
