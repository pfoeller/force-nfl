# MD-05 current production bridge materiality — Cycle 8

Research only, from exact shared base `f2ce02c9f4ac7e54f22b372b6583cc878b030c45`. The owner accepted the corrected first tranche (`61561fc` + `d16c5d7`) and the corrected second key/group/redundancy/persistence tranche (`3d98f0e` + `9efc6b2`) on 2026-10-05, confirming the earlier first acceptance. MD-05 remains REVIEW (BANKED pending future evidence), Priority unset, NOT COMPLETE; no further research tranche or historical/predictive ablation design is authorized. See the [acceptance record](KEY_GROUP_ATTRIBUTION.md#owner-acceptance-and-research-branch-closeout--2026-10-05). Formula implementation, unit redesign and historical causal replay remain NOT AUTHORIZED. MD-06 remains REVIEW / NOT AUTHORIZED; MD-07 and MD-08 remain PLANNED / NOT AUTHORIZED. No new priority or implementation order is assigned.

## Capture and scope

The existing public [bootstrap endpoint](https://forceratings.com/api/bootstrap) was captured on **2026-10-05 at 14:22:58.3409852 UTC**. It was built at **14:01:47.361 UTC**, generation `1791208907361-fe47c67c-ab19-4a93-bb97-633c32160c6d`. Existing bootstrap identity is FORCE V149. All **18 ordered deployed app/model/data scripts** match the exact base after LF normalization. The published index differs only by Cloudflare's analytics beacon. No Worker Version ID was queried; source parity is the deployment evidence used here.

The snapshot passed the existing app integrity gate: live=true, connection=live, stale=false, no missing/pending teams, no QB-input warning or snapshot warning. All 32 teams have a nonzero bridge and all 288 current/prior key pairs are present. This is not the bundled offline fallback. Pass rush uses the existing live-current **nflverse weekly-disruption fallback for 28 teams** and **PFR advanced charting for ATL, CLE, NO and PIT**. The disruption fallback is not complete pressure charting; that measurement-quality limitation is preserved. Provider completeness means the existing FORCE current-input contract, not complete charting from every upstream source.

There are 272 regular-season fixture games, 63 completed and 209 remaining. No unscored game had reached its scheduled Eastern-time kickoff at capture. The next game was ATL at NO at 20:15 Eastern on October 5. This is a schedule-based check, not an authoritative in-game feed.

[Provenance](inputs/provenance.json) pins the raw capture's bytes/hash, normalized input, result hash, runtime and schema. The raw 8,356,378-byte bootstrap remains in local TEMP, outside Git. Its SHA-256 is `ed930093ba55f8d246893af5714055ac8aad9f3a3fd792d7c8f98ac799168527`. **No raw provider feed is committed.** [Frozen input](inputs/snapshot.json) contains only FORCE-derived ratings/grades/freshness/ledger values, minimal public fixture context, FORCE-derived market probabilities and exact model output references. It includes no player rows, provider odds rows, FTN/PFR records or PBP. This does not grant a new license to redistribute any underlying provider feed.

## Exact current source trace

Line numbers refer to the pinned base, not a future layout. These are current-source findings, not assumptions from old notes.

| Boundary | Exact source |
| --- | --- |
| Bootstrap applies current canonical feeds and enforces integrity | [app](../../../assets/app.js), `applyBootstrapSnapshot`, lines 516–590 |
| Core current state | [app](../../../assets/app.js), `seasonEngine`, lines 1017–1183; `coreCurrentRatings`, line 1185 |
| Current stabilized profile | [app](../../../assets/app.js), `liveProfiles`, line 1688; V148 QB recency applied once, lines 1744–1763; `profile`, line 1785 |
| Actual prior used | [app](../../../assets/app.js), `unitForceBridgeForProfile`, line 1189, prefers live `_preseasonUnitPrior`; [live profile model](../../../model/live_profiles.js), preseason prior derivation around lines 1430–1465 and output at 1498/1697 |
| Canonical current bridge and rating | [app](../../../assets/app.js), `unitForceBridge`, line 1214; `currentRatings`, lines 1218–1223 |
| Keys, missingness, cap, conversion and soft-tail score | [bridge module](../../../model/unit_force_bridge.js), constants lines 19–39 and `compute`, lines 98–135 |
| Debug/ledger reconciliation | [app](../../../assets/app.js), `ratingLedger`, line 2032; `unitAudit`, line 2065; window exports at 2343–2344 |
| Smart probability and implied line | [app](../../../assets/app.js), `forecastFor`, line 1296; [forecast module](../../../model/forecast_v2.js), `marketProbability`/`forecastProbability` and `probabilityToSpread` |
| Score and season outputs | [app](../../../assets/app.js), `exactScoreProjection`, line 2680; `projected`, line 3340; `seasonProjection`, line 3655 |

**Core** here means the exact pre-bridge `seasonEngine().ratings`: it already includes current retrospective and early-regime overlays. It is not merely pure causal/result Elo. No such overlay is ablated. The actual prior is the per-profile preseason unit prior, not an unconditionally substituted bundled grade. Current grades already contain production stabilization, partial orthogonalization and once-only QB recency; none is reapplied.

The current `ratingLedger.current.unitBridgeElo` is the absolute applied bridge. Its `deltas.unitBridgeElo` instead measures movement since Week-2 entry and must not be substituted for this measurement. Key missingness is checked using actual bridge components; the ledger's display-oriented numeric coercions are not used as the missingness contract.

## Accounting and scale

For team t and key k, if both current and prior grades are valid under production's finite predicate:

```text
delta[k] = current[k] - prior[k]
weighted[k] = weight[k] * delta[k]
preCapContribution[k] = 0.50 * weighted[k]
preCap = sum(preCapContribution[k])
postCap = clamp(preCap, -7.50, +7.50)
eloPerMidpointPoint = 5.54 when postCap >= 0; 5.816 otherwise
appliedElo = postCap * eloPerMidpointPoint
finalCurrentElo = coreCurrentElo + appliedElo
```

The anchors are mean 1505, low 1214.2 and high 1782. Missing current/prior values contribute zero without redistributing weight. Null, empty, undefined and NaN behavior is tested explicitly with **synthetic** mutations; these are not live missingness evidence. All nine production weights are retained.

Grade deltas are native unit-score points. Weighted/share contributions and the cap are **midpoint-equivalent FORCE points**, before Elo translation. Display FORCE uses the piecewise anchored scale and softened tails, with presentation formatting later. It has no globally constant one-display-point mapping. In this snapshot a -7.50 midpoint cap can yield a displayed delta below -7.50: the most negative displayed delta is -7.874. Report that actual difference rather than calling the cap a hard displayed-score bound. No invented "percent of FORCE" is used.

The research asserts, for all 32 teams, `final-core = appliedElo`, component sums, exact production cap behavior, current ledger reconciliation and exact captured bridge reproduction, at tolerance 1e-9. No per-key post-cap allocation exists in production, so none is invented here.

## Team and league measurement

The [32-team CSV](results/bridge_materiality.csv) includes full-precision core/final Elo and FORCE, pre/post-cap points, applied Elo, absolute magnitude/sign, cap use, cap binding and core/final ranks. The [full result](results/bridge_materiality.json) adds every team × key prior/current/raw delta/weight/contribution/share, core-SD/range ratios, cap excess and missing keys. Positive rank movement means a rise from the no-bridge core rank to the actual current rank.

| Team | Pre-cap midpoint | Applied midpoint | Applied Elo | Core → current rank |
| --- | ---: | ---: | ---: | --- |
| SF | 10.773 | 7.500 | 41.550 | 2 → 1 |
| JAX | 4.853 | 4.853 | 26.884 | 3 → 2 |
| SEA | 0.989 | 0.989 | 5.482 | 1 → 3 |
| CHI | 6.103 | 6.103 | 33.813 | 4 → 4 |
| MIN | 6.109 | 6.109 | 33.847 | 5 → 5 |
| KC | 7.942 | 7.500 | 41.550 | 8 → 6 |
| BUF | -2.974 | -2.974 | -17.299 | 6 → 7 |
| BAL | 7.546 | 7.500 | 41.550 | 12 → 8 |
| LAR | -6.739 | -6.739 | -39.196 | 7 → 9 |
| CIN | 6.113 | 6.113 | 33.867 | 14 → 10 |
| CAR | 4.726 | 4.726 | 26.183 | 13 → 11 |
| NE | -10.318 | -7.500 | -43.620 | 9 → 12 |
| ATL | 2.640 | 2.640 | 14.626 | 15 → 13 |
| DEN | -7.213 | -7.213 | -41.953 | 10 → 14 |
| LV | 14.682 | 7.500 | 41.550 | 21 → 15 |
| IND | -8.271 | -7.500 | -43.620 | 11 → 16 |
| DAL | -2.596 | -2.596 | -15.101 | 16 → 17 |
| CLE | -0.281 | -0.281 | -1.637 | 18 → 18 |
| NYG | 1.823 | 1.823 | 10.102 | 22 → 19 |
| DET | -4.478 | -4.478 | -26.042 | 17 → 20 |
| PIT | -6.233 | -6.233 | -36.250 | 19 → 21 |
| NO | 0.055 | 0.055 | 0.306 | 25 → 22 |
| HOU | -4.463 | -4.463 | -25.955 | 23 → 23 |
| PHI | -9.754 | -7.500 | -43.620 | 20 → 24 |
| NYJ | 8.728 | 7.500 | 41.550 | 30 → 25 |
| GB | -11.236 | -7.500 | -43.620 | 24 → 26 |
| LAC | -5.166 | -5.166 | -30.046 | 26 → 27 |
| TB | -3.322 | -3.322 | -19.320 | 27 → 28 |
| ARI | 2.194 | 2.194 | 12.156 | 31 → 29 |
| WAS | -3.460 | -3.460 | -20.126 | 28 → 30 |
| MIA | -5.189 | -5.189 | -30.179 | 29 → 31 |
| TEN | -1.251 | -1.251 | -7.276 | 32 → 32 |

| Applied bridge space | Min | Max | Signed mean | Median | Mean absolute | Median absolute | Population SD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Midpoint points | -7.500 | 7.500 | -0.321 | -0.766 | 4.890 | 5.178 | 5.440 |
| Elo | -43.620 | 41.550 | -2.495 | -4.456 | 27.809 | 30.112 | 30.882 |
| Display FORCE points | -7.874 | 7.500 | -0.394 | -0.766 | 4.912 | 5.178 | 5.468 |

There are 15 positive, 17 negative and zero approximately-zero bridges (1e-9 Elo tolerance). Core Elo population SD is **93.291**, range **345.444**. Mean absolute bridge is **29.81% of core SD** and **8.05% of core range**; those are scale comparisons, not percentages of FORCE. The JSON also reports interpolated P10/P25/P75/P90.

Fixed round-number Elo thresholds, chosen to show sub-point noise through roughly half a core SD: 31 teams ≥1, 28 ≥10, 21 ≥25, and zero ≥50 absolute Elo. For descriptive labels only, mean absolute bridge/core SD <5% is negligible, 5–20% modest, 20–50% material, ≥50% dominant. The observed 29.81% is **material, not dominant** by that convention. These bins are not model adoption thresholds or an optimality claim.

## Per-key movement and cap

The values below are **pre-cap midpoint contributions after the share**. Gross absolute mass is the sum of absolute team × key contributions. Net absolute pre-cap mass is the sum of absolute team totals after cancellation. The JSON reports both denominators; key/net ratios need not sum to 100% because opposing keys cancel. The percentage column below uses gross mass and therefore sums to 100%.

| Key | Exact weight | Mean absolute contribution | Gross absolute mass share |
| --- | ---: | ---: | ---: |
| pointsScoredPerDriveIndex | 0.2 | 2.094 | 20.988% |
| coverageIndex | 0.162 | 1.562 | 15.654% |
| runDefenseIndex | 0.126 | 1.471 | 14.741% |
| qbIndex | 0.12 | 1.269 | 12.718% |
| pointsAllowedPerDriveIndex | 0.09 | 0.924 | 9.261% |
| olIndex | 0.08 | 0.726 | 7.272% |
| passRushIndex | 0.072 | 0.699 | 7.010% |
| receiverIndex | 0.08 | 0.628 | 6.293% |
| rbIndex | 0.07 | 0.605 | 6.063% |

Scoring per drive is largest at 20.988%, followed by coverage at 15.654% and run defense at 14.741%. The two largest account for 36.642%; no one/two-key majority dominates gross movement. The top three account for 51.383%. This contribution ordering measures this snapshot, not unit validity, causal attribution or which unit should be redesigned first. The JSON includes signed mean, median absolute, SD, min/max, sign counts and maximum absolute team contribution for every key.

The cap **binds for nine teams (28.125%)**, and ten use at least 90% of it. It is frequently binding in this snapshot. The following table includes the largest three absolute contributors (which can oppose the net total); all nine are in the result JSON.

| Team | Pre-cap midpoint | Excess beyond cap | Three largest absolute pre-cap contributions |
| --- | ---: | ---: | --- |
| SF | 10.773 | 3.273 | pointsScoredPerDriveIndex +2.618; coverageIndex +2.272; runDefenseIndex +1.463 |
| KC | 7.942 | 0.442 | coverageIndex +2.372; rbIndex +2.080; pointsScoredPerDriveIndex +1.740 |
| BAL | 7.546 | 0.046 | qbIndex +1.890; pointsScoredPerDriveIndex +1.402; olIndex +1.282 |
| NE | -10.318 | 2.818 | pointsScoredPerDriveIndex -5.655; runDefenseIndex -1.876; qbIndex -1.831 |
| LV | 14.682 | 7.182 | pointsScoredPerDriveIndex +4.903; coverageIndex +2.880; qbIndex +2.643 |
| IND | -8.271 | 0.771 | qbIndex -2.753; runDefenseIndex -1.507; pointsScoredPerDriveIndex -1.132 |
| PHI | -9.754 | 2.254 | qbIndex -1.804; pointsScoredPerDriveIndex -1.502; coverageIndex -1.438 |
| NYJ | 8.728 | 1.228 | qbIndex +2.520; coverageIndex +2.163; runDefenseIndex +1.715 |
| GB | -11.236 | 3.736 | pointsScoredPerDriveIndex -4.837; qbIndex -2.342; olIndex -1.202 |

LV's uncapped 14.682 is reduced to 7.500; the largest excess is 7.182 midpoint points. BAL's excess is only 0.046. There is no basis here to conclude the cap is optimal or to authorize a cap change. No captured key is missing, so zero missingness suppression is observed; hypothetical suppression in another snapshot cannot be estimated by filling gaps.

## Read-only current-snapshot ablation

The normalizer evaluates the actual public bootstrap with the existing app harness and production functions. The frozen replay substitutes only already-computed **input boundaries**: captured `coreCurrentRatings`, captured stabilized `liveProfiles`, and the existing `marketProbability` output. It does not reconstruct live/provider processing from redistributable raw feeds. That limitation is explicit. Before ablation it must reproduce **all captured ratings, 209 forecasts and scores, analytic wins and the complete season projection byte-for-byte**.

Then only the VM-local bridge `compute` is wrapped with share=0. Core, unit profiles, priors, market context, schedule, scores, anchors, HFA, forecast scale, unit formulas and all forecast/score/projection function bodies remain identical. Nothing is written to production source/runtime. Frozen input hashes remain unchanged; no-bridge ratings equal captured core; restoring `compute` restores exact actual ratings. The retired QB correction remains zero in both states.

All 209 remaining regular-season games are evaluated in existing smart mode; all 63 completed results remain fixed, not retrospectively reforecast. Existing market treatment is preserved exactly, including its current absent-line numeric handling. Sixteen future contexts report moneyline and 193 report spread; a derived spread context is not proof of a real available sportsbook line. This is not an MD-12 market-source audit. Existing implied line is the production -6.5 logit transform.

Score simulations use all **25,000 production runs per game**, and season simulations use all **5,000 runs**. No new projection engine or reduced sample count is used. Season simulation uses the same schedule-version seed in both states (common random draws); exact scores retain production's state-dependent seed, so score changes include deterministic simulation variability/representative-score discontinuity. Neither variation is a historical predictive validation or confidence interval.

All deltas below are actual-current minus no-bridge. Absolute summaries describe magnitude, not a recommended removal.

| Output | Mean absolute change | Median absolute change | Maximum absolute change |
| --- | ---: | ---: | ---: |
| Rank places | 2.188 | 2.000 | 6.000 |
| Home probability, percentage points | 4.851 | 4.231 | 13.244 |
| Implied home line, points | 1.517 | 1.350 | 3.562 |
| Analytic score margin, points | 1.517 | 1.350 | 3.562 |
| Analytic score total, points | 0.000 | 0.000 | 0.000 |
| Representative score margin, points | 1.359 | 1.000 | 6.000 |
| Representative score total, points | 0.766 | 1.000 | 3.000 |
| Analytic expected wins | 0.494 | 0.532 | 0.907 |
| Simulated mean wins | 0.496 | 0.534 | 0.917 |
| Division probability, percentage points | 4.965 | 4.120 | 14.000 |
| Playoff probability, percentage points | 6.355 | 3.090 | 22.220 |
| Bye probability, percentage points | 1.570 | 0.230 | 8.340 |

27 of 32 ranks change. LV rises 21→15 (+6); IND falls 11→16 (-5), NYJ rises 30→25 (+5). Largest future probability movement is DEN at LV (Week 15, December 20): home probability +13.244 pp. Largest analytic expected-win change is LV +0.907; largest simulated mean-win change is NYJ +0.917. Largest playoff change is LV +22.220 pp; DEN is -16.520 pp. Largest division change is DEN -14.000 pp; largest bye change is BUF -8.340 pp. The JSON preserves every game/team pair and all individual score outputs for further audit.

## Conclusions and decision boundaries

Q1–Q2: Mean absolute live bridge is 4.890 midpoint points / 27.809 Elo / 4.912 displayed FORCE points; it is material relative to core dispersion by the explicit descriptive convention above.

Q3–Q4: Scoring/drive, coverage and run defense contribute most gross pre-cap movement. No one/two-key majority dominates it. Different teams have different drivers.

Q5: Nine caps bind, sometimes substantially, so the cap is practically active today. This does not prove an optimal cap.

Q6: Team ranks, smart game probabilities, lines and marginal season outcomes respond materially. Analytic score totals do not change; representative scores can. None of these differences proves removal would improve predictions.

Q7: The observed exposure justifies recommending a **separately authorized** deeper MD-05 attribution/ablation design, including which archived inputs would make a full-stack historical replay feasible. A multi-snapshot measurement could establish persistence. Historical/predictive replay remains unstarted and unauthorized. The separately authorized second research tranche below measures direct-channel attribution and inventories persistence without replay.

Q8: **No double counting is proven.** Large net/gross bridge effects do not isolate causal duplication; small effects would not validate unit metrics either. Shared-event credit, predictive increment and attribution need separate evidence. Current-state sensitivity does not establish historical predictive value.

Q9: MD-07/MD-08's calibration and normalization can materially affect aggregate FORCE because this bridge is active. The present grades/weights/cap must be accounted for when evaluating those future options, but this snapshot does not select a normalization anchor, redesign, unit priority or cross-unit comparability contract. Their statuses and authorization remain unchanged.

One snapshot does not prove season-long behavior. Freshness is captured-time evidence, and the public endpoint advances. Both corrected research tranches are owner accepted; future comparison/research scope, attribution policy, replay design and any model adoption remain separate owner decisions. The manual capture method is preserved for future independent evidence collection; capture does not automatically authorize analysis or model changes.

## Reproduction

From the repository root, with Node **v26.7.0**:

```text
node research/cycle8/md05_bridge_materiality/analyze.mjs
node research/cycle8/md05_bridge_materiality/check.mjs
```

`analyze.mjs` writes only the research JSON/CSV (or an explicit scratch output path). `check.mjs` checks all four script syntaxes, runs two complete frozen-snapshot measurements in TEMP, and requires byte-identical JSON/CSV equal to the saved results. Comparison normalizes Git checkout CRLF only; numeric output is not rounded for hashing. Source and bundle order pins prevent silently running changed production code. It runs offline with no new dependencies. Expect several minutes because it retains the production simulation counts.

Optional normalization of the **same private captured input**, not a provider importer:

```text
node research/cycle8/md05_bridge_materiality/capture.mjs <private-bootstrap.json> <capture-meta.json> <published-script-hashes.json>
```

The meta file records UTC capture timestamp, URL, HTTP status, built-at header, raw byte count and SHA-256; published-script hashes map each ordered script URL path to LF-normalized SHA-256. Recapture rejects a mismatching raw hash, any source differing from the exact authorized Git base, incomplete/stale input or zero bridge. A new live response is a new snapshot, not a replacement for this pinned evidence. Do not commit raw responses. No production importer, catalog entry, default test, generated mirror or network fetcher is added.

Research assertions cover 32 unique teams, all nine keys and weights, ledger/bridge accounting, cap, missingness/no redistribution, current-reference parity, identical non-bridge inputs, neutral ablation and restoration. Repository inventory/catalog integrity remains 258 entries, safe membership 146, exclusions 112. Production suites/build are unnecessary for this zero-runtime-diff research tranche; they are not claimed as rerun.

## Validation record

PASS: four script syntax checks; all accounting, missingness, source/current-reference and ablation assertions; two independent full frozen-input replays with byte-identical JSON/CSV equal to the saved evidence. Input SHA-256 `8a25682fc22ab08c85c8fdc5701d8ffdcef8d9d5dfe3e47b06b3954f43e20376`; result SHA-256 `ffdeec4705d6a360b86b36f45d82552c82d68e9e4696626bea621381a6809a87`. Roadmap IDs/links, catalog inventory, exact scope and `git diff --check` are checked in the final handoff. Both corrected tranches are owner ACCEPTED on 2026-10-05 after Claude's targeted re-review A; MD-05 remains REVIEW (BANKED pending future evidence), not COMPLETE. No merge, push or deployment is authorized.

## Second research tranche — key/group attribution and persistence

[Methods, findings, structural overlap and manual prospective capture instructions](KEY_GROUP_ATTRIBUTION.md) extend this package using the immutable accepted snapshot. Nine key/five predefined group ablations, cap transitions, signed interaction accounting, n=32 descriptive correlations and a frozen local inventory are research only. One independent eligible snapshot; persistence unresolved. [New offline check](check_key_group.mjs) verifies two-run parity; no production formula/test/generated changes or causal replay.

## Research-branch governance closeout — 2026-10-05

[Full acceptance basis, commit sets and accepted interpretation](KEY_GROUP_ATTRIBUTION.md#owner-acceptance-and-research-branch-closeout--2026-10-05) records the owner decision. Persistence remains UNRESOLVED: copies of the one eligible production generation are not independent snapshots. The manual prospective method is PRESERVED; meaningful independence generally requires another completed week or substantial profile update. No further MD-05 research, historical/predictive full-stack ablation/design, historical causal replay, formula changes or production implementation is authorized. No scheduler, background monitoring, new production endpoint or recurring automatic capture is authorized. Future capture grants no automatic analysis authority. MD-06/07/08 statuses and priorities are unchanged.
