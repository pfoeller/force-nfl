const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'model/early_regime.js'),'utf8'),ctx,{filename:'model/early_regime.js'});
const E=ctx.window.FORCE_EARLY_REGIME;
const rows=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/v34_2025_recent_games.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/v34_early_regime_audit.json'),'utf8'));
let assertions=0;
function ok(v,m){assertions++; if(!v) throw new Error(m);}
function near(a,b,t=1e-11,m='values differ'){assertions++; if(Math.abs(Number(a)-Number(b))>t) throw new Error(`${m}: ${a} vs ${b}`);}
function brier(a){return a.reduce((s,x)=>s+(x.p-x.y)**2,0)/a.length;}
function score(out,pred){const z=out.filter(pred); return [brier(z),z.length];}

ok(E.CONFIG.version==='v34','wrong V34 module version');
near(E.weekFade?E.weekFade(7):0,0,0,'week 7 must be zero');
near(E.rawCorrectionPoints('X',7,{X:[{residual:30,opponentQuality:1}]}),0,0,'no Week 7 correction');
near(E.rawCorrectionPoints('X',1,{X:[{residual:30,opponentQuality:1}]}),0,0,'no Week 1 correction');
ok(E.eloPerPoint(340)>22 && E.eloPerPoint(340)<23,'unexpected Elo/point bridge');

const state={};
const out=[];
const sorted=[...rows].sort((a,b)=>(a.week-b.week)||a.home.localeCompare(b.home)||a.away.localeCompare(b.away));
for(const r of sorted){
  const baseMargin=E.expectedMarginFromProbability(r.p_home);
  const homeCorr=E.rawCorrectionPoints(r.home,r.week,state);
  const awayCorr=E.rawCorrectionPoints(r.away,r.week,state);
  const p=E.probabilityFromExpectedMargin(baseMargin+homeCorr-awayCorr);
  out.push({week:r.week,p,y:r.result,homeCorr,awayCorr});
  const obs=E.observationFromGame({home:r.home,away:r.away,homeScore:r.home_score,awayScore:r.away_score},r.p_home,r.home_elo_pre,r.away_elo_pre);
  E.addObservation(state,obs.home.team,obs.home.residual,obs.home.opponentElo);
  E.addObservation(state,obs.away.team,obs.away.residual,obs.away.opponentElo);
}
const base=sorted.map(r=>({week:r.week,p:r.p_home,y:r.result}));
const cases=[
 ['week2',x=>x.week===2],['week3',x=>x.week===3],['weeks2_3',x=>x.week===2||x.week===3],
 ['weeks4_6_temporal_holdout',x=>x.week>=4&&x.week<=6],['weeks2_6',x=>x.week>=2&&x.week<=6],
 ['weeks7_plus',x=>x.week>=7],['full_2025',x=>true]
];
for(const [name,pred] of cases){
 const [bb,n]=score(base,pred), [cc,n2]=score(out,pred), ref=audit.brier_replay[name];
 ok(n===ref.n&&n2===ref.n,`${name} n mismatch`);
 near(bb,ref.baseline,1e-12,`${name} baseline`);
 near(cc,ref.candidate,1e-12,`${name} candidate`);
 near(cc-bb,ref.delta,1e-12,`${name} delta`);
}
// Later-season ratings must be exactly untouched.
for(const x of out.filter(x=>x.week>=7)){ near(x.homeCorr,0,0,'week7+ home correction'); near(x.awayCorr,0,0,'week7+ away correction'); }
// Contradictory two-game evidence shuts the signal off.
const s2={T:[]};
E.addObservation(s2,'T',15,1505); E.addObservation(s2,'T',-12,1505);
near(E.rawCorrectionPoints('T',3,s2),0,0,'contradictory results must suppress correction');
// Pathological one-game correction is capped.
const s3={T:[]}; E.addObservation(s3,'T',100,1700);
ok(Math.abs(E.rawCorrectionPoints('T',2,s3))<=7+1e-12,'final correction cap failed');

const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes('const ER = window.FORCE_EARLY_REGIME || null;'),'app must load V34 regime module');
ok(app.includes('coreRatings'),'core Elo must remain separate from transient regime rating');
ok(app.includes('baselineIndependent'),'regime residual must be scored against baseline expectation');
ok(app.includes('ER.addObservation(earlyStates'),'observations must enter only after forecast batch');
ok(app.includes('postPredictiveHome'),'postgame audit should expose next-week transient state');
console.log(`OK: ${assertions} V34 early-regime assertions`);
