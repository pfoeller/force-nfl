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
const {api,input,context:vmContext}=harness('forceratings.com');
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
const disruption=passRush('nflverse-weekly-disruption',{dl:{hurries:null}});
ok(api.passRushRateLabel(disruption)==='31.2% disruption rate in 2026 | based on QB hits and sacks per opponent pass play · as of 2026-09-28','disruption label still says it is QB hits and sacks, not charted pressure');
const disruptionTip=titles(api.rawUnitCell(disruption,'passRushIndex'));
ok(/31\.2% disruption rate from QB hits and sacks per pass play/.test(disruptionTip) && !/% pressure rate \|/.test(disruptionTip) && !providerNames.test(disruptionTip),`disruption tooltip no longer mislabels the rate as pressure: ${disruptionTip}`);
// Correction F1: the whole fallback explanation, not just its label, avoids
// pressure/hurry language the hits-and-sacks feed cannot observe.
ok(disruptionTip==='Pass rush: 31.2% disruption rate from QB hits and sacks per pass play | current through 2026-09-28 | 11 hits · 6 sacks | this season blended with the preseason baseline. Detailed pressure data are not available yet, so FORCE starts with how often QB hits and sacks happen per pass play and gives extra credit for each hit and sack.',`full fallback tooltip: ${disruptionTip}`);
ok(!/pressure rate|a pressure becomes|hurr/i.test(disruptionTip),'fallback tooltip never claims a pressure rate, pressures or hurries');
for (const provider of ['manual-current','ftn-play-level','statrankings-current','pfr-advanced']) {
  ok(titles(api.rawUnitCell(passRush(provider),'passRushIndex')).endsWith('FORCE starts with pressure rate and gives extra credit when a pressure becomes a QB hit or sack.'),`${provider} keeps the true-pressure explanation`);
}
// Correction F2: a missing event count is omitted, a measured zero is kept.
const events=(provider,dl)=>titles(api.rawUnitCell(passRush(provider,{dl}),'passRushIndex')).split(' | ').find(part=>/^\d+ (hurries|hits|sacks)( · \d+ (hurries|hits|sacks))*$/.test(part));
for (const missingValue of [null,undefined,'',NaN,Infinity]) {
  ok(events('ftn-play-level',{hurries:missingValue})==='11 hits · 6 sacks',`direct pressure omits missing hurries (${missingValue})`);
  ok(events('nflverse-weekly-disruption',{hurries:missingValue})==='11 hits · 6 sacks',`fallback omits missing hurries (${missingValue})`);
}
ok(events('ftn-play-level',{hurries:0})==='0 hurries · 11 hits · 6 sacks','a measured zero hurries still shows');
ok(events('ftn-play-level',{hurries:20})==='20 hurries · 11 hits · 6 sacks','finite hurries keep their formatting');
ok(events('ftn-play-level',{hurries:null,qb_hits:null,sacks:0})==='0 sacks','missing hits are omitted and a zero sack count is kept');
ok(events('nflverse-weekly-disruption',{hurries:null,qb_hits:0,sacks:null})==='0 hits','fallback keeps a measured zero hit count and drops missing sacks');
const priorTip=titles(api.rawUnitCell(passRush('prior',{live:{games:0,passRushPressureReady:false,passRushGames:0}}),'passRushIndex'));
ok(/\| preseason baseline/.test(priorTip) && /still using the preseason baseline/.test(priorTip) && !/2025 prior/.test(priorTip),`preseason tooltip is plain: ${priorTip}`);
const missing=passRush('prior-held',{live:{passRushPressureReady:false,passRushGames:0,currentPressureReason:'external current-pressure provider stale (as_of 2026-09-01)'}});
const missingTip=titles(api.rawUnitCell(missing,'passRushIndex'));
ok(/Current pass-rush data are unavailable for this team\./.test(missingTip) && !/provider stale|as_of/.test(missingTip),`public unavailable tooltip hides the raw reason: ${missingTip}`);
ok(/rather than counting missing data as zero/.test(missingTip),'missing pressure is still never treated as zero');
ok(titles(local.rawUnitCell(missing,'passRushIndex')).includes('external current-pressure provider stale (as_of 2026-09-01)'),'localhost keeps the raw unavailable reason');
ok(/Detailed pressure data are unavailable/.test(api.passRushRateLabel(missing)),'matchup unavailable note is unchanged');
ok(/currentPressureReason/.test(app) && /passRushProvider/.test(fs.readFileSync('model/live_profiles.js','utf8')),'provider IDs and reasons remain in the live profile');

// Group 3 / correction F3: the status names the usable current stats actually
// blended (team or player rows), never just completed games, and claims no
// blend when the current contribution is zero. Rendered through the real
// team Advanced card with controlled live-profile evidence.
const live=api.liveProfiles()[liveTeam]._live, savedLive=structuredClone(live);
ok(live.games>0 && live.statGames>0 && live.freshness?.teamStats,'fixture profile exposes completed games, usable team-stat games and freshness');
const withLive=(patch,fn)=>{Object.assign(live,structuredClone(savedLive),patch);try{return fn();}finally{for(const k of Object.keys(live))delete live[k];Object.assign(live,structuredClone(savedLive));}};
const teamRows=(games,usable=true)=>({freshness:{...savedLive.freshness,teamStats:{...savedLive.freshness.teamStats,usable,games}}});
const advancedSub=()=>panel('advanced').match(/OFFENSIVE EFFICIENCY PER PLAY.*?\.\s/)?.[0]||'';
const statusCases=[
  ['ordinary blend',{games:3,statGames:3,priorAccelerated:false,...teamRows(3)},'3 games have usable 2026 stats, blended with the preseason baseline'],
  ['completed > usable',{games:3,statGames:2,priorAccelerated:false,...teamRows(2)},'2 of 3 games have usable 2026 stats, blended with the preseason baseline'],
  ['zero usable rows',{games:3,statGames:0,priorAccelerated:false,...teamRows(0,false)},'3 games played, but current stats are not available yet, so this still uses the preseason baseline'],
  ['rows flagged unusable',{games:2,statGames:2,priorAccelerated:false,...teamRows(2,false)},'2 games played, but current stats are not available yet, so this still uses the preseason baseline'],
  ['one usable game',{games:1,statGames:1,priorAccelerated:false,...teamRows(1)},'1 game has usable 2026 stats, blended with the preseason baseline'],
  ['preseason',{games:0,statGames:0,priorAccelerated:false},'Preseason baseline'],
];
for (const [label,patch,expected] of statusCases) withLive(patch,()=>{
  const status=api.liveProfileStatus(liveTeam);
  ok(status===expected,`${label}: ${status}`);
  ok(!/%/.test(status),`${label} has no percentages`);
  if (patch.games) ok(advancedSub().includes(`${expected}.`),`${label} renders on the team Advanced card: ${advancedSub()}`);
});
withLive({games:3,playerStatGames:1,priorAccelerated:false,freshness:{...savedLive.freshness,playerStats:{...savedLive.freshness.playerStats,usable:true}}},()=>
  ok(api.liveProfileStatus(liveTeam,'player')==='1 of 3 games have usable 2026 stats, blended with the preseason baseline','QB notes count usable player-stat games, not team rows'));
ok(/liveProfileStatus\(g\.away, 'player'\)/.test(app) && /liveProfileStatus\(g\.home, 'player'\)/.test(app),'matchup QB notes use the player-stat count');
ok(JSON.stringify(live)===JSON.stringify(savedLive),'status cases leave the live profile unchanged');
const UP=vmContext.window.FORCE_UNIT_PRIOR;
ok(UP.liveWeight(0,0,1)===0 && UP.liveWeight(0,40,1)===0,'zero usable games carry zero current weight (no blend to claim)');

// Correction F4: Method copy matches the real stabilizers. Current data gains
// influence with a larger usable sample at a fixed stabilizer, but the
// stabilizer itself adapts, so weight is not monotonic in games played, and
// some units start from a neutral average rather than last season.
const earlyMethod=visibleText(method.slice(method.indexOf('<h2>How new games change unit ratings</h2>'),method.indexOf('<h2>How unit ratings reach the team rating</h2>')));
ok(/steadied by baseline information: usually last season's rating pulled partway toward average, or a neutral average where no earlier measure exists/.test(earlyMethod),'Method names both baseline kinds');
ok(/As more usable current-season data arrives, it generally carries more of the rating/.test(earlyMethod),'Method keeps the growing-influence idea without a universal claim');
ok(!/every game played|half|two-thirds|four-fifths|\d+%/.test(earlyMethod),'Method drops the monotonic claim, fractions and percentages');
ok(/trust the new evidence somewhat faster/.test(earlyMethod) && /does not treat missing pressure data as zero/.test(earlyMethod),'Method keeps acceleration and missing-data limitations');
for (const cp of [0,10,40]) ok([1,2,3,4,6,10].every((g,i,a)=>i===0||UP.liveWeight(g,cp,1)>UP.liveWeight(a[i-1],cp,1)),`more usable games raise current weight at a fixed stabilizer (correction ${cp})`);
const strong=[5,10,20,40,80].find(cp=>UP.effectivePriorGames(cp,1)<UP.effectivePriorGames(0,1)-1e-9);
ok(strong!=null,'early-regime correction lowers the stabilizer for some teams');
ok([[2,3],[1,2],[3,4],[2,4]].some(([fewer,more])=>UP.liveWeight(fewer,strong,1)>UP.liveWeight(more,0,1)),'weight is not a function of games played alone: fewer games can carry more weight when the stabilizer adapts');
const liveModel=fs.readFileSync('model/live_profiles.js','utf8');
ok(/priorPointsAllowedPerDriveIndex=50;/.test(liveModel),'points-allowed-per-drive starts from a neutral average, not last season');
ok(/regressUnitIndex\(prior\.offenseIndex,unitPriorReversion\)/.test(liveModel),'other unit baselines are last season pulled toward average');

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
for (const [label,text] of [['luck',luckNotice],['status',statusCases.map(c=>c[2]).join(' ')],['fallback tooltip',disruptionTip],['method blend',earlyMethod],['playoffs',playoffs],['matchup score',matchup.match(/The predicted score comes from[^.]*\./)?.[0]||''],['flag',flagRankings]]) ok(!/—/.test(text),`${label} copy has no em dash`);
ok(/The market supplies 75% of the Week 1 prediction/.test(method) && /25,000 possession-level simulations centered on that FORCEcast expectation/.test(method),'Method FORCEcast/market row is untouched pending UX-18');
ok(/1\.20x expansion/.test(app) && /Use auto QB fix|carryover correction/.test(app) && /<th>QB return<\/th>/.test(app),'QB Rankings (UX-08) and QB-return (UX-19) surfaces are untouched');
ok(/manual what-if available on team pages/.test(method),'D10/UX-19 Method status clause is untouched');
ok(JSON.stringify(api.currentRatings())===ratings,'rendering changes no FORCE rating');
ok(app===fs.readFileSync('public/assets/app.js','utf8'),'public app mirror matches canonical source');
console.log(`PASS: UX-14 content tranche B public copy (${checks} checks)`);
