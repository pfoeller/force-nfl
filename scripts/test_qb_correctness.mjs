import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture,qbReference} from './lib/qb_input_fixture.js';

let checks=0;
const equal=(actual,expected,label)=>{assert.ok(Math.abs(actual-expected)<1e-10,`${label}: ${actual} != ${expected}`);checks++;};
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const h=appHarness({hooks:'qbCustomRawScore,qbCustomScore,qbComponentScores,qbDebug,qbRecencyAdjustmentFromProfiles'});
// Observe actual opponent team-game inputs without exporting test state in production.
vm.runInContext(fs.readFileSync('model/live_profiles.js','utf8').replace('const V139_OPPONENT=',
  'window.TEST_QB_GAMES=qbGameRecords; const V139_OPPONENT='),h.context);
const L=h.context.window.FORCE_LIVE_PROFILE;
const ids=['BUF','KC'];
const priorProfiles=Object.fromEntries(ids.map(t=>[t,h.context.window.MATCHUP_DATA.profiles[t]]));
const schedule=[{week:1,date:'2026-09-13',home:'BUF',away:'KC',homeScore:20,awayScore:17}];
const teamRows=ids.map((team,i)=>({season:2026,week:1,game_id:'g1',team,opponent_team:ids[1-i],attempts:20,passing_epa:4,carries:5,rushing_epa:0}));
function build(fields={},prior=priorProfiles) {
  const playerRows=teamRows.map((r,i)=>({...r,position:'QB',player_display_name:'QB'+i,
    passing_yards:150,passing_tds:1,interceptions:1,passing_cpoe:0,...fields})).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,String(v)])));
  const g={week:1,opponent:'KC',passAttempts:20,passSuccesses:10,qbPlays:22,qbTotalEpa:4,qbRushAttempts:0,qbRushEpa:0};
  return L.buildProfiles({teamRows,playerRows,schedule,teamIds:ids,priorProfiles:prior,
    defensiveDriveContextByTeam:{BUF:{gameRows:[g],qbPlays:22,qbTotalEpa:4,coveragePassAttempts:20,coveragePassSuccesses:10},KC:{gameRows:[{...g,opponent:'BUF'}],qbPlays:22,qbTotalEpa:4,coveragePassAttempts:20,coveragePassSuccesses:10}},
    qbEpaDefinition:'v149-all-play-v2',historicalReference:qbReference,
    qbPolicy:'v106-current-season-stabilized',coveragePolicy:'v101-attempts',priorGames:1});
}
for (const [fields,loss,sacks] of [
  [{sacks_suffered:0,sack_yards_lost:0},0,0],
  [{sacks_suffered:1,sack_yards_lost:-8},8,1],
  [{sacks_suffered:2,sack_yards_lost:-17},17,2],
  [{sacks_suffered:2,sack_yards:17},17,2],
  [{sacks_suffered:2,sacks_suffered_yards:17},17,2],
  [{sacks_suffered:2,passing_sack_yards:17},17,2],
  [{sacks_suffered:2,sack_yards_lost:-17,sack_yards:17,sacks_suffered_yards:17,passing_sack_yards:17},17,2]
]) {
  const q=build(fields).BUF.qb, expected=(150+20-45-loss)/(20+sacks);
  equal(q.any_a,expected,'season ANY/A subtracts positive loss once; sacks in denominator once');
  equal(h.context.window.TEST_QB_GAMES[0].anya,expected,'opponent per-game ANY/A agrees');
}
equal(L.qbSackYardsLost([{sack_yards_lost:-8,sack_yards:8},{sack_yards:9}]),17,'mixed per-row aliases');
equal(L.qbSackYardsLost([{sack_yards_lost:0,sack_yards:99}]),0,'canonical zero is authoritative');
equal(L.qbSackYardsLost([{sack_yards_lost:'',sack_yards:'8'},{sack_yards_lost:'bad',passing_sack_yards:'9'}]),17,'missing/nonfinite aliases fall through');
const p=build({sacks_suffered:2,sack_yards_lost:-17}).BUF;
const q=p.qb;
const raw=L.calibrateQbComposite(.30*q.pass_epa_score+.30*q.any_a_score+.20*q.pass_success_score+.10*q.rushing_value_score+.10*q.cpoe_score);
equal(q.raw_live_qb_score,raw,'default raw is actual expanded five-component composite');
equal(q.live_qb_score,Math.max(0,Math.min(100,raw+q.opponent_rating_adjustment+q.ol_rating_adjustment)),'live final formula unchanged');
const otherPrior=Object.fromEntries(ids.map(t=>[t,{...priorProfiles[t],qbIndex:5}]));
const changed=build({sacks_suffered:2,sack_yards_lost:-17},otherPrior).BUF;
equal(changed.qb.raw_live_qb_score,raw,'prior does not enter raw');
ok(changed.qbIndex!==p.qbIndex,'prior fixture actually changes canonical final');

// Exercise actual recency scoring with PBP's already positive sackYards.
const recencySource=fs.readFileSync('assets/app.js','utf8');
const start=recencySource.indexOf('function qbRecencyAdjustmentFromProfiles(');
const end=recencySource.indexOf('\n  function liveProfiles(',start);
const captured=recencySource.slice(start,end).replace('let sum=0,wt=0;', 'window.TEST_RECENCY_ANYA.push(vals.anya); let sum=0,wt=0;');
const game={passAttempts:20,sacks:2,passYards:150,passTds:1,interceptions:1,sackYards:17,qbPlays:22,qbTotalEpa:4,passSuccesses:10};
const recencyContext={window:{TEST_RECENCY_ANYA:[]},D:{teams:{BUF:{},KC:{}}},canon:t=>t,defensiveDriveContextMapBeforeWeek:()=>({BUF:{gameRows:[{...game,week:1},{...game,week:2}]}})};
vm.createContext(recencyContext);vm.runInContext(captured,recencyContext);
recencyContext.qbRecencyAdjustmentFromProfiles('BUF',{BUF:p,KC:{...p,qb:{...q,any_a:7,any_a_score:80}}});
equal(recencyContext.window.TEST_RECENCY_ANYA[0],q.any_a,'actual PBP recency ANY/A agrees with weekly negative alias');

// Render the real Rankings page with controlled canonical profiles. Different context,
// prior and recency values must change Final but cannot leak into the Raw column.
const allIds=Object.keys(h.context.window.MODEL_DATA.teams);
const profiles=Object.fromEntries(allIds.map(t=>[t,{...p,qb:{...q,qb:'QB '+t,primary_qb_dropback_share:1,recency_adjustment:0},_preseasonUnitPrior:{...priorProfiles.BUF}}]));
h.L.buildProfiles=()=>profiles;
h.api.S.schedule=schedule;h.api.S.liveGameFlow2026=gameFlowFixture();
h.api.S.engineCache={version:h.api.S.scheduleVersion,value:{ratings:Object.fromEntries(allIds.map(t=>[t,1500])),nextWeek:2,earlyStates:{},gameHistory:{}}};
h.api.liveProfiles();
function rawCell() {
  const html=h.api.qbRankingsPage();
  const row=html.match(/<tr><td><b>[^<]*<\/b><\/td><td><span class="qb-name-team"><b>QB BUF<\/b>[\s\S]*?<\/tr>/)?.[0];
  assert.ok(row,'BUF rendered');
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)][3][1].replace(/<[^>]*>/g,'');
}
const finalBefore=profiles.BUF.qbIndex;
equal(Number(rawCell()),Number(raw.toFixed(1)),'default Raw column uses model value');
equal(profiles.BUF.qbIndex,finalBefore,'render leaves canonical final unchanged');
for (const [key,value] of [['opponent_rating_adjustment',4],['ol_rating_adjustment',-3],['recency_adjustment',4]]) {
  profiles.BUF.qb[key]=value;profiles.BUF.qbIndex=20;
  equal(Number(rawCell()),Number(raw.toFixed(1)),`${key} does not enter rendered Raw`);
}
profiles.BUF._preseasonUnitPrior.qbIndex=99;
equal(Number(rawCell()),Number(raw.toFixed(1)),'rendered Raw excludes continuity prior');
const components=h.api.qbComponentScores('BUF');
const weights={epa:0,anya:100,success:0,rushing:0,cpoe:0};
equal(h.api.qbCustomRawScore(components,weights),L.calibrateQbComposite(q.any_a_score),'custom Raw uses custom components only');
h.api.S.qbRankingMode='custom';h.api.S.qbWeights=weights;
equal(Number(rawCell()),Number(L.calibrateQbComposite(q.any_a_score).toFixed(1)),'custom column uses custom Raw');
equal(h.api.qbCustomScore(components,weights),Math.max(0,Math.min(100,h.api.qbCustomRawScore(components,weights)+4-3+4)),'custom final formula unchanged');
ok(h.api.qbRankingsPage().includes('prior/continuity blending'),'Raw explanation includes prior');
console.log(`PASS: QB ANY/A and Raw correctness (${checks} behavioral checks)`);
