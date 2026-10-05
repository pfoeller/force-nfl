// Offline normalization of one existing /api/bootstrap capture; never fetches providers.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {hash,sourceHashes,outputs} from './runtime.mjs';
const [rawPath,metaPath,publicHashesPath]=process.argv.slice(2);
assert(rawPath&&metaPath&&publicHashesPath,'usage: node capture.mjs raw-bootstrap.json capture_meta.json public_source_hashes.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const raw=read(rawPath),capture=read(metaPath),publicHashes=read(publicHashesPath);
assert.equal(hash(fs.readFileSync(rawPath)),capture.sha256,'raw capture hash');
const hashes=sourceHashes();
for(const [p,h] of Object.entries(hashes)){const r=spawnSync('git',['-c',`safe.directory=${process.cwd().split(path.sep).join('/')}`,'show',`f2ce02c9f4ac7e54f22b372b6583cc878b030c45:${p}`],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(r.status,0,r.stderr);assert.equal(hash(r.stdout.replace(/\r\n/g,'\n')),h,'capture must use exact authorized base '+p);}
assert.deepEqual(publicHashes,hashes,'every ordered deployed script must match base (LF-normalized)');
const {api}=appHarness({now:Date.parse(capture.capturedAt),hooks:'applyBootstrapSnapshot,coreCurrentRatings,profile,ratingLedger,score,sortedSchedule,gameKey,seasonProjection,exactScoreProjection,projected,currentDataIntegrity,scheduleKickoffInstant,D,UFB,F'});
api.applyBootstrapSnapshot(raw,'MD05 production research capture');
const ratings=api.currentRatings(),core=api.coreCurrentRatings(),profiles=api.liveProfiles(),keys=Object.keys(api.UFB.WEIGHTS);
assert(api.S.live&&api.currentDataIntegrity().ready&&!api.S.snapshotFreshness.stale,'live/current complete snapshot required');
const bridge=Object.fromEntries(Object.keys(ratings).map(t=>[t,api.unitForceBridge(t,core[t])]));
assert(Object.values(bridge).some(b=>Math.abs(b.eloDelta)>1e-9),'STOP: zero-bridge fallback');
const input={schema:1,base:'f2ce02c9f4ac7e54f22b372b6583cc878b030c45',capture,builtAt:raw.builtAt,generation:raw.generation,warnings:raw.warnings,sourceHashes:hashes,publicSourceHashes:publicHashes,runtime:process.version,meta:api.D.meta,config:{hfa:api.D.config.hfa,scale:api.D.config.scale},state:{live:api.S.live,connection:api.S.connectionState,freshness:api.S.snapshotFreshness,integrity:api.currentDataIntegrity(),scheduleVersion:api.S.scheduleVersion,statsVersion:api.S.statsVersion,qbInputWarning:api.S.qbInputWarning},core,ratings,bridge,profiles:{},games:[],ledgerCurrent:Object.fromEntries(api.ratingLedger().map(r=>[r.team,{...r.current,residual:r.residual}]))};
for(const [t,p] of Object.entries(profiles)) input.profiles[t]={...Object.fromEntries(keys.map(k=>[k,p[k]??null])),_preseasonUnitPrior:Object.fromEntries(keys.map(k=>[k,p._preseasonUnitPrior?.[k]??null])),_live:Object.fromEntries(['games','statGames','playerStatGames','priorGames','source','passRushProvider','passRushDataState','qbDataState','freshness'].map(k=>[k,p._live?.[k]??null]))};
for(const g of api.sortedSchedule()) input.games.push({week:g.week,home:g.home,away:g.away,date:g.date,time:g.time,homeScore:g.homeScore,awayScore:g.awayScore,status:g.status,divisional:g.divisional,gameKey:api.gameKey(g),_researchMarket:api.F.marketProbability(g)});
input.capture.liveGameAudit={basis:'existing schedule scores/status and Eastern kickoff conversion; not an in-game feed',unscoredStarted:input.games.filter(g=>g.homeScore==null&&api.scheduleKickoffInstant(g.date,g.time)?.getTime()<=Date.parse(capture.capturedAt)).map(g=>g.gameKey),completedGames:input.games.filter(g=>g.homeScore!=null).length};
input.reference=outputs(api); // exact existing production functions, including 25,000/5,000-run simulations
const dest=path.resolve('research/cycle8/md05_bridge_materiality/inputs/snapshot.json');
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify({normalizedInputSHA256:hash(fs.readFileSync(dest)),teams:Object.keys(core).length,games:input.games.length,projectableGames:input.reference.games.length,liveGameAudit:input.capture.liveGameAudit}));
