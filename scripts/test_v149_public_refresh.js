import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture} from './lib/qb_input_fixture.js';

let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const NOW=Date.parse('2026-10-01T15:00:00Z');
const builtAt=minutes=>new Date(NOW-minutes*60000).toISOString();
const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
  Array.from({length:272},()=> '2026,REG,2026-10-01,4,BUF,KC,,').join('\n');
const feeds={health:JSON.stringify({product:'FORCE',app_version:'V149'}),schedule,
  teamStats:'season,week,team\n2026,1,BUF',playerStats:'season,week,team\n2026,1,BUF',currentPressure:'{}',gameFlow2026:JSON.stringify(gameFlowFixture())};
const feedKeys={'/api/health':'health','/api/schedule':'schedule','/api/team-stats':'teamStats','/api/player-stats':'playerStats','/api/current-pressure':'currentPressure','/api/game-flow-2026':'gameFlow2026'};
const snapshot=(minutes=30,generation='one')=>({ok:true,generation,builtAt:builtAt(minutes),feeds});

function dom() {
  const nodes=Object.fromEntries(['app','refreshData','refreshMeta','checkLatestSnapshot','updateAllTeams','updateStaleTeams','collectDiagnostics'].map(id=>[id,{innerHTML:'',textContent:'',disabled:false}]));
  const team={dataset:{updateTeam:'BUF'}};
  const save={dataset:{savePressure:'BUF'}};
  const document={getElementById:id=>nodes[id]||null,querySelector:()=>null,
    querySelectorAll:selector=>selector==='[data-update-team]'?[team]:selector==='[data-save-pressure]'?[save]:[],addEventListener(){}};
  return {nodes,team,save,document};
}

// Execute the real bound click handlers and real page renderer in a browser VM.
for (const hostname of ['forceratings.com','localhost','127.0.0.1','::1']) {
  const ui=dom(),requests=[];
  let published=snapshot();
  const fetch=async url=>{
    requests.push(url);
    if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(published));
    return new Response(feeds[feedKeys[url.split('?')[0]]] || 'season,week\n');
  };
  const {api}=appHarness({hostname,document:ui.document,fetch,now:NOW,hooks:'bind,updateCenter,manualPressureEditor,saveManualPressure,refreshText,refreshFromUi'});
  api.bind();
  const local=hostname!=='forceratings.com';
  const html=api.updateCenter();
  ok(html.includes('id="updateAllTeams"')===local,'all-team control is local-only');
  ok(html.includes('id="updateStaleTeams"')===local,'stale-team control is local-only');
  ok(html.includes('data-update-team=')===local,'per-team controls are local-only');
  ok(html.includes('id="checkLatestSnapshot"')===!local,'public action has an honest snapshot label');
  ok(html.includes('update-metric-list') && html.includes('need attention'),'read-only freshness remains visible');
  await ui.nodes.refreshData.onclick();
  ok(requests.some(url=>url.includes('force_refresh='))===local,'Refresh forces only on localhost');
  ok(requests.every(url=>local || url.startsWith('/api/bootstrap?')),'public Refresh only checks snapshot');
  if(!local) {
    ok(!ui.nodes.updateAllTeams.onclick && !ui.nodes.updateStaleTeams.onclick && !ui.team.onclick && !ui.save.onclick,'public cannot bind legacy rebuild/write actions');
    const version=api.S.scheduleVersion;
    requests.length=0;
    await ui.nodes.checkLatestSnapshot.onclick();
    ok(requests.length===1 && requests[0].startsWith('/api/bootstrap?'),'public Update Center only reads snapshot');
    ok(api.S.scheduleVersion===version && api.refreshText().includes('already current'),'unchanged generation retains state and gives feedback');
    published=snapshot(20,'two');
    await ui.nodes.refreshData.onclick();
    ok(api.S.snapshotGeneration==='two' && api.S.scheduleVersion===version+1,'new generation is applied');
    published=snapshot(75,'stale');
    await ui.nodes.refreshData.onclick();
    ok(api.S.snapshotFreshness.stale && api.S.statsWarning.includes('Stale data:'),'stale snapshot retains age warning');
    await api.saveManualPressure('BUF',ui.save);
    ok(requests.every(url=>url.startsWith('/api/bootstrap?')),'public manual save cannot request POST');
    ok(api.manualPressureEditor('BUF',{games:1,items:[{key:'passRush',current:false}]})==='','public pressure editor remains unavailable');
    requests.length=0;
    // Even a stale cached DOM element/function cannot force public upstreams.
    for(const [reason,teams] of [['update-all',null],['update-stale',['BUF']],['update-BUF',['BUF']]])await api.refreshFromUi(reason,teams);
    ok(requests.length===3 && requests.every(url=>url.startsWith('/api/bootstrap?')),'all legacy action scopes safely recheck published data');
  } else {
    ok(typeof ui.nodes.updateAllTeams.onclick==='function' && typeof ui.nodes.updateStaleTeams.onclick==='function' && typeof ui.team.onclick==='function','local full update controls bound');
    requests.length=0;await ui.nodes.updateAllTeams.onclick();
    ok(requests.filter(url=>url.includes('force_refresh=')).length===8,'local all-team refresh still forces eight feeds');
    requests.length=0;await ui.team.onclick();
    ok(requests.filter(url=>url.includes('force_refresh=')).length===8 && api.S.lastUpdateScope.teams[0]==='BUF','local per-team refresh and logging preserved');
    api.S.schedule[0].homeScore=20;api.S.schedule[0].awayScore=10;
    requests.length=0;await ui.nodes.updateStaleTeams.onclick();
    ok(requests.filter(url=>url.includes('force_refresh=')).length===8 && api.S.lastUpdateScope.teams.includes('KC'),'local stale-team refresh still forces feeds for attention targets');
    if(hostname!=='::1')ok(api.manualPressureEditor('BUF',{games:1,items:[{key:'passRush',current:false}]}).includes('data-save-pressure="BUF"'),'local pressure editor preserved');
    ok(typeof ui.nodes.collectDiagnostics.onclick==='function','local diagnostic collection preserved');
  }
}

// A concurrent click cannot overlap a snapshot check. No-snapshot/integrity
// recovery uses normal cached public APIs, and a failed poll retains good data.
{
  const ui=dom(),requests=[];
  let release,mode='wait';
  const gate=new Promise(resolve=>{release=resolve;});
  const fetch=async url=>{
    requests.push(url);
    if(url.startsWith('/api/bootstrap?')) {
      if(mode==='wait')await gate;
      if(mode==='outage')return new Response('unavailable',{status:503});
      if(mode==='invalid')return new Response(JSON.stringify({...snapshot(),generation:'bad',feeds:{...feeds,teamStats:''}}));
      return new Response(JSON.stringify(snapshot()));
    }
    return new Response(feeds[feedKeys[url.split('?')[0]]] || 'season,week\n');
  };
  const {api}=appHarness({document:ui.document,fetch,now:NOW,hooks:'bind,refreshText'});
  api.bind();
  const pending=ui.nodes.refreshData.onclick();
  await ui.nodes.refreshData.onclick();
  ok(requests.length===1 && ui.nodes.refreshData.disabled && api.refreshText().includes('Checking'),'concurrent public click is deduplicated with busy feedback');
  release();await pending;
  mode='outage';requests.length=0;
  await ui.nodes.refreshData.onclick();
  ok(requests.length===1 && api.S.live && api.S.snapshotGeneration==='one','failed poll retains loaded generation without live rebuild');
  const fresh=appHarness({document:dom().document,fetch,now:NOW});
  requests.length=0;await fresh.api.refreshPublishedSnapshot('manual');
  ok(fresh.api.S.live && requests.some(url=>url.startsWith('/api/team-stats')),'missing snapshot recovers through direct cached feeds');
  ok(requests.every(url=>!url.includes('force_refresh')),'public fallback never requests TTL bypass');
  mode='invalid';requests.length=0;
  const invalid=appHarness({document:dom().document,fetch,now:NOW});
  await invalid.api.refreshPublishedSnapshot('manual');
  ok(invalid.api.S.live && requests.some(url=>url.startsWith('/api/team-stats')),'integrity failure can recover through cached live feeds');
}

// Real Worker/DO methods with an offline container RPC and durable storage.
class Clock extends Date { static now(){return NOW;} }
class Storage {
  data=new Map();
  async get(key){return this.data.get(key);}
  async put(key,value){this.data.set(key,value);}
  async list({prefix}){return new Map([...this.data].filter(([key])=>key.startsWith(prefix)));}
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])this.data.delete(key);}
  async transaction(fn){return fn(this);}
}
const workerSource=fs.readFileSync('src/index.js','utf8').replace(/^\uFEFF?import[^\n]+\n/,'').replace(/export /g,'').replace('default {','const worker = {')+'\nthis.TEST={ForceContainer,worker};';
const context={Container:class {},getContainer:binding=>binding,Date:Clock,Response,Request,Headers,URL,crypto:{randomUUID},console:{log(){},error(){}}};
vm.createContext(context);vm.runInContext(workerSource,context);
const {ForceContainer,worker}=context.TEST;
const force=new ForceContainer();force.ctx={storage:new Storage()};
const rpc=[];
force.containerFetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url);
  rpc.push(input);
  const path=url.pathname.replace('/__force_internal/bootstrap','');
  return new Response(feeds[feedKeys[path]]||'season,week\n');
};
const env={FORCE_CONTAINER:force,ASSETS:{fetch:async()=>new Response('static browser app')}};
const background=[];
const ctx={waitUntil:promise=>background.push(promise)};
for(const path of ['/api/__force_internal/bootstrap/api/team-stats','/api/team-stats%2f..%2f__force_internal/bootstrap/api/team-stats','/api/diagnostics','/api/penalty-debug','/api/penalty-scale-debug','/api/current-pressure/manual','/__force_internal/bootstrap/api/team-stats']) {
  const response=await worker.fetch(new Request('https://forceratings.com'+path,{headers:{'x-force-bootstrap':'1'}}),env,ctx);
  ok(response.status===404 && rpc.length===0,'Worker cannot forward internal/diagnostic/unknown path '+path);
}
for(const path of ['/api/bootstrap','/api/current-pressure/manual','/api/team-stats']) {
  ok((await worker.fetch(new Request('https://forceratings.com'+path,{method:'POST'}),env,ctx)).status===403 && rpc.length===0,'Worker public POST blocked '+path);
}
const reply=await worker.fetch(new Request('https://forceratings.com/api/team-stats?force_refresh=123&ts=1',{headers:{'x-force-bootstrap':'1'}}),env,ctx);
ok(reply.status===200 && !rpc[0].url.includes('force_refresh') && !rpc[0].headers.has('x-force-bootstrap'),'public DO fetch strips force query and spoofable header');
ok((await force.fetch(new Request('https://forceratings.com/__force_internal/bootstrap/api/team-stats'))).status===404,'DO public fetch also blocks internal route');
rpc.length=0;
await worker.scheduled({cron:'*/30 * * * *'},env,ctx);await Promise.all(background.splice(0));
ok(rpc.length===9 && rpc.every(input=>typeof input==='string' && new URL(input).pathname.startsWith('/__force_internal/bootstrap/api/')),'cron uses internal RPC for all nine feeds');
ok((await force.getBootstrapSnapshot()).feeds.teamStats===feeds.teamStats,'internal builder publishes canonical feeds');
rpc.length=0;
ok((await worker.fetch(new Request('https://forceratings.com/api/bootstrap?force_refresh=123'),env,ctx)).status===200 && rpc.length===0,'force query cannot rebuild a current snapshot');
// Missing/old state recovery is single-flight and persisted across DO recreation.
const storage=new Storage();
const recovery=new ForceContainer();recovery.ctx={storage};
let attempts=0;
recovery.containerFetch=async()=>{attempts++;return new Response('outage',{status:502});};
await assert.rejects(recovery.refreshBootstrapSnapshot('cache-miss'));checks++;
const failedAttempts=attempts;
await recovery.refreshBootstrapSnapshot('stale-read');
ok(attempts===failedAttempts,'repeated missing/stale reads honor recovery cooldown after failure');
const recreated=new ForceContainer();recreated.ctx={storage};recreated.containerFetch=recovery.containerFetch;
await recreated.refreshBootstrapSnapshot('cache-miss');
ok(attempts===failedAttempts,'recovery cooldown survives DO recreation');
await assert.rejects(recreated.refreshBootstrapSnapshot('cron:*/30 * * * *'));checks++;
ok(attempts>failedAttempts,'scheduled cron can force despite recovery cooldown');
storage.data.set('force:bootstrap:recovery-attempt',NOW-5*60000);
await assert.rejects(recreated.refreshBootstrapSnapshot('cache-miss'));checks++;
ok(attempts>failedAttempts+4,'controlled recovery resumes after five minutes');
console.log(`PASS: V149 public refresh UI/Worker (${checks} checks)`);
