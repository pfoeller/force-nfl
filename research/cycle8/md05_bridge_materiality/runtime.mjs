// Existing app VM only. Source overrides below are research input boundaries, never production edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export function sourceHashes(){return Object.fromEntries([...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(([,p])=>[p,hash(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))]));}
export function frozenRuntime(input){
  assert.deepEqual(sourceHashes(),input.sourceHashes,'source differs from captured production base');
  assert.deepEqual(Object.keys(sourceHashes()),Object.keys(input.sourceHashes),'ordered bundle changed');
  let forecast=fs.readFileSync('model/forecast_v2.js','utf8');
  const gate='function marketProbability(game) {';
  assert.equal(forecast.split(gate).length,2);
  forecast=forecast.replace(gate,gate+"\n    if (game && Object.hasOwn(game,'_researchMarket')) return game._researchMarket; // frozen FORCE-derived market context, no raw odds\n");
  const h=appHarness({now:Date.parse(input.capture.capturedAt),sources:{'model/forecast_v2.js':forecast},hooks:'coreCurrentRatings,score,sortedSchedule,gameKey,seasonProjection,exactScoreProjection,projected,D,UFB,F,freezeInputs:(input)=>{coreCurrentRatings=()=>input.core;liveProfiles=()=>input.profiles;}'});
  h.api.S.schedule=input.games;
  h.api.S.scheduleVersion=input.state.scheduleVersion;
  h.api.S.statsVersion=input.state.statsVersion;
  h.api.freezeInputs(input);
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.D.meta)),input.meta);
  assert.deepEqual({hfa:h.api.D.config.hfa,scale:h.api.D.config.scale},input.config);
  return h;
}
export function outputs(api){
  const ratings=api.currentRatings();
  assert.deepEqual(JSON.parse(JSON.stringify(api.ratingsWithActiveQBCarryover(ratings))),JSON.parse(JSON.stringify(ratings)),'retired QB correction must stay zero');
  const games=api.sortedSchedule().filter(g=>g.homeScore==null).map(g=>{const forecast=api.forecastFor(g,ratings);return {gameKey:api.gameKey(g),home:g.home,away:g.away,week:g.week,forecast,score:api.exactScoreProjection(g,forecast)};});
  const analyticWins=Object.fromEntries(Object.keys(ratings).map(t=>[t,api.projected(t,ratings).ew]));
  return JSON.parse(JSON.stringify({ratings,games,analyticWins,season:api.seasonProjection()}));
}
