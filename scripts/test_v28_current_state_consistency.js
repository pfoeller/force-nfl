const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const must=[
  'function currentTeamState(t, baseRatings = currentRatings())',
  'window.FORCE_CURRENT_TEAM_STATE = currentTeamState',
  'return currentTeamState(t, baseRatings).profile',
  'const awayState = currentTeamState(g.away)',
  'const homeState = currentTeamState(g.home)',
  "duel('Postgame FORCE Score'",
  "'Current FORCE Score'",
  "g.homeScore != null ? 'Current FORCE Score' : 'FORCE Score'",
  'Pregame → Postgame',
  'const state = currentTeamState(r.team)',
  'force: state.forceScore, elo: state.elo'
];
for(const x of must)if(!app.includes(x))throw new Error('Missing V28 current-state contract: '+x);
if(app.includes('const allowScenario = g.homeScore == null && g.awayScore == null'))throw new Error('Completed matchups must not suppress current QB/unit overlay');
if(app.includes("score(hist?.postAway ?? preAway), score(hist?.postHome ?? preHome)"))throw new Error('Frozen postgame rating may not masquerade as Current FORCE');
console.log('V28 canonical current-state consistency PASS');
