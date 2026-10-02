import {appHarness} from './force_app_harness.js';

// Offline evidence only. These counts are result-vector counts, not a clinch
// solver: scores, touchdowns, exceptional scheduling and final tie resolution
// can add distinctions beyond win/loss/tie vectors.
export function outcomeSpace(remaining) {
  if (!Number.isInteger(remaining) || remaining < 0 || remaining > 272) {
    throw new Error('remaining must be an integer in [0,272]');
  }
  return {remaining, binaryVectors:(2n ** BigInt(remaining)).toString(),
    winLossTieVectors:(3n ** BigInt(remaining)).toString()};
}

export function scheduleEvidence(schedule, teams) {
  if (!Array.isArray(schedule)) throw new Error('schedule must be an array');
  const ids = [...teams].sort();
  if (ids.length !== 32 || new Set(ids).size !== 32) throw new Error('32 unique team identities required');
  const known = new Set(ids), keys = new Set();
  const counts = Object.fromEntries(ids.map(t => [t, {loaded:0, completed:0, ties:0}]));
  let completed = 0, actualTies = 0;
  for (const g of schedule) {
    if (!g || !known.has(g.home) || !known.has(g.away) || g.home === g.away) {
      throw new Error('Unknown/identical schedule teams');
    }
    if (!Number.isInteger(g.week) || g.week < 1 || g.week > 18
        || typeof g.date !== 'string' || !/^2026-\d{2}-\d{2}$/.test(g.date)
        || !Number.isFinite(Date.parse(g.date)) || new Date(g.date).toISOString().slice(0,10) !== g.date) {
      throw new Error('Expected 2026 regular-season week/date');
    }
    if ((g.homeScore == null) !== (g.awayScore == null)) throw new Error('Partial final');
    if (g.homeScore != null && [g.homeScore,g.awayScore].some(v => !Number.isInteger(v) || v < 0)) {
      throw new Error('Final scores must be nonnegative integers');
    }
    const key = JSON.stringify([g.week,g.date,g.home,g.away]);
    if (keys.has(key)) throw new Error('Duplicate schedule key');
    keys.add(key);
    for (const t of [g.home,g.away]) counts[t].loaded++;
    if (g.homeScore != null) {
      completed++;
      const tie = g.homeScore === g.awayScore;
      if (tie) actualTies++;
      for (const t of [g.home,g.away]) { counts[t].completed++; if (tie) counts[t].ties++; }
    }
  }
  const mismatches = ids.filter(t => counts[t].loaded !== 17);
  return {scope:'2026 32-team / 17-game regular-season structural audit only',
    games:schedule.length, completed, remaining:schedule.length-completed, actualTies,
    counts, gamesPerTeamMismatches:mismatches,
    meetsCountChecks:schedule.length === 272 && mismatches.length === 0,
    sourceAuthority:'unverified; counts do not certify NFL schedule identity, freshness or correctness',
    actualState:Object.fromEntries(['playoff','division','bye','exactSeed'].map(k => [k,'unknown'])),
    resultVectorSpace:outcomeSpace(schedule.length-completed)};
}

// Deliberately tiny, synthetic same-division split-series context. This is not
// a complete NFL season or an official title/berth determination.
export function tiebreakBoundaryEvidence() {
  const h = appHarness({hooks:'records,completedProjectionOutcomes,recordPct,headToHeadPct,divisionRecord,commonGamesRecord,conferenceRecord,strengthOfVictory,strengthOfSchedule,resolveDivisionTie,resolveCrossDivisionWildcardTie,addProjectedOutcome'});
  const games = [
    {week:1,date:'2026-09-13',home:'KC',away:'LAC',homeScore:21,awayScore:20},
    {week:2,date:'2026-09-20',home:'LAC',away:'KC',homeScore:35,awayScore:7},
  ];
  h.api.S.schedule = structuredClone(games);
  const records = h.api.records(), outcomes = h.api.completedProjectionOutcomes();
  const group = ['KC','LAC'];
  const common = h.api.commonGamesRecord('KC','LAC',outcomes,0);
  const metrics = Object.fromEntries(group.map(t => [t, {
    overall:h.api.recordPct(records[t]),
    headToHead:h.api.headToHeadPct(t,t === 'KC' ? 'LAC' : 'KC',outcomes).pct,
    division:h.api.divisionRecord(t,outcomes).pct,
    common:t === 'KC' ? common.a.pct : common.b.pct,
    conference:h.api.conferenceRecord(t,outcomes).pct,
    strengthOfVictory:h.api.strengthOfVictory(t,records,outcomes),
    strengthOfSchedule:h.api.strengthOfSchedule(t,records,outcomes),
  }]));
  const context = force => ({records,outcomes,force});
  const cases = [{KC:90,LAC:10},{KC:10,LAC:90},{KC:50,LAC:50}];
  const winners = cases.map(force => ({force,
    divisionWinner:h.api.resolveDivisionTie(group,context(force)),
    sameDivisionWildcardWinner:h.api.resolveCrossDivisionWildcardTie(group,context(force))}));
  const points = Object.fromEntries(group.map(t => [t, games.reduce((r,g) => {
    const home = g.home === t;
    r.for += home ? g.homeScore : g.awayScore;
    r.against += home ? g.awayScore : g.homeScore;
    return r;
  }, {for:0,against:0})]));
  const branches = group.concat(null).map(winner => {
    const r = {KC:{w:0,l:0,t:0},LAC:{w:0,l:0,t:0}}, o = [];
    h.api.addProjectedOutcome(r,o,'KC','LAC',winner);
    return {winner,records:r,outcomes:o};
  });
  return {evidenceKind:'synthetic split-series boundary; not a real NFL season',
    games, outcomes, metrics, points, winners,
    strippedScoreFields:outcomes.every(g => !('homeScore' in g) && !('awayScore' in g)),
    constructedOutcomeBranches:branches,
    actualState:'unknown; no official clinch/elimination proof produced'};
}
