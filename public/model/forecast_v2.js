/*
 * Sunday Signal Forecast v2
 *
 * Purpose
 * -------
 * Keep the independent Elo/QB/injury rating system intact for Power Score and
 * long-range projections, while using real pregame market information when it
 * exists. The original Celo research bundle reports:
 *
 *   Independent model (2023-2025): 0.2170 Brier
 *   Vegas closing spread alone:    0.2095 Brier
 *   Elo + spread logistic blend:   0.2095 Brier
 *   fitted Elo coefficient:        ~0.017 (market dominates)
 *
 * The runtime layer below therefore:
 *   1. computes the independent Elo probability;
 *   2. prefers de-vigged moneyline probability when both sides are present;
 *   3. otherwise converts a point spread to a probability approximation;
 *   4. blends market and FORCE logits with a week-decaying market prior;
 *      W1 75%, W2 50%, W3 25%, W4 15%, W5 10%, W6+ 5% market;
 *   5. falls back fully to the independent model when market data is absent.
 *
 * IMPORTANT: 0.2095 is a CLOSING-LINE backtest benchmark. Current/opening
 * lines available earlier in the week should not be advertised as guaranteed
 * to achieve the same score. This file keeps that distinction explicit.
 */
(function (root) {
  'use strict';

  const META = {
    name: 'Sunday Signal Forecast v2',
    version: '2.0.0',
    benchmarkWindow: '2023-2025',
    independentBrier: 0.2170,
    closingMarketBrier: 0.2095,
    absoluteBrierGain: 0.0075,
    relativeBrierGainPct: 3.46,
    independentEloLogitWeightWhenMarketAvailable: 0.02,
    marketWeightSchedule: { 1: 0.75, 2: 0.50, 3: 0.25, 4: 0.15, 5: 0.10, 6: 0.05 },
    closingLineCaveat:
      'The 0.2095 benchmark uses closing spread. Live/opening market inputs may score differently.'
  };

  function clamp(p, lo = 1e-6, hi = 1 - 1e-6) {
    return Math.max(lo, Math.min(hi, Number(p)));
  }

  function logit(p) {
    p = clamp(p);
    return Math.log(p / (1 - p));
  }

  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function independentProbability(homeElo, awayElo, hfa = 15, scale = 340) {
    return 1 / (1 + Math.pow(10, -((Number(homeElo) + Number(hfa) - Number(awayElo)) / Number(scale))));
  }

  function americanOddsToImplied(odds) {
    const o = Number(odds);
    if (!Number.isFinite(o) || o === 0) return null;
    return o < 0 ? (-o) / ((-o) + 100) : 100 / (o + 100);
  }

  function devigMoneyline(homeOdds, awayOdds) {
    const h = americanOddsToImplied(homeOdds);
    const a = americanOddsToImplied(awayOdds);
    if (h == null || a == null || h + a <= 0) return null;
    return h / (h + a);
  }

  /*
   * Fallback point-spread conversion for live games that have a spread but no
   * usable moneyline. This is intentionally simple and monotonic rather than a
   * claim that the historical 0.2095 fit used this exact coefficient.
   * Positive nflverse spread_line means the home team is favored.
   * spread / 6.5 gives familiar NFL anchors: ~61% at 3, ~75% at 7, ~82% at 10.
   */
  const SPREAD_LOGIT_SCALE = 6.5;

  function spreadToProbability(spreadLine) {
    const s = Number(spreadLine);
    if (!Number.isFinite(s)) return null;
    return sigmoid(s / SPREAD_LOGIT_SCALE);
  }

  // Sportsbook-facing home line implied by a home-win probability. This is the
  // exact inverse of spreadToProbability(): a negative number means the home
  // team is favored. Keeping both directions on one shared scale prevents the
  // FORCE line from being artificially compressed or expanded.
  function probabilityToSpread(probability) {
    const p = clamp(Number(probability));
    return -SPREAD_LOGIT_SCALE * logit(p);
  }

  function marketWeightForWeek(week) {
    const w = Math.max(1, Math.floor(Number(week) || 1));
    if (w <= 1) return 0.75;
    if (w === 2) return 0.50;
    if (w === 3) return 0.25;
    if (w === 4) return 0.15;
    if (w === 5) return 0.10;
    return 0.05;
  }

  function blendLogits(modelP, marketP, modelWeight = META.independentEloLogitWeightWhenMarketAvailable) {
    if (marketP == null) return clamp(modelP);
    const w = Math.max(0, Math.min(1, Number(modelWeight)));
    return sigmoid(w * logit(modelP) + (1 - w) * logit(marketP));
  }

  function marketProbability(game) {
    if (!game) return { probability: null, source: 'none' };
    const money = devigMoneyline(game.homeMoneyline, game.awayMoneyline);
    if (money != null) return { probability: money, source: 'moneyline' };
    const spread = spreadToProbability(game.spreadLine);
    if (spread != null) return { probability: spread, source: 'spread' };
    return { probability: null, source: 'none' };
  }

  function forecastProbability(game, homeElo, awayElo, opts = {}) {
    const hfa = opts.hfa == null ? 15 : Number(opts.hfa);
    const scale = opts.scale == null ? 340 : Number(opts.scale);
    const mode = opts.mode || 'smart';
    const independent = independentProbability(homeElo, awayElo, hfa, scale);
    if (mode === 'independent') {
      return {
        probability: independent,
        independent,
        market: null,
        source: 'independent',
        marketAvailable: false
      };
    }

    const m = marketProbability(game);
    if (m.probability == null) {
      return {
        probability: independent,
        independent,
        market: null,
        source: 'independent',
        marketAvailable: false
      };
    }

    const marketWeight = opts.modelWeight == null
      ? marketWeightForWeek(game && game.week)
      : 1 - Math.max(0, Math.min(1, Number(opts.modelWeight)));
    const modelWeight = 1 - marketWeight;
    return {
      probability: blendLogits(independent, m.probability, modelWeight),
      independent,
      market: m.probability,
      source: m.source,
      marketAvailable: true,
      modelWeight,
      marketWeight
    };
  }

  /*
   * Apply a hypothetical rating change around any baseline probability.
   * Elo uses base-10 logits, so delta Elo maps cleanly to natural-log odds:
   *   delta logit = deltaElo * ln(10) / scale.
   * This lets Roster Lab preserve a market-informed baseline while applying a
   * transparent player/scenario delta instead of throwing the market signal away.
   */
  function applyEloDelta(probability, deltaElo, teamIsHome = true, scale = 340) {
    const sign = teamIsHome ? 1 : -1;
    const shift = sign * Number(deltaElo || 0) * Math.log(10) / Number(scale);
    return sigmoid(logit(probability) + shift);
  }

  root.SIGNAL_FORECAST_V2 = {
    META,
    clamp,
    logit,
    sigmoid,
    independentProbability,
    americanOddsToImplied,
    devigMoneyline,
    spreadToProbability,
    probabilityToSpread,
    marketWeightForWeek,
    blendLogits,
    marketProbability,
    forecastProbability,
    applyEloDelta
  };
})(window);
