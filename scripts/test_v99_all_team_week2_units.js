const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
const teams=Object.keys(D.teams).sort();
let n=0;const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
ok(teams.length===32,'fixture must cover all 32 canonical teams');
function gamePairs(week){
  const rotated=week===1?teams:[...teams.slice(1),teams[0]];
  const out=[];
  for(let i=0;i<32;i+=2) out.push([rotated[i],rotated[i+1]]);
  return out;
}
const schedule=[],teamRows=[],playerRows=[];
for(const week of [1,2]){
  for(const [away,home] of gamePairs(week)){
    const gid=`2026_${String(week).padStart(2,'0')}_${away}_${home}`;
    const ai=teams.indexOf(away), hi=teams.indexOf(home);
    const hs=20+((hi+week)%14), as=17+((ai+2*week)%14);
    schedule.push({season:2026,week,game_type:'REG',game_id:gid,away,home,awayScore:as,homeScore:hs,date:`2026-09-${String(7+week*7).padStart(2,'0')}`});
    for(const [team,opp,idx] of [[away,home,ai],[home,away,hi]]){
      const attempts=28+(idx%8), sacksSuffered=idx%4, defHits=3+((idx+week)%7), defSacks=(idx+week)%4;
      teamRows.push({season:'2026',week:String(week),season_type:'REG',game_id:gid,team,opponent_team:opp,attempts:String(attempts),sacks_suffered:String(sacksSuffered),carries:String(21+(idx%10)),passing_epa:String(-2+(idx%9)*0.8),rushing_epa:String(-1.5+(idx%8)*0.45),targets:String(20+(idx%12)),receiving_epa:String(-1+(idx%7)*0.5),def_qb_hits:String(defHits),def_sacks:String(defSacks),passing_cpoe:String(-4+(idx%11)),penalties:String(4+(idx%5)),penalty_yards:String(30+(idx%7)*8)});
      const base={season:'2026',week:String(week),season_type:'REG',game_id:gid,team,opponent_team:opp};
      playerRows.push({...base,player_id:`${team}-QB-${week}`,player_name:`${team} QB`,player_display_name:`${team} QB`,position:'QB',attempts:String(attempts),sacks_suffered:String(sacksSuffered),passing_epa:String(-1+(idx%9)*0.7),passing_cpoe:String(-3+(idx%10)),targets:'0',receiving_epa:'0',carries:'2',rushing_epa:'0'});
      playerRows.push({...base,player_id:`${team}-WR-${week}`,player_name:`${team} WR`,player_display_name:`${team} WR`,position:'WR',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',targets:String(6+(idx%5)),receiving_epa:String(-.3+(idx%7)*.25),carries:'0',rushing_epa:'0'});
      playerRows.push({...base,player_id:`${team}-RB-${week}`,player_name:`${team} RB`,player_display_name:`${team} RB`,position:'RB',attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',targets:String(2+(idx%4)),receiving_epa:String(-.2+(idx%6)*.15),carries:String(11+(idx%8)),rushing_epa:String(-.5+(idx%7)*.22)});
    }
  }
}
const profiles=LP.buildProfiles({teamRows,playerRows,ftnRows:[],pfrPassRows:[],priorPfrPassRows:[],priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true,unitPriorReversion:.30});
const unitKeys=['offenseIndex','defenseIndex','qbIndex','olIndex','receiverIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'];
for(const t of teams){
  const p=profiles[t];
  ok(!!p,`${t} profile missing`);
  for(const key of unitKeys) ok(Number.isFinite(Number(p[key])),`${t} ${key} must be finite through Week 2`);
  ok(p._live.passRushProvider==='nflverse-weekly-disruption',`${t} must use weekly disruption fallback without advanced pressure`);
  ok(p._live.passRushDataState==='live-current',`${t} pass rush fallback must be current`);
  ok(Number(p._live.passRushGames)===2,`${t} pass rush must include both games`);
  ok(p._live.defensePassRushExcluded===false,`${t} defense must retain pass-rush component`);
}
console.log(`PASS: V99 all-team Week-2 unit coverage (${n} checks across ${teams.length} teams)`);
