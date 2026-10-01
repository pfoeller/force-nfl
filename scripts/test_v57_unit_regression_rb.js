const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}}; vm.createContext(ctx);
for (const rel of ['model/live_profiles.js','model/unit_force_bridge.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const LP=ctx.window.FORCE_LIVE_PROFILE, U=ctx.window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)}; const near=(a,b,e,m)=>{n++; if(Math.abs(Number(a)-Number(b))>e) throw new Error(`${m}: ${a} != ${b}`)};
near(LP.regressUnitIndex(90,.30),78,1e-9,'90 unit regresses 30% toward 50');
near(LP.regressUnitIndex(20,.30),29,1e-9,'20 unit regresses 30% toward 50');
ok(U.WEIGHTS.rbIndex===.07 && !Object.prototype.hasOwnProperty.call(U.WEIGHTS,'rushIndex'),'bridge uses RB rather than team rushing');

const teams=['KC','DEN','BUF'];
const priors={
 KC:{offenseIndex:80,olIndex:20,frontIndex:70,coverageIndex:70,qbIndex:80,receiverIndex:70,rushIndex:60,rb:{composite:.10},dl:{pressure_rate:.25,run_stop_rate:.60},scoring:{}},
 DEN:{offenseIndex:20,olIndex:80,frontIndex:30,coverageIndex:30,qbIndex:20,receiverIndex:30,rushIndex:40,rb:{composite:-.10},dl:{pressure_rate:.15,run_stop_rate:.40},scoring:{}},
 BUF:{offenseIndex:50,olIndex:50,frontIndex:50,coverageIndex:50,qbIndex:50,receiverIndex:50,rushIndex:50,rb:{composite:0},dl:{pressure_rate:.20,run_stop_rate:.50},scoring:{}}
};
// No completed games: verify the displayed preseason unit state itself is regressed.
let out=LP.buildProfiles({priorProfiles:priors,teamIds:teams,unitPriorReversion:.30});
near(out.KC.offenseIndex,71,1e-9,'KC offense prior regressed');
near(out.DEN.olIndex,71,1e-9,'DEN OL prior regressed');
near(out.KC.rbIndex,85,1e-9,'top RB prior percentile 100 regresses to 85');
near(out.DEN.rbIndex,15,1e-9,'bottom RB prior percentile 0 regresses to 15');
near(out.BUF.rbIndex,50,1e-9,'median RB prior remains 50');
ok(out.KC._preseasonUnitPrior && out.KC._preseasonUnitPrior.offenseIndex===71,'preseason prior exposed for bridge');

function teamRow(team,opp,rushEpa){return {season:'2026',week:'1',season_type:'REG',game_id:`1_${team}_${opp}`,team,opponent_team:opp,passing_epa:'0',rushing_epa:String(rushEpa),attempts:'20',sacks_suffered:'1',carries:'20',receiving_epa:'0',targets:'20',passing_cpoe:'0'};}
function rb(team,opp,name,carries,rushEpa,targets,recEpa){return {season:'2026',week:'1',season_type:'REG',game_id:`1_${team}_${opp}`,team,opponent_team:opp,position:'RB',player_display_name:name,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'0',carries:String(carries),rushing_epa:String(rushEpa),targets:String(targets),receiving_epa:String(recEpa)};}
const teamRows=[teamRow('KC','DEN',4),teamRow('DEN','KC',-3),teamRow('BUF','KC',0)];
const playerRows=[rb('KC','DEN','KC RB1',15,4.5,5,1),rb('KC','DEN','KC RB2',5,.5,2,.2),rb('DEN','KC','DEN RB',20,-3,4,-.5),rb('BUF','KC','BUF RB',20,0,4,0)];
const schedule=[{week:1,date:'2026-09-01',away:'DEN',home:'KC',awayScore:17,homeScore:31},{week:1,date:'2026-09-01',away:'BUF',home:'DEN',awayScore:20,homeScore:17}];
out=LP.buildProfiles({teamRows,playerRows,priorProfiles:priors,schedule,teamIds:teams,priorGames:1,unitPriorReversion:.30});
ok(Number.isFinite(out.KC.rbIndex),'live RB index exists');
ok(out.KC.rbIndex>out.DEN.rbIndex,'better RB room grades higher');
ok(out.KC.rb && Number.isFinite(out.KC.rb.room_composite),'RB room composite exposed');
console.log(`PASS: V57 offseason-unit regression + RB unit (${n} checks)`);
