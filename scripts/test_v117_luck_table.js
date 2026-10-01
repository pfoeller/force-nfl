const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
let n=0; function ok(v,msg){n++; if(!v) throw new Error(msg);}
ok(app.includes("if (view === 'luck') return `<tr><th class=\"metric-rank-head\">${rankLabel()} rank</th>"),'Luck table rank heading follows the active sort metric');
ok(app.includes("sortHeader('Actual record','actualWins')"),'Actual Record heading');
ok(app.includes("sortHeader('Expected record','expectedWins')"),'Expected Record heading');
ok(app.includes("sortHeader('Luck score','luck')"),'Luck Score heading');
ok(!app.includes('<th>Outcome z</th>'),'Outcome Z column removed');
ok(app.includes("if (view === 'luck') return base.concat(['actualWins','expectedWins','luck']);"),'Outcome Z removed from Luck sort surface');
ok(app.includes('const expectedRecord=expectedW!=null?`${expectedW}-${Math.max(0,completedGames-expectedW)}`:\'-\';'),'Expected Record is whole-number W-L from rounded expected wins');
ok(app.includes('const luckLead=`<td>${displayRank}</td>'),'Luck rows display active metric rank');
ok(app.includes("teamIdentity(r.team,{size:'xs'})"),'Luck rows avoid nested secondary rank markup');
// The Luck row is returned before action is appended; QB Return stays available in other views only.
const luckStart=app.indexOf("if (S.ratingView === 'luck') {");
const luckEnd=app.indexOf("if (S.ratingView === 'penalties')",luckStart);
const luckBlock=app.slice(luckStart,luckEnd);
ok(!luckBlock.includes('quickQbButton'),'QB Returning/action column removed from Luck rows');
ok(!luckBlock.includes('outcome_surprise_z'),'Outcome Z value removed from Luck rows');
console.log(`PASS: focused Luck table (${n} checks)`);
