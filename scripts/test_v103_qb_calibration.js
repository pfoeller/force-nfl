const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const rel of ['data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const M=ctx.window.MATCHUP_DATA, LP=ctx.window.FORCE_LIVE_PROFILE;
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};const near=(a,b,e=1e-9)=>Math.abs(Number(a)-Number(b))<=e;

ok(LP.QB_V103.rushingBonusCap===12,'V103 first-pass rushing bonus cap should be +12');
const eliteRush=LP.qbRushingBonus(25,100);
ok(eliteRush>8 && eliteRush<=12,'elite full-season QB rushing must be able to add well beyond +4 while respecting cap');
ok(LP.qbRushingBonus(-5,20)===0,'negative QB rushing EPA must never lower the QB grade');
ok(LP.qbRushingBonus(0,20)===0,'neutral QB rushing EPA must not alter the QB grade');
const cpoe0=LP.qbCpoeScore(0),cpoe4=LP.qbCpoeScore(4);
ok(near(cpoe0,50),'0 CPOE must be neutral');
ok(cpoe4>50,'positive CPOE must raise the passing core');

const teams=Object.keys(M.profiles);
const playerRows=[],teamRows=[],schedule=[],drive={};
for(const t of teams){
  const p=M.profiles[t];
  const priorRaw=Number.isFinite(Number(p.qb?.epaoe))?Number(p.qb.epaoe):Number(p.qb?.epa_per_play)||0;
  const livePass=(t==='KC')?0.27:priorRaw+0.08; // sack-free metric level shift for synthetic 2026 sample
  for(let w=1;w<=2;w++) {
    playerRows.push({season:'2026',week:String(w),season_type:'REG',game_id:`${t}-${w}`,team:t,opponent_team:'CLE',position:'QB',position_group:'QB',player_display_name:p.qb?.qb||`${t} QB`,attempts:'30',sacks_suffered:'0',passing_epa:String(livePass*30),passing_cpoe:t==='KC'?'4':'0',carries:'3',rushing_epa:t==='KC'?'1.5':'0',targets:'0',receiving_epa:'0'});
    teamRows.push({season:'2026',week:String(w),season_type:'REG',game_id:`${t}-${w}`,team:t,opponent_team:'CLE',attempts:'30',sacks_suffered:'0',carries:'20',passing_epa:String(livePass*30),rushing_epa:'0',targets:'20',receiving_epa:'0',def_qb_hits:'0',def_sacks:'0',passing_cpoe:t==='KC'?'4':'0',penalties:'0',penalty_yards:'0'});
  }
  drive[t]={games:2,offensePassEpa:livePass*60,offensePassAttempts:60,qbRushEpa:t==='KC'?3:0,qbRushAttempts:6};
  schedule.push({season:2026,week:1,game_id:`s-${t}-1`,home:t,away:'ZZZ',homeScore:24,awayScore:17},{season:2026,week:2,game_id:`s-${t}-2`,home:t,away:'ZZZ',homeScore:27,awayScore:20});
}
const common={playerRows,teamRows,schedule,priorProfiles:M.profiles,teamIds:teams,priorGames:1,unitPriorReversion:.30,defensiveDriveContextByTeam:drive,qbPolicy:'v103-stable-pass-rush-bonus',receiverPolicy:'v102-residual',olPolicy:'v102-pass-protection',offenseOutcomePolicy:'v102-ppd',rbPolicy:'v102-residual-receiving',coveragePolicy:'v101-attempts'};
const withRush=LP.buildProfiles(common);
const kc=withRush.KC;
ok(Math.abs(kc._preseasonUnitPrior.qbIndex-64.7)<1e-9,'KC regressed preseason QB anchor must remain 64.7');
ok(kc.qb.pass_epa_score>70,'excellent KC opponent-adjusted passing EPA must grade clearly above average on stable benchmark');
ok(kc.qb.pass_core_score>65,'excellent pass EPA + positive CPOE must create a strong passing core');
ok(kc.qb.rush_bonus>0,'positive QB rushing EPA must add a bonus');
ok(kc.qbIndex>kc._preseasonUnitPrior.qbIndex,'strong two-game passing evidence plus positive rushing must move KC above its 64.7 preseason anchor');
ok(kc.qb.rush_source==='pbp-kneels-excluded','V103 should prefer PBP QB rushing when supplied');

const noRushDrive=Object.fromEntries(Object.entries(drive).map(([t,v])=>[t,{...v,qbRushEpa:0}]));
const negativeRushDrive=Object.fromEntries(Object.entries(drive).map(([t,v])=>[t,{...v,qbRushEpa:t==='KC'?-8:0}]));
const noRush=LP.buildProfiles({...common,defensiveDriveContextByTeam:noRushDrive});
const negativeRush=LP.buildProfiles({...common,defensiveDriveContextByTeam:negativeRushDrive});
ok(near(noRush.KC.qbIndex,negativeRush.KC.qbIndex),'negative rushing EPA must not drag the V103 QB index below the same passing-only case');
ok(withRush.KC.qbIndex>noRush.KC.qbIndex,'positive rushing EPA must add to, not replace, the passing grade');

// One extreme peer should not change the median-translated prior benchmark for KC.
const outlierRows=playerRows.map(r=>r.team==='NYJ'?{...r,passing_epa:String(30*4.0)}:r);
const outlierDrive={...drive,NYJ:{...drive.NYJ,offensePassEpa:240}};
const outlier=LP.buildProfiles({...common,playerRows:outlierRows,defensiveDriveContextByTeam:outlierDrive});
ok(near(withRush.KC.qb.pass_epa_score,outlier.KC.qb.pass_epa_score),'single unrelated QB outlier must not change KC stable pass-EPA score');
console.log(`PASS: V103 stable QB passing core + positive rushing bonus (${n} checks)`);
