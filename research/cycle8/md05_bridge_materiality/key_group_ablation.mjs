// Second owner-authorized MD-05 research. Existing production code is never edited.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {hash, frozenRuntime} from './runtime.mjs';

export const ROOT = 'research/cycle8/md05_bridge_materiality';
export const GROUPS = Object.freeze({
  passingProtection: ['qbIndex', 'receiverIndex', 'olIndex'],
  offensiveBridge: ['pointsScoredPerDriveIndex', 'qbIndex', 'receiverIndex', 'olIndex', 'rbIndex'],
  defensivePass: ['coverageIndex', 'passRushIndex'],
  defensiveBridge: ['coverageIndex', 'passRushIndex', 'runDefenseIndex', 'pointsAllowedPerDriveIndex'],
  driveOutcome: ['pointsScoredPerDriveIndex', 'pointsAllowedPerDriveIndex']
});
const plain = x => JSON.parse(JSON.stringify(x));
const near = (a, b, label) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 1e-9, `${label}: ${a} / ${b}`);
const mean = a => a.reduce((s, x) => s+x, 0) / a.length;
export function summarize(values) {
  assert(values.length && values.every(Number.isFinite));
  const sorted = [...values].sort((a,b) => a-b);
  const abs = values.map(Math.abs).sort((a,b) => a-b);
  const median = a => (a[Math.floor((a.length-1)/2)] + a[Math.ceil((a.length-1)/2)]) / 2;
  const m = mean(values);
  return {n: values.length, mean: m, median: median(sorted), meanAbsolute: mean(abs), medianAbsolute: median(abs),
    maximumAbsolute: abs.at(-1), min: sorted[0], max: sorted.at(-1), populationSD: Math.sqrt(mean(values.map(x => (x-m)**2)))};
}
function pearson(a,b) {
  assert.equal(a.length,32); assert.equal(b.length,32);
  const am=mean(a), bm=mean(b), aa=a.map(x=>x-am), bb=b.map(x=>x-bm);
  const den=Math.sqrt(aa.reduce((s,x)=>s+x*x,0)*bb.reduce((s,x)=>s+x*x,0));
  return den ? aa.reduce((s,x,i)=>s+x*bb[i],0)/den : null;
}
function ranks(a) {
  const sorted=a.map((v,i)=>({v,i})).sort((x,y)=>x.v-y.v), out=[];
  for(let i=0;i<sorted.length;){let j=i+1;while(j<sorted.length&&sorted[j].v===sorted[i].v)j++;
    for(let k=i;k<j;k++)out[sorted[k].i]=(i+1+j)/2;i=j;}
  return out;
}
function correlation(a,b) {return {n:32, pearson:pearson(a,b), spearman:pearson(ranks(a),ranks(b))};}
function rankMap(teams,ratings) {
  return Object.fromEntries([...teams].sort((a,b)=>ratings[b]-ratings[a]||a.localeCompare(b)).map((t,i)=>[t,i+1]));
}
function largest(rows,key,id) {
  return [...rows].sort((a,b)=>Math.abs(b.delta[key])-Math.abs(a.delta[key])||a[id].localeCompare(b[id]))
    .slice(0,5).map(r=>({[id]:r[id],delta:r.delta[key]}));
}
// Observe the actual production LCG calls without changing any multiplication/result.
function seasonWithRngTrace(api, context) {
  const math=vm.runInContext('Math',context), original=math.imul, digest=crypto.createHash('sha256');
  const buffer=Buffer.alloc(4096), firstStates=[];let offset=0, draws=0;
  math.imul=(a,b)=>{
    if(a===1664525){if(firstStates.length<8)firstStates.push(b>>>0);buffer.writeUInt32LE(b>>>0,offset);offset+=4;draws++;
      if(offset===buffer.length){digest.update(buffer);offset=0;}}
    return original(a,b);
  };
  let season;
  try {season=plain(api.seasonProjection());} finally {math.imul=original;}
  if(offset)digest.update(buffer.subarray(0,offset));
  assert.equal(draws,season.runs*season.remainingGames);
  return {season,rng:{draws,firstStates,streamSHA256:digest.digest('hex')}};
}
function currentOutputs(api,context) {
  const ratings=plain(api.currentRatings());
  assert.deepEqual(plain(api.ratingsWithActiveQBCarryover(ratings)),ratings,'automatic/manual QB state must be identity');
  const games=Array.from(api.sortedSchedule()).filter(g=>g.homeScore==null).map(g=>{
    const forecast=plain(api.forecastFor(g,ratings));
    return {gameKey:api.gameKey(g),home:g.home,away:g.away,week:g.week,forecast,line:api.F.probabilityToSpread(forecast.probability)};
  });
  const analyticWins=Object.fromEntries(Object.keys(ratings).map(t=>[t,api.projected(t,ratings).ew]));
  return {ratings,games,analyticWins,...seasonWithRngTrace(api,context)};
}
function neutralizer(original, removed) {
  return (core,current,prior,meta,opts={})=>{
    const copy={...current};
    for(const k of removed)copy[k]=prior[k]; // zero only this delta; keep all weights/share/cap unchanged
    return original(core,copy,prior,meta,opts);
  };
}
export function analyze(destination=ROOT+'/results/key_group_ablation.json') {
  const inputText=fs.readFileSync(ROOT+'/inputs/snapshot.json','utf8').replace(/\r\n/g,'\n');
  const input=JSON.parse(inputText), provenance=JSON.parse(fs.readFileSync(ROOT+'/inputs/provenance.json','utf8'));
  assert.equal(hash(inputText),provenance.normalizedInputSHA256);
  assert.equal(input.base,'f2ce02c9f4ac7e54f22b372b6583cc878b030c45');
  const accepted=JSON.parse(fs.readFileSync(ROOT+'/results/bridge_materiality.json','utf8'));
  assert.equal(hash(fs.readFileSync(ROOT+'/results/bridge_materiality.json','utf8').replace(/\r\n/g,'\n')),provenance.resultSHA256);
  const ledgerText=fs.readFileSync(ROOT+'/inputs/core_movement_ledger.json','utf8').replace(/\r\n/g,'\n'), ledger=JSON.parse(ledgerText);
  assert.equal(ledger.snapshotSHA256,provenance.normalizedInputSHA256);
  assert.equal(ledger.generation,input.generation);assert.equal(ledger.base,input.base);
  const {api,context}=frozenRuntime(input), U=api.UFB, original=U.compute;
  assert.deepEqual(plain(U.WEIGHTS),accepted.constants.weights);near(U.SHARE,.5,'share');near(U.CAP,7.5,'cap');
  const keys=Object.keys(U.WEIGHTS), teams=Object.keys(input.core), weights=plain(U.WEIGHTS);
  assert.equal(keys.length,9);assert.equal(teams.length,32);
  assert.equal(ledger.rows.length,32);assert.deepEqual(ledger.rows.map(r=>r.team).sort(),[...teams].sort(),'unique full ledger coverage');
  assert(ledger.rows.every(r=>r.entryWeek===2),'result movement must use recorded Week-2 entry');
  const plan=[...keys.map(k=>({id:k,type:'key',keys:[k]})),...Object.entries(GROUPS).map(([id,ks])=>({id,type:'group',keys:ks}))];
  for(const row of plan){assert.equal(new Set(row.keys).size,row.keys.length);for(const k of row.keys)assert(keys.includes(k));}
  assert.equal(plan.length,14);
  const inputBefore=hash(JSON.stringify(input)), stateBefore=hash(JSON.stringify(api.S)), configBefore=hash(JSON.stringify(api.D));
  const actual=currentOutputs(api,context), actualRanks=rankMap(teams,actual.ratings);
  assert.deepEqual(actual.ratings,input.reference.ratings);
  assert.deepEqual(actual.analyticWins,input.reference.analyticWins);
  assert.deepEqual(actual.season,input.reference.season,'production seed trace must not alter accepted season');
  for(let i=0;i<actual.games.length;i++){
    assert.deepEqual(actual.games[i].forecast,input.reference.games[i].forecast);
    near(actual.games[i].line,input.reference.games[i].score.spread,'accepted line');
  }
  const variants=[];
  for(const spec of plan) {
    U.compute=neutralizer(original,spec.keys);
    const bridgeRows=[];
    for(const t of teams){
      const a=input.bridge[t], b=plain(api.unitForceBridge(t,input.core[t]));
      for(const c of b.components){const old=a.components.find(x=>x.key===c.key);
        if(spec.keys.includes(c.key)){assert.equal(c.current,c.prior);near(c.delta,0,'removed delta');near(c.contribution,0,'removed contribution');near(c.weight,old.weight,'removed key weight preserved');}
        else assert.deepEqual(c,old,'unselected key must be identical');}
      near(b.availableWeight,a.availableWeight,'no redistribution');
      const actualPre=a.weightedUnitDelta*U.SHARE, ablatedPre=b.weightedUnitDelta*U.SHARE;
      near(ablatedPre,actualPre-a.components.filter(c=>spec.keys.includes(c.key)).reduce((s,c)=>s+U.SHARE*c.contribution,0),'only selected contribution subtracted');
      near(b.bridgePoints,Math.max(-U.CAP,Math.min(U.CAP,ablatedPre)),'cap');
      near(b.elo-input.core[t],b.eloDelta,'core unchanged');
      const actualBinds=Math.abs(actualPre)>U.CAP, ablatedBinds=Math.abs(ablatedPre)>U.CAP;
      bridgeRows.push({team:t,actualPre,actualPost:a.bridgePoints,ablatedPre,ablatedPost:b.bridgePoints,
        actualBinds,ablatedBinds,capTransition:`${actualBinds?'binds':'unbound'} -> ${ablatedBinds?'binds':'unbound'}`,
        capDirectionActual:Math.sign(a.bridgePoints),capDirectionAblated:Math.sign(b.bridgePoints),
        delta:{elo:a.elo-b.elo,force:a.forceScore-b.forceScore},ablatedElo:b.elo,ablatedForce:b.forceScore});
    }
    // Synthetic mutation/control: masked inputs cannot leak; every retained input still enters the bridge.
    const t=teams[0], p=input.profiles[t], prior=p._preseasonUnitPrior;
    const canonical=U.compute(input.core[t],p,prior,input.meta,{weights});
    for(const k of keys){const mutated={...p,[k]:p[k]+1.25}, changed=U.compute(input.core[t],mutated,prior,input.meta,{weights});
      if(spec.keys.includes(k))assert.deepEqual(plain(changed),plain(canonical),'removed input mutation leaked');
      else near(changed.components.find(c=>c.key===k).contribution-canonical.components.find(c=>c.key===k).contribution,U.WEIGHTS[k]*1.25,'retained input mutation ignored');}
    const output=currentOutputs(api,context), ablatedRanks=rankMap(teams,output.ratings);
    assert.deepEqual(output.rng,actual.rng,'season random stream must be common across every variant');
    for(const row of bridgeRows){near(output.ratings[row.team],row.ablatedElo,'rating output');row.actualRank=actualRanks[row.team];row.ablatedRank=ablatedRanks[row.team];row.delta.rank=ablatedRanks[row.team]-actualRanks[row.team];}
    const gameRows=actual.games.map((g,i)=>{const b=output.games[i];assert.equal(g.gameKey,b.gameKey);
      assert.equal(g.forecast.market,b.forecast.market);assert.equal(g.forecast.marketWeight,b.forecast.marketWeight);assert.equal(g.forecast.source,b.forecast.source);
      return {gameKey:g.gameKey,home:g.home,away:g.away,actualProbability:g.forecast.probability,ablatedProbability:b.forecast.probability,actualLine:g.line,ablatedLine:b.line,
        delta:{probabilityPP:100*(g.forecast.probability-b.forecast.probability),line:g.line-b.line}};});
    const seasonRows=teams.map(t=>{const a=actual.season.teams[t],b=output.season.teams[t];return {team:t,actual:a,ablated:b,delta:{analyticWins:actual.analyticWins[t]-output.analyticWins[t],simulationMeanWins:a.expectedWins-b.expectedWins,divisionPP:a.divisionPct-b.divisionPct,playoffPP:a.playoffPct-b.playoffPct,byePP:a.byePct-b.byePct}};});
    const summary={team:Object.fromEntries(['elo','force','rank'].map(k=>[k,summarize(bridgeRows.map(r=>r.delta[k]))])),
      game:Object.fromEntries(['probabilityPP','line'].map(k=>[k,summarize(gameRows.map(r=>r.delta[k]))])),
      season:Object.fromEntries(Object.keys(seasonRows[0].delta).map(k=>[k,summarize(seasonRows.map(r=>r.delta[k]))]))};
    const capTransitions=Object.fromEntries(['binds -> binds','binds -> unbound','unbound -> binds','unbound -> unbound'].map(k=>[k,bridgeRows.filter(r=>r.capTransition===k).length]));
    assert.equal(Object.values(capTransitions).reduce((s,x)=>s+x,0),32);
    variants.push({...spec,summary,capTransitions,capDirectionFlips:bridgeRows.filter(r=>r.capDirectionActual*r.capDirectionAblated<0).map(r=>r.team),
      thresholds:{absoluteProbabilityPP:[1,5].map(v=>({atLeast:v,games:gameRows.filter(r=>Math.abs(r.delta.probabilityPP)>=v).length})),
        probabilityBoundaryCrossings:[.25,.5,.75].map(v=>({boundary:v,games:gameRows.filter(r=>(r.actualProbability>=v)!==(r.ablatedProbability>=v)).length})),
        absoluteLinePoints:[1,3].map(v=>({atLeast:v,games:gameRows.filter(r=>Math.abs(r.delta.line)>=v).length})),
        lineBoundaryCrossings:[-7,-3,0,3,7].map(v=>({boundary:v,games:gameRows.filter(r=>(r.actualLine>=v)!==(r.ablatedLine>=v)).length}))},
      largest:{elo:largest(bridgeRows,'elo','team'),probability:largest(gameRows,'probabilityPP','gameKey'),playoffs:largest(seasonRows,'playoffPP','team')},
      teams:bridgeRows,games:gameRows,season:seasonRows,rng:output.rng});
    U.compute=original;
    assert.equal(hash(JSON.stringify(input)),inputBefore);assert.equal(hash(JSON.stringify(api.S)),stateBefore);
    assert.equal(hash(JSON.stringify(api.D)),configBefore);assert.deepEqual(plain(U.WEIGHTS),weights);
    console.log('PASS '+spec.type+' '+spec.id);
  }
  U.compute=original;assert.deepEqual(plain(api.currentRatings()),input.ratings);
  const interactions=variants.filter(v=>v.type==='group').map(joint=>{
    const individuals=joint.keys.map(k=>variants.find(v=>v.id===k));
    const rows=(field,id,metrics)=>joint[field].map((r,i)=>({[id]:r[id],metrics:Object.fromEntries(metrics.map(k=>{
      const sumIndividual=individuals.reduce((s,v)=>s+v[field][i].delta[k],0), group=r.delta[k];return [k,{sumIndividual,joint:group,interaction:group-sumIndividual}];}))}));
    const teamRows=rows('teams','team',['elo']),gameRows=rows('games','gameKey',['probabilityPP','line']),seasonRows=rows('season','team',['analyticWins','simulationMeanWins','playoffPP','divisionPP','byePP']);
    const uncappedElo=(pre)=>pre*U.eloPerMidpointPoint(input.meta,pre);
    for(let i=0;i<teams.length;i++){
      const r=joint.teams[i],actualUncapped=uncappedElo(r.actualPre);
      const noCapJoint=actualUncapped-uncappedElo(r.ablatedPre), noCapSum=individuals.reduce((s,v)=>s+actualUncapped-uncappedElo(v.teams[i].ablatedPre),0);
      teamRows[i].uncappedDirectionalConversionInteraction=noCapJoint-noCapSum;
      teamRows[i].capMediatedRemainder=teamRows[i].metrics.elo.interaction-(noCapJoint-noCapSum);
    }
    return {group:joint.id,definition:'signed joint effect minus sum of signed individual effects, actual minus ablated',
      summary:{elo:summarize(teamRows.map(r=>r.metrics.elo.interaction)),probabilityPP:summarize(gameRows.map(r=>r.metrics.probabilityPP.interaction)),line:summarize(gameRows.map(r=>r.metrics.line.interaction)),
        ...Object.fromEntries(['analyticWins','simulationMeanWins','playoffPP','divisionPP','byePP'].map(k=>[k,summarize(seasonRows.map(r=>r.metrics[k].interaction))])),
        uncappedDirectionalConversion:summarize(teamRows.map(r=>r.uncappedDirectionalConversionInteraction)),capMediatedRemainder:summarize(teamRows.map(r=>r.capMediatedRemainder))},teams:teamRows,games:gameRows,season:seasonRows};
  });
  const movement=Object.fromEntries(ledger.rows.map(r=>{near(r.currentCausalElo,input.ledgerCurrent[r.team].causalCoreElo,'ledger current');near(r.currentCausalElo-r.entryCausalElo,r.resultOnlyMovement,'isolated result movement');return [r.team,r.resultOnlyMovement];}));
  const vectors=Object.fromEntries(keys.map(k=>[k,teams.map(t=>input.bridge[t].components.find(c=>c.key===k).contribution*U.SHARE)]));
  Object.assign(vectors,{appliedBridgeElo:teams.map(t=>input.bridge[t].eloDelta),coreCurrentElo:teams.map(t=>input.core[t]),finalCurrentElo:teams.map(t=>input.ratings[t]),resultOnlyMovementSinceWeek2:teams.map(t=>movement[t])});
  const names=Object.keys(vectors),matrix=Object.fromEntries(names.map(a=>[a,Object.fromEntries(names.map(b=>[b,correlation(vectors[a],vectors[b])]))]));
  const partialPairs=[];
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j],rxy=matrix[a][b].pearson,rxc=matrix[a].coreCurrentElo.pearson,ryc=matrix[b].coreCurrentElo.pearson;
    const den=Math.sqrt((1-rxc*rxc)*(1-ryc*ryc));
    partialPairs.push({a,b,n:32,pearson:rxy,partialPearsonControllingCore:den>1e-12?(rxy-rxc*ryc)/den:null});
  }
  const groupCorrelations=Object.entries(GROUPS).map(([group,ks])=>{
    const raw=teams.map((_,i)=>ks.reduce((s,k)=>s+vectors[k][i],0)),marginal=variants.find(v=>v.id===group).teams.map(t=>t.delta.elo);
    return {group,n:32,preCapVsCore:correlation(raw,vectors.coreCurrentElo),preCapVsResultMovement:correlation(raw,vectors.resultOnlyMovementSinceWeek2),marginalVsCore:correlation(marginal,vectors.coreCurrentElo)};
  });
  const single=variants.filter(v=>v.type==='key'),ranking=(metric)=>[...single].sort((a,b)=>metric(b)-metric(a)||a.id.localeCompare(b.id)).map((v,i)=>({rank:i+1,key:v.id,value:metric(v)}));
  const grossRanking=accepted.perKey.map((k,i)=>({rank:i+1,key:k.key,meanAbsolutePreCap:k.meanAbsolute,grossShare:k.absoluteMassShare}));
  const marginalRankings={teamElo:ranking(v=>v.summary.team.elo.meanAbsolute),gameProbability:ranking(v=>v.summary.game.probabilityPP.meanAbsolute),analyticWins:ranking(v=>v.summary.season.analyticWins.meanAbsolute),playoffProbability:ranking(v=>v.summary.season.playoffPP.meanAbsolute)};
  const passRush=variants.find(v=>v.id==='passRushIndex'),sourceQuality=[...new Set(teams.map(t=>input.profiles[t]._live.passRushProvider))].sort().map(source=>{
    const selected=teams.filter(t=>input.profiles[t]._live.passRushProvider===source),components=selected.map(t=>input.bridge[t].components.find(c=>c.key==='passRushIndex'));
    return {source,n:selected.length,teams:selected,rawDelta:summarize(components.map(c=>c.delta)),grossPreCap:summarize(components.map(c=>c.contribution*U.SHARE)),marginalElo:summarize(passRush.teams.filter(r=>selected.includes(r.team)).map(r=>r.delta.elo)),marginalPlayoffPP:summarize(passRush.season.filter(r=>selected.includes(r.team)).map(r=>r.delta.playoffPP))};
  });
  const result={schema:1,preTranche:'d16c5d79f77585935af8ebfc4a82e4d1188e1683',base:input.base,generation:input.generation,inputSHA256:provenance.normalizedInputSHA256,
    acceptedResultSHA256:provenance.resultSHA256,ledgerSupplementSHA256:hash(ledgerText),runtime:process.version,keys,weights,share:U.SHARE,cap:U.CAP,groups:GROUPS,
    policy:'Frozen direct bridge-channel sensitivity; unit dependencies are not rebuilt; no causal/predictive/replacement-weight claim',
    checks:{singleKeys:9,groups:5,teams:32,remainingGames:actual.games.length,sourceParity:true,mutationIsolation:true,otherInputsUnchanged:true,actualReferenceParity:true,commonRandomNumbers:true},
    seasonRuns:actual.season.runs,commonRng:actual.rng,variants,interactions,grossRanking,marginalRankings,
    correlation:{description:'Cross-sectional/descriptive n=32. Final includes core+bridge mechanically; partial correlation is screening, not causal redundancy.',ledgerDefinition:ledger.definition,matrix,partialPairs,groupCorrelations},sourceQuality};
  const dest=path.resolve(destination);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
  const columns=['id','type','meanAbsElo','medianAbsElo','maxAbsElo','meanAbsRank','meanAbsProbabilityPP','maxAbsProbabilityPP','meanAbsLine','meanAbsAnalyticWins','meanAbsPlayoffPP','maxAbsPlayoffPP','meanAbsDivisionPP','meanAbsByePP','bindsToUnbound','unboundToBinds'];
  const csvRows=variants.map(v=>[v.id,v.type,v.summary.team.elo.meanAbsolute,v.summary.team.elo.medianAbsolute,v.summary.team.elo.maximumAbsolute,v.summary.team.rank.meanAbsolute,v.summary.game.probabilityPP.meanAbsolute,v.summary.game.probabilityPP.maximumAbsolute,v.summary.game.line.meanAbsolute,v.summary.season.analyticWins.meanAbsolute,v.summary.season.playoffPP.meanAbsolute,v.summary.season.playoffPP.maximumAbsolute,v.summary.season.divisionPP.meanAbsolute,v.summary.season.byePP.meanAbsolute,v.capTransitions['binds -> unbound'],v.capTransitions['unbound -> binds']]);
  fs.writeFileSync(dest.replace(/\.json$/,'.csv'),columns.join(',')+'\n'+csvRows.map(r=>r.join(',')).join('\n')+'\n');
  console.log(JSON.stringify({resultSHA256:hash(fs.readFileSync(dest)),commonRng:actual.rng,marginalRankings}));
  return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))analyze(process.argv[2]);
