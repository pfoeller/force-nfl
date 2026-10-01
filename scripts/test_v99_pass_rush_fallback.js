const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8'),ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE;
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
function tr(team,opp,week,hits,sacks){return {season:'2026',season_type:'REG',week:String(week),game_id:`2026_0${week}_${team}_${opp}`,team,opponent_team:opp,attempts:'30',sacks_suffered:'2',carries:'24',passing_epa:'2',rushing_epa:'1',targets:'22',receiving_epa:'1',def_qb_hits:String(hits),def_sacks:String(sacks),passing_cpoe:'1',penalties:'5',penalty_yards:'40'};}
function pr(team,opp,week,pos){return {season:'2026',season_type:'REG',week:String(week),game_id:`2026_0${week}_${team}_${opp}`,team,opponent_team:opp,player_id:`${team}-${pos}`,player_name:`${team} ${pos}`,player_display_name:`${team} ${pos}`,position:pos,attempts:pos==='QB'?'30':'0',sacks_suffered:pos==='QB'?'2':'0',passing_epa:pos==='QB'?'2':'0',passing_cpoe:pos==='QB'?'1':'0',targets:pos==='WR'?'7':pos==='RB'?'3':'0',receiving_epa:'0.5',carries:pos==='RB'?'14':'0',rushing_epa:pos==='RB'?'1':'0'};}
const teams=['KC','DEN','BUF','JAX'];
const prior=Object.fromEntries(teams.map(t=>[t,{offenseIndex:55,olIndex:55,frontIndex:55,coverageIndex:55,qbIndex:55,receiverIndex:55,rushIndex:55,passRushIndex:55,runDefenseIndex:55,rbIndex:55,dl:{pressure_rate:.30,run_stop_rate:.50},ol:{pressure_rate_allowed:.25},qb:{epa_per_play:.1,cpoe:65},receivers:{adj_epa:.1},rb:{composite:.1},luck:{},penalty:{},scoring:{}}]));
const schedule=[
 {week:1,home:'KC',away:'DEN',homeScore:31,awayScore:10},{week:1,home:'BUF',away:'JAX',homeScore:27,awayScore:17},
 {week:2,home:'KC',away:'JAX',homeScore:33,awayScore:30},{week:2,home:'DEN',away:'BUF',homeScore:24,awayScore:20}
];
const rows=[tr('KC','DEN',1,8,4),tr('DEN','KC',1,3,1),tr('BUF','JAX',1,6,2),tr('JAX','BUF',1,2,1),tr('KC','JAX',2,4,0),tr('JAX','KC',2,5,2),tr('DEN','BUF',2,7,3),tr('BUF','DEN',2,3,1)];
const players=[]; for(const r of rows){for(const pos of ['QB','WR','RB'])players.push(pr(r.team,r.opponent_team,Number(r.week),pos));}
const p=LP.buildProfiles({teamRows:rows,playerRows:players,ftnRows:[],pfrPassRows:[],priorPfrPassRows:[],priorProfiles:prior,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true,unitPriorReversion:.30});
for(const t of teams){
 ok(Number.isFinite(Number(p[t].passRushIndex)),`${t} pass rush must be finite without advanced charting`);
 ok(p[t]._live.passRushProvider==='nflverse-weekly-disruption',`${t} must use nflverse disruption fallback`);
 ok(p[t]._live.passRushDataState==='live-current',`${t} fallback must be current`);
 ok(p[t]._live.passRushGames===2,`${t} fallback should represent both Week-1/2 games`);
 ok(p[t]._live.defensePassRushExcluded===false,`${t} defense must retain pass-rush weight`);
 ok(Number.isFinite(Number(p[t].defenseIndex)),`${t} defense rating must remain complete`);
}

const historical=LP.buildProfiles({teamRows:rows,playerRows:players,ftnRows:[],pfrPassRows:[],priorPfrPassRows:[],priorProfiles:prior,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true,unitPriorReversion:.30,passRushFallbackPolicy:'v98-historical'});
for(const t of teams){
 ok(historical[t].passRushIndex==null,`${t} V98 historical baseline must preserve unavailable Pass Rush when advanced charting was absent`);
 ok(historical[t]._live.passRushProvider==='unavailable',`${t} V98 historical baseline provider must remain unavailable`);
}
console.log(`PASS: V99 pass-rush fallback (${n} checks)`);
