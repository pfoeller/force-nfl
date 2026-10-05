// Offline one-shot normalizer. Raw bootstrap/provider rows stay outside Git.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {BASE,DIR,hash,sources,units,finite,validateInput} from './architecture.mjs';
const [rawPath,metaPath,publicHashesPath]=process.argv.slice(2);
assert(rawPath&&metaPath&&publicHashesPath,'usage: node capture.mjs private-bootstrap.json capture.json public_hashes.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const bytes=fs.readFileSync(rawPath),raw=read(rawPath),meta=read(metaPath),publicHashes=read(publicHashesPath);
assert.equal(hash(bytes),meta.sha256);assert.equal(bytes.length,meta.bytes);assert.equal(meta.status,200);assert.equal(meta.url,'https://forceratings.com/api/bootstrap');
const hashes=sources();assert.deepEqual(hashes,publicHashes);
for(const [p,pin] of Object.entries(hashes)){
 const r=spawnSync('git',['-c','safe.directory='+process.cwd().replace(/\\/g,'/'),'show',BASE+':'+p],{encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(r.status,0,r.stderr);assert.equal(hash(r.stdout.replace(/\r\n/g,'\n')),pin,p);
}
const opts={now:Date.parse(meta.capturedAt),hooks:'applyBootstrapSnapshot,currentDataIntegrity,coreCurrentRatings,defensiveDriveContextMapBeforeWeek,sortedSchedule,scheduleKickoffInstant,D,UFB,M'};
const plain=x=>JSON.parse(JSON.stringify(x));
const normal=appHarness(opts);normal.api.applyBootstrapSnapshot(raw,'MD07 current snapshot');
const expected=plain(normal.api.liveProfiles()),ratings=plain(normal.api.currentRatings());
// Observation-only trace injection inside an isolated VM. Variables and return values unchanged.
let lp=fs.readFileSync('model/live_profiles.js','utf8').replace(/\r\n/g,'\n');
const marker='      out[t]={...prior,\n        offenseIndex';assert.equal(lp.split(marker).length,2);
lp=lp.replace(marker,`      window.__MD07 ||= {raw:{},stage:{},bench:{}};
      window.__MD07.raw[t]=r;
      window.__MD07.stage[t]={qbIndex:liveQb,receiverIndex:scoreRecv[t],olIndex:liveOl,rbIndex:liveRb,coverageIndex:liveCov,passRushIndex:frontPass,runDefenseIndex:scoreRunDef[t],pointsScoredPerDriveIndex:livePointsScoredPerDriveIndex,pointsAllowedPerDriveIndex:livePointsAllowedPerDriveIndex,offenseIndex:scoreOff[t]};
      window.__MD07.raw[t].selectedPassRushComposite=selectedPassRush?.compositeRate??null;
      window.__MD07.bench[t]={receiver:priorReceiverResidualValues,rb:priorRbOrthogonalValuesV109,qb:fullSeasonQbEpaBench,ol:olHistoricalBench,passRush:passRushProvider==='nflverse-weekly-disruption'?ids.map(id=>raw[id].frontPressureRate):rollingPassRushBenchmarks(priorPfrGamesByDefense,passRushGames||1)};
`+marker);
const h=appHarness({...opts,sources:{'model/live_profiles.js':lp}});h.api.applyBootstrapSnapshot(raw,'MD07 current snapshot');const {api}=h;
const p=api.liveProfiles();assert.deepEqual(plain(p),expected,'trace must leave complete profile unchanged');assert.deepEqual(plain(api.currentRatings()),ratings,'trace must leave ratings unchanged');
assert(api.S.live&&api.currentDataIntegrity().ready&&!api.S.snapshotFreshness.stale);
assert.equal(Object.keys(h.context.window.__MD07.raw).length,32);
const trace=h.context.window.__MD07,dc=api.defensiveDriveContextMapBeforeWeek();
const canon=t=>({LA:'LAR',STL:'LAR',SD:'LAC',OAK:'LV',JAC:'JAX'}[t]||t);
const eligible=r=>String(r.season)==='2026'&&(!r.season_type||r.season_type==='REG');
const teams={};const scalar=o=>Object.fromEntries(Object.entries(o||{}).filter(([,v])=>v===null||finite(v)||typeof v==='boolean'||typeof v==='string'));
const sum=(rows,k,opportunity=null)=>{const active=opportunity?rows.filter(r=>Number(r[opportunity])>0):rows;if(!active.length)return null;const vals=active.map(r=>r[k]);if(vals.some(v=>v==null||v===''||!Number.isFinite(Number(v))))return null;return vals.reduce((s,v)=>s+Number(v),0);};
const div=(a,b)=>finite(a)&&finite(b)&&b>0?a/b:null;
const quant=(vs,p)=>{const a=vs.filter(finite).sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};
for(const t of Object.keys(p).sort()){
 const pr=p[t],r=trace.raw[t],own=api.S.liveTeamStats.filter(x=>eligible(x)&&canon(x.team)===t),opp=api.S.liveTeamStats.filter(x=>eligible(x)&&canon(x.opponent_team)===t),players=api.S.livePlayerStats.filter(x=>eligible(x)&&canon(x.team||x.recent_team)===t);
 const wr=players.filter(x=>['WR','TE'].includes(x.position)),rb=players.filter(x=>['RB','FB'].includes(x.position));
 const rawSignals=scalar(r);rawSignals.offenseCompositeRaw=pr.offenseCompositeRaw;rawSignals.defenseCompositeRaw=pr.defenseCompositeRaw;
 const bench={...Object.fromEntries(Object.entries(rawSignals).filter(([,v])=>finite(v))),
  wrteYardsPerTarget:div(sum(wr,'receiving_yards','targets'),sum(wr,'targets')),wrteFirstDownRate:div(sum(wr,'receiving_first_downs','targets'),sum(wr,'targets')),
  rbYpc:div(sum(rb,'rushing_yards','carries'),sum(rb,'carries')),rbFirstDownRate:div(sum(rb,'rushing_first_downs','carries'),sum(rb,'carries')),rbExplosive20Rate:div(sum(rb,'rushing_20','carries'),sum(rb,'carries')),rbReceivingYardsPerTarget:div(sum(rb,'receiving_yards','targets'),sum(rb,'targets')),
  teamRushYpc:div(sum(own,'rushing_yards'),sum(own,'carries')),rushYpcAllowed:div(sum(opp,'rushing_yards'),sum(opp,'carries')),rushFirstDownRateAllowed:div(sum(opp,'rushing_first_downs'),sum(opp,'carries')),rushExplosive20Allowed:div(sum(opp,'rushing_20'),sum(opp,'carries')),
  coverageSuccessAllowed:dc[t]?.coveragePassSuccessRate??null,passYardsAllowedPerAttempt:div(sum(opp,'passing_yards'),sum(opp,'attempts')),
  pointsForPerGame:div(api.S.schedule.filter(g=>(g.home===t||g.away===t)&&g.homeScore!=null).reduce((s,g)=>s+(g.home===t?g.homeScore:g.awayScore),0),pr._live.games),
  pointsAgainstPerGame:div(api.S.schedule.filter(g=>(g.home===t||g.away===t)&&g.homeScore!=null).reduce((s,g)=>s+(g.home===t?g.awayScore:g.homeScore),0),pr._live.games)};
 teams[t]={display:Object.fromEntries(units.map(u=>[u.key,pr[u.key]])),raw:rawSignals,liveGrade:plain(trace.stage[t]),prior:plain(pr._preseasonUnitPrior),core:api.coreCurrentRatings()[t],current:ratings[t],metadata:{games:pr._live.games,statGames:pr._live.statGames,playerStatGames:pr._live.playerStatGames,priorGames:pr._live.priorGames,qbPriorGames:pr._live.qbPriorGames,passRushGames:pr._live.passRushGames,passRushProvider:pr._live.passRushProvider,passRushDataState:pr._live.passRushDataState,qbDataState:pr._live.qbDataState,freshness:pr._live.freshness},components:{qb:scalar(pr.qb),receivers:scalar(pr.receivers),rb:scalar(pr.rb),ol:scalar(pr.ol),dl:scalar(pr.dl),cov:scalar(pr.cov)},benchmarks:bench,historicalSpread:Object.fromEntries(Object.entries(trace.bench[t]).map(([k,v])=>[k,{n:v.length,p10:quant(v,.1),p25:quant(v,.25),p75:quant(v,.75),p90:quant(v,.9)}]))};
}
const schedule=api.sortedSchedule();const unscoredStarted=schedule.filter(g=>g.homeScore==null&&api.scheduleKickoffInstant(g.date,g.time)?.getTime()<=Date.parse(meta.capturedAt)).map(g=>g.home+'-'+g.away+'-'+g.week);
const input={schema:1,base:BASE,capture:meta,builtAt:raw.builtAt,generation:raw.generation,sourceHashes:hashes,publicSourceHashes:publicHashes,runtime:process.version,state:{live:api.S.live,integrity:plain(api.currentDataIntegrity()),freshness:plain(api.S.snapshotFreshness),unscoredStarted,warnings:raw.warnings},bridgeWeights:plain(api.UFB.WEIGHTS),composite:{offense:plain(h.L.OFFENSE_WEIGHTS),defense:plain(h.L.DEFENSE_WEIGHTS),calibration:plain(h.L.COMPOSITE_V108)},teams};
validateInput(input);
const dest=DIR+'/inputs/current_snapshot.json';assert(!fs.existsSync(dest),'immutable capture, refuse overwrite existing normalized input');const text=JSON.stringify(input,null,2)+'\n';fs.writeFileSync(dest,text);
const provenance={schema:1,base:BASE,deployedBaseEvidence:'All 18 published ordered scripts match base; Cloudflare Workers check for fd585891 successful, version 6f108636-5d00-425e-8588-41e1b08cc4b7',capture:meta,builtAt:raw.builtAt,generation:raw.generation,normalizedSHA256:hash(text),publicHashes,normalization:'Only FORCE-derived team-level numeric signals, stages, grades, effective priors, benchmark aggregates, sample/freshness/provider metadata and anonymous historical distribution quartiles. No bootstrap/feed/player/FTN/PFR/PBP rows committed.',traceParity:'Entire profile object and current ratings equal uninstrumented production VM',benchmarkBoundary:'Non-formula current outcomes share production feeds. They are not independent providers, causal unit skill, or predictive holdouts. External official-team fact summaries separately sourced.',historicalBoundary:'Exact causal historical production unit reconstruction unavailable: time-pinned current pressure/provider archive, regime priors and evolving live data absent. No historical test attempted.'};
fs.writeFileSync(DIR+'/inputs/provenance.json',JSON.stringify(provenance,null,2)+'\n');console.log(JSON.stringify({sha256:hash(text),generation:input.generation,teams:Object.keys(teams).length,unscoredStarted,providers:Object.fromEntries([...new Set(Object.values(teams).map(x=>x.metadata.passRushProvider))].map(k=>[k,Object.values(teams).filter(x=>x.metadata.passRushProvider===k).length]))}));
