import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture} from './lib/qb_input_fixture.js';

let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const NOW=Date.parse('2026-10-01T15:00:00Z');
const flow=gameFlowFixture({defensive_drive_games:[{game_id:'2026_01_KC_BUF',week:1,home:'BUF',away:'KC',home_qb_total_epa:4,home_qb_plays:22,away_qb_total_epa:2,away_qb_plays:22}]});
const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
  ['2026,REG,2026-09-13,1,KC,BUF,17,20',...Array.from({length:271},()=> '2026,REG,2026-10-01,4,KC,BUF,,')].join('\n');
const feeds={health:JSON.stringify({product:'FORCE',app_version:'V149'}),schedule,
  teamStats:'season,week,game_id,team,opponent_team,attempts,passing_epa,carries,rushing_epa\n2026,1,2026_01_KC_BUF,BUF,KC,20,4,5,0\n2026,1,2026_01_KC_BUF,KC,BUF,20,2,5,0',
  playerStats:'season,week,game_id,team,opponent_team,position,player_display_name,attempts,passing_yards,passing_tds,passing_cpoe\n2026,1,2026_01_KC_BUF,BUF,KC,QB,Josh Allen,20,150,1,0\n2026,1,2026_01_KC_BUF,KC,BUF,QB,Patrick Mahomes,20,150,1,0',
  gameFlow2026:JSON.stringify(flow),currentPressure:'{}'};
const paths={'/api/health':'health','/api/schedule':'schedule','/api/team-stats':'teamStats','/api/player-stats':'playerStats','/api/game-flow-2026':'gameFlow2026','/api/current-pressure':'currentPressure'};
const published={ok:true,generation:'published',builtAt:new Date(NOW).toISOString(),feeds};
const liveResponse=url=>new Response(feeds[paths[url.split('?')[0]]]||'season,week\n');

// Initial 503 has one short canonical recovery; a published snapshot takes over.
{
  let now=NOW,ready=false;const calls=[],timeouts=[];
  const {api}=appHarness({now:()=>now,fetch:async url=>{
    calls.push(url);return url.startsWith('/api/bootstrap?')?(ready?new Response(JSON.stringify(published)):new Response('not ready',{status:503})):liveResponse(url);
  },timers:{setTimeout(fn,ms){timeouts.push(ms);return 1;},clearTimeout(){}}});
  now+=3000;await api.initialCanonicalBootstrap();
  ok(api.S.live && api.S.lastRefreshAt===now && !api.S.refreshing,'no snapshot can recover successful canonical live state');
  ok(timeouts.includes(12000) && !timeouts.includes(60000),'missing-snapshot public recovery uses 12 seconds');
  ok(api.S.missingSnapshotFailureAt===null,'successful live fallback clears failure state');
  ok(calls.every(url=>!url.includes('force_refresh')),'missing-snapshot fallback respects public TTL authorization');
  calls.length=0;ready=true;await api.refreshPublishedSnapshot('online');
  ok(api.S.snapshotGeneration==='published' && calls.length===1,'published snapshot takes over from successful direct state');
}

// Abort all pending metric work, restore state, and bound every later entry path.
{
  let now=NOW,id=0,aborts=0,ready=false;const timers=new Map(),calls=[],late=[];
  const {api}=appHarness({now:()=>now,fetch:async(url,options)=>{
    calls.push(url);
    if(url.startsWith('/api/bootstrap?'))return ready?new Response(JSON.stringify(published)):new Response('not ready',{status:503});
    if(url.startsWith('/api/health?')||url.startsWith('/api/schedule?'))return liveResponse(url);
    return new Promise((resolve,reject)=>{
      late.push(()=>resolve(liveResponse(url)));
      options.signal.addEventListener('abort',()=>{aborts++;reject(new DOMException('Aborted','AbortError'));},{once:true});
    });
  },timers:{setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(key){timers.delete(key);}},hooks:'app'});
  const originalSchedule=api.S.schedule,originalTeamRows=api.S.liveTeamStats;
  const pending=api.initialCanonicalBootstrap();
  for(let i=0;i<10&&late.length<7;i++)await new Promise(setImmediate);
  ok(late.length===7,'initial missing-snapshot fallback reaches concurrent metric requests');
  const deadline=[...timers.values()].find(timer=>timer.ms===12000);
  ok(deadline && ![...timers.values()].some(timer=>timer.ms===60000),'public startup never starts old 60-second fallback');
  now+=12000;deadline.fn();await pending;
  ok(aborts===7 && timers.size===0 && !api.S.refreshing,'12-second timeout aborts every metric request and cleans loader controls');
  ok(!api.S.live && api.S.schedule===originalSchedule && api.S.liveTeamStats===originalTeamRows,'failed partial fallback restores original coherent state');
  ok(api.S.missingSnapshotFailureAt===now && api.S.refreshError,'failed startup records backoff and visible error');
  ok(api.S.initialRefreshDone && api.S.connectionState==='error','failed startup finishes bootstrap and permits the unavailable-data screen');
  ok(api.app.innerHTML.includes('Live data unavailable') && !api.app.innerHTML.includes('force-boot'),'timeout renders unavailable status and dismisses branded loader');
  for(const complete of late)complete();await new Promise(setImmediate);
  ok(api.S.schedule===originalSchedule && api.S.liveTeamStats===originalTeamRows,'late completions cannot mutate restored state');
  calls.length=0;
  for(const reason of ['manual','online','visibility-catchup','snapshot-poll'])await api.refreshPublishedSnapshot(reason);
  ok(calls.length===4 && calls.every(url=>url.startsWith('/api/bootstrap?')),'immediate manual/online/visibility/poll retries continue snapshot checks only');
  now+=5*60000;calls.length=0;await api.initialCanonicalBootstrap();
  ok(calls.length===1 && calls[0].startsWith('/api/bootstrap?'),'startup entry also shares five-minute retry suppression');
  now+=25*60000;calls.length=0;
  const retry=api.refreshPublishedSnapshot('snapshot-poll');
  for(let i=0;i<10&&!timers.size;i++)await new Promise(setImmediate);
  for(let i=0;i<10&&late.length<14;i++)await new Promise(setImmediate);
  ok(calls.some(url=>url.startsWith('/api/health?')),'30-minute boundary permits a new live recovery');
  now+=12000;[...timers.values()].find(timer=>timer.ms===12000).fn();await retry;
  ready=true;calls.length=0;await api.refreshPublishedSnapshot('online');
  ok(api.S.live && api.S.snapshotGeneration==='published' && calls.length===1,'new snapshot bypasses missing-snapshot backoff immediately');
  ok(api.S.missingSnapshotFailureAt===null,'valid snapshot clears missing-snapshot failure');
}

// A bad snapshot application uses the same bounded fallback as a 503.
for(const bad of [new Response('{corrupt'),new Response(JSON.stringify({...published,feeds:{...feeds,health:'{}'}}))]) {
  let now=NOW;const timeouts=[];
  const {api}=appHarness({now:()=>now,fetch:async url=>url.startsWith('/api/bootstrap?')?bad:liveResponse(url),timers:{setTimeout(fn,ms){timeouts.push(ms);return 1;},clearTimeout(){}}});
  now+=3000;await api.initialCanonicalBootstrap();
  ok(api.S.live && timeouts.includes(12000),'corrupt/unusable snapshot uses bounded canonical fallback');
}
{
  let now=NOW;const timeouts=[];const {api}=appHarness({hostname:'localhost',now:()=>now,fetch:async()=>new Response('down',{status:503}),timers:{setTimeout(fn,ms){timeouts.push(ms);return 1;},clearTimeout(){}}});
  now+=3000;await api.initialCanonicalBootstrap();
  ok(timeouts.includes(60000) && !timeouts.includes(12000) && api.S.missingSnapshotFailureAt===null,'local initial fallback retains original 60-second behavior');
}
{
  let now=NOW;const deadlines=new Map();let id=0,calls=0;
  const {api}=appHarness({now:()=>now,fetch:async(url,options)=>{calls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));},timers:{setTimeout(fn,ms){deadlines.set(++id,{fn,ms});return id;},clearTimeout(key){deadlines.delete(key);}},hooks:'recoverMissingSnapshot'});
  const first=api.recoverMissingSnapshot('one'),second=api.recoverMissingSnapshot('two');
  ok(first===second && calls===1,'concurrent no-snapshot entry paths share one direct recovery');
  now+=12000;[...deadlines.values()][0].fn();await Promise.all([first,second]);
  ok(api.S.missingSnapshotFallback===null,'failed shared recovery releases in-flight state');
}

// Actual storage reader: empty/corrupt manifest and absent required chunks all
// return 503 and request the existing trusted cache-miss recovery.
const source=fs.readFileSync('src/index.js','utf8').replace(/^\uFEFF?import[^\n]+\n/,'').replace(/export /g,'').replace('default {','const worker = {')+'\nthis.TEST={ForceContainer,worker};';
const sandbox={Container:class {},getContainer:binding=>binding,Date,Response,Request,Headers,URL,crypto:{randomUUID},console:{log(){},error(){}}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
for(const manifest of [undefined,{generation:'broken',builtAt:published.builtAt,feeds:null},{generation:'missing-chunk',builtAt:published.builtAt,feeds:{health:{chunks:1}}}]) {
  const force=new sandbox.TEST.ForceContainer();force.ctx={storage:{async get(key){return key==='force:bootstrap:manifest:v1'?manifest:undefined;},async transaction(fn){return fn(this);}}};
  const reasons=[],work=[];force.refreshBootstrapSnapshot=reason=>{reasons.push(reason);return Promise.resolve();};
  const response=await sandbox.TEST.worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:promise=>work.push(promise)});
  await Promise.all(work);
  ok(response.status===503 && reasons.length===1 && reasons[0]==='cache-miss','empty/corrupt/missing-chunk snapshot retains normal DO recovery path');
}

// Comparator receives real row structures; finite ordering is identical in
// default/custom modes, unavailable rows always follow and retain NaN.
{
  const {api}=appHarness({hooks:'compareQbRankingRows'});
  const rows=[{team:'BUF',qb:'Zed',rating:NaN,q:{unavailable:true}},
    {team:'KC',qb:'Low',rating:40,q:{}},{team:'ARI',qb:'Alpha',rating:NaN,q:{unavailable:true}},
    {team:'DET',qb:'Tie B',rating:80,q:{}},{team:'ATL',qb:'Tie A',rating:80,q:{}}];
  for(const mode of ['default','custom']) {
    api.S.qbRankingMode=mode;
    const sorted=[...rows].sort(api.compareQbRankingRows);
    ok(sorted.map(row=>row.team).join(',')==='ATL,DET,KC,ARI,BUF',mode+' sorts available ratings descending then unavailable teams');
    ok(sorted.slice(-2).every(row=>Number.isNaN(row.rating)),mode+' sorting never fabricates missing rating');
  }
  ok(api.compareQbRankingRows(rows[0],rows[2])===-api.compareQbRankingRows(rows[2],rows[0]),'unavailable comparator is antisymmetric');
}
// Exercise rendering with actual unavailable current QB profiles in both modes.
{
  const {api}=appHarness({hooks:'applyBootstrapSnapshot'});
  api.applyBootstrapSnapshot({...published,feeds:{...feeds,gameFlow2026:JSON.stringify({...flow,qb_epa_definition:'unavailable'})}});
  for(const mode of ['default','custom']) {
    api.S.qbRankingMode=mode;const page=api.qbRankingsPage();
    ok(page.includes('Unavailable') && !page.includes('NaN'),mode+' renders unavailable rating explicitly without a numeric substitute');
  }
}
console.log(`PASS: V149.1 operational UI/Worker (${checks} checks)`);
