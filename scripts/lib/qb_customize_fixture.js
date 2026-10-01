import {appHarness} from './force_app_harness.js';
import {qbReference} from './qb_input_fixture.js';

// A declared synthetic league, not a production snapshot. Only the historical
// V5 reference and team identities come from tracked data. No files are written.
export function qbCustomizeFixture({weeks = 3, priorQbIndex = null} = {}) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 18) throw new Error('Fixture weeks must be an integer from 1 to 18');
  const {context} = appHarness();
  const teams = Object.keys(context.window.MODEL_DATA.teams).sort();
  const teamRows = [], playerRows = [], schedule = [], defensiveDriveGames = [];
  const order = [...teams];
  const side = (index, week) => {
    const epa = (index-15)*0.35 + (week-2)*(index%2 ? 1.7 : -1.7);
    return {offensive_drives:10, offensive_points:20+index%10,
      coverage_pass_epa:epa, coverage_pass_attempts:24, coverage_pass_successes:12+index%7,
      pass_yards:150+index*5+week*3, pass_tds:1+index%3, interceptions:index%2,
      sacks:2, sack_yards:14, cpoe:(index-15)*0.4+(week-2),
      qb_total_epa:epa+0.5, qb_plays:29, qb_rush_epa:0.5, qb_rush_attempts:3,
      pass_protection_dropbacks:29, pass_protection_disruptions:3+index%7,
      standard_rush_dropbacks:24, standard_rush_pressures:2+index%8,
      pressure_epa:-3+index*0.2, pressure_plays:6, pressure_successes:2+index%3,
      clean_epa:epa+3-index*0.2, clean_plays:23};
  };
  for (let week=1; week<=weeks; week++) {
    for (let i=0; i<teams.length/2; i++) {
      const home=order[i], away=order[teams.length-1-i];
      const homeStats=side(teams.indexOf(home),week), awayStats=side(teams.indexOf(away),week);
      const gameId=`synthetic-${week}-${home}-${away}`, date=new Date(Date.UTC(2026,8,7+7*(week-1))).toISOString().slice(0,10);
      schedule.push({week,date,home,away,homeScore:homeStats.offensive_points,awayScore:awayStats.offensive_points});
      const game = {week,home,away};
      for (const [label, stats] of [['home',homeStats],['away',awayStats]]) {
        for (const [key,value] of Object.entries(stats)) game[`${label}_${key}`]=value;
      }
      defensiveDriveGames.push(game);
      for (const [team,opponent,stats] of [[home,away,homeStats],[away,home,awayStats]]) {
        const row={season:2026,week,game_id:gameId,team,opponent_team:opponent,
          attempts:24,passing_epa:stats.coverage_pass_epa,carries:3,rushing_epa:0.5};
        teamRows.push(row);
        playerRows.push({...row,position:'QB',player_display_name:`Synthetic QB ${team}`,
          passing_yards:stats.pass_yards,passing_tds:stats.pass_tds,interceptions:stats.interceptions,
          passing_cpoe:stats.cpoe,sacks_suffered:2,sack_yards_lost:-14});
      }
    }
    order.splice(1,0,order.pop());
  }
  return {teamRows,playerRows,schedule,
    gameFlow:{qb_epa_definition:'v149-all-play-v2',v104_reference:structuredClone(qbReference),defensive_drive_games:defensiveDriveGames},
    priorProfiles:priorQbIndex === null ? {} : Object.fromEntries(teams.map(team => [team,{qbIndex:priorQbIndex}]))};
}
