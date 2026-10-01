const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.resolve(__dirname,'..');
let checks=0;
function ok(cond,msg){ checks++; if(!cond) throw new Error(msg); }
function near(a,b,t=1e-9){ return Math.abs(a-b)<=t; }

const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'model/score_normalizer.js'),'utf8'),ctx,{filename:'model/score_normalizer.js'});
const SN=ctx.window.FORCE_SCORE_NORMALIZER;

// Reported examples: do not force exact margin/total when a more natural NFL
// score is very close to the same continuous forecast.
const kc=SN.normalize(47,13);
ok(kc.home===31 && kc.away===17,`47 total / +13 should prefer 31-17 over forced 30-17; got ${kc.home}-${kc.away}`);
ok(kc.margin===14 && kc.total===48,'KC example should be allowed to miss line and total by one point');
ok(kc.objective < SN.normalize(47,13,{plausibilityWeight:0}).objective || kc.footballPenalty < SN.scorePenalty(30)+SN.scorePenalty(17),'common-score prior must materially affect the KC near-tie');

const tb=SN.normalize(44,8);
ok(tb.home===27 && tb.away===17,`44 total / +8 should prefer 27-17 over forced 26-18; got ${tb.home}-${tb.away}`);
ok(tb.total===44 && tb.margin===10,'TB example should preserve total while accepting a two-point margin miss for a much more typical score');
ok(SN.scorePenalty(27)+SN.scorePenalty(17) < SN.scorePenalty(26)+SN.scorePenalty(18),'27-17 must carry a lower football-score penalty than 26-18');

// Preserve the good V35 canonicalization behavior and symmetry.
const canonical=SN.normalize(47,11);
ok(canonical.home===28 && canonical.away===17,`47/+11 should remain 28-17; got ${canonical.home}-${canonical.away}`);
const flipped=SN.normalize(47,-11);
ok(flipped.home===17 && flipped.away===28,'normalization must remain symmetric');
ok(flipped.total===canonical.total,'symmetric projection must keep the same total');

// Score normalization is a near-target prior, not a license to wander.
for(let total=32;total<=62;total+=2){
  for(let margin=-18;margin<=18;margin+=3){
    const x=SN.normalize(total,margin);
    ok(x.totalError<=4+1e-9,`total drift exceeded V47 neighborhood at ${total}/${margin}`);
    ok(x.marginError<=4+1e-9,`margin drift exceeded V47 neighborhood at ${total}/${margin}`);
    if(margin>0.25) ok(x.margin>0,`winner flipped for positive margin ${margin}`);
    if(margin<-0.25) ok(x.margin<0,`winner flipped for negative margin ${margin}`);
  }
}

const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const helper=app.match(/function forecastLogoOnlyMark[\s\S]*?\n  }/);
ok(helper && helper[0].includes('forecast-logo-only'),'bottom forecast boxes need dedicated logo-only helper');
ok(helper && !helper[0].includes('team-mark-fallback'),'forecast-only helper must not contain abbreviation fallback markup');
ok(app.includes("logoizeForecastTeamCodes(lineLabel, 'xs')"),'Predicted line box must use strict logo-only rendering');
ok(app.includes("logoizeForecastTeamCodes(`${g.away} ${proj.away} · ${g.home} ${proj.home}`, 'xs')"),'Predicted exact-score box must use strict logo-only rendering');
ok(app.includes('QB correction active') && !app.includes("scenarioTeams.map((x) => forecastLogoOnlyMark(x, 'xxs'))"),'QB-correction copy must be text-only with no redundant logo');
ok(app.includes('The exact-score margin can differ slightly from the line'),'UI must explain that discrete exact score is not forced to equal the continuous line');

console.log(`V47 score-prior/logo regression: ${checks} checks passed`);
