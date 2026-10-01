const fs=require('fs'),vm=require('vm');
let passed=0;
function ok(c,m){if(!c) throw new Error(m); passed++;}
function near(a,b,e=1e-9,m=''){if(Math.abs(a-b)>e) throw new Error(`${m}: ${a} != ${b}`); passed++;}
const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/matchup-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/model-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('model/live_profiles.js','utf8'),ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE, M=ctx.window.MATCHUP_DATA, D=ctx.window.MODEL_DATA;
const teams=Object.keys(D.teams);

// This mirrors the actual public in-season FTN subset: useful rush context, but
// no true pressure outcome. It must never be promoted into Pass Rush pressure.
const publicFtn=[{season:'2026',week:'1',nflverse_game_id:'2026_01_DEN_KC',nflverse_play_id:'101',n_blitzers:'1',n_pass_rushers:'5',is_qb_fault_sack:'FALSE',date_pulled:'2026-09-16'}];
const rejected=LP.ftnPressureContract(publicFtn);
ok(!rejected.ready,'public FTN shape without pressure outcome is rejected');
ok(rejected.pressureField===null,'no pressure field is invented');
ok(/no pressure outcome/.test(rejected.reason),'rejection reason is explicit');

// Future/enriched FTN rows with a real pressure flag and defensive-team identity
// satisfy the contract and aggregate at play level.
const ftn=[];
for(let i=0;i<40;i++) ftn.push({season:'2026',week:'1',season_type:'REG',nflverse_game_id:'2026_01_DEN_KC',nflverse_play_id:String(100+i),defteam:'KC',qb_dropback:'TRUE',was_pressure:i<20?'TRUE':'FALSE',n_pass_rushers:String(4+(i%3===0))});
const accepted=LP.ftnPressureContract(ftn);
ok(accepted.ready && accepted.pressureField==='was_pressure','explicit FTN pressure contract accepted');
const fg=LP.ftnDefensePressureGames(ftn);
ok(fg.KC.length===1,'FTN rows aggregate to one KC game');
near(fg.KC[0].pressureRate,.50,1e-12,'FTN play-level pressure rate');
const fm=LP.combineFtnPressureGames(fg.KC,{defQbHits:5,defSacks:4});
near(fm.pressureRate,.50,1e-12,'FTN pressure remains base signal');
near(fm.compositeRate,.50+.20*(5/40)+.60*(4/40),1e-12,'weekly hit/sack finishing bonuses layer onto FTN pressure');

function pfrRow(season,week,def,rate,hits,sacks,hurries){
 const db=40,pressures=rate*db;
 return {season:String(season),week:String(week),game_type:'REG',game_id:`${season}_${String(week).padStart(2,'0')}_OFF_${def}`,team:'OFF',opponent:def,
 times_pressured:String(pressures),times_pressured_pct:String(rate*100),times_hit:String(hits),times_sacked:String(sacks),times_hurried:String(hurries)};
}
const prior=[];
for(let w=1;w<=2;w++) teams.forEach((t,i)=>{const rate=.15+(i/31)*.20+(w-1)*.004,sacks=1+(i%3),hits=2+(i%4),hurries=Math.max(1,rate*40-hits-sacks);prior.push(pfrRow(2025,w,t,rate,hits,sacks,hurries));});
const current=teams.map(t=>pfrRow(2026,1,t,.25,3,2,5));
const kci=teams.indexOf('KC'); Object.assign(current[kci],pfrRow(2026,1,'KC',.25,5,4,1));
const schedule=[{season:2026,week:1,game_type:'REG',game_id:'2026_01_DEN_KC',away:'DEN',home:'KC',awayScore:10,homeScore:31,date:'2026-09-14'}];
const teamRows=[
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'KC',opponent_team:'DEN',attempts:'27',sacks_suffered:'0',carries:'38',def_qb_hits:'5',def_sacks:'4',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'DEN',opponent_team:'KC',attempts:'28',sacks_suffered:'4',carries:'15',def_qb_hits:'1',def_sacks:'0',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'}
];
const live=LP.buildProfiles({teamRows,playerRows:[],ftnRows:ftn,pfrPassRows:current,priorPfrPassRows:prior,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
near(live.KC.dl.pressure_rate,.50,1e-12,'FTN takes precedence over simultaneous 25% PFR value');
ok(live.KC._live.passRushProvider==='ftn-play-level','provider provenance says FTN');
ok(live.KC._live.ftnPressureReady===true,'FTN readiness exposed');
ok(/FTN play-level true-pressure/.test(live.KC.dl.source),'FTN source explicitly named');

const fallback=LP.buildProfiles({teamRows,playerRows:[],ftnRows:publicFtn,pfrPassRows:current,priorPfrPassRows:prior,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
near(fallback.KC.dl.pressure_rate,.25,1e-12,'missing FTN pressure outcome falls back to PFR');
ok(fallback.KC._live.passRushProvider==='pfr-advanced','fallback provider provenance says PFR');
ok(fallback.KC._live.ftnPressureReady===false,'public FTN shape remains marked unavailable for pressure');

const model=fs.readFileSync('model/live_profiles.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const server=fs.readFileSync('force_server.py','utf8');
ok(server.includes("'/api/ftn-charting'") && server.includes('ftn_charting_2026.csv'),'server proxies live FTN charting');
ok(app.includes('S.liveFtnCharting') && app.includes('/api/ftn-charting'),'app fetches and retains FTN charting');
ok(app.includes('nflverse weekly disruption fallback') && app.includes('advanced pressure unavailable'),'UI discloses V99 fallback/freshness state rather than relabeling missing advanced pressure');
ok(model.includes('We never') && model.includes('infer pressure from number of rushers'),'model documents no-inference contract');
ok(!model.includes('pressures += n(r.n_pass_rushers)'), 'n_pass_rushers is never counted as pressure');
console.log(`PASS: V43 FTN-first pressure-provider regression (${passed} checks)`);
