import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture} from './lib/qb_input_fixture.js';

// UX-14 content tranche A: owner-approved REMOVE FROM PUBLIC rows R1-R9 and the
// non-gated RESERVE FOR DEEPER rows D3, D4 and D7. Honest failure and staleness
// messages (R3-R5) must survive in plain English; internal detail stays local.
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const visibleText=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const hooks='layout,names,model,dataStatusBanners,runtimeModuleBlocked';
const internal=/feed|bootstrap|snapshot\b|nflverse|Codex|scrape|fallback|old-schema|gameFlow2026|teamStats|module|V82/i;

// R3/R4: public banner speaks plain English, localhost keeps the raw detail.
const workerWarning='teamStats refresh failed; retained previous snapshot';
const stale='Stale data: showing the last known good snapshot (150 minutes old). Live refresh is unavailable or still pending.';
const states=[
  {statsWarning:workerWarning},
  {statsWarning:'gameFlow2026 unavailable in bootstrap snapshot; QB input unavailable, old-schema fallback rejected'},
  {statsWarning:'advanced current pressure unavailable; nflverse weekly disruption fallback will be used where team stats are current · automatic current-pressure scrape failed; manual browser/Codex override is empty'},
  {statsWarning:stale,snapshotFreshness:{stale:true,ageMinutes:150}},
  {statsWarning:`${workerWarning} · ${stale}`,snapshotFreshness:{stale:true,ageMinutes:150}},
  {statsError:'player stats unavailable: HTTP 503'},
  {refreshError:'bootstrap snapshot 500: upstream exploded',lastRefreshAt:null},
  {refreshError:'bootstrap snapshot 500: upstream exploded',lastRefreshAt:Date.now()},
];
const publicApp=appHarness({hooks}).api, localApp=appHarness({hooks,hostname:'localhost'}).api;
const reset=S=>Object.assign(S,{statsWarning:null,statsError:null,refreshError:null,qbInputWarning:null,snapshotFreshness:null,lastRefreshAt:Date.now()});
for (const state of states) {
  reset(publicApp.S); Object.assign(publicApp.S,state);
  const text=visibleText(publicApp.dataStatusBanners());
  ok(text.trim().length>0,`public banner still reports ${JSON.stringify(state)}`);
  ok(!internal.test(text),`public banner hides internal wording: ${text}`);
  ok(!/Live metrics refreshed/.test(text),'public banner never prefixes a warning with "refreshed" (C4)');
  ok(!/—/.test(text),'public banner has no em dash');
  reset(localApp.S); Object.assign(localApp.S,state);
  const local=visibleText(localApp.dataStatusBanners());
  for (const raw of [state.statsWarning,state.statsError,state.lastRefreshAt?null:state.refreshError].filter(Boolean)) {
    ok(local.includes(raw.split(' · ')[0]),'localhost banner keeps raw diagnostic detail');
  }
}
const banner=state=>{reset(publicApp.S);Object.assign(publicApp.S,state);return visibleText(publicApp.dataStatusBanners());};
ok(banner(states[0]).includes('Some inputs are delayed'),'delayed inputs are disclosed');
ok(banner({statsWarning:'QB input unavailable',qbInputWarning:'QB input unavailable',liveGameFlow2026:{}}).includes('Quarterback ratings are unavailable'),'unavailable QB input is named plainly');
ok(!banner({statsWarning:'QB/game-flow refresh failed; retaining last known good input',qbInputWarning:'QB/game-flow refresh failed; retaining last known good input',liveGameFlow2026:gameFlowFixture()}).includes('Quarterback ratings are unavailable'),'retained QB input is not called unavailable');
ok(/last good data, from 150 minutes ago/.test(banner(states[3])) && !banner(states[3]).includes('delayed'),'stale-only snapshot says last good data is shown');
ok(banner(states[4]).includes('last good data') && banner(states[4]).includes('delayed'),'stale plus delayed reports both');
ok(banner(states[5]).includes('could not load'),'metric failure stays visible');
ok(banner(states[6]).includes('FORCE did not load completely. Please reload'),'initial failure asks for a reload');
ok(banner(states[7]).includes('Refresh failed. Kept the last good data.'),'kept last-good message is unchanged');
reset(publicApp.S);
ok(publicApp.dataStatusBanners()==='','no banner when data is healthy');
ok(publicApp.S.statsWarning===null && localApp.S!==publicApp.S,'banner rendering does not mutate state');

// R5: plain reload message; module list only on localhost. C5 stale V82 text gone.
const gatePublic=visibleText(publicApp.runtimeModuleBlocked(['forecast engine','score normalizer']));
ok(gatePublic.includes('FORCE did not load completely') && gatePublic.includes('Please reload'),'runtime gate keeps a plain failure message');
ok(!/forecast engine|module|integrity gate|V82/i.test(gatePublic),'runtime gate hides module list and internal names');
ok(visibleText(localApp.runtimeModuleBlocked(['forecast engine'])).includes('forecast engine'),'localhost runtime gate keeps module list');

// R8/R9: About glossary keeps one FORCEcast entry and drops the brand guideline.
const about=publicApp.names();
ok((about.match(/<b>FORCEcast<\/b>/g)||[]).length===1,'About has a single FORCEcast glossary entry');
ok(about.includes('Single public win odds, line, and score'),'surviving FORCEcast entry is the fuller one');
ok(!/Brand principle/.test(about),'About drops the internal brand principle');

// D3/D4: Method explains unit ingredients without weights or construction detail.
const source=fs.readFileSync('assets/app.js','utf8');
const methodSource=source.slice(source.indexOf('<h2>Unit profiles</h2>'),source.indexOf('<h2>How unit ratings reach the team rating</h2>'));
ok(methodSource.length>0,'Method unit section located');
ok(!/45%|25% quarterback|36% coverage|28% run defense|16% pass rush/.test(methodSource),'Method drops offense/defense weights (D3)');
ok(methodSource.includes('quarterback play') && methodSource.includes('coverage and run defense'),'Method keeps the unit ingredients as concepts');
ok(!/Quarterback play focuses mostly on passing efficiency/.test(source),'Method drops per-unit mechanics (D4)');
ok(methodSource.includes('does not treat missing pressure data as zero'),'pass-rush limitation stays public');

// R1, R2, R6, R7, D7: source-level checks on render paths that need live data.
ok(!/<div class="sub">\$\{pen\.source/.test(source),'FLAG data status no longer prints the raw source string (R1)');
ok(/\$\{x\.games\|\|games\}\/\$\{games\} games covered/.test(source) && !/\$\{x\.provider \|\| p\?\._live\?\.passRushProvider/.test(source),'Update card shows current coverage, not provider IDs (R2)');
ok(!source.includes('Use FORCE_QB_DEBUG(team)'),'QB tooltip no longer points visitors at a console hook (R6)');
ok(source.includes('FORCE_QB_DEBUG'),'QB debug hook itself is preserved');
ok(!/'36% coverage · 16% pass rush/.test(source),'matchup defense note drops weights (R7)');
ok(!/Base snapshot \$\{fmt\(b\.elo\)\} · bridge/.test(source),'team Advanced Raw Elo drops base/bridge detail (D7)');

// Out of scope for this tranche: QB Rankings copy (UX-08 gate) and UX-18/UX-19 rows.
ok(source.includes('Recency multipliers') || source.includes('2.00x'),'QB Rankings D1/D2 copy is untouched pending UX-08');
ok(source.includes('FORCE Adaptive</b>'),'D6 glossary entry is untouched pending UX-18 coordination');
ok(source===fs.readFileSync('public/assets/app.js','utf8'),'public app mirror matches canonical source');

console.log(`OK: UX-14 approved public explanation removals (${checks} checks).`);
