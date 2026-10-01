const fs=require('fs'); const app=fs.readFileSync('assets/app.js','utf8'); let n=0;
function ok(x,m){if(!x)throw new Error(m);n++;}
ok(app.includes('const FORCECAST_SCORE_SIM_RUNS = 25000'),'25k simulation count missing');
ok(app.includes('function simulateForcecastScore('),'simulation engine missing');
ok(app.includes('forcecastScoreSeed('),'deterministic seed missing');
ok(app.includes('forcecastPoisson('),'possession-count simulation missing');
ok(app.includes('const paceShock=forcecastNormal(rng)*0.85'),'pace variance missing');
ok(app.includes('const commonGameShock=forcecastNormal(rng)*0.10'),'correlated game shock missing');
ok(app.includes('if(u<tdProb) pts+=7'),'TD drive outcome missing');
ok(app.includes('else if(u<tdProb+fgProb) pts+=3'),'FG drive outcome missing');
ok(app.includes('const simulated = simulateForcecastScore(g,rawTotal,rawMargin,beforeWeek)'),'exact score must use Monte Carlo');
ok(!app.includes('const normalized = SN?.normalize ? SN.normalize(rawTotal, rawMargin)'),'old algebraic normalizer must not generate public score');
ok(app.includes('monteCarlo: true'),'projection metadata missing');
ok(app.includes('25,000 possession-level simulations'),'public explanation missing');
console.log(`OK: ${n} V149 Monte Carlo score assertions`);
