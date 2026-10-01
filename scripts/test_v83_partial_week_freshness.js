const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE;
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
function teamRow(team,opp,week,off=0.1){ return {
 season:'2026',season_type:'REG',week:String(week),game_id:`2026_0${week}_${team}_${opp}`,team,opponent_team:opp,
 attempts:'30',sacks_suffered:'2',carries:'25',passing_epa:String(off*32),rushing_epa:String(off*25),targets:'24',receiving_epa:String(off*24),
 def_qb_hits:'5',def_sacks:'2',passing_cpoe:'2',penalties:'5',penalty_yards:'45'
}; }
function playerRow(team,opp,week,pos='QB',id=null){ return {
 season:'2026',season_type:'REG',week:String(week),game_id:`2026_0${week}_${team}_${opp}`,team,opponent_team:opp,
 player_id:id||`${team}-${pos}`,player_name:`${team} ${pos}`,player_display_name:`${team} ${pos}`,position:pos,
 attempts:pos==='QB'?'30':'0',sacks_suffered:pos==='QB'?'2':'0',passing_epa:pos==='QB'?'4':'0',passing_cpoe:pos==='QB'?'2':'0',
 targets:pos==='WR'?'8':pos==='RB'?'4':'0',receiving_epa:pos==='WR'?'2':pos==='RB'?'0.5':'0',carries:pos==='RB'?'15':'0',rushing_epa:pos==='RB'?'1.5':'0'
}; }
const priorBase={offenseIndex:60,olIndex:60,frontIndex:60,coverageIndex:60,qbIndex:60,receiverIndex:60,rushIndex:60,passRushIndex:60,runDefenseIndex:60,rbIndex:60,defenseIndex:60,offenseComposite:60,off_epa:0.05,qb:{epa_per_play:0.05,cpoe:65},ol:{pressure_rate_allowed:0.25},dl:{pressure_rate:0.30},cov:{epa_allowed:0,cpoe_allowed:0},receivers:{adj_epa:0.1},rb:{composite:0.1},luck:{g:17},penalty:{},scoring:{}};
const teams=['ARI','ATL','BUF','DET','HOU','NO'];
const priors=Object.fromEntries(teams.map(t=>[t,JSON.parse(JSON.stringify(priorBase))]));
const schedule=[
 {week:1,home:'ARI',away:'ATL',homeScore:24,awayScore:20},
 {week:1,home:'BUF',away:'HOU',homeScore:36,awayScore:31},
 {week:1,home:'DET',away:'NO',homeScore:31,awayScore:30},
 // Only this Week 2 game has completed.
 {week:2,home:'BUF',away:'DET',homeScore:27,awayScore:24},
 {week:2,home:'ATL',away:'HOU',homeScore:null,awayScore:null}
];
const teamRows=[
 teamRow('ARI','ATL',1),teamRow('ATL','ARI',1),teamRow('BUF','HOU',1),teamRow('HOU','BUF',1),teamRow('DET','NO',1),teamRow('NO','DET',1)
];
const playerRows=[]; for(const [t,o] of [['ARI','ATL'],['ATL','ARI'],['BUF','HOU'],['HOU','BUF'],['DET','NO'],['NO','DET']]) { playerRows.push(playerRow(t,o,1,'QB'),playerRow(t,o,1,'WR'),playerRow(t,o,1,'RB')); }
let p=LP.buildProfiles({teamRows,playerRows,priorProfiles:priors,schedule,teamIds:teams,priorGames:1,useChartedPassRush:false,unitPriorReversion:.30});
// Teams whose latest completed game is Week 1 remain fully current.
ok(p.ARI._live.freshness.latestCompletedWeek===1,'ARI latest completed week should remain 1');
ok(p.ARI._live.freshness.teamStats.current===true,'ARI Week 1 team data must remain current during partial Week 2');
ok(p.ARI._live.freshness.playerStats.current===true,'ARI Week 1 player data must remain current during partial Week 2');
// BUF/DET played Thursday Week 2 but feed still only has their Week 1 rows: usable/pending, not blank.
for(const t of ['BUF','DET']){
 ok(p[t]._live.freshness.latestCompletedWeek===2,`${t} should require Week 2`);
 ok(p[t]._live.freshness.teamStats.current===false,`${t} team feed should be pending Week 2`);
 ok(p[t]._live.freshness.teamStats.usable===true,`${t} Week 1 team snapshot must remain usable`);
 ok(p[t]._live.freshness.teamStats.pending===true,`${t} should be marked pending`);
 ok(p[t]._live.freshness.playerStats.usable===true,`${t} Week 1 player snapshot must remain usable`);
 ok(Number.isFinite(Number(p[t].offenseIndex)),`${t} offense must not disappear during publication lag`);
 ok(Number.isFinite(Number(p[t].qbIndex)),`${t} QB must not disappear during publication lag`);
 ok(Math.abs(Number(p[t]._live.weight)-0.5)<1e-9,`${t} one published stat game must keep 50% live weight with one-game prior, not count the unpublished Week 2 game twice`);
}
// Once Week 2 rows arrive, only those teams advance and become current.
const teamRows2=teamRows.concat(teamRow('BUF','DET',2,.15),teamRow('DET','BUF',2,.08));
const playerRows2=playerRows.concat(playerRow('BUF','DET',2,'QB','BUF-QB'),playerRow('BUF','DET',2,'WR','BUF-WR'),playerRow('BUF','DET',2,'RB','BUF-RB'),playerRow('DET','BUF',2,'QB','DET-QB'),playerRow('DET','BUF',2,'WR','DET-WR'),playerRow('DET','BUF',2,'RB','DET-RB'));
p=LP.buildProfiles({teamRows:teamRows2,playerRows:playerRows2,priorProfiles:priors,schedule,teamIds:teams,priorGames:1,useChartedPassRush:false,unitPriorReversion:.30});
for(const t of ['BUF','DET']){
 ok(p[t]._live.freshness.teamStats.current===true,`${t} team data should become current when Week 2 arrives`);
 ok(p[t]._live.freshness.playerStats.current===true,`${t} player data should become current when Week 2 arrives`);
}
ok(p.ARI._live.freshness.teamStats.current===true,'ARI must stay current on Week 1 after BUF/DET Week 2 publishes');
console.log(`PASS: V83 partial-week team-specific freshness (${n} checks)`);
