/*
 * FORCE V37 early-season unit-prior confidence controller.
 *
 * V34 can conclude that the preseason team-strength prior is probably wrong.
 * V37 carries that *confidence* signal into the diagnostic unit model without
 * inventing a direction for any unit.  The signal only reduces the stabilizing
 * 2025 prior weight; each unit still moves toward its own 2026 evidence.
 *
 * At zero V34 correction: 1.00 effective prior game (legacy behavior).
 * At the capped ±7-point V34 correction: 0.25 effective prior games.
 * Because the V34 correction itself fades to zero by Week 7, this controller
 * automatically returns to ordinary blending later in the season.
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    version: 'v37',
    basePriorGames: 1.0,
    minPriorGames: 0.25,
    signalCapPoints: 7.0
  });

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, Number(x))); }

  function signalStrength(correctionPoints) {
    const x = Math.abs(Number(correctionPoints) || 0);
    return clamp(x / CONFIG.signalCapPoints, 0, 1);
  }

  function effectivePriorGames(correctionPoints, basePriorGames = CONFIG.basePriorGames) {
    const base = Math.max(0, Number(basePriorGames) || 0);
    if (!base) return 0;
    const strength = signalStrength(correctionPoints);
    const minRatio = CONFIG.minPriorGames / CONFIG.basePriorGames;
    return base * (1 - strength * (1 - minRatio));
  }

  function liveWeight(games, correctionPoints, basePriorGames = CONFIG.basePriorGames) {
    const g = Math.max(0, Number(games) || 0);
    const p = effectivePriorGames(correctionPoints, basePriorGames);
    return g + p > 0 ? g / (g + p) : 0;
  }

  root.FORCE_UNIT_PRIOR = { CONFIG, signalStrength, effectivePriorGames, liveWeight };
})(window);
