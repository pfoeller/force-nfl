/*
 * FORCE V99 canonical rating continuity layer.
 *
 * V34's early-regime detector remains available as a research/diagnostic target,
 * but its two-game consistency gate can switch a full +/-7-point correction to
 * zero in one week. Because that correction is part of the public canonical FORCE
 * state, that behavior creates a discontinuous rating rebase.
 *
 * V99 preserves the exact Week-2 entry signal (one observation => same math as
 * V34) and updates it continuously as additional evidence arrives. Quiet or
 * contradictory games remain in the recency denominator and therefore unwind an
 * extreme Week-1 signal gradually instead of deleting it. The tail also fades
 * smoothly after Week 6 rather than falling from 30% to zero at Week 7.
 */
(function(root){
  'use strict';

  const CONFIG = Object.freeze({
    version:'v99',
    residualThresholdPoints:3.0,
    observationCapPoints:24.0,
    correctionScale:0.40,
    finalCorrectionCapPoints:7.0,
    recency:0.60,
    maxObservations:3,
    opponentQualityWeight:0.20,
    opponentQualityCap:1.5,
    spreadLogitScale:6.5,
    // Weeks 2-3 preserve V34's full-strength window. Thereafter the public
    // canonical state decays smoothly so no data/week boundary can erase it.
    weekFade:Object.freeze({1:0,2:1.0,3:1.0,4:0.85,5:0.70,6:0.55,7:0.40,8:0.28,9:0.18,10:0.10,11:0.05,12:0.0})
  });

  function clamp(x,lo,hi){ return Math.max(lo,Math.min(hi,Number(x))); }
  function weekFade(week){
    const w=Math.floor(Number(week)||1);
    if (Object.prototype.hasOwnProperty.call(CONFIG.weekFade,w)) return Number(CONFIG.weekFade[w])||0;
    return w>12 ? 0 : 0;
  }
  function eloPerPoint(scale=340){ return Number(scale)/(CONFIG.spreadLogitScale*Math.log(10)); }

  function rawCorrectionPoints(team,week,state){
    const fade=weekFade(week);
    if (!fade) return 0;
    const hist=state?.[team]||[];
    if (!hist.length) return 0;
    const obs=hist.slice(-CONFIG.maxObservations).reverse();
    let weighted=0,weights=0;
    obs.forEach((o,age)=>{
      const residual=Number(o?.residual)||0;
      const excess=Math.max(0,Math.abs(residual)-CONFIG.residualThresholdPoints);
      const quality=clamp(Number(o?.opponentQuality)||0,-CONFIG.opponentQualityCap,CONFIG.opponentQualityCap);
      const qualityMultiplier=Math.max(0.5,1+CONFIG.opponentQualityWeight*quality);
      const signed=excess ? Math.sign(residual)*Math.min(CONFIG.observationCapPoints,excess*qualityMultiplier) : 0;
      const w=Math.pow(CONFIG.recency,age);
      weighted += signed*w;
      // A quiet/contradictory game is evidence. Keep its weight in the
      // denominator rather than turning the prior correction off wholesale.
      weights += w;
    });
    if (!weights) return 0;
    return clamp(CONFIG.correctionScale*(weighted/weights)*fade,-CONFIG.finalCorrectionCapPoints,CONFIG.finalCorrectionCapPoints);
  }

  function correctionElo(team,week,state,scale=340){
    return rawCorrectionPoints(team,week,state)*eloPerPoint(scale);
  }

  root.FORCE_RATING_CONTINUITY={CONFIG,weekFade,eloPerPoint,rawCorrectionPoints,correctionElo};
})(typeof window!=='undefined'?window:globalThis);
