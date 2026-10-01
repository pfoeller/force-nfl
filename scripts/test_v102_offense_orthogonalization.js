const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const rel of ['data/matchup-data.js','model/live_profiles.js','model/unit_force_bridge.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE,U=ctx.window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};const near=(a,b,e=1e-9)=>Math.abs(Number(a)-Number(b))<=e;
const teams=['KC','DEN','BUF','WAS'];
const schedule=[
 {season:2026,week:1,game_id:'2026_01_KC_DEN',away:'KC',home:'DEN',awayScore:31,homeScore:10},
 {season:2026,week:1,game_id:'2026_01_BUF_WAS',away:'BUF',home:'WAS',awayScore:24,homeScore:20}
];
function teamRow(team,opp,rushEpa=0,sacks=2){return {season:'2026',week:'1',season_type:'REG',game_id:`2026_01_${team}_${opp}`,team,opponent_team:opp,attempts:'30',sacks_suffered:String(sacks),carries:'20',passing_epa:'2',rushing_epa:String(rushEpa),targets:'24',receiving_epa:'2',def_qb_hits:'2',def_sacks:'1',passing_cpoe:'3',penalties:'5',penalty_yards:'40'};}
const teamRows=[teamRow('KC','DEN',-20,8),teamRow('DEN','KC',0,2),teamRow('BUF','WAS',20,0),teamRow('WAS','BUF',0,2)];
function players(rbBoost=0){return [
 {season:'2026',week:'1',season_type:'REG',game_id:'g1',team:'KC',opponent_team:'DEN',position:'QB',position_group:'QB',player_display_name:'Patrick Mahomes',attempts:'30',sacks_suffered:'8',passing_epa:'-20',passing_cpoe:'4',carries:'4',rushing_epa:'1',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g1',team:'KC',opponent_team:'DEN',position:'WR',position_group:'WR',player_display_name:'KC WR',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',carries:'0',rushing_epa:'0',targets:'16',receiving_epa:'5'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g1',team:'KC',opponent_team:'DEN',position:'RB',position_group:'RB',player_display_name:'KC RB',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',carries:'18',rushing_epa:'2',targets:'8',receiving_epa:String(rbBoost)},
 {season:'2026',week:'1',season_type:'REG',game_id:'g2',team:'BUF',opponent_team:'WAS',position:'QB',position_group:'QB',player_display_name:'BUF QB',attempts:'30',sacks_suffered:'0',passing_epa:'20',passing_cpoe:'4',carries:'4',rushing_epa:'1',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g2',team:'BUF',opponent_team:'WAS',position:'WR',position_group:'WR',player_display_name:'BUF WR',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',carries:'0',rushing_epa:'0',targets:'16',receiving_epa:'5'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g2',team:'BUF',opponent_team:'WAS',position:'RB',position_group:'RB',player_display_name:'BUF RB',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',carries:'18',rushing_epa:'2',targets:'8',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g1',team:'DEN',opponent_team:'KC',position:'QB',position_group:'QB',player_display_name:'DEN QB',attempts:'30',sacks_suffered:'2',passing_epa:'0',passing_cpoe:'0',carries:'2',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'g2',team:'WAS',opponent_team:'BUF',position:'QB',position_group:'QB',player_display_name:'WAS QB',attempts:'30',sacks_suffered:'2',passing_epa:'0',passing_cpoe:'0',carries:'2',rushing_epa:'0',targets:'0',receiving_epa:'0'}
];}
const ctxMap={
 KC:{games:1,pointsAllowed:10,opponentDrives:10,coveragePassEpa:0,coveragePassAttempts:30,offensivePoints:31,offensiveDrives:10,offensePassEpa:6,offensePassAttempts:30,passProtectionDropbacks:38,passProtectionDisruptions:5},
 BUF:{games:1,pointsAllowed:20,opponentDrives:10,coveragePassEpa:0,coveragePassAttempts:30,offensivePoints:24,offensiveDrives:10,offensePassEpa:6,offensePassAttempts:30,passProtectionDropbacks:30,passProtectionDisruptions:5},
 DEN:{games:1,pointsAllowed:31,opponentDrives:10,coveragePassEpa:0,coveragePassAttempts:30,offensivePoints:10,offensiveDrives:10,offensePassEpa:0,offensePassAttempts:30,passProtectionDropbacks:32,passProtectionDisruptions:5},
 WAS:{games:1,pointsAllowed:24,opponentDrives:10,coveragePassEpa:0,coveragePassAttempts:30,offensivePoints:20,offensiveDrives:10,offensePassEpa:0,offensePassAttempts:30,passProtectionDropbacks:32,passProtectionDisruptions:5}
};
const common={teamRows,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,unitPriorReversion:.30,defensiveDriveContextByTeam:ctxMap,qbPolicy:'v102-attempts-opponent-adjusted',receiverPolicy:'v102-residual',olPolicy:'v102-pass-protection',offenseOutcomePolicy:'v102-ppd',rbPolicy:'v102-residual-receiving',coveragePolicy:'v101-attempts'};
const a=LP.buildProfiles({...common,playerRows:players(0)});
ok(Number(a.KC.qb.opponent_coverage_index)>Number(a.BUF.qb.opponent_coverage_index),'KC must receive tougher opponent Coverage context than BUF in fixture');
ok(Number(a.KC.qb.opponent_epa_adjustment)>Number(a.BUF.qb.opponent_epa_adjustment),'tougher pass defense must create more positive QB EPA adjustment');
ok(Number(a.KC.qb.opponent_adjusted_epa_per_attempt)>Number(a.KC.qb.actual_pass_epa_per_attempt),'strong-opponent context must lift identical raw QB pass EPA');
ok(a.KC.qb.source.includes('sack-free actual-pass'),'QB provenance must state sack-free actual-pass EPA');
// Change only aggregate sacks/rushing: V102 QB and OL are owned by PBP context, not those duplicate weekly fields.
const alteredRows=teamRows.map(r=>r.team==='KC'?{...r,sacks_suffered:'20',rushing_epa:'200'}:r);
const b=LP.buildProfiles({...common,teamRows:alteredRows,playerRows:players(0)});
ok(near(a.KC.qbIndex,b.KC.qbIndex),'aggregate sacks/rushing must not alter V102 QB when actual-pass PBP is unchanged');
ok(near(a.KC.olIndex,b.KC.olIndex),'team rushing EPA and aggregate sack arithmetic must not alter V102 OL when PBP disruptions are unchanged');
// RB receiving must not leak into WR/TE receiver grade.
const c=LP.buildProfiles({...common,playerRows:players(100)});
ok(near(a.KC.receiverIndex,c.KC.receiverIndex),'RB receiving EPA must not alter WR/TE receiver index');
ok(!near(a.KC.rbIndex,c.KC.rbIndex),'RB receiving EPA must remain owned by RB unit');
ok(a.KC.receivers.source.includes('WR')===false || a.KC.receivers.source.includes('V102'),'receiver provenance must be V102 residual');
ok(a.KC.ol.source.includes('pass-protection only'),'OL provenance must exclude team rushing EPA');
const W=U.WEIGHTS;
ok(!Object.prototype.hasOwnProperty.call(W,'offenseIndex'),'team EPA must not be a direct canonical bridge input in V102');
ok(Math.abs(W.pointsScoredPerDriveIndex-.20)<1e-12,'20% offensive outcome bridge slot must be points scored per drive');
ok(Math.abs(Object.values(W).reduce((x,y)=>x+y,0)-1)<1e-12,'V102 bridge weights must remain normalized');
ok(a.KC._offenseCompositePolicy==='v102-orthogonal','V102 live offense composite policy must be explicit');
console.log(`PASS: V102 orthogonal offense + opponent-adjusted QB (${n} checks)`);
