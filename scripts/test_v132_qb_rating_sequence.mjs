import fs from 'node:fs';
const app=fs.readFileSync('assets/app.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
// V140 reordered these columns; use the current compact native-stat layout.
const header="<th>#</th><th>Quarterback</th><th>${custom?'Your QB Rating':'FORCE QB Rating'}</th><th>Raw QB Rating</th><th>Opponent Adjustment</th><th>Pressure Adjustment</th><th>Recency Adjustment</th><th>EPA/play</th><th>ANY/A</th><th>Success</th><th>Rush EPA/att</th><th>CPOE</th>";
ok(app.includes(header),'current QB columns preserve final/raw/context/native distinction');
ok(app.includes('const rawRating=Math.max(0,Math.min(100,r.rating-adj-olAdj-recAdj))'),'raw display subtracts opponent, pressure and recency');
ok(app.includes('FORCE QB Rating is the final 0-100 quarterback score after contextual adjustments.'),'must explain final rating');
ok(app.includes('Raw QB Rating is the 0-100 score before opponent, pressure, or recency context is applied.'),'must explain raw rating');
console.log('PASS: V132 rating sequence, current V140/V145 layout (4 checks)');
