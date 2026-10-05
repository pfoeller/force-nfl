import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hash,frozenRuntime,outputs} from './runtime.mjs';
const root='research/cycle8/md05_bridge_materiality';
const inputBytes=fs.readFileSync(root+'/inputs/snapshot.json','utf8').replace(/\r\n/g,'\n'),input=JSON.parse(inputBytes);
const {api}=frozenRuntime(input),U=api.UFB,keys=Object.keys(U.WEIGHTS),teams=Object.keys(input.core);
const near=(a,b,msg)=>assert(Math.abs(a-b)<=1e-9,`${msg}: ${a} != ${b}`);
assert.equal(teams.length,32);assert.equal(new Set(teams).size,32);assert.equal(keys.length,9);near(Object.values(U.WEIGHTS).reduce((s,x)=>s+x,0),1,'weight sum');
const q=(v,p)=>{const x=[...v].sort((a,b)=>a-b),i=(x.length-1)*p,l=Math.floor(i);return x[l]+(x[Math.ceil(i)]-x[l])*(i-l);};
export function stats(v){const mean=v.reduce((s,x)=>s+x,0)/v.length;return {n:v.length,min:Math.min(...v),max:Math.max(...v),mean,median:q(v,.5),meanAbsolute:v.reduce((s,x)=>s+Math.abs(x),0)/v.length,medianAbsolute:q(v.map(Math.abs),.5),sd:Math.sqrt(v.reduce((s,x)=>s+(x-mean)**2,0)/v.length),p10:q(v,.1),p25:q(v,.25),p75:q(v,.75),p90:q(v,.9)};}
const coreStats=stats(teams.map(t=>input.core[t])),rank=r=>Object.fromEntries([...teams].sort((a,b)=>r[b]-r[a]||a.localeCompare(b)).map((t,i)=>[t,i+1]));
const coreRank=rank(input.core),finalRank=rank(input.ratings),rows=[];
for(const t of teams){
 const b=api.unitForceBridge(t,input.core[t]),original=input.bridge[t];
 assert.deepEqual(JSON.parse(JSON.stringify(b)),original,'bridge reproduction '+t);
 const components=Array.from(b.components,c=>({...c,share:U.SHARE,preCapContribution:c.contribution*U.SHARE}));
 assert.deepEqual(components.map(c=>c.key),keys);
 const preCap=components.reduce((s,c)=>s+c.preCapContribution,0);
 near(preCap,b.weightedUnitDelta*U.SHARE,'key sum');near(b.bridgePoints,Math.max(-U.CAP,Math.min(U.CAP,preCap)),'cap');near(input.ratings[t]-input.core[t],b.eloDelta,'rating identity');near(input.ledgerCurrent[t].unitBridgeElo,b.eloDelta,'ledger current bridge');near(input.ledgerCurrent[t].residual,0,'ledger reconciliation');
 for(const c of components){near(c.weight,U.WEIGHTS[c.key],'weight');if(c.current===null||c.prior===null){assert.equal(c.delta,null);assert.equal(c.contribution,0);}else near(c.delta,c.current-c.prior,'raw delta');}
 rows.push({team:t,coreElo:input.core[t],coreForce:b.baseForce,preCap,postCap:b.bridgePoints,appliedElo:b.eloDelta,finalElo:b.elo,finalForce:b.forceScore,displayForceDelta:b.forceDelta,absoluteElo:Math.abs(b.eloDelta),sign:Math.sign(b.eloDelta),capUsedPct:100*Math.abs(b.bridgePoints)/U.CAP,capBinds:Math.abs(preCap)>U.CAP,uncappedExcess:Math.max(0,Math.abs(preCap)-U.CAP),coreRank:coreRank[t],finalRank:finalRank[t],rankMovement:coreRank[t]-finalRank[t],eloOverCoreSD:Math.abs(b.eloDelta)/coreStats.sd,eloOverCoreRange:Math.abs(b.eloDelta)/(coreStats.max-coreStats.min),missingKeys:components.filter(c=>c.delta===null).map(c=>c.key),components});
}
// Explicit missing/null/NaN/empty/undefined behavior and no redistribution. Synthetic, not captured evidence.
const valid=Object.fromEntries(keys.map(k=>[k,60])),prior=Object.fromEntries(keys.map(k=>[k,50]));
for(const invalid of [null,NaN,'',undefined]){const p={...valid,[keys[0]]:invalid},b=U.compute(input.meta.meanElo,p,prior,input.meta);assert.equal(b.components[0].delta,null);assert.equal(b.components[0].contribution,0);near(b.availableWeight,1-U.WEIGHTS[keys[0]],'no weight redistribution');near(b.bridgePoints,U.SHARE*(1-U.WEIGHTS[keys[0]])*10,'missing zero contribution');}
const immutable=hash(JSON.stringify(input)),current=outputs(api);
assert.deepEqual(current,input.reference,'all current normalized forecasts/scores/season outputs equal direct live-derived reference');
const originalCompute=U.compute;
let noBridge;
try{U.compute=(core,p,prior,meta,opts={})=>originalCompute(core,p,prior,meta,{...opts,share:0});noBridge=outputs(api);assert.deepEqual(noBridge.ratings,input.core,'only bridge neutralized');}finally{U.compute=originalCompute;}
assert.equal(hash(JSON.stringify(input)),immutable,'frozen state/markets/profiles/schedule never mutated');
assert.deepEqual(JSON.parse(JSON.stringify(api.currentRatings())),input.ratings,'restored actual ratings');
const gameRows=current.games.map((g,i)=>{const n=noBridge.games[i];assert.equal(g.gameKey,n.gameKey);return {gameKey:g.gameKey,home:g.home,away:g.away,week:g.week,current:g,noBridge:n,delta:{homeProbabilityPP:100*(g.forecast.probability-n.forecast.probability),homeLine:g.score.spread-n.score.spread,rawMargin:g.score.rawMargin-n.score.rawMargin,rawTotal:g.score.rawTotal-n.score.rawTotal,displayHome:g.score.home-n.score.home,displayAway:g.score.away-n.score.away,displayMargin:g.score.margin-n.score.margin,displayTotal:g.score.total-n.score.total,simulatedMeanHome:g.score.simulatedMeanHome-n.score.simulatedMeanHome,simulatedMeanAway:g.score.simulatedMeanAway-n.score.simulatedMeanAway}};});
const seasonRows=teams.map(t=>{const a=current.season.teams[t],b=noBridge.season.teams[t];return {team:t,current:{analyticWins:current.analyticWins[t],...a},noBridge:{analyticWins:noBridge.analyticWins[t],...b},delta:{analyticWins:current.analyticWins[t]-noBridge.analyticWins[t],simulationMeanWins:a.expectedWins-b.expectedWins,divisionPP:a.divisionPct-b.divisionPct,playoffPP:a.playoffPct-b.playoffPct,byePP:a.byePct-b.byePct}};});
const keyMass=rows.reduce((s,r)=>s+r.components.reduce((a,c)=>a+Math.abs(c.preCapContribution),0),0);
const perKey=keys.map(k=>{const values=rows.map(r=>r.components.find(c=>c.key===k).preCapContribution),s=stats(values);return {key:k,weight:U.WEIGHTS[k],...s,positive:values.filter(x=>x>1e-9).length,negative:values.filter(x=>x< -1e-9).length,maxAbsolute:Math.max(...values.map(Math.abs)),absoluteMassShare:values.reduce((a,x)=>a+Math.abs(x),0)/keyMass};}).sort((a,b)=>b.absoluteMassShare-a.absoluteMassShare);
const netPreCapMass=rows.reduce((s,r)=>s+Math.abs(r.preCap),0);
for(const k of perKey) k.absoluteContributionOverNetTeamMass=k.meanAbsolute*teams.length/netPreCapMass;
const gameSummary=Object.fromEntries(Object.keys(gameRows[0].delta).map(k=>[k,stats(gameRows.map(g=>g.delta[k]))])),seasonSummary=Object.fromEntries(Object.keys(seasonRows[0].delta).map(k=>[k,stats(seasonRows.map(t=>t.delta[k]))]));
const result={schema:1,base:input.base,inputSHA256:hash(inputBytes),capture:input.capture,builtAt:input.builtAt,generation:input.generation,constants:{weights:U.WEIGHTS,share:U.SHARE,cap:U.CAP,eloPerPositiveMidpoint:U.eloPerMidpointPoint(input.meta,1),eloPerNegativeMidpoint:U.eloPerMidpointPoint(input.meta,-1)},checks:{teamCount:32,keyCount:9,accountingTolerance:1e-9,liveCurrentReferenceParity:true,missingBehaviorSynthetic:true,onlyBridgeAblated:true,sourceHashesMatched:true},coreDistribution:coreStats,bridgeDistribution:{midpoint:stats(rows.map(r=>r.postCap)),elo:stats(rows.map(r=>r.appliedElo)),displayForce:stats(rows.map(r=>r.displayForceDelta)),positive:rows.filter(r=>r.sign>0).length,negative:rows.filter(r=>r.sign<0).length,approximatelyZero:rows.filter(r=>r.absoluteElo<=1e-9).length,atCap:rows.filter(r=>Math.abs(r.postCap)>=U.CAP-1e-9).map(r=>r.team),nearCap90Pct:rows.filter(r=>r.capUsedPct>=90).map(r=>r.team),capBinds:rows.filter(r=>r.capBinds).map(r=>r.team),thresholds: [1,10,25,50].map(elo=>({absoluteEloAtLeast:elo,teams:rows.filter(r=>r.absoluteElo>=elo).length})),missing:rows.filter(r=>r.missingKeys.length).map(r=>({team:r.team,keys:r.missingKeys}))},perKey,absoluteKeyMass:keyMass,absoluteNetPreCapMass:rows.reduce((s,r)=>s+Math.abs(r.preCap),0),teams:rows.sort((a,b)=>a.finalRank-b.finalRank),rankImpact:stats(rows.map(r=>r.rankMovement)),rankChanged:rows.filter(r=>r.rankMovement!==0).length,games:gameRows,gameSummary,season:seasonRows,seasonSummary,projectionRuns:current.season.runs,scoreSimulationRuns:25000};
const dest=path.resolve(process.argv[2]||root+'/results/bridge_materiality.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
const cols=['team','coreElo','coreForce','preCap','postCap','appliedElo','finalElo','finalForce','displayForceDelta','absoluteElo','sign','capUsedPct','capBinds','coreRank','finalRank','rankMovement'];
fs.writeFileSync(dest.replace(/\.json$/,'.csv'),cols.join(',')+'\n'+result.teams.map(r=>cols.map(k=>r[k]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({output:dest,sha256:hash(fs.readFileSync(dest)),bridge:result.bridgeDistribution,rankChanged:result.rankChanged,gameSummary,seasonSummary},null,2));
