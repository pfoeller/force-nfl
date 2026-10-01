const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
const model=fs.readFileSync('model/live_profiles.js','utf8');
function ok(x,m){if(!x) throw new Error(m)}
ok(app.includes('<th>Opponent Adjustment</th>'),'QB table must expose opponent adjustment');
ok(app.includes('actualPassEpaPerAttempt,3'),'EPA/play must display native value');
ok(app.includes('anyA,2'),'ANY/A must display native value');
ok(app.includes('passSuccessRate==null?null:r.q.passSuccessRate*100'),'success rate must display native percent');
ok(app.includes('qbRushEpaPerAttempt,2'),'rushing must display native EPA/att');
ok(app.includes('cpoe,1'),'CPOE must display native value');
ok(app.includes("EPA/play, ANY/A, success rate, rushing EPA per attempt, and CPOE remain in their actual observed units"),'page must explain native stats');
ok(model.includes('qbOpponentRatingAdjustment'),'model must compute explicit opponent rating adjustment');
ok(model.includes('qbPassCore') && model.includes('+qbOpponentRatingAdjustment'),'opponent adjustment must affect final composite');
ok(model.includes("weightedLeagueMean(qbLiveRows,'qbAttemptEpa'"),'EPA component must use raw EPA before opponent adjustment');
console.log('V131 QB native-stat/opponent-adjustment checks passed');
