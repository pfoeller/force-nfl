import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture} from './lib/qb_input_fixture.js';

const NOW=Date.parse('2026-10-01T15:00:00Z');
class Clock extends Date { static now(){return NOW;} }
class Storage {
  data=new Map(); failCleanup=false;
  async get(key){return this.data.get(key);}
  async put(key,value){this.data.set(key,value);}
  async list({prefix}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)));}
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])this.data.delete(key);}
  async transaction(fn){
    const before=new Map(this.data);
    try { const result=await fn(this); if(this.failCleanup)throw new Error('transaction failure'); return result; }
    catch(error){this.data=before;throw error;}
  }
}
const source=fs.readFileSync('src/index.js','utf8')
  .replace(/^\uFEFF?import[^\n]+\n/,'').replace(/export /g,'')
  .replace('default {','const worker = {')+'\nthis.TEST={ForceContainer,worker,snapshotFreshness};';
const sandbox={Container:class {},getContainer:binding=>binding,Date:Clock,Response,URL,crypto:{randomUUID},console:{log(){},error(){}}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const {ForceContainer,worker,snapshotFreshness}=sandbox.TEST;
let checks=0;
const ok=(v,msg)=>{assert.ok(v,msg);checks++;};
const age=min=>new Date(NOW-min*60000).toISOString();
for(const [minutes,status] of [[30,'current'],[75,'stale'],[150,'last-known-good']]) {
  const policy=snapshotFreshness(age(minutes),NOW);
  ok(policy.status===status,`${minutes}-minute Worker policy`);
  ok(policy.requiresLiveRefresh===(minutes>120),'direct bootstrap threshold');
}
ok(!snapshotFreshness(age(59),NOW).stale && snapshotFreshness(age(60),NOW).stale,'60-minute boundary');
ok(!snapshotFreshness(age(120),NOW).requiresLiveRefresh,'120 minutes still serves immediately');
const force=new ForceContainer();force.ctx={storage:new Storage()};
const bodies={
 '/api/health':JSON.stringify({product:'FORCE',app_version:'V149'}),
 '/api/schedule':'season\n'+'2026\n'.repeat(272),
 '/api/team-stats':'season,team\n2026,BUF', '/api/player-stats':'season,team\n2026,BUF',
 '/api/current-pressure':'{}','/api/game-flow-2026':JSON.stringify(gameFlowFixture())};
const feedPath=url=>new URL(url).pathname.replace('/__force_internal/bootstrap','');
let calls=0,release;
const gate=new Promise(resolve=>{release=resolve;});
force.containerFetch=async url=>{calls++;await gate;return new Response(bodies[feedPath(url)]||'optional csv');};
const first=force.refreshBootstrapSnapshot('cron');
const second=force.refreshBootstrapSnapshot('cache-miss');
ok(first===second,'overlapping callers share the exact promise');
await new Promise(setImmediate);
ok(calls===4,'only one first batch starts');
release();const [one,two]=await Promise.all([first,second]);
ok(one.generation===two.generation && calls===9,'one builder and one generation');
ok((await force.getBootstrapSnapshot()).feeds.teamStats===bodies['/api/team-stats'],'complete generation readable');
force.containerFetch=async()=>new Response('failed',{status:502});
await assert.rejects(force.refreshBootstrapSnapshot('failed'),/Required bootstrap/);checks++;
ok((await force.getBootstrapSnapshot()).generation===one.generation,'failed rebuild retains last-good generation');
force.containerFetch=async url=>new Response(bodies[feedPath(url)]||'optional csv');
force.ctx.storage.failCleanup=true;
await assert.rejects(force.refreshBootstrapSnapshot('storage-failure'),/transaction failure/);checks++;
force.ctx.storage.failCleanup=false;
ok((await force.getBootstrapSnapshot()).generation===one.generation,'publication/cleanup rollback retains old chunks');
// A failed staged chunk write must also leave the manifest and old bodies alone.
const originalPut=force.ctx.storage.put.bind(force.ctx.storage);
force.ctx.storage.put=async(key,value)=>{if(key.includes(':teamStats:'))throw new Error('chunk failure');return originalPut(key,value);};
await assert.rejects(force.refreshBootstrapSnapshot('chunk-failure'),/chunk failure/);checks++;
force.ctx.storage.put=originalPut;
ok((await force.getBootstrapSnapshot()).generation===one.generation,'staging failure retains prior snapshot');
force.containerFetch=async url=>feedPath(url)==='/api/ftn-charting'?new Response('failed',{status:502}):new Response(bodies[feedPath(url)]||'optional csv');
await force.refreshBootstrapSnapshot('optional-failure');
ok((await force.getBootstrapSnapshot()).feeds.ftnCharting==='optional csv','optional-feed failure retains its previous body');
force.containerFetch=async url=>new Response(bodies[feedPath(url)]||'optional csv');
const manifest=await force.bootstrapStatus();
manifest.builtAt=age(75);
const wait=[];
const response=await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:p=>wait.push(p)});
ok(response.status===200 && (await response.json()).freshness.stale,'stale read still immediately serves snapshot');
ok(wait.length===1,'stale read requests a background rebuild');await Promise.all(wait);
for(const minutes of [30,150]) {
 const stored=await force.bootstrapStatus();stored.builtAt=age(minutes);
 const background=[];
 const reply=await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:p=>background.push(p)});
 ok(reply.status===200,'fresh and over-age stored snapshots remain readable');
 ok(background.length===(minutes>=60?1:0),'only stale reads start background work');
 await Promise.all(background);
}

// Browser exercises the real direct bootstrap (including its swallowed-error path).
const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
 Array.from({length:272},()=> '2026,REG,2026-10-01,4,BUF,KC,,').join('\n');
const feeds={health:bodies['/api/health'],schedule,teamStats:'season,week,team\n2026,1,BUF',playerStats:'season,week,team\n2026,1,BUF',currentPressure:'{}',gameFlow2026:bodies['/api/game-flow-2026']};
for(const minutes of [30,75,150])for(const directWorks of minutes===150?[true,false,'missing-player']:[false]) {
 const requests=[];
 const fetch=async url=>{
  requests.push(url);
  if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify({ok:true,builtAt:age(minutes),feeds}));
  if(!directWorks || (directWorks==='missing-player' && url.startsWith('/api/player-stats')))throw new Error('live outage');
  const path=url.split('?')[0];
  return new Response(path==='/api/schedule'?schedule:path==='/api/health'?feeds.health:path==='/api/team-stats'?feeds.teamStats:path==='/api/player-stats'?feeds.playerStats:path==='/api/game-flow-2026'?feeds.gameFlow2026:path==='/api/current-pressure'?'{}':'season,week\n');
 };
 const {api}=appHarness({fetch,now:NOW});
 await api.fetchBootstrapSnapshot('test');
 ok(api.S.live,`${minutes} minutes retains a working application`);
 ok(requests.some(url=>url.startsWith('/api/health'))===(minutes>120),'only over-age snapshots attempt direct bootstrap');
 const directSucceeded=directWorks===true;
 ok(Boolean(api.S.snapshotFreshness?.stale)===(minutes>=60&&!directSucceeded),'browser stale status');
 if(minutes===150&&!directSucceeded)ok(api.S.statsWarning.includes('Stale data:') && api.connectionLabel().includes('last known good'),'clear last-good warning after live failure');
 if(minutes===150&&directSucceeded)ok(api.S.lastRefreshAt===NOW && !api.S.statsWarning?.includes('Stale data:'),'successful live bootstrap replaces old canonical state');
}
console.log(`PASS: V149 snapshot hardening (${checks} checks)`);
