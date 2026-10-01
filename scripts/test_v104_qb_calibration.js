const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const rel of ['data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
// Synthetic 2025 two-game-window reference with a wide historical distribution.
const qbBench=[];const olBench=[];
for(let i=0;i<400;i++){
  const z=(i-199.5)/100;
  qbBench.push(0.10+0.18*Math.tanh(z));
  olBench.push(0.18+0.07*Math.tanh(z));
}
const hist={sample_windows:{'1':{qb_pass_epa:qbBench,ol_disruption_rate:olBench},'2':{qb_pass_epa:qbBench,ol_disruption_rate:olBench},'3':{qb_pass_epa:qbBench,ol_disruption_rate:olBench},'4':{qb_pass_epa:qbBench,ol_disruption_rate:olBench}}};
const teams=Object.keys(M.profiles),playerRows=[],teamRows=[],schedule=[],drive={};
for(const t of teams){
  const livePass=t==='SF'?0.27:t==='BUF'?0.24:t==='KC'?0.20:0.10;
  const cpoe=t==='SF'?10:t==='BUF'?7:t==='KC'?-2:0;
  for(let w=1;w<=2;w++){
    playerRows.push({season:'2026',week:String(w),season_type:'REG',game_id:`${t}-${w}`,team:t,opponent_team:'CLE',position:'QB',position_group:'QB',player_display_name:M.profiles[t].qb?.qb||`${t} QB`,attempts:'30',sacks_suffered:'0',passing_epa:String(livePass*30),passing_cpoe:String(cpoe),carries:'2',rushing_epa:t==='BUF'?'1':'0',targets:'0',receiving_epa:'0'});
    teamRows.push({season:'2026',week:String(w),season_type:'REG',game_id:`${t}-${w}`,team:t,opponent_team:'CLE',attempts:'30',sacks_suffered:'0',carries:'20',passing_epa:String(livePass*30),rushing_epa:'0',targets:'20',receiving_epa:'0',def_qb_hits:'0',def_sacks:'0',passing_cpoe:String(cpoe),penalties:'0',penalty_yards:'0'});
  }
  drive[t]={games:2,offensePassEpa:livePass*60,offensePassAttempts:60,passProtectionDropbacks:60,passProtectionDisruptions:10,qbRushEpa:t==='BUF'?2:0,qbRushAttempts:4};
  schedule.push({season:2026,week:1,game_id:`s-${t}-1`,home:t,away:'ZZZ',homeScore:24,awayScore:17},{season:2026,week:2,game_id:`s-${t}-2`,home:t,away:'ZZZ',homeScore:27,awayScore:20});
}
const accelerated=Object.fromEntries(teams.map(t=>[t,.25]));
const out=LP.buildProfiles({playerRows,teamRows,schedule,priorProfiles:M.profiles,historicalReference:hist,teamIds:teams,priorGames:1,priorGamesByTeam:accelerated,unitPriorReversion:.30,defensiveDriveContextByTeam:drive,qbPolicy:'v104-historical-calibrated',receiverPolicy:'v102-residual',olPolicy:'v102-pass-protection',offenseOutcomePolicy:'v102-ppd',rbPolicy:'v102-residual-receiving',coveragePolicy:'v101-attempts'});
ok(out.SF.qb.pass_epa_score<100,'same-sized empirical QB benchmark must not trivially saturate to 100');
ok(out.SF.qb.cpoe_score < LP.qbCpoeScore(10),'60-attempt CPOE must be shrunk below raw transform');
ok(out.SF.qb.prior_games_used===1,'QB prior floor must override 0.25-game early acceleration in first four games');
ok(out.SF._live.qbPriorGames===1,'QB prior floor must be visible in diagnostics');
ok(out.BUF.qb.rush_bonus>0,'positive QB rushing bonus retained');
ok(out.KC.qb.rush_bonus===0,'zero rushing should not alter QB grade');
ok(out.SF.olIndex!=null,'OL same-sized historical benchmark must produce a live rating');
const rbPriorVals=Object.values(M.profiles).map(LP.priorRbOrthogonalComposite).filter(Number.isFinite);
ok(rbPriorVals.length>=20,'like-for-like 2025 RB residual benchmark should be constructible');
console.log(`PASS: V104 QB/OL/RB calibration (${n} checks)`);
