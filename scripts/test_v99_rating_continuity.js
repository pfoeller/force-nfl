const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};ctx.globalThis=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'model/rating_continuity.js'),'utf8'),ctx);
const RC=ctx.window.FORCE_RATING_CONTINUITY;
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)}; const near=(a,b,e,m)=>{n++;if(Math.abs(Number(a)-Number(b))>e)throw new Error(`${m}: ${a} != ${b}`)};
ok(RC && RC.CONFIG.version==='v99','continuity module/version');
// One extreme Week-1 surprise must reproduce the old Week-2 capped signal.
const s={KC:[{residual:30,opponentQuality:0.5}]};
near(RC.rawCorrectionPoints('KC',2,s),7,1e-12,'Week-2 entry signal must preserve the existing capped baseline');
// A quiet/contradictory second game must reduce rather than erase the state.
s.KC.push({residual:-4,opponentQuality:0});
const w3=RC.rawCorrectionPoints('KC',3,s);
ok(w3>0 && w3<7,'Week-3 contradictory evidence should unwind smoothly, not zero the Week-2 baseline');
// A truly large contradictory game can move the signal materially and can reverse it.
const s2={KC:[{residual:30,opponentQuality:0.5},{residual:-30,opponentQuality:0}]};
ok(RC.rawCorrectionPoints('KC',3,s2)<0,'large opposite evidence should be able to reverse the regime signal');
// Fade after Week 6 must be gradual, not 30% -> 0 in one week.
const s3={KC:[{residual:30,opponentQuality:0.5},{residual:25,opponentQuality:0.5},{residual:20,opponentQuality:0.5}]};
const w6=RC.rawCorrectionPoints('KC',6,s3), w7=RC.rawCorrectionPoints('KC',7,s3), w8=RC.rawCorrectionPoints('KC',8,s3);
ok(w6>w7 && w7>w8 && w8>0,'post-Week-6 fade must remain continuous');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
ok(app.includes('regimeCorrectionElo'),'app must route production regime through V99 continuity layer');
ok(app.includes('FORCE_RATING_LEDGER'),'rating ledger hook missing');
ok(app.includes('FORCE_WEEK2_ENTRY_STATE'),'Week-2 entry state hook missing');
ok(app.includes('resultElo,regimeElo,retrospectiveElo,unitBridgeElo,qbElo'),'ledger must expose reconciled deltas');
console.log(`PASS: V99 rating continuity (${n} checks)`);
