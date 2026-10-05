(() => {
  'use strict';

  const QB_EPA_DEFINITION = 'v149-all-play-v2';
  const QB_REFERENCE_VERSION = 'V149-QB-ALL-PLAY-REFERENCE-5';

  const ALIASES = { STL:'LAR', LA:'LAR', LAR:'LAR', SD:'LAC', LAC:'LAC', OAK:'LV', LV:'LV', JAC:'JAX', JAX:'JAX' };
  const canon = (t) => ALIASES[t] || t;
  const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const clamp = (v, lo=0, hi=100) => Math.max(lo, Math.min(hi, Number(v)));
  // V144: weighted averages of multiple percentile-style QB components mechanically
  // compress the tails toward 50. Re-expand only the composite, not the inputs.
  const QB_COMPOSITE_EXPANSION = 1.20;
  const calibrateQbComposite = (v) => clamp(50 + QB_COMPOSITE_EXPANSION * (Number(v) - 50));
  const safeDiv = (a,b) => Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a/b : null;
  const sum = (rows, key) => rows.reduce((acc, r) => acc + (n(r[key]) || 0), 0);
  // nflverse uses negative sack_yards_lost; older feeds may use positive aliases.
  // Select one finite field per row (including zero), then subtract its magnitude once.
  const qbSackYardsLost = (rows) => rows.reduce((total, row) => {
    for (const key of ['sack_yards_lost','sack_yards','sacks_suffered_yards','passing_sack_yards']) {
      const value=n(row[key]);
      if (value!=null) return total+Math.abs(value);
    }
    return total;
  }, 0);
  const weightedMean = (rows, valueKey, weightKey) => {
    let num = 0, den = 0;
    for (const r of rows) {
      const v = n(r[valueKey]), w = n(r[weightKey]);
      if (v == null || w == null || w <= 0) continue;
      num += v*w; den += w;
    }
    return den ? num/den : null;
  };
  const uniqCount = (rows) => new Set(rows.map((r) => r.game_id || `${r.week}|${r.opponent_team || ''}`)).size;
  const maxWeek = (rows) => rows.reduce((m,r) => Math.max(m, Number(r?.week)||0), 0);
  const finiteMetric = (v) => (v != null && v !== '' && Number.isFinite(Number(v))) ? clamp(Number(v)) : null;
  function availableComposite(profile, weights) {
    let num=0, den=0;
    for (const [key,w] of Object.entries(weights||{})) {
      const v=finiteMetric(profile?.[key]);
      if (v==null || !(Number(w)>0)) continue;
      num += Number(w)*v; den += Number(w);
    }
    return den>0 ? num/den : null;
  }

  function linearFit(points) {
    const rows=(points||[]).filter((p)=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y))).map((p)=>({x:Number(p.x),y:Number(p.y)}));
    if (rows.length<2) return null;
    const mx=rows.reduce((a,p)=>a+p.x,0)/rows.length, my=rows.reduce((a,p)=>a+p.y,0)/rows.length;
    let num=0,den=0;
    for (const p of rows) { num+=(p.x-mx)*(p.y-my); den+=(p.x-mx)*(p.x-mx); }
    if (!(den>0)) return null;
    const slope=num/den, intercept=my-slope*mx;
    return {slope,intercept,meanX:mx,meanY:my,n:rows.length,predict:(x)=>intercept+slope*Number(x)};
  }

  function percentileMap(rawByTeam, higherBetter=true) {
    const entries = Object.entries(rawByTeam).filter(([,v]) => Number.isFinite(Number(v))).sort((a,b) => Number(a[1])-Number(b[1]));
    const out = {};
    if (!entries.length) return out;
    if (entries.length === 1) { out[entries[0][0]] = 50; return out; }
    // Mid-rank ties. V27 assigned equal observations different percentiles solely
    // because of team iteration order, which is unacceptable in small samples.
    const values = entries.map(([,v])=>Number(v));
    for (const [team, raw] of entries) {
      const x = Number(raw);
      const below = values.filter((v)=>v < x).length;
      const equal = values.filter((v)=>v === x).length;
      const rank = below + (equal - 1) / 2;
      const pct = 100 * rank / (values.length - 1);
      out[team] = higherBetter ? pct : 100-pct;
    }
    return out;
  }


  // Score one live observation against a stable prior distribution. Early in a
  // season, league-only weekly percentiles are too volatile: an objectively elite
  // performance can be dragged below an elite preseason prior merely because an
  // unrelated secondary metric ranked poorly in a 32-team one-game sample.
  // Stable prior benchmarking keeps the meaning of 0-100 unit grades anchored
  // while the one-game prior still controls how quickly the grade itself moves.
  function percentileValue(values, value, higherBetter=true) {
    const x = Number(value);
    const arr = (values || []).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!Number.isFinite(x) || !arr.length) return null;
    if (arr.length === 1) return 50;
    let below = 0, equal = 0;
    for (const v of arr) {
      if (v < x) below += 1;
      else if (v === x) equal += 1;
    }
    const rank = equal ? below + (equal - 1) / 2 : below;
    const pct = clamp(100 * rank / (arr.length - 1));
    return higherBetter ? pct : 100 - pct;
  }

  function priorPercentile(priorProfiles, getter, value, higherBetter=true) {
    const vals = Object.values(priorProfiles || {}).map(getter).filter((v)=>Number.isFinite(Number(v)));
    return percentileValue(vals, value, higherBetter);
  }

  function medianValue(values=[]) {
    const arr=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!arr.length) return null;
    const m=Math.floor(arr.length/2);
    return arr.length%2 ? arr[m] : (arr[m-1]+arr[m])/2;
  }

  // V103 stable QB benchmark. The live metric is intentionally not ranked against
  // the first 1-2 weeks of the current season. Instead, preserve the shape of the
  // prior-season QB EPA distribution and translate only its center to the current
  // sack-free/opponent-adjusted metric level. This keeps a strong absolute EPA
  // performance strong even when several other QBs also start hot.
  function shiftedPriorPercentile(priorProfiles, getter, value, currentValues=[], higherBetter=true) {
    const priorVals=Object.values(priorProfiles||{}).map(getter).map(Number).filter(Number.isFinite);
    const liveVals=(currentValues||[]).map(Number).filter(Number.isFinite);
    const x=Number(value);
    if (!Number.isFinite(x) || !priorVals.length) return null;
    const priorMedian=medianValue(priorVals), liveMedian=medianValue(liveVals);
    const shift=(Number.isFinite(priorMedian)&&Number.isFinite(liveMedian)) ? liveMedian-priorMedian : 0;
    return percentileValue(priorVals,x-shift,higherBetter);
  }

  const QB_V104 = Object.freeze({
    passEpaWeight:0.75,
    cpoeWeight:0.25,
    cpoeSoftness:7.5,
    cpoeShrinkAttempts:60.0,
    priorFloorGames:1.0,
    priorFloorThroughGames:4,
    rushingBonusCap:12.0,
    rushingBonusEpaScale:15.0,
    rushingBonusAttemptHalfLife:12.0,
    // V137 pressure context: +/-3 rating-point full-scale component.
    // 75% standard-rush protection difficulty, 25% QB performance under disruption.
    protectionAdjustmentScale:3.0,
    standardRushPressureWeight:0.75,
    pressurePerformanceWeight:0.25,
    pressureEpaWeight:0.70,
    pressureSuccessWeight:0.30,
    pressurePerformanceStabilizerPlays:30.0
  });
  const QB_V106 = Object.freeze({
    // V130 canonical FORCE QB Rating weights.
    passEpaWeight:0.30,
    anyAWeight:0.30,
    passSuccessWeight:0.20,
    rushingValueWeight:0.10,
    cpoeWeight:0.10,
    epaStabilizerAttempts:150.0,
    successStabilizerAttempts:100.0,
    cpoeStabilizerAttempts:60.0,
    cpoeSoftness:7.5,
    rushingBonusCap:12.0,
    rushingBonusEpaScale:15.0,
    rushingBonusAttemptHalfLife:12.0,
    // V137 pressure context: +/-3 rating-point full-scale component.
    // 75% standard-rush protection difficulty, 25% QB performance under disruption.
    protectionAdjustmentScale:3.0,
    standardRushPressureWeight:0.75,
    pressurePerformanceWeight:0.25,
    pressureEpaWeight:0.70,
    pressureSuccessWeight:0.30,
    pressurePerformanceStabilizerPlays:30.0
  });
  const UNIT_V109 = Object.freeze({
    receiverResidualStabilizerTargets:120.0,
    rbRushStabilizerCarries:80.0,
    rbRecvResidualStabilizerTargets:60.0
  });
  const UNIT_V114 = Object.freeze({
    receiverResidualStabilizerTargets:120.0,
    rbRushStabilizerCarries:80.0,
    rbRecvResidualStabilizerTargets:60.0,
    environmentAlign:true
  });
  const UNIT_V115 = Object.freeze({
    // V115 keeps reliability shrinkage, but lets strong early room-level evidence
    // separate more than V114 once the over-orthogonalization is removed.
    receiverResidualStabilizerTargets:80.0,
    rbRushStabilizerCarries:50.0,
    rbRecvResidualStabilizerTargets:40.0,
    environmentAlign:true,
    orthogonalRidgeFraction:0.50
  });
  function receiverResidualPolicyActive(policy) { return ['v102-residual','v109-stabilized-residual','v114-centered-stabilized-residual','v115-partial-orthogonal'].includes(String(policy||'')); }
  function rbResidualPolicyActive(policy) { return ['v102-residual-receiving','v109-stabilized-residual','v114-centered-stabilized-residual','v115-partial-orthogonal'].includes(String(policy||'')); }
  function environmentAlignToHistoricalCenter(value,currentCenter,historicalCenter) {
    const x=Number(value), c=Number(currentCenter), h=Number(historicalCenter);
    return Number.isFinite(x)&&Number.isFinite(c)&&Number.isFinite(h) ? h+(x-c) : x;
  }
  // Backward-compatible alias for regression tests and external diagnostics.
  const QB_V103 = QB_V104;

  function reliabilityWeight(attempts, stabilizerAttempts) {
    const a=Math.max(0,Number(attempts)||0), k=Math.max(0,Number(stabilizerAttempts)||0);
    return (a>0 || k>0) ? a/(a+k) : 0;
  }

  function stabilizeToward(value, center, attempts, stabilizerAttempts) {
    const x=Number(value), c=Number(center);
    if (!Number.isFinite(x)) return null;
    const base=Number.isFinite(c)?c:0;
    const w=reliabilityWeight(attempts,stabilizerAttempts);
    return base+w*(x-base);
  }

  function weightedLeagueMean(rows, valueKey, weightKey) {
    let num=0,den=0;
    for (const r of rows||[]) {
      const v=Number(r?.[valueKey]), w=Math.max(0,Number(r?.[weightKey])||0);
      if (!Number.isFinite(v) || !(w>0)) continue;
      num += v*w; den += w;
    }
    return den>0 ? num/den : null;
  }

  function qbCpoeScore(cpoe, attempts=null) {
    const x=Number(cpoe), hasAttempts=attempts!=null && Number.isFinite(Number(attempts)), a=Math.max(0,Number(attempts)||0);
    if (!Number.isFinite(x)) return 50;
    // V104 empirical-Bayes shrinkage: two-game accuracy spikes should not be
    // treated like full-season true talent. The observation earns its way toward
    // the raw CPOE as attempts accumulate. Direct callers that omit attempts retain
    // the legacy raw transform for backwards-compatible diagnostics/tests.
    const shrink=hasAttempts ? (a/(a+QB_V104.cpoeShrinkAttempts)) : 1;
    const effective=x*shrink;
    return clamp(50 + 50*Math.tanh(effective/QB_V104.cpoeSoftness));
  }

  function historicalWindowValues(reference, metric, games=1) {
    const nGames=Math.max(1,Math.round(Number(games)||1));
    const rows=reference?.sample_windows?.[String(nGames)]?.[metric];
    return Array.isArray(rows) ? rows.map(Number).filter(Number.isFinite) : [];
  }

  // V105 safety fallback. Historical windows are the canonical calibration, but
  // an unavailable reference must never silently revert to V103's 32-team rank
  // transform. This absolute mapping is intentionally conservative and is tagged
  // in diagnostics so a missing reference is obvious rather than hidden.
  function qbPassAbsoluteFallback(value) {
    const x=Number(value);
    if (!Number.isFinite(x)) return null;
    return clamp(50 + 50*Math.tanh((x-0.10)/0.30));
  }

  function priorQbPassEpa(profile) {
    const qb=profile?.qb||{};
    const v=Number.isFinite(Number(qb.epaoe))?Number(qb.epaoe):Number(qb.epa_per_play);
    return Number.isFinite(v)?v:null;
  }

  // The legacy 2025 receiver bucket includes RB targets in several teams. Remove
  // the RB room contribution when target counts permit so V115's historical WR/TE
  // scale is materially like-for-like with the live WR/TE-only room.
  function priorReceiverWrteEpa(profile) {
    const rec=profile?.receivers||{}, rb=profile?.rb||{};
    const recv=Number(rec.adj_epa), recTargets=Math.max(0,Number(rec.targets)||0);
    const rbRecv=Number(rb.adj_recv), rbTargets=Math.max(0,Number(rb.targets)||0);
    if (!Number.isFinite(recv)) return null;
    if (recTargets>rbTargets && rbTargets>0 && Number.isFinite(rbRecv)) {
      return (recv*recTargets-rbRecv*rbTargets)/(recTargets-rbTargets);
    }
    return recv;
  }

  function ridgeOrthogonalSlope(points, ridgeFraction=0.50) {
    const rows=(points||[]).filter((p)=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y))).map((p)=>({x:Number(p.x),y:Number(p.y)}));
    if (rows.length<8) return 0;
    const mx=rows.reduce((a,p)=>a+p.x,0)/rows.length, my=rows.reduce((a,p)=>a+p.y,0)/rows.length;
    let cov=0,varx=0;
    for (const p of rows) { cov+=(p.x-mx)*(p.y-my); varx+=(p.x-mx)*(p.x-mx); }
    if (!(varx>0)) return 0;
    // Ridge shrinks a shared-outcome OLS slope toward zero; this deliberately
    // avoids treating every unit of team/QB efficiency as value that must be
    // subtracted from the receiving unit that helped create it.
    return cov/(varx*(1+Math.max(0,Number(ridgeFraction)||0)));
  }

  function partialResidual(value, environment, beta, environmentCenter) {
    const y=Number(value), x=Number(environment), b=Number(beta), c=Number(environmentCenter);
    if (!Number.isFinite(y)) return null;
    return Number.isFinite(x)&&Number.isFinite(b)&&Number.isFinite(c) ? y-b*(x-c) : y;
  }

  function priorReceiverResidual(profile, beta=1, qbCenter=0) {
    return partialResidual(priorReceiverWrteEpa(profile),priorQbPassEpa(profile),beta,qbCenter);
  }

  function priorRbOrthogonalComposite(profile, recvBeta=1, qbCenter=0) {
    const rb=profile?.rb||{};
    const rush=Number.isFinite(Number(rb.rush_epa))?Number(rb.rush_epa):Number(rb.adj_rush);
    const recv=Number(rb.adj_recv);
    const residual=partialResidual(recv,priorQbPassEpa(profile),recvBeta,qbCenter);
    if (!Number.isFinite(rush) && !Number.isFinite(residual)) return null;
    if (Number.isFinite(rush)&&Number.isFinite(residual)) return .70*rush+.30*residual;
    return Number.isFinite(rush)?rush:residual;
  }

  function qbRushingBonus(totalEpa, attempts) {
    const e=Math.max(0,Number(totalEpa)||0), a=Math.max(0,Number(attempts)||0);
    if (!(e>0) || !(a>0)) return 0;
    const volume=a/(a+QB_V106.rushingBonusAttemptHalfLife);
    const quality=Math.tanh(e/QB_V106.rushingBonusEpaScale);
    return clamp(QB_V106.rushingBonusCap*quality*volume,0,QB_V106.rushingBonusCap);
  }

  function resolvedPriorGames(team, priorGames, priorGamesByTeam) {
    const fallback = Math.max(0, Number(priorGames) || 0);
    if (!priorGamesByTeam) return fallback;
    let v = null;
    if (typeof priorGamesByTeam === 'function') v = priorGamesByTeam(team);
    else if (Object.prototype.hasOwnProperty.call(priorGamesByTeam, team)) v = priorGamesByTeam[team];
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? x : fallback;
  }

  function blend(prior, live, games, priorGames) {
    const p = n(prior), l = n(live);
    if (l == null || games <= 0) return p;
    if (p == null) return l;
    const w = games/(games + priorGames);
    return p*(1-w) + l*w;
  }


  // V62 contextual 0–100 scores. These are explanatory diagnostics only and
  // do not alter the predictive FORCE/Elo state. All three use 50 as neutral.
  const CONTEXT_SCALE = Object.freeze({
    penaltyEpaPerGameRms: 1.1301,
    penaltyWpPerGameRms: 0.03217,
    penaltyFirstDownPerGameRms: 0.65,
    penaltyErasedTdPerGameRms: 0.15,
    penaltyYardsPerGameRms: 7.7273,
    // V97 preserves the approved V81/V82 40/25/20/15 blend, score-aware EPA, and the widened display scale. Penalty Impact is
    // current-season only; 2025 is used only to calibrate the league scale and
    // empirical counterfactual WP surface on the server.
    livePenaltyWeights: Object.freeze({ epa: 0.40, wpa: 0.25, firstDown: 0.20, erasedTd: 0.15 }),
    contextZSoftness: 3.0,
    penaltyComponentZCap: 3.0,
    livePenaltyPriorGames: 0.0
  });
  function centeredContextScore(value, scale=1, softness=CONTEXT_SCALE.contextZSoftness) {
    const x=n(value), s=Math.abs(Number(scale));
    if (x==null || !(s>0)) return null;
    return clamp(50 + 50*Math.tanh((x/s)/Math.max(.25,Number(softness)||2)));
  }
  function penaltyCalibration(calibration={}) {
    return {
      epaScale:Math.max(1e-9,Number(calibration?.epa_per_game_rms)||CONTEXT_SCALE.penaltyEpaPerGameRms),
      wpaScale:Math.max(1e-9,Number(calibration?.wpa_per_game_rms)||CONTEXT_SCALE.penaltyWpPerGameRms),
      firstDownScale:Math.max(1e-9,Number(calibration?.first_downs_per_game_rms)||CONTEXT_SCALE.penaltyFirstDownPerGameRms),
      erasedTdScale:Math.max(1e-9,Number(calibration?.erased_tds_per_game_rms)||CONTEXT_SCALE.penaltyErasedTdPerGameRms),
      epaWeight:Number(calibration?.epa_weight)||CONTEXT_SCALE.livePenaltyWeights.epa,
      wpaWeight:Number(calibration?.wpa_weight)||CONTEXT_SCALE.livePenaltyWeights.wpa,
      firstDownWeight:Number(calibration?.first_down_weight)||CONTEXT_SCALE.livePenaltyWeights.firstDown,
      erasedTdWeight:Number(calibration?.erased_td_weight)||CONTEXT_SCALE.livePenaltyWeights.erasedTd,
      softness:Math.max(.25,Number(calibration?.softness)||CONTEXT_SCALE.contextZSoftness),
      componentZCap:Math.max(.25,Number(calibration?.component_z_cap)||CONTEXT_SCALE.penaltyComponentZCap),
      priorGames:Number.isFinite(Number(calibration?.prior_equivalent_games))?Math.max(0,Number(calibration.prior_equivalent_games)):CONTEXT_SCALE.livePenaltyPriorGames
    };
  }
  function causalPenaltyScoreBreakdownFromAverages(epaPerGame, wpaPerGame, firstDownPerGame=null, erasedTdPerGame=null, calibration={}) {
    const e=n(epaPerGame), w=n(wpaPerGame), f=n(firstDownPerGame), t=n(erasedTdPerGame);
    if (e==null && w==null && f==null && t==null) return null;
    const c=penaltyCalibration(calibration);
    const values={epa:e??0,wpa:w??0,firstDown:f??0,erasedTd:t??0};
    const scales={epa:c.epaScale,wpa:c.wpaScale,firstDown:c.firstDownScale,erasedTd:c.erasedTdScale};
    const weights={epa:c.epaWeight,wpa:c.wpaWeight,firstDown:c.firstDownWeight,erasedTd:c.erasedTdWeight};
    const rawZ={}, cappedZ={}, weightedContributions={};
    let num=0,den=0;
    for (const key of Object.keys(values)) {
      const z=values[key]/scales[key];
      const cz=Math.max(-c.componentZCap,Math.min(c.componentZCap,z));
      rawZ[key]=z; cappedZ[key]=cz; weightedContributions[key]=weights[key]*cz;
      num += weightedContributions[key]; den += weights[key];
    }
    if (!(den>0)) return null;
    const preGuardCombinedZ=num/den;
    let combinedZ=preGuardCombinedZ, directValueAgreement='mixed', directionGuardApplied=false;
    if (values.epa>0 && values.wpa>0) {
      directValueAgreement='positive';
      if (combinedZ<0) { combinedZ=0; directionGuardApplied=true; }
    } else if (values.epa<0 && values.wpa<0) {
      directValueAgreement='negative';
      if (combinedZ>0) { combinedZ=0; directionGuardApplied=true; }
    }
    const score=clamp(50+50*Math.tanh(combinedZ/c.softness));
    return {raw:values,scales,rawZ,cappedZ,weights,weightedContributions,weightSum:den,preGuardCombinedZ,combinedZ,directValueAgreement,directionGuardApplied,softness:c.softness,componentZCap:c.componentZCap,score,effectiveScoreFloor:50+50*Math.tanh(-c.componentZCap/c.softness),effectiveScoreCeiling:50+50*Math.tanh(c.componentZCap/c.softness)};
  }
  function causalPenaltyScoreFromAverages(epaPerGame, wpaPerGame, firstDownPerGame=null, erasedTdPerGame=null, calibration={}) {
    return causalPenaltyScoreBreakdownFromAverages(epaPerGame,wpaPerGame,firstDownPerGame,erasedTdPerGame,calibration)?.score ?? null;
  }
  function historicalPenaltyImpactScore(penalty, games=17, calibration={}) {
    const direct=n(penalty?.penaltyImpactScore);
    if (direct!=null) return clamp(direct);
    const g=Math.max(1,Number(penalty?.games)||Number(games)||17);
    const e=n(penalty?.net_penalty_epa ?? penalty?.net_pen_epa);
    const w=n(penalty?.net_penalty_wpa ?? penalty?.pen_wp_swing);
    const f=(Number(penalty?.first_downs_for)||0)-(Number(penalty?.first_downs_against)||0);
    const t=(Number(penalty?.tds_negated_benefit)||0)-(Number(penalty?.tds_negated_harm)||0);
    return causalPenaltyScoreFromAverages(e==null?null:e/g,w==null?null:w/g,f/g,t/g,calibration);
  }
  function livePenaltyImpactScore(context, games, priorContext=null, calibration={}) {
    const ctx=(context!=null && typeof context==='object') ? context : (context==null ? {} : {netPenaltyEpaPerGame:Number(context)});
    const g=Math.max(0,Number(games)||0);
    const c=penaltyCalibration(calibration);
    const prior=priorContext && typeof priorContext==='object' ? priorContext : {};
    const pg=Math.max(1,Number(prior?.games)||17);
    const priorEpaTotal=n(prior?.net_penalty_epa ?? prior?.net_pen_epa) ?? 0;
    const priorWpaTotal=n(prior?.net_penalty_wpa ?? prior?.pen_wp_swing) ?? 0;
    const priorFirstTotal=(Number(prior?.first_downs_for)||0)-(Number(prior?.first_downs_against)||0);
    const priorTdTotal=(Number(prior?.tds_negated_benefit)||0)-(Number(prior?.tds_negated_harm)||0);
    const priorEpaPg=priorEpaTotal/pg, priorWpaPg=priorWpaTotal/pg, priorFirstPg=priorFirstTotal/pg, priorTdPg=priorTdTotal/pg;
    const curEpaTotal=n(ctx?.netPenaltyEpaTotal);
    const curWpaTotal=n(ctx?.netPenaltyWpaTotal);
    const curFirstTotal=n(ctx?.netFirstDownsTotal);
    const curTdTotal=n(ctx?.netTdsNegatedTotal);
    const curEpaPg=n(ctx?.netPenaltyEpaPerGame), curWpaPg=n(ctx?.netPenaltyWpaPerGame);
    const curFirstPg=n(ctx?.netFirstDownsPerGame), curTdPg=n(ctx?.netTdsNegatedPerGame);
    const curEpa=curEpaTotal!=null?curEpaTotal:(curEpaPg!=null?curEpaPg*g:0);
    const curWpa=curWpaTotal!=null?curWpaTotal:(curWpaPg!=null?curWpaPg*g:0);
    const curFirst=curFirstTotal!=null?curFirstTotal:(curFirstPg!=null?curFirstPg*g:0);
    const curTd=curTdTotal!=null?curTdTotal:(curTdPg!=null?curTdPg*g:0);
    if (g<=0) return causalPenaltyScoreFromAverages(priorEpaPg,priorWpaPg,priorFirstPg,priorTdPg,calibration);
    const denom=c.priorGames+g;
    const blendEpa=(priorEpaPg*c.priorGames+curEpa)/Math.max(1e-9,denom);
    const blendWpa=(priorWpaPg*c.priorGames+curWpa)/Math.max(1e-9,denom);
    const blendFirst=(priorFirstPg*c.priorGames+curFirst)/Math.max(1e-9,denom);
    const blendTd=(priorTdPg*c.priorGames+curTd)/Math.max(1e-9,denom);
    return causalPenaltyScoreFromAverages(blendEpa,blendWpa,blendFirst,blendTd,calibration);
  }

  // V57: the 2026 unit priors use the same current-era offseason persistence
  // assumption as the team rating: regress 30% toward the neutral 50 midpoint
  // before any 2026 unit evidence is blended in. Callers can leave this at zero
  // for historical/research replays that intentionally preserve the legacy prior.
  function regressUnitIndex(value, reversion=0) {
    const v=n(value), r=Math.max(0,Math.min(1,Number(reversion)||0));
    return v==null ? null : 50 + (v-50)*(1-r);
  }


  const OFFENSE_WEIGHTS_V101 = { offenseIndex: 0.45, qbIndex: 0.25, receiverIndex: 0.15, olIndex: 0.15 };
  const OFFENSE_WEIGHTS_V102 = { pointsScoredPerDriveIndex: 0.20, qbIndex: 0.30, receiverIndex: 0.15, olIndex: 0.15, rbIndex: 0.20 };
  const DEFENSE_WEIGHTS = { coverageIndex: 0.36, passRushIndex: 0.16, runDefenseIndex: 0.28, pointsAllowedPerDriveIndex: 0.20 };
  // V108: weighted averages of several partially-correlated 0-100 unit grades are
  // mechanically narrower than the component scales, but V107's linear 1.45x stretch
  // made an already-strong raw composite look nearly perfect (for example, a raw ~80
  // defense displayed ~93.5). Preserve 0/50/100 exactly and expand the middle of the
  // composite range with a soft-tail tanh curve. Offense and Defense use separate
  // softness because their component covariance differs. This remains presentation /
  // composite calibration only: predictive Unit -> FORCE consumes underlying units.
  const COMPOSITE_V108 = Object.freeze({
    offense:Object.freeze({mode:'soft-tail',softness:35}),
    defense:Object.freeze({mode:'soft-tail',softness:42})
  });

  function calibrateComposite(raw, config=COMPOSITE_V108.offense) {
    if (raw == null || raw === '') return null;
    const x=Number(raw);
    if (!Number.isFinite(x)) return null;
    // Numeric argument remains supported for older diagnostics/tests that explicitly
    // request a linear stretch; production V108 paths pass the soft-tail config.
    if (typeof config === 'number') {
      const k=Math.max(0,Number(config)||0);
      return clamp(50 + (x-50)*k);
    }
    const softness=Math.max(1e-6,Number(config?.softness)||35);
    const endpoint=Math.tanh(50/softness);
    if (!(endpoint>0)) return clamp(x);
    return clamp(50 + 50*Math.tanh((x-50)/softness)/endpoint);
  }

  function uncalibrateComposite(display, config=COMPOSITE_V108.offense) {
    if (display == null || display === '') return null;
    const y=Number(display);
    if (!Number.isFinite(y)) return null;
    if (typeof config === 'number') {
      const k=Math.max(0,Number(config)||0);
      return k>0 ? clamp(50 + (y-50)/k) : 50;
    }
    const softness=Math.max(1e-6,Number(config?.softness)||35);
    const endpoint=Math.tanh(50/softness);
    const z=Math.max(-0.999999999,Math.min(0.999999999,((y-50)/50)*endpoint));
    return clamp(50 + softness*Math.atanh(z));
  }

  function rawOffenseCompositeFrom(profile, policy=null) {
    const mode=policy || profile?._offenseCompositePolicy || 'v101-legacy';
    return availableComposite(profile, mode==='v102-orthogonal' ? OFFENSE_WEIGHTS_V102 : OFFENSE_WEIGHTS_V101);
  }

  function offenseCompositeFrom(profile, policy=null) {
    return calibrateComposite(rawOffenseCompositeFrom(profile,policy),COMPOSITE_V108.offense);
  }

  function rawDefenseCompositeFrom(profile) {
    return availableComposite(profile, DEFENSE_WEIGHTS);
  }

  function defenseCompositeFrom(profile) {
    return calibrateComposite(rawDefenseCompositeFrom(profile),COMPOSITE_V108.defense);
  }

  function applyQbCarryoverScenario(baseProfile, forceBefore, forceAfter) {
    const profile = {...(baseProfile || {})};
    const forceDelta = Number(forceAfter) - Number(forceBefore);
    if (!Number.isFinite(forceDelta) || forceDelta <= 0) return {profile, forceDelta:Number.isFinite(forceDelta)?forceDelta:0};
    const policy=profile?._offenseCompositePolicy||'v101-legacy';
    const baseCompositeRaw = rawOffenseCompositeFrom(profile,policy);
    const baseComposite = offenseCompositeFrom(profile,policy);
    const targetOffense = clamp(baseComposite + 2*forceDelta);
    const rawTarget=uncalibrateComposite(targetOffense,COMPOSITE_V108.offense);
    const rawTargetDelta=Number.isFinite(rawTarget)&&Number.isFinite(baseCompositeRaw)?rawTarget-baseCompositeRaw:0;
    let adjustedOff = clamp((profile?._offenseCompositePolicy==='v102-orthogonal' ? profile.pointsScoredPerDriveIndex : profile.offenseIndex) ?? 50);
    let adjustedQb = clamp(profile.qbIndex ?? 50);
    let remaining = rawTargetDelta;
    if (remaining > 0) {
      const activeWeights=(profile?._offenseCompositePolicy==='v102-orthogonal')?OFFENSE_WEIGHTS_V102:OFFENSE_WEIGHTS_V101;
      const outcomeKey=(profile?._offenseCompositePolicy==='v102-orthogonal')?'pointsScoredPerDriveIndex':'offenseIndex';
      const common = remaining/((activeWeights[outcomeKey]||0)+(activeWeights.qbIndex||0));
      const step = Math.min(common,100-adjustedOff,100-adjustedQb);
      adjustedOff += step; adjustedQb += step;
      remaining -= step*((activeWeights[outcomeKey]||0)+(activeWeights.qbIndex||0));
      if (remaining > 1e-6 && adjustedOff < 100) {
        const add=Math.min(100-adjustedOff,remaining/(activeWeights[outcomeKey]||1));
        adjustedOff += add; remaining -= add*(activeWeights[outcomeKey]||0);
      }
      if (remaining > 1e-6 && adjustedQb < 100) {
        const add=Math.min(100-adjustedQb,remaining/(activeWeights.qbIndex||1));
        adjustedQb += add; remaining -= add*(activeWeights.qbIndex||0);
      }
    }
    if (profile?._offenseCompositePolicy==='v102-orthogonal') profile.pointsScoredPerDriveIndex=adjustedOff; else profile.offenseIndex=adjustedOff;
    profile.qbIndex=adjustedQb;
    profile.offenseCompositeRaw=rawOffenseCompositeFrom(profile,policy);
    profile.offenseComposite=offenseCompositeFrom(profile,policy);
    return {profile,forceDelta,targetOffense,baseCompositeRaw};
  }

  function liveLuck(team, schedule, gameHistory, performanceLuckGames=[]) {
    const games = schedule.filter((g) => (g.home===team || g.away===team) && g.homeScore != null && g.awayScore != null);
    if (!games.length) return null;
    const allowed=new Set(games.map(g=>String(g.game_id||g.id||`${g.week}|${g.date}|${g.away}|${g.home}`)));
    let w=0,l=0,t=0,pf=0,pa=0,pregameExp=0,performanceExp=0,performanceCount=0;
    const actualOutcomes=[], deservedProbabilities=[];
    let fumbleOpportunities=0,fumbleRecoveries=0,fumbleWeightedOpportunities=0,fumbleWeightedRecoveries=0,fumbleExpectedRecoveries=0,botchedSnapOpportunities=0,ordinaryFumbleOpportunities=0;
    let epaExpectedPointDiff=0,epaObservedPointDiff=0,epaCalibrationGames=0,epaResidualVariance=0;
    const deservedGames=[];
    for (const g of games) {
      const home = g.home===team;
      const teamScore=home ? Number(g.homeScore) : Number(g.awayScore);
      const oppScore=home ? Number(g.awayScore) : Number(g.homeScore);
      pf += Number.isFinite(teamScore)?teamScore:0; pa += Number.isFinite(oppScore)?oppScore:0;
      let actualOutcome=0;
      if (g.homeScore===g.awayScore) { t++; actualOutcome=0.5; }
      else if ((home && g.homeScore>g.awayScore) || (!home && g.awayScore>g.homeScore)) { w++; actualOutcome=1; }
      else { l++; actualOutcome=0; }
      actualOutcomes.push(actualOutcome);
      const hist = gameHistory?.[`${g.week}|${g.date}|${g.away}|${g.home}`];
      const hp = n(hist?.independent?.probability);
      pregameExp += hp == null ? 0.5 : (home ? hp : 1-hp);

      const gid=String(g.game_id||g.id||'');
      const perf=(performanceLuckGames||[]).find(x=>{
        if (gid && String(x?.game_id||'')===gid) return true;
        return Number(x?.week)===Number(g.week) && x?.home===g.home && x?.away===g.away;
      });
      let deserved=null;
      if (perf) {
        const homeP=n(perf.home_deserved_win_prob);
        if (homeP!=null) { deserved=home?homeP:1-homeP; performanceCount += 1; }
        const opps=Math.max(0,Number(perf.fumble_opportunities)||0);
        const rec=home?Number(perf.home_fumble_recoveries):Number(perf.away_fumble_recoveries);
        const weightedOpps=Math.max(0,Number(perf.fumble_weighted_opportunities ?? opps)||0);
        const weightedRec=home?Number(perf.home_fumble_weighted_recoveries ?? rec):Number(perf.away_fumble_weighted_recoveries ?? rec);
        const expectedRec=home?Number(perf.home_fumble_expected_recoveries):Number(perf.away_fumble_expected_recoveries);
        const epaExpectedHome=Number(perf.epa_expected_margin_home);
        const epaResidualSd=Number(perf.epa_margin_residual_sd);
        if (Number.isFinite(epaExpectedHome)) {
          epaExpectedPointDiff += home ? epaExpectedHome : -epaExpectedHome;
          epaObservedPointDiff += teamScore-oppScore;
          epaCalibrationGames += 1;
          if (Number.isFinite(epaResidualSd) && epaResidualSd>0) epaResidualVariance += epaResidualSd*epaResidualSd;
        }
        fumbleOpportunities += opps;
        fumbleRecoveries += Math.max(0,Number(rec)||0);
        fumbleWeightedOpportunities += weightedOpps;
        fumbleWeightedRecoveries += Math.max(0,Number(weightedRec)||0);
        fumbleExpectedRecoveries += Number.isFinite(expectedRec)?Math.max(0,expectedRec):0.5*weightedOpps;
        botchedSnapOpportunities += Math.max(0,Number(perf.botched_snap_fumble_opportunities)||0);
        ordinaryFumbleOpportunities += Math.max(0,Number(perf.ordinary_fumble_opportunities)||0);
        deservedGames.push({
          game_id:perf.game_id,week:Number(perf.week)||0,opponent:home?perf.away:perf.home,
          actual_win:g.homeScore===g.awayScore?0.5:(((home&&g.homeScore>g.awayScore)||(!home&&g.awayScore>g.homeScore))?1:0),
          deserved_win_probability:deserved,
          score_margin:home?Number(perf.score_margin_home): -Number(perf.score_margin_home),
          epa_diff:home?Number(perf.epa_diff_home): -Number(perf.epa_diff_home),
          success_diff:home?Number(perf.success_diff_home): -Number(perf.success_diff_home),
          ypp_diff:home?Number(perf.ypp_diff_home): -Number(perf.ypp_diff_home),
          yards_diff:home?Number(perf.yards_diff_home): -Number(perf.yards_diff_home),
          ppd_diff:home?Number(perf.ppd_diff_home): -Number(perf.ppd_diff_home),
          interception_diff:home?Number(perf.interception_diff_home): -Number(perf.interception_diff_home),
          underlying_margin:home?Number(perf.underlying_margin_home): -Number(perf.underlying_margin_home),
          deserved_margin:home?Number(perf.deserved_margin_home): -Number(perf.deserved_margin_home),
          epa_expected_margin:home?Number(perf.epa_expected_margin_home): -Number(perf.epa_expected_margin_home),
          epa_margin_residual_sd:Number(perf.epa_margin_residual_sd),
          epa_margin_r2:Number(perf.epa_margin_r2),
          calibration_source:perf.performance_calibration_source||null,
          fumble_opportunities:opps,fumble_recoveries:Math.max(0,Number(rec)||0),
          fumble_weighted_opportunities:weightedOpps,fumble_weighted_recoveries:Math.max(0,Number(weightedRec)||0),
          fumble_expected_recoveries:Number.isFinite(expectedRec)?expectedRec:0.5*weightedOpps,
          botched_snap_fumble_opportunities:Number(perf.botched_snap_fumble_opportunities)||0,
          fumble_events:Array.isArray(perf.fumble_events)?perf.fumble_events:[]
        });
      }
      if (deserved!=null) performanceExp += deserved;
      deservedProbabilities.push(deserved);
    }
    const actualEq = w + 0.5*t;
    const exponent=2.37;
    let pythPct=0.5;
    if (pf>0 || pa>0) {
      const pfPow=Math.pow(Math.max(0,pf),exponent), paPow=Math.pow(Math.max(0,pa),exponent);
      pythPct=(pfPow+paPow)>0 ? pfPow/(pfPow+paPow) : 0.5;
    }
    const pythExp=games.length*pythPct;
    const exp=performanceCount>0 ? performanceExp + Math.max(0,games.length-performanceCount)*pythPct : pythExp;
    const luck = actualEq-exp;
    // V113: result luck is not the raw decimal win surplus. A dominant win with
    // p=.97 should be effectively neutral, not automatically positive luck just
    // because 1.00 > .97. Standardize each game outcome residual by the Bernoulli
    // variance implied by its deserved-win probability, then reserve a 0.5-sigma
    // neutral band for ordinary realization noise.
    let outcomeVariance=0;
    for (let i=0;i<games.length;i++) {
      const rawP=deservedProbabilities[i]!=null?Number(deservedProbabilities[i]):pythPct;
      const p=Math.max(0.01,Math.min(0.99,Number.isFinite(rawP)?rawP:0.5));
      outcomeVariance += p*(1-p);
    }
    const outcomeStd=Math.sqrt(Math.max(1e-9,outcomeVariance));
    const outcomeSurpriseZ=luck/outcomeStd;
    const outcomeNeutralZ=0.5;
    const outcomeSurpriseExcessZ=Math.sign(outcomeSurpriseZ)*Math.max(0,Math.abs(outcomeSurpriseZ)-outcomeNeutralZ);
    // V121: primary Luck core is scoring realization versus historical EPA/play.
    // Positive residual means the scoreboard has rewarded the team more than its
    // net scrimmage EPA historically implies; negative means strong underlying
    // play has not fully translated to point differential.
    const actualPointDiff=pf-pa;
    const epaExpectedPointDiffComplete=epaCalibrationGames>0 ? epaExpectedPointDiff : actualPointDiff;
    const epaObservedPointDiffComplete=epaCalibrationGames>0 ? epaObservedPointDiff : actualPointDiff;
    const epaScoringResidual=epaObservedPointDiffComplete-epaExpectedPointDiffComplete;
    const epaResidualStd=Math.sqrt(Math.max(1e-9,epaResidualVariance || (12*12*Math.max(1,games.length))));
    const epaScoringLuckZ=epaScoringResidual/epaResidualStd;
    const epaNeutralZ=0.20;
    const epaLuckExcessZ=Math.sign(epaScoringLuckZ)*Math.max(0,Math.abs(epaScoringLuckZ)-epaNeutralZ);
    const epaLuckScore=Math.max(0,Math.min(100,50+45*Math.tanh(epaLuckExcessZ/1.10)));
    const fumblePrior=4;
    // V111 scores recovery luck relative to the recovery probability of each
    // loose-ball type. Ordinary fumbles are 50/50. Botched snaps are only 30%
    // weight and assume an 80% offense / 20% defense recovery baseline.
    const fumbleRecoveryExcess=fumbleWeightedRecoveries-fumbleExpectedRecoveries;
    const fumbleRate=Math.max(0,Math.min(1,0.5+fumbleRecoveryExcess/(fumbleWeightedOpportunities+fumblePrior)));
    const fumbleLuckScore=100*fumbleRate;
    return {
      w,l,t,g:games.length,pf,pa,exp_w:exp,exp_l:games.length-exp,luck,luck_pct:100*luck/games.length,
      pregame_exp_w:pregameExp,pregame_exp_l:games.length-pregameExp,
      pythagorean_exp_w:pythExp,pythagorean_exp_l:games.length-pythExp,pythagorean_exponent:exponent,
      deserved_games:deservedGames,
      fumble_opportunities:fumbleOpportunities,fumble_recoveries:fumbleRecoveries,
      fumble_recovery_rate:fumbleOpportunities>0?fumbleRecoveries/fumbleOpportunities:null,
      fumble_weighted_opportunities:fumbleWeightedOpportunities,fumble_weighted_recoveries:fumbleWeightedRecoveries,
      fumble_expected_recoveries:fumbleExpectedRecoveries,fumble_recovery_excess:fumbleRecoveryExcess,
      ordinary_fumble_opportunities:ordinaryFumbleOpportunities,botched_snap_fumble_opportunities:botchedSnapOpportunities,
      stabilized_fumble_recovery_rate:fumbleRate,fumble_prior_opportunities:fumblePrior,fumble_luck_score:fumbleLuckScore,
      outcome_residual:luck,outcome_variance:outcomeVariance,outcome_std:outcomeStd,outcome_surprise_z:outcomeSurpriseZ,outcome_neutral_z:outcomeNeutralZ,outcome_surprise_excess_z:outcomeSurpriseExcessZ,
      actual_point_diff:actualPointDiff,epa_observed_point_diff:epaObservedPointDiffComplete,epa_expected_point_diff:epaExpectedPointDiffComplete,epa_scoring_residual:epaScoringResidual,epa_scoring_residual_std:epaResidualStd,
      epa_scoring_luck_z:epaScoringLuckZ,epa_scoring_neutral_z:epaNeutralZ,epa_scoring_luck_excess_z:epaLuckExcessZ,epa_scoring_luck_score:epaLuckScore,epa_calibration_games:epaCalibrationGames,
      source:'V121 2026 Luck: 60% historical EPA/play-implied scoring realization + 20% Penalty Impact + 15% event-adjusted fumble recovery + 5% standardized game-outcome surprise. Positive EPA residual means actual point differential exceeded historical expectation for the underlying net EPA/play; negative means the scoreboard under-realized performance. Pythagorean/pregame/deserved-win expectations remain for audit.'
    };
  }

  function liveScoring(team, schedule, prior, priorGames) {
    const games = schedule.filter((g) => (g.home===team || g.away===team) && g.homeScore != null && g.awayScore != null);
    if (!games.length) return prior || {};
    let pf=0,pa=0;
    for (const g of games) {
      const home=g.home===team;
      pf += home ? g.homeScore : g.awayScore;
      pa += home ? g.awayScore : g.homeScore;
    }
    const priorFor=n(prior?.ppg_for) ?? 22.5, priorAgainst=n(prior?.ppg_against) ?? 22.5;
    const denom=priorGames+games.length;
    return { ppg_for:(priorFor*priorGames+pf)/denom, ppg_against:(priorAgainst*priorGames+pa)/denom, games:games.length, live_ppg_for:pf/games.length, live_ppg_against:pa/games.length, source:'2025 prior + 2026 scores' };
  }


  // V41 pass-rush model. PFR/Sportradar charting defines pressure as hurries +
  // non-sack hits + sack plays. FORCE treats a hurry-only pressure as 1.00 unit,
  // a hit as 1.20, and a sack as 1.60: pressure is the primary signal, while
  // actually finishing the rush earns progressively larger incremental credit.
  const PASS_RUSH_WEIGHTS = { pressure: 1.00, hitBonus: 0.20, sackBonus: 0.60 };

  function pctRate(v) {
    const x=n(v);
    if (x == null) return null;
    return Math.abs(x) > 1 ? x/100 : x;
  }

  function passRushCompositeRate({pressureRate, hitRate, sackRate}={}) {
    const p=n(pressureRate), h=n(hitRate), s=n(sackRate);
    if (p == null) return null;
    return p + PASS_RUSH_WEIGHTS.hitBonus*(h ?? 0) + PASS_RUSH_WEIGHTS.sackBonus*(s ?? 0);
  }


  // V43 pressure-provider contract. nflverse's in-season FTN charting release is
  // genuinely play-level and timely, but the public 29-column subset does not
  // currently publish the pressure outcome flag that exists in the post-season
  // participation dataset. FORCE therefore checks for a real pressure field and
  // a defensive-team key before FTN is permitted to drive Pass Rush. We never
  // infer pressure from number of rushers, blitzers, out-of-pocket movement, or
  // QB-fault sacks. If the contract is not met, the verified PFR path remains the
  // scoring fallback.
  function boolish(v) {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v == null || v === '') return false;
    const x=String(v).trim().toLowerCase();
    return ['true','t','1','yes','y'].includes(x);
  }

  function ftnPressureField(rows=[]) {
    const keys=new Set();
    for (const r of (rows||[]).slice(0,50)) for (const k of Object.keys(r||{})) keys.add(k);
    for (const k of ['was_pressure','is_qb_pressure','is_pressure','pressure']) if (keys.has(k)) return k;
    return null;
  }

  function ftnDefenseField(rows=[]) {
    const keys=new Set();
    for (const r of (rows||[]).slice(0,50)) for (const k of Object.keys(r||{})) keys.add(k);
    for (const k of ['defteam','defense_team','def_team','defense']) if (keys.has(k)) return k;
    return null;
  }

  function ftnDropbackField(rows=[]) {
    const keys=new Set();
    for (const r of (rows||[]).slice(0,50)) for (const k of Object.keys(r||{})) keys.add(k);
    for (const k of ['qb_dropback','is_dropback','dropback']) if (keys.has(k)) return k;
    return null;
  }

  function ftnPressureContract(rows=[]) {
    const pressureField=ftnPressureField(rows), defenseField=ftnDefenseField(rows), dropbackField=ftnDropbackField(rows);
    const rowCount=(rows||[]).length;
    const ready=Boolean(rowCount && pressureField && defenseField);
    let reason='ready';
    if (!rowCount) reason='feed unavailable';
    else if (!pressureField) reason='public FTN feed has no pressure outcome field';
    else if (!defenseField) reason='pressure rows lack defensive-team identity';
    return {ready,rowCount,pressureField,defenseField,dropbackField,reason};
  }

  function ftnDefensePressureGames(rows=[]) {
    const contract=ftnPressureContract(rows);
    if (!contract.ready) return {};
    const byTeamGame={};
    for (const r of rows||[]) {
      if (String(r.season)!=='2026' || (r.season_type && r.season_type!=='REG')) continue;
      if (contract.dropbackField && !boolish(r[contract.dropbackField])) continue;
      const defense=canon(r[contract.defenseField]);
      if (!defense) continue;
      const game=r.nflverse_game_id || r.game_id || `${r.week}|${defense}`;
      const key=`${defense}|${game}`;
      const g=(byTeamGame[key] ||= {defense,game,week:Number(r.week)||0,dropbacks:0,pressures:0});
      g.dropbacks += 1;
      if (boolish(r[contract.pressureField])) g.pressures += 1;
    }
    const out={};
    for (const g of Object.values(byTeamGame)) {
      if (!(g.dropbacks>0)) continue;
      (out[g.defense] ||= []).push({...g,pressureRate:g.pressures/g.dropbacks});
    }
    for (const arr of Object.values(out)) arr.sort((a,b)=>a.week-b.week || String(a.game).localeCompare(String(b.game)));
    return out;
  }

  function combineFtnPressureGames(games=[], raw={}) {
    if (!games.length) return null;
    const dropbacks=games.reduce((a,g)=>a+(Number(g.dropbacks)||0),0);
    const pressures=games.reduce((a,g)=>a+(Number(g.pressures)||0),0);
    if (!(dropbacks>0)) return null;
    const pressureRate=pressures/dropbacks;
    // Finishing bonuses remain grounded in nflverse weekly hit/sack production;
    // the FTN public charting subset does not expose generic hit/sack outcome flags.
    const hitRate=(Number(raw.defQbHits)||0)/dropbacks;
    const sackRate=(Number(raw.defSacks)||0)/dropbacks;
    return {games:games.length,dropbacks,pressures,hurries:null,hits:Number(raw.defQbHits)||0,sacks:Number(raw.defSacks)||0,pressureRate,hitRate,sackRate,compositeRate:passRushCompositeRate({pressureRate,hitRate,sackRate}),provider:'ftn-play-level'};
  }

  function dateOnlyMs(v) {
    const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const ms=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return Number.isFinite(ms)?ms:null;
  }

  function latestCompletedTeamDate(team, schedule=[]) {
    let latest=null;
    for (const g of schedule||[]) {
      if (g.home!==team && g.away!==team) continue;
      if (g.homeScore==null || g.awayScore==null) continue;
      const ms=dateOnlyMs(g.date);
      if (ms!=null && (latest==null || ms>latest)) latest=ms;
    }
    return latest;
  }

  // V44's hard freshness gate. Current-season pressure is usable only when the
  // source is demonstrably newer than the team's latest completed game. We use a
  // one-calendar-day floor because a date-only provider stamp cannot prove that a
  // same-day refresh occurred after kickoff. Explicit game counts, when supplied
  // by a browser/Codex override, must also cover every current-season team game.
  function externalPressureMetric(payload, team, raw={}, schedule=[], currentGames=0) {
    const row=payload?.teams?.[team] || null;
    if (!row) return {ready:false,reason:'no current pressure row'};
    const pressureRate=n(row.pressure_rate);
    if (pressureRate==null || pressureRate<0 || pressureRate>1) return {ready:false,reason:'invalid current pressure rate'};
    const asOf=dateOnlyMs(row.as_of);
    const latest=latestCompletedTeamDate(team,schedule);
    if (latest==null) return {ready:false,reason:'cannot verify latest completed game date'};
    if (asOf==null) return {ready:false,reason:'current pressure row has no freshness date'};
    if (asOf < latest + 86400000) return {ready:false,reason:'current pressure row predates freshness floor'};
    const declaredGames=n(row.games);
    if (declaredGames!=null && declaredGames < currentGames) return {ready:false,reason:'current pressure row does not cover every completed game'};
    const dropbacks=Number(raw.oppPassPlays)||0;
    if (!(dropbacks>0)) return {ready:false,reason:'no current defensive dropback denominator'};
    const hits=Math.max(0,Number(raw.defQbHits)||0), sacks=Math.max(0,Number(raw.defSacks)||0);
    const hitRate=hits/dropbacks, sackRate=sacks/dropbacks;
    const compositeRate=passRushCompositeRate({pressureRate,hitRate,sackRate});
    return {ready:true,metric:{
      games:currentGames,dropbacks,pressures:pressureRate*dropbacks,hurries:null,hits,sacks,
      pressureRate,hitRate,sackRate,compositeRate,
      provider:row.mode==='manual'?'manual-current':'statrankings-current',
      asOf:row.as_of,source:row.source||'current pressure source',sourceUrl:row.source_url||null,note:row.note||null
    }};
  }

  function pfrChartingReady(rows=[]) {
    const useful=(rows||[]).filter((r)=>r && canon(r.opponent));
    if (useful.length < 16) return false;
    let advanced=0, advancedRows=0, pressures=0, sacks=0;
    for (const r of useful) {
      const rowAdvanced=(n(r.times_hurried)||0) + (n(r.times_hit)||0);
      advanced += rowAdvanced;
      pressures += n(r.times_pressured)||0;
      sacks += n(r.times_sacked)||0;
      if (rowAdvanced > 0 || (n(r.times_pressured)||0) > (n(r.times_sacked)||0)) advancedRows += 1;
    }
    // Basic sacks can appear before Sportradar's advanced pressure charting is
    // populated. Require broad feed-level evidence rather than letting one early
    // charted row make a partially populated slate look complete.
    const minAdvancedRows=Math.max(8,Math.ceil(useful.length*.20));
    return advancedRows >= minAdvancedRows && (advanced > 0 || pressures > sacks + 1e-9);
  }

  // V42: feed-level readiness is not enough. PFR can populate advanced charting
  // for some games while another game still contains only the basic sack line.
  // Reject a defense's current sample when independent nflverse QB-hit evidence
  // proves the PFR pressure row is only a partial placeholder.
  function pfrTeamChartingReady(metric, raw={}) {
    if (!metric || !(Number(metric.dropbacks) > 0) || !Number.isFinite(Number(metric.pressureRate))) return false;
    const pressures=Math.max(0,Number(metric.pressures)||0);
    const hurries=Math.max(0,Number(metric.hurries)||0);
    const hits=Math.max(0,Number(metric.hits)||0);
    const sacks=Math.max(0,Number(metric.sacks)||0);
    const weeklyHits=Math.max(0,Number(raw.defQbHits)||0);
    const weeklySacks=Math.max(0,Number(raw.defSacks)||0);

    // A charted-pressure count cannot be smaller than a separately observed QB-hit
    // count. This catches the common mid-update state where Prss == sacks while the
    // ordinary weekly feed already contains additional hits.
    if (weeklyHits > pressures + .5) return false;
    if (weeklyHits > weeklySacks && hurries <= 0 && hits <= 0 && pressures <= sacks + .5) return false;
    return true;
  }

  function aggregatePfrRows(rows=[]) {
    let pressures=0,hurries=0,hits=0,sacks=0,dropbacks=0,usable=0;
    const games=new Set();
    for (const r of rows || []) {
      const p=n(r.times_pressured), pct=pctRate(r.times_pressured_pct);
      if (p == null) continue;
      let db = null;
      if (p > 0 && pct != null && pct > 0) db=p/pct;
      // A zero-pressure backup row cannot reveal its denominator from Prss%; omit
      // that row rather than manufacturing exposure. Starting-QB rows virtually
      // always provide a usable denominator once charting is complete.
      if (!(db > 0)) continue;
      pressures += p;
      hurries += n(r.times_hurried)||0;
      hits += n(r.times_hit)||0;
      sacks += n(r.times_sacked)||0;
      dropbacks += db;
      usable += 1;
      games.add(r.game_id || `${r.week}|${r.team}|${r.opponent}`);
    }
    if (!(dropbacks > 0)) return null;
    const pressureRate=pressures/dropbacks, hitRate=hits/dropbacks, sackRate=sacks/dropbacks;
    return {
      games:games.size, rows:usable, dropbacks, pressures, hurries, hits, sacks,
      pressureRate, hitRate, sackRate,
      compositeRate:passRushCompositeRate({pressureRate,hitRate,sackRate})
    };
  }

  function pfrDefenseGames(rows=[]) {
    const byGame={};
    for (const r of rows || []) {
      const defense=canon(r.opponent);
      if (!defense) continue;
      const key=`${defense}|${r.game_id || `${r.week}|${r.team}|${r.opponent}`}`;
      (byGame[key] ||= []).push(r);
    }
    const out={};
    for (const [key, rs] of Object.entries(byGame)) {
      const defense=key.split('|',1)[0];
      const m=aggregatePfrRows(rs);
      if (!m || !Number.isFinite(m.compositeRate)) continue;
      (out[defense] ||= []).push({...m,week:Number(rs[0]?.week)||0,key});
    }
    for (const arr of Object.values(out)) arr.sort((a,b)=>a.week-b.week || String(a.key).localeCompare(String(b.key)));
    return out;
  }

  function combinePassRushGames(games=[]) {
    if (!games.length) return null;
    const total={pressures:0,hurries:0,hits:0,sacks:0,dropbacks:0};
    for (const g of games) for (const k of Object.keys(total)) total[k]+=Number(g[k])||0;
    if (!(total.dropbacks>0)) return null;
    const pressureRate=total.pressures/total.dropbacks, hitRate=total.hits/total.dropbacks, sackRate=total.sacks/total.dropbacks;
    return {...total,games:games.length,pressureRate,hitRate,sackRate,compositeRate:passRushCompositeRate({pressureRate,hitRate,sackRate})};
  }

  function rollingPassRushBenchmarks(priorGamesByDefense={}, sampleGames=1) {
    const n=Math.max(1,Math.floor(Number(sampleGames)||1)), vals=[];
    for (const arr of Object.values(priorGamesByDefense || {})) {
      if (!Array.isArray(arr) || arr.length < n) continue;
      for (let i=0;i<=arr.length-n;i++) {
        const m=combinePassRushGames(arr.slice(i,i+n));
        if (m && Number.isFinite(m.compositeRate)) vals.push(m.compositeRate);
      }
    }
    return vals;
  }

  // Linear interpolation through the historical empirical distribution. Using
  // same-sized rolling samples (one-game live data vs one-game 2025 samples,
  // two games vs two-game windows, etc.) prevents Week 1 volatility from being
  // compared to a low-variance full-season distribution and collapsing the top
  // of the scale to 100.
  function continuousPercentileValue(values, value, higherBetter=true) {
    const x=Number(value), arr=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!Number.isFinite(x) || !arr.length) return null;
    if (arr.length===1) return 50;
    const n=arr.length;
    let pct;
    if (x<=arr[0]) pct=50/n;
    else if (x>=arr[n-1]) pct=100-50/n;
    else {
      let hi=1;
      while (hi<n && arr[hi]<x) hi++;
      const lo=hi-1, span=arr[hi]-arr[lo];
      const f=span>0?(x-arr[lo])/span:.5;
      const loPct=100*(lo+.5)/n, hiPct=100*(hi+.5)/n;
      pct=loPct+f*(hiPct-loPct);
    }
    return higherBetter ? pct : 100-pct;
  }

  function qbReferenceValid(ref) {
    const ids=ref?.qb_player_ids;
    return ref?.version===QB_REFERENCE_VERSION && ref?.qb_epa_definition===QB_EPA_DEFINITION && ref?.season===2025
      && ref?.qb_id_source==='2025-player-stats-positional'
      && Array.isArray(ids) && ids.length>=32 && ref.qb_id_count===ids.length
      && ['1','2','3','4','17'].every(key=>Array.isArray(ref.sample_windows?.[key]?.qb_epa_per_play) && ref.sample_windows[key].qb_epa_per_play.length>=(key==='17'?30:400));
  }

  function gameFlowQbStatus(flow) {
    if (flow?.qb_epa_definition!==QB_EPA_DEFINITION) return {ready:false,reason:'QB input unavailable: game-flow all-play schema missing or outdated'};
    if (!qbReferenceValid(flow.v104_reference)) return {ready:false,reason:'QB input unavailable: historical all-play reference missing or invalid'};
    const fields=['home_qb_total_epa','home_qb_plays','away_qb_total_epa','away_qb_plays'];
    if (!Array.isArray(flow.defensive_drive_games) || !flow.defensive_drive_games.every(game=>fields.every(key=>typeof game[key]==='number' && Number.isFinite(game[key]) && (!key.endsWith('_plays') || game[key]>=0)))) {
      return {ready:false,reason:'QB input unavailable: all-play game fields missing or invalid'};
    }
    return {ready:true,reason:null};
  }

  function buildProfiles({ teamRows=[], playerRows=[], ftnRows=[], pfrPassRows=[], priorPfrPassRows=[], currentPressure=null, penaltyContextByTeam={}, defensiveDriveContextByTeam={}, performanceLuckGames=[], penaltyPriorByTeam={}, penaltyCalibration=null, historicalReference=null, qbEpaDefinition=null, priorProfiles={}, schedule=[], gameHistory={}, teamIds=[], priorGames=1, priorGamesByTeam=null, useChartedPassRush=false, unitPriorReversion=0, passRushFallbackPolicy='v99', coveragePolicy='v100-historical', qbPolicy='v101-legacy', receiverPolicy='v101-legacy', olPolicy='v101-legacy', offenseOutcomePolicy='v101-legacy', rbPolicy='v101-legacy' }) {
    teamRows = teamRows.filter((r) => String(r.season)==='2026' && (!r.season_type || r.season_type==='REG')).map((r)=>({...r,team:canon(r.team),opponent_team:canon(r.opponent_team)}));
    playerRows = playerRows.filter((r) => String(r.season)==='2026' && (!r.season_type || r.season_type==='REG')).map((r)=>({...r,team:canon(r.team || r.recent_team),opponent_team:canon(r.opponent_team)}));
    ftnRows = ftnRows.filter((r) => String(r.season)==='2026' && (!r.season_type || r.season_type==='REG'));
    pfrPassRows = pfrPassRows.filter((r) => String(r.season)==='2026' && (!r.game_type || r.game_type==='REG')).map((r)=>({...r,team:canon(r.team),opponent:canon(r.opponent)}));
    priorPfrPassRows = priorPfrPassRows.filter((r) => String(r.season)==='2025' && (!r.game_type || r.game_type==='REG')).map((r)=>({...r,team:canon(r.team),opponent:canon(r.opponent)}));
    const ids = teamIds.length ? teamIds.map(canon) : [...new Set(teamRows.map(r=>r.team))];
    const raw={};
    const ftnContract=ftnPressureContract(ftnRows);
    const ftnGamesByDefense=useChartedPassRush && ftnContract.ready ? ftnDefensePressureGames(ftnRows) : {};
    const currentPfrReady=useChartedPassRush && pfrChartingReady(pfrPassRows);
    const priorPfrReady=useChartedPassRush && pfrChartingReady(priorPfrPassRows);
    const currentPfrGamesByDefense=currentPfrReady ? pfrDefenseGames(pfrPassRows) : {};
    const priorPfrGamesByDefense=priorPfrReady ? pfrDefenseGames(priorPfrPassRows) : {};
    const currentPfrByTeam=Object.fromEntries(ids.map((t)=>[t,combinePassRushGames(currentPfrGamesByDefense[t]||[])]));
    const priorPfrByTeam=Object.fromEntries(ids.map((t)=>[t,combinePassRushGames(priorPfrGamesByDefense[t]||[])]));
    const priorPfrCompositeValues=ids.map((t)=>priorPfrByTeam[t]?.compositeRate).filter(Number.isFinite);

    for (const t of ids) {
      const own=teamRows.filter(r=>r.team===t), opp=teamRows.filter(r=>r.opponent_team===t);
      const players=playerRows.filter(r=>r.team===t), oppPlayers=playerRows.filter(r=>r.opponent_team===t);
      const games=uniqCount(own);
      const playerGames=uniqCount(players);
      const completed= (schedule||[]).filter((g)=>(g.home===t||g.away===t)&&g.homeScore!=null&&g.awayScore!=null);
      const completedGames=completed.length;
      const latestCompletedWeek=completed.reduce((m,g)=>Math.max(m,Number(g.week)||0),0);
      const teamStatsThroughWeek=maxWeek(own);
      const playerStatsThroughWeek=maxWeek(players);
      const teamStatsFresh=completedGames===0 || (games>=completedGames && teamStatsThroughWeek>=latestCompletedWeek);
      const playerStatsFresh=completedGames===0 || (playerStatsThroughWeek>=latestCompletedWeek);
      // V83: distinguish freshness from usability during an in-progress NFL week.
      // A Thursday game can advance the schedule to Week 2 hours before nflverse's
      // weekly team/player assets publish those two teams' Week 2 rows. Their
      // Week 1 observations remain valid last-known-good inputs; only the new week
      // is pending. Teams that have not yet played Week 2 remain fully current.
      const teamStatsUsable=completedGames===0 || games>0;
      const playerStatsUsable=completedGames===0 || players.length>0;
      const passPlays=sum(own,'attempts')+sum(own,'sacks_suffered');
      const rushes=sum(own,'carries');
      const plays=passPlays+rushes;
      const oppPassPlays=sum(opp,'attempts')+sum(opp,'sacks_suffered');
      const oppRushes=sum(opp,'carries');
      const oppPlays=oppPassPlays+oppRushes;
      const passEpa=safeDiv(sum(own,'passing_epa'),passPlays);
      const rushEpa=safeDiv(sum(own,'rushing_epa'),rushes);
      const offEpa=safeDiv(sum(own,'passing_epa')+sum(own,'rushing_epa'),plays);
      const recvTargets=sum(own,'targets');
      const recvEpa=safeDiv(sum(own,'receiving_epa'),recvTargets);
      const sackAllowed=safeDiv(sum(own,'sacks_suffered'),passPlays);
      // OL disruption allowed: opponent defensive QB hits + sacks against this
      // offense, normalized by this offense's dropbacks. This replaces the old
      // sack-only stand-in, which missed strong pass-protection games where the
      // quarterback was kept clean without sacks being the whole story.
      const oppDefQbHits=sum(opp,'def_qb_hits');
      const oppDefSacks=sum(opp,'def_sacks');
      const pressureAllowedRate=safeDiv(oppDefQbHits+oppDefSacks,passPlays);
      const oppPassEpaAggregate=safeDiv(sum(opp,'passing_epa'),oppPassPlays);
      const oppRushEpa=safeDiv(sum(opp,'rushing_epa'),oppRushes);
      const defEpa=safeDiv(-(sum(opp,'passing_epa')+sum(opp,'rushing_epa')),oppPlays);
      // Front disruption must reflect more than sacks. nflverse weekly stats expose
      // defensive QB hits and sacks; the previous sack-only proxy could mark a
      // dominant pressure game as mediocre whenever pressures did not finish as
      // sacks. The events are distinct in nflfastR's weekly stat construction.
      const defQbHits=sum(own,'def_qb_hits');
      const defSacks=sum(own,'def_sacks');
      const frontDisruptions=defQbHits+defSacks;
      const frontPressureRate=safeDiv(frontDisruptions,oppPassPlays);
      const frontSackRate=safeDiv(defSacks,oppPassPlays);
      const oppCpoe=weightedMean(opp,'passing_cpoe','attempts');
      const cpoe=weightedMean(own,'passing_cpoe','attempts');

      const qbRows=players.filter(r=>String(r.position||r.position_group).toUpperCase()==='QB');
      const qbPassPlays=sum(qbRows,'attempts')+sum(qbRows,'sacks_suffered');
      const qbRushesWeekly=sum(qbRows,'carries');
      const qbRushEpaTotalWeekly=sum(qbRows,'rushing_epa');
      const qbPlays=qbPassPlays+qbRushesWeekly;
      const qbEpa=qbRows.length ? safeDiv(sum(qbRows,'passing_epa')+qbRushEpaTotalWeekly,qbPlays) : passEpa;
      const qbCpoe=qbRows.length ? weightedMean(qbRows,'passing_cpoe','attempts') : cpoe;
      const qbRushEpaWeekly=qbRows.length ? safeDiv(qbRushEpaTotalWeekly,qbRushesWeekly) : null;
      // V130 ANY/A: (pass yards + 20*pass TD - 45*INT - sack yards) / (attempts + sacks).
      // nflverse field names have changed over time, so accept the known aliases.
      const qbPassYards=sum(qbRows,'passing_yards');
      const qbPassTds=sum(qbRows,'passing_tds') || sum(qbRows,'passing_touchdowns');
      const qbInterceptions=sum(qbRows,'interceptions') || sum(qbRows,'passing_interceptions');
      const qbSackYards=qbSackYardsLost(qbRows);
      const qbAttempts=sum(qbRows,'attempts'), qbSacks=sum(qbRows,'sacks_suffered');
      const qbAnyA=(qbAttempts+qbSacks)>0 && (qbPassYards||qbPassTds||qbInterceptions||qbSackYards)
        ? (qbPassYards+20*qbPassTds-45*qbInterceptions-qbSackYards)/(qbAttempts+qbSacks) : null;
      const qbByName={};
      for (const r of qbRows) {
        const name=r.player_display_name || r.player_name || 'Quarterbacks';
        qbByName[name]=(qbByName[name]||0)+(n(r.attempts)||0)+(n(r.sacks_suffered)||0);
      }
      const qbSorted=Object.entries(qbByName).sort((a,b)=>b[1]-a[1]);
      const qbName=qbSorted[0]?.[0] || priorProfiles[t]?.qb?.qb || 'Quarterbacks';
      const qbPrimaryDropbacks=Math.max(0,Number(qbSorted[0]?.[1])||0);
      const qbRoomDropbacks=Object.values(qbByName).reduce((a,v)=>a+(Number(v)||0),0);
      const qbPrimaryDropbackShare=qbRoomDropbacks>0?qbPrimaryDropbacks/qbRoomDropbacks:null;

      const recPositions=receiverResidualPolicyActive(receiverPolicy) ? ['WR','TE'] : ['WR','TE','RB','FB'];
      const recRows=players.filter(r=>recPositions.includes(String(r.position||'').toUpperCase()));
      const receiverRoomTargets=sum(recRows,'targets');
      const receiverRoomEpa=safeDiv(sum(recRows,'receiving_epa'),receiverRoomTargets);
      const effectiveRecvEpa=receiverResidualPolicyActive(receiverPolicy) ? receiverRoomEpa : recvEpa;
      const leaders={};
      for (const r of recRows) {
        const name=r.player_display_name || r.player_name || 'Receiver';
        if (!leaders[name]) leaders[name]={name,targets:0,receiving_epa:0};
        leaders[name].targets += n(r.targets)||0;
        leaders[name].receiving_epa += n(r.receiving_epa)||0;
      }
      const recLeaders=Object.values(leaders).sort((a,b)=>b.targets-a.targets).slice(0,3).map(x=>({name:x.name,targets:x.targets,adj_epa:safeDiv(x.receiving_epa,x.targets)}));

      const rbRows=players.filter(r=>['RB','FB'].includes(String(r.position||'').toUpperCase()));
      const rbByName={};
      for (const r of rbRows) {
        const name=r.player_display_name || r.player_name || 'Running backs';
        if (!rbByName[name]) rbByName[name]={name,carries:0,rush_epa:0,targets:0,receiving_epa:0};
        rbByName[name].carries += n(r.carries)||0; rbByName[name].rush_epa += n(r.rushing_epa)||0;
        rbByName[name].targets += n(r.targets)||0; rbByName[name].receiving_epa += n(r.receiving_epa)||0;
      }
      const rb=Object.values(rbByName).sort((a,b)=>b.carries-a.carries)[0];
      // V57 first-class RB unit: use the entire RB/FB room, not team rushing.
      // The historical 2025 RB composite is defined as 70% rushing efficiency
      // and 30% receiving efficiency, so preserve that construction in-season.
      const rbCarries=sum(rbRows,'carries'), rbTargets=sum(rbRows,'targets');
      const rbRushEpa=safeDiv(sum(rbRows,'rushing_epa'),rbCarries);
      const rbRecvEpa=safeDiv(sum(rbRows,'receiving_epa'),rbTargets);
      const rbComposite=(Number.isFinite(rbRushEpa)&&Number.isFinite(rbRecvEpa)) ? .70*rbRushEpa+.30*rbRecvEpa
        : Number.isFinite(rbRushEpa) ? rbRushEpa : Number.isFinite(rbRecvEpa) ? rbRecvEpa : null;

      // V60: team-level nflverse weekly stats expose committed penalties and
      // penalty_yards directly.  The previous player-level def_penalty proxy is
      // not present in the normal player-stat feed, which caused the entire
      // Penalties view to go unavailable.  Pair own team rows with opponent
      // team rows so positive net yardage means opponents surrendered more
      // penalty yards than this team did.
      const ownDefPen=sum(own,'penalties'), ownDefPenYds=sum(own,'penalty_yards');
      const oppDefPen=sum(opp,'penalties'), oppDefPenYds=sum(opp,'penalty_yards');
      const netPenYds=oppDefPenYds-ownDefPenYds;
      const driveCtx=defensiveDriveContextByTeam?.[t] || {};
      const offensivePoints=Number(driveCtx.offensivePoints);
      const offensiveDrives=Number(driveCtx.offensiveDrives);
      const offensivePointsPerDrive=(Number.isFinite(offensivePoints)&&Number.isFinite(offensiveDrives)&&offensiveDrives>0)?offensivePoints/offensiveDrives:null;
      const qbAttemptPassEpaSum=Number(driveCtx.offensePassEpa);
      const qbAttemptPassAttempts=Math.max(0,Number(driveCtx.offensePassAttempts)||0);
      const qbAttemptPassSuccesses=Math.max(0,Number(driveCtx.offensePassSuccesses)||0);
      const qbValuePlays=Math.max(0,Number(driveCtx.qbPlays)||0);
      const qbTotalEpa=n(driveCtx.qbTotalEpa);
      const qbEpaPerPlay=qbValuePlays>0 && qbTotalEpa!=null ? qbTotalEpa/qbValuePlays : null;
      const qbAttemptEpa=(Number.isFinite(qbAttemptPassEpaSum)&&qbAttemptPassAttempts>0)?qbAttemptPassEpaSum/qbAttemptPassAttempts:null;
      const qbPassSuccessRate=qbAttemptPassAttempts>0?qbAttemptPassSuccesses/qbAttemptPassAttempts:null;
      const pbpPassProtectionDropbacks=Math.max(0,Number(driveCtx.passProtectionDropbacks)||0);
      const pbpPassProtectionDisruptions=Math.max(0,Number(driveCtx.passProtectionDisruptions)||0);
      const pbpPressureAllowedRate=pbpPassProtectionDropbacks>0?pbpPassProtectionDisruptions/pbpPassProtectionDropbacks:null;
      const standardRushDropbacks=Math.max(0,Number(driveCtx.standardRushDropbacks)||0);
      const standardRushPressures=Math.max(0,Number(driveCtx.standardRushPressures)||0);
      const standardRushPressureRate=standardRushDropbacks>0?standardRushPressures/standardRushDropbacks:null;
      const pressurePlays=Math.max(0,Number(driveCtx.pressurePlays)||0);
      const pressureSuccesses=Math.max(0,Number(driveCtx.pressureSuccesses)||0);
      const pressureSuccessRate=pressurePlays>0?pressureSuccesses/pressurePlays:null;
      const pressureEpaPerPlay=Number.isFinite(Number(driveCtx.pressureEpaPerPlay))?Number(driveCtx.pressureEpaPerPlay):null;
      const cleanEpaPerPlay=Number.isFinite(Number(driveCtx.cleanEpaPerPlay))?Number(driveCtx.cleanEpaPerPlay):null;
      const pressureEpaDrop=(pressureEpaPerPlay!=null&&cleanEpaPerPlay!=null)?pressureEpaPerPlay-cleanEpaPerPlay:null;
      const pbpQbRushAttempts=Math.max(0,Number(driveCtx.qbRushAttempts)||0);
      const pbpQbRushEpaTotal=Number(driveCtx.qbRushEpa);
      const usePbpQbRush=(qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated'||qbPolicy==='v106-current-season-stabilized') && pbpQbRushAttempts>0 && Number.isFinite(pbpQbRushEpaTotal);
      const qbRushes=usePbpQbRush?pbpQbRushAttempts:qbRushesWeekly;
      const qbRushEpaTotal=usePbpQbRush?pbpQbRushEpaTotal:qbRushEpaTotalWeekly;
      const qbRushEpa=qbRushes>0?safeDiv(qbRushEpaTotal,qbRushes):qbRushEpaWeekly;
      const coveragePassEpaSum=Number(driveCtx.coveragePassEpa);
      const coveragePassAttempts=Math.max(0,Number(driveCtx.coveragePassAttempts)||0);
      const coveragePassEpaPerAttempt=(Number.isFinite(coveragePassEpaSum) && coveragePassAttempts>0) ? coveragePassEpaSum/coveragePassAttempts : null;
      // V101: Coverage excludes sacks entirely. Preserve the V100 aggregate
      // dropback EPA only when reconstructing the frozen Week-2 entry baseline.
      const oppPassEpa=coveragePolicy==='v100-historical'
        ? oppPassEpaAggregate
        : (Number.isFinite(coveragePassEpaPerAttempt) ? coveragePassEpaPerAttempt : null);
      const defensivePointsAllowed=Number(driveCtx.pointsAllowed);
      const opponentDrives=Number(driveCtx.opponentDrives);
      const defensivePointsPerDrive=(Number.isFinite(defensivePointsAllowed) && Number.isFinite(opponentDrives) && opponentDrives>0) ? defensivePointsAllowed/opponentDrives : null;
      const defensiveDriveGames=Math.max(0,Number(driveCtx.games)||0);
      const offensiveDriveGames=Math.max(0,Number(driveCtx.games)||0);
      const ftnPassRush=combineFtnPressureGames(ftnGamesByDefense[t]||[],{defQbHits,defSacks});
      const chartedPassRush=currentPfrByTeam[t]||null;
      const externalPressure=externalPressureMetric(currentPressure,t,{oppPassPlays,defQbHits,defSacks},schedule,completedGames);
      raw[t]={games,playerGames,completedGames,latestCompletedWeek,teamStatsThroughWeek,playerStatsThroughWeek,teamStatsFresh,playerStatsFresh,teamStatsUsable,playerStatsUsable,offEpa,passEpa,rushEpa,recvEpa:effectiveRecvEpa,sackAllowed,pressureAllowedRate,oppDefQbHits,oppDefSacks,defEpa,frontPressureRate,frontSackRate,defQbHits,defSacks,frontDisruptions,ftnPassRush,chartedPassRush,externalPressure,oppRushEpa,oppPassEpa,oppCpoe,qbEpa,qbCpoe,qbRushEpa,qbRushEpaTotal,qbRushes,qbRushSource:(usePbpQbRush?'pbp-kneels-excluded':'weekly-player'),qbName,qbPrimaryDropbacks,qbRoomDropbacks,qbPrimaryDropbackShare,qbAnyA,qbPassYards,qbPassTds,qbInterceptions,qbSackYards,qbAttempts,qbSacks,recLeaders,receiverRoomTargets,rb,rbCarries,rbTargets,rbRushEpa,rbRecvEpa,rbComposite,defensivePointsAllowed,opponentDrives,defensivePointsPerDrive,defensiveDriveGames,offensivePoints,offensiveDrives,offensivePointsPerDrive,offensiveDriveGames,qbAttemptPassEpaSum,qbAttemptPassAttempts,qbAttemptPassSuccesses,qbAttemptEpa,qbEpaPerPlay,qbTotalEpa,qbValuePlays,qbPassSuccessRate,pbpPassProtectionDropbacks,pbpPassProtectionDisruptions,pbpPressureAllowedRate,standardRushDropbacks,standardRushPressures,standardRushPressureRate,pressurePlays,pressureSuccesses,pressureSuccessRate,pressureEpaPerPlay,cleanEpaPerPlay,pressureEpaDrop,gameRows:Array.isArray(driveCtx.gameRows)?driveCtx.gameRows:[],coveragePassEpaSum,coveragePassAttempts,coveragePassEpaPerAttempt,oppPassEpaAggregate,coveragePolicy,qbPolicy,receiverPolicy,olPolicy,offenseOutcomePolicy,rbPolicy,
        ownDefPen,ownDefPenYds,oppDefPen,oppDefPenYds,netPenYds,netPenYdsPerGame:games?safeDiv(netPenYds,games):null,
        passPlays,rushes,oppPassPlays,oppRushes};
    }

    const scoreOff=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.offEpa : null])),true);
    const scoreRush=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.rushEpa : null])),true);
    const scoreRbLegacy=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.rbComposite : null])),true);
    const scorePressureAllowed=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.pressureAllowedRate : null])),false);
    const scoreStandardRushPressure=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.standardRushPressureRate])),false);
    const scorePressureEpa=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.pressureEpaPerPlay])),true);
    const scorePressureSuccess=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.pressureSuccessRate])),true);
    const scoreFrontPressure=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.frontPressureRate : null])),true);
    const scoreRunDef=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.oppRushEpa : null])),false);
    // V100 defensive outcome check.
    const scorePointsPerDrive=percentileMap(Object.fromEntries(ids.map(t=>[t,Number.isFinite(raw[t]?.defensivePointsPerDrive) ? raw[t].defensivePointsPerDrive : null])),false);
    // V102 offensive outcome check: scoring per qualifying drive replaces team EPA as the canonical broad outcome input.
    const scorePointsScoredPerDrive=percentileMap(Object.fromEntries(ids.map(t=>[t,Number.isFinite(raw[t]?.offensivePointsPerDrive) ? raw[t].offensivePointsPerDrive : null])),true);
    const scorePassDef=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.oppPassEpa : null])),false);
    const scoreCpoeDef=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.oppCpoe : null])),false);

    // V139: Coverage remains a defensive unit, but it no longer drives QB opponent adjustment.
    // The QB EPA component is kept raw here; opponent context is applied later from
    // leave-one-matchup-out FORCE QB Rating allowed by the defenses faced.
    for (const t of ids) {
      const r=raw[t]||{};
      const baseAttemptEpa=(qbPolicy==='v102-attempts-opponent-adjusted'||qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated'||qbPolicy==='v106-current-season-stabilized')?r.qbAttemptEpa:r.qbEpa;
      r.qbOpponentCoverageIndex=null;
      r.qbOpponentEpaAdjustment=0;
      r.qbAdjustedEpa=Number.isFinite(Number(baseAttemptEpa))?Number(baseAttemptEpa):null;
    }
    // V115 learns how much of receiving efficiency historically moves with the QB
    // environment, then subtracts only that fitted (ridge-shrunk) component. The
    // historical receiver rate is reconstructed WR/TE-only where RB target data
    // permit, avoiding the V114 historical/live room-definition mismatch.
    const priorQbPassValues=Object.values(priorProfiles||{}).map(priorQbPassEpa).filter(Number.isFinite);
    const orthogonalQbCenter=medianValue(priorQbPassValues);
    const receiverPassBeta=receiverPolicy==='v115-partial-orthogonal' ? ridgeOrthogonalSlope(Object.values(priorProfiles||{}).map((p)=>({x:priorQbPassEpa(p),y:priorReceiverWrteEpa(p)})),UNIT_V115.orthogonalRidgeFraction) : 1;
    const rbRecvPassBeta=rbPolicy==='v115-partial-orthogonal' ? ridgeOrthogonalSlope(Object.values(priorProfiles||{}).map((p)=>({x:priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),UNIT_V115.orthogonalRidgeFraction) : 1;
    // Owner-selected V115 effective priors share the fitted live/reference frame.
    const v115RbPriorComposite=(p)=>priorRbOrthogonalComposite(p,rbRecvPassBeta,orthogonalQbCenter);
    for (const t of ids) {
      const r=raw[t]||{};
      r.receiverOrthogonalBeta=receiverPassBeta;
      r.receiverEnvironmentCenter=orthogonalQbCenter;
      r.receiverExpectedEnvironmentContribution=(receiverPolicy==='v115-partial-orthogonal' && Number.isFinite(Number(r.qbAttemptEpa))&&Number.isFinite(Number(orthogonalQbCenter))) ? receiverPassBeta*(Number(r.qbAttemptEpa)-Number(orthogonalQbCenter)) : (Number.isFinite(Number(r.qbAttemptEpa))?Number(r.qbAttemptEpa):null);
      r.receiverResidualEpa=receiverResidualPolicyActive(receiverPolicy) ? partialResidual(r.recvEpa,r.qbAttemptEpa,receiverPolicy==='v115-partial-orthogonal'?receiverPassBeta:1,receiverPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0) : r.recvEpa;
      r.rbRecvOrthogonalBeta=rbRecvPassBeta;
      r.rbRecvExpectedEnvironmentContribution=(rbPolicy==='v115-partial-orthogonal' && Number.isFinite(Number(r.qbAttemptEpa))&&Number.isFinite(Number(orthogonalQbCenter))) ? rbRecvPassBeta*(Number(r.qbAttemptEpa)-Number(orthogonalQbCenter)) : (Number.isFinite(Number(r.qbAttemptEpa))?Number(r.qbAttemptEpa):null);
      const rbRecvResidual=rbResidualPolicyActive(rbPolicy) ? partialResidual(r.rbRecvEpa,r.qbAttemptEpa,rbPolicy==='v115-partial-orthogonal'?rbRecvPassBeta:1,rbPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0) : r.rbRecvEpa;
      r.rbRecvResidualEpa=rbRecvResidual;
      // RB rushing remains directly credited to the RB/FB room. V115 does not
      // invent a run-block subtraction from a pass-protection OL metric; instead
      // it uses a less aggressive opportunity stabilizer below so strong rushing
      // performances can earn upper-tail separation as carries accumulate.
      r.rbCompositeOrthogonal=(Number.isFinite(Number(r.rbRushEpa))&&Number.isFinite(Number(rbRecvResidual))) ? (.70*Number(r.rbRushEpa)+.30*Number(rbRecvResidual)) : (Number.isFinite(Number(r.rbRushEpa))?Number(r.rbRushEpa):(Number.isFinite(Number(rbRecvResidual))?Number(rbRecvResidual):null));
    }
    // V109+: Receiver and RB efficiency are volatile in tiny samples. Stabilize
    // each current-season signal toward the live 2026 league environment by its
    // own opportunity count before mapping it onto the full-season 2025 quality
    // distribution. This is reliability shrinkage, not extra prior-year weighting.
    const currentReceiverResidual=weightedLeagueMean(ids.map(t=>raw[t]||{}),'receiverResidualEpa','receiverRoomTargets');
    const currentRbRush=weightedLeagueMean(ids.map(t=>raw[t]||{}),'rbRushEpa','rbCarries');
    const currentRbRecvResidual=weightedLeagueMean(ids.map(t=>raw[t]||{}),'rbRecvResidualEpa','rbTargets');
    const priorReceiverResidualValues=Object.values(priorProfiles||{}).map((p)=>priorReceiverResidual(p,receiverPolicy==='v115-partial-orthogonal'?receiverPassBeta:1,receiverPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0)).filter(Number.isFinite);
    const priorReceiverResidualMedian=medianValue(priorReceiverResidualValues);
    const priorReceiverByTeam=Object.fromEntries(ids.map((t)=>{ const v=priorReceiverResidual(priorProfiles[t]||{},receiverPolicy==='v115-partial-orthogonal'?receiverPassBeta:1,receiverPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0); return [t,Number.isFinite(v)&&priorReceiverResidualValues.length>=20?continuousPercentileValue(priorReceiverResidualValues,v,true):null]; }));
    const priorRbOrthogonalValuesV109=Object.values(priorProfiles||{}).map((p)=>rbPolicy==='v115-partial-orthogonal'?v115RbPriorComposite(p):priorRbOrthogonalComposite(p,1,0)).filter(Number.isFinite);
    const priorRbOrthogonalMedian=medianValue(priorRbOrthogonalValuesV109);
    const currentRbCompositeCenter=(Number.isFinite(Number(currentRbRush))&&Number.isFinite(Number(currentRbRecvResidual))) ? .70*Number(currentRbRush)+.30*Number(currentRbRecvResidual) : null;
    const scoreRecvV109={}, scoreRbV109={};
    for (const t of ids) {
      const r=raw[t]||{};
      const unitCfg=(receiverPolicy==='v115-partial-orthogonal'||rbPolicy==='v115-partial-orthogonal')?UNIT_V115:((receiverPolicy==='v114-centered-stabilized-residual'||rbPolicy==='v114-centered-stabilized-residual')?UNIT_V114:UNIT_V109);
      r.receiverCurrentLeagueResidual=currentReceiverResidual;
      r.receiverHistoricalResidualMedian=priorReceiverResidualMedian;
      r.receiverReliabilityWeight=reliabilityWeight(r.receiverRoomTargets,unitCfg.receiverResidualStabilizerTargets);
      r.receiverStabilizedResidual=stabilizeToward(r.receiverResidualEpa,currentReceiverResidual,r.receiverRoomTargets,unitCfg.receiverResidualStabilizerTargets);
      r.receiverCalibratedResidual=((receiverPolicy==='v114-centered-stabilized-residual'||receiverPolicy==='v115-partial-orthogonal') && Number.isFinite(Number(r.receiverStabilizedResidual)) && Number.isFinite(Number(currentReceiverResidual)) && Number.isFinite(Number(priorReceiverResidualMedian)))
        ? environmentAlignToHistoricalCenter(r.receiverStabilizedResidual,currentReceiverResidual,priorReceiverResidualMedian)
        : r.receiverStabilizedResidual;
      scoreRecvV109[t]=r.playerStatsUsable && Number.isFinite(Number(r.receiverCalibratedResidual))
        ? (priorReceiverResidualValues.length>=20?continuousPercentileValue(priorReceiverResidualValues,r.receiverCalibratedResidual,true):null) : null;
      r.rbCurrentLeagueRush=currentRbRush; r.rbCurrentLeagueRecvResidual=currentRbRecvResidual;
      r.rbCurrentLeagueCompositeCenter=currentRbCompositeCenter; r.rbHistoricalCompositeMedian=priorRbOrthogonalMedian;
      r.rbRushReliabilityWeight=reliabilityWeight(r.rbCarries,unitCfg.rbRushStabilizerCarries);
      r.rbRecvReliabilityWeight=reliabilityWeight(r.rbTargets,unitCfg.rbRecvResidualStabilizerTargets);
      r.rbStabilizedRushEpa=stabilizeToward(r.rbRushEpa,currentRbRush,r.rbCarries,unitCfg.rbRushStabilizerCarries);
      r.rbStabilizedRecvResidualEpa=stabilizeToward(r.rbRecvResidualEpa,currentRbRecvResidual,r.rbTargets,unitCfg.rbRecvResidualStabilizerTargets);
      r.rbStabilizedComposite=(Number.isFinite(Number(r.rbStabilizedRushEpa))&&Number.isFinite(Number(r.rbStabilizedRecvResidualEpa)))
        ? .70*Number(r.rbStabilizedRushEpa)+.30*Number(r.rbStabilizedRecvResidualEpa)
        : (Number.isFinite(Number(r.rbStabilizedRushEpa))?Number(r.rbStabilizedRushEpa):(Number.isFinite(Number(r.rbStabilizedRecvResidualEpa))?Number(r.rbStabilizedRecvResidualEpa):null));
      r.rbCalibratedComposite=((rbPolicy==='v114-centered-stabilized-residual'||rbPolicy==='v115-partial-orthogonal') && Number.isFinite(Number(r.rbStabilizedComposite)) && Number.isFinite(Number(currentRbCompositeCenter)) && Number.isFinite(Number(priorRbOrthogonalMedian)))
        ? environmentAlignToHistoricalCenter(r.rbStabilizedComposite,currentRbCompositeCenter,priorRbOrthogonalMedian)
        : r.rbStabilizedComposite;
      scoreRbV109[t]=r.playerStatsUsable && Number.isFinite(Number(r.rbCalibratedComposite))
        ? (priorRbOrthogonalValuesV109.length>=20?continuousPercentileValue(priorRbOrthogonalValuesV109,r.rbCalibratedComposite,true):null) : null;
    }
    const scoreRecv=(receiverPolicy==='v109-stabilized-residual'||receiverPolicy==='v114-centered-stabilized-residual'||receiverPolicy==='v115-partial-orthogonal') ? scoreRecvV109 : percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.receiverResidualEpa : null])),true);
    const scoreQbEpa=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.qbAdjustedEpa : null])),true);
    const scoreQbCpoe=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.qbCpoe : null])),true);
    const scoreQbRush=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.qbRushEpa : null])),true);
    const currentAdjustedQbEpaValues=ids.map((t)=>raw[t]?.playerStatsUsable?raw[t]?.qbAdjustedEpa:null).filter((v)=>Number.isFinite(Number(v)));
    const scoreQbEpaStable=Object.fromEntries(ids.map((t)=>[t,raw[t]?.playerStatsUsable ? shiftedPriorPercentile(priorProfiles,(p)=>Number.isFinite(Number(p?.qb?.epaoe))?Number(p.qb.epaoe):p?.qb?.epa_per_play,raw[t]?.qbAdjustedEpa,currentAdjustedQbEpaValues,true) : null]));
    // V104: benchmark current sack-free pass EPA against same-sized rolling 2025
    // game windows. This turns 90+ into historically rare evidence instead of a
    // rank artifact from 32 full-season team values and removes the V103 100-point
    // saturation bug. Opponent adjustment remains applied to the live observation.
    const scoreQbEpaHistorical=Object.fromEntries(ids.map((t)=>{
      const r=raw[t]||{};
      if (!r.playerStatsUsable || !Number.isFinite(Number(r.qbAdjustedEpa))) return [t,null];
      const bench=historicalWindowValues(historicalReference,'qb_pass_epa',r.playerGames||1);
      return [t,bench.length>=100?continuousPercentileValue(bench,r.qbAdjustedEpa,true):qbPassAbsoluteFallback(r.qbAdjustedEpa)];
    }));
    const scoreQbCpoeStable=Object.fromEntries(ids.map((t)=>{
      const r=raw[t]||{};
      const attempts=Number(r.qbAttemptPassAttempts)>0?Number(r.qbAttemptPassAttempts):sum(playerRows.filter((x)=>x.team===t && String(x.position||x.position_group).toUpperCase()==='QB'),'attempts');
      return [t,r.playerStatsUsable ? qbCpoeScore(r.qbCpoe,attempts) : null];
    }));
    // V106: stabilize current-season QB evidence toward the current 2026 league
    // environment before translating it to a long-run quality scale. This is
    // sample-size shrinkage, not a heavier 2025 player prior.
    const qbLiveRows=ids.map((t)=>raw[t]||{}).filter((r)=>r.playerStatsUsable && Number(r.qbAttemptPassAttempts)>0);
    const currentLeagueQbEpa=weightedLeagueMean(qbLiveRows,'qbEpaPerPlay','qbValuePlays');
    const currentLeaguePassEpa=weightedLeagueMean(qbLiveRows,'qbAttemptEpa','qbAttemptPassAttempts');
    const currentLeagueQbCpoe=weightedLeagueMean(qbLiveRows,'qbCpoe','qbAttemptPassAttempts');
    let successNum=0,successDen=0;
    for (const r of qbLiveRows) {
      const a=Math.max(0,Number(r.qbAttemptPassAttempts)||0), s=Math.max(0,Number(r.qbAttemptPassSuccesses)||0);
      if (a>0) { successNum+=s; successDen+=a; }
    }
    const currentLeagueQbSuccess=successDen>0?successNum/successDen:null;
    const fullSeasonQbEpaBench=historicalWindowValues(historicalReference,'qb_epa_per_play',17);
    const fullSeasonQbSuccessBench=historicalWindowValues(historicalReference,'qb_pass_success_rate',17);
    const scoreQbEpaV106={}, scoreQbAdjustedEpaV131={}, scoreQbCpoeV106={}, scoreQbSuccessV106={};
    // ANY/A is ranked on the same 0-100 FORCE component scale. When a feed does
    // not expose its box-score ingredients, the component stays neutral rather
    // than silently substituting a different statistic.
    const scoreQbAnyAV130=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.qbAnyA : null])),true);
    // V139 opponent context: construct a current-season FORCE-style QB rating for each
    // team-game, then rate each defense by what it allowed in its OTHER games. This
    // makes the schedule adjustment leave-one-matchup-out: the evaluated QB's own
    // performance against a defense cannot make that defense look easier or harder.
    const qbGameRecords=[];
    for (const t of ids) {
      const r=raw[t]||{};
      for (const g of (Array.isArray(r.gameRows)?r.gameRows:[])) {
        const week=Number(g.week)||0, opp=canon(g.opponent);
        const qrows=playerRows.filter((x)=>x.team===t && Number(x.week)===week && (!x.opponent_team || canon(x.opponent_team)===opp) && String(x.position||x.position_group).toUpperCase()==='QB');
        const att=sum(qrows,'attempts'), sacks=sum(qrows,'sacks_suffered'), db=Math.max(0,att+sacks);
        if (!(db>0)) continue;
        const passYds=sum(qrows,'passing_yards'), passTds=sum(qrows,'passing_tds')||sum(qrows,'passing_touchdowns');
        const ints=sum(qrows,'interceptions')||sum(qrows,'passing_interceptions');
        const sackYds=qbSackYardsLost(qrows);
        const anya=(att+sacks)>0?(passYds+20*passTds-45*ints-sackYds)/(att+sacks):null;
        const cpoe=weightedMean(qrows,'passing_cpoe','attempts');
        const epa=Number(g.qbPlays)>0?Number(g.qbTotalEpa)/Number(g.qbPlays):null;
        const success=Number(g.passAttempts)>0?Number(g.passSuccesses)/Number(g.passAttempts):null;
        const rushAtt=Math.max(0,Number(g.qbRushAttempts)||0), rushEpa=rushAtt>0?Number(g.qbRushEpa)/rushAtt:0;
        const stdRate=Number(g.standardRushDropbacks)>0?Number(g.standardRushPressures)/Number(g.standardRushDropbacks):null;
        const pressureEpa=Number(g.pressurePlays)>0?Number(g.pressureEpa)/Number(g.pressurePlays):null;
        const pressureSuccess=Number(g.pressurePlays)>0?Number(g.pressureSuccesses)/Number(g.pressurePlays):null;
        qbGameRecords.push({team:t,opponent:opp,week,dropbacks:db,epa,anya,cpoe,success,rushEpa,rushAtt,stdRate,pressureEpa,pressureSuccess,pressurePlays:Math.max(0,Number(g.pressurePlays)||0)});
      }
    }
    const gameMetricScore=(key,higher=true)=>{
      const obj=Object.fromEntries(qbGameRecords.map((g,i)=>[String(i),Number.isFinite(Number(g[key]))?Number(g[key]):null]));
      return percentileMap(obj,higher);
    };
    const gEpa=gameMetricScore('epa',true), gAnya=gameMetricScore('anya',true), gSuccess=gameMetricScore('success',true), gRush=gameMetricScore('rushEpa',true), gCpoe=gameMetricScore('cpoe',true), gStd=gameMetricScore('stdRate',false), gPressureEpa=gameMetricScore('pressureEpa',true), gPressureSuccess=gameMetricScore('pressureSuccess',true);
    qbGameRecords.forEach((g,i)=>{
      const k=String(i);
      const rawRating=calibrateQbComposite(QB_V106.passEpaWeight*(gEpa[k]??50)+QB_V106.anyAWeight*(gAnya[k]??50)+QB_V106.passSuccessWeight*(gSuccess[k]??50)+QB_V106.rushingValueWeight*(gRush[k]??50)+QB_V106.cpoeWeight*(gCpoe[k]??50));
      const protectionAdj=Number.isFinite(Number(g.stdRate))?QB_V106.standardRushPressureWeight*QB_V106.protectionAdjustmentScale*((50-(gStd[k]??50))/50):0;
      const pr=g.pressurePlays/(g.pressurePlays+QB_V106.pressurePerformanceStabilizerPlays);
      const perfScore=50+pr*((QB_V106.pressureEpaWeight*(gPressureEpa[k]??50)+QB_V106.pressureSuccessWeight*(gPressureSuccess[k]??50))-50);
      const perfAdj=g.pressurePlays>0?QB_V106.pressurePerformanceWeight*QB_V106.protectionAdjustmentScale*((perfScore-50)/50):0;
      g.forceQbRating=clamp(rawRating+protectionAdj+perfAdj);
    });
    const V139_OPPONENT={stabilizerDropbacks:100,adjustmentScale:4.0};
    for (const t of ids) {
      const faced=qbGameRecords.filter((g)=>g.team===t);
      let num=0,den=0,rawNum=0,rawDen=0;
      for (const ownGame of faced) {
        const others=qbGameRecords.filter((g)=>g.opponent===ownGame.opponent && g.team!==t && Number.isFinite(Number(g.forceQbRating)));
        let dNum=0,dDen=0;
        for (const g of others) { dNum+=Number(g.forceQbRating)*g.dropbacks; dDen+=g.dropbacks; }
        const stabilizedAllowed=dDen>0?(dNum+50*V139_OPPONENT.stabilizerDropbacks)/(dDen+V139_OPPONENT.stabilizerDropbacks):50;
        const w=Math.max(1,ownGame.dropbacks);
        num+=stabilizedAllowed*w; den+=w;
        if (dDen>0) { rawNum+=(dNum/dDen)*w; rawDen+=w; }
      }
      const allowed=den>0?num/den:50;
      raw[t].qbOpponentAllowedRating=allowed;
      raw[t].qbOpponentAllowedRatingRaw=rawDen>0?rawNum/rawDen:null;
      raw[t].qbOpponentRatingAdjustment=V139_OPPONENT.adjustmentScale*((50-allowed)/50);
    }
    for (const t of ids) {
      const r=raw[t]||{}, a=Math.max(0,Number(r.qbAttemptPassAttempts)||0);
      const epaPlays=Math.max(0,Number(r.qbValuePlays)||0);
      const epaW=reliabilityWeight(epaPlays,QB_V106.epaStabilizerAttempts);
      const cpoeW=reliabilityWeight(a,QB_V106.cpoeStabilizerAttempts);
      const successW=reliabilityWeight(a,QB_V106.successStabilizerAttempts);
      r.qbEpaReliabilityWeight=epaW; r.qbCpoeReliabilityWeight=cpoeW; r.qbSuccessReliabilityWeight=successW;
      r.qbCurrentLeagueEpa=currentLeagueQbEpa; r.qbCurrentLeagueCpoe=currentLeagueQbCpoe; r.qbCurrentLeagueSuccess=currentLeagueQbSuccess;
      r.qbStabilizedEpa=stabilizeToward(r.qbEpaPerPlay,currentLeagueQbEpa,epaPlays,QB_V106.epaStabilizerAttempts);
      r.qbStabilizedAdjustedEpa=stabilizeToward(r.qbAdjustedEpa,currentLeaguePassEpa,a,QB_V106.epaStabilizerAttempts);
      r.qbStabilizedCpoe=stabilizeToward(r.qbCpoe,currentLeagueQbCpoe,a,QB_V106.cpoeStabilizerAttempts);
      r.qbStabilizedSuccess=stabilizeToward(r.qbPassSuccessRate,currentLeagueQbSuccess,a,QB_V106.successStabilizerAttempts);
      scoreQbEpaV106[t]=r.playerStatsUsable && r.qbEpaPerPlay!=null && Number.isFinite(Number(r.qbStabilizedEpa))
        ? (fullSeasonQbEpaBench.length>=20?continuousPercentileValue(fullSeasonQbEpaBench,r.qbStabilizedEpa,true):qbPassAbsoluteFallback(r.qbStabilizedEpa)) : null;
      scoreQbAdjustedEpaV131[t]=r.playerStatsUsable && Number.isFinite(Number(r.qbStabilizedAdjustedEpa))
        ? (fullSeasonQbEpaBench.length>=20?continuousPercentileValue(fullSeasonQbEpaBench,r.qbStabilizedAdjustedEpa,true):qbPassAbsoluteFallback(r.qbStabilizedAdjustedEpa)) : null;
      scoreQbCpoeV106[t]=r.playerStatsUsable && Number.isFinite(Number(r.qbStabilizedCpoe))
        ? clamp(50+50*Math.tanh((Number(r.qbStabilizedCpoe)-(Number.isFinite(Number(currentLeagueQbCpoe))?Number(currentLeagueQbCpoe):0))/QB_V106.cpoeSoftness)) : null;
      scoreQbSuccessV106[t]=r.playerStatsUsable && Number.isFinite(Number(r.qbStabilizedSuccess))
        ? (fullSeasonQbSuccessBench.length>=20?continuousPercentileValue(fullSeasonQbSuccessBench,r.qbStabilizedSuccess,true):clamp(50+50*Math.tanh((Number(r.qbStabilizedSuccess)-(Number.isFinite(Number(currentLeagueQbSuccess))?Number(currentLeagueQbSuccess):0.5))/0.08))) : null;
    }
    const priorRbOrthogonalValues=rbPolicy==='v115-partial-orthogonal' ? priorRbOrthogonalValuesV109 : Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite).filter(Number.isFinite);
    const scoreRb=rbPolicy==='v102-residual-receiving' ? percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.playerStatsUsable ? raw[t]?.rbCompositeOrthogonal : null])),true) : scoreRbLegacy;
    const scorePen=percentileMap(Object.fromEntries(ids.map(t=>[t,raw[t]?.teamStatsUsable ? raw[t]?.netPenYdsPerGame : null])),true);

    // V29 splits the old monolithic front grade into two first-class defensive
    // components. The 2025 snapshot does not contain explicit component indices,
    // so derive stable prior grades from its raw pressure- and run-stop-rate
    // distributions. That gives each live component its own 0-100 prior instead of
    // inheriting the old combined front grade.
    const priorPassRushByTeam = Object.fromEntries(ids.map((t)=>{
      if (priorPfrReady && Number.isFinite(priorPfrByTeam[t]?.compositeRate) && priorPfrCompositeValues.length >= 20) {
        return [t, continuousPercentileValue(priorPfrCompositeValues, priorPfrByTeam[t].compositeRate, true)];
      }
      const prior=priorProfiles[t]||{};
      const value=prior?.dl?.pressure_rate;
      return [t, priorPercentile(priorProfiles,(p)=>p?.dl?.pressure_rate,value,true)];
    }));
    const priorRunDefenseByTeam = Object.fromEntries(ids.map((t)=>{
      const prior=priorProfiles[t]||{};
      const value=prior?.dl?.run_stop_rate;
      return [t, priorPercentile(priorProfiles,(p)=>p?.dl?.run_stop_rate,value,true)];
    }));
    const priorRbByTeam = Object.fromEntries(ids.map((t)=>{
      const prior=priorProfiles[t]||{};
      if (rbPolicy==='v109-stabilized-residual'||rbPolicy==='v114-centered-stabilized-residual'||rbPolicy==='v115-partial-orthogonal') {
        const value=rbPolicy==='v115-partial-orthogonal' ? v115RbPriorComposite(prior) : priorRbOrthogonalComposite(prior);
        return [t, Number.isFinite(value)&&priorRbOrthogonalValues.length>=20 ? continuousPercentileValue(priorRbOrthogonalValues,value,true) : null];
      }
      const value=prior?.rb?.composite;
      return [t, priorPercentile(priorProfiles,(p)=>p?.rb?.composite,value,true)];
    }));

    const out={};
    for (const t of ids) {
      const prior=priorProfiles[t]||{}, r=raw[t]||{}, statGames=r.games||0, playerStatGames=r.playerGames||0, games=r.completedGames||0;
      const teamStatsFresh=Boolean(r.teamStatsFresh), playerStatsFresh=Boolean(r.playerStatsFresh);
      const teamStatsUsable=Boolean(r.teamStatsUsable), playerStatsUsable=Boolean(r.playerStatsUsable);
      const teamPriorGames=resolvedPriorGames(t, priorGames, priorGamesByTeam);
      const priorOffenseIndex=regressUnitIndex(prior.offenseIndex,unitPriorReversion);
      const priorOlIndex=regressUnitIndex(prior.olIndex,unitPriorReversion);
      const priorFrontIndex=regressUnitIndex(prior.frontIndex,unitPriorReversion);
      const priorCoverageIndex=regressUnitIndex(prior.coverageIndex,unitPriorReversion);
      const priorQbIndex=regressUnitIndex(prior.qbIndex,unitPriorReversion);
      const priorReceiverIndex=regressUnitIndex((receiverPolicy==='v109-stabilized-residual'||receiverPolicy==='v114-centered-stabilized-residual'||receiverPolicy==='v115-partial-orthogonal') && Number.isFinite(Number(priorReceiverByTeam[t])) ? priorReceiverByTeam[t] : prior.receiverIndex,unitPriorReversion);
      const priorRushIndex=regressUnitIndex(prior.rushIndex,unitPriorReversion);
      const priorPassRushIndex=regressUnitIndex(Number.isFinite(priorPassRushByTeam[t]) ? priorPassRushByTeam[t] : clamp(prior.frontIndex ?? 50),unitPriorReversion);
      const priorRunDefenseIndex=regressUnitIndex(Number.isFinite(priorRunDefenseByTeam[t]) ? priorRunDefenseByTeam[t] : clamp(prior.frontIndex ?? 50),unitPriorReversion);
      const priorRbIndex=regressUnitIndex(Number.isFinite(priorRbByTeam[t]) ? priorRbByTeam[t] : 50,unitPriorReversion);
      const priorPointsAllowedPerDriveIndex=50; // V100 has no 2025 drive prior yet; neutral until 2026 possessions exist.
      const priorPointsScoredPerDriveIndex=priorOffenseIndex;
      const preseasonUnitPrior={offenseIndex:priorOffenseIndex,pointsScoredPerDriveIndex:priorPointsScoredPerDriveIndex,olIndex:priorOlIndex,frontIndex:priorFrontIndex,coverageIndex:priorCoverageIndex,qbIndex:priorQbIndex,receiverIndex:priorReceiverIndex,rushIndex:priorRushIndex,passRushIndex:priorPassRushIndex,runDefenseIndex:priorRunDefenseIndex,pointsAllowedPerDriveIndex:priorPointsAllowedPerDriveIndex,rbIndex:priorRbIndex};
      preseasonUnitPrior._offenseCompositePolicy=(offenseOutcomePolicy==='v102-ppd')?'v102-orthogonal':'v101-legacy';
      preseasonUnitPrior.offenseCompositeRaw=rawOffenseCompositeFrom(preseasonUnitPrior,preseasonUnitPrior._offenseCompositePolicy);
      preseasonUnitPrior.offenseComposite=offenseCompositeFrom(preseasonUnitPrior,preseasonUnitPrior._offenseCompositePolicy);
      preseasonUnitPrior.defenseCompositeRaw=rawDefenseCompositeFrom(preseasonUnitPrior);
      preseasonUnitPrior.defenseIndex=defenseCompositeFrom(preseasonUnitPrior);
      const teamExternalReady=Boolean(useChartedPassRush && teamStatsFresh && r.externalPressure?.ready && r.externalPressure?.metric);
      const externalMetric=teamExternalReady ? r.externalPressure.metric : null;
      const explicitManual=Boolean(externalMetric?.provider==='manual-current');
      const teamFtnReady=Boolean(useChartedPassRush && teamStatsFresh && ftnContract.ready && r.ftnPassRush && Number.isFinite(r.ftnPassRush.pressureRate) && Number(r.ftnPassRush.games)>=games);
      const teamPfrReady=Boolean(useChartedPassRush && teamStatsFresh && currentPfrReady && pfrTeamChartingReady(r.chartedPassRush,r) && Number(r.chartedPassRush?.games)>=games);
      // V99 fallback: nflverse's weekly team feed is available before PFR's full
      // advanced charting and carries defensive QB hits, sacks, and opponent pass
      // plays. Those are distinct weekly-stat events in this model. Use them as a
      // current disruption measurement rather than dropping Pass Rush league-wide.
      const weeklyDropbacks=Number(r.oppPassPlays)||0;
      const weeklyHits=Math.max(0,Number(r.defQbHits)||0), weeklySacks=Math.max(0,Number(r.defSacks)||0);
      const weeklyHitRate=weeklyDropbacks>0 ? weeklyHits/weeklyDropbacks : null;
      const weeklySackRate=weeklyDropbacks>0 ? weeklySacks/weeklyDropbacks : null;
      const weeklyPressureRate=weeklyDropbacks>0 ? (weeklyHits+weeklySacks)/weeklyDropbacks : null;
      const preserveV98HistoricalPassRush=passRushFallbackPolicy==='v98-historical';
      const weeklyDisruptionReady=Boolean(!preserveV98HistoricalPassRush && useChartedPassRush && teamStatsUsable && weeklyDropbacks>0 && Number.isFinite(weeklyPressureRate));
      const weeklyDisruptionMetric=weeklyDisruptionReady ? {
        games:Math.max(1,Number(statGames)||Number(games)||1),dropbacks:weeklyDropbacks,
        pressures:weeklyHits+weeklySacks,hurries:null,hits:weeklyHits,sacks:weeklySacks,
        pressureRate:weeklyPressureRate,hitRate:weeklyHitRate,sackRate:weeklySackRate,
        compositeRate:passRushCompositeRate({pressureRate:weeklyPressureRate,hitRate:weeklyHitRate,sackRate:weeklySackRate}),
        provider:'nflverse-weekly-disruption',source:'nflverse stats_team_week: defensive QB hits + sacks / opponent dropbacks'
      } : null;
      // Provider order: intentional manual override, true play-level pressure,
      // fresh current aggregate, complete PFR charting, then the nflverse weekly
      // disruption fallback. The prior is held only if no current measurement exists.
      const selectedPassRush=explicitManual ? externalMetric : (teamFtnReady ? r.ftnPassRush : (teamExternalReady ? externalMetric : (teamPfrReady ? r.chartedPassRush : weeklyDisruptionMetric)));
      const passRushProvider=explicitManual ? 'manual-current' : (teamFtnReady ? 'ftn-play-level' : (teamExternalReady ? 'statrankings-current' : (teamPfrReady ? 'pfr-advanced' : (weeklyDisruptionReady ? 'nflverse-weekly-disruption' : (preserveV98HistoricalPassRush ? 'unavailable' : 'prior-held')))));
      if (!games) {
        const luck=liveLuck(t,schedule,gameHistory,performanceLuckGames) || prior.luck;
        const scoring=liveScoring(t,schedule,prior.scoring,teamPriorGames);
        const scheduleGames=schedule.filter((g)=>(g.home===t||g.away===t)&&g.homeScore!=null&&g.awayScore!=null).length;
        const defenseCompositeRaw=rawDefenseCompositeFrom({coverageIndex:prior.coverageIndex,passRushIndex:priorPassRushIndex,runDefenseIndex:priorRunDefenseIndex,pointsAllowedPerDriveIndex:priorPointsAllowedPerDriveIndex});
        const defenseIndex=defenseCompositeFrom({coverageIndex:prior.coverageIndex,passRushIndex:priorPassRushIndex,runDefenseIndex:priorRunDefenseIndex,pointsAllowedPerDriveIndex:priorPointsAllowedPerDriveIndex});
        const priorPr=priorPfrByTeam[t];
        const dl = priorPr ? {...(prior.dl||{}),pressure_rate:priorPr.pressureRate,hit_rate:priorPr.hitRate,sack_rate:priorPr.sackRate,pass_rush_composite_rate:priorPr.compositeRate,hurries:priorPr.hurries,qb_hits:priorPr.hits,sacks:priorPr.sacks,source:'V41 2025 PFR/Sportradar charted pressure prior'} : prior.dl;
        const preseasonOffenseCompositeRaw=rawOffenseCompositeFrom(preseasonUnitPrior);
        const preseasonOffenseComposite=offenseCompositeFrom(preseasonUnitPrior);
        out[t]={...prior,...preseasonUnitPrior,dl,defenseCompositeRaw,defenseIndex,offenseCompositeRaw:preseasonOffenseCompositeRaw,offenseComposite:preseasonOffenseComposite,_preseasonUnitPrior:preseasonUnitPrior,luck,scoring,_live:{games:0,statGames,passRushGames:0,passRushWeight:0,ftnPressureReady:ftnContract.ready,ftnPressureField:ftnContract.pressureField,ftnPressureReason:ftnContract.reason,pfrPressureReady:currentPfrReady,passRushProvider:'prior',passRushPressureReady:false,passRushDataState:'preseason-prior',scheduleGames,freshness:{latestCompletedWeek:r.latestCompletedWeek||0,completedGames:0,teamStats:{current:true,throughWeek:r.teamStatsThroughWeek||0,games:statGames},playerStats:{current:true,throughWeek:r.playerStatsThroughWeek||0},passRush:{current:false,provider:'prior',games:0},schedule:{current:true,throughWeek:r.latestCompletedWeek||0,games:0}},source:scheduleGames?'2026 results live; unit stats awaiting current feeds':'2025 component priors; awaiting 2026 stats'}};
        continue;
      }
      // Pass protection and pass rush are benchmarked against the stable 2025
      // league distribution, not only the current week's tiny cross-section.
      // The current-week percentile remains a fallback when prior raw metrics are
      // unavailable. This fixes the Week-1 pathology where a ~50% disruption game
      // could LOWER an already-elite front because run defense happened to rank low.
      const effectivePressureAllowedRate=(olPolicy==='v102-pass-protection' && Number.isFinite(Number(r.pbpPressureAllowedRate)))?Number(r.pbpPressureAllowedRate):r.pressureAllowedRate;
      const olHistoricalBench=historicalWindowValues(historicalReference,'ol_disruption_rate',r.offensiveDriveGames||statGames||1);
      const stableOlPass = teamStatsUsable ? (olPolicy==='v102-pass-protection' && olHistoricalBench.length>=100
        ? continuousPercentileValue(olHistoricalBench,effectivePressureAllowedRate,false)
        : priorPercentile(priorProfiles, (p)=>p?.ol?.pressure_rate_allowed, effectivePressureAllowedRate, false)) : null;
      const olPass = teamStatsUsable ? (Number.isFinite(stableOlPass) ? stableOlPass : scorePressureAllowed[t]) : null;
      const liveOl=teamStatsUsable && Number.isFinite(olPass) ? (olPolicy==='v102-pass-protection' ? olPass : (.70*olPass+.30*(scoreRush[t]??50))) : null;
      let frontPass=null, passRushGames=0;
      if (useChartedPassRush) {
        const prm=selectedPassRush;
        if (passRushProvider==='nflverse-weekly-disruption' && prm) {
          // The fallback lacks hurry charting, so do not compare its hit+sack proxy
          // with a PFR pressure distribution that includes hurries. Rank it against
          // the same current two-game (or current sample-size) disruption measure.
          frontPass=Number.isFinite(scoreFrontPressure[t]) ? scoreFrontPressure[t] : priorPassRushIndex;
          passRushGames=prm.games || statGames || games || 0;
        } else if (prm && priorPfrReady && Number.isFinite(prm.compositeRate)) {
          // True charted providers retain the sample-size-matched 2025 charted
          // pressure calibration used by V41-V98.
          const benchmark=rollingPassRushBenchmarks(priorPfrGamesByDefense, prm.games || 1);
          if (benchmark.length >= 20) {
            frontPass=continuousPercentileValue(benchmark,prm.compositeRate,true);
            passRushGames=prm.games || 0;
          }
        }
      } else {
        const stableFrontPass = priorPercentile(priorProfiles, (p)=>p?.dl?.pressure_rate, r.frontPressureRate, true);
        frontPass = Number.isFinite(stableFrontPass) ? stableFrontPass : scoreFrontPressure[t];
        passRushGames=games;
      }
      // Legacy frontIndex remains compatibility-only. When charted pressure is
      // available, let it drive the pass portion; otherwise preserve the older
      // disruption proxy there without leaking it into V41 passRushIndex.
      const legacyStableFrontPass = teamStatsUsable ? priorPercentile(priorProfiles, (p)=>p?.dl?.pressure_rate, r.frontPressureRate, true) : null;
      const legacyFrontPass = Number.isFinite(frontPass) ? frontPass : (Number.isFinite(legacyStableFrontPass) ? legacyStableFrontPass : scoreFrontPressure[t]);
      const liveFront=teamStatsUsable && Number.isFinite(legacyFrontPass) ? .90*legacyFrontPass+.10*(scoreRunDef[t]??50) : null;
      const liveCov=teamStatsUsable && Number.isFinite(scorePassDef[t]) ? .75*scorePassDef[t]+.25*(scoreCpoeDef[t]??50) : null;
      const activeQbPassScore=qbPolicy==='v106-current-season-stabilized'?scoreQbEpaV106[t]:(qbPolicy==='v104-historical-calibrated'?scoreQbEpaHistorical[t]:scoreQbEpaStable[t]);
      const canonicalQb=qbPolicy==='v106-current-season-stabilized';
      const qbInputReady=!canonicalQb || (qbEpaDefinition===QB_EPA_DEFINITION && qbReferenceValid(historicalReference) && Number(r.qbValuePlays)>0);
      const qbRushBonus=(qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated'||qbPolicy==='v106-current-season-stabilized') ? qbRushingBonus(r.qbRushEpaTotal,r.qbRushes) : 0;
      const qbRushingValueScore=clamp(50 + 50*(qbRushBonus/Math.max(1,QB_V106.rushingBonusCap)));
      const qbAnyAScore=Number.isFinite(Number(scoreQbAnyAV130[t]))?Number(scoreQbAnyAV130[t]):50;
      const qbOpponentRatingAdjustment=(qbPolicy==='v106-current-season-stabilized' && Number.isFinite(Number(r.qbOpponentRatingAdjustment))) ? Number(r.qbOpponentRatingAdjustment) : 0;
      // V137 pressure context. 75% measures protection difficulty using standard-rush
      // hit-or-sack disruption on <=4-rusher dropbacks. 25% measures how the QB performed
      // on disrupted dropbacks: 70% EPA/play and 30% Success Rate, shrunk toward league average
      // when the disrupted-dropback sample is small. Overall pressure rate is not part of this adjustment.
      const qbStandardRushPressureRate=Number.isFinite(Number(r.standardRushPressureRate))?Number(r.standardRushPressureRate):null;
      const qbStandardRushProtectionScore=Number.isFinite(Number(scoreStandardRushPressure[t]))?Number(scoreStandardRushPressure[t]):50;
      const protectionComponent=(score)=>QB_V106.protectionAdjustmentScale*((50-Number(score))/50);
      const performanceComponent=(score)=>QB_V106.protectionAdjustmentScale*((Number(score)-50)/50);
      const qbStandardRushPressureAdjustment=qbStandardRushPressureRate==null?0:QB_V106.standardRushPressureWeight*protectionComponent(qbStandardRushProtectionScore);
      const pressurePlays=Math.max(0,Number(r.pressurePlays)||0);
      const pressureReliability=pressurePlays/(pressurePlays+QB_V106.pressurePerformanceStabilizerPlays);
      const pressureEpaScore=Number.isFinite(Number(scorePressureEpa[t]))?Number(scorePressureEpa[t]):50;
      const pressureSuccessScore=Number.isFinite(Number(scorePressureSuccess[t]))?Number(scorePressureSuccess[t]):50;
      const pressurePerformanceScore=50+pressureReliability*((QB_V106.pressureEpaWeight*pressureEpaScore+QB_V106.pressureSuccessWeight*pressureSuccessScore)-50);
      const qbPressurePerformanceAdjustment=pressurePlays>0?QB_V106.pressurePerformanceWeight*performanceComponent(pressurePerformanceScore):0;
      const qbOlRatingAdjustment=qbStandardRushPressureAdjustment+qbPressurePerformanceAdjustment;
      const qbRawLiveScore=qbPolicy==='v106-current-season-stabilized' && Number.isFinite(activeQbPassScore)
        ? calibrateQbComposite(QB_V106.passEpaWeight*activeQbPassScore+QB_V106.anyAWeight*qbAnyAScore+QB_V106.passSuccessWeight*(scoreQbSuccessV106[t]??50)+QB_V106.rushingValueWeight*qbRushingValueScore+QB_V106.cpoeWeight*(scoreQbCpoeV106[t]??50)) : null;
      const qbPassCore=qbPolicy==='v106-current-season-stabilized'
        ? (Number.isFinite(qbRawLiveScore)?(qbRawLiveScore+qbOpponentRatingAdjustment+qbOlRatingAdjustment):null)
        : (((qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated') && Number.isFinite(activeQbPassScore)) ? (QB_V104.passEpaWeight*activeQbPassScore+QB_V104.cpoeWeight*(scoreQbCpoeStable[t]??50)) : null);
      const liveQb=qbInputReady && playerStatsUsable && (qbPolicy==='v106-current-season-stabilized' ? Number.isFinite(activeQbPassScore) : (Number.isFinite(scoreQbEpa[t])||Number.isFinite(activeQbPassScore))) ? ((qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated'||qbPolicy==='v106-current-season-stabilized') ? (qbPolicy==='v106-current-season-stabilized' ? clamp(qbPassCore??scoreQbEpa[t]) : clamp((qbPassCore??scoreQbEpa[t])+qbRushBonus)) : (qbPolicy==='v102-attempts-opponent-adjusted' ? (.65*scoreQbEpa[t]+.20*(scoreQbCpoe[t]??50)+.15*(scoreQbRush[t]??50)) : (.80*scoreQbEpa[t]+.20*(scoreQbCpoe[t]??50)))) : null;
      const offenseIndex=teamStatsUsable ? blend(priorOffenseIndex,scoreOff[t],statGames,teamPriorGames) : null;
      const offensiveDriveGames=Math.max(0,Number(r.offensiveDriveGames)||0);
      const livePointsScoredPerDriveIndex=Number.isFinite(scorePointsScoredPerDrive[t])?scorePointsScoredPerDrive[t]:null;
      const pointsScoredPerDriveIndex=(offenseOutcomePolicy==='v102-ppd' && livePointsScoredPerDriveIndex!=null) ? blend(priorPointsScoredPerDriveIndex,livePointsScoredPerDriveIndex,offensiveDriveGames,teamPriorGames) : priorPointsScoredPerDriveIndex;
      const olIndex=teamStatsUsable ? blend(priorOlIndex,liveOl,statGames,teamPriorGames) : null;
      // Legacy compatibility only: preserve the historical combined front grade for
      // consumers that still read it, but do not use it in the V29 defense formula.
      const frontIndex=teamStatsUsable ? blend(priorFrontIndex,liveFront,statGames,teamPriorGames) : null;
      const passRushIndex=(useChartedPassRush && games>0)
        ? ((selectedPassRush && Number.isFinite(frontPass) && passRushGames>0)
            ? blend(priorPassRushIndex,frontPass,passRushGames,teamPriorGames)
            : (preserveV98HistoricalPassRush ? null : priorPassRushIndex))
        : blend(priorPassRushIndex,frontPass,passRushGames,teamPriorGames);
      const passRushWeight=passRushGames>0 ? passRushGames/(passRushGames+teamPriorGames) : 0;
      const runDefenseIndex=teamStatsUsable ? blend(priorRunDefenseIndex,scoreRunDef[t],statGames,teamPriorGames) : null;
      const driveGames=Math.max(0,Number(r.defensiveDriveGames)||0);
      const livePointsAllowedPerDriveIndex=Number.isFinite(scorePointsPerDrive[t]) ? scorePointsPerDrive[t] : null;
      // Neutral one-game stabilizer: V100 intentionally avoids inventing a 2025 drive prior.
      // After two games this outcome grade is 2/3 live and 1/3 neutral.
      const pointsAllowedPerDriveIndex=livePointsAllowedPerDriveIndex!=null ? blend(priorPointsAllowedPerDriveIndex,livePointsAllowedPerDriveIndex,driveGames,1) : priorPointsAllowedPerDriveIndex;
      const coverageIndex=teamStatsUsable ? blend(priorCoverageIndex,liveCov,statGames,teamPriorGames) : null;
      // V104 keeps at least one equivalent preseason QB game through the first
      // four current games. V37 may still accelerate other units, but it can no
      // longer make two QB games worth 85% of the final grade.
      const qbPriorGames=(qbPolicy==='v104-historical-calibrated' && playerStatGames>0 && playerStatGames<=QB_V104.priorFloorThroughGames)
        ? Math.max(teamPriorGames,QB_V104.priorFloorGames) : teamPriorGames;
      // V106 deliberately does not strengthen the previous-season player/team prior.
      // Reliability is handled inside the 2026 evidence itself; continuity remains
      // only the existing regime-aware teamPriorGames anchor.
      const qbIndex=canonicalQb && (!qbInputReady || !Number.isFinite(liveQb)) ? NaN : (playerStatsUsable ? blend(priorQbIndex,liveQb,playerStatGames,qbPriorGames) : null);
      const receiverIndex=playerStatsUsable ? blend(priorReceiverIndex,scoreRecv[t],playerStatGames,teamPriorGames) : null;
      const rushIndex=teamStatsUsable ? blend(priorRushIndex,scoreRush[t],statGames,teamPriorGames) : null;
      const rbLiveRaw=rbResidualPolicyActive(rbPolicy)?r.rbCompositeOrthogonal:r.rbComposite;
      const stableRb=playerStatsUsable && Number.isFinite(rbLiveRaw) ? (
        (rbPolicy==='v109-stabilized-residual'||rbPolicy==='v114-centered-stabilized-residual'||rbPolicy==='v115-partial-orthogonal')
          ? scoreRbV109[t]
          : (rbPolicy==='v102-residual-receiving' && priorRbOrthogonalValues.length>=20
            ? continuousPercentileValue(priorRbOrthogonalValues,rbLiveRaw,true)
            : priorPercentile(priorProfiles,(p)=>p?.rb?.composite,rbLiveRaw,true))
      ) : null;
      const liveRb=playerStatsUsable ? (Number.isFinite(stableRb) ? stableRb : scoreRb[t]) : null;
      const rbIndex=playerStatsUsable ? blend(priorRbIndex,liveRb,playerStatGames,teamPriorGames) : null;
      const defenseCompositeRaw=rawDefenseCompositeFrom({coverageIndex,passRushIndex,runDefenseIndex,pointsAllowedPerDriveIndex});
      const defenseIndex=defenseCompositeFrom({coverageIndex,passRushIndex,runDefenseIndex,pointsAllowedPerDriveIndex});
      const offenseCompositePolicy=(offenseOutcomePolicy==='v102-ppd')?'v102-orthogonal':'v101-legacy';
      const offenseCompositeInput={offenseIndex,pointsScoredPerDriveIndex,qbIndex,receiverIndex,olIndex,rbIndex,_offenseCompositePolicy:offenseCompositePolicy};
      const offenseCompositeRaw=rawOffenseCompositeFrom(offenseCompositeInput,offenseCompositePolicy);
      const offenseComposite=offenseCompositeFrom(offenseCompositeInput,offenseCompositePolicy);
      const liveLuckObj=liveLuck(t,schedule,gameHistory,performanceLuckGames);
      const scoring=liveScoring(t,schedule,prior.scoring,teamPriorGames);
      const currentOffEpa=teamStatsUsable ? blend(prior.off_epa,r.offEpa,statGames,teamPriorGames) : null;
      const priorQb=prior.qb||{};
      const qbEpaDisplay=playerStatsUsable ? blend(priorQb.epa_per_play,((qbPolicy==='v102-attempts-opponent-adjusted'||qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated'||qbPolicy==='v106-current-season-stabilized')?r.qbAdjustedEpa:r.qbEpa),playerStatGames,teamPriorGames) : null;
      // The historical snapshot's `qb.cpoe` field is actually on a completion-
      // percentage-like 0–100 scale (roughly 60–68), while nflverse passing_cpoe
      // is true CPOE. Never blend unlike scales. Preserve the legacy value only
      // as provenance and use live CPOE once current-season games exist.
      const priorCompletionPct = Number.isFinite(Number(priorQb.cpoe)) && Math.abs(Number(priorQb.cpoe)) > 20 ? Number(priorQb.cpoe) : null;
      const qbCpoeDisplay=playerStatsUsable ? r.qbCpoe : null;
      const legacyPriorPen=prior.penalty||{};
      const hasPenaltyFeed = teamRows.length > 0 && teamRows.some((x) => Object.prototype.hasOwnProperty.call(x,'penalties') || Object.prototype.hasOwnProperty.call(x,'penalty_yards'));
      const pctx=penaltyContextByTeam?.[t] || {};
      const pctxGames=Math.max(0,Number(pctx.games)||0);
      const netFirstDowns=(Number(pctx.first_downs_for)||0)-(Number(pctx.first_downs_against)||0);
      const netTdsNegated=(Number(pctx.tds_negated_benefit)||0)-(Number(pctx.tds_negated_harm)||0);
      const netTurnoversNegated=(Number(pctx.turnovers_negated_benefit)||0)-(Number(pctx.turnovers_negated_harm)||0);
      const netDriveSaves=(Number(pctx.drive_saves_benefit)||0)-(Number(pctx.drive_saves_harm)||0);
      const netPenaltyEpa=Number(pctx.net_penalty_epa)||0;
      const netPenaltyWpa=Number(pctx.net_penalty_wpa)||0;
      const currentSeasonPenaltyBreakdown=pctxGames ? causalPenaltyScoreBreakdownFromAverages(
        netPenaltyEpa/pctxGames,netPenaltyWpa/pctxGames,netFirstDowns/pctxGames,netTdsNegated/pctxGames,penaltyCalibration||{}
      ) : null;
      const currentSeasonPenaltyImpact=currentSeasonPenaltyBreakdown?.score ?? null;
      const penalty=pctxGames ? {
        live:true, unavailable:false, source:'V97 canonical game-row aggregation + same-model nflfastR WPA + score-aware same-state nflfastR-derived EPA + scoring/special-teams counterfactuals + direct-value coherence guard + capped-z 40/25/20/15 scale (2026 only)',
        penaltyIndex:currentSeasonPenaltyImpact,
        penaltyImpactScore:currentSeasonPenaltyImpact,
        penaltyImpactMethod:'V97 current-season-only approved 40/25/20/15 blend; score-aware EPA includes realized scoring plus future EP; nullified scoring plays are explicit; direct EPA/WPA agreement cannot be reversed by structural context; each component is capped at ±3 before a softness-3 tanh transform',
        priorPenaltyImpactScore:null,
        currentSeasonPenaltyImpactScore:currentSeasonPenaltyImpact,
        penaltyImpactBreakdown:currentSeasonPenaltyBreakdown,
        net_pen_yards:r.netPenYds, net_pen_yards_per_game:r.netPenYdsPerGame,
        pen_count_for:r.oppDefPen, pen_count_against:r.ownDefPen,
        pen_yards_for:r.oppDefPenYds, pen_yards_against:r.ownDefPenYds,
        penalty_context_games:pctxGames,
        first_downs_via_penalty_for:Number(pctx.first_downs_for)||0,
        first_downs_via_penalty_against:Number(pctx.first_downs_against)||0,
        net_first_downs_via_penalty:netFirstDowns,
        tds_negated_benefit:Number(pctx.tds_negated_benefit)||0,
        tds_negated_harm:Number(pctx.tds_negated_harm)||0,
        net_tds_negated:netTdsNegated,
        turnovers_negated_benefit:Number(pctx.turnovers_negated_benefit)||0,
        turnovers_negated_harm:Number(pctx.turnovers_negated_harm)||0,
        net_turnovers_negated:netTurnoversNegated,
        drive_saves_benefit:Number(pctx.drive_saves_benefit)||0,
        drive_saves_harm:Number(pctx.drive_saves_harm)||0,
        net_drive_saves:netDriveSaves,
        net_penalty_epa:netPenaltyEpa,
        net_penalty_epa_per_game:pctxGames ? netPenaltyEpa/pctxGames : null,
        net_penalty_wpa:netPenaltyWpa,
        net_penalty_wpa_per_game:pctxGames ? netPenaltyWpa/pctxGames : null,
        prior_net_pen_epa:null, prior_pen_wp_swing:null, prior_penalty_method:null,
        penalty_calibration:penaltyCalibration||null,
        net_pen_epa:netPenaltyEpa, pen_wp_swing:netPenaltyWpa, decisive_games:null, corr:null
      } : games>0 ? {
        live:true, unavailable:true, source:'2026 team penalty totals available; V97 causal penalty context unavailable',
        penaltyIndex:null, penaltyImpactScore:null,
        penaltyImpactMethod:'live Penalty Impact requires V97 current-season accepted-penalty play-by-play context',
        priorPenaltyImpactScore:null, currentSeasonPenaltyImpactScore:null,
        net_pen_yards:r.netPenYds, net_pen_yards_per_game:r.netPenYdsPerGame,
        pen_count_for:r.oppDefPen, pen_count_against:r.ownDefPen,
        pen_yards_for:r.oppDefPenYds, pen_yards_against:r.ownDefPenYds,
        penalty_context_games:0,
        first_downs_via_penalty_for:null, first_downs_via_penalty_against:null, net_first_downs_via_penalty:null,
        tds_negated_benefit:null, tds_negated_harm:null, net_tds_negated:null,
        turnovers_negated_benefit:null,turnovers_negated_harm:null,net_turnovers_negated:null,
        drive_saves_benefit:null,drive_saves_harm:null,net_drive_saves:null,
        net_penalty_epa:null, net_penalty_epa_per_game:null, net_penalty_wpa:null, net_penalty_wpa_per_game:null,
        prior_net_pen_epa:null, prior_pen_wp_swing:null,
        net_pen_epa:null, pen_wp_swing:null, decisive_games:null, corr:null
      } : {
        live:false,unavailable:true,source:'No 2026 penalty sample yet',penaltyImpactScore:null,penaltyImpactMethod:'Penalty Impact is current-season only',
        priorPenaltyImpactScore:null,currentSeasonPenaltyImpactScore:null
      };
      out[t]={...prior,
        offenseIndex,pointsScoredPerDriveIndex,olIndex,frontIndex,passRushIndex,runDefenseIndex,coverageIndex,pointsAllowedPerDriveIndex,qbIndex,receiverIndex,rushIndex,rbIndex,defenseCompositeRaw,defenseIndex,offenseCompositeRaw,offenseComposite,_offenseCompositePolicy:offenseCompositePolicy,_preseasonUnitPrior:preseasonUnitPrior,
        defensivePointsAllowed:Number.isFinite(r.defensivePointsAllowed)?r.defensivePointsAllowed:null,opponentDrives:Number.isFinite(r.opponentDrives)?r.opponentDrives:null,defensivePointsPerDrive:Number.isFinite(r.defensivePointsPerDrive)?r.defensivePointsPerDrive:null,
        off_epa:currentOffEpa,
        qb:{...priorQb,qb:r.qbName,primary_qb_dropbacks:r.qbPrimaryDropbacks,qb_room_dropbacks:r.qbRoomDropbacks,primary_qb_dropback_share:r.qbPrimaryDropbackShare,epa_per_play:qbEpaDisplay,cpoe:qbCpoeDisplay,prior_completion_pct:priorCompletionPct,games,live_epa_per_play:r.qbEpa,actual_pass_epa_per_attempt:r.qbAttemptEpa,epa_per_qb_play:r.qbEpaPerPlay,qb_value_plays:r.qbValuePlays,qb_total_epa:r.qbTotalEpa,opponent_adjusted_epa_per_attempt:r.qbAdjustedEpa,opponent_coverage_index:r.qbOpponentCoverageIndex,opponent_epa_adjustment:r.qbOpponentEpaAdjustment,rush_epa_per_attempt:r.qbRushEpa,rush_epa_total:r.qbRushEpaTotal,rush_attempts:r.qbRushes,rush_source:r.qbRushSource,live_cpoe:r.qbCpoe,pass_epa_score:qbPolicy==='v106-current-season-stabilized'?activeQbPassScore:(Number.isFinite(activeQbPassScore)?activeQbPassScore:scoreQbEpa[t]),pass_epa_benchmark_games:(qbPolicy==='v106-current-season-stabilized'?17:playerStatGames),pass_epa_benchmark_count:(qbPolicy==='v106-current-season-stabilized'?historicalWindowValues(historicalReference,'qb_epa_per_play',17).length:historicalWindowValues(historicalReference,'qb_pass_epa',playerStatGames||1).length),pass_epa_benchmark_source:(qbPolicy==='v106-current-season-stabilized'?'historical-full-season-scale':(historicalWindowValues(historicalReference,'qb_pass_epa',playerStatGames||1).length>=100?'historical-window':'absolute-emergency-fallback')),cpoe_score:(qbPolicy==='v106-current-season-stabilized'?scoreQbCpoeV106[t]:((qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated')?scoreQbCpoeStable[t]:scoreQbCpoe[t])),cpoe_attempts:r.qbAttemptPassAttempts,effective_cpoe:(qbPolicy==='v106-current-season-stabilized'?r.qbStabilizedCpoe:((Number.isFinite(Number(r.qbCpoe))&&Number(r.qbAttemptPassAttempts)>0)?Number(r.qbCpoe)*(Number(r.qbAttemptPassAttempts)/(Number(r.qbAttemptPassAttempts)+QB_V104.cpoeShrinkAttempts)):null)),pass_success_rate:r.qbPassSuccessRate,stabilized_pass_success_rate:r.qbStabilizedSuccess,pass_success_score:scoreQbSuccessV106[t],stabilized_qb_epa_per_play:r.qbStabilizedEpa,stabilized_pass_epa:stabilizeToward(r.qbAttemptEpa,currentLeaguePassEpa,r.qbAttemptPassAttempts,QB_V106.epaStabilizerAttempts),stabilized_cpoe:r.qbStabilizedCpoe,current_league_qb_epa_per_play:r.qbCurrentLeagueEpa,current_league_pass_epa:currentLeaguePassEpa,current_league_cpoe:r.qbCurrentLeagueCpoe,current_league_pass_success_rate:r.qbCurrentLeagueSuccess,epa_reliability_weight:r.qbEpaReliabilityWeight,cpoe_reliability_weight:r.qbCpoeReliabilityWeight,success_reliability_weight:r.qbSuccessReliabilityWeight,pass_core_score:qbPassCore,opponent_rating_adjustment:qbOpponentRatingAdjustment,opponent_force_qb_rating_allowed:r.qbOpponentAllowedRating,opponent_force_qb_rating_allowed_raw:r.qbOpponentAllowedRatingRaw,opponent_adjustment_method:'leave-one-matchup-out-force-qb-rating-allowed',ol_rating_adjustment:qbOlRatingAdjustment,standard_rush_pressure_adjustment:qbStandardRushPressureAdjustment,pressure_performance_adjustment:qbPressurePerformanceAdjustment,standard_rush_pressure_rate:qbStandardRushPressureRate,pressure_epa_per_play:r.pressureEpaPerPlay,pressure_success_rate:r.pressureSuccessRate,clean_epa_per_play:r.cleanEpaPerPlay,pressure_epa_drop:r.pressureEpaDrop,any_a:r.qbAnyA,any_a_score:qbAnyAScore,rushing_value_score:qbRushingValueScore,rush_bonus:qbRushBonus,raw_live_qb_score:qbRawLiveScore,live_qb_score:liveQb,prior_games_used:qbPriorGames,source:qbPolicy==='v106-current-season-stabilized'?'V139 FORCE QB Rating: 30% EPA/play (passes, sacks and meaningful QB rushes counted once; kneels/spikes excluded) + 30% ANY/A + 20% Success Rate + 10% additional QB rushing value + 10% CPOE, followed by a leave-one-matchup-out opponent adjustment based on FORCE QB Rating allowed by the defenses faced, plus the pressure-context adjustment. Pressure Adjustment is 75% standard-rush protection difficulty and 25% performance under pressure; the performance component is 70% EPA/play and 30% Success Rate with small-sample shrinkage. Overall pressure rate is excluded. Pressure-vs-clean EPA remains visible diagnostically. The displayed QB unit retains the existing early-season continuity prior.':(qbPolicy==='v104-historical-calibrated'?'V105 75% same-sized historical-window opponent-adjusted sack-free pass-EPA score + 25% attempt-shrunk CPOE, plus positive-only volume-shrunk QB rushing bonus; minimum one-game QB prior through four games':(qbPolicy==='v103-stable-pass-rush-bonus'?'V103 75% stable opponent-adjusted sack-free pass-EPA score + 25% CPOE, plus positive-only volume-shrunk QB rushing bonus (PBP kneels excluded when available)':(qbPolicy==='v102-attempts-opponent-adjusted'?'V102 sack-free actual-pass EPA + CPOE, opponent-adjusted by Coverage strength':'legacy QB EPA + CPOE')))},
        ol:teamStatsUsable ? {...(prior.ol||{}),sack_rate_allowed:r.sackAllowed,pressure_rate_allowed:effectivePressureAllowedRate,pbp_dropbacks:r.pbpPassProtectionDropbacks,pbp_disrupted_dropbacks:r.pbpPassProtectionDisruptions,qb_hits_allowed:r.oppDefQbHits,sacks_allowed:r.oppDefSacks,source:olPolicy==='v102-pass-protection'?'V104 pass-protection only: de-duplicated PBP hit-or-sack disruptions per dropback, calibrated to same-sized rolling 2025 PBP windows; team rushing EPA removed to avoid RB/OL overlap':'V46 current team-stat feed: QB-hit+sack disruption benchmarked to 2025 league distribution + rushing EPA; blended with 2025 prior'} : {source:'V46 current offensive-line data unavailable; stale live value suppressed'},
        dl:(()=>{
          const prm=selectedPassRush;
          if (useChartedPassRush && prm && passRushGames>0) {
            const providerText=passRushProvider==='manual-current' ? `V46 curated current-pressure override (${prm.source||'manual'})`
              : passRushProvider==='ftn-play-level' ? 'V46 FTN play-level true-pressure feed'
              : passRushProvider==='statrankings-current' ? 'V46 fresh StatRankings current-season pressure'
              : passRushProvider==='pfr-advanced' ? 'V46 complete team-verified PFR/Sportradar pressure fallback'
              : 'V99 nflverse weekly QB-hit+sack disruption fallback';
            const calibrationText=passRushProvider==='nflverse-weekly-disruption'
              ? 'ranked against the same current sample-size disruption field, then blended with the regressed 2025 prior'
              : 'calibrated against same-sized 2025 rolling charted-pressure samples';
            return {...(prior.dl||{}),pressure_rate:prm.pressureRate,hit_rate:prm.hitRate,sack_rate:prm.sackRate,pass_rush_composite_rate:prm.compositeRate,pressures:prm.pressures,hurries:prm.hurries,qb_hits:prm.hits,sacks:prm.sacks,charted_dropbacks:prm.dropbacks,pressure_provider:passRushProvider,pressure_as_of:prm.asOf||null,pressure_source_url:prm.sourceUrl||null,run_epa_allowed:r.oppRushEpa,source:`${providerText} + 0.20 hit bonus + 0.60 sack bonus; ${calibrationText}`};
          }
          if (useChartedPassRush && games>0) return {...(prior.dl||{}),pressure_rate:null,hit_rate:null,sack_rate:r.frontSackRate,pass_rush_composite_rate:null,pressures:null,hurries:null,qb_hits:r.defQbHits,sacks:r.defSacks,pressure_provider:(preserveV98HistoricalPassRush?'unavailable':'prior-held'),run_epa_allowed:r.oppRushEpa,source:preserveV98HistoricalPassRush ? `V98 historical baseline: current pressure unavailable (${r.externalPressure?.reason||'no fresh current source'}); stale Pass Rush prior suppressed` : `V99 current pressure unavailable (${r.externalPressure?.reason||'no fresh current source'}); explicit 2025 Pass Rush prior held rather than zeroed`};
          const priorPr=priorPfrByTeam[t];
          if (useChartedPassRush && priorPr) return {...(prior.dl||{}),pressure_rate:priorPr.pressureRate,hit_rate:priorPr.hitRate,sack_rate:priorPr.sackRate,pass_rush_composite_rate:priorPr.compositeRate,pressures:priorPr.pressures,hurries:priorPr.hurries,qb_hits:priorPr.hits,sacks:priorPr.sacks,pressure_provider:'prior',run_epa_allowed:r.oppRushEpa,source:'V46 preseason: 2025 charted pass-rush prior'};
          // Legacy/non-charted callers (historical regression and internal raw transforms)
          // retain the old hit+sack disruption proxy under the legacy field. The live app
          // always calls buildProfiles with useChartedPassRush=true, so this value can never
          // masquerade as a fresh current pressure rate in user-facing V44 output.
          return {...(prior.dl||{}),pressure_rate:r.frontPressureRate,sack_rate:r.frontSackRate,qb_hits:r.defQbHits,sacks:r.defSacks,run_epa_allowed:r.oppRushEpa,source:'V46 legacy non-charted disruption proxy; not eligible for live Pass Rush display'};
        })(),
        cov:teamStatsUsable ? {...(prior.cov||{}),press_adj_epa:r.oppPassEpa,epa_allowed:r.oppPassEpa,cpoe_allowed:r.oppCpoe,coverage_pass_attempts:r.coveragePassAttempts,aggregate_dropback_epa:r.oppPassEpaAggregate,coverage_epa_scope:(r.coveragePolicy==='v100-historical'?'V100 historical aggregate passing EPA per dropback including sacks':'V101 actual pass-attempt EPA; sacks/spikes excluded'),source:(r.coveragePolicy==='v100-historical'?'V100 historical coverage reconstruction':'V101 actual-pass coverage EPA + CPOE blended with 2025 prior; sacks owned exclusively by Pass Rush')} : {source:'V101 current coverage data unavailable; stale live value suppressed'},
        receivers:playerStatsUsable ? {...(prior.receivers||{}),adj_epa:r.recvEpa,residual_epa:r.receiverResidualEpa,targets:r.receiverRoomTargets,orthogonal_beta:r.receiverOrthogonalBeta,environment_center:r.receiverEnvironmentCenter,expected_environment_contribution:r.receiverExpectedEnvironmentContribution,stabilized_residual_epa:r.receiverStabilizedResidual,calibrated_residual_epa:r.receiverCalibratedResidual,current_league_residual_epa:r.receiverCurrentLeagueResidual,historical_residual_median:r.receiverHistoricalResidualMedian,reliability_weight:r.receiverReliabilityWeight,live_score:scoreRecv[t],leaders:r.recLeaders,source:receiverPolicy==='v115-partial-orthogonal'?'V115 WR/TE-only receiving EPA/target with a league-wide historically fitted, ridge-shrunk QB-environment subtraction; target-stabilized and environment-aligned to the matching full-season historical scale':(receiverPolicy==='v114-centered-stabilized-residual'?'V114 WR/TE residual EPA/target stabilized toward the live 2026 league environment, environment-aligned so the current league center maps to the historical 50-quality center, then mapped to the full-season 2025 residual scale':(receiverPolicy==='v109-stabilized-residual'?'V109 WR/TE residual EPA/target stabilized toward the live 2026 league environment by WR/TE targets, then mapped to the full-season 2025 residual scale':(receiverPolicy==='v102-residual'?'V102 receiving EPA/target residual versus team sack-free actual-pass EPA':'V46 current receiving EPA/target')))} : {source:'V46 current receiving data unavailable; stale live value suppressed'},
        rb:playerStatsUsable && r.rb ? {name:r.rb.name,rush_epa:safeDiv(r.rb.rush_epa,r.rb.carries),adj_rush:safeDiv(r.rb.rush_epa,r.rb.carries),adj_recv:safeDiv(r.rb.receiving_epa,r.rb.targets),rush_att:r.rb.carries,targets:r.rb.targets,games,room_rush_epa:r.rbRushEpa,room_recv_epa:r.rbRecvEpa,room_recv_residual_epa:r.rbRecvResidualEpa,recv_orthogonal_beta:r.rbRecvOrthogonalBeta,recv_expected_environment_contribution:r.rbRecvExpectedEnvironmentContribution,room_composite:(rbResidualPolicyActive(rbPolicy)?r.rbCompositeOrthogonal:r.rbComposite),room_carries:r.rbCarries,room_targets:r.rbTargets,stabilized_rush_epa:r.rbStabilizedRushEpa,stabilized_recv_residual_epa:r.rbStabilizedRecvResidualEpa,stabilized_composite:r.rbStabilizedComposite,calibrated_composite:r.rbCalibratedComposite,current_league_rush_epa:r.rbCurrentLeagueRush,current_league_recv_residual_epa:r.rbCurrentLeagueRecvResidual,current_league_composite_center:r.rbCurrentLeagueCompositeCenter,historical_composite_median:r.rbHistoricalCompositeMedian,rush_reliability_weight:r.rbRushReliabilityWeight,recv_reliability_weight:r.rbRecvReliabilityWeight,live_score:liveRb,source:rbPolicy==='v115-partial-orthogonal'?'V115 RB/FB room: rushing EPA/carry stays directly credited; receiving EPA/target removes only a historically fitted ridge-shrunk QB-environment component; both signals receive opportunity-based stabilization, then 70/30 combination and environment-aligned full-season calibration':(rbPolicy==='v114-centered-stabilized-residual'?'V114 RB/FB room: rushing EPA/carry and receiving residual EPA/target separately stabilized toward live 2026 league means, combined 70/30, environment-aligned so the current league center maps to the historical 50-quality center, then mapped to the full-season 2025 orthogonal scale':(rbPolicy==='v109-stabilized-residual'?'V109 RB/FB room: rushing EPA/carry and receiving residual EPA/target separately stabilized toward live 2026 league means by carries/targets, then combined 70/30 and mapped to the full-season 2025 orthogonal scale':(rbPolicy==='v102-residual-receiving'?'V104 RB/FB room: 70% rushing EPA/att + 30% receiving EPA residual versus team sack-free passing baseline, scored against a like-for-like 2025 residual benchmark':'V57 RB/FB room: 70% rushing EPA/att + 30% receiving EPA/target')))} : (games>0 ? null : prior.rb),
        luck:{...(liveLuckObj || prior.luck || {}),penalty_impact_score:currentSeasonPenaltyImpact,luck_method:'V121 overall Luck = 60% EPA/play-implied scoring realization + 20% Penalty Impact + 15% event-adjusted fumble recovery + 5% standardized outcome surprise. EPA scoring realization compares actual point differential to the league-wide historical point differential implied by net EPA/play. Record surprise is intentionally secondary.'},
        penalty,scoring,
        _live:{games,statGames,playerStatGames,priorGames:teamPriorGames,qbPriorGames,basePriorGames:priorGames,weight:statGames/(statGames+teamPriorGames),passRushGames,passRushWeight,ftnPressureReady:ftnContract.ready,ftnPressureField:ftnContract.pressureField,ftnPressureReason:ftnContract.reason,ftnChartingRows:ftnContract.rowCount,pfrPressureReady:currentPfrReady,currentPressureReady:Boolean(r.externalPressure?.ready),currentPressureReason:r.externalPressure?.reason||null,passRushProvider,passRushPressureReady:Boolean(selectedPassRush && passRushGames>0),passRushDataState:(selectedPassRush&&passRushGames>0)?'live-current':(preserveV98HistoricalPassRush?'unavailable-current':'prior-held'),defensePassRushExcluded:!(passRushIndex!=null && passRushIndex!=='' && Number.isFinite(Number(passRushIndex))),priorPfrPressureReady:priorPfrReady,priorAccelerated:teamPriorGames < Number(priorGames)-1e-9,source:`V83 partial-week contract; ${(!teamStatsFresh||!playerStatsFresh)?'last-known-good core rows retained while newest team week is pending; ':''}${passRushProvider==='manual-current'?'curated current override active':passRushProvider==='ftn-play-level'?'FTN play-level pressure active':passRushProvider==='statrankings-current'?'fresh StatRankings pressure active':passRushProvider==='pfr-advanced'?'complete PFR pressure fallback active':passRushProvider==='nflverse-weekly-disruption'?'nflverse weekly disruption fallback active':passRushProvider==='unavailable'?'V98 historical baseline: current pressure unavailable; stale prior suppressed':'current pressure unavailable; prior explicitly held'}`,freshness:{latestCompletedWeek:r.latestCompletedWeek||0,completedGames:r.completedGames||games,teamStats:{current:teamStatsFresh,usable:teamStatsUsable,pending:teamStatsUsable&&!teamStatsFresh,throughWeek:r.teamStatsThroughWeek||0,games:statGames},playerStats:{current:playerStatsFresh,usable:playerStatsUsable,pending:playerStatsUsable&&!playerStatsFresh,throughWeek:r.playerStatsThroughWeek||0},passRush:{current:Boolean(selectedPassRush&&passRushGames>0),provider:passRushProvider,games:passRushGames},schedule:{current:true,throughWeek:r.latestCompletedWeek||0,games}},offEpa:teamStatsUsable?r.offEpa:null,passEpa:teamStatsUsable?r.passEpa:null,pointsScoredPerDrive:Number.isFinite(r.offensivePointsPerDrive)?r.offensivePointsPerDrive:null,pointsScoredPerDriveIndex,qbEpa:playerStatsUsable?r.qbEpa:null,qbAttemptEpa:playerStatsUsable?r.qbAttemptEpa:null,qbAdjustedEpa:playerStatsUsable?r.qbAdjustedEpa:null,qbOpponentCoverageIndex:playerStatsUsable?r.qbOpponentCoverageIndex:null,qbOpponentEpaAdjustment:playerStatsUsable?r.qbOpponentEpaAdjustment:null,qbCpoe:playerStatsUsable?r.qbCpoe:null,qbPassEpaScore:playerStatsUsable?(Number.isFinite(activeQbPassScore)?activeQbPassScore:scoreQbEpa[t]):null,qbPassBenchmarkCount:playerStatsUsable?(qbPolicy==='v106-current-season-stabilized'?historicalWindowValues(historicalReference,'qb_epa_per_play',17).length:historicalWindowValues(historicalReference,'qb_pass_epa',playerStatGames||1).length):0,qbPassBenchmarkSource:playerStatsUsable?(qbPolicy==='v106-current-season-stabilized'?'historical-full-season-scale':(historicalWindowValues(historicalReference,'qb_pass_epa',playerStatGames||1).length>=100?'historical-window':'absolute-emergency-fallback')):null,qbCpoeScore:playerStatsUsable?(qbPolicy==='v106-current-season-stabilized'?scoreQbCpoeV106[t]:((qbPolicy==='v103-stable-pass-rush-bonus'||qbPolicy==='v104-historical-calibrated')?scoreQbCpoeStable[t]:scoreQbCpoe[t])):null,qbPassCore:playerStatsUsable?qbPassCore:null,qbPassSuccessRate:playerStatsUsable?r.qbPassSuccessRate:null,qbPassSuccessScore:playerStatsUsable?scoreQbSuccessV106[t]:null,qbStabilizedEpa:playerStatsUsable?r.qbStabilizedEpa:null,qbStabilizedCpoe:playerStatsUsable?r.qbStabilizedCpoe:null,qbStabilizedSuccess:playerStatsUsable?r.qbStabilizedSuccess:null,qbRushBonus:playerStatsUsable?qbRushBonus:null,qbLiveScore:playerStatsUsable?liveQb:null,qbRushEpa:playerStatsUsable?r.qbRushEpa:null,qbRushEpaTotal:playerStatsUsable?r.qbRushEpaTotal:null,qbRushAttempts:playerStatsUsable?r.qbRushes:null,qbRushSource:playerStatsUsable?r.qbRushSource:null,rushEpa:teamStatsUsable?r.rushEpa:null,recvEpa:playerStatsUsable?r.recvEpa:null,receiverResidualEpa:playerStatsUsable?r.receiverResidualEpa:null,receiverOrthogonalBeta:playerStatsUsable?r.receiverOrthogonalBeta:null,receiverExpectedEnvironmentContribution:playerStatsUsable?r.receiverExpectedEnvironmentContribution:null,receiverStabilizedResidualEpa:playerStatsUsable?r.receiverStabilizedResidual:null,receiverCalibratedResidualEpa:playerStatsUsable?r.receiverCalibratedResidual:null,receiverHistoricalResidualMedian:playerStatsUsable?r.receiverHistoricalResidualMedian:null,receiverTargets:playerStatsUsable?r.receiverRoomTargets:null,receiverReliabilityWeight:playerStatsUsable?r.receiverReliabilityWeight:null,rbRecvOrthogonalBeta:playerStatsUsable?r.rbRecvOrthogonalBeta:null,rbRecvExpectedEnvironmentContribution:playerStatsUsable?r.rbRecvExpectedEnvironmentContribution:null,rbStabilizedComposite:playerStatsUsable?r.rbStabilizedComposite:null,rbCalibratedComposite:playerStatsUsable?r.rbCalibratedComposite:null,rbHistoricalCompositeMedian:playerStatsUsable?r.rbHistoricalCompositeMedian:null,rbCurrentLeagueCompositeCenter:playerStatsUsable?r.rbCurrentLeagueCompositeCenter:null,rbRushReliabilityWeight:playerStatsUsable?r.rbRushReliabilityWeight:null,rbRecvReliabilityWeight:playerStatsUsable?r.rbRecvReliabilityWeight:null,qbPolicy,receiverPolicy,olPolicy,offenseOutcomePolicy,rbPolicy,rbComposite:playerStatsUsable?r.rbComposite:null,sackAllowed:teamStatsUsable?r.sackAllowed:null,pressureAllowedRate:teamStatsUsable?effectivePressureAllowedRate:null,pbpPassProtectionDropbacks:r.pbpPassProtectionDropbacks,pbpPassProtectionDisruptions:r.pbpPassProtectionDisruptions,frontPressureRate:(useChartedPassRush ? (selectedPassRush?.pressureRate ?? null) : (teamStatsUsable?r.frontPressureRate:null)),frontDisruptionRate:teamStatsUsable?r.frontPressureRate:null,frontSackRate:(selectedPassRush?.sackRate ?? (teamStatsUsable?r.frontSackRate:null)),passRushCompositeRate:(selectedPassRush?.compositeRate ?? null),runEpaAllowed:teamStatsUsable?r.oppRushEpa:null,passEpaAllowed:teamStatsUsable?r.oppPassEpa:null,coveragePassAttempts:teamStatsUsable?r.coveragePassAttempts:null,coverageAggregateDropbackEpa:teamStatsUsable?r.oppPassEpaAggregate:null,coveragePolicy:r.coveragePolicy||coveragePolicy,cpoeAllowed:teamStatsUsable?r.oppCpoe:null,pointsAllowedPerDrive:Number.isFinite(r.defensivePointsPerDrive)?r.defensivePointsPerDrive:null,pointsAllowedPerDriveIndex,opponentDrives:Number.isFinite(r.opponentDrives)?r.opponentDrives:null,penaltyYardsNet:teamStatsUsable?r.netPenYdsPerGame:null}
      };
      if (canonicalQb) {
        const ready=qbInputReady && Number.isFinite(qbIndex);
        out[t].qb.unavailable=!ready;
        out[t].qb.data_state=ready?'live-current':'unavailable-current';
        out[t]._live.qbDataState=out[t].qb.data_state;
        out[t]._live.freshness.qb={current:ready,usable:ready,definition:qbEpaDefinition};
        if (!ready) {
          out[t].qb.unavailable_reason='Current all-play QB evidence or its historical reference is unavailable';
          out[t].qb.epa_per_qb_play=NaN;
          out[t].qb.pass_epa_score=NaN;
          out[t].qb.live_qb_score=NaN;
          out[t].qb.raw_live_qb_score=NaN;
        }
      }
    }
    return out;
  }

  window.FORCE_LIVE_PROFILE={qbSackYardsLost,qbReferenceValid,gameFlowQbStatus,buildProfiles,calibrateQbComposite,QB_COMPOSITE_EXPANSION,percentileMap,percentileValue,continuousPercentileValue,priorPercentile,medianValue,shiftedPriorPercentile,historicalWindowValues,qbPassAbsoluteFallback,priorReceiverWrteEpa,priorQbPassEpa,ridgeOrthogonalSlope,partialResidual,priorReceiverResidual,priorRbOrthogonalComposite,qbCpoeScore,qbRushingBonus,QB_V103,QB_V104,QB_V106,UNIT_V109,UNIT_V114,UNIT_V115,receiverResidualPolicyActive,rbResidualPolicyActive,environmentAlignToHistoricalCenter,reliabilityWeight,stabilizeToward,weightedLeagueMean,resolvedPriorGames,blend,regressUnitIndex,centeredContextScore,historicalPenaltyImpactScore,livePenaltyImpactScore,causalPenaltyScoreFromAverages,causalPenaltyScoreBreakdownFromAverages,penaltyCalibration,CONTEXT_SCALE,availableComposite,calibrateComposite,uncalibrateComposite,rawOffenseCompositeFrom,offenseCompositeFrom,rawDefenseCompositeFrom,defenseCompositeFrom,COMPOSITE_V108,applyQbCarryoverScenario,liveLuck,pctRate,passRushCompositeRate,ftnPressureField,ftnDefenseField,ftnDropbackField,ftnPressureContract,ftnDefensePressureGames,combineFtnPressureGames,dateOnlyMs,latestCompletedTeamDate,externalPressureMetric,pfrChartingReady,pfrTeamChartingReady,aggregatePfrRows,pfrDefenseGames,combinePassRushGames,rollingPassRushBenchmarks,PASS_RUSH_WEIGHTS,OFFENSE_WEIGHTS:OFFENSE_WEIGHTS_V102,OFFENSE_WEIGHTS_V101,OFFENSE_WEIGHTS_V102,DEFENSE_WEIGHTS};
})();
