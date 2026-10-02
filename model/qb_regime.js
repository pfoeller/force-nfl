/*
 * FORCE V33 returning-QB regime correction.
 *
 * This is deliberately conservative. The historical event study found that a
 * decaying early-season restoration helped a gated subset of returning-starter
 * injury episodes. V33 therefore promotes only mechanically verified presets
 * and uses a fixed research rule selected before looking at the 2026 results:
 *
 *   initial restore = min(measured surviving damage,
 *                         7.5 Elo × verified missed starts × offseason survival)
 *   hard pre-reversion cap = 60 Elo
 *   half-life = 4 team games
 *
 * MD-03 (Cycle 6): RETIRED FROM PRODUCTION. The owner retired the automatic
 * correction on 2026-10-02 (a decision under uncertainty, not a finding that
 * the effect is zero). assets/app.js no longer calls this module, and the
 * bundled preset is no longer autoEligible. The calculation is kept unchanged
 * as a research record so the V33 contract stays reproducible.
 */
(function(root){
  'use strict';

  const DEFAULTS = Object.freeze({
    eloPerMissedStart: 7.5,
    preReversionCap: 60,
    offseasonSurvival: 0.70,
    halfLifeGames: 4,
    minDisplayedElo: 0.05
  });

  function finite(v){ return Number.isFinite(Number(v)); }

  function eligiblePreset(preset){
    return !!(preset && preset.autoEligible === true && preset.verifiedReplacementWindow === true && preset.expectedStarterReturned === true && Number(preset.missedStarts) > 0);
  }

  function initialRestore(preset, opts={}){
    if (!eligiblePreset(preset)) return 0;
    const eloPerMissedStart = finite(opts.eloPerMissedStart) ? Number(opts.eloPerMissedStart) : DEFAULTS.eloPerMissedStart;
    const cap = finite(opts.preReversionCap) ? Number(opts.preReversionCap) : DEFAULTS.preReversionCap;
    const survival = finite(preset.offseasonSurvivalFraction)
      ? Number(preset.offseasonSurvivalFraction)
      : (finite(opts.offseasonSurvival) ? Number(opts.offseasonSurvival) : DEFAULTS.offseasonSurvival);
    const startsBased = Math.min(cap, Number(preset.missedStarts) * eloPerMissedStart) * survival;
    const measured = finite(preset.postReversionCarryoverDamage) ? Math.max(0, Number(preset.postReversionCarryoverDamage)) : Infinity;
    return Math.max(0, Math.min(startsBased, measured));
  }

  function decayFactor(gamesPlayed, halfLifeGames=DEFAULTS.halfLifeGames){
    const g = Math.max(0, Number(gamesPlayed) || 0);
    const h = Math.max(0.1, Number(halfLifeGames) || DEFAULTS.halfLifeGames);
    return Math.pow(0.5, g / h);
  }

  function correction(preset, gamesPlayed=0, opts={}){
    const start = initialRestore(preset, opts);
    if (!(start > 0)) return 0;
    const halfLife = finite(opts.halfLifeGames) ? Number(opts.halfLifeGames) : DEFAULTS.halfLifeGames;
    const out = start * decayFactor(gamesPlayed, halfLife);
    return out < DEFAULTS.minDisplayedElo ? 0 : out;
  }

  root.FORCE_QB_REGIME = { DEFAULTS, eligiblePreset, initialRestore, decayFactor, correction };
})(window);
