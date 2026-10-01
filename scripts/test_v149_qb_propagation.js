import assert from 'node:assert/strict';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture} from './lib/qb_input_fixture.js';

const {api,L,context}=appHarness({hooks:'qbCarryoverUnitEffect,qbRecencyAdjustmentFromProfiles'});
const {S}=api;
const ids=Object.keys(context.window.MODEL_DATA.teams);
const profiles=Object.fromEntries(ids.map((team,i)=>[team,{
  ...context.window.MATCHUP_DATA.profiles[team],_offenseCompositePolicy:'v102-orthogonal',
  pointsScoredPerDriveIndex:50,qbIndex:50,receiverIndex:50,olIndex:50,rbIndex:50,
  offenseCompositeRaw:50,offenseComposite:L.calibrateComposite(50,L.COMPOSITE_V108.offense),
  _preseasonUnitPrior:{...context.window.MATCHUP_DATA.profiles[team]},
  qb:{qb:team==='KC'?'Patrick Mahomes':'QB',epa_per_qb_play:i/100,pass_epa_score:40+i,
    any_a:5,any_a_score:50,pass_success_rate:.5,pass_success_score:50,
    rush_epa_per_attempt:0,rushing_value_score:50,live_cpoe:0,cpoe_score:50},
  _live:{games:2,playerStatGames:2,freshness:{teamStats:{current:true},playerStats:{current:true}}}
}]));
let builds=0;
L.buildProfiles=()=>{builds++;return profiles;};
S.schedule=[1,2].map(week=>({week,date:`2026-09-${week===1?'13':'20'}`,home:'BUF',away:'KC',homeScore:20,awayScore:17}));
S.liveGameFlow2026=gameFlowFixture({defensive_drive_games:[1,2].map(week=>({
 week,home:'BUF',away:'KC',home_offensive_drives:10,away_offensive_drives:10,
 home_qb_total_epa:week===1?-5:10,home_qb_plays:20,away_qb_total_epa:2,away_qb_plays:20,
 home_coverage_pass_attempts:20,away_coverage_pass_attempts:20,
 home_pass_yards:150,away_pass_yards:150}))});
S.engineCache={version:S.scheduleVersion,value:{ratings:Object.fromEntries(ids.map(t=>[t,1500])),nextWeek:3,earlyStates:{},gameHistory:{}}};
const previousComposite=profiles.BUF.offenseComposite;
const value=api.liveProfiles();
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const p=value.BUF;
ok(p.qb.recency_adjustment>0,'fixture has a real positive recency adjustment');
ok(p.qbIndex===50+p.qb.recency_adjustment,'recency applied once to final QB');
ok(p.qb.canonical_force_qb_rating===p.qbIndex,'one canonical QB value');
ok(p.offenseComposite===L.offenseCompositeFrom(p),'stored calibrated offense uses final QB');
ok(p.offenseCompositeRaw===L.rawOffenseCompositeFrom(p),'stored raw offense uses final QB');
ok(p.offenseComposite!==previousComposite,'stale pre-recency composite replaced');
api.liveProfiles();api.currentRatings();api.currentTeamState('BUF');
ok(builds===1 && p.qbIndex===50+p.qb.recency_adjustment,'cached consumers do not double-apply recency');
const expected=context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL.compute(1500,p,p._preseasonUnitPrior,context.window.MODEL_DATA.meta);
ok(Math.abs(api.currentRatings().BUF-expected.elo)<1e-10,'overall FORCE uses final QB exactly once through bridge');
const qbTerms=expected.components.filter(x=>x.key==='qbIndex');
ok(qbTerms.length===1 && qbTerms[0].current===p.qbIndex,'one final-QB bridge term');
ok(api.currentTeamState('BUF').profile.offenseComposite===p.offenseComposite,'team state uses recomputed offense');
ok(api.displayProfile('BUF').qbIndex===p.qbIndex,'unit/matchup/export display profile uses canonical QB');
const ratings=api.ratingsWithActiveQBCarryover();
const game={week:4,date:'2026-10-01',home:'BUF',away:'KC',homeScore:null,awayScore:null};
ok(api.forecastFor(game,ratings).probability===context.window.SIGNAL_FORECAST_V2.forecastProbability(game,ratings.BUF,ratings.KC,{hfa:context.window.MODEL_DATA.config.hfa,scale:context.window.MODEL_DATA.config.scale}).probability,'FORCEcast uses bridged canonical ratings');
// Availability transform remains downstream; measured starter suppresses its unit overlay.
const measuredEffect=api.qbCarryoverUnitEffect('KC',api.currentRatings(),15,'Patrick Mahomes');
ok(measuredEffect.unitOverlaySuppressed,'measured returning starter keeps canonical unit');
profiles.KC.qb.qb='Backup';
const backupEffect=api.qbCarryoverUnitEffect('KC',api.currentRatings(),15,'Patrick Mahomes');
ok(!backupEffect.unitOverlaySuppressed && backupEffect.profile.qbIndex>profiles.KC.qbIndex,'unmeasured starter scenario still changes QB unit');
ok(backupEffect.profile.offenseComposite===L.offenseCompositeFrom(backupEffect.profile),'scenario offense remains coherent');
console.log(`PASS: V149 QB propagation (${checks} checks)`);
