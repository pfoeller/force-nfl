const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const server=fs.readFileSync(path.join(root,'force_server.py'),'utf8');
let n=0; function ok(v,msg){n++; if(!v) throw new Error(msg);}
ok(server.includes("APP_VERSION = 'V129'"),'server V129 identity');
ok(app.includes("health?.app_version!=='V129'"),'client V129 identity');
ok(app.includes("luck:'Luck score'"),'Luck sort has a contextual rank label');
ok(app.includes("if (view === 'luck') return `<tr><th class=\"metric-rank-head\">${rankLabel()} rank</th>"),'Luck rank header follows active sort');
ok(app.includes('const metricRank = Object.fromEntries(metricOrder.map((r,i) => [r.team, i+1]));'),'metric ranks are computed independently of display direction');
ok(app.includes('const luckLead=`<td>${displayRank}</td>'),'Luck row uses active metric rank');
ok(app.includes("teamIdentity(r.team,{size:'xs'})"),'Luck rows use simple team identity while the left rank remains contextual');
ok(!app.includes('const luckLead=`<td>${forceRank}</td>'),'obsolete fixed FORCE rank removed from Luck rows');
console.log(`PASS: V127 contextual Luck rank (${n} checks)`);
