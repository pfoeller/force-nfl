# MD-08 unit rating scale and normalization — research investigation

**Research only. Decision INVESTIGATE; Execution REVIEW; Priority unset; implementation NOT AUTHORIZED; no formula, weight, rating, display or threshold change adopted.** Base `65170f7dd9e17ac6ece1ab97790e944624d3f66f` (post-MD-07 main). Investigation commit `f7b6f005e504bc2575a6ff6042f44ad6c3d65361`; Codex independent review verdict **B. MINOR RESEARCH CORRECTIONS REQUIRED**; bounded corrections applied in the following commit; targeted independent re-review pending. MD-07's accepted bounded state, including the V115 LIVE_FITTED RB prior frame, is used as is and not reopened. UX-41 is not started.

Question: *what should a FORCE unit rating from 0 to 100 mean, and should the same displayed number mean roughly the same level of performance across units and seasons?* This package answers what the numbers mean **today**, what changing them would touch, and what evidence a future decision needs. It does not choose a scale.

[Architecture and normalization inventory](ARCHITECTURE.md) · [inputs](inputs.json) · results: [reconstruction](results/reconstruction.json), [architecture](results/architecture_inventory.json), [distributions](results/current_distributions.json) and [all 32 values per unit (CSV)](results/current_unit_values.csv), [50–90 thresholds](results/midpoint_thresholds.json), [cross-unit percentiles](results/cross_unit_thresholds.json), [cross-season](results/cross_season.json), [bridge sensitivity](results/bridge_effective_sensitivity.json), [prototypes](results/candidate_display_mappings.json), [MD-07 interaction](results/md07_interaction.json), [future authorization criteria](results/success_criteria.json).

## Evidence base and limits

- **Input:** the frozen MD-07 2026 Week-4 snapshot (SHA-256 `b84d5d17…`, 32 teams, all current), evaluated offline with BASE formulas. Since that snapshot's base, only `model/live_profiles.js` changed (the owner-accepted RB prior frame); the other 17 published scripts are byte-identical after LF normalization. Post-correction RB priors are recomputed with BASE helpers and match MD-07 matched frame B for all 32 teams. Max RB display change 3.14, max Elo change 2.46, 15 RB rank changes versus the frozen display.
- **Reproduction first:** every frozen display grade, both composites, the diagnostic grade and every team's bridge Elo reproduce from live grade, prior and the production display path (blend, then QB recency and final clamp) with residual 0 (≤1e-10). Every live mapping that uses a historical reference (QB EPA and success components, OL, WR, RB) reproduces exactly from committed references (`data/live-cache` V149 reference v5 and `data/matchup-data.js`). Rank-mapped units reproduce from the snapshot's raw signals.
- **Not available:** a second season of current-formula grades, any predictive validation (unchanged from MD-07), and an inversion of the four-team PFR pass-rush stratum.
- One snapshot (n=32, Week 4). Conventions: population SD, linear quantiles at `(n-1)p`, midrank ties, counts at-or-above 60/70/80/90 and strictly below 40/30.

## Findings in one paragraph

All nine bridge units are percentile-like, but percentiles **of different populations**: the 32 current teams (five units, plus most pass-rush teams), 32 full 2025 team-seasons after four-game stabilization (QB EPA/success, receivers, RB), or 2025 windows of the same length (OL). Each is then blended about 82% live / 18% with a prior that is a 2025 within-season standing regressed to 15–85. The resulting displayed scales are **not comparable across units**: a displayed 70 is the 69th current percentile for QB but the 94th for OL; nobody in WR, OL or RB reaches 90 while three scoring offenses do. The displayed number **is** the model number: the bridge reads it directly, so any change to it changes team FORCE and forecasts. A model-neutral presentation change requires separating the model-consumed value from the presentation-consumed value (a stored display field, a render-time transform or an equivalent design); the offline prototype of that separation leaves Elo bit-identical. Opportunity stabilization contributes computationally to the receiver compression; that does not show the stabilization is wrong or that a wider display would be better. OL's 2025-absolute anchor maps the pooled 2026 disruption rate to live 37.7 and gives the OL channel a negative league-wide mean (13 teams positive, 19 negative); its cause is an open measurement question. Exact cross-season comparability of the current formulas cannot be reconstructed from repository inputs.

## 1–2. Architecture and current normalization

See [ARCHITECTURE.md](ARCHITECTURE.md). Nine canonical bridge keys (weights sum to 1.000, share .50, cap ±7.50 midpoint points; 5.54 Elo per point up, 5.816 down). Composites and the team-efficiency grade are display-only. No unit has a separate display value. Every 0–100 constant is either a current-season rank, a 2025 reference, or hand-selected (QB expansion 1.20, stabilizers 50/40/80/100/150/60, CPOE softness 7.5, coverage .75/.25, PFR bonuses .20/.60, composite softness 35/42, reversion .30). None was fitted to make units comparable.

## 3. Current distributions (post-correction baseline, displayed = model value)

All 32 values per unit and layer (live, prior, display, bridge delta) are in [current_unit_values.csv](results/current_unit_values.csv).

| Unit | Mean | Median | SD | Min | Max | P05 | P10 | P25 | P75 | P90 | P95 | ≥60 | ≥70 | ≥80 | ≥90 | <40 | <30 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Scoring/drive | 50.01 | 49.12 | 25.88 | 7.17 | 95.03 | 10.21 | 18.07 | 31.15 | 67.00 | 85.07 | 92.24 | 13 | 8 | 5 | 3 | 14 | 7 |
| QB play | 52.27 | 53.40 | 23.67 | 17.25 | 92.88 | 19.60 | 21.16 | 27.62 | 72.85 | 83.03 | 85.97 | 13 | 10 | 6 | 1 | 12 | 9 |
| Receivers | 45.92 | 51.92 | 19.82 | 13.65 | 83.70 | 16.45 | 19.27 | 27.52 | 58.76 | 65.83 | 78.68 | 7 | 3 | 1 | 0 | 13 | 10 |
| Offensive line | 42.31 | 37.84 | 17.75 | 9.76 | 85.42 | 21.27 | 24.14 | 29.77 | 50.16 | 69.08 | 75.98 | 5 | 2 | 2 | 0 | 17 | 8 |
| RB | 50.22 | 50.87 | 18.89 | 15.60 | 87.26 | 24.87 | 27.85 | 33.07 | 66.96 | 74.47 | 77.27 | 11 | 7 | 1 | 0 | 12 | 6 |
| Coverage | 50.01 | 54.32 | 23.95 | 3.54 | 93.55 | 13.01 | 17.76 | 31.40 | 65.65 | 82.43 | 89.40 | 10 | 7 | 5 | 2 | 11 | 7 |
| Pass rush | 49.56 | 48.07 | 25.74 | 9.82 | 96.39 | 11.17 | 15.01 | 31.95 | 70.98 | 84.81 | 86.81 | 12 | 9 | 5 | 1 | 13 | 8 |
| Run defense | 49.90 | 47.05 | 24.90 | 10.06 | 90.53 | 12.88 | 15.61 | 30.96 | 72.29 | 85.42 | 86.67 | 14 | 9 | 5 | 1 | 12 | 7 |
| Pts/drive prevention | 49.99 | 50.00 | 23.69 | 10.00 | 90.00 | 14.00 | 18.00 | 30.00 | 70.65 | 81.81 | 86.00 | 12 | 9 | 4 | 1 | 13 | 8 |
| Overall offense (display only) | 48.03 | 44.39 | 23.81 | 11.89 | 92.75 | 17.43 | 22.26 | 26.84 | 69.47 | 82.26 | 83.07 | 9 | 8 | 7 | 1 | 15 | 11 |
| Overall defense (display only) | 49.34 | 46.48 | 21.00 | 13.02 | 93.69 | 21.76 | 25.68 | 31.99 | 63.76 | 78.93 | 87.34 | 10 | 6 | 3 | 2 | 12 | 7 |

- **Floors/ceilings.** No displayed grade sits at 0 or 100. Rank-mapped live grades always place one team at 0 and one at 100 by construction (scoring 1 at the floor; coverage 1 at the ceiling; pass rush, run defense and prevention 2 each). Prevention's displayed range is mechanically **exactly 10–90** at four drive-games (`display = 10 + 0.8*live`): the league's best prevention defense shows 90.00 and no team can exceed it. Priors are bounded to 15–85.
- **Conditional display bounds.** Holding each team's frozen prior, blend weights and (for QB) recency fixed and sending the live grade to its family floor/ceiling through the production display path gives the aggregate range each unit could display at Week 4. For QB that path is blend → recency → final clamp, giving **1.9792–98.1362**. These are conditional on the frozen inputs, not universal hard bounds; per-unit values are in [current_distributions.json](results/current_distributions.json).
- **Ties.** At one decimal (Units board) no unit has a tie group larger than 2. At whole points (tables, matchups) the largest groups are 4 (receivers) and 3 (scoring/drive).
- **Live layer.** Single-rank units (scoring/drive, run defense, prevention) have live SD 29.78, exactly the theoretical SD of a 32-step uniform lattice; coverage (two-rank mix) 27.41 and pass rush (mixed provider) 29.67. Historical-reference units are narrower: QB 27.39, WR 22.20, RB 21.74, OL 19.99. Every prior has mean 50.00; its SD is 20.85 (rank-based sources) or 20.20 (CDF-based), except prevention, which is fixed at 50.
- **Packing (MD-07 conventions).** Receivers still fail C2 and C3 (ranks 6–15 span 5.51; 10 teams within a rolling 6-point band). OL and the defense composite fail C3 (8 teams). No unit fails C1.

Historical seasons cannot be reproduced causally with current formulas from repository inputs; see Section 6.

## 4. What do 50, 60, 70, 80 and 90 correspond to?

### Midpoint concepts, kept separate

"Average" covers several different things here. They are reported separately in [midpoint_thresholds.json](results/midpoint_thresholds.json) and should not be collapsed.

| Unit | Transform / reference midpoint (live 50) | Raw median | Raw arithmetic mean | Current weighted centre or pooled signal → live grade | Empirical live median | Empirical displayed median |
|---|---|---:|---:|---|---:|---:|
| Scoring/drive (pts/drive) | Median standing of 32 current teams | 1.986 | 2.160 (interpolated rank grade **56.64**) | — | 50.00 | 49.12 |
| Prevention (pts allowed/drive) | Median standing | 2.198 | 2.150 (grade 52.71) | — | 50.00 | 50.00 |
| Run defense (rush EPA/carry allowed) | Median standing | −.0519 | −.0614 (grade 53.06) | — | 50.00 | 47.05 |
| Pass rush, weekly (disruption rate) | Median standing | .2364 | .2344 (grade 49.37) | — | 46.77 | 48.07 |
| Coverage, EPA component (EPA allowed) | Median standing | .1433 | .1707 (grade 37.55) | — | 51.61 | 54.32 |
| Receivers (residual EPA/target) | 2025 reference median .2547 | .2064 | .1976 | Target-weighted 2026 centre .1984, aligned onto the reference median after stabilization → 50.00 | 53.05 | 51.92 |
| RB (room composite) | 2025 reference median −.0294 | −.0806 | −.0769 | Weighted 2026 centre −.0724, aligned → 50.00 | 49.79 | 50.87 |
| OL (disruption allowed) | 2025 4-game window median .1545 | .1728 | .1688 | Pooled 2026 rate .1698 → **37.68** (mapped grade of the pooled current signal, not the displayed median) | 35.28 | 37.84 |
| QB play | Composite 50 when the weighted component mean is 50 | EPA/play .0534 | EPA/play .0636 | Constructed pre-context proxy **53.98** (see below) | 54.54 | 53.40 |

- **Rank units:** 50 is median standing under the rank transform, not the arithmetic mean of the raw metric. Scoring/drive shows the difference: raw median 1.986 and raw mean 2.160 points per drive; the mean sits at an interpolated rank grade of 56.64.
- **Receivers and RB:** the current weighted centre (target- or carry-weighted league mean) is aligned to the 2025 reference median after stabilization, so that centre maps to 50 by construction. This is centre alignment to a reference median, not a mapping of a simple arithmetic team average.
- **QB:** 53.98 is a constructed proxy under the current component mappings and weights. It uses EPA and success at the current weighted league means (components 53.70 and 58.70), ANY/A at median standing (50), CPOE at the current mean (50) and the median rushing component, before opponent, pressure, prior and recency. It is not the empirical displayed median (53.40), not a unique raw "average QB" and not a single observed football signal.
- **OL:** the pooled 2026 disruption rate (.1698) maps to live 37.68 against the 2025 window reference (median .1545). That is the grade of the pooled current signal; the empirical displayed median is 37.84.
- **Summary.** For the rank units, 50 is median standing. Receivers and RB are centre-aligned to a reference median after stabilization. QB has a constructed multi-component midpoint proxy rather than a unique raw average. OL's pooled current signal maps well below 50 against its 2025 reference. Displayed medians differ again after blending, priors and context (37.8 for OL to 54.3 for coverage).

### Thresholds, classified per unit

There is no single inversion. Each target is classified as follows: **EXACT / UNIQUE** (a round trip was asserted and passed), **DISCRETE / INTERVAL** (an interpolated rank quantile describing this snapshot), **REFERENCE-RELATIVE** (a 2025 reference percentile), **TIE-JUMP / APPROXIMATE**, **MULTIDIMENSIONAL PROXY**, **OPPORTUNITY-ASSUMPTION APPROXIMATION**, **UNREACHABLE** or **NOT INVERTED**. Every entry in the JSON records the target, reconstructed rating, attainability, class and any fixed assumptions.

| Unit | 50 | 60 | 70 | 80 | 90 | Class / reference |
|---|---|---|---|---|---|---|
| Scoring/drive (points per drive) | 1.99 | 2.31 | 2.57 | 2.66 | 2.96 | DISCRETE / INTERVAL; current 32 teams |
| Prevention (points allowed per drive) | 2.20 | 2.03 | 1.88 | 1.83 | 1.67 | DISCRETE / INTERVAL |
| Run defense (rush EPA/carry allowed) | −.052 | −.087 | −.101 | −.127 | −.174 | DISCRETE / INTERVAL |
| Pass rush, weekly (hit+sack per dropback) | .236 | .245 | .267 | .275 | .310 | DISCRETE / INTERVAL (28 weekly teams); the 4 PFR teams are NOT INVERTED |
| Coverage: EPA allowed at EPA-percentile X | .143 | .112 | .100 | .071 | .020 | MULTIDIMENSIONAL PROXY; with the CPOE rank held at 50 the live grade cannot exceed 87.5, so 90 is UNREACHABLE under that assumption |
| OL (disruption allowed per dropback) | .155 | .143 | .127 | .115 | .100 | REFERENCE-RELATIVE, EXACT / UNIQUE except 60 (TIE-JUMP: target 60 reconstructs to **60.15625**) |
| Receivers: mapped residual EPA/target | .255 | .285 | .311 | .330 | .405 | REFERENCE-RELATIVE, EXACT / UNIQUE |
| Receivers: implied raw residual at 94 targets | .198 | .254 | .303 | .338 | .477 | OPPORTUNITY-ASSUMPTION APPROXIMATION (reliability .54) |
| RB: mapped room composite | −.029 | −.008 | .007 | .037 | .076 | REFERENCE-RELATIVE, EXACT / UNIQUE |
| RB: implied rush EPA/carry at 88 carries, receiving at centre | −.085 | −.038 | −.003 | .064 | .150 | OPPORTUNITY-ASSUMPTION APPROXIMATION (rush reliability .64) |
| QB: uniform component level | 50.0 | 58.3 | 66.7 | 75.0 | 83.3 | MULTIDIMENSIONAL PROXY (rushing at its 50 floor: 50.0/59.3/68.5/77.8/87.0) |
| QB EPA/play at that level (mapped / implied raw at 151 plays) | .049 / .031 | .076 / .086 | .092 / .117 | .098 / .130 | .153 / .240 | Illustrative MULTIDIMENSIONAL PROXY |
| QB ANY/A at that level | 6.29 | 6.63 | 7.02 | 7.39 | 7.72 | Illustrative MULTIDIMENSIONAL PROXY |
| Overall offense raw weighted grade | 50.0 | 56.3 | 63.1 | 70.9 | 81.3 | EXACT / UNIQUE (analytic) |
| Overall defense raw weighted grade | 50.0 | 57.0 | 64.5 | 73.0 | 83.6 | EXACT / UNIQUE (analytic) |

- **Rank quantiles** are snapshot descriptors between observed teams. Production ranks only observed teams, so no single observed raw value need map back to a nominal 60 or 70. The JSON lists the bracketing observed teams' grades.
- **OL 60:** the 2025 reference contains tied rates, so the production map jumps over 60. The reported rate (.1429) reconstructs to 60.15625. Production CDF behaviour is unchanged; the jump is reported as is.
- **QB rows** are illustrative: many component combinations reach the same grade, so uniform level, implied EPA and implied ANY/A are not unique raw thresholds.
- **Receivers and RB implied raw values** depend on the chosen opportunity count and the stabilization assumption.

**Is 70 good, 80 elite, 90 rare?** For rank units, live 70/80/90 is the 70th/80th/90th standing of this season's 32 teams. For reference units it is the 70th/80th/90th percentile of 2025 team-seasons, which four-game stabilization makes harder to reach. After the prior blend (median live weight .82), a **displayed** 70 needs live ≈74.5, 80 needs ≈86.7 and 90 needs ≈98.9 for a team with a neutral prior. A team with a 35 prior cannot display 90 at all. So 90 is effectively "league-best this season plus a strong prior". These meanings differ materially by unit (Section 5). This is descriptive; no threshold is proposed.

## 5. Cross-unit comparability

Empirical percentile of each displayed rating within the current 32 teams, and the inverse:

| Unit | 50 | 60 | 70 | 80 | 90 | P50 rating | P75 | P90 | P95 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Scoring/drive | 53.1 | 59.4 | 75.0 | 84.4 | 90.6 | 49.1 | 67.0 | 85.1 | 92.2 |
| QB play | 43.8 | 59.4 | 68.8 | 81.3 | 96.9 | 53.4 | 72.8 | 83.0 | 86.0 |
| Receivers | 46.9 | 78.1 | 90.6 | 96.9 | 100.0 | 51.9 | 58.8 | 65.8 | 78.7 |
| Offensive line | 75.0 | 84.4 | 93.8 | 93.8 | 100.0 | 37.8 | 50.2 | 69.1 | 76.0 |
| RB | 50.0 | 65.6 | 78.1 | 96.9 | 100.0 | 50.9 | 67.0 | 74.5 | 77.3 |
| Coverage | 46.9 | 68.8 | 78.1 | 84.4 | 93.8 | 54.3 | 65.6 | 82.4 | 89.4 |
| Pass rush | 53.1 | 62.5 | 71.9 | 84.4 | 96.9 | 48.1 | 71.0 | 84.8 | 86.8 |
| Run defense | 53.1 | 56.3 | 71.9 | 84.4 | 96.9 | 47.0 | 72.3 | 85.4 | 86.7 |
| Pts/drive prevention | 50.0 | 62.5 | 71.9 | 87.5 | 98.4 | 50.0 | 70.6 | 81.8 | 86.0 |
| Overall offense | 56.3 | 71.9 | 75.0 | 78.1 | 96.9 | 44.4 | 69.5 | 82.3 | 83.1 |
| Overall defense | 59.4 | 68.8 | 81.3 | 90.6 | 93.8 | 46.5 | 63.8 | 78.9 | 87.3 |

P99 is not supported with n=32. A displayed 70 spans the **68.8th to 93.8th** current percentile across the nine bridge units; a displayed 90 spans 90.6th–100th. The 90th-percentile team rates 65.8 at receivers but 85.4 at run defense. The current display therefore does **not** give equal numbers equal standing. The matchup page compares different units directly (QB vs coverage, receivers vs coverage, OL vs pass rush, RB vs run defense) and colours both sides by the overall FORCE band (<41 / 41–<71 / ≥71). Those comparisons and colours inherit the mismatch; they are presentation-only and do not feed forecasts.

## 6. Cross-season comparability

**Verdict: exact cross-season comparability of the current formulas is UNMEASURABLE from repository inputs.** No archive holds like-for-like current-formula grades, priors, provider selections and control states for any earlier season. The bundled 2025 grades are pure 32-team ranks (mean 50.0, SD 29.8, range 0–100 for QB, OL, coverage, offense, receivers, front and rush) from a legacy pipeline with different definitions, so they cannot serve as a comparison season.

| Unit | Anchor class | What "90" means across seasons |
|---|---|---|
| Scoring/drive, coverage, run defense, prevention | Season-relative (current rank) | About the top 10% of *this* season, not a fixed points/EPA level |
| Receivers, RB | Current-season centre, 2025 spread | As far above this season's centre as the 2025 90th percentile was above 2025's |
| OL | Fixed 2025 anchor (raw rate, no centre alignment) | Closest to "same absolute pass protection", but only relative to 2025; a league-wide shift moves every team's grade |
| QB | Mixed | EPA/success use 2025 full-season scale but stabilize toward the current mean; ANY/A and CPOE are current-relative |
| Pass rush | Mixed by provider | Weekly fallback current-relative; PFR teams 2025-anchored, so the meaning depends on which provider a team gets |
| All priors | 2025 within-season standing, regressed | Prior-season relative standing |

**Within-season drift (measured).** Replaying the QB EPA component mapping on 2025 rolling windows (reference v5, assumed 37.75 plays/game, labelled approximation), the share of QB windows reaching ≥90 is 0.7% at one game, 2.5% at four, and 6.3% at seventeen (10% for a window-matched map). Under the current design, the same football quality earns a lower QB/WR/RB number early in the season. OL avoids this by matching window length: its 2025 reference p10–p90 narrows from .065–.265 (one game) to .115–.213 (seventeen) and the map follows it.

**Archives required for a valid comparison:** dated weekly inputs per season; the calibration references in force at each date; effective priors and prior-games/continuity state; QB context state; pass-rush provider selection per team and date; the weights and constants in force; and a frozen season-end archive of every grade under one formula version. MD-07's manual prospective capture format would supply most of these going forward.

## 7. Model use versus display only

- **Changing the displayed normalization today changes the model.** All nine bridge keys use the same field for display and bridge math. `delta = displayed grade − effective prior` feeds `bridgePoints`, hence `currentRatings()`, every forecast, season projection, ranking and historical game state.
- **Already display-only:** both composites, the team-efficiency diagnostic, matchup edge shares and colours, QB custom weights.
- **Can FORCE have A (model value) and B (display value) without changing predictions? Yes, within the demonstrated boundary.** A model-neutral solution requires separating the model-consumed value from the presentation-consumed value. It could be a distinct stored display field, a render-time presentation transform, or an equivalent architecture in which the bridge continues to consume the untouched model value. The invariant that matters is that presentation changes never alter the bridge/model input, not the storage mechanism. Prototype: for each candidate mapping, a separate display object was attached and the bridge recomputed from the unchanged model values. Elo changed by exactly 0 for all 32 teams under all three candidates (asserted in `check.mjs`). The same mappings applied to the shared field instead (to both current and prior) move team Elo by up to 12.0–22.0 points and team FORCE rank for 10–17 teams (Section 11). This is a finding, not an implementation recommendation.
- **That separation does not exist today** for the nine bridge keys.

## 8. MD-07 interaction

- **RB after the accepted correction:** displayed SD 18.89 (frozen pre-correction 18.61), ranks 6–15 span 18.16 (16.79), seven teams ≥70 (five), rolling-6 packing 6 (6). RB passes all three MD-07 packing conventions. Its SD is second lowest of the nine bridge units, beside OL (17.75) and receivers (19.82), and all three are the units mapped against 2025 references. RB is therefore not unusually compressed for its mapping family, but the reference-mapped family is systematically narrower than the rank family (23.7–25.9).
- **Receiver stabilization contributes computationally to the compression.** Holding the reference, centre alignment and downstream mapping fixed and removing only the opportunity shrinkage widens receiver live SD from 22.2013 to 30.2907 (ratio .733), ranks 6–15 span from 7.1682 to 21.9918, and teams ≥70 from 5 to 8. The median receiver stabilization weight at Week 4 is .54. This demonstrates the computational contribution of stabilization. It does **not** establish that the stabilization is wrong, that the underlying receiver measurement is accurate, that compression should be removed, or that a wider distribution would be more predictive. The same descriptive ablation gives ratios of .648 for RB and .740 for the QB EPA component. The CDF itself is monotone and faithful to its reference.
- **OL anchor/reference drift is an open measurement question with model consequences, not a proven normalization defect.** The 2025 4-game reference median is .1545085; the pooled 2026 rate is .1698456, which maps to live 37.6797. The OL channel has a **negative league-wide mean** (mean OL bridge delta −7.69, about −0.31 midpoint FORCE points per team before the cap), but individual teams contribute positively: **13 teams have positive OL deltas and 19 negative** (largest: BAL +32.0586, SF +27.5110). Plausible explanations all remain open: genuine league-wide protection deterioration, provider or definition drift, hit/sack recording changes, sample or window composition, and an anchor/reference mismatch. Receivers also have a negative mean delta (−4.08; 14 positive, 18 negative), from a skewed distribution.
- **The bridge assumes comparable grade points.** Fixed weights multiply grade-point deltas, but rank units are uniform by construction while reference units inherit stabilization-dependent spread. Section 11 quantifies the resulting effective weights.
- Defense-composite packing (C3, 8 teams) remains an arithmetic display effect of averaging four partially independent grades before soft-tail expansion.

## 9. Candidate normalization philosophies (evaluated, none adopted)

| Option | Interpretability | Predictive neutrality | Cross-unit | Cross-season | Outliers / small samples / drift | Provider dependence | Migration / UX | Bridge recalibration |
|---|---|---|---|---|---|---|---|---|
| **A. As-is** | Mixed: percentile of three different populations, then blended | Neutral (no change) | Not comparable (70 = 69th–94th pct) | Mostly season-relative; OL 2025-absolute | Rank units always fill 0–100; reference units drift with sample size | Pass rush changes family by provider | None | None |
| **B. Fixed absolute anchors** | High where a stable raw scale exists ("70 = X EPA/target") | Neutral only as a presentation layer | Comparable only if anchors are calibrated to a common standing | Best, if raw definitions and environment are stable | Honest tails; small samples need window-matched anchors | Needs per-provider anchors | Needs pinned multi-season references, absent for coverage, run, drive and weekly pass rush | Yes if used as model input |
| **C. Standardized within unit** (fixed mean/SD or robust) | "Standard deviations from average" | Neutral only as a presentation layer | Comparable in SD units, not in football value | Only with a fixed historical mean/SD; season-relative if refitted | Tanh tails needed; SD unstable early | Moderate | Moderate | Yes if model input |
| **D. Percentile display** | Simple: "better than X% of teams this season" | Neutral only as a presentation layer | Equal standing by construction | Season-relative by definition | Full-range spacing is expected by design under relative-standing semantics; under evidence-strength/absolute-separation semantics it may overstate weakly separated units | Low | Easy to explain; reads as standing, not magnitude | Yes if model input |
| **E. Model + presentation separation** | Whatever the presentation map is | **Neutral by construction** while the bridge reads the untouched model value | Chosen per presentation map | Chosen per presentation map | Model keeps current calibration | Unchanged | Stored field, render-time transform or equivalent; exports and documentation; UX-41 consumes the presentation value | **No** (model untouched) |

Guardrail, in neutral form: a display transform must not imply more information about underlying performance magnitude than the chosen semantics and the measurement support. Percentile spacing must not be described as performance magnitude unless supporting evidence justifies that interpretation.

## 10. Offline prototypes

Three display maps were fitted per unit on the post-correction Week-4 values ([candidate_display_mappings.json](results/candidate_display_mappings.json), with 32-team before/after tables, spacing, crossings and floor/ceiling counts). B is not prototyped: four units already use fixed 2025 references at the live layer (Section 4 classifies their thresholds), and the rest have no pinned like-for-like historical reference in the repository. All maps are monotone (Spearman 1 for every unit).

| Prototype | Display SD after (bridge units) | Receivers ranks 6–15 span | Teams ≥90 after (sum of nine units) | Main effect |
|---|---|---|---|---|
| C. 50+50·tanh(0.3·z), robust z | 10.3–15.5 | 5.5 → 3.5 | 0 (was 9) | Compresses every unit; removes all 80s/90s; OL gains, everything else loses |
| D. Hazen percentile | 28.9 (every unit identical) | 5.5 → 28.1 | 27 (3 per unit) | Spreads every unit to about 1.6–98.4 and widens receiver middle-rank spacing about fivefold, creating three receiver grades ≥90 that do not exist today. Expected by design if the number means relative standing this season; may overstate weak or compressed separation if it is meant to preserve evidence strength or absolute separation |
| N. 50+15·Φ⁻¹(percentile) | 14.7 (identical) | 5.5 → 12.4 | 0 | Fixed 17.7–82.3 range; 90 becomes unreachable at n=32 |

Threshold crossings (e.g. D moves 7 receiver rooms up across 70; C moves 10 QBs down across 70) are listed per team in the JSON. These are illustrations of the philosophies' consequences, not candidates for adoption.

## 11. Bridge effective sensitivity and predictive risk

| Key | Nominal weight | Display SD | Delta SD | Mean delta | Positive / negative teams | 1-SD delta → Elo | Practical max pre-cap pts | Effective share (w·SD) | Variance share |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| Scoring/drive | .200 | 25.88 | 24.80 | +0.01 | 17 / 15 | 13.74 | 5.66 | .207 | .293 |
| QB | .120 | 23.67 | 25.24 | +2.27 | 18 / 14 | 8.39 | 2.75 | .127 | .182 |
| Receivers | .080 | 19.82 | 19.38 | −4.08 | 14 / 18 | 4.30 | 2.02 | .065 | .063 |
| OL | .080 | 17.75 | 20.52 | −7.69 | 13 / 19 | 4.55 | 1.77 | .069 | .053 |
| RB | .070 | 18.89 | 21.75 | +0.22 | 15 / 17 | 4.22 | 2.03 | .064 | .046 |
| Coverage | .162 | 23.95 | 22.97 | +0.01 | 15 / 17 | 10.31 | 4.07 | .156 | .157 |
| Pass rush | .072 | 25.74 | 24.64 | −0.44 | 18 / 14 | 4.91 | 2.01 | .074 | .042 |
| Run defense | .126 | 24.90 | 28.48 | −0.10 | 15 / 17 | 9.94 | 4.13 | .150 | .103 |
| Prevention | .090 | 23.69 | 23.69 | −0.01 | 16 / 16 | 5.91 | 1.80 | .089 | .062 |

Elo uses 5.54 per midpoint point upward and 5.816 downward. Nominal and effective influence differ. Run defense carries about 19% more influence than its weight (.150 vs .126); receivers about 19% less (.065 vs .080); OL 14% less. The variance share concentrates on scoring/drive (.293) and QB (.182), which correlate most with the total (.79, .80). These are descriptive shares, not causal attribution and not evidence of double counting. The theoretical maximum QB delta now follows the full display path including recency and the final clamp (70.45; it was 71.05 when recency was omitted).

**The cap is active for 8 of 32 teams** (GB, IND, KC, LV, NE, NYJ, PHI, SF); pre-cap points range −11.75 to +14.74. For those teams, unit-scale changes are partly absorbed by the cap. Prevention's fixed-50 prior and 10–90 display bound cap its channel at 1.8 points.

**Predictive risk:** applying a display map to the shared field (both current and prior) would move team Elo by up to 22.0 (C), 12.0 (D) or 20.5 (N); change team FORCE ranks for 16, 10 or 17 teams; move the cap-bound count from 8 to 1, 12 or 1; and shift a win probability against an equal opponent by up to 3.7, 2.0 or 3.5 percentage points. No such change can be recommended without full-stack predictive validation, which remains unavailable (MD-07).

## 12. Criteria for a future MD-08 authorization (branched by owner semantics)

The criteria are structured so they stay demanding without preselecting a display philosophy. The universal criteria always apply. The route criteria apply only to the route the owner's meaning contract selects. Machine-readable copy: [success_criteria.json](results/success_criteria.json).

**A. Universal / pre-decision.** An explicit owner-approved meaning contract per unit (population, season scope, absolute or relative). Raw, model and display layers identified. Anchor/reference provenance recorded (fitted, hand-selected or inherited). Prior and missing-data semantics documented and consistent with the live meaning; today priors are 2025 standings regressed to 15–85 and prevention is fixed at 50. No hidden production effect. Offline reproducibility. No unintended mechanical ceilings or floors unless deliberately documented; prevention's 10–90 display range at four drive-games is mechanical today.

**B. Display-only / model-neutral route** (presentation separated from the model value). Bridge/model values bit-identical; canonical team Elo and forecast outputs bit-identical (the prototype passes); monotonicity and rank preservation as the contract requires; threshold labels and legends disclose the reference population. A cross-unit equal-standing test applies **only** if equal-standing semantics is chosen. Today a displayed 70 is the 68.8th–93.8th percentile by unit, which would fail a ±5-point equal-standing test.

**C. Model-layer normalization route** (bridge/model inputs change). Bit-identical Elo is **not** required. Instead: pre-declared predictive non-inferiority or improvement; full-stack Brier, calibration, rank and stability validation; bridge weights and cap behaviour revalidated; historical/reference drift addressed.

**D. Relative-standing display route** (percentile-like). Wider spacing is not a failure in itself. Labels must state that the number expresses standing, not performance magnitude. Cross-unit percentile consistency under the chosen convention. Small-n (n=32) and tie behaviour inspected.

**E. Absolute / historically anchored route.** Stable reference anchors; cross-season comparability evidence from archived like-for-like inputs (currently unmeasurable); provider and definition stability, including the open OL anchor-drift question; football-performance thresholds with dimensional meaning.

**F. Standardized-distance route.** Fixed versus season-relative mean/SD defined; robustness and tail treatment defined; early-season stability verified.

**Spacing and tail tests (all routes).** Any such test must name its statistic (for example ranks 6–15 span or SD), its units (displayed grade points or reference percentile), and why the comparison follows from the chosen contract. Wider spacing or more high scores is not an automatic failure. Measurement questions that the ablations surface, such as the computational contribution of receiver stabilization, are resolved or explicitly accepted through measurement work, not settled by a display transform.

## 13. UX-41 dependency

UX-41 should not proceed until MD-08 settles:

- The meaning contract (criterion A).
- Whether a model/presentation separation exists (route B), because UX-41 must consume a presentation value rather than the model field.
- Whether equal colours or bands may be applied across units. Today `bandClass` 41/71 is the overall FORCE band reused for units with different standings.
- Threshold language. No uniform "elite/good/average" wording is supported by current evidence, because 70 means a different standing by unit and 90 is mechanically capped for prevention.
- Chart, legend and tooltip text stating the reference population ("this season" versus "2025 team-seasons").

Until then UX-41 would inherit the cross-unit mismatch in Section 5.

## 14. Recommended next MD-08 step

An **owner decision on the meaning contract and on model/presentation separation**, before any further engineering:

1. Choose what a unit number should mean: season-relative standing, historically anchored quality, or standardized distance; and whether equal numbers must mean equal standing across units.
2. Decide whether presentation should be separated from the model-consumed value (a stored field, render-time transform or equivalent). This research shows that such a separation keeps predictions unchanged, while changing the shared field does not.
3. Separately, and outside display design, consider authorizing two bounded measurement questions MD-08 surfaced. The first is an **OL anchor/reference-drift check**: the pooled 2026 rate maps to 37.7 and the mean OL bridge delta is −7.7, with 13 teams positive and 19 negative. The second is the existing **receiver stabilization** lead, whose computational contribution to compression is now quantified.

No normalization implementation should precede these decisions.

## Reproducibility

From the repository root (Node v26.7.0 used):

```text
node research/cycle9/md08_unit_normalization/check.mjs
node research/cycle9/md08_unit_normalization/analyze.mjs <scratch dir>
node --check research/cycle9/md08_unit_normalization/lib.mjs
node --check research/cycle9/md08_unit_normalization/analyze.mjs
node --check research/cycle9/md08_unit_normalization/check.mjs
```

`check.mjs` runs the following:

- Enforces seven input pins and source drift.
- Reproduces every frozen grade, live mapping, display path and bridge Elo.
- Cross-checks the post-correction RB priors against MD-07 frame B.
- Regenerates all eleven results and requires byte equality.
- Asserts two-layer neutrality, rank preservation and the variance-share identity.
- Asserts the correction invariants: QB conditional bounds through recency and final clamp, the OL target-60 tie-jump metadata, every threshold classification and its round-trip flag, the OL 13/19 sign split, both display-only and model-changing criteria routes, and the absence of blanket exact-inversion wording.
- Runs nine negative controls: tampered grade, wrong OL window, unfitted WR beta, pre-correction RB frame, shared-field change, perturbed inverse, QB bounds without recency, unclamped QB display, altered pin.
- Verifies the package checksums in [hashes.json](hashes.json).

No network, provider fetch or private file is used. Production code, data, tests, generated files and the test catalog are unchanged.
