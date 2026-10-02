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
const reset=S=>Object.assign(S,{statsWarning:null,statsError:null,refreshError:null,qbInputWarning:null,snapshotFreshness:null,refreshing:false,lastRefreshAt:Date.now()});
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
ok(/last good data, from 150 minutes ago\. Fresh data is delayed\./.test(banner(states[3])) && !banner(states[3]).includes('Some inputs are delayed'),'stale-only snapshot says last good data is shown and freshness is degraded');
ok(!/loading|loads/i.test(banner(states[3])),'stale banner does not claim data is loading when no refresh is running');
ok(banner({...states[3],refreshing:true}).includes('Fresh data is loading.'),'loading is claimed only while a refresh is running');
ok(banner(states[4]).includes('last good data') && banner(states[4]).includes('Some inputs are delayed'),'stale plus delayed reports both');
ok(banner(states[5]).includes('could not refresh') && banner(states[5]).includes('keeps using the last good data') && banner(states[5]).includes('leaves out anything'),'metric failure distinguishes retained data from left-out values');
ok(!/stay hidden until/.test(banner(states[5])),'metric failure no longer claims every affected value is hidden');
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
// Cross-review correction: the offense sentence must name every ingredient of the
// active (V102) offense composite, read from the live model rather than hard-coded.
const {L}=appHarness();
const offenseSentence=methodSource.match(/<b>Offense:<\/b>([^<]*)/)?.[1] || '';
const offensePhrases={pointsScoredPerDriveIndex:'scoring efficiency',qbIndex:'quarterback play',rbIndex:'running backs',receiverIndex:'receivers',olIndex:'offensive line'};
const offenseKeys=Object.keys(L.OFFENSE_WEIGHTS);
ok(offenseKeys.length===5 && offenseKeys.every(key=>offensePhrases[key]),'active offense composite ingredients are all mapped');
for (const key of offenseKeys) ok(offenseSentence.includes(offensePhrases[key]),`Method offense sentence names ${offensePhrases[key]}`);
const topOffense=offenseKeys.reduce((a,b)=>L.OFFENSE_WEIGHTS[a]>=L.OFFENSE_WEIGHTS[b]?a:b);
ok(topOffense==='qbIndex' && offenseSentence.includes('quarterback play carrying the most weight'),'"most weight" claim matches the active weights');
const defenseSentence=methodSource.match(/<b>Defense:<\/b>([^<]*)/)?.[1] || '';
const defensePhrases={coverageIndex:'coverage',passRushIndex:'pass rush',runDefenseIndex:'run defense',pointsAllowedPerDriveIndex:'points allowed per drive'};
for (const key of Object.keys(L.DEFENSE_WEIGHTS)) ok(defenseSentence.includes(defensePhrases[key]),`Method defense sentence names ${defensePhrases[key]}`);
ok(!/\bfour extra\b|\d+ extra adjustments/.test(methodSource),'non-double-counting note asserts no fixed ingredient count');
ok(/not extra adjustments piled on top of the final FORCE Score/.test(methodSource),'non-double-counting explanation is preserved');
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

// Cross-review corrections: drive real public transitions through the bootstrap
// and refresh code rather than setting the final banner state by hand.
{
  const NOW=Date.parse('2026-10-01T15:00:00Z');
  const age=minutes=>new Date(NOW-minutes*60000).toISOString();
  const game={game_id:'2026_01_KC_BUF',week:1,home:'BUF',away:'KC',
    home_offensive_drives:10,away_offensive_drives:10,home_offensive_points:20,away_offensive_points:17,
    home_qb_total_epa:4,home_qb_plays:22,away_qb_total_epa:2,away_qb_plays:22,
    home_coverage_pass_attempts:20,away_coverage_pass_attempts:20,home_coverage_pass_epa:4,away_coverage_pass_epa:2,
    home_coverage_pass_successes:10,away_coverage_pass_successes:10,home_pass_yards:150,away_pass_yards:150};
  const flow=gameFlowFixture({defensive_drive_games:[game]});
  const schedule='season,game_type,gameday,week,away_team,home_team,away_score,home_score\n'+
    ['2026,REG,2026-09-13,1,KC,BUF,17,20',...Array.from({length:271},()=> '2026,REG,2026-10-01,4,KC,BUF,,')].join('\n');
  const feeds={health:JSON.stringify({product:'FORCE',app_version:'V149'}),schedule,
    teamStats:'season,week,game_id,team,opponent_team,attempts,passing_epa,carries,rushing_epa\n2026,1,2026_01_KC_BUF,BUF,KC,20,4,5,0\n2026,1,2026_01_KC_BUF,KC,BUF,20,2,5,0',
    playerStats:'season,week,game_id,team,opponent_team,position,player_display_name,attempts,passing_yards,passing_tds,passing_cpoe\n2026,1,2026_01_KC_BUF,BUF,KC,QB,Josh Allen,20,150,1,0\n2026,1,2026_01_KC_BUF,KC,BUF,QB,Patrick Mahomes,20,150,1,0',
    pfrPassPrior:'season,team,pressure_rate\n2025,BUF,0.31\n2025,KC,0.27',currentPressure:'{}',gameFlow2026:JSON.stringify(flow)};
  const paths={'/api/health':'health','/api/schedule':'schedule','/api/team-stats':'teamStats','/api/player-stats':'playerStats','/api/pfr-pass-prior':'pfrPassPrior','/api/current-pressure':'currentPressure','/api/game-flow-2026':'gameFlow2026'};
  const snapshot=(minutes,generation)=>({ok:true,generation,builtAt:age(minutes),feeds});
  const visibleBanner=api=>visibleText(api.dataStatusBanners());

  // 1. Retained-input partial failure: a fresh snapshot supplies the pressure
  // benchmark; once that snapshot ages past the live-refresh line, the direct
  // refresh succeeds except for the benchmark feed, which keeps its last good rows.
  {
    let now=NOW, benchmarkDown=false;
    const fetch=async url=>{
      if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(snapshot(30,'one')));
      if(benchmarkDown && url.startsWith('/api/pfr-pass-prior'))throw new Error('upstream pfr-advanced HTTP 502');
      return new Response(feeds[paths[url.split('?')[0]]]||'season,week\n');
    };
    const {api}=appHarness({fetch,now:()=>now,hooks:'dataStatusBanners'});
    now+=3000; await api.initialCanonicalBootstrap();
    const retained=api.S.priorPfrPassStats;
    const before=api.currentRatings().BUF;
    ok(api.S.live && !api.S.statsError && Array.isArray(retained) && retained.length===2,'fresh snapshot supplies the pressure benchmark');
    benchmarkDown=true; now+=100*60000;
    await api.fetchBootstrapSnapshot('snapshot-poll');
    ok(api.S.live && api.S.snapshotFreshness===null && api.S.statsError?.includes('pressure benchmark unavailable'),'direct refresh completes with a partial metric failure');
    ok(api.S.priorPfrPassStats===retained,'failed input keeps its previous good rows (retention unchanged)');
    const after=api.currentRatings().BUF;
    ok(Number.isFinite(before) && Number.isFinite(after) && after!==0,'ratings keep rendering from retained data, never zero-filled');
    const text=visibleBanner(api);
    ok(text.includes('Some current stats could not refresh. FORCE keeps using the last good data it has'),'public banner says retained data is still in use');
    ok(!/stay hidden|pfr|502|benchmark|upstream/i.test(text),'public banner hides raw provider/error detail');
  }

  // 2. Failed refresh then retry backoff: nothing is loading, so the stale banner
  // must not say fresh data is loading, while still giving the last-good age.
  {
    let now=NOW;
    const fetch=async url=>{
      if(url.startsWith('/api/bootstrap?'))return new Response(JSON.stringify(snapshot(150,'stale')));
      throw new Error('live outage');
    };
    const {api}=appHarness({fetch,now:()=>now,hooks:'dataStatusBanners'});
    await api.fetchBootstrapSnapshot('initial');
    ok(api.S.staleLiveFailure?.generation==='stale' && api.S.snapshotFreshness?.stale && !api.S.refreshing,'failed direct refresh leaves the stale last-good snapshot');
    now+=5*60000;
    await api.refreshPublishedSnapshot('snapshot-poll');
    ok(api.S.staleLiveFailure?.generation==='stale' && !api.S.refreshing,'retry is suppressed by backoff');
    const text=visibleBanner(api);
    ok(/FORCE is showing the last good data, from \d+ minutes ago\. Fresh data is delayed\./.test(text),'banner gives last-good age and degraded freshness');
    ok(!/loading|loads/i.test(text),'banner does not claim fresh data is loading during backoff');
    ok(!/outage|snapshot\b|bootstrap/i.test(text),'banner hides raw refresh detail');
  }
}

console.log(`OK: UX-14 approved public explanation removals (${checks} checks).`);
