import {appHarness} from './force_app_harness.js';

const clamp = value => Math.max(0, Math.min(100, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);

// Internal, offline investigation tooling. Execute the actual ordered browser
// bundle; do not export hooks in production or rewrite either scoring pipeline.
export function qbAuditHarness(input) {
  for (const key of ['teamRows', 'playerRows', 'schedule']) {
    if (!Array.isArray(input?.[key])) throw new Error(`Audit input requires ${key}`);
  }
  if (!input.gameFlow || typeof input.gameFlow !== 'object') throw new Error('Audit input requires gameFlow');
  const h = appHarness({hooks:'qbCustomRawScore,qbCustomScore,qbComponentScores,QB_DEFAULT_WEIGHTS'});
  for (const [team, prior] of Object.entries(input.priorProfiles || {})) {
    if (!(team in h.context.window.MODEL_DATA.teams)) throw new Error(`Unknown prior team: ${team}`);
    h.context.window.MATCHUP_DATA.profiles[team] = {...h.context.window.MATCHUP_DATA.profiles[team], ...structuredClone(prior)};
  }
  Object.assign(h.api.S, {
    liveTeamStats:structuredClone(input.teamRows), livePlayerStats:structuredClone(input.playerRows),
    schedule:structuredClone(input.schedule), liveGameFlow2026:structuredClone(input.gameFlow),
    statsVersion:1, scheduleVersion:1,
  });
  return h;
}

export function auditQbCustomize(h, weights = h.api.QB_DEFAULT_WEIGHTS) {
  const keys = Object.keys(h.api.QB_DEFAULT_WEIGHTS);
  if (Object.keys(weights).length !== keys.length || keys.some(key => !finite(weights[key]) || weights[key] < 0)) {
    throw new Error('Audit weights must contain exactly five finite, nonnegative component weights');
  }
  const profiles = h.api.liveProfiles();
  const inputStatus = h.L.gameFlowQbStatus(h.api.S.liveGameFlow2026);
  const rows = [];
  for (const team of Object.keys(h.context.window.MODEL_DATA.teams).sort()) {
    const p = profiles[team], q = p?.qb;
    const share = q?.primary_qb_dropback_share;
    const base = {team, qb:q?.qb || null, inputState:q?.data_state || null,
      visibleInRankings:finite(share) && share >= 0.60, primaryShare:finite(share) ? share : null};
    // Never turn missing/stale-semantic/preseason data into a neutral comparison.
    if (!inputStatus.ready || q?.unavailable || !finite(p?.qbIndex) || !finite(q?.raw_live_qb_score)
        || !finite(q?.live_qb_score) || !finite(q?.pre_recency_qb_index) || !finite(q?.recency_adjustment)) {
      rows.push({...base, status:'unavailable', reason:inputStatus.reason || q?.unavailable_reason || 'Current canonical QB stages unavailable'});
      continue;
    }
    const c = h.api.qbComponentScores(team);
    const d = c.debug;
    const componentFields = ['pass_epa_score','any_a_score','pass_success_score','rushing_value_score','cpoe_score'];
    if (componentFields.some(key => !finite(q[key])) || !finite(d.displayedQbIndex)) {
      rows.push({...base, status:'unavailable', reason:'Current component/display stages unavailable'});
      continue;
    }
    const customRaw = h.api.qbCustomRawScore(c, weights);
    const customFinal = h.api.qbCustomScore(c, weights);
    const opponent = d.opponentRatingAdjustment, pressure = d.olRatingAdjustment;
    const recency = q.recency_adjustment;
    // These explicitly labeled counterfactual stages isolate clipping order;
    // they are not claimed to be values emitted by the custom pipeline.
    const customContextClamped = clamp(customRaw + opponent + pressure);
    const customStagedFinal = clamp(customContextClamped + recency);
    const clippingOrderGap = customFinal - customStagedFinal;
    const continuityAndRawGap = customStagedFinal - p.qbIndex;
    const scenarioGap = d.displayedQbIndex - p.qbIndex;
    rows.push({...base, status:'comparable', components:Object.fromEntries(keys.map(key => [key,c[key]])),
      raw:{canonical:q.raw_live_qb_score, custom:customRaw},
      context:{opponent, pressure, recency},
      continuity:{prior:p._preseasonUnitPrior?.qbIndex ?? null, games:p._live?.playerStatGames ?? null,
        priorGames:q.prior_games_used ?? null, liveBeforeBlend:q.live_qb_score, canonicalBeforeRecency:q.pre_recency_qb_index},
      final:{canonicalMeasured:p.qbIndex, canonicalDisplayed:d.displayedQbIndex, custom:customFinal},
      counterfactual:{customContextClamped, customStagedFinal},
      gap:{customMinusDisplayed:customFinal-d.displayedQbIndex, continuityAndRawGap, clippingOrderGap, scenarioGap},
    });
  }
  const compared = rows.filter(row => row.status === 'comparable' && row.visibleInRankings);
  return {weights:{...weights}, inputStatus, rows,
    summary:{visibleCompared:compared.length, unavailable:rows.filter(row => row.status === 'unavailable').length,
      meanAbsoluteGap:compared.length ? compared.reduce((sum,row) => sum+Math.abs(row.gap.customMinusDisplayed),0)/compared.length : null,
      maxAbsoluteGap:compared.length ? Math.max(...compared.map(row => Math.abs(row.gap.customMinusDisplayed))) : null},
  };
}
