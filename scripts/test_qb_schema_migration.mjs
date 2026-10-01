import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture,qbReference} from './lib/qb_input_fixture.js';

let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const marker='v149-all-play-v2',version='V149-QB-ALL-PLAY-REFERENCE-5';
const v4=JSON.parse(fs.readFileSync('data/live-cache/e0914b8c5a086741a555.bin','utf8'));
const game={game_id:'2026_01_KC_BUF',week:1,home:'BUF',away:'KC',
  home_offensive_drives:10,away_offensive_drives:10,home_offensive_points:20,away_offensive_points:17,
  home_qb_total_epa:4,home_qb_plays:20,away_qb_total_epa:2,away_qb_plays:20,
  home_coverage_pass_attempts:20,away_coverage_pass_attempts:20,home_coverage_pass_epa:4,away_coverage_pass_epa:2,
  home_coverage_pass_successes:10,away_coverage_pass_successes:10,home_pass_yards:150,away_pass_yards:150};
const currentFlow=gameFlowFixture({defensive_drive_games:[game]});
const oldFlow={...currentFlow,qb_epa_definition:'v149-all-play',v104_reference:v4};
const {L}=appHarness();
let now=Date.parse('2026-10-01T18:30:00Z');
class Clock extends Date {static now(){return now;}}
class Storage {
  data=new Map();writes=[];
  async get(key){return structuredClone(this.data.get(key));}
  async put(key,value){this.writes.push(key);this.data.set(key,structuredClone(value));}
  async list({prefix}){return new Map([...this.data].filter(([key])=>key.startsWith(prefix)));}
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])this.data.delete(key);}
  async transaction(fn){const before=new Map(this.data);try{return await fn(this);}catch(error){this.data=before;throw error;}}
}
const source=fs.readFileSync('src/index.js','utf8').replace(/^\uFEFF?import[^\n]+\n/,'').replace(/export /g,'')
  .replace('default {','const worker = {')+'\nthis.TEST={ForceContainer,worker,gameFlowQbValid};';
const sandbox={Container:class {},getContainer:binding=>binding,Date:Clock,Response,Request,Headers,URL,crypto:{randomUUID},console:{log(){},error(){}}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
const {ForceContainer,worker,gameFlowQbValid}=sandbox.TEST;
ok(qbReference.version===version && qbReference.qb_epa_definition===marker,'fixture version/semantic marker are paired');
for(const [ref,definition,accepted] of [[v4,'v149-all-play',false],[v4,marker,false],[qbReference,'v149-all-play',false],[qbReference,marker,true]]) {
  const flow={...currentFlow,v104_reference:ref,qb_epa_definition:definition};
  ok(gameFlowQbValid(flow)===accepted,'Worker paired compatibility matrix');
  ok(L.gameFlowQbStatus(flow).ready===accepted,'browser paired compatibility matrix');
}
for(const definition of [undefined,'v149-all-play']) {
  const ref={...qbReference,qb_epa_definition:definition};
  ok(!L.qbReferenceValid(ref),'reference version cannot bless old/missing semantics');
  ok(!gameFlowQbValid({...currentFlow,v104_reference:ref}),'Worker reference version cannot bless old/missing semantics');
}

const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
  ['2026,REG,2026-09-13,1,KC,BUF,17,20',...Array.from({length:271},()=> '2026,REG,2026-10-01,4,KC,BUF,,')].join('\n');
const feeds={health:JSON.stringify({product:'FORCE',app_version:'V149'}),schedule,
  teamStats:'season,week,team,opponent_team,attempts,passing_epa\n2026,1,BUF,KC,20,4\n2026,1,KC,BUF,20,2',
  playerStats:'season,week,team,opponent_team,position,player_display_name,attempts,passing_yards\n2026,1,BUF,KC,QB,Josh Allen,20,150\n2026,1,KC,BUF,QB,Patrick Mahomes,20,150',
  currentPressure:'{}',gameFlow2026:JSON.stringify(currentFlow)};
const paths={'/api/health':'health','/api/schedule':'schedule','/api/team-stats':'teamStats','/api/player-stats':'playerStats','/api/current-pressure':'currentPressure','/api/game-flow-2026':'gameFlow2026'};
const force=new ForceContainer(),storage=new Storage();force.ctx={storage};
let mode='valid',calls=0;
force.containerFetch=async url=>{
  calls++;const path=new URL(url).pathname.replace('/__force_internal/bootstrap','');
  if(path==='/api/game-flow-2026')return new Response(mode==='old'?JSON.stringify(oldFlow):mode==='outage'?'unavailable':feeds.gameFlow2026,{status:mode==='outage'?502:200});
  return new Response(feeds[paths[path]]||'optional csv');
};
const first=await force.refreshBootstrapSnapshot('fixture');
const manifestKey='force:bootstrap:manifest:v1';
const manifest=await storage.get(manifestKey);
manifest.qbEpaDefinition='v149-all-play';manifest.qbInputReady=true;manifest.builtAt=new Date(now).toISOString();
await storage.put(manifestKey,manifest);
await storage.put(`force:bootstrap:${first.generation}:gameFlow2026:0`,JSON.stringify(oldFlow));
await storage.put('force:bootstrap:recovery-attempt',now);
await storage.put('force:bootstrap:recovery-attempt:v149-all-play',now);
ok(!(await force.getBootstrapSnapshot()).qbInputReady,'old manifest readiness is recomputed from old payload');
mode='old';calls=0;
const background=[];
const reply=await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:p=>background.push(p)});
const oldSnapshot=await reply.json();
ok(reply.status===200 && oldSnapshot.generation===first.generation && !oldSnapshot.qbInputReady,'old snapshot still serves non-QB last-known-good with QB unavailable');
ok(background.length===1,'fresh-age old-schema bootstrap read triggers migration');
await Promise.all(background);
ok(calls===9,'old migration cooldown cannot suppress new migration build');
const migrationKey='force:bootstrap:recovery-attempt:v149-all-play-v2';
ok(await storage.get(migrationKey)===now,'new migration cooldown identity recorded');
ok((await force.getBootstrapSnapshot()).generation===first.generation,'invalid replacement preserves old complete snapshot');
const beforeRetry=calls,retry=[];
await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:p=>retry.push(p)});
await Promise.all(retry);
ok(calls===beforeRetry,'new migration retries remain bounded by existing cooldown');
now+=5*60*1000;mode='valid';const recovery=[];
await worker.fetch(new Request('https://forceratings.com/api/bootstrap'),{FORCE_CONTAINER:force},{waitUntil:p=>recovery.push(p)});
await Promise.all(recovery);
const fresh=await force.getBootstrapSnapshot(),published=await force.bootstrapStatus();
ok(fresh.generation!==first.generation && fresh.qbInputReady,'replacement publishes compatible snapshot');
const rebuilt=JSON.parse(fresh.feeds.gameFlow2026);
ok(published.qbEpaDefinition===marker && rebuilt.qb_epa_definition===marker && rebuilt.v104_reference.version===version && rebuilt.v104_reference.qb_epa_definition===marker,'published manifest/flow/reference paired identity');
mode='outage';await force.refreshBootstrapSnapshot('scheduled');
ok((await force.getBootstrapSnapshot()).qbInputReady,'compatible last-known-good optional fallback preserved');

const h=appHarness({hooks:'applyBootstrapSnapshot',now});
h.api.applyBootstrapSnapshot(oldSnapshot);
ok(h.api.S.live && h.api.S.qbInputWarning.includes('unavailable'),'browser preserves non-QB availability on old snapshot');
ok(!Number.isFinite(h.api.liveProfiles().BUF.qbIndex),'old snapshot cannot produce current canonical QB rating');
h.api.applyBootstrapSnapshot(fresh);
ok(Number.isFinite(h.api.liveProfiles().BUF.qbIndex),'new snapshot restores canonical QB availability');
const retained=h.api.S.liveGameFlow2026;
h.api.applyBootstrapSnapshot(oldSnapshot);
ok(h.api.S.liveGameFlow2026===retained && h.api.S.qbInputWarning.includes('last known good'),'browser retains compatible last-known-good instead of accepting old semantics');
console.log(`PASS: QB V5 semantic/schema migration (${checks} behavioral checks)`);
