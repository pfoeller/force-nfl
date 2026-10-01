import fs from 'node:fs';
const a=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(a.includes("expected FORCE V149"),'V140 identity');
ok(a.includes('function qbRecencyAdjustment'),'recency function');
ok(a.includes('rec===0?2:rec===1?1.75:rec===2?1.5:rec===3?1.25:1'),'recency weights');
ok(a.includes('0.40*((num/den)-normal)'),'40 percent translation');
ok(a.includes('Math.max(-4,Math.min(4'),'recency cap');
ok(a.includes("<th>${custom?'Your QB Rating':'FORCE QB Rating'}</th><th>Raw QB Rating</th><th>Opponent Adjustment</th><th>Pressure Adjustment</th><th>Recency Adjustment</th>"),'column order');
console.log('V140 QB recency checks passed');
