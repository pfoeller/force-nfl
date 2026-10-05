# MD-07 exact current unit architecture

Research only, base `fd585891214db483112f52d4746106c606afeb43`, one frozen 2026 Week-4 snapshot. This is a reconstruction, not a proposed replacement. [Findings and reproducibility](README.md).

## Entry points and sources

[assets/app.js](../../../assets/app.js) `liveProfiles()` invokes [model/live_profiles.js](../../../model/live_profiles.js) `buildProfiles()` with current schedule, nflverse team/player weekly rows, game-flow PBP summaries, current pressure, FTN/PFR inputs, prior PFR rows and `MATCHUP_DATA.profiles`. Policies are `v106-current-season-stabilized` QB, `v115-partial-orthogonal` WR/RB, `v102-pass-protection` OL, `v101-attempts` coverage and `v102-ppd` offense outcome. The app then adds the V140/V148 QB recency component and recomputes composites. Automatic QB-return correction is retired; the frozen state is canonical, with no manual scenario.

[force_server.py](../../../force_server.py) supplies current game-flow and historical calibration summaries. PBP normal-dropback predicates de-duplicate hit OR sack, exclude no-play and spikes; actual pass attempts used for coverage exclude sacks. Meaningful QB runs exclude kneels and are unioned with dropbacks, counting scrambles once. The qualifying-drive denominator counts a possession with a normal-down non-kneel snap or field-goal attempt. It is not a blanket garbage-time or short-possession filter. Offensive scoring excludes return TDs/safeties; kneel-only drives are excluded and overtime is included. No new MD-10 definition is selected here.

The immutable input records exact source hashes, provider/data-state labels, opportunity counts, raw intermediate signals, live mapped grades, effective priors, current grades and core/current ratings. Its anonymous historical quartiles describe the calibration references; no raw provider rows are redistributed. Free official-team facts corroborate selected cases separately. Those facts are not a new production provider.

## Shared transformations

- **Current-league rank:** `percentileMap` sorts finite production-coerced values, assigns midrank ties, and uses `100 * rank/(n-1)`, reversed for lower-is-better; one observation maps to 50. Research requires genuinely finite raw numbers in this complete snapshot and does not substitute zero for missingness.
- **Historical continuous map:** `continuousPercentileValue` interpolates empirical midpoints `100*(i+.5)/n`; outer observations map to `50/n` and `100-50/n`, reversed when appropriate. No unit-score threshold is changed.
- **Reliability:** `stabilizeToward(x,mu,N,K) = mu + N/(N+K)*(x-mu)`. `environmentAlignToHistoricalCenter(x,c,h) = h + x-c`.
- **Effective prior:** `regressUnitIndex(p,r) = 50+(p-50)*(1-r)`; `r=.30` in this base. `blend(p,l,g,k) = (k*p+g*l)/(g+k)` when live is available; otherwise the prior is held. `unitPriorGamesMap`, [unit_prior_controller](../../../model/unit_prior_controller.js) and continuity state determine per-team effective `k`, generally .25–1.00. The snapshot preserves the actual `k`; source comments about obsolete early QB floors are not applied by this audit.
- **Missing current data:** schedule/feed freshness and canonical QB PBP-definition gates prevent priors being represented as current. Components can remain prior-held/unavailable; consumers may reject unavailable profiles. No missing/fallback team is accepted into this frozen current analysis. The weekly pressure fallback is explicitly current proxy data, not an offline snapshot.
- **Bridge delta:** [unit_force_bridge.js](../../../model/unit_force_bridge.js) `compute` takes each available current grade minus its effective preseason grade. Fixed weights, share .50 and midpoint-equivalent cap 7.50 are preserved. Missing weights are not redistributed. Translation to Elo occurs before the separate overall FORCE normalizer. Offense/defense composites are not additional bridge inputs.
- **Text formatting:** Team unit bars consume full numeric grades and print one decimal; unit table cells generally print whole points. Findings use underlying display-grade numbers, not rounded text, and report rounded distinct-value counts separately. Unit grades, composite mapping and overall FORCE score normalization are distinct layers.

## Public/bridge membership and formula map

All formulas below are in `buildProfiles`, except final QB recency in `liveProfiles`, and composite helpers named below. Physical raw keys are defined in [architecture.mjs](architecture.mjs). Neither a QB scalar proxy nor a coverage scalar proxy represents its entire multivariate formula.

| Public label / key | Current formula and live 0–100 mapping | Effective prior / extra context | Bridge weight |
|---|---|---|---:|
| QB play / `qbIndex` | .30 EPA component + .30 ANY/A + .20 actual-pass success + .10 rushing value + .10 CPOE; center-50 expansion 1.20 and clamp; contexts added and clamped | Regressed bundled QB grade, effective QB prior games; final recency added after blend | .12 |
| Receivers / `receiverIndex` | WR/TE EPA/target minus fitted ridge QB-environment component; 80-target stabilization; historical-center alignment; continuous 2025 residual percentile | V115 historical WR/TE residual percentile regressed; effective team prior | .08 |
| Offensive line / `olIndex` | De-duplicated PBP hit-or-sack disruption allowed/dropback; inverse percentile against 2025 same-sized rolling windows if >=100; otherwise prior raw disruption CDF, then current rank fallback | Regressed bundled OL prior; effective team prior; no run-block input or opponent subtraction | .08 |
| RB / `rbIndex` | .70 RB/FB rushing EPA/carry + .30 partially QB-residualized receiving EPA/target; separate 50-carry and 40-target stabilization; historical-center alignment; continuous historical composite percentile | Historical default-helper prior with callback mismatch described below; regressed and blended using team prior | .07 |
| Coverage / `coverageIndex` | .75 inverse current rank of sack-free pass-attempt EPA allowed + .25 inverse current rank of CPOE allowed | Regressed bundled coverage prior; no explicit opponent-QB or pass-rush subtraction | .162 |
| Pass rush / `passRushIndex` | Charted provider: pressure + .20 hit + .60 sack rates, continuous 2025 sample-size-matched PFR composite percentile (>=20). Weekly fallback: current rank of hit+sack/dropbacks, not that weighted composite CDF | Regressed 2025 PFR composite prior if available, otherwise raw pressure prior; effective team prior. Four charted/28 proxy teams now | .072 |
| Run defense / `runDefenseIndex` | Inverse current rank of opponent team rushing EPA/carry | Regressed percentile of bundled 2025 `dl.run_stop_rate`; construct differs from live rush EPA; effective team prior | .126 |
| Scoring/drive / `pointsScoredPerDriveIndex` | Current rank of qualifying offensive points/drive | Regressed bundled `offenseIndex` (legacy EPA grade), effective team prior; no opponent/field-position adjustment | .20 |
| Pts/drive prevention / `pointsAllowedPerDriveIndex` | Inverse current rank of opponent qualifying offensive points/drive | Neutral 50, fixed one-game prior, independent of regime-derived prior games; no opponent/field-position adjustment | .090 |
| Overall offense / `offenseComposite` | `rawOffenseCompositeFrom`: .20 scoring/drive + .30 QB + .15 WR + .15 OL + .20 RB; `calibrateComposite` soft-tail tanh with softness 35 | Weighted already-normalized grades, not a new physical signal; missing available grades reweight the display composite only | none |
| Overall defense / `defenseIndex` | `rawDefenseCompositeFrom`: .36 coverage + .16 rush + .28 run + .20 prevention/drive; soft-tail tanh with softness 42 | Weighted already-normalized grades; composite calibration preserves 0/50/100 | none |
| Team efficiency diagnostic / `offenseIndex` | Current rank of team offense EPA/play, blended | Regressed legacy offense grade; compatibility/debug diagnostic, not canonical offense outcome key | none |

Team Units has **10 rows**: overall offense, QB, OL, RB, receivers, overall defense, pass rush, run defense, coverage and prevention/drive. **Scoring/drive is a bridge input but not a Team Units row**; it is available in diagnostic/export contexts. The legacy team-efficiency score is an additional diagnostic, not a Team Units row or current bridge key. `frontIndex` and `rushIndex` are legacy compatibility fields; they are not additional public position units. No special-teams grade was found in the canonical board/bridge. The public Advanced panel exposes raw team offensive efficiency, not an extra bridge weight.

## QB detailed context

EPA uses passes, sacks and meaningful QB runs once, stabilized toward current league QB EPA with 150 value plays. Success uses actual pass attempts, stabilized with 100 attempts. Both map against full-season 2025 PBP distributions. ANY/A is `(passingYards + 20*passTD - 45*INT - sackYards)/(attempts+sacks)`, ranked within the current league; missing box-score ingredients leave its component neutral rather than substituting a different statistic. CPOE is stabilized with 60 attempts, then `50+50*tanh((stableCPOE-currentLeagueCPOE)/7.5)`.

Rushing bonus is `clamp(12*tanh(totalQBRunEPA/15)*rushAttempts/(rushAttempts+12),0,12)`; its component is `50+50*bonus/12`. This is an additional positive rushing-value component even though meaningful runs also enter EPA. That architecture is traced, not altered.

V139 opponent context constructs FORCE-style QB ratings by team-game and assesses each defense in its **other matchups**, weighted by dropbacks and shrunk with 100 dropbacks toward 50. The adjustment is `4*(50-allowedRating)/50`. It is not the coverage grade. V137 pressure context adds .75 of standard <=4-rusher disruption protection difficulty plus .25 of performance on disrupted dropbacks, scale 3. Performance combines .70 EPA and .30 success, shrunk with 30 disrupted plays. Overall pressure rate is excluded from this adjustment. These summaries are visible in the frozen QB component record.

After prior blending, V148 applies .40 times the recent-weighted minus ordinary current-season QB rating, capped +/-4; game weights are 2,1.75,1.5,1.25, then 1 for older games. Source hashes and trace/profile parity preserve this exact path. No automatic QB-return contribution is present.

## Receivers and RB: raw stages and prior mismatch

`priorReceiverWrteEpa` subtracts RB receiving contribution from the 2025 aggregate when target counts permit. `priorQbPassEpa` prefers historical `epaoe`, then `epa_per_play`. `ridgeOrthogonalSlope` uses the historical slope divided by `1+.50`. Actual coefficients here are WR **.5879714748**, RB receiving **.3265293576**, historical QB center **.0615**. Live residual is `receiverEPA - beta*(QB actual-pass EPA - center)`; it is partial environmental subtraction, not identification of causal isolated player skill. Rushing RB EPA is credited directly; pass-protection OL is not a run-block adjustment. Reliability shrinkage and historical-center translation precede the live historical percentile; a second prior-grade blend follows.

The live RB V115 calibration reference correctly uses an explicit unary wrapper with its fitted beta/center. But **the effective RB preseason prior uses another reference**:

```js
Object.values(priorProfiles || {}).map(priorRbOrthogonalComposite)
// helper signature: (profile, recvBeta=1, qbCenter=0)
// individual value: priorRbOrthogonalComposite(prior)
```

`Array.map` supplies index and array as beta/center. The array cannot convert to a finite number; `partialResidual` returns unadjusted receiving EPA. Thus reference values are `.70*rushEPA + .30*receivingEPA`, while individual values use default full QB subtraction. This is a reproduced call-semantics mismatch, not merely an inferred association. [prior_audit.mjs](prior_audit.mjs) reproduces all 32 effective production priors and compares an explicitly unary callback using the same default helper. Largest effective-prior difference is 9.7844 points; largest frozen current prior-only difference is 1.6310 points; KC difference is -0.1035 points. This control does **not** choose whether future priors should use defaults or the V115 fitted beta, and is not a forecast/bridge ablation or replacement implementation. Both prior-frame alignment and any correction need separate owner direction.

RB is a room-level per-opportunity rushing/receiving mixture, not an individual rushing-yard, touchdown or rushing-only award. EPA captures situational success/scoring indirectly; it has no explicit YPC, TD-count, explosive-rate or workload bonus. Carries/targets affect sample confidence. It remains exposed to run blocking, opponent/front and offensive context.

## Scope, fallback and independence limits

**OL** is exclusively pass protection on the current policy. The public `Offensive line` label is broader than the construct; the internal diagnostic says disrupted dropbacks only and no team rushing EPA. No user-comprehension study was conducted, so the audit quantifies the 100% pass-protection input share and benchmark relationships, not a percentage of confused users. A future label/scope decision is owner-gated.

**Coverage** excludes sacks at the PBP attempt gate; CPOE is an allowed passing outcome. It has no explicit anti-double-charge residualization against pressure. Sacks excluded is a useful accounting separation, not proof that pressure cannot affect EPA on actual throws. Weak cross-sectional coverage/rush correlation does not prove causal independence. Legitimate football interaction is not automatically double counting.

**Pass rush** selects intentional manual-current data, valid FTN play-level data, fresh aggregate, complete PFR charting, then weekly nflverse disruption, else prior-held/unavailable. The current frozen snapshot uses PFR for ATL/CLE/NO/PIT and the weekly fallback for 28 teams. In the fallback, the exported selected composite includes hit/sack bonuses, but the grade itself ranks the plain weekly disruption proxy. The 32-team mixed composite is only a diagnostic proxy; per-provider results are retained separately. No observed provider-stratum difference is interpreted causally because assignment is nonrandom.

**Run defense** measures team rushing outcomes allowed, including QB runs, not identified defender skill. First-down and 20+ rates are available comparison proxies; first-down rate is not EPA-positive success. Opponent/run-game context is not removed.

**Drive outcomes** are broad offensive/defensive outcomes. Strong alignment with points/drive is partly an ingredient identity; they are not independent position-group measurements. Their offensive legacy-EPA prior and defensive neutral one-game prior are asymmetric. No MD-10 possession/naming/prior change is made.

**Composites** share their component information by construction and undergo a separate display expansion. They do not prove independent football measurement. Soft-tail mapping is `50 + 50*tanh((raw-50)/softness)/tanh(50/softness)`, clamped. [unit_summary.json](results/unit_summary.json) labels raw composite spread as weighted normalized values, not comparable EPA units.
