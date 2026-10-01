const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
const lp=fs.readFileSync('model/live_profiles.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(app.includes("expected FORCE V139"),'client identity V139');
ok(lp.includes('leave-one-matchup-out'),'leave-one-out method documented');
ok(lp.includes('g.team!==t'),'evaluated team matchup excluded from defense baseline');
ok(lp.includes('stabilizerDropbacks:100'),'small defense sample stabilized');
ok(lp.includes('opponent_force_qb_rating_allowed'),'allowed FORCE QB rating exposed');
ok(lp.includes("opponent_adjustment_method:'leave-one-matchup-out-force-qb-rating-allowed'"),'method exposed');
ok(!lp.includes('const qbOpponentRatingAdjustment=(qbPolicy===\'v106-current-season-stabilized\' && Number.isFinite(Number(scoreQbAdjustedEpaV131[t]))'),'old EPA-derived opponent adjustment removed');
ok(app.includes('custom stat weights do not rescale it'),'custom mode treats opponent context separately');
console.log('PASS: V139 leave-one-matchup-out FORCE QB Rating allowed opponent adjustment (8 checks)');
