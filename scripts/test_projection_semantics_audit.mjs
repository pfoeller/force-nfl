import assert from 'node:assert/strict';
import {projectionAuditHarness, auditProjectionSemantics} from './lib/projection_semantics_audit.js';
import {projectionSemanticsFixture} from './lib/projection_semantics_fixture.js';

const close = (a,b,message) => assert.ok(Math.abs(a-b)<1e-9, message || `${a} != ${b}`);
const input = projectionSemanticsFixture({manualCarryover:true});
const inputBefore = JSON.stringify(input);
const h = projectionAuditHarness(input);
const stateBefore = {team:h.api.S.team, ratingView:h.api.S.ratingView, scenario:h.api.S.scenario};
const report = auditProjectionSemantics(h);
assert.equal(report.status,'comparable');
assert.equal(report.rows.length,32);
assert.equal(report.runs,5000);
assert.equal(JSON.stringify(input),inputBefore,'audit must not mutate supplied inputs');
assert.equal(h.api.S.team,stateBefore.team);
assert.equal(h.api.S.ratingView,stateBefore.ratingView);
assert.equal(h.api.S.scenario,stateBefore.scenario,'render probing restores controls');
for (const collection of ['directoryProjectedWins','luckRankingRows','divisionRows','playoffRows']) {
  assert.equal(report.rendered[collection].length,32,collection);
  assert.equal(new Set(report.rendered[collection].map(row=>row.team)).size,32,collection);
}
const ratings = h.api.ratingsWithActiveQBCarryover();
for (const row of report.rows) {
  const r = row.currentRecord;
  const expected = r.w+0.5*r.t+h.api.S.schedule.filter(g=>g.homeScore==null && (g.home===row.team || g.away===row.team))
    .reduce((sum,g)=>{const p=h.api.forecastFor(g,ratings).probability;return sum+(g.home===row.team?p:1-p);},0);
  close(row.analytic.leagueActive.ew,expected,'analytic expectation uses actual win equivalents + canonical probabilities');
  close(row.analytic.base.ew,row.analytic.rosterUntouched.ew,'zero-delta roster path retains its actual base input');
  assert.equal(row.simulation.projectedPathRecord.t,r.t,'simulation retains actual ties without fabricating future ties');
  assert.equal(row.actualOutcomeState.status,'unavailable');
  assert.equal(row.actualOutcomeState.playoff,null,'Out/0% must not become actual elimination in diagnostics');
  assert.equal(row.seedProbability.status,'unavailable','representative seed must not become a seed probability');
  const playoff = report.rendered.playoffRows.find(x=>x.team===row.team);
  const division = report.rendered.divisionRows.find(x=>x.team===row.team);
  assert.equal(playoff.cells[4],`${row.simulation.projectedRecord} ${row.simulation.expectedWins.toFixed(1)} exp. wins`);
  assert.equal(playoff.cells[5],row.displayedOdds.playoffPct);
  assert.equal(playoff.cells[6],row.displayedOdds.divisionPct);
  assert.equal(playoff.cells[7],row.displayedOdds.byePct);
  assert.equal(division.cells[4],playoff.cells[4]);
  assert.equal(division.cells[5],row.displayedOdds.divisionPct);
  assert.equal(playoff.className,row.simulation.projectedSeed==='Out'?'projected-out':'projected-in');
  assert.equal(report.rendered.directoryProjectedWins.find(x=>x.team===row.team).value,row.analytic.leagueActive.ew.toFixed(1));
  const retrospective = row.retrospectiveLuck;
  const luckRow = report.rendered.luckRankingRows.find(x=>x.team===row.team);
  if (retrospective.status === 'available') {
    const displayedWins = Math.max(0,Math.min(retrospective.completedGames,Math.round(retrospective.expectedWins)));
    assert.equal(luckRow.cells[4],`${displayedWins}-${retrospective.completedGames-displayedWins}`);
  }
}
for (const conf of ['AFC','NFC']) {
  const rows=report.rows.filter(row=>h.context.window.MODEL_DATA.teams[row.team].division.startsWith(conf));
  close(rows.reduce((sum,row)=>sum+row.simulation.playoffPct,0),700,'seven marginal playoff places');
  close(rows.reduce((sum,row)=>sum+row.simulation.byePct,0),100,'one marginal bye');
  assert.deepEqual(rows.map(row=>row.simulation.projectedSeed).filter(Number.isInteger).sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
}
for(const division of new Set(Object.values(h.context.window.MODEL_DATA.teams).map(t=>t.division))) {
  close(report.rows.filter(row=>h.context.window.MODEL_DATA.teams[row.team].division===division)
    .reduce((sum,row)=>sum+row.simulation.divisionPct,0),100,'one marginal division winner');
}
assert.ok(report.summary.outWithNonzeroOdds.length,'representative Out and nonzero marginal odds can coexist');
assert.ok(report.summary.maxAbsoluteSamplingGap>1e-8,'finite simulation mean is a distinct estimator');
const kc = report.rows.find(row=>row.team==='KC');
assert.ok(kc.gap.teamPageMinusRoster>0,'different rating inputs must remain visible rather than silently equalized');
assert.equal(report.rendered.rosterExpectedWins,kc.analytic.base.ew.toFixed(1));
assert.ok(report.rendered.teamHero.startsWith(`${kc.analytic.teamPage.ew.toFixed(1)}–${(17-kc.analytic.teamPage.ew).toFixed(1)}`));
assert.equal(kc.retrospectiveLuck.completedGames,3);
assert.notEqual(kc.retrospectiveLuck.expectedWins,kc.analytic.leagueActive.ew,'completed-game context is not a remaining-season forecast');

// These are observations of the baseline formatter, not a new PRESERVE rule or
// authorization to ignore UX-25. The audit must report the real path faithfully.
assert.equal(h.api.pct(0.36),'0%');
assert.equal(h.api.pct(99.6),'100%');
// Controlled odds test only the diagnostic classifier with the real formatter.
// Exact simulation extremes are not evidence of a rounding artifact.
const realSeasonProjection = h.api.seasonProjection;
const classifiedSimulation = structuredClone(realSeasonProjection());
for (const team of report.rows.map(row=>row.team)) {
  Object.assign(classifiedSimulation.teams[team],{playoffPct:50,divisionPct:50,byePct:50});
}
Object.assign(classifiedSimulation.teams.ARI,{playoffPct:0,divisionPct:100});
Object.assign(classifiedSimulation.teams.ATL,{playoffPct:0.36,divisionPct:99.6});
Object.assign(classifiedSimulation.teams.BAL,{playoffPct:0.5,divisionPct:99.49});
try {
  h.api.seasonProjection=()=>classifiedSimulation;
  const classified=auditProjectionSemantics(h,{render:false});
  assert.deepEqual(classified.summary.displayedExtremes,['ARI','ATL']);
  assert.deepEqual(classified.summary.nonzeroDisplayedAsZero,['ATL']);
  assert.deepEqual(classified.summary.sub100DisplayedAs100,['ATL']);
  assert.equal(classified.rows.find(row=>row.team==='BAL').displayedOdds.playoffPct,'1%');
  assert.equal(classified.rows.find(row=>row.team==='BAL').displayedOdds.divisionPct,'99%');
} finally { h.api.seasonProjection=realSeasonProjection; }
const unavailable = structuredClone(input);
unavailable.gameFlow = {};
assert.equal(auditProjectionSemantics(projectionAuditHarness(unavailable)).status,'unavailable');
const badFinal = structuredClone(input);
badFinal.schedule[0].awayScore=null;
assert.throws(()=>projectionAuditHarness(badFinal),/Incomplete final/);
const badForecastHarness = projectionAuditHarness(input);
// Fault injection at the offline hook checks the diagnostic's refusal policy;
// all ordinary forecast/simulation assertions above call untouched real paths.
badForecastHarness.api.forecastFor=()=>({probability:NaN});
assert.equal(auditProjectionSemantics(badForecastHarness).status,'unavailable');
const changedMarket = structuredClone(input);
const future = changedMarket.schedule.find(g=>g.homeScore==null && (g.home==='KC' || g.away==='KC'));
Object.assign(future,{homeMoneyline:-2000,awayMoneyline:2000});
const marketHarness = projectionAuditHarness(changedMarket);
assert.equal(JSON.stringify(marketHarness.api.currentRatings()),JSON.stringify(h.api.currentRatings()),'future market odds do not enter canonical team ratings');
assert.notEqual(marketHarness.api.forecastFor(future,marketHarness.api.ratingsWithActiveQBCarryover()).probability,
  h.api.forecastFor(input.schedule.find(g=>g.week===future.week && g.home===future.home && g.away===future.away),ratings).probability,
  'future market odds do enter canonical smart forecasts');

// Fresh harnesses recompute current ratings after changing an actual completed
// fixture game's market fields. Outcomes, unit inputs and corrections stay fixed.
const completedMarket = structuredClone(input);
const completed = completedMarket.schedule.find(g=>g.homeScore!=null && g.awayScore!=null);
assert.ok(completed,'completed-game market regression requires a completed fixture game');
Object.assign(completed,{homeMoneyline:-120,awayMoneyline:100,spreadLine:-2,totalLine:42,lineSource:'synthetic original market'});
const completedBeforeHarness = projectionAuditHarness(completedMarket);
const completedBeforeRatings = JSON.stringify(completedBeforeHarness.api.currentRatings());
Object.assign(completed,{homeMoneyline:2000,awayMoneyline:-2000,spreadLine:14,totalLine:60,lineSource:'synthetic mutated market'});
const completedAfterHarness = projectionAuditHarness(completedMarket);
assert.equal(completedBeforeRatings,JSON.stringify(h.api.currentRatings()),'adding completed-game market data does not change current ratings');
assert.equal(JSON.stringify(completedAfterHarness.api.currentRatings()),completedBeforeRatings,
  'changing completed-game moneylines, spread and total does not change current FORCE ratings');

// Call the real representative selector on coherent supplied snapshots, rather
// than rewriting selection or treating independently chosen modes as a bracket.
const snapshots=[{records:{A:{w:4,t:0},B:{w:0,t:0}},seedByTeam:{A:1}},
  {records:{A:{w:2,t:0},B:{w:2,t:0}},seedByTeam:{B:1}}];
assert.equal(h.api.selectRepresentativeProjection(snapshots,['A','B'],{A:2.1,B:1.9},{}).representative,snapshots[1]);
console.log('PASS: projection semantics audit (real forecasts, simulation coherence, rendered cells, rating-input distinctions, unavailable states)');
