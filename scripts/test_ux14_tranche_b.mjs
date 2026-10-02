import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';

// UX-14 content tranche B: owner-approved, non-gated SIMPLIFY PUBLIC groups
// (Luck weights, pass-rush provider cascade, current-season/preseason blend
// percentages, public simulation wording) and the C1 duplicate FLAG notes.
// Rendered through the real live-profile, rankings, team, matchup, projection
// and Method paths. Gated rows (UX-08, UX-18, UX-19) must stay untouched.
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const visibleText=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const titles=html=>[...html.matchAll(/title="([^"]*)"/g)].map(m=>m[1]).join(' || ');
const hooks='teamDiagnosticPanel,diagnosticNotice,flagIntroPanel,penaltyImpactSortControl,passRushRateLabel,rawUnitCell,liveProfileStatus,contextCard,model,playoffPicturePage';
const providerNames=/FTN|StatRankings|Pro Football Reference|\bPFR\b|nflverse|curated current override|manually verified/;
// Luck-specific weight phrasing only: other cards legitimately show market shares.
const luckWeights=/60% of the score|\b(60|20|15|5)% (EPA|FLAG|fumble)|FLAG contributes|fumble recoveries 15|wins and losses 5%|Sixty percent|EPA scoring realization|outcome surprise/;

function harness(hostname) {
  const input=projectionSemanticsFixture();
  const h=appHarness({hooks,hostname});
  Object.assign(h.api.S,{liveTeamStats:input.teamRows,livePlayerStats:input.playerRows,
    liveGameFlow2026:input.gameFlow,schedule:input.schedule,statsVersion:1,scheduleVersion:1});
  return {...h,input};
}
const {api,input}=harness('forceratings.com');
const local=harness('localhost').api;
const ratings=JSON.stringify(api.currentRatings());
const liveTeam=Object.keys(api.liveProfiles()).find(t=>api.liveProfiles()[t]?._live?.games>0);
ok(liveTeam,'fixture yields a team with current-season games');

// Group 1: Luck explains the idea without its weights, everywhere it is public.
api.S.ratingView='luck';
const luckNotice=visibleText(api.diagnosticNotice('luck'));
ok(!luckWeights.test(luckNotice),`Luck notice drops weights: ${luckNotice}`);
ok(/play-by-play efficiency/.test(luckNotice) && /penalty impact \(FLAG\), fumble recoveries, and unusually fortunate or unfortunate wins and losses/.test(luckNotice),'Luck notice keeps every ingredient as a concept');
ok(/A great team can still look unlucky/.test(luckNotice),'Luck notice keeps the "great team can look unlucky" idea');
ok(!luckWeights.test(visibleText(api.rankings())),'Luck rankings view has no weights');
const panel=view=>{api.S.ratingView=view;return visibleText(api.teamDiagnosticPanel(liveTeam,api.currentRatings()[liveTeam],{},{}));};
ok(!luckWeights.test(panel('luck')),'Luck team panel has no weights');
const context=visibleText(api.contextCard(liveTeam));
ok(!luckWeights.test(context) && /expected wins/.test(context) && /50 neutral/.test(context),`matchup Luck context keeps record/expected wins without weights: ${context}`);
const method=api.model();
const luckMethod=visibleText(method.slice(method.indexOf('<h2>Luck</h2>'),method.indexOf('<h2>QB return correction</h2>')));
ok(luckMethod.length>40 && !luckWeights.test(luckMethod),'Method Luck section drops weights');
ok(/Most of it compares actual scoring margin/.test(luckMethod) && /fumble recoveries/.test(luckMethod),'Method Luck section keeps the concepts');
const L=api.liveProfiles();
ok(L[liveTeam]?.luck,'Luck values still computed');
const app=fs.readFileSync('assets/app.js','utf8');
ok(/blend:\{epaScoringRealization:0\.60,penaltyImpact:0\.20,fumbleRecovery:0\.15,outcomeSurprise:0\.05\}/.test(app),'exact Luck weights stay available in FORCE_LUCK_DEBUG');

// Group 2: pass rush names the measure, date and limitation, never the provider.
const base=api.liveProfiles()[liveTeam];
const passRush=(provider,extra={})=>({...base,dl:{...base.dl,pressure_rate:.312,pressure_as_of:'2026-09-28',hurries:20,qb_hits:11,sacks:6,...extra.dl},
  _live:{...base._live,games:3,passRushPressureReady:true,passRushGames:3,passRushWeight:.6,passRushProvider:provider,...extra.live}});
for (const provider of ['manual-current','ftn-play-level','statrankings-current','pfr-advanced']) {
  const label=api.passRushRateLabel(passRush(provider));
  ok(label==='31.2% pressure rate in 2026 · as of 2026-09-28',`${provider} label is provider-neutral: ${label}`);
  const tip=titles(api.rawUnitCell(passRush(provider),'passRushIndex'));
  ok(!providerNames.test(tip) && /31\.2% pressure rate \| current-season pressure data \| current through 2026-09-28/.test(tip),`${provider} tooltip keeps rate and date: ${tip}`);
  ok(/this season blended with the preseason baseline/.test(tip) && !/\d+% based on this season|carried in from preseason/.test(tip),'tooltip states the blend without percentages');
}
const disruption=passRush('nflverse-weekly-disruption');
ok(api.passRushRateLabel(disruption)==='31.2% disruption rate in 2026 | based on QB hits and sacks per opponent pass play · as of 2026-09-28','disruption label still says it is QB hits and sacks, not charted pressure');
const disruptionTip=titles(api.rawUnitCell(disruption,'passRushIndex'));
ok(/31\.2% disruption rate from QB hits and sacks per pass play/.test(disruptionTip) && !/% pressure rate \|/.test(disruptionTip) && !providerNames.test(disruptionTip),`disruption tooltip no longer mislabels the rate as pressure: ${disruptionTip}`);
const priorTip=titles(api.rawUnitCell(passRush('prior',{live:{games:0,passRushPressureReady:false,passRushGames:0}}),'passRushIndex'));
ok(/\| preseason baseline/.test(priorTip) && /still using the preseason baseline/.test(priorTip) && !/2025 prior/.test(priorTip),`preseason tooltip is plain: ${priorTip}`);
const missing=passRush('prior-held',{live:{passRushPressureReady:false,passRushGames:0,currentPressureReason:'external current-pressure provider stale (as_of 2026-09-01)'}});
const missingTip=titles(api.rawUnitCell(missing,'passRushIndex'));
ok(/Current pass-rush data are unavailable for this team\./.test(missingTip) && !/provider stale|as_of/.test(missingTip),`public unavailable tooltip hides the raw reason: ${missingTip}`);
ok(/rather than counting missing data as zero/.test(missingTip),'missing pressure is still never treated as zero');
ok(titles(local.rawUnitCell(missing,'passRushIndex')).includes('external current-pressure provider stale (as_of 2026-09-01)'),'localhost keeps the raw unavailable reason');
ok(/Detailed pressure data are unavailable/.test(api.passRushRateLabel(missing)),'matchup unavailable note is unchanged');
ok(/currentPressureReason/.test(app) && /passRushProvider/.test(fs.readFileSync('model/live_profiles.js','utf8')),'provider IDs and reasons remain in the live profile');

// Group 3: current-season blend is described in words, not percentages.
const status=api.liveProfileStatus(liveTeam);
const games=api.liveProfiles()[liveTeam]._live.games;
ok(status.startsWith(`${games} game${games===1?'':'s'} from 2026, blended with the preseason baseline`) && !/%/.test(status),`blend status is plain: ${status}`);
const advanced=panel('advanced');
ok(advanced.includes(`${status}.`) && !/current-season evidence|gently steadied/.test(advanced),'team Advanced efficiency sub reuses the plain status once');
const earlyMethod=visibleText(method.slice(method.indexOf('<h2>How new games change unit ratings</h2>'),method.indexOf('<h2>How unit ratings reach the team rating</h2>')));
ok(/blends current-season evidence with the preseason baseline, and the current season counts for more with every game played/.test(earlyMethod),'Method describes the early-season blend conceptually');
ok(!/half|two-thirds|four-fifths/.test(earlyMethod),'Method drops the blend fractions');
ok(/trust the new evidence somewhat faster/.test(earlyMethod) && /does not treat missing pressure data as zero/.test(earlyMethod),'Method keeps acceleration and missing-data limitations');
ok(/weight:statGames\/\(statGames\+teamPriorGames\)/.test(fs.readFileSync('model/live_profiles.js','utf8')),'blend weight still grows with games played (copy matches model)');

// Group 5: simulations are "thousands", distinctions and uncertainty survive.
const playoffs=visibleText(api.playoffPicturePage());
ok(!/Monte Carlo/.test(playoffs) && /one representative simulated season/.test(playoffs),'Playoffs note drops "Monte Carlo"');
ok(/The playoff, division, and bye percentages use every simulation/.test(playoffs) && /simulated seasons/.test(playoffs),'representative season and marginal odds stay distinct');
ok(!/Monte Carlo/.test(app.slice(app.indexOf('function divisionsPage'),app.indexOf('function playoffPicturePage'))),'Divisions page has no "Monte Carlo"');
const game=input.schedule.find(g=>g.homeScore==null);
const matchup=visibleText(api.matchupPage(game));
ok(/thousands of drive-by-drive game simulations/.test(matchup) && !/25,000|possession-level/.test(matchup),'matchup score note uses plain simulation language');
ok(/Treat the exact score as less certain than the line or win probability/.test(matchup),'score uncertainty sentence is preserved');
ok(!providerNames.test(matchup) && !/% current-season evidence/.test(matchup),'matchup duel notes carry no provider names or blend percentages');

// C1: the rankings FLAG view says "0 to 100, 50 neutral" once; team pages keep the full note.
api.S.ratingView='penalties';
const flagRankings=visibleText(api.rankings());
ok((flagRankings.match(/50 neutral|50 is neutral|A 50 is neutral/g)||[]).length===1,`rankings FLAG view defines neutral once: ${(flagRankings.match(/[^.]*neutral[^.]*/g)||[]).join(' / ')}`);
ok(/FLAG Swing label only when/.test(flagRankings) && /not whether a call was right or wrong/.test(flagRankings),'rankings FLAG view keeps the Swing rule and the call-correctness limitation');
ok(/Higher scores mean the penalties actually called helped that team more/.test(flagRankings),'sort hint keeps the direction');
const flagTeam=visibleText(api.teamPage(liveTeam));
ok(/A 50 is neutral/.test(flagTeam) && /does not decide whether a call was correct/.test(flagTeam) && /FLAG Swing label only when/.test(flagTeam),'team FLAG view keeps the full definition (no intro panel there)');

// Public copy introduced here uses no em dash; gated rows are untouched.
for (const [label,text] of [['luck',luckNotice],['status',status],['playoffs',playoffs],['matchup score',matchup.match(/The predicted score comes from[^.]*\./)?.[0]||''],['flag',flagRankings]]) ok(!/—/.test(text),`${label} copy has no em dash`);
ok(/The market supplies 75% of the Week 1 prediction/.test(method) && /25,000 possession-level simulations centered on that FORCEcast expectation/.test(method),'Method FORCEcast/market row is untouched pending UX-18');
ok(/1\.20x expansion/.test(app) && /Use auto QB fix|carryover correction/.test(app) && /<th>QB return<\/th>/.test(app),'QB Rankings (UX-08) and QB-return (UX-19) surfaces are untouched');
ok(/manual what-if available on team pages/.test(method),'D10/UX-19 Method status clause is untouched');
ok(JSON.stringify(api.currentRatings())===ratings,'rendering changes no FORCE rating');
ok(app===fs.readFileSync('public/assets/app.js','utf8'),'public app mirror matches canonical source');
console.log(`PASS: UX-14 content tranche B public copy (${checks} checks)`);
