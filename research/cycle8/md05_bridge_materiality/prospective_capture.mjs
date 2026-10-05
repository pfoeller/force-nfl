// Offline normalization of one existing /api/bootstrap capture; never fetches providers.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {fileURLToPath} from 'node:url';
import {hash,sourceHashes,frozenRuntime} from './runtime.mjs';
export function normalize(rawText,capture,publicHashes){
assert.equal(hash(rawText),capture.sha256,'raw capture hash');
assert.equal(Buffer.byteLength(rawText),capture.bytes,'raw byte count');
assert(/Z$/.test(capture.capturedAt)&&Number.isFinite(Date.parse(capture.capturedAt)),'UTC capture time required');
assert.equal(capture.url,'https://forceratings.com/api/bootstrap');
assert.equal(capture.status,200,'successful public capture required');
const raw=JSON.parse(rawText.replace(/^\uFEFF/,''));
assert(raw.generation && Number.isFinite(Date.parse(raw.builtAt)),'generation/build time required');
const hashes=sourceHashes();
for(const [p,h] of Object.entries(hashes)){const r=spawnSync('git',['-c',`safe.directory=${process.cwd().split(path.sep).join('/')}`,'show',`f2ce02c9f4ac7e54f22b372b6583cc878b030c45:${p}`],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(r.status,0,r.stderr);assert.equal(hash(r.stdout.replace(/\r\n/g,'\n')),h,'capture must use exact authorized base '+p);}
assert.deepEqual(publicHashes,hashes,'every ordered deployed script must match base (LF-normalized)');
const {api}=appHarness({now:Date.parse(capture.capturedAt),hooks:'applyBootstrapSnapshot,coreCurrentRatings,profile,ratingLedger,score,sortedSchedule,gameKey,seasonProjection,exactScoreProjection,projected,currentDataIntegrity,scheduleKickoffInstant,D,UFB,F'});
api.applyBootstrapSnapshot(raw,'MD05 production research capture');
const ratings=api.currentRatings(),core=api.coreCurrentRatings(),profiles=api.liveProfiles(),keys=Object.keys(api.UFB.WEIGHTS);
assert(api.S.live&&api.currentDataIntegrity().ready&&!api.S.snapshotFreshness.stale,'live/current complete snapshot required');
assert.equal(Object.keys(ratings).length,32);
assert.equal(keys.length,9);
const bridge=Object.fromEntries(Object.keys(ratings).map(t=>[t,api.unitForceBridge(t,core[t])]));
assert(Object.values(bridge).some(b=>Math.abs(b.eloDelta)>1e-9),'STOP: zero-bridge fallback');
const input={schema:1,base:'f2ce02c9f4ac7e54f22b372b6583cc878b030c45',capture,builtAt:raw.builtAt,generation:raw.generation,warnings:raw.warnings,sourceHashes:hashes,publicSourceHashes:publicHashes,runtime:process.version,meta:api.D.meta,config:{hfa:api.D.config.hfa,scale:api.D.config.scale},state:{live:api.S.live,connection:api.S.connectionState,freshness:api.S.snapshotFreshness,integrity:api.currentDataIntegrity(),scheduleVersion:api.S.scheduleVersion,statsVersion:api.S.statsVersion,qbInputWarning:api.S.qbInputWarning},core,ratings,bridge,profiles:{},games:[],ledgerCurrent:Object.fromEntries(api.ratingLedger().map(r=>[r.team,{...r.current,residual:r.residual}]))};
for(const [t,p] of Object.entries(profiles)) input.profiles[t]={...Object.fromEntries(keys.map(k=>[k,p[k]??null])),_preseasonUnitPrior:Object.fromEntries(keys.map(k=>[k,p._preseasonUnitPrior?.[k]??null])),_live:Object.fromEntries(['games','statGames','playerStatGames','priorGames','source','passRushProvider','passRushDataState','qbDataState','freshness'].map(k=>[k,p._live?.[k]??null]))};
for(const g of api.sortedSchedule()) input.games.push({week:g.week,home:g.home,away:g.away,date:g.date,time:g.time,homeScore:g.homeScore,awayScore:g.awayScore,status:g.status,divisional:g.divisional,gameKey:api.gameKey(g),_researchMarket:api.F.marketProbability(g)});
input.capture.liveGameAudit={basis:'existing schedule scores/status and Eastern kickoff conversion; not an in-game feed',unscoredStarted:input.games.filter(g=>g.homeScore==null&&api.scheduleKickoffInstant(g.date,g.time)?.getTime()<=Date.parse(capture.capturedAt)).map(g=>g.gameKey),completedGames:input.games.filter(g=>g.homeScore!=null).length};
for(const b of Object.values(bridge))for(const c of b.components)assert(Number.isFinite(c.current)&&Number.isFinite(c.prior),'all nine current/prior keys required');
assert.equal(input.capture.liveGameAudit.unscoredStarted.length,0,'capture outside an unscored started-game window');
input.referenceLite={ratings,analyticWins:Object.fromEntries(Object.keys(ratings).map(t=>[t,api.projected(t,ratings).ew])),
  games:api.sortedSchedule().filter(g=>g.homeScore==null).map(g=>({gameKey:api.gameKey(g),forecast:api.forecastFor(g,ratings)}))};
const plain=JSON.parse(JSON.stringify(input));validateCompatibility(plain);return plain;
}
export function validateCompatibility(input){
const {api}=frozenRuntime(input),plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(api.currentRatings()),input.referenceLite.ratings,'frozen prospective rating parity');
assert.deepEqual(plain(Object.fromEntries(Object.keys(input.core).map(t=>[t,api.projected(t,api.currentRatings()).ew]))),input.referenceLite.analyticWins,'prospective expected-win parity');
assert.deepEqual(plain(api.sortedSchedule().filter(g=>g.homeScore==null).map(g=>({gameKey:api.gameKey(g),forecast:api.forecastFor(g,api.currentRatings())}))),input.referenceLite.games,'prospective forecast parity');
return true;
}
// New distinct generations only. Accepted baseline and existing captures cannot be overwritten.
export function saveSnapshot(input,directory){
const accepted=JSON.parse(fs.readFileSync('research/cycle8/md05_bridge_materiality/inputs/snapshot.json','utf8'));
assert.notEqual(input.generation,accepted.generation,'accepted generation already exists; not an independent capture');
assert(/^[A-Za-z0-9-]+$/.test(input.generation),'safe generation identifier required');
const dest=path.resolve(directory);
assert(!fs.existsSync(dest),'capture directory already exists; refuse overwrite');
fs.mkdirSync(dest,{recursive:true});
const bytes=JSON.stringify(input,null,2)+'\n';
fs.writeFileSync(path.join(dest,'snapshot.json'),bytes,{flag:'wx'});
fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify({schema:1,base:input.base,capturedAt:input.capture.capturedAt,
 generation:input.generation,builtAt:input.builtAt,source:input.capture.url,rawSHA256:input.capture.sha256,
 normalizedSHA256:hash(bytes),sourceHashes:input.sourceHashes,live:input.state.live,integrity:input.state.integrity,
 boundary:'Manual prospective research capture, normalized FORCE-derived fields only; temporal independence still needs review'},null,2)+'\n',{flag:'wx'});
return hash(bytes);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const [rawPath,metaPath,publicHashesPath]=process.argv.slice(2);
assert(rawPath&&metaPath&&publicHashesPath,'usage: node prospective_capture.mjs private-bootstrap.json capture-meta.json public-source-hashes.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const input=normalize(fs.readFileSync(rawPath,'utf8'),read(metaPath),read(publicHashesPath));
const dest=path.resolve('research/cycle8/md05_bridge_materiality/inputs/persistence',input.generation);
console.log(JSON.stringify({destination:dest,normalizedSHA256:saveSnapshot(input,dest)}));
}
