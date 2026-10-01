const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const rel of ['data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
const schedule=[{season:2026,week:2,game_type:'REG',game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',awayScore:24,homeScore:21}];
// Deliberately make aggregate passing EPA tell the OPPOSITE story because it can
// include sack effects: BUF offense aggregate is very negative, KC very positive.
const teamRows=[
  {season:'2026',week:'2',season_type:'REG',game_id:'2026_02_KC_BUF',team:'KC',opponent_team:'BUF',attempts:'30',sacks_suffered:'4',carries:'20',passing_epa:'100',rushing_epa:'0',targets:'25',receiving_epa:'0',def_qb_hits:'2',def_sacks:'1',passing_cpoe:'0',penalties:'5',penalty_yards:'40'},
  {season:'2026',week:'2',season_type:'REG',game_id:'2026_02_KC_BUF',team:'BUF',opponent_team:'KC',attempts:'30',sacks_suffered:'4',carries:'20',passing_epa:'-100',rushing_epa:'0',targets:'25',receiving_epa:'0',def_qb_hits:'2',def_sacks:'1',passing_cpoe:'0',penalties:'5',penalty_yards:'40'}
];
const defensiveDriveContextByTeam={
  // KC defense allowed terrible EPA once passes actually left the QB's hand.
  KC:{games:1,pointsAllowed:21,opponentDrives:10,coveragePassEpa:90,coveragePassAttempts:30},
  // BUF defense was excellent on actual throws for this synthetic test.
  BUF:{games:1,pointsAllowed:24,opponentDrives:10,coveragePassEpa:-30,coveragePassAttempts:30}
};
const common={teamRows,playerRows:[],priorProfiles:M.profiles,schedule,teamIds:['KC','BUF'],priorGames:0,useChartedPassRush:false,unitPriorReversion:0,defensiveDriveContextByTeam};
const v101=LP.buildProfiles({...common,coveragePolicy:'v101-attempts'});
const hist=LP.buildProfiles({...common,coveragePolicy:'v100-historical'});
ok(v101.BUF.coverageIndex>v101.KC.coverageIndex,'V101 Coverage must follow actual-throw EPA, not sack-contaminated aggregate EPA');
ok(hist.KC.coverageIndex>hist.BUF.coverageIndex,'V100 historical reconstruction should preserve aggregate dropback EPA semantics');
ok(v101.KC.cov.coverage_epa_scope.includes('sacks/spikes excluded'),'KC coverage provenance must state sack exclusion');
ok(Number(v101.KC.cov.coverage_pass_attempts)===30,'coverage diagnostic must expose actual pass attempts');
ok(Number(v101.KC.cov.epa_allowed)===3,'KC V101 raw coverage EPA/attempt must equal 3.0');
ok(Number(v101.BUF.cov.epa_allowed)===-1,'BUF V101 raw coverage EPA/attempt must equal -1.0');
console.log(`PASS: V101 pass-rush/coverage separation (${n} checks)`);
