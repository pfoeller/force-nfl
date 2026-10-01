const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'model/forecast_v2.js'),'utf8'), context, {filename:'model/forecast_v2.js'});
const F = context.window.SIGNAL_FORECAST_V2;
let assertions=0;
function ok(x,msg){ assertions++; if(!x) throw new Error(msg); }
function near(a,b,t=1e-10,msg='values differ'){ assertions++; if(Math.abs(a-b)>t) throw new Error(`${msg}: ${a} vs ${b}`); }

// Contract 1: line -> probability -> line must be a true round trip across
// representative NFL spreads. V30 failed this because the return path used an
// unrelated 28.6 Elo/point constant.
for (const line of [-14,-10,-7,-6.5,-3,-1,0,1,3,6.5,7,10,14]) {
  const p=F.spreadToProbability(line);
  const back=F.probabilityToSpread(p);
  near(back, -line, 1e-10, `sportsbook-sign round trip failed for internal home-margin ${line}`);
}

// Contract 2: independent Elo probability -> FORCE spread has one coherent
// scale. Algebraically, one spread point corresponds to scale/(6.5*ln(10)) Elo.
const scale=340, hfa=15;
const eloPerPoint=scale/(6.5*Math.log(10));
near(eloPerPoint,22.716942,1e-5,'unexpected Elo/point calibration');
for (const diff of [-160,-100,-50,0,50,100,160]) {
  const home=1500+diff, away=1500;
  const p=F.independentProbability(home,away,hfa,scale);
  const line=F.probabilityToSpread(p);
  const expected=-(diff+hfa)/eloPerPoint;
  near(line,expected,1e-10,`Elo->line mismatch at diff ${diff}`);
}

// Reported KC-IND shape: displayed FORCE ~61 vs ~38. Invert the public FORCE
// score scale to Elo and verify the adjusted-rating line is materially larger
// than V30's compressed conversion.
const mean=1505, lo=1214.2, hi=1782.0;
function eloFromScore(s){ return s>=50 ? mean+(s-50)/50*(hi-mean) : mean-(50-s)/50*(mean-lo); }
const kc=eloFromScore(61), ind=eloFromScore(38);
// KC is away at Indianapolis.
const pIndHome=F.independentProbability(ind,kc,hfa,scale);
const v31Line=F.probabilityToSpread(pIndHome); // positive => away favorite in app convention
const oldV30Line=scale*Math.log10((1/pIndHome)-1)/28.6;
ok(v31Line > oldV30Line + 0.9, `V31 should undo substantial V30 line compression: ${oldV30Line} -> ${v31Line}`);
ok(v31Line > 5.0 && v31Line < 5.3, `61-vs-38 example should imply roughly KC -5.1 before exact-score rounding; got ${v31Line}`);

const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes('F?.probabilityToSpread'), 'app must delegate FORCE line conversion to forecast calibration');
ok(!app.includes('/ 28.6'), 'legacy 28.6 Elo/point FORCE-line conversion must be removed');
console.log(`OK: ${assertions} V31 FORCE-line calibration assertions`);
