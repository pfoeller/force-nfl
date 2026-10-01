const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const snSrc=fs.readFileSync(path.join(root,'model/score_normalizer.js'),'utf8');
const lpSrc=fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8');

ok(app.includes('schedule: S.schedule'),'live profile builder must always receive actual schedule');
ok(!app.includes('schedule: hasLiveUnits ? S.schedule : []'),'unsafe empty-schedule live fallback must be gone');
ok(app.includes('currentDataIntegrity()'),'current-data integrity gate missing');
ok(app.includes('The app will not substitute 2025 priors'),'user-facing stale-prior refusal missing');
ok(app.includes('FORCE score normalizer is unavailable; refusing to publish'),'score-normalizer hard gate missing');
ok(app.includes('FORCE live-profile module is unavailable; refusing to use prior profiles as current data'),'live-profile module hard gate missing');
ok(app.includes('60000'),'live refresh timeout should allow slow optional PBP aggregation');

// Exact-score production path: V47 normalizer must prefer a normal football score.
const ctx={};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(snSrc,ctx);
const ex=ctx.FORCE_SCORE_NORMALIZER.normalize(53,4.5);
ok(ex.home===28 && ex.away===24,`53 total / +4.5 home margin should normalize 28-24, got ${ex.home}-${ex.away}`);
ok(!(ex.home===29 && ex.away===24),'29-24 must not beat nearby 28-24 common score');

// Missing-current-data profile contract. A completed game with no current rows
// must suppress current unit grades instead of returning prior unit values.
const lctx={window:{}};lctx.globalThis=lctx.window;vm.createContext(lctx);vm.runInContext(lpSrc,lctx);
const prior={AAA:{offenseIndex:97,qbIndex:94,receiverIndex:100,olIndex:90,rbIndex:85,coverageIndex:80,passRushIndex:75,runDefenseIndex:70,defenseIndex:76,offenseComposite:96}};
const profiles=lctx.window.FORCE_LIVE_PROFILE.buildProfiles({
 teamRows:[],playerRows:[],schedule:[{week:1,home:'AAA',away:'BBB',homeScore:24,awayScore:17}],gameHistory:{},priorProfiles:prior,teamIds:['AAA'],priorGames:1
});
const p=profiles.AAA;
ok(p._live && p._live.games===1,'completed-game awareness lost when current rows are missing');
for(const k of ['offenseIndex','offenseComposite','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','runDefenseIndex']){
  ok(p[k]==null,`${k} must be suppressed when current feed is missing; got ${p[k]}`);
}
console.log(`PASS: V82 integrity contract (${n} checks)`);
