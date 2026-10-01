const fs=require('fs'),vm=require('vm');
let passed=0;
function ok(c,m){if(!c) throw new Error(m);passed++;}
function near(a,b,e=1e-9,m=''){if(Math.abs(a-b)>e) throw new Error(`${m}: ${a} != ${b}`);passed++;}
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/matchup-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/model-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('model/live_profiles.js','utf8'),ctx);
const LP=ctx.window.FORCE_LIVE_PROFILE,M=ctx.window.MATCHUP_DATA,D=ctx.window.MODEL_DATA;
const teams=Object.keys(D.teams);

function pfrRow(season,week,def,rate,hits,sacks,hurries){
 const db=40,pressures=rate*db;
 return {season:String(season),week:String(week),game_type:'REG',game_id:`${season}_${String(week).padStart(2,'0')}_OFF_${def}`,team:'OFF',opponent:def,
 times_pressured:String(pressures),times_pressured_pct:String(rate*100),times_hit:String(hits),times_sacked:String(sacks),times_hurried:String(hurries)};
}
const prior=[];
for(let w=1;w<=3;w++) teams.forEach((t,i)=>{const rate=.15+(i/31)*.20+(w-1)*.003,sacks=1+(i%3),hits=2+(i%4),hurries=Math.max(1,rate*40-hits-sacks);prior.push(pfrRow(2025,w,t,rate,hits,sacks,hurries));});
const teamRows=[
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'KC',opponent_team:'DEN',attempts:'27',sacks_suffered:'0',carries:'38',def_qb_hits:'5',def_sacks:'4',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'},
 {season:'2026',week:'1',season_type:'REG',game_id:'2026_01_DEN_KC',team:'DEN',opponent_team:'KC',attempts:'28',sacks_suffered:'4',carries:'15',def_qb_hits:'1',def_sacks:'0',passing_epa:'0',rushing_epa:'0',targets:'0',receiving_epa:'0'}
];
const schedule=[{week:1,date:'2026-09-14',away:'DEN',home:'KC',awayScore:10,homeScore:31}];
const currentPressure={teams:{KC:{pressure_rate:.455,as_of:'2026-09-16',source:'StatRankings',mode:'automatic'}}};
let x=LP.externalPressureMetric(currentPressure,'KC',{oppPassPlays:32,defQbHits:5,defSacks:4},schedule,1);
ok(x.ready,'Wednesday source dated two days after Monday game is fresh');
near(x.metric.pressureRate,.455,1e-12,'fresh pressure retained');
near(x.metric.compositeRate,.455+.20*(5/32)+.60*(4/32),1e-12,'hit and sack finishing bonus retained');

let live=LP.buildProfiles({teamRows,playerRows:[],ftnRows:[],pfrPassRows:[],priorPfrPassRows:prior,currentPressure,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
near(live.KC.dl.pressure_rate,.455,1e-12,'fresh external pressure becomes current KC base signal');
ok(live.KC._live.passRushProvider==='statrankings-current','provider provenance identifies automatic current source');
ok(Number.isFinite(live.KC.passRushIndex),'fresh current pressure produces a Pass Rush score');
ok(live.KC._live.passRushDataState==='live-current','freshness state is current');

const stale={teams:{KC:{pressure_rate:.455,as_of:'2026-09-14',source:'stale source',mode:'automatic'}}};
x=LP.externalPressureMetric(stale,'KC',{oppPassPlays:32,defQbHits:5,defSacks:4},schedule,1);
ok(!x.ready && /freshness floor/.test(x.reason),'same-day date-only source is conservatively rejected');
live=LP.buildProfiles({teamRows,playerRows:[],ftnRows:[],pfrPassRows:[],priorPfrPassRows:prior,currentPressure:stale,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
ok(Number.isFinite(Number(live.KC.passRushIndex)),'stale advanced pressure falls back to current weekly disruption');
near(live.KC.dl.pressure_rate,(5+4)/32,1e-12,'fallback uses weekly QB-hit+sack disruption rate');
ok(live.KC._live.passRushProvider==='nflverse-weekly-disruption','fallback provider provenance is explicit');
ok(live.KC._live.defensePassRushExcluded===false,'defense retains its Pass Rush weight through the current fallback');

const manual={teams:{KC:{pressure_rate:.49,as_of:'2026-09-16',games:1,source:'NFL NGS via browser',mode:'manual'}}};
const ftn=[]; for(let i=0;i<32;i++) ftn.push({season:'2026',week:'1',season_type:'REG',nflverse_game_id:'2026_01_DEN_KC',defteam:'KC',qb_dropback:'TRUE',was_pressure:i<10?'TRUE':'FALSE'});
live=LP.buildProfiles({teamRows,playerRows:[],ftnRows:ftn,pfrPassRows:[],priorPfrPassRows:prior,currentPressure:manual,priorProfiles:M.profiles,schedule,teamIds:teams,priorGames:1,useChartedPassRush:true});
near(live.KC.dl.pressure_rate,.49,1e-12,'explicit curated current override wins over alternate providers');
ok(live.KC._live.passRushProvider==='manual-current','manual override provenance retained');

const incompleteManual={teams:{KC:{pressure_rate:.49,as_of:'2026-09-16',games:0,source:'bad override',mode:'manual'}}};
x=LP.externalPressureMetric(incompleteManual,'KC',{oppPassPlays:32,defQbHits:5,defSacks:4},schedule,1);
ok(!x.ready && /cover every completed game/.test(x.reason),'manual override cannot claim freshness without covering completed games');

const app=fs.readFileSync('assets/app.js','utf8');
ok(app.includes('/api/current-pressure') && app.includes('S.currentPressure'),'app fetches normalized current pressure endpoint');
ok(app.includes('nflverse weekly disruption fallback') && app.includes('2026 disruption proxy'),'UI explicitly identifies the fallback instead of showing Pass Rush unavailable');
ok(app.includes("v == null || v === ''") || app.includes("raw == null || raw === ''"),'null ratings are not coerced to zero');
console.log(`PASS: V44 hard pressure-freshness regression (${passed} checks)`);
