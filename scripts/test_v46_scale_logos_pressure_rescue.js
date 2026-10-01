const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
function ok(cond,msg){ if(!cond) throw new Error(msg); checks++; }
function near(a,b,t=1e-8){ return Math.abs(a-b)<=t; }
let checks=0;

// Public FORCE scale + Unit -> FORCE bridge.
const sandbox={globalThis:{},console}; sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root,'model/unit_force_bridge.js'),'utf8'),sandbox);
const U=sandbox.FORCE_UNIT_FORCE_BRIDGE_MODEL;
const meta={meanElo:1505,anchorMin:1214.2,anchorMax:1782.0};
ok(near(U.scoreFromElo(meta.meanElo,meta),50),'mean Elo must remain FORCE 50');
ok(near(U.scoreFromElo(meta.anchorMax,meta),95),'historical high anchor must map to 95');
ok(near(U.scoreFromElo(meta.anchorMin,meta),5),'historical low anchor must map to 5');
ok(U.scoreFromElo(1900,meta)>95 && U.scoreFromElo(1900,meta)<100,'super-historical Elo must approach but not hit 100');
ok(U.scoreFromElo(10000,meta)<=99.9,'finite Elo must not display 100');
const pri={},live={}; for(const k of Object.keys(U.WEIGHTS)){pri[k]=50;live[k]=100;}
const elite=U.compute(meta.anchorMax,live,pri,meta);
ok(elite.forceScore>95 && elite.forceScore<100,'maximal unit improvement above historical high must not clip to 100');
ok(elite.elo>meta.anchorMax,'unit bridge must actually move canonical Elo');
const mid=U.compute(meta.meanElo,Object.fromEntries(Object.keys(U.WEIGHTS).map(k=>[k,60])),pri,meta);
ok(mid.forceScore>50 && mid.elo>meta.meanElo,'unit movement must move overall FORCE and Elo');

// Forecast logo rendering: code replacement must be logo-only, not logo + code token.
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(/function logoizeTeamCodes[\s\S]*?teamMark\(code, size, 'right', 'team-code-logo'\)/.test(app),'logoized score strings must use logo-only teamMark');
ok(!/function logoizeTeamCodes[\s\S]{0,300}?teamToken\(code/.test(app),'logoized score strings must not use teamToken');
ok(app.includes('Manual current-pressure rescue'),'Update Center must expose real manual pressure rescue UI');
ok(app.includes("fetch('/api/current-pressure/manual'"),'manual pressure rescue must persist through local API');

// Seeded recovery rows for the three machine-identification misses.
const manual=JSON.parse(fs.readFileSync(path.join(root,'data/pressure-current.manual.json'),'utf8'));
for(const [team,rate] of [['KC',.455],['DEN',.273],['DAL',.323529]]){
  const r=manual.teams[team];
  ok(r && near(Number(r.pressure_rate),rate,1e-6),`${team} recovery rate must be present`);
  ok(Number(r.games)===1 && Number(r.through_week)===1,`${team} recovery row must explicitly cover Week 1 only`);
  ok(/^2026-09-1[56]$/.test(r.as_of),`${team} recovery row needs current freshness date`);
}

// Verify the live-profile freshness contract accepts them now and rejects them after game 2.
const lpSandbox={window:{},console}; lpSandbox.window=lpSandbox;
vm.runInNewContext(fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8'),lpSandbox);
const LP=lpSandbox.FORCE_LIVE_PROFILE;
const payload={teams:Object.fromEntries(Object.entries(manual.teams).map(([k,v])=>[k,{...v,mode:'manual'}]))};
const raw={oppPassPlays:33,defQbHits:5,defSacks:2};
const schedules={
  KC:[{date:'2026-09-14',home:'KC',away:'DEN',homeScore:31,awayScore:10}],
  DEN:[{date:'2026-09-14',home:'KC',away:'DEN',homeScore:31,awayScore:10}],
  DAL:[{date:'2026-09-13',home:'DAL',away:'NYG',homeScore:20,awayScore:28}],
};
for(const team of ['KC','DEN','DAL']){
  const x=LP.externalPressureMetric(payload,team,raw,schedules[team],1);
  ok(x.ready,`${team} seeded Week 1 recovery row must pass current freshness gate`);
  ok(x.metric.provider==='manual-current',`${team} seeded recovery row must carry manual-current provenance`);
  const second=[...schedules[team],{date:'2026-09-20',home:team,away:'BUF',homeScore:20,awayScore:17}];
  const futurePayload={teams:{...payload.teams,[team]:{...payload.teams[team],as_of:'2026-09-22'}}};
  const stale=LP.externalPressureMetric(futurePayload,team,raw,second,2);
  ok(!stale.ready && /does not cover every completed game/.test(stale.reason),`${team} one-game row must be rejected after a second completed game even with a fresh date`);
}

const server=fs.readFileSync(path.join(root,'force_server.py'),'utf8');
ok(server.includes("'/api/current-pressure/manual'"),'local server must expose manual pressure POST route');
ok(server.includes('save_manual_pressure_override'),'local server must persist curated pressure rows');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
ok(css.includes('.team-code-logo'),'logo-only forecast mark must have explicit CSS');
ok(css.includes('.manual-pressure-editor'),'manual rescue UI must have explicit CSS');
console.log(`V46 scale/logo/pressure rescue: ${checks} checks passed`);
