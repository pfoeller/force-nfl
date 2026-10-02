import {appHarness} from './force_app_harness.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const oddsKeys = ['playoffPct','divisionPct','byePct'];

// Offline hooks are injected only by the existing VM harness. Production source
// and the calculation paths are neither patched nor replaced by this diagnostic.
export function projectionAuditHarness(input) {
  for (const key of ['teamRows', 'playerRows', 'schedule']) {
    if (!Array.isArray(input?.[key])) throw new Error(`Audit input requires ${key}`);
  }
  if (!input.gameFlow || typeof input.gameFlow !== 'object') throw new Error('Audit input requires gameFlow');
  const h = appHarness({hooks:'projected,seasonProjection,records,pct,ratingsWithQBCarryover,lab,teams,divisionsPage,playoffPicturePage,projectionSeed,projectionRng,selectRepresentativeProjection,adaptiveTeamInfo'});
  const known = h.context.window.MODEL_DATA.teams;
  for (const g of input.schedule) {
    if (!known[g.home] || !known[g.away] || g.home === g.away) throw new Error('Schedule contains unknown/identical teams');
    if (!Number.isInteger(g.week) || g.week < 1 || typeof g.date !== 'string') throw new Error('Schedule requires week/date');
    if ((g.homeScore == null) !== (g.awayScore == null)) throw new Error('Incomplete final: both scores must be present or absent');
    if (g.homeScore != null && (!finite(g.homeScore) || !finite(g.awayScore))) throw new Error('Final scores must be finite numbers');
  }
  for (const [team, prior] of Object.entries(input.priorProfiles || {})) {
    if (!known[team]) throw new Error(`Unknown prior team: ${team}`);
    Object.assign(h.context.window.MATCHUP_DATA.profiles[team], structuredClone(prior));
  }
  const version = input.scheduleVersion ?? 1;
  if (!Number.isInteger(version) || version < 1) throw new Error('scheduleVersion must be a positive integer');
  Object.assign(h.api.S, {
    liveTeamStats:structuredClone(input.teamRows), livePlayerStats:structuredClone(input.playerRows),
    liveGameFlow2026:structuredClone(input.gameFlow), schedule:structuredClone(input.schedule),
    statsVersion:1, scheduleVersion:version,
  });
  if (input.qbCarryover) {
    if (!known[input.qbCarryover.team] || typeof input.qbCarryover.enabled !== 'boolean'
        || !finite(input.qbCarryover.restoreElo) || input.qbCarryover.restoreElo < 0) {
      throw new Error('Invalid diagnostic QB carryover controls');
    }
    Object.assign(h.api.S.qbCarryover, structuredClone(input.qbCarryover));
  }
  return h;
}

export function projectionRows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(match => {
    const team = match[1].match(/data-team="([^"]+)"/)?.[1];
    if (!team) return [];
    return [{team, className:match[0].match(/<tr class="([^"]*)"/)?.[1] || '',
      cells:[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(cell => text(cell[1]))}];
  });
}

export function auditProjectionSemantics(h, {render = true, sampleTeam = 'KC'} = {}) {
  const {api, context, L} = h;
  const inputStatus = L.gameFlowQbStatus(api.S.liveGameFlow2026);
  const baseRatings = api.currentRatings();
  const leagueRatings = api.ratingsWithActiveQBCarryover(baseRatings);
  const teams = Object.keys(context.window.MODEL_DATA.teams).sort();
  const unavailableTeams = teams.filter(team => !finite(baseRatings[team]) || !finite(leagueRatings[team]));
  if (!inputStatus.ready || unavailableTeams.length) return {
    status:'unavailable', inputStatus, unavailableTeams,
    reason:inputStatus.reason || 'Canonical current ratings unavailable; no neutral substitute comparison',
  };
  const remainingForecasts = api.S.schedule.filter(g => g.homeScore == null).map(g => ({
    week:g.week, date:g.date, home:g.home, away:g.away, ...api.forecastFor(g, leagueRatings),
  }));
  const invalidForecastGames = remainingForecasts.filter(g => !finite(g.probability) || g.probability < 0 || g.probability > 1);
  if (invalidForecastGames.length) return {status:'unavailable', inputStatus,
    reason:'Nonfinite/out-of-range canonical future forecast; no substituted probability',
    invalidForecastGames:invalidForecastGames.map(g=>({week:g.week, home:g.home, away:g.away}))};
  const records = api.records();
  const sim = api.seasonProjection();
  const profiles = api.liveProfiles();
  const rows = teams.map(team => {
    const base = api.projected(team, baseRatings);
    const league = api.projected(team, leagueRatings);
    const teamPage = api.projected(team, api.ratingsWithQBCarryover(team, baseRatings));
    const luck = profiles[team]?.luck || {};
    const loadedGames = api.S.schedule.filter(g => g.home === team || g.away === team).length;
    return {team, loadedGames, currentRecord:records[team],
      analytic:{base, leagueActive:league, teamPage, rosterUntouched:api.projected(team, baseRatings, 0)},
      simulation:sim.teams[team],
      displayedOdds:Object.fromEntries(oddsKeys.map(key=>[key,api.pct(sim.teams[team][key])])),
      actualOutcomeState:{playoff:null, division:null, bye:null,
        status:'unavailable', reason:'No authoritative actual clinch/elimination state in the traced projection return or formatter'},
      seedProbability:{status:'unavailable', reason:'Internal seed counts are not exported as probabilities or rendered; projectedSeed is a representative realization'},
      retrospectiveLuck:{status:finite(luck.exp_w)?'available':'unavailable',
        expectedWins:finite(luck.exp_w)?luck.exp_w:null,
        pregameExpectedWins:finite(luck.pregame_exp_w)?luck.pregame_exp_w:null,
        pythagoreanExpectedWins:finite(luck.pythagorean_exp_w)?luck.pythagorean_exp_w:null,
        completedGames:luck.g ?? null, performanceGames:luck.deserved_games?.length ?? null,
        source:luck.source || null},
      gap:{simulationMinusAnalytic:sim.teams[team].expectedWins-league.ew,
        representativeWinEquivalentMinusAnalytic:sim.teams[team].projectedPathRecord.w+0.5*sim.teams[team].projectedPathRecord.t-league.ew,
        leagueActiveMinusRoster:league.ew-base.ew, teamPageMinusRoster:teamPage.ew-base.ew},
    };
  });
  const report = {status:'comparable', inputStatus, runs:sim.runs, remainingGames:sim.remainingGames, remainingForecasts,
    seed:api.projectionSeed(), representativeDistance:sim.representativeDistance, rows,
    summary:{teams:rows.length, maxAbsoluteSamplingGap:Math.max(...rows.map(row=>Math.abs(row.gap.simulationMinusAnalytic))),
      outWithNonzeroOdds:rows.filter(row=>row.simulation.projectedSeed === 'Out' && row.simulation.playoffPct > 0).map(row=>row.team),
      displayedExtremes:rows.filter(row=>Object.values(row.displayedOdds).some(value=>value==='0%' || value==='100%')).map(row=>row.team),
      nonzeroDisplayedAsZero:rows.filter(row=>oddsKeys.some(key=>row.simulation[key]>0 && row.displayedOdds[key]==='0%')).map(row=>row.team),
      sub100DisplayedAs100:rows.filter(row=>oddsKeys.some(key=>row.simulation[key]<100 && row.displayedOdds[key]==='100%')).map(row=>row.team),
      differentRatingInputs:rows.filter(row=>Math.abs(row.gap.leagueActiveMinusRoster)>1e-10 || Math.abs(row.gap.teamPageMinusRoster)>1e-10).map(row=>row.team)},
  };
  if (render) {
    if (!teams.includes(sampleTeam)) throw new Error(`Unknown sample team: ${sampleTeam}`);
    const previous = {team:api.S.team, ratingView:api.S.ratingView, scenario:api.S.scenario};
    try {
      api.S.team = sampleTeam;
      api.S.ratingView = 'power';
      api.S.scenario = {removed:new Set(), add:null};
      const teamHtml = api.teamPage(sampleTeam), labHtml = api.lab();
      const directory = api.teams();
      api.S.ratingView = 'luck';
      report.rendered = {sampleTeam,
        teamHero:text(teamHtml.match(/<div class="record-big">([\s\S]*?)<\/div>/)?.[1] || ''),
        rosterExpectedWins:labHtml.match(/<span>Expected wins<\/span><strong>([^<]+)<\/strong>/)?.[1] ?? null,
        directoryProjectedWins:[...directory.matchAll(/data-team="([^"]+)"[\s\S]*?([\d.]+) projected wins/g)].map(m=>({team:m[1],value:m[2]})),
        luckRankingRows:projectionRows(api.rankings()),
        divisionRows:projectionRows(api.divisionsPage()),
        playoffRows:projectionRows(api.playoffPicturePage()),
      };
    } finally { Object.assign(api.S, previous); }
  }
  return report;
}
