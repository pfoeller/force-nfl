const fs=require('fs'),vm=require('vm');
const app=fs.readFileSync(require('path').join(__dirname,'../assets/app.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(app.includes('function gameFlowQuarterScoreAllowed(points)'), 'V116 must define quarter-score plausibility gate');
ok(app.includes('return p !== 1;'), 'V116 must reject one-point quarter projections');
const start=app.indexOf('  const GAME_FLOW_QUARTER_PRIOR');
const end=app.indexOf('\n\n  function gameFlowCumulative',start);
ok(start>=0&&end>start,'game-flow allocator source must be extractable');
const source=`function gameFlowQuarterWeights(){return [0.202,0.303,0.206,0.289];}\nfunction gameFlowMatchupQuarterWeights(){return {weights:gameFlowQuarterWeights()};}\n${app.slice(start,end)}\nresult={gameFlowQuarterProjection,gameFlowTopAllocations,gameFlowQuarterScoreAllowed};`;
const ctx={result:null,Math,Object,Number}; vm.createContext(ctx); vm.runInContext(source,ctx);
const {gameFlowQuarterProjection,gameFlowTopAllocations,gameFlowQuarterScoreAllowed}=ctx.result;
ok(gameFlowQuarterScoreAllowed(0)&&gameFlowQuarterScoreAllowed(2)&&gameFlowQuarterScoreAllowed(3)&&gameFlowQuarterScoreAllowed(7),'common quarter scores must remain available');
ok(!gameFlowQuarterScoreAllowed(1),'one-point quarter must be unavailable');
for(let final=0;final<=60;final++){
  if(final===1) continue; // FORCEcast does not emit a one-point final; no valid decomposition exists.
  const top=gameFlowTopAllocations(final,[.202,.303,.206,.289],72);
  ok(top.length>0,`must produce candidate allocations for final ${final}`);
  for(const c of top){
    ok(c.parts.reduce((a,b)=>a+b,0)===final,`allocation must preserve final ${final}`);
    ok(!c.parts.includes(1),`allocation for ${final} contains impossible projected one-point quarter: ${c.parts}`);
  }
}
const representative=[2,3,6,7,10,13,14,16,17,20,21,23,24,27,28,30,31,34,35,38,41,45];
for(const away of representative) for(const home of representative){
  const p=gameFlowQuarterProjection(away,home,null);
  ok(p.away.reduce((a,b)=>a+b,0)===away,`away final mismatch ${away}-${home}`);
  ok(p.home.reduce((a,b)=>a+b,0)===home,`home final mismatch ${away}-${home}`);
  ok(!p.away.includes(1),`away one-point quarter ${away}-${home}: ${p.away}`);
  ok(!p.home.includes(1),`home one-point quarter ${away}-${home}: ${p.home}`);
}
console.log('OK: V116 quarter allocator preserves exact finals and never projects a one-point quarter');
