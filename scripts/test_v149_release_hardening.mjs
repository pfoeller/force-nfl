import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture,qbReference} from './lib/qb_input_fixture.js';

let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const NOW=Date.parse('2026-10-01T15:00:00Z');
const age=minutes=>new Date(NOW-minutes*60000).toISOString();
const game={game_id:'2026_01_KC_BUF',week:1,home:'BUF',away:'KC',
  home_offensive_drives:10,away_offensive_drives:10,home_offensive_points:20,away_offensive_points:17,
  home_qb_total_epa:4,home_qb_plays:22,away_qb_total_epa:2,away_qb_plays:22,
  home_coverage_pass_attempts:20,away_coverage_pass_attempts:20,home_coverage_pass_epa:4,away_coverage_pass_epa:2,
  home_coverage_pass_successes:10,away_coverage_pass_successes:10,home_pass_yards:150,away_pass_yards:150};
const flow=gameFlowFixture({defensive_drive_games:[game]});
const oldFlow={...flow};delete oldFlow.qb_epa_definition;
const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
  ['2026,REG,2026-09-13,1,KC,BUF,17,20',...Array.from({length:271},()=> '2026,REG,2026-10-01,4,KC,BUF,,')].join('\n');
const teamStats='season,week,game_id,team,opponent_team,attempts,passing_epa,carries,rushing_epa\n2026,1,2026_01_KC_BUF,BUF,KC,20,4,5,0\n2026,1,2026_01_KC_BUF,KC,BUF,20,2,5,0';
const playerStats='season,week,game_id,team,opponent_team,position,player_display_name,attempts,passing_yards,passing_tds,passing_cpoe\n2026,1,2026_01_KC_BUF,BUF,KC,QB,Josh Allen,20,150,1,0\n2026,1,2026_01_KC_BUF,KC,BUF,QB,Patrick Mahomes,20,150,1,0';
const feeds={health:JSON.stringify({product:'FORCE',app_version:'V149'}),schedule,teamStats,playerStats,currentPressure:'{}',gameFlow2026:JSON.stringify(flow)};
const paths={'/api/health':'health','/api/schedule':'schedule','/api/team-stats':'teamStats','/api/player-stats':'playerStats','/api/current-pressure':'currentPressure','/api/game-flow-2026':'gameFlow2026'};
const snapshot=(minutes=30,generation='one',gameFlow=flow)=>({ok:true,generation,builtAt:age(minutes),feeds:{...feeds,gameFlow2026:JSON.stringify(gameFlow)}});

const {L}=appHarness();
ok(L.gameFlowQbStatus(flow).ready && L.qbReferenceValid(qbReference),'seed and new schema validate in browser');
for(const bad of [oldFlow,{...flow,qb_epa_definition:'pass-only'},{...flow,v104_reference:{...qbReference,qb_id_source:null}},{...flow,defensive_drive_games:[{...game,home_qb_plays:undefined}]}]) {
  ok(!L.gameFlowQbStatus(bad).ready,'browser rejects absent/wrong schema, provenance, or fields');
}

// Startup keeps non-QB availability and never labels a prior as current QB.
for(const [candidate,expectedReady] of [[oldFlow,false],[flow,true],[{...flow,qb_epa_definition:'wrong'},false]]) {
  let now=NOW;const requests=[];
  const {api}=appHarness({now:()=>now,fetch:async url=>{requests.push(url);return new Response(JSON.stringify(snapshot(30,'startup',candidate)));},hooks:'qbDebug,currentDataIntegrity'});
  now+=3000;await api.initialCanonicalBootstrap();
  const profile=api.liveProfiles().BUF;
  ok(api.S.live && api.currentDataIntegrity().ready,'startup preserves non-QB site availability');
  ok(requests.length===1 && requests[0].startsWith('/api/bootstrap?'),'normal startup remains snapshot-only');
  ok(Number.isFinite(profile.qbIndex)===expectedReady,'old schema cannot become a preseason-as-live QB index');
  ok(Boolean(profile.qb.unavailable)===!expectedReady,'QB availability is explicit');
  ok(Number.isFinite(api.currentRatings().BUF),'non-QB overall FORCE remains available');
  if(!expectedReady) {
    ok(api.S.statsWarning.includes('QB input unavailable'),'old startup schema has visible warning');
    ok(api.qbDebug('BUF').unavailable && api.qbDebug('BUF').measuredQbIndex===null,'QB diagnostics cannot report neutral/prior value as live');
    ok(!Number.isFinite(api.displayProfile('KC').qbIndex),'returning-starter unit overlay cannot conceal unavailable measured QB input');
    ok(api.qbRankingsPage().includes('QB input unavailable'),'QB page carries availability warning');
  }
}
{
  const {api}=appHarness({now:NOW,hooks:'applyBootstrapSnapshot,profileBeforeWeek'});
  api.applyBootstrapSnapshot(snapshot(30,'valid'));
  const frozen=api.profileBeforeWeek('BUF',2,{preserveV101Offense:true});
  const previous=api.S.liveGameFlow2026;
  api.applyBootstrapSnapshot(snapshot(30,'old',oldFlow));
  ok(api.S.liveGameFlow2026===previous && api.S.statsWarning.includes('last known good'),'application retains valid previous QB input instead of old schema');
  ok(api.liveProfiles().BUF.qb.data_state==='last-known-good' && !api.liveProfiles().BUF._live.freshness.qb.current,'retained QB input is explicitly stale');
  const after=api.profileBeforeWeek('BUF',2,{preserveV101Offense:true});
  ok(after.qbIndex===frozen.qbIndex && after.offenseComposite===frozen.offenseComposite,'frozen Week-2 legacy QB/offense semantics remain unchanged');
}

// Deterministic per-generation retry clock; online/visibility use the same path.
{
  let now=NOW,mode='fail',generation='one';const requests=[];
  const fetch=async url=>{
    requests.push(url);
    if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(snapshot(150,generation)));
    if(mode==='fail')throw new Error('live outage');
    return new Response(feeds[paths[url.split('?')[0]]]||'season,week\n');
  };
  const {api}=appHarness({fetch,now:()=>now});
  await api.fetchBootstrapSnapshot('initial');
  ok(requests.filter(url=>url.startsWith('/api/health?')).length===1,'over-age startup makes one direct attempt');
  ok(api.S.staleLiveFailure.generation==='one' && api.S.snapshotFreshness.stale,'failed attempt records generation and preserves stale snapshot');
  requests.length=0;now+=5*60000;
  for(const reason of ['snapshot-poll','online','visibility-catchup'])await api.refreshPublishedSnapshot(reason);
  ok(requests.length===3 && requests.every(url=>url.startsWith('/api/bootstrap?')),'five-minute poll/online/visibility checks suppress live retries');
  ok(api.S.statsWarning.includes('Stale data:'),'backoff retains stale warning');
  requests.length=0;now+=25*60000;
  await api.fetchBootstrapSnapshot('snapshot-poll');
  ok(requests.some(url=>url.startsWith('/api/health?')),'30-minute boundary allows another attempt');
  requests.length=0;generation='two';
  await api.fetchBootstrapSnapshot('online');
  ok(requests.some(url=>url.startsWith('/api/health?')) && api.S.staleLiveFailure.generation==='two','new generation immediately bypasses old failure backoff');
  mode='works';generation='three';requests.length=0;
  await api.fetchBootstrapSnapshot('visibility-catchup');
  ok(api.S.staleLiveFailure===null && api.S.snapshotFreshness===null && api.S.lastRefreshAt===now,'successful canonical live recovery clears backoff');
  ok(requests.every(url=>!url.includes('force_refresh')),'over-age public retries preserve normal TTL request policy');
}

// A controlled timer proves 9-second startup cancellation and cleanup, without
// spending nine seconds in the test or leaving later state-mutating work alive.
{
  let now=NOW;const timers=new Map(),cleared=[];let timerId=0,aborts=0;
  const fetch=async(url,options)=>{
    if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(snapshot(150,'timeout')));
    return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborts++;reject(new DOMException('Aborted','AbortError'));},{once:true}));
  };
  const {api}=appHarness({fetch,now:()=>now,timers:{setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout(id){cleared.push(id);timers.delete(id);}}});
  const pending=api.initialCanonicalBootstrap();
  await new Promise(setImmediate);
  const [id,timer]=[...timers].find(([,entry])=>entry.ms===9000);
  ok(timer.ms===9000 && ![...timers.values()].some(entry=>entry.ms===60000),'public over-age fallback gets a dedicated 9-second deadline');
  now+=9000;timer.fn();await pending;
  ok(aborts===1 && cleared.includes(id) && timers.size===0,'deadline aborts pending fetch and cleans timer');
  ok(api.S.live && api.S.snapshotFreshness.stale && api.S.statsWarning.includes('Stale data:'),'timeout immediately restores last-good snapshot');
  ok(!api.S.refreshing && api.S.staleLiveFailure.generation==='timeout','timeout completes loader/control state and remembers failure');
}
{
  const timers=[];
  const {api}=appHarness({now:NOW,fetch:async()=>new Response('down',{status:503}),hostname:'localhost',timers:{setTimeout(fn,ms){timers.push(ms);return 1;},clearTimeout(){}},hooks:'refreshSchedule'});
  await api.refreshSchedule('manual');
  ok(timers.includes(60000) && !timers.includes(9000),'ordinary local manual timeout remains 60 seconds');
}
{
  let now=NOW,id=0,aborts=0;const timers=new Map(),late=[];
  const fetch=async(url,options)=>{
    if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(snapshot(150,'metrics-timeout')));
    if(url.startsWith('/api/health?') || url.startsWith('/api/schedule?'))return new Response(feeds[paths[url.split('?')[0]]]);
    return new Promise((resolve,reject)=>{
      late.push(()=>resolve(new Response('season,week,team\n2026,9,BUF')));
      options.signal.addEventListener('abort',()=>{aborts++;reject(new DOMException('Aborted','AbortError'));},{once:true});
    });
  };
  const {api}=appHarness({fetch,now:()=>now,timers:{setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(key){timers.delete(key);}}});
  const pending=api.fetchBootstrapSnapshot('initial');
  for(let i=0;i<8 && late.length<7;i++)await new Promise(setImmediate);
  ok(late.length===7,'fixture reaches concurrent metric fetches before deadline');
  now+=9000;[...timers.values()].find(timer=>timer.ms===9000).fn();await pending;
  const restored=api.S.liveTeamStats;
  for(const complete of late)complete();await new Promise(setImmediate);
  ok(aborts===7 && timers.size===0 && api.S.liveTeamStats===restored,'deadline cancels all metric fetches with no late state mutation');
  ok(api.S.snapshotFreshness.stale && api.S.livePlayerStats.length===2,'partial timed-out pull restores coherent last-good feeds');
}
{
  let now=NOW;const timers=[];
  const {api}=appHarness({now:()=>now,fetch:async()=>new Response(JSON.stringify(snapshot())),timers:{setTimeout(fn,ms){timers.push(ms);now+=ms;queueMicrotask(fn);return 1;},clearTimeout(){}}});
  await api.initialCanonicalBootstrap();
  ok(timers.includes(3000),'normal snapshot startup retains three-second branded minimum');
}

class Clock extends Date { static now(){return NOW;} }
class Storage {
  data=new Map();publications=0;
  async get(key){return this.data.get(key);}
  async put(key,value){if(key==='force:bootstrap:manifest:v1')this.publications++;this.data.set(key,value);}
  async list({prefix}){return new Map([...this.data].filter(([key])=>key.startsWith(prefix)));}
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])this.data.delete(key);}
  async transaction(fn){return fn(this);}
}
const source=fs.readFileSync('src/index.js','utf8').replace(/^\uFEFF?import[^\n]+\n/,'').replace(/export /g,'').replace('default {','const worker = {')+'\nthis.TEST={ForceContainer,worker,gameFlowQbValid};';
const sandbox={Container:class {},getContainer:binding=>binding,Date:Clock,Response,Request,Headers,URL,crypto:{randomUUID},console:{log(){},error(){}}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const {ForceContainer,worker,gameFlowQbValid}=sandbox.TEST;
ok(gameFlowQbValid(flow) && !gameFlowQbValid(oldFlow) && !gameFlowQbValid({...flow,qb_epa_definition:'wrong'}),'Worker schema gate matches browser boundary');
const responseFor=url=>new Response(feeds[paths[new URL(url).pathname.replace('/__force_internal/bootstrap','')]]||'optional csv');

// A throttled recovery check is suspended while cron arrives. Only real build
// work is shared; neither read reason can steal the cron invocation.
for(const reason of ['stale-read','cache-miss']) {
  const force=new ForceContainer(),storage=new Storage();force.ctx={storage};
  let releaseCheck,releaseBuild,calls=0;
  const checkGate=new Promise(resolve=>{releaseCheck=resolve;}),buildGate=new Promise(resolve=>{releaseBuild=resolve;});
  const originalGet=storage.get.bind(storage);
  storage.get=async key=>key==='force:bootstrap:recovery-attempt'?(await checkGate,NOW):originalGet(key);
  force.containerFetch=async url=>{calls++;await buildGate;return responseFor(url);};
  const read=force.refreshBootstrapSnapshot(reason);
  const cron=force.refreshBootstrapSnapshot('cron:*/30 * * * *');
  await new Promise(setImmediate);
  ok(calls===4,'cron starts real first batch while '+reason+' checks cooldown');
  releaseCheck();await new Promise(setImmediate);releaseBuild();
  const [a,b]=await Promise.all([read,cron]);
  ok(a.generation===b.generation && calls===9 && storage.publications===1,'cron/read share exactly one actual publication during cooldown race');
}

{
  const force=new ForceContainer();force.ctx={storage:new Storage()};force.containerFetch=responseFor;
  const first=await force.refreshBootstrapSnapshot('scheduled');
  const key=`force:bootstrap:${first.generation}:gameFlow2026:0`;
  await force.ctx.storage.put(key,JSON.stringify(oldFlow));
  force.containerFetch=async url=>new URL(url).pathname.endsWith('/api/game-flow-2026')?new Response('outage',{status:502}):responseFor(url);
  await assert.rejects(force.refreshBootstrapSnapshot('scheduled'),/retained existing stored snapshot/);checks++;
  ok((await force.getBootstrapSnapshot()).generation===first.generation,'old-schema optional fallback cannot publish a new canonical generation');
  ok(!(await force.getBootstrapSnapshot()).qbInputReady,'stored old snapshot explicitly reports unavailable QB input');
  force.containerFetch=responseFor;
  await force.ctx.storage.put('force:bootstrap:recovery-attempt',NOW);
  const background=[];
  const reply=await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:promise=>background.push(promise)});
  const old=await reply.json();
  ok(reply.status===200 && !old.qbInputReady && background.length===1,'first post-deploy read serves non-QB snapshot and initiates immediate migration despite fresh age');
  await Promise.all(background);
  const fresh=await force.getBootstrapSnapshot();
  ok(fresh.generation!==first.generation && fresh.qbInputReady && gameFlowQbValid(fresh.feeds.gameFlow2026),'trusted migration publishes new schema without waiting for cron');
  // Valid previous schema is still an acceptable optional-feed last-good fallback.
  force.containerFetch=async url=>new URL(url).pathname.endsWith('/api/game-flow-2026')?new Response('outage',{status:502}):responseFor(url);
  await force.refreshBootstrapSnapshot('scheduled');
  const retained=await force.getBootstrapSnapshot();
  ok(retained.qbInputReady && retained.warnings.some(warning=>warning.includes('retained previous snapshot')),'valid new-schema optional fallback remains available');
}
console.log(`PASS: V149 release hardening UI/Worker (${checks} checks)`);
