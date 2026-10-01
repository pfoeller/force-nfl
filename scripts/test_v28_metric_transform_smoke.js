const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/forecast_v2.js','model/live_profiles.js']) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,F=ctx.window.SIGNAL_FORECAST_V2,LP=ctx.window.FORCE_LIVE_PROFILE;
if(!D||!M||!F||!LP) throw new Error('missing model modules');
const teams=Object.keys(D.teams); if(teams.length!==32) throw new Error('expected 32 teams');
const checks=[],fails=[];
const check=(name,cond,detail='')=>{checks.push({name,ok:!!cond,detail});if(!cond)fails.push(`${name}${detail?' :: '+detail:''}`)};
const finite=v=>Number.isFinite(Number(v));
const up=(name,a,b)=>check(name,finite(a)&&finite(b)&&Number(b)>Number(a),`${a} -> ${b}`);
const down=(name,a,b)=>check(name,finite(a)&&finite(b)&&Number(b)<Number(a),`${a} -> ${b}`);
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?undefined:a[k],o);

// Percentile semantics themselves are part of the transform: ties must not depend on team order.
const ties=LP.percentileMap({A:1,B:1,C:1},true);
check('equal observations share a neutral percentile',ties.A===50&&ties.B===50&&ties.C===50,JSON.stringify(ties));
const endpoints=LP.percentileMap({A:1,B:2,C:3},true);
check('unique percentile endpoints remain 0/50/100',endpoints.A===0&&endpoints.B===50&&endpoints.C===100,JSON.stringify(endpoints));

const pairs=[];const rest=teams.filter(t=>!['KC','DEN'].includes(t));pairs.push(['KC','DEN']);for(let i=0;i<rest.length;i+=2)pairs.push([rest[i],rest[i+1]]);
const teamRows=[],playerRows=[],schedule=[],history={};
function row(team,opp,i){
  // Mild deterministic league variation, then explicit KC/DEN stress overrides.
  let x={season:'2026',week:'1',season_type:'REG',game_id:`2026_01_${team}_${opp}`,team,opponent_team:opp,
    attempts:String(31+(i%4)),sacks_suffered:String(1+(i%3)),passing_epa:String(-1.5+i*.12),passing_cpoe:String(-3+i*.18),
    carries:String(22+(i%7)),rushing_epa:String(-1+i*.08),targets:String(27+(i%6)),receiving_epa:String(-.8+i*.07),
    penalties:String(3+(i%4)),penalty_yards:String(20+(i%5)*7),def_qb_hits:String(3+(i%5)),def_sacks:String(i%4)};
  if(team==='KC') Object.assign(x,{attempts:'33',sacks_suffered:'1',passing_epa:'8.5',passing_cpoe:'5.5',carries:'27',rushing_epa:'3.5',targets:'31',receiving_epa:'7.0',penalties:'2',penalty_yards:'15',def_qb_hits:'18',def_sacks:'1'});
  if(team==='DEN') Object.assign(x,{attempts:'38',sacks_suffered:'2',passing_epa:'-7.5',passing_cpoe:'-5.0',carries:'24',rushing_epa:'8.0',targets:'34',receiving_epa:'-5.0',penalties:'8',penalty_yards:'70',def_qb_hits:'4',def_sacks:'1'});
  return x;
}
function playersFor(r,i){
  const qAtt=Number(r.attempts), sacks=Number(r.sacks_suffered), passEpa=Number(r.passing_epa), cpoe=Number(r.passing_cpoe), carries=Number(r.carries), rushEpa=Number(r.rushing_epa), targets=Number(r.targets), recvEpa=Number(r.receiving_epa);
  const kc=r.team==='KC', den=r.team==='DEN';
  return [
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'QB',position_group:'QB',player_display_name:`${r.team} QB`,attempts:String(qAtt),sacks_suffered:String(sacks),passing_epa:String(passEpa),passing_cpoe:String(cpoe),carries:'3',rushing_epa:String(kc?'1.5':den?'-0.8':'0.1'),targets:'0',receiving_epa:'0',def_penalty:'0',def_penalty_yards:'0'},
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'RB',position_group:'RB',player_display_name:`${r.team} RB`,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'',carries:String(Math.max(1,carries-4)),rushing_epa:String(rushEpa),targets:'5',receiving_epa:String(recvEpa*.2),def_penalty:'0',def_penalty_yards:'0'},
    {season:'2026',week:'1',season_type:'REG',game_id:r.game_id,team:r.team,opponent_team:r.opponent_team,position:'WR',position_group:'WR',player_display_name:`${r.team} WR`,attempts:'0',sacks_suffered:'0',passing_epa:'0',passing_cpoe:'',carries:'0',rushing_epa:'0',targets:String(Math.max(1,targets-5)),receiving_epa:String(recvEpa*.8),def_penalty:String(kc?1:den?5:2+(i%2)),def_penalty_yards:String(kc?5:den?48:15+(i%5))}
  ];
}
let ti=0;
for(const [a,b] of pairs){
  const ra=row(a,b,ti++),rb=row(b,a,ti++);teamRows.push(ra,rb);playerRows.push(...playersFor(ra,ti),...playersFor(rb,ti));
  const home=a,away=b;const hs=home==='KC'?31:home==='DEN'?10:23+(ti%5),as=away==='KC'?31:away==='DEN'?10:20+(ti%4);
  const g={week:1,date:'2026-09-13',home,away,homeScore:hs,awayScore:as};schedule.push(g);history[`1|2026-09-13|${away}|${home}`]={independent:{probability:.52}};
}
const before=LP.buildProfiles({teamRows:[],playerRows:[],priorProfiles:M.profiles,schedule:[],gameHistory:{},teamIds:teams,priorGames:1});
const after=LP.buildProfiles({teamRows,playerRows,priorProfiles:M.profiles,schedule,gameHistory:history,teamIds:teams,priorGames:1});
const kb=before.KC,ka=after.KC;

// Specific reported regression: ~half of opponent dropbacks disrupted must not lower KC's elite front,
// even when the same fixture deliberately gives KC the worst run-defense observation in the league.
check('KC stress fixture is ~half-dropback disruption',ka.dl.pressure_rate>=.47&&ka.dl.pressure_rate<=.50,String(ka.dl.pressure_rate));
up('KC ~48% disruption cannot lower elite defensive-front grade',kb.frontIndex,ka.frontIndex);
check('KC stress fixture has deliberately bad run-defense input',ka.dl.run_epa_allowed>0,String(ka.dl.run_epa_allowed));

const unitPaths=['offenseIndex','olIndex','frontIndex','passRushIndex','runDefenseIndex','coverageIndex','qbIndex','receiverIndex','rushIndex','defenseIndex','offenseComposite'];
const livePaths=[
  'off_epa','qb.epa_per_play','qb.cpoe','qb.live_epa_per_play','qb.live_cpoe','ol.pressure_rate_allowed','ol.sack_rate_allowed','ol.qb_hits_allowed','ol.sacks_allowed',
  'dl.pressure_rate','dl.sack_rate','dl.qb_hits','dl.sacks','dl.run_epa_allowed','cov.press_adj_epa','cov.epa_allowed','cov.cpoe_allowed','receivers.adj_epa','rb.rush_epa','rb.adj_rush','rb.adj_recv',
  'luck.w','luck.l','luck.g','luck.exp_w','luck.exp_l','luck.luck','luck.luck_pct','penalty.net_pen_yards','penalty.net_pen_yards_per_game','penalty.pen_count_for','penalty.pen_count_against','penalty.pen_yards_for','penalty.pen_yards_against',
  'scoring.ppg_for','scoring.ppg_against','_live.games','_live.weight','_live.offEpa','_live.passEpa','_live.qbEpa','_live.qbCpoe','_live.rushEpa','_live.recvEpa','_live.sackAllowed','_live.pressureAllowedRate','_live.frontPressureRate','_live.frontSackRate','_live.runEpaAllowed','_live.passEpaAllowed','_live.cpoeAllowed','_live.penaltyYardsNet'
];
const beforeAfterMatrix={};
for(const t of teams){
  const b=before[t],a=after[t];beforeAfterMatrix[t]={};
  for(const p of unitPaths){
    check(`${t} before ${p} finite/bounded`,finite(get(b,p))&&get(b,p)>=0&&get(b,p)<=100,String(get(b,p)));
    check(`${t} after ${p} finite/bounded`,finite(get(a,p))&&get(a,p)>=0&&get(a,p)<=100,String(get(a,p)));
    beforeAfterMatrix[t][p]={before:get(b,p),after:get(a,p)};
  }
  for(const p of livePaths){
    const av=get(a,p); check(`${t} after ${p} finite`,finite(av),String(av));
    const bv=get(b,p); beforeAfterMatrix[t][p]={before:finite(bv)?Number(bv):null,after:Number(av)};
  }
  const offRaw=.45*a.offenseIndex+.25*a.qbIndex+.15*a.receiverIndex+.15*a.olIndex;
  check(`${t} offense raw identity`,Math.abs(a.offenseCompositeRaw-offRaw)<1e-8,String(a.offenseCompositeRaw));
  check(`${t} offense calibrated identity`,Math.abs(a.offenseComposite-LP.calibrateComposite(offRaw,LP.COMPOSITE_V108.offense))<1e-8,String(a.offenseComposite));
  const defRaw=.36*a.coverageIndex+.16*a.passRushIndex+.28*a.runDefenseIndex+.20*a.pointsAllowedPerDriveIndex;
  check(`${t} defense raw identity`,Math.abs(a.defenseCompositeRaw-defRaw)<1e-8,String(a.defenseCompositeRaw));
  check(`${t} defense calibrated identity`,Math.abs(a.defenseIndex-LP.calibrateComposite(defRaw,LP.COMPOSITE_V108.defense))<1e-8,String(a.defenseIndex));
}

// Raw-input-to-display direction checks cover every current live source family.
up('KC passing EPA lifts stabilized offense',kb.off_epa,ka.off_epa);
up('KC QB EPA lifts QB display',kb.qb.epa_per_play,ka.qb.epa_per_play);
check('KC CPOE remains true CPOE scale',Math.abs(ka.qb.cpoe)<20,String(ka.qb.cpoe));
down('KC low disruption allowed improves OL raw metric',kb.ol.pressure_rate_allowed,ka.ol.pressure_rate_allowed);
up('KC pass-rush disruption raw metric improves',kb.dl.pressure_rate,ka.dl.pressure_rate);
check('KC coverage EPA allowed is favorable',ka.cov.epa_allowed<0,String(ka.cov.epa_allowed));
check('KC receiving EPA/target favorable',ka.receivers.adj_epa>0,String(ka.receivers.adj_epa));
check('KC rush EPA favorable',ka.rb.rush_epa>0,String(ka.rb.rush_epa));
check('KC penalty proxy is live',ka.penalty.live===true,JSON.stringify(ka.penalty));
check('KC scoring is live',ka.scoring.games===1,JSON.stringify(ka.scoring));
check('Week 1 live weight remains 50%',Math.abs(ka._live.weight-.5)<1e-12,String(ka._live.weight));

// Result + QB-return invariants, using the same production pure transform.
const cfg=D.config,meta=D.meta;
const forceScore=elo=>{const m=meta.meanElo,lo=meta.anchorMin,hi=meta.anchorMax;const out=elo>=m?50+50*(elo-m)/(hi-m):50-50*(m-elo)/(m-lo);return Math.max(0,Math.min(100,out));};
const preKC=D.rankings.find(x=>x.team==='KC').elo,preDEN=D.rankings.find(x=>x.team==='DEN').elo;
const ph=F.independentProbability(preKC,preDEN,cfg.hfa,cfg.scale),margin=21,mult=Math.log(margin+1)*2.2/(2.2+.001*Math.abs((preKC+cfg.hfa)-preDEN)),delta=cfg.k*mult*(1-ph),postKC=preKC+delta;
const restore=47.3;
up('KC base FORCE rises after 31-10 win',forceScore(preKC),forceScore(postKC));
up('KC QB-adjusted FORCE rises after 31-10 win',forceScore(preKC+restore),forceScore(postKC+restore));
const preScenario=LP.applyQbCarryoverScenario(kb,forceScore(preKC),forceScore(preKC+restore)).profile;
const postScenario=LP.applyQbCarryoverScenario(ka,forceScore(postKC),forceScore(postKC+restore)).profile;
up('KC QB-adjusted offense rises in realistic stress fixture',preScenario.offenseComposite,postScenario.offenseComposite);
check('QB overlay leaves front unchanged',Math.abs(postScenario.frontIndex-ka.frontIndex)<1e-10,`${ka.frontIndex}->${postScenario.frontIndex}`);
check('QB overlay leaves pass rush unchanged',Math.abs(postScenario.passRushIndex-ka.passRushIndex)<1e-10,`${ka.passRushIndex}->${postScenario.passRushIndex}`);
check('QB overlay leaves run defense unchanged',Math.abs(postScenario.runDefenseIndex-ka.runDefenseIndex)<1e-10,`${ka.runDefenseIndex}->${postScenario.runDefenseIndex}`);
check('QB overlay leaves defense unchanged',Math.abs(postScenario.defenseIndex-ka.defenseIndex)<1e-10,`${ka.defenseIndex}->${postScenario.defenseIndex}`);

const report={version:28,checks:checks.length,failures:fails,kc:{front:{before:kb.frontIndex,after:ka.frontIndex,disruption:ka.dl.pressure_rate,runEpaAllowed:ka.dl.run_epa_allowed},force:{before:forceScore(preKC),after:forceScore(postKC),qbAdjustedBefore:forceScore(preKC+restore),qbAdjustedAfter:forceScore(postKC+restore)},offense:{before:kb.offenseComposite,after:ka.offenseComposite,qbAdjustedBefore:preScenario.offenseComposite,qbAdjustedAfter:postScenario.offenseComposite}},metricPaths:{units:unitPaths,live:livePaths},beforeAfter:beforeAfterMatrix};
fs.writeFileSync(path.join(root,'benchmarks/v28_metric_smoke.json'),JSON.stringify(report,null,2));
if(fails.length){console.error(fails.join('\n'));process.exit(1);}console.log(`V28 exhaustive before/after metric smoke PASS (${checks.length} checks)`);console.log(JSON.stringify(report.kc,null,2));
