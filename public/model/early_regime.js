/*
 * FORCE V34 early-season regime detector.
 *
 * Purpose: preseason priors are useful but can be badly wrong.  This module
 * watches how far a team's actual scoring margin differs from the independent
 * FORCE expectation and temporarily accelerates the rating when early results
 * repeatedly contradict that prior.  The adjustment is deliberately transient:
 * full strength in Weeks 2-3, tapered in Weeks 4-6, and exactly zero from Week 7.
 *
 * IMPORTANT: observations are added only AFTER an entire week's slate has been
 * forecast, so one early Sunday final cannot leak into a later kickoff.
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    version: 'v34',
    residualThresholdPoints: 3.0,
    observationCapPoints: 24.0,
    correctionScale: 0.40,
    finalCorrectionCapPoints: 7.0,
    recency: 0.60,
    maxObservations: 3,
    consistencyGames: 2,
    opponentQualityWeight: 0.20,
    opponentQualityEloScale: 100.0,
    opponentQualityCap: 1.5,
    meanElo: 1505.0,
    spreadLogitScale: 6.5,
    weekFade: Object.freeze({ 1: 0, 2: 1.0, 3: 1.0, 4: 0.80, 5: 0.55, 6: 0.30 })
  });

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, Number(x))); }
  function logit(p) {
    const q = clamp(p, 1e-6, 1 - 1e-6);
    return Math.log(q / (1 - q));
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function expectedMarginFromProbability(p) { return CONFIG.spreadLogitScale * logit(p); }
  function probabilityFromExpectedMargin(m) { return sigmoid(Number(m) / CONFIG.spreadLogitScale); }
  function weekFade(week) { return Number(CONFIG.weekFade[Math.floor(Number(week) || 1)] || 0); }

  function opponentQuality(opponentElo) {
    return clamp((Number(opponentElo) - CONFIG.meanElo) / CONFIG.opponentQualityEloScale,
      -CONFIG.opponentQualityCap, CONFIG.opponentQualityCap);
  }

  function ensureTeam(state, team) {
    if (!state[team]) state[team] = [];
    return state[team];
  }

  function addObservation(state, team, residualPoints, opponentElo) {
    const hist = ensureTeam(state, team);
    hist.push({
      residual: Number(residualPoints) || 0,
      opponentQuality: opponentQuality(opponentElo)
    });
    if (hist.length > 12) hist.splice(0, hist.length - 12);
  }

  function rawCorrectionPoints(team, week, state) {
    const fade = weekFade(week);
    if (!fade) return 0;
    const hist = state?.[team] || [];
    if (!hist.length) return 0;

    // Once two results exist, require the latest two to be meaningful surprises
    // in the same direction.  Week 2 may react to one extreme Week 1 result;
    // from Week 3 on, contradictory evidence shuts the regime signal off.
    if (hist.length >= CONFIG.consistencyGames) {
      const last = hist.slice(-CONFIG.consistencyGames).map((x) => Number(x.residual) || 0);
      const t = CONFIG.residualThresholdPoints;
      const consistent = last.every((x) => x > t) || last.every((x) => x < -t);
      if (!consistent) return 0;
    }

    const obs = hist.slice(-CONFIG.maxObservations).reverse();
    let weighted = 0, weights = 0;
    obs.forEach((o, age) => {
      const r = Number(o.residual) || 0;
      const excess = Math.max(0, Math.abs(r) - CONFIG.residualThresholdPoints);
      const qualityMultiplier = Math.max(0.5, 1 + CONFIG.opponentQualityWeight * Number(o.opponentQuality || 0));
      const signed = excess ? Math.sign(r) * Math.min(CONFIG.observationCapPoints, excess * qualityMultiplier) : 0;
      // Keep every recent game's recency weight in the denominator.  A quiet
      // result is evidence against a continuing regime shift and should damp,
      // not disappear from, the rolling signal.
      const w = Math.pow(CONFIG.recency, age);
      weighted += signed * w;
      weights += w;
    });
    if (!weights) return 0;
    const points = CONFIG.correctionScale * (weighted / weights) * fade;
    return clamp(points, -CONFIG.finalCorrectionCapPoints, CONFIG.finalCorrectionCapPoints);
  }

  function eloPerPoint(scale = 340) {
    return Number(scale) / (CONFIG.spreadLogitScale * Math.log(10));
  }

  function correctionElo(team, week, state, scale = 340) {
    return rawCorrectionPoints(team, week, state) * eloPerPoint(scale);
  }

  function observationFromGame(game, baselineHomeProbability, homeElo, awayElo) {
    if (game?.homeScore == null || game?.awayScore == null) return null;
    const expected = expectedMarginFromProbability(baselineHomeProbability);
    const actual = Number(game.homeScore) - Number(game.awayScore);
    const residual = actual - expected;
    return {
      expectedMargin: expected,
      actualMargin: actual,
      residual,
      home: { team: game.home, residual, opponentElo: awayElo },
      away: { team: game.away, residual: -residual, opponentElo: homeElo }
    };
  }

  root.FORCE_EARLY_REGIME = {
    CONFIG,
    expectedMarginFromProbability,
    probabilityFromExpectedMargin,
    opponentQuality,
    addObservation,
    rawCorrectionPoints,
    eloPerPoint,
    correctionElo,
    observationFromGame
  };
})(window);
