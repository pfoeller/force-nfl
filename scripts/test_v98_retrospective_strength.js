const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('model/retrospective_strength.js','utf8');
const ctx={window:{}}; vm.createContext(ctx); vm.runInContext(code,ctx);
const R=ctx.window.FORCE_RETROSPECTIVE_STRENGTH;
function ok(x,m){if(!x)throw new Error(m)}
function approx(a,b,e=1e-9){return Math.abs(a-b)<=e}

ok(R && R.CONFIG.version==='v98','module/version');
ok(approx(R.evidenceWeight(0),0),'no later evidence must mean zero weight');
ok(R.evidenceWeight(16)>0.8 && R.evidenceWeight(16)<0.9,'late-season evidence shrink');

// Synthetic season: KC beats highly rated DEN. DEN then collapses. KC's old win
// must be worth less today. The target result itself is excluded by comparing
// DEN's post-target rating with its final rating.
const hfa=15, scale=340, k=20;
function p(h,a){return R.winProbability(h,a,hfa,scale)}
function mult(m,h,a){return R.marginMultiplier(m,h,a,hfa)}
function delta(h,a,hs,as){const y=hs===as?0.5:hs>as?1:0; return k*mult(Math.abs(hs-as),h,a)*(y-p(h,a));}
let preKC=1600, preDEN=1625;
const d0=delta(preKC,preDEN,27,20);
const postKC=preKC+d0, postDEN=preDEN-d0;
const games=[{key:'KC-DEN',week:2,home:'KC',away:'DEN',homeScore:27,awayScore:20,preHome:preKC,preAway:preDEN,postHome:postKC,postAway:postDEN,homeDelta:d0,awayDelta:-d0}];
// Add later DEN games solely to establish evidence count. Their exact deltas are
// immaterial to the first row's logic; valid placeholders keep the audit complete.
let den=postDEN;
for(let i=0;i<10;i++){
  const opp='X'+i, preOpp=1505, dd=-10;
  games.push({key:`DEN-${opp}`,week:3+i,home:'DEN',away:opp,homeScore:10,awayScore:24,preHome:den,preAway:preOpp,postHome:den+dd,postAway:preOpp-dd,homeDelta:dd,awayDelta:-dd});
  den+=dd;
}
const final={KC:postKC,DEN:den};
for(let i=0;i<10;i++) final['X'+i]=1515;
const out=R.buildAdjustments(games,final,{hfa,scale,k});
const target=out.details.find(x=>x.key==='KC-DEN');
ok(target,'target audit row');
ok(target.awayLaterGames===10,'DEN later game count');
ok(target.homeOpponentMoveAfter<0,'DEN must resolve weaker');
ok(target.homeCorrection<0,'KC win credit must be revised downward');
ok(target.homeRevisedDelta<target.homeOriginalDelta,'revised KC delta must be smaller');

// No subsequent opponent games => no look-behind adjustment for that side.
const single=R.buildAdjustments([games[0]],{KC:postKC,DEN:postDEN},{hfa,scale,k});
const srow=single.details[0];
ok(approx(srow.homeOpponentEvidence,0),'single game opponent evidence zero');
ok(approx(srow.homeCorrection,0),'single game correction zero');

// Reverse direction: an opponent that improves later must make the old win more valuable.
const betterFinal={KC:postKC,DEN:postDEN+120};
const betterGames=[games[0],...Array.from({length:6},(_,i)=>({key:`D${i}`,week:3+i,home:'DEN',away:`Y${i}`,homeScore:30,awayScore:10,preHome:postDEN,preAway:1505,postHome:postDEN+20,postAway:1485,homeDelta:20,awayDelta:-20}))];
for(let i=0;i<6;i++) betterFinal['Y'+i]=1485;
const up=R.buildAdjustments(betterGames,betterFinal,{hfa,scale,k});
const urow=up.details.find(x=>x.key==='KC-DEN');
ok(urow.homeOpponentMoveAfter>0,'DEN must resolve stronger');
ok(urow.homeCorrection>0,'KC win credit must be revised upward');

console.log('PASS: V98 retrospective opponent-strength look-behind');
