import assert from 'node:assert/strict';
import {appHarness} from './lib/force_app_harness.js';
import {qbCustomizeFixture} from './lib/qb_customize_fixture.js';

// Integration-discovered correctness fix: probe the real FLAG card and its
// adjacent rankings EPA/WPA cell, with controlled values in a real live profile.
const input=qbCustomizeFixture();
const {api,context}=appHarness({hooks:'teamDiagnosticPanel,rankingRow'});
Object.assign(api.S,{liveTeamStats:input.teamRows,livePlayerStats:input.playerRows,
  liveGameFlow2026:input.gameFlow,schedule:input.schedule,statsVersion:1,scheduleVersion:1,
  ratingView:'penalties'});
const ratings=JSON.stringify(api.currentRatings());
const pen=api.liveProfiles().BUF.penalty;
assert.equal(api.displayProfile('BUF').penalty,pen,'controlled values must reach the real rendering profile');
assert.equal(pen.unavailable,true,'fixture has no causal penalty evidence');
assert.equal(pen.net_penalty_epa_per_game,null);
assert.equal(pen.net_penalty_wpa_per_game,null);
const cardValue=html=>html.match(/PENALTY EFFECT ON GAME VALUE<\/div><div[^>]*>(.*?)<\/div>/s)?.[1];
assert.equal(cardValue(api.teamPage('BUF')),'- expected points/game | -',
  'real unavailable team page must not invent zero EPA/WPA');
assert.match(api.teamPage('BUF'),/PENALTY EFFECT ON GAME VALUE<\/div><div class="value ">/,
  'missing EPA has neutral presentation rather than positive/negative coloring');

const team=context.window.MODEL_DATA.teams.BUF;
const row={...team,team:'BUF',liveElo:api.currentRatings().BUF};
const render=()=>({card:cardValue(api.teamDiagnosticPanel('BUF',row.liveElo,{},{})),
  cell:[...api.rankingRow(row,1,1).matchAll(/<td\b[^>]*>(.*?)<\/td>/gs)][4]?.[1]});
let cases=0;
function check(epa,wpa,card,cell){
  Object.assign(pen,{live:true,unavailable:false,penaltyImpactScore:50,
    net_penalty_epa_per_game:epa,net_penalty_wpa_per_game:wpa});
  assert.deepEqual(render(),{card,cell});
  assert.equal(JSON.stringify(api.currentRatings()),ratings,'presentation values must not alter FORCE ratings');
  assert.equal(pen.net_penalty_epa_per_game,epa,'rendering preserves input EPA');
  assert.equal(pen.net_penalty_wpa_per_game,wpa,'rendering preserves input WPA');
  cases++;
}
for(const missing of [null,undefined,NaN,Infinity,-Infinity]){
  check(missing,missing,'- expected points/game | -','- · -');
  check(missing,0.0123,'- expected points/game | +1.2 win-chance points/game','- · +1.2 WPA pp/g');
  check(-0.456,missing,'-0.46 expected points/game | -','-0.46 EPA/g · -');
}
check(0,0,'0.00 expected points/game | 0.0 win-chance points/game','0.00 EPA/g · 0.0 WPA pp/g');
check(1.234,0.0123,'+1.23 expected points/game | +1.2 win-chance points/game','+1.23 EPA/g · +1.2 WPA pp/g');
check(-1.234,-0.0123,'-1.23 expected points/game | -1.2 win-chance points/game','-1.23 EPA/g · -1.2 WPA pp/g');
pen.unavailable=true;
assert.equal(render().cell,'-','rankings retain their existing unavailable FLAG guard');
pen.live=false;
assert.deepEqual(render(),{card:'-',cell:'-'},'non-live penalty data retain the existing placeholder');
console.log(`PASS: FLAG EPA/WPA unavailable versus measured values (${cases} paired/mixed cases, card + rankings, unchanged ratings).`);
