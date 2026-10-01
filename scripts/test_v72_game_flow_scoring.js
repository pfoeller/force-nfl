const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};
ok(app.includes("const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Final']"),'Game Flow must expose Q1-Q4 plus Final');
ok(app.includes('Projected scoring by quarter'),'Game Flow heading must describe quarter scoring, not cumulative checkpoints');
ok(app.includes('gameFlowConversionStrategyCost'),'score-state conversion strategy must participate in path search');
ok(app.includes('(prevAway - prevHome) === -8'),'down-eight conversion rule missing');
ok(css.includes('repeat(5,minmax(64px,.55fr))'),'desktop Game Flow grid must allow five score columns');

// Execute the actual V72 allocator functions with the documented league-average quarter timing.
const start=app.indexOf('  const GAME_FLOW_QUARTER_PRIOR');
const end=app.indexOf('  function gameFlowTendency', start);
ok(start>=0 && end>start,'allocator source block missing');
const source=`function gameFlowQuarterWeights(){return [0.202,0.303,0.206,0.289];}\n${app.slice(start,end)}\nresult={gameFlowQuarterProjection,gameFlowConversionStrategyCost};`;
const ctx={result:null, Object, Math, Number}; vm.createContext(ctx); vm.runInContext(source,ctx);
const {gameFlowQuarterProjection,gameFlowConversionStrategyCost}=ctx.result;
const scores=[0,3,6,7,10,13,14,17,20,21,24,27,28,31,34,35,38,41,45];
const pairs=[[0,0],[3,7],[6,8],[13,21],[17,31],[20,28],[24,27],[31,17],[35,34],[38,41],[45,24]];
for(const [away,home] of pairs){
  const a=gameFlowQuarterProjection(away,home);
  ok(a.away.reduce((s,v)=>s+v,0)===away,`away quarter sum mismatch ${away}-${home}`);
  ok(a.home.reduce((s,v)=>s+v,0)===home,`home quarter sum mismatch ${away}-${home}`);
  ok(a.away.length===4 && a.home.length===4,'allocator must return four quarter increments');
  const b=gameFlowQuarterProjection(away,home);
  ok(JSON.stringify(a)===JSON.stringify(b),'allocator must be deterministic');
}
// Screenshot example should now use natural football quarter increments.
const example=gameFlowQuarterProjection(17,31);
ok(JSON.stringify(example.away)==='[0,7,3,7]','17-point path should prefer natural 0/7/3/7 allocation');
ok(JSON.stringify(example.home)==='[7,10,7,7]','31-point path should prefer natural 7/10/7/7 allocation');
// Explicit conversion-strategy test: after reaching 13-21, a lone touchdown should not prefer a kick to 20.
const fail2=gameFlowConversionStrategyCost([3,10,6,0],[7,14,0,0]);
const kick=gameFlowConversionStrategyCost([3,10,7,0],[7,14,0,0]);
const make2=gameFlowConversionStrategyCost([3,10,8,0],[7,14,0,0]);
ok(kick>fail2+4,'21-13 touchdown path must strongly disfavor PAT-to-20 versus failed two-point try');
ok(kick>make2+4,'21-13 touchdown path must strongly disfavor PAT-to-20 versus made two-point try');
ok(make2<fail2,'successful two-point path should be modestly preferred to failed attempt in the path prior');
// V71 research conclusion remains intact: timing profile does not alter FORCEcast probability.
ok(!app.includes('fc.probability =') && !app.includes('proj.probability ='),'team-specific quarter timing must remain display-only for win probability');
console.log(`OK: ${n} V72 football-normalized Game Flow assertions`);
