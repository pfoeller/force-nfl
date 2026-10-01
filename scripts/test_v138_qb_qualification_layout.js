const {appVersion}=require('./lib/current_version.cjs');
const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
const model=fs.readFileSync('model/live_profiles.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
function ok(x,m){if(!x)throw new Error(m);}
ok(model.includes('qbPrimaryDropbackShare=qbRoomDropbacks>0?qbPrimaryDropbacks/qbRoomDropbacks:null'),'primary QB share calculated');
ok(model.includes('primary_qb_dropback_share:r.qbPrimaryDropbackShare'),'primary QB share exported');
ok(app.includes('r.q.primaryQbDropbackShare>=0.60'),'60% leaderboard qualification');
ok(app.includes('at least 60% of his team\'s QB dropbacks'),'qualification explained');
ok(app.includes('qb-ranking-table-wrap'),'QB scroll wrapper');
ok(css.includes('.qb-ranking-table{min-width:1500px}'),'QB table wide enough');
ok(css.includes('.qb-ranking-table-wrap{overflow-x:auto'),'QB horizontal scroll enabled');
ok(app.includes(`health?.app_version!=='${appVersion}'`),'current client release identity');
console.log('V138 QB qualification/layout checks passed');
