/*
 * Sunday Signal Adaptive Forecast v3 (RESEARCH MODE)
 *
 * Leak-safe principle: every adjustment for game G is computed only from
 * games completed before G. The game outcome is added to team state only
 * after its forecast has been scored.
 *
 * This layer is intentionally NOT the public Power Score. It is a forecast
 * overlay that tests whether the market has been systematically high/low on
 * a particular team and whether the independent model or market has recently
 * been more reliable for that team's games.
 */
(function (root) {
  'use strict';

  const V2 = root.SIGNAL_FORECAST_V2;

  const META = {
    name: 'Sunday Signal Adaptive Forecast v3',
    version: '3.0.0-research',
    status: 'research-candidate-not-promoted',
    baselineClosingMarketBrier: 0.2095,
    validatedAdaptiveBrier: null,
    note: 'Adaptive coefficients must earn promotion in a leak-safe historical walk-forward backtest.'
  };

  const DEFAULTS = {
    decay: 0.85,
    priorGames: 6.0,
    baseMarketWeight: 0.98,
    minMarketWeight: 0.82,
    maxMarketWeight: 0.995,
    trustSensitivity: 1.50,
    residualGamma: 0.30,
    favoriteGamma: 0.20,
    favoriteThreshold: 6.0,
    maxPointCorrection: 2.5,
    spreadLogitScale: 6.5,
    // Do not force a second divisional compression onto a line that already
    // prices the matchup. The trainer is allowed to move this off zero.
    divisionCompression: 0.0
  };

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, Number(x)));
  }

  function emptyTeamState() {
    return {
      residualSum: 0,
      residualWeight: 0,
      favoriteResidualSum: 0,
      favoriteResidualWeight: 0,
      brierAdvantageSum: 0,
      brierWeight: 0,
      games: 0,
      marketGames: 0,
      bigFavoriteGames: 0
    };
  }

  function ensure(states, team) {
    if (!states[team]) states[team] = emptyTeamState();
    return states[team];
  }

  function decayTeamState(s, decay) {
    s.residualSum *= decay;
    s.residualWeight *= decay;
    s.favoriteResidualSum *= decay;
    s.favoriteResidualWeight *= decay;
    s.brierAdvantageSum *= decay;
    s.brierWeight *= decay;
  }

  function teamSnapshot(s, cfg = DEFAULTS) {
    s = s || emptyTeamState();
    const prior = Number(cfg.priorGames);
    const residual = s.residualSum / (s.residualWeight + prior);
    const favoriteResidual = s.favoriteResidualSum / (s.favoriteResidualWeight + prior);
    const avgBrierAdvantage = s.brierAdvantageSum / (s.brierWeight + prior);
    // Positive advantage means the market has beaten the independent model.
    const marketWeight = clamp(
      Number(cfg.baseMarketWeight) + Number(cfg.trustSensitivity) * avgBrierAdvantage,
      Number(cfg.minMarketWeight), Number(cfg.maxMarketWeight)
    );
    return {
      residual,
      favoriteResidual,
      avgBrierAdvantage,
      marketWeight,
      effectiveGames: s.residualWeight,
      games: s.games,
      marketGames: s.marketGames,
      bigFavoriteGames: s.bigFavoriteGames
    };
  }

  function sameDivision(game, teamMeta) {
    if (game.divisional != null) return !!game.divisional;
    const h = teamMeta && teamMeta[game.home];
    const a = teamMeta && teamMeta[game.away];
    return !!(h && a && h.division && h.division === a.division);
  }

  function matchupContext(game, states, teamMeta, cfg = DEFAULTS) {
    const hs = teamSnapshot(states[game.home], cfg);
    const as = teamSnapshot(states[game.away], cfg);
    const spread = Number(game.spreadLine);
    let correctionPoints = Number(cfg.residualGamma) * (hs.residual - as.residual);
    let favoriteTerm = 0;

    if (Number.isFinite(spread) && Math.abs(spread) >= Number(cfg.favoriteThreshold)) {
      if (spread > 0) favoriteTerm = Number(cfg.favoriteGamma) * hs.favoriteResidual;
      else if (spread < 0) favoriteTerm = -Number(cfg.favoriteGamma) * as.favoriteResidual;
      correctionPoints += favoriteTerm;
    }

    const divisional = sameDivision(game, teamMeta);
    let divisionTerm = 0;
    if (divisional && Number.isFinite(spread) && Number(cfg.divisionCompression) !== 0) {
      // Compression means pull the market margin toward zero.
      divisionTerm = -spread * Number(cfg.divisionCompression);
      correctionPoints += divisionTerm;
    }

    correctionPoints = clamp(correctionPoints, -Number(cfg.maxPointCorrection), Number(cfg.maxPointCorrection));
    const marketWeight = (hs.marketWeight + as.marketWeight) / 2;
    return { home: hs, away: as, marketWeight, correctionPoints, favoriteTerm, divisionTerm, divisional };
  }

  function forecastProbability(game, homeElo, awayElo, states, teamMeta, opts = {}) {
    const cfg = { ...DEFAULTS, ...(opts.config || {}) };
    const hfa = opts.hfa == null ? 15 : Number(opts.hfa);
    const scale = opts.scale == null ? 340 : Number(opts.scale);
    const independent = V2.independentProbability(homeElo, awayElo, hfa, scale);
    const m = V2.marketProbability(game);
    const context = matchupContext(game, states, teamMeta, cfg);
    context.homeEloEquivalent = teamEloEquivalent(context.home, scale, cfg);
    context.awayEloEquivalent = teamEloEquivalent(context.away, scale, cfg);

    if (m.probability == null) {
      const adaptiveIndependent = V2.independentProbability(
        Number(homeElo) + context.homeEloEquivalent,
        Number(awayElo) + context.awayEloEquivalent,
        hfa, scale
      );
      return {
        probability: adaptiveIndependent,
        independent,
        market: null,
        adjustedMarket: null,
        source: 'adaptive-history',
        marketAvailable: false,
        adaptive: true,
        context
      };
    }

    const adjustedMarket = V2.sigmoid(
      V2.logit(m.probability) + context.correctionPoints / Number(cfg.spreadLogitScale)
    );
    const modelWeight = 1 - context.marketWeight;
    const probability = V2.blendLogits(independent, adjustedMarket, modelWeight);
    return {
      probability,
      independent,
      market: m.probability,
      adjustedMarket,
      source: `adaptive-${m.source}`,
      marketAvailable: true,
      adaptive: true,
      context
    };
  }

  function updateAfterGame(game, homeElo, awayElo, states, teamMeta, opts = {}) {
    const cfg = { ...DEFAULTS, ...(opts.config || {}) };
    const hs = ensure(states, game.home);
    const as = ensure(states, game.away);
    decayTeamState(hs, Number(cfg.decay));
    decayTeamState(as, Number(cfg.decay));
    hs.games += 1;
    as.games += 1;

    if (game.homeScore == null || game.awayScore == null) return;
    const m = V2.marketProbability(game);
    if (m.probability == null) return;

    const y = game.homeScore === game.awayScore ? 0.5 : game.homeScore > game.awayScore ? 1 : 0;
    const independent = V2.independentProbability(homeElo, awayElo,
      opts.hfa == null ? 15 : Number(opts.hfa),
      opts.scale == null ? 340 : Number(opts.scale));
    const modelBrier = Math.pow(independent - y, 2);
    const marketBrier = Math.pow(m.probability - y, 2);
    const marketAdvantage = modelBrier - marketBrier;

    [hs, as].forEach((s) => {
      s.brierAdvantageSum += marketAdvantage;
      s.brierWeight += 1;
      s.marketGames += 1;
    });

    const spread = Number(game.spreadLine);
    if (Number.isFinite(spread)) {
      const actualHomeMargin = Number(game.homeScore) - Number(game.awayScore);
      const homeResidual = actualHomeMargin - spread;
      hs.residualSum += homeResidual;
      hs.residualWeight += 1;
      as.residualSum -= homeResidual;
      as.residualWeight += 1;

      if (spread >= Number(cfg.favoriteThreshold)) {
        hs.favoriteResidualSum += homeResidual;
        hs.favoriteResidualWeight += 1;
        hs.bigFavoriteGames += 1;
      } else if (spread <= -Number(cfg.favoriteThreshold)) {
        // Away team's actual margin vs its expected positive margin is -homeResidual.
        as.favoriteResidualSum -= homeResidual;
        as.favoriteResidualWeight += 1;
        as.bigFavoriteGames += 1;
      }
    }
  }

  function teamEloEquivalent(snapshot, scale = 340, cfg = DEFAULTS) {
    // General team residual only; matchup-specific favorite/division effects are
    // deliberately excluded from this diagnostic.
    const points = Number(cfg.residualGamma) * Number(snapshot.residual || 0);
    return points / Number(cfg.spreadLogitScale) * Number(scale) / Math.log(10);
  }

  root.SIGNAL_ADAPTIVE_V3 = {
    META,
    DEFAULTS,
    emptyTeamState,
    teamSnapshot,
    matchupContext,
    forecastProbability,
    updateAfterGame,
    teamEloEquivalent,
    sameDivision
  };
})(window);
