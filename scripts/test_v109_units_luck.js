const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('model/live_profiles.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE; let n=0; const ok=(x,m)=>{if(!x)throw new Error(m);n++;};
ok(L.UNIT_V109.receiverResidualStabilizerTargets===120,'receiver stabilizer');
ok(L.UNIT_V109.rbRushStabilizerCarries===80,'rb rush stabilizer');
ok(L.UNIT_V109.rbRecvResidualStabilizerTargets===60,'rb recv stabilizer');
const rec=L.stabilizeToward(.25,.05,40,L.UNIT_V109.receiverResidualStabilizerTargets);
ok(rec>.05 && rec<.25,'receiver small sample shrinks');
const rush=L.stabilizeToward(-.15,0,30,L.UNIT_V109.rbRushStabilizerCarries);
const recv=L.stabilizeToward(.75,.05,8,L.UNIT_V109.rbRecvResidualStabilizerTargets);
ok(Math.abs(recv-.75)>.4,'rb receiving tiny sample strongly shrinks');
const comp=.7*rush+.3*recv;
ok(comp<.10,'bad rushing cannot be fully rescued by tiny receiving sample');
const sched=[
 {week:1,date:'2026-09-01',away:'KC',home:'DEN',awayScore:24,homeScore:21},
 {week:2,date:'2026-09-08',away:'IND',home:'KC',awayScore:30,homeScore:33}
];
const hist={
 '1|2026-09-01|KC|DEN':{independent:{probability:.70}},
 '2|2026-09-08|IND|KC':{independent:{probability:.30}}
};
const luck=L.liveLuck('KC',sched,hist);
ok(luck.exp_w>1 && luck.exp_w<2,'pythagorean expected wins from scoring');
ok(Math.abs(luck.pregame_exp_w-.6)<1e-9,'old pregame expectation retained only for audit');
ok(String(luck.source).includes('V121'),'V121 source supersedes V109 while retaining Pythagorean fallback');
console.log(`PASS: V109 receiver/RB reliability + luck expected-wins (${n} checks)`);
