const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
if(!D||!M||!LP) throw new Error('missing model modules');
const teams=Object.keys(D.teams);if(teams.length!==32)throw new Error('expected 32 teams');
const checks=[],fails=[];
const check=(name,cond,detail='')=>{checks.push({name,ok:!!cond,detail});if(!cond)fails.push(`${name}${detail?' :: '+detail:''}`)};
const finite=v=>Number.isFinite(Number(v));
const up=(name,a,b)=>check(name,finite(a)&&finite(b)&&Number(b)>Number(a),`${a} -> ${b}`);
const down=(name,a,b)=>check(name,finite(a)&&finite(b)&&Number(b)<Number(a),`${a} -> ${b}`);
const near=(name,a,b,tol=1e-10)=>check(name,finite(a)&&Math.abs(Number(a)-Number(b))<=tol,`${a} vs ${b}`);

check('current defense weights exported',JSON.stringify(LP.DEFENSE_WEIGHTS)===JSON.stringify({coverageIndex:.36,passRushIndex:.16,runDefenseIndex:.28,pointsAllowedPerDriveIndex:.20}),JSON.stringify(LP.DEFENSE_WEIGHTS));

// Build a complete 32-team Week-1-like fixture. IND is deliberately mixed:
// respectable pass-rush disruption but disastrous run defense and coverage.
// That reproduces the failure mode the old combined front grade could hide.
const reserved=new Set(['IND','HOU','KC','DEN']);
const rest=teams.filter(t=>!reserved.has(t));
const pairs=[['IND','HOU'],['KC','DEN']];for(let i=0;i<rest.length;i+=2)pairs.push([rest[i],rest[i+1]]);
const teamRows=[],playerRows=[];
function row(team,opp,i){
  let x={season:'2026',week:'1',season_type:'REG',game_id:`2026_01_${team}_${opp}`,team,opponent_team:opp,
    attempts:String(31+(i%4)),sacks_suffered:String(1+(i%3)),passing_epa:String(-1.2+i*.08),passing_cpoe:String(-2.5+i*.12),
    carries:String(22+(i%6)),rushing_epa:String(-1.2+i*.06),targets:String(27+(i%5)),receiving_epa:String(-.6+i*.05),
    def_qb_hits:String(3+(i%5)),def_sacks:String(i%3)};
  if(team==='IND') Object.assign(x,{attempts:'30',sacks_suffered:'2',passing_epa:'0.5',passing_cpoe:'-1.0',carries:'23',rushing_epa:'1.0',targets:'27',receiving_epa:'1.0',def_qb_hits:'7',def_sacks:'1'});
  // HOU's offensive efficiency is the defensive input allowed by IND.
  if(team==='HOU') Object.assign(x,{attempts:'35',sacks_suffered:'1',passing_epa:'14.0',passing_cpoe:'9.0',carries:'25',rushing_epa:'10.0',targets:'31',receiving_epa:'8.0',def_qb_hits:'5',def_sacks:'2'});
  // KC gets a genuinely dominant all-around defensive game as a control.
  if(team==='KC') Object.assign(x,{attempts:'33',sacks_suffered:'1',passing_epa:'8.5',passing_cpoe:'5.5',carries:'27',rushing_epa:'3.5',targets:'31',receiving_epa:'7.0',def_qb_hits:'14',def_sacks:'2'});
  if(team==='DEN') Object.assign(x,{attempts:'38',sacks_suffered:'2',passing_epa:'-9.0',passing_cpoe:'-7.0',carries:'24',rushing_epa:'-7.0',targets:'34',receiving_epa:'-5.0',def_qb_hits:'4',def_sacks:'1'});
  return x;
}
function playersFor(r){
  return [
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'QB',position_group:'QB',player_display_name:`${r.team} QB`,attempts:r.attempts,sacks_suffered:r.sacks_suffered,passing_epa:r.passing_epa,passing_cpoe:r.passing_cpoe,carries:'3',rushing_epa:'0',targets:'0',receiving_epa:'0',def_penalty:'0',def_penalty_yards:'0'},
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'RB',position_group:'RB',player_display_name:`${r.team} RB`,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'',carries:r.carries,rushing_epa:r.rushing_epa,targets:'5',receiving_epa:String(Number(r.receiving_epa)*.2),def_penalty:'0',def_penalty_yards:'0'},
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'WR',position_group:'WR',player_display_name:`${r.team} WR`,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'',carries:'0',rushing_epa:'0',targets:String(Math.max(1,Number(r.targets)-5)),receiving_epa:String(Number(r.receiving_epa)*.8),def_penalty:'2',def_penalty_yards:'15'}
  ];
}
let i=0;for(const [a,b] of pairs){const ra=row(a,b,i++),rb=row(b,a,i++);teamRows.push(ra,rb);playerRows.push(...playersFor(ra),...playersFor(rb));}

const schedule=pairs.map(([away,home],idx)=>({week:1,date:'2026-09-13',away,home,awayScore:17+(idx%7),homeScore:24+(idx%5),status:'closed'}));
const before=LP.buildProfiles({teamRows:[],playerRows:[],schedule:[],priorProfiles:M.profiles,teamIds:teams,priorGames:1});
const after=LP.buildProfiles({teamRows,playerRows,schedule,priorProfiles:M.profiles,teamIds:teams,priorGames:1});

for(const t of teams){
  const b=before[t],a=after[t];
  for(const k of ['passRushIndex','runDefenseIndex','coverageIndex','defenseIndex','frontIndex']){
    check(`${t} before ${k} finite/bounded`,finite(b[k])&&b[k]>=0&&b[k]<=100,String(b[k]));
    check(`${t} after ${k} finite/bounded`,finite(a[k])&&a[k]>=0&&a[k]<=100,String(a[k]));
  }
  const bRaw=.36*b.coverageIndex+.16*b.passRushIndex+.28*b.runDefenseIndex+.20*b.pointsAllowedPerDriveIndex;
  near(`${t} before defense raw identity`,b.defenseCompositeRaw,bRaw);
  near(`${t} before defense calibrated identity`,b.defenseIndex,LP.calibrateComposite(bRaw,LP.COMPOSITE_V108.defense));
  const aRaw=.36*a.coverageIndex+.16*a.passRushIndex+.28*a.runDefenseIndex+.20*a.pointsAllowedPerDriveIndex;
  near(`${t} after defense raw identity`,a.defenseCompositeRaw,aRaw);
  near(`${t} after defense calibrated identity`,a.defenseIndex,LP.calibrateComposite(aRaw,LP.COMPOSITE_V108.defense));
}

const ib=before.IND,ia=after.IND;
up('IND mixed fixture improves pass rush',ib.passRushIndex,ia.passRushIndex);
up('IND legacy combined front also rises (old masking failure reproduced)',ib.frontIndex,ia.frontIndex);
down('IND mixed fixture worsens run defense',ib.runDefenseIndex,ia.runDefenseIndex);
down('IND mixed fixture worsens coverage',ib.coverageIndex,ia.coverageIndex);
down('IND total defense falls despite improved pass rush',ib.defenseIndex,ia.defenseIndex);
near('IND raw disruption rate is 8/36',ia.dl.pressure_rate,8/36,1e-12);
near('IND raw rush EPA/play allowed is 10/25',ia.dl.run_epa_allowed,10/25,1e-12);
near('IND raw pass EPA/dropback allowed is 14/36',ia.cov.epa_allowed,14/36,1e-12);
near('IND raw CPOE allowed is +9',ia.cov.cpoe_allowed,9,1e-12);

const kb=before.KC,ka=after.KC;
up('KC dominant fixture improves pass rush',kb.passRushIndex,ka.passRushIndex);
up('KC dominant fixture improves run defense',kb.runDefenseIndex,ka.runDefenseIndex);
up('KC dominant fixture improves coverage',kb.coverageIndex,ka.coverageIndex);
up('KC dominant fixture improves total defense',kb.defenseIndex,ka.defenseIndex);

// No-live state must still expose the V29 components, so Rankings/Team/Matchup do
// not show blanks while waiting for the current-season stats fetch.
for(const t of teams){
  check(`${t} no-live component source present`,before[t]._live?.source?.includes('component priors'),String(before[t]._live?.source));
}

const report={
  version:29,checks:checks.length,failures:fails,
  defenseWeights:LP.DEFENSE_WEIGHTS,
  ind:{
    before:{passRush:ib.passRushIndex,runDefense:ib.runDefenseIndex,coverage:ib.coverageIndex,defense:ib.defenseIndex,legacyFront:ib.frontIndex},
    after:{passRush:ia.passRushIndex,runDefense:ia.runDefenseIndex,coverage:ia.coverageIndex,defense:ia.defenseIndex,legacyFront:ia.frontIndex},
    raw:{pressureRate:ia.dl.pressure_rate,runEpaAllowed:ia.dl.run_epa_allowed,passEpaAllowed:ia.cov.epa_allowed,cpoeAllowed:ia.cov.cpoe_allowed}
  },
  kc:{
    before:{passRush:kb.passRushIndex,runDefense:kb.runDefenseIndex,coverage:kb.coverageIndex,defense:kb.defenseIndex,legacyFront:kb.frontIndex},
    after:{passRush:ka.passRushIndex,runDefense:ka.runDefenseIndex,coverage:ka.coverageIndex,defense:ka.defenseIndex,legacyFront:ka.frontIndex}
  }
};
fs.writeFileSync(path.join(root,'benchmarks/v29_defense_components.json'),JSON.stringify(report,null,2));
if(fails.length){console.error(fails.join('\n'));process.exit(1);}
console.log(`V29 defense-component regression PASS (${checks.length} checks)`);
console.log(JSON.stringify({ind:report.ind,kc:report.kc},null,2));
