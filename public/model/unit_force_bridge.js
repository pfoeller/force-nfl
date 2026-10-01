/*
 * FORCE V46 Unit -> FORCE bridge.
 *
 * V102 orthogonalized live unit grades are already stabilized against prior-season
 * baselines inside live_profiles.js. This bridge lets movement in those units (including the V57 RB room grade)
 * move the canonical FORCE rating with the broad offensive outcome represented once by scoring/drive rather than team EPA duplicating QB/receiver/RB play value.
 * Missing/stale units contribute zero new information and their weight is not
 * redistributed to the remaining units.
 *
 * V46 also makes the public 0-100 scale asymptotic. Historical end-season
 * anchors map to 5/95, 50 remains average, and no finite Elo can become a
 * literal 0 or 100. Unit movement is translated to Elo before normalization so
 * an elite team cannot jump to a fake perfect 100 merely because the bridge is
 * additive in score-space.
 */
(function(root){
  'use strict';

  const WEIGHTS = Object.freeze({
    pointsScoredPerDriveIndex:0.20,
    qbIndex:0.12,
    receiverIndex:0.08,
    olIndex:0.08,
    rbIndex:0.07,
    coverageIndex:0.162,
    passRushIndex:0.072,
    runDefenseIndex:0.126,
    pointsAllowedPerDriveIndex:0.090
  });
  const SHARE = 0.50;
  const CAP = 7.50; // midpoint-equivalent FORCE points before Elo translation
  const HISTORICAL_HIGH_SCORE = 95;
  const HISTORICAL_LOW_SCORE = 5;
  const SCORE_FLOOR = 0.1;
  const SCORE_CEILING = 99.9;
  const TAIL_START_HIGH = 90;
  const TAIL_START_LOW = 10;
  const TAIL_TAU = 10 / Math.log(2); // raw 100 -> displayed 95; raw 0 -> displayed 5

  function finite(v){ return v!==null && v!=='' && Number.isFinite(Number(v)); }
  function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
  function anchors(meta){
    const m=Number(meta?.meanElo), lo=Number(meta?.anchorMin), hi=Number(meta?.anchorMax);
    if (![m,lo,hi].every(Number.isFinite) || !(lo<m && m<hi)) return null;
    return {m,lo,hi};
  }

  function rawLinearScore(elo,meta){
    const a=anchors(meta), e=Number(elo);
    if (!a || !Number.isFinite(e)) return null;
    return e>=a.m ? 50+50*(e-a.m)/(a.hi-a.m) : 50-50*(a.m-e)/(a.m-a.lo);
  }

  function softenRawScore(raw){
    const r=Number(raw);
    if (!Number.isFinite(r)) return null;
    if (r>TAIL_START_HIGH) {
      const out=TAIL_START_HIGH+10*(1-Math.exp(-(r-TAIL_START_HIGH)/TAIL_TAU));
      return clamp(out,SCORE_FLOOR,SCORE_CEILING);
    }
    if (r<TAIL_START_LOW) {
      const out=TAIL_START_LOW-10*(1-Math.exp(-(TAIL_START_LOW-r)/TAIL_TAU));
      return clamp(out,SCORE_FLOOR,SCORE_CEILING);
    }
    return r;
  }

  function unsoftenScore(forceScore){
    const s=clamp(Number(forceScore),SCORE_FLOOR,SCORE_CEILING);
    if (s>TAIL_START_HIGH) {
      const frac=clamp((s-TAIL_START_HIGH)/10,0,0.999999999);
      return TAIL_START_HIGH-TAIL_TAU*Math.log(1-frac);
    }
    if (s<TAIL_START_LOW) {
      const frac=clamp((TAIL_START_LOW-s)/10,0,0.999999999);
      return TAIL_START_LOW+TAIL_TAU*Math.log(1-frac);
    }
    return s;
  }

  function scoreFromElo(elo,meta){
    return softenRawScore(rawLinearScore(elo,meta));
  }

  function eloFromScore(forceScore,meta){
    const a=anchors(meta);
    if (!a || !Number.isFinite(Number(forceScore))) return null;
    const raw=unsoftenScore(forceScore);
    return raw>=50 ? a.m+((raw-50)/50)*(a.hi-a.m) : a.m-((50-raw)/50)*(a.m-a.lo);
  }

  function eloPerMidpointPoint(meta,direction=1){
    const a=anchors(meta);
    if (!a) return null;
    return direction>=0 ? (a.hi-a.m)/50 : (a.m-a.lo)/50;
  }

  function compute(coreElo,currentProfile,priorProfile,meta,opts={}){
    const weights=opts.weights||WEIGHTS;
    const share=finite(opts.share)?Number(opts.share):SHARE;
    const cap=finite(opts.cap)?Math.abs(Number(opts.cap)):CAP;
    const baseElo=Number(coreElo);
    const baseForce=scoreFromElo(baseElo,meta);
    if (!Number.isFinite(baseElo) || baseForce==null) {
      return {baseElo:Number.isFinite(baseElo)?baseElo:null,elo:null,eloDelta:null,baseForce:null,forceScore:null,forceDelta:0,bridgePoints:0,weightedUnitDelta:0,availableWeight:0,components:[]};
    }

    let weightedUnitDelta=0, availableWeight=0;
    const components=[];
    for (const [key,wRaw] of Object.entries(weights)) {
      const w=Number(wRaw)||0;
      const current=finite(currentProfile?.[key])?Number(currentProfile[key]):null;
      const prior=finite(priorProfile?.[key])?Number(priorProfile[key]):null;
      if (current==null || prior==null) {
        components.push({key,weight:w,current,prior,delta:null,contribution:0});
        continue;
      }
      const delta=current-prior;
      const contribution=w*delta;
      weightedUnitDelta+=contribution;
      availableWeight+=w;
      components.push({key,weight:w,current,prior,delta,contribution});
    }

    const bridgePoints=clamp(weightedUnitDelta*share,-cap,cap);
    const eloPerPoint=eloPerMidpointPoint(meta,bridgePoints);
    const eloDelta=bridgePoints*eloPerPoint;
    const elo=baseElo+eloDelta;
    const forceScore=scoreFromElo(elo,meta);
    const forceDelta=forceScore-baseForce;
    return {
      baseElo, elo, eloDelta, baseForce, forceScore, forceDelta, bridgePoints,
      weightedUnitDelta, availableWeight, components
    };
  }

  root.FORCE_UNIT_FORCE_BRIDGE_MODEL={
    WEIGHTS,SHARE,CAP,HISTORICAL_HIGH_SCORE,HISTORICAL_LOW_SCORE,SCORE_FLOOR,SCORE_CEILING,
    rawLinearScore,softenRawScore,unsoftenScore,scoreFromElo,eloFromScore,eloPerMidpointPoint,compute
  };
})(typeof window!=='undefined'?window:globalThis);
