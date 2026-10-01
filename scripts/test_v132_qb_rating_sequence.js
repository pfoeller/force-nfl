const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
const header="<th>#</th><th>Quarterback</th><th>${custom?'Your QB Rating':'FORCE QB Rating'}</th><th>Opponent Adjustment</th><th>O-Line Adjustment</th><th>Raw QB Rating</th><th>EPA/play</th><th>ANY/A</th><th>Success</th><th>Rush EPA/att</th><th>CPOE</th><th>EPA on hit/sack DBs</th><th>EPA on other DBs</th><th>Disruption EPA Drop</th><th>Team</th>";
ok(app.includes(header),'QB columns must show final, contextual adjustments, raw, then native stats');
ok(app.includes('const rawRating=Math.max(0,Math.min(100,r.rating-adj-olAdj))'),'raw rating must be final minus both contextual adjustments');
ok(app.includes('FORCE QB Rating is the final 0-100 quarterback score after contextual adjustments.'),'must explain final rating');
ok(app.includes('Raw QB Rating is the 0-100 score before opponent or pass-protection context is applied.'),'must explain raw rating');
console.log('PASS: V132/V133 QB rating sequence');
