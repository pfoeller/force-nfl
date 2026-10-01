const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('model/live_profiles.js','utf8');
const sandbox={window:{},console}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
const L=sandbox.window.FORCE_LIVE_PROFILE; let n=0; const ok=(x,m)=>{if(!x)throw new Error(m);n++;};
const near=(a,b,e=1e-9)=>Math.abs(a-b)<e;
ok(L.COMPOSITE_V108.offense.softness===35,'offense softness');
ok(L.COMPOSITE_V108.defense.softness===42,'defense softness');
ok(L.calibrateComposite(50,L.COMPOSITE_V108.offense)===50,'neutral offense');
ok(L.calibrateComposite(50,L.COMPOSITE_V108.defense)===50,'neutral defense');
ok(near(L.calibrateComposite(0,L.COMPOSITE_V108.offense),0),'offense lower endpoint');
ok(near(L.calibrateComposite(100,L.COMPOSITE_V108.offense),100),'offense upper endpoint');
ok(near(L.calibrateComposite(0,L.COMPOSITE_V108.defense),0),'defense lower endpoint');
ok(near(L.calibrateComposite(100,L.COMPOSITE_V108.defense),100),'defense upper endpoint');
const sf=L.calibrateComposite(74.88016593934988,L.COMPOSITE_V108.offense);
const lv=L.calibrateComposite(79.98246331498497,L.COMPOSITE_V108.defense);
ok(sf>83 && sf<85,'SF-like offense should land mid-80s, got '+sf);
ok(lv>86 && lv<88,'LV-like defense should land high-80s, got '+lv);
ok(lv<90,'raw 80 defense must not imply 90+ automatically');
for (const cfg of [L.COMPOSITE_V108.offense,L.COMPOSITE_V108.defense]) {
  for (const raw of [5,20,35,50,65,80,95]) {
    const shown=L.calibrateComposite(raw,cfg), restored=L.uncalibrateComposite(shown,cfg);
    ok(Math.abs(restored-raw)<1e-7,`inverse calibration ${raw}`);
  }
}
const offRaw=L.rawOffenseCompositeFrom({pointsScoredPerDriveIndex:80,qbIndex:80,receiverIndex:80,olIndex:80,rbIndex:80,_offenseCompositePolicy:'v102-orthogonal'},'v102-orthogonal');
ok(offRaw===80,'raw offense weighted mean');
ok(near(L.offenseCompositeFrom({pointsScoredPerDriveIndex:80,qbIndex:80,receiverIndex:80,olIndex:80,rbIndex:80,_offenseCompositePolicy:'v102-orthogonal'},'v102-orthogonal'),L.calibrateComposite(80,L.COMPOSITE_V108.offense)),'calibrated offense');
const defRaw=L.rawDefenseCompositeFrom({coverageIndex:80,passRushIndex:80,runDefenseIndex:80,pointsAllowedPerDriveIndex:80});
ok(defRaw===80,'raw defense weighted mean');
ok(near(L.defenseCompositeFrom({coverageIndex:80,passRushIndex:80,runDefenseIndex:80,pointsAllowedPerDriveIndex:80}),L.calibrateComposite(80,L.COMPOSITE_V108.defense)),'calibrated defense');
console.log(`PASS: V108 composite soft-tail scale (${n} checks) `+JSON.stringify({sf,lv}));
