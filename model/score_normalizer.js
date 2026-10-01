/*
 * FORCE V47 football-score normalizer.
 *
 * The public win probability / predicted line is continuous.  An exact score
 * is only a discrete point estimate, so it should NOT be forced to reproduce
 * that line (or the scoring-profile total) exactly when doing so creates an
 * uncommon football score such as 26-18 or 30-17.
 *
 * V47 therefore treats the line and total as nearby targets rather than hard
 * constraints.  Candidates stay in a tight neighborhood of both targets, then
 * a deliberately strong football-score prior is allowed to break near-ties in
 * favor of common TD/FG-shaped totals (17, 21, 24, 27, 28, 31, etc.).
 */
(function (root) {
  'use strict';

  const EVENTS = [
    { points: 7, cost: 0.04 }, // TD + PAT
    { points: 3, cost: 0.08 }, // field goal
    { points: 8, cost: 0.55 }, // TD + two-point conversion
    { points: 6, cost: 0.65 }, // TD with failed/no PAT
    { points: 2, cost: 1.00 }  // safety / defensive conversion
  ];
  const MAX_SCORE = 70;
  const plausibility = new Array(MAX_SCORE + 1).fill(Infinity);
  plausibility[0] = 0;
  for (let s = 1; s <= MAX_SCORE; s++) {
    for (const event of EVENTS) {
      if (s >= event.points && Number.isFinite(plausibility[s - event.points])) {
        plausibility[s] = Math.min(plausibility[s], plausibility[s - event.points] + event.cost);
      }
    }
    // A one-point final score is technically possible but extraordinarily rare.
    // Keep every integer representable without letting exotic paths dominate.
    if (!Number.isFinite(plausibility[s])) plausibility[s] = 2.5 + s * 0.02;
  }

  function scorePenalty(score) {
    const s = Math.max(0, Math.min(MAX_SCORE, Math.round(Number(score) || 0)));
    return plausibility[s];
  }

  function normalize(total, margin, opts = {}) {
    const rawTotal = Math.max(0, Number(total) || 0);
    const rawMargin = Number(margin) || 0;
    const maxScore = Math.max(40, Math.min(MAX_SCORE, Math.round(Number(opts.maxScore) || MAX_SCORE)));
    const targetMargin = Math.round(rawMargin); // retained for diagnostics/back-compat only

    // V47: squared fit costs keep the score close to the continuous forecast,
    // while the much stronger football prior is allowed to win genuine near-
    // ties.  This is intentionally the inverse of V35's marginWeight=100 rule.
    const marginWeight = Number(opts.marginWeight) || 1.25;
    const totalWeight = Number(opts.totalWeight) || 1.00;
    const plausibilityWeight = Number(opts.plausibilityWeight) || 30.0;
    const maxMarginError = Math.max(1, Number(opts.maxMarginError) || 4);
    const maxTotalError = Math.max(1, Number(opts.maxTotalError) || 4);

    let best = null;
    for (let home = 0; home <= maxScore; home++) {
      for (let away = 0; away <= maxScore; away++) {
        const candidateMargin = home - away;

        // A point estimate should preserve the forecasted winner whenever the
        // model meaningfully favors one side.  Near pick'em remains free to tie.
        if (rawMargin > 0.25 && candidateMargin <= 0) continue;
        if (rawMargin < -0.25 && candidateMargin >= 0) continue;

        const candidateTotal = home + away;
        const marginError = Math.abs(candidateMargin - rawMargin);
        const totalError = Math.abs(candidateTotal - rawTotal);

        // "Common score" preference is a near-tie breaker, not permission to
        // wander away from the underlying spread/total forecast.
        if (marginError > maxMarginError || totalError > maxTotalError) continue;

        const footballPenalty = scorePenalty(home) + scorePenalty(away);
        const fitPenalty = marginWeight * marginError * marginError + totalWeight * totalError * totalError;
        const objective = fitPenalty + plausibilityWeight * footballPenalty;
        const candidate = {
          home, away,
          total: candidateTotal,
          margin: candidateMargin,
          marginError,
          totalError,
          footballPenalty,
          fitPenalty,
          objective
        };
        if (!best || objective < best.objective - 1e-12 ||
            (Math.abs(objective - best.objective) < 1e-12 && fitPenalty < best.fitPenalty - 1e-12) ||
            (Math.abs(objective - best.objective) < 1e-12 && Math.abs(fitPenalty - best.fitPenalty) < 1e-12 && footballPenalty < best.footballPenalty - 1e-12) ||
            (Math.abs(objective - best.objective) < 1e-12 && Math.abs(fitPenalty - best.fitPenalty) < 1e-12 && Math.abs(footballPenalty - best.footballPenalty) < 1e-12 && totalError < best.totalError - 1e-12)) {
          best = candidate;
        }
      }
    }

    // The ±4 neighborhood always contains ordinary integer-score candidates,
    // but retain a defensive fallback if a caller supplies unusual constraints.
    if (!best) {
      let home = Math.max(0, Math.round((rawTotal + rawMargin) / 2));
      let away = Math.max(0, Math.round((rawTotal - rawMargin) / 2));
      if (rawMargin > 0.25 && home <= away) home = away + 1;
      if (rawMargin < -0.25 && away <= home) away = home + 1;
      const candidateTotal = home + away;
      const candidateMargin = home - away;
      const marginError = Math.abs(candidateMargin - rawMargin);
      const totalError = Math.abs(candidateTotal - rawTotal);
      const footballPenalty = scorePenalty(home) + scorePenalty(away);
      const fitPenalty = marginWeight * marginError * marginError + totalWeight * totalError * totalError;
      best = { home, away, total: candidateTotal, margin: candidateMargin, marginError, totalError, footballPenalty, fitPenalty, objective: fitPenalty + plausibilityWeight * footballPenalty };
    }

    return {
      ...best,
      rawTotal,
      rawMargin,
      targetMargin,
      weights: { marginWeight, totalWeight, plausibilityWeight, maxMarginError, maxTotalError }
    };
  }

  root.FORCE_SCORE_NORMALIZER = { EVENTS, scorePenalty, normalize };
})(typeof window !== 'undefined' ? window : globalThis);
