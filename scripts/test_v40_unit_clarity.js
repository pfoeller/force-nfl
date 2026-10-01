const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let checks=0;
function ok(cond,msg){checks++;if(!cond)throw new Error(msg);}
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes("sortHeader('Pass Rush','passRush')"),'Units table must label pass-rush explicitly');
ok(app.includes("sortHeader('Run Defense','runDef')"),'Units table must label run defense explicitly');
ok(app.includes("sortHeader('RB','rb')"),'Units table must expose the first-class RB unit explicitly');
ok(!app.includes("sortHeader('Rush','passRush')"),'ambiguous Rush header must be removed');
ok(app.includes('Pass Rush uses the best fresh source available') || app.includes('Pass Rush uses charted pressure as the base signal') || app.includes('Pass Rush is FTN-first') || app.includes('Pass Rush has a hard freshness contract') || app.includes('Pass Rush = non-sack QB hits + sacks per opponent dropback'),'Units note must define pass-rush semantics');
ok(app.includes('A pressure is 1.00 unit, hit 1.20, sack 1.60.') || app.includes('a hit is 1.20 units and a sack 1.60') || app.includes('Does not include hurries or pass-rush win rate.'),'Units hover detail must explain pass-rush metric');

const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/live_profiles.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
const teamRows=[
  {season:'2026',week:'1',game_id:'2026_01_DAL_NYG',team:'DAL',opponent_team:'NYG',attempts:'34',sacks_suffered:'0',carries:'18',def_qb_hits:'6',def_sacks:'2'},
  {season:'2026',week:'1',game_id:'2026_01_DAL_NYG',team:'NYG',opponent_team:'DAL',attempts:'29',sacks_suffered:'2',carries:'37',def_qb_hits:'0',def_sacks:'0'}
];
const dalPriorGames=0.8239376176134201;
const schedule=[{week:1,date:'2026-09-13',away:'DAL',home:'NYG',awayScore:20,homeScore:28,status:'closed'}];
const profiles=LP.buildProfiles({teamRows,playerRows:[],schedule,priorProfiles:M.profiles,teamIds:Object.keys(D.teams),priorGames:1,priorGamesByTeam:{DAL:dalPriorGames}});
const dal=profiles.DAL;
ok(Math.abs(dal.dl.pressure_rate-(8/31))<1e-12,'Dallas proxy must use 6 hits + 2 sacks over 31 dropbacks');
ok(Math.abs(dal._live.weight-0.5482643651532757)<1e-12,'Dallas Week-1 regime-aware live weight must reproduce 54.8%');
ok(Math.abs(dal.passRushIndex-95.62836482406396)<1e-10,'Dallas pass-rush score must reproduce 95.6 before display rounding');
ok(Math.round(dal.passRushIndex)===96,'Dallas displayed score must explain current 96');
console.log(`OK: ${checks} V40 unit-label/explainability assertions`);
