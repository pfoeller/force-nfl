/*
 * FORCE V98 retrospective opponent-strength look-behind.
 *
 * Purpose: ordinary Elo permanently freezes the amount of credit/debit awarded
 * when a game is played. If an opponent was believed to be strong in Week 2
 * but later proves materially weaker, that old result can remain overrated.
 * This layer revisits the *credit assigned to completed games* using only later
 * evidence about the opponent, without leaking that hindsight into the stored
 * historical pregame forecasts.
 *
 * Key guardrails:
 * - later evidence starts at zero immediately after the game;
 * - evidence is shrunk by the number of subsequent opponent games;
 * - only the opponent's movement AFTER the target game is used, avoiding
 *   direct self-credit from the target result itself;
 * - opponent revisions, per-game corrections, and season corrections are capped;
 * - corrections are re-centered across all rated teams so league average does not drift; the common offset cancels out of matchup probabilities.
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    version: 'v98',
    evidencePriorGames: 3.0,
    maxOpponentRevisionElo: 160.0,
    revisionBlend: 0.75,
    maxGameCorrectionElo: 5.0,
    maxTeamCorrectionElo: 24.0
  });

  function finite(x) { return Number.isFinite(Number(x)); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, Number(x))); }

  function evidenceWeight(laterGames, cfg = CONFIG) {
    const n = Math.max(0, Number(laterGames) || 0);
    const prior = Math.max(0.01, Number(cfg.evidencePriorGames) || CONFIG.evidencePriorGames);
    return n / (n + prior);
  }

  function winProbability(homeElo, awayElo, hfa = 15, scale = 340) {
    return 1 / (1 + Math.pow(10, -((Number(homeElo) + Number(hfa) - Number(awayElo)) / Number(scale))));
  }

  function marginMultiplier(margin, homeElo, awayElo, hfa = 15) {
    return Math.log(Math.max(Number(margin) || 0, 1) + 1) * 2.2 /
      (2.2 + 0.001 * Math.abs((Number(homeElo) + Number(hfa)) - Number(awayElo)));
  }

  function completedResult(game) {
    if (game?.homeScore == null || game?.awayScore == null) return null;
    if (Number(game.homeScore) === Number(game.awayScore)) return 0.5;
    return Number(game.homeScore) > Number(game.awayScore) ? 1 : 0;
  }

  function buildAdjustments(games, finalRatings, opts = {}) {
    const cfg = { ...CONFIG, ...(opts.config || {}) };
    const hfa = finite(opts.hfa) ? Number(opts.hfa) : 15;
    const scale = finite(opts.scale) ? Number(opts.scale) : 340;
    const k = finite(opts.k) ? Number(opts.k) : 20;
    const rows = Array.isArray(games) ? games.filter((g) => completedResult(g) != null) : [];

    const totals = {};
    for (const g of rows) {
      totals[g.home] = (totals[g.home] || 0) + 1;
      totals[g.away] = (totals[g.away] || 0) + 1;
    }
    const seen = {};
    const raw = {};
    const details = [];

    function laterCount(team) {
      return Math.max(0, Number(totals[team] || 0) - Number(seen[team] || 0) - 1);
    }

    function add(team, value) {
      if (!finite(value)) return;
      raw[team] = (raw[team] || 0) + Number(value);
    }

    for (const g of rows) {
      const resultHome = completedResult(g);
      const margin = Math.abs(Number(g.homeScore) - Number(g.awayScore));
      const homeLater = laterCount(g.home);
      const awayLater = laterCount(g.away);

      const required = [g.preHome, g.preAway, g.postHome, g.postAway, g.homeDelta, g.awayDelta,
        finalRatings?.[g.home], finalRatings?.[g.away]];
      if (required.every(finite)) {
        // HOME TEAM: learn later what its AWAY opponent really was. Use only
        // movement after this target game, so the target result cannot create
        // its own retrospective strength credit.
        const awayEvidence = evidenceWeight(awayLater, cfg);
        const awayMoveAfter = Number(finalRatings[g.away]) - Number(g.postAway);
        const awayRevisionRaw = clamp(awayMoveAfter, -cfg.maxOpponentRevisionElo, cfg.maxOpponentRevisionElo);
        const awayRevision = awayRevisionRaw * awayEvidence;
        const revisedAway = Number(g.preAway) + awayRevision;
        const revisedHomeP = winProbability(g.preHome, revisedAway, hfa, scale);
        const revisedHomeMult = marginMultiplier(margin, g.preHome, revisedAway, hfa);
        const revisedHomeDelta = k * revisedHomeMult * (resultHome - revisedHomeP);
        const homeCorrection = clamp((revisedHomeDelta - Number(g.homeDelta)) * cfg.revisionBlend,
          -cfg.maxGameCorrectionElo, cfg.maxGameCorrectionElo);
        add(g.home, homeCorrection);

        // AWAY TEAM: independently learn later what its HOME opponent really was.
        const homeEvidence = evidenceWeight(homeLater, cfg);
        const homeMoveAfter = Number(finalRatings[g.home]) - Number(g.postHome);
        const homeRevisionRaw = clamp(homeMoveAfter, -cfg.maxOpponentRevisionElo, cfg.maxOpponentRevisionElo);
        const homeRevision = homeRevisionRaw * homeEvidence;
        const revisedHome = Number(g.preHome) + homeRevision;
        const revisedHomePForAway = winProbability(revisedHome, g.preAway, hfa, scale);
        const revisedAwayP = 1 - revisedHomePForAway;
        const revisedAwayMult = marginMultiplier(margin, revisedHome, g.preAway, hfa);
        const resultAway = 1 - resultHome;
        const revisedAwayDelta = k * revisedAwayMult * (resultAway - revisedAwayP);
        const awayCorrection = clamp((revisedAwayDelta - Number(g.awayDelta)) * cfg.revisionBlend,
          -cfg.maxGameCorrectionElo, cfg.maxGameCorrectionElo);
        add(g.away, awayCorrection);

        details.push({
          key: g.key || null,
          home: g.home,
          away: g.away,
          week: Number(g.week) || null,
          homeLaterGames: homeLater,
          awayLaterGames: awayLater,
          homeOpponentMoveAfter: awayMoveAfter,
          awayOpponentMoveAfter: homeMoveAfter,
          homeOpponentEvidence: awayEvidence,
          awayOpponentEvidence: homeEvidence,
          homeOpponentRevision: awayRevision,
          awayOpponentRevision: homeRevision,
          homeOriginalDelta: Number(g.homeDelta),
          awayOriginalDelta: Number(g.awayDelta),
          homeRevisedDelta: revisedHomeDelta,
          awayRevisedDelta: revisedAwayDelta,
          homeCorrection,
          awayCorrection
        });
      }

      seen[g.home] = (seen[g.home] || 0) + 1;
      seen[g.away] = (seen[g.away] || 0) + 1;
    }

    const teams = Object.keys(finalRatings || {});
    const capped = {};
    for (const t of teams) capped[t] = clamp(raw[t] || 0, -cfg.maxTeamCorrectionElo, cfg.maxTeamCorrectionElo);
    // A common offset preserves the league mean without changing any pairwise
    // rating difference. Center across *all* rated teams, including a club that
    // has not yet accumulated a raw look-behind correction.
    const center = teams.length ? teams.reduce((s, t) => s + capped[t], 0) / teams.length : 0;
    const adjustments = {};
    for (const t of teams) adjustments[t] = capped[t] - center;

    const teamDiagnostics = {};
    for (const t of Object.keys(finalRatings || {})) {
      const teamRows = details.filter((d) => d.home === t || d.away === t);
      teamDiagnostics[t] = {
        rawCorrection: Number(raw[t] || 0),
        cappedCorrection: Number(capped[t] || 0),
        centeredCorrection: Number(adjustments[t] || 0),
        revisedGames: teamRows.filter((d) => Math.abs(d.home === t ? d.homeCorrection : d.awayCorrection) > 1e-9).length,
        games: teamRows.length
      };
    }

    return {
      config: cfg,
      adjustments,
      raw,
      center,
      details,
      teams: teamDiagnostics
    };
  }

  root.FORCE_RETROSPECTIVE_STRENGTH = {
    CONFIG,
    evidenceWeight,
    winProbability,
    marginMultiplier,
    buildAdjustments
  };
})(window);
