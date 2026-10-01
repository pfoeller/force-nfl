import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {appHarness} from './lib/force_app_harness.js';
import {gameFlowFixture,qbReference} from './lib/qb_input_fixture.js';

const python=process.env.FORCE_TEST_PYTHON || 'python';
const result=spawnSync(python,['-B','scripts/test_v149_qb_epa_pbp.py','--json'],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
const {fixtures,checks:pythonChecks}=JSON.parse(result.stdout);
const {api,L,context}=appHarness();
const ids=['BUF','KC'];
const priorProfiles=Object.fromEntries(ids.map(t=>[t,context.window.MATCHUP_DATA.profiles[t]]));
const teamRows=ids.map((team,i)=>({season:2026,week:1,game_id:'g1',team,opponent_team:ids[1-i],attempts:20,passing_epa:4,carries:5,rushing_epa:0}));
const playerRows=ids.map((team,i)=>({...teamRows[i],position:'QB',player_display_name:'QB'+i,passing_yards:150,passing_tds:1,passing_cpoe:0}));
const schedule=[{week:1,date:'2026-09-13',home:'BUF',away:'KC',homeScore:20,awayScore:17}];
const bench=Array.from({length:101},(_,i)=>-1+i*.02);
function build(name){
 api.S.liveGameFlow2026=gameFlowFixture({defensive_drive_games:fixtures[name]});
 return L.buildProfiles({teamRows,playerRows,schedule,teamIds:ids,priorProfiles,
   defensiveDriveContextByTeam:api.defensiveDriveContextMapBeforeWeek(),
    qbEpaDefinition:'v149-all-play',
    historicalReference:{...qbReference,sample_windows:{...qbReference.sample_windows,17:{qb_epa_per_play:bench,qb_pass_epa:bench,qb_pass_success_rate:bench}}},
   qbPolicy:'v106-current-season-stabilized',coveragePolicy:'v101-attempts',priorGames:1});
}
const profiles=Object.fromEntries(Object.keys(fixtures).map(name=>[name,build(name).BUF]));
let checks=0;const ok=(value,label)=>{assert.ok(value,label);checks++;};
const base=profiles.base.qb;
for(const name of ['rushingTD','passingTD','scramble','designedRun','scrambleBothFlags']) {
 ok(profiles[name].qb.pass_epa_score>base.pass_epa_score,`${name} increases canonical 30% EPA component`);
}
ok(profiles.sack.qb.pass_epa_score<base.pass_epa_score,'sack decreases canonical EPA component');
for(const name of ['kneel','spike','rbRun','cancelled','missingEPA']) {
 ok(profiles[name].qb.pass_epa_score===base.pass_epa_score,`${name} excluded from canonical EPA`);
}
ok(profiles.rushingTD.qb.rushing_value_score>base.rushing_value_score,'rushing TD also increases additional rushing component');
ok(profiles.passingTD.qb.rushing_value_score===base.rushing_value_score,'passing TD does not change rushing component');
ok(profiles.scrambleBothFlags.qb.epa_per_qb_play===profiles.scramble.qb.epa_per_qb_play,'overlapping scramble flags counted once');
ok(profiles.rushingTD.qb.actual_pass_epa_per_attempt===base.actual_pass_epa_per_attempt,'legacy passing metric remains separate');
ok(L.QB_V106.rushingValueWeight===.10 && L.QB_V106.passEpaWeight===.30,'both weights retained');
ok(L.calibrateQbComposite(60)===62,'1.20 composite expansion retained');
const q=profiles.rushingTD.qb;
const composite=L.calibrateQbComposite(.30*q.pass_epa_score+.30*q.any_a_score+.20*q.pass_success_score+.10*q.rushing_value_score+.10*q.cpoe_score);
ok(Math.abs(q.live_qb_score-Math.max(0,Math.min(100,composite+q.opponent_rating_adjustment+q.ol_rating_adjustment)))<1e-9,'new EPA score reaches weighted composite with existing context');
console.log(`PASS: V149 canonical QB EPA semantics (${checks} browser checks; ${pythonChecks} Python fixture checks)`);
