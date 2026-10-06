# MD-08 follow-up research: OL drift and receiver stabilization

**Research only.** **Corrected after Codex independent review C** (MD-08 FOLLOW-UP NOT ACCEPTED): the first version evaluated rank stability at the live-grade layer, but the presentation seam consumes the final (blended) grade. Section 5 adds the final-grade analysis, and Sections 3–4 are revised accordingly. Decision INVESTIGATE; Execution REVIEW; Priority unset; MD-08 NOT COMPLETE. This package runs the two research-only follow-ups the owner authorized on 2026-10-05: (A) the OL anchor/reference-definition drift check and (B) the receiver stabilization/compression measurement. It does not choose, prototype for adoption or implement a display transform. No production code, formula, weight, prior, rating, presentation transform, threshold or display changed. Branch `cycle9/claude-md08-ol-receiver-followup` from exact main `6cf05419f89df7c9c8c3af228a3fb80080c6f686`.

The frozen Cycle 9 research package at `aa0ad397` ([../md08_unit_normalization](../md08_unit_normalization/README.md)) is untouched. This package re-verifies that package's own checksum list on every run, and imports two of its helper functions read-only. The frozen checker still passes on an export of `aa0ad397`. As documented, it still fails its `assets/app.js` pin at later tips.

Results: [reproduction](results/reproduction.json) · [OL drift](results/ol_drift.json) · [receiver stabilization](results/receiver_stabilization.json) · [cross-unit](results/cross_unit.json) · [final-grade sensitivity](results/final_grade_sensitivity.json) · [inputs and pins](inputs.json)

## Summary

| Question | Observed (fact) | Interpretation |
|---|---|---|
| Why is the OL channel negative on average? | Mean OL live grade is 40.70 and mean prior is 50.00, so the mean bridge delta is −7.69 (live weight .818). | The negative mean is almost entirely a league-level effect on a level-exposed channel. |
| Is it season stage? | Replaying 2025 games 1–4 through the production map gives a mean live grade of 49.50. Across the 14 2025 start weeks, the mean ranges from 44.50 to 53.75. | Season stage explains about 0.5 of the 9.3-point gap. |
| Is it a 2026 level shift? | 2026 team-mean disruption is .1688 against .1581 for 2025 games 1–4, a difference of +.0107. The bootstrap 95% interval is −.0093 to +.0307, and 15% of draws are ≤0. | The shift is real in the measurement but not distinguishable from one-stage sampling variation. It also sits inside 2025's own range of 4-game league means (.1512–.1692). |
| Is it provider or definition drift? | PFR, an independent charting provider, shows sack-or-hit per dropback up +.0101 for weeks 1–3, 2026 against 2025. In the same comparison sacks are **down** (−.0026) and pressures up (+.0314). | Provider-specific PBP drift is disfavoured. The rise is in hits, not sacks. Genuine change and league-wide hit-recording change cannot be separated with these data. |
| Is the OL spread stable? | The 2026 team SD is .0292. In 2025 it ranged .0414–.0538 across every 4-game start. The binomial noise SD at 2026 dropbacks is .0324. PFR shows the same narrowing (.0474 → .0314). | At Week 4 of 2026, between-team OL dispersion is no larger than binomial sampling noise would produce. The live OL grades currently carry little detectable between-team signal. |
| Receivers: does stabilization need more? | At Week 4 the residual between-team variance is .0099, against .0104 of modelled noise. Raw WR/TE split-half reliability across weeks is .23. A K sweep from 0 to 320 targets barely changes **live-grade** order (Spearman ≥ .994) but changes **final-grade** order: K 80→320 moves 21 teams by up to 7 places (Spearman .963). | The Week-4 receiver residual spread is compatible with the modelled noise level under the stated assumptions. K alters the final standings that reach the presentation seam, not only spacing. The right K cannot be determined from the committed data. |
| Does the OL level matter for final standings? | Subtracting the measured +.0107 from every team's raw disruption rate changes live grades by team-specific amounts (+3.13 to +9.78) and, in this counterfactual, moves no team's live rank. It moves 18 teams by up to 3 places in the final grade (Spearman .990). | The adjustment is uniform only at the raw-rate input; the CDF map makes the live-grade changes non-uniform. Final standings change after blending with unequal team priors. |
| Receivers: why is the mean negative? | The centre maps to 50 exactly, but live mean is 45.20 against a median of 53.05, a long lower tail. | The −4.08 mean delta is a shape effect, not level drift. |

## 1. Reproduction and provenance

- **Production reproduction.** All 32 OL and receiver live grades, displayed/model values and receiver residuals reproduce from committed inputs with the BASE formulas. The maximum residual is 0. ([reproduction.json](results/reproduction.json))
- **Cycle 9 numbers reproduce at BASE.** These include:
  - OL display mean/SD 42.31/17.75
  - OL live median 35.28
  - pooled rate .16985 → 37.68
  - OL mean delta −7.69, with 13 positive and 19 negative teams
  - receiver display 45.92/19.82
  - receiver live SD 22.2013, and 30.2907 without stabilization
  - median reliability .540
  - receiver mean delta −4.08

  Each matches the frozen result files to 1e-9. OL and receiver formulas are unchanged since `aa0ad397`. `model/live_profiles.js`, the bridge, both data bundles, the snapshot and the reference are byte-identical (LF) to the frozen pins. `assets/app.js` differs only by the accepted identity seam.
- **2025 reference windows carry time and team.** Two separate pieces of evidence are involved.
  - *Chronological order* rests on the generator code and a structural test. `force_server.py` `_v104_reference_from_drive_games` sorts games by (week, game_id), appends teams on first appearance, and writes each team's windows in sequence. The bracket test confirms the stored arrays follow that sequence: every 2-game window lies between the two 1-game windows at the same array positions (512/512 for all four metrics), while a one-slot shift fails hundreds.
  - *Team identity per slot* (Week-1 2025 games by `game_id`, home then away) is validated separately against an independent provider: PFR per-game sack-or-hit rates, aligned game by game in week order, correlate .962 with the slot's 1-game windows; the away-first and rotated controls give −.046 and −.031. This validates the team mapping and is consistent with the chronological direction, but it is not by itself the chronology proof.
  - Together they make a season-stage replay of 2025 possible.
- **Weekly 2026 caches agree with the snapshot.** The two Week-4 bye teams (ATL, NO) match exactly. Week 4 for the other teams is taken as the snapshot total minus weeks 1–3.

## 2. OL drift

**Construction (traced from code).** PBP normal dropbacks (downs 1–4, attempt or sack, no spike/no-play) → disruption = sack OR qb_hit, counted once → team rate pooled over the season to date (no opponent, run-block or context adjustment, no stabilization) → `continuousPercentileValue` against all 2025 rolling windows of the same game count (n=448 at four games), lower better, **no centre alignment** → blend with the regressed bundled 2025 `olIndex` prior → bridge delta and the identity presentation seam. Line anchors are in [ol_drift.json](results/ol_drift.json).

**Season stage (2025 replay, four-game windows mapped through the production map).**

| 2025 games | Team mean rate | Team SD | Live mean | Live median | Live SD |
|---|---:|---:|---:|---:|---:|
| 1–4 | .1581 | .0509 | 49.50 | 41.07 | 30.93 |
| 5–8 | .1542 | .0462 | 53.35 | 60.49 | 28.91 |
| 9–12 | .1557 | .0490 | 52.00 | 54.69 | 28.46 |
| 14–17 | .1692 | .0538 | 44.92 | 40.63 | 29.68 |
| range over 14 starts | .1512–.1692 | .0414–.0538 | 44.50–53.75 | 40.63–60.49 | 26.52–30.93 |
| **2026 Week 4** | **.1688** | **.0292** | **40.70** | **35.28** | **19.99** |

- **Facts.** In 2025 the four-game league level moved by about .018 within one season, and late-season windows were higher. Live medians of 40–41 occurred at 2025 stages too, because the reference CDF is right-skewed in the rate. The reference mean (.1585) maps to 47.08, and the 2025 games 1–4 team mean maps to 47.75.
- **The Cycle 9 pooled-rate frame.** Cycle 9 reported, correctly, that the pooled 2026 rate maps to 37.68. The like-for-like comparison is team-mean against team-mean at the same stage: 38.61 for 2026 against 47.75 for 2025. About 3 of the apparent 12-point gap below 50 is skew of the map, not drift.
- **Level.** Removing the +.0107 level difference raises the 2026 mean live grade to 47.85. The OL channel mean delta then becomes −1.84 instead of −7.69, still with 13 positive teams. Level sensitivity is about 3.4 mean-live points per +.005 of league disruption rate.
- **Cross-provider.** PFR sack-or-hit per dropback (weeks 1–3) is .1438 in 2025 and .1538 in 2026. Sacks went from .0631 to .0605 and pressures from .2012 to .2326. PBP (Week 4) and PFR (weeks 1–3) rates correlate .768 across 2026 teams.
- **Spread.**
  - The 2026 team SD (.0292) is below every 2025 start (.0414–.0538) and below the binomial noise expected at 2026 dropbacks (.0324). Its variance ratio to 2025 games 1–4 is .33.
  - Under a no-true-difference probe (2,000 binomial replications), 28% of rate SDs fall at or below the observed .0292. Under a probe that gives each team its 2025 season rate re-centred to 2026, 0% do.
  - PFR shows the same narrowing in 2026 (SD .0474 → .0314).
  - The live SD of 19.99 matches the no-difference probe (median 20.30), not the 2025-like probe (27.81).
- **Reliability and persistence.**
  - The 2025 split-half (odd/even games) is .708, which implies four-game reliability .53 and full-season .83.
  - 2025 games 1–4 against games 5–17 correlate .46.
  - The 2025 season against 2026 Week 4 correlates .22.
  - The prior's bundled 2025 `olIndex` tracks the 2025 PBP season rate closely (−.875, lower rate = higher grade). It correlates with 2026 live OL at only .25.
- **Is it OL-specific?** OL is level-exposed by construction: a raw rate against fixed 2025 windows with no centre alignment. So are the four PFR pass-rush teams. Receivers and RB are re-centred. Rank units cannot move with league level. QB EPA/success are stabilized toward the current mean, so they are partly exposed; that is not quantified here. The same hit events that lower OL grades are not credited league-wide to defenses, because weekly pass rush is a current rank (Cycle 9 pass-rush mean delta −0.44). For comparison, 2025 four-game league means for QB EPA/play ranged −.022 to .081, and pass success .463 to .502.

**What the evidence establishes.**
1. The negative OL channel mean is a level effect on the one offensive channel without centre alignment.
2. Season stage contributes little.
3. The 2026 level rise is corroborated by an independent provider and is hit-driven.
4. 2026 Week-4 OL dispersion is at the sampling-noise floor, as measured by both providers.
5. Removing the measured level shift leaves live-grade order unchanged but changes final-grade order (Section 5).

**What it does not establish.**
1. That the level rise is genuine football change rather than league-wide hit recording, since both providers chart hits.
2. That it is statistically distinguishable from one-season-stage sampling variation.
3. Whether the low 2026 dispersion persists.
4. Any predictive consequence.

## 3. Receiver stabilization

**Construction (traced from code).** WR/TE receiving EPA per target → partial QB-environment residual (β .5880, ridge-fitted on 2025 bundled teams; centre .0615) → `stabilizeToward` the current target-weighted residual (.1984) with 80 targets → centre aligned onto the 2025 reference median (.2547) → `continuousPercentileValue` against 32 unstabilized 2025 full-season team residuals (mean 327.7 targets) → blend with the regressed 2025 residual percentile prior.

- **Noise and signal at Week 4 (facts with stated models).**
  - Week-to-week variation within teams (94 df) gives σ² = 2.815 per target. That is an upper bound on pure sampling noise, because it includes opponent and game-script variation.
  - On raw WR/TE EPA/target, between-team variance is .0380 against expected noise of .0290. Implied reliability is .24, and the implied stabilizer is about 311 targets.
  - Raw split-half reliability (weeks 1+3 against 2+4) is .23 at four weeks.
  - For the residual actually graded, between-team variance is .0099. Modelled noise is .0104 under an equal-per-play-variance overlap model, because the QB attempt EPA contains the same targets.
  - So the Week-4 residual dispersion is compatible with the modelled noise level and not clearly distinguishable from it under these assumptions. That does not show there is no between-team receiver signal. The estimate is sensitive: with 10% less noise variance the implied residual reliability is about .06, and with 20% less about .17 (`sensitivityToNoiseScale` in the JSON). σ² is an upper bound, play sharing between receiver and QB EPA makes the overlap model approximate, and weekly residuals cannot be formed from the committed feeds.
- **QB coupling.**
  - In 2026, raw receiver EPA correlates .950 with QB attempt EPA; the residual still correlates .790.
  - In the 2025 reference, the residual against QB pass EPA correlates .451 (raw .835).
  - Receiver live against QB live correlates .761.
  - The Week-4 residual is therefore more QB-coupled than the reference it is mapped against. Shared play noise contributes to that mechanically.
- **Volume.** Targets do not predict the live grade (r .013) or the residual (r .043). Lower-volume rooms sit slightly closer to 50 (targets against |live − 50|, r −.21). No systematic volume bias is visible at Week 4.
- **Diagnostic alternatives (research space only, none proposed).**

| Stabilizer K (targets) | Live SD | Ranks 6–15 span | ≥70 | Live-grade Spearman with production |
|---|---:|---:|---:|---:|
| 0 | 30.29 | 21.99 | 8 | .996 |
| 40 | 26.07 | 12.40 | 5 | .999 |
| **80 (production)** | **22.20** | **7.17** | **5** | **1** |
| 120 | 19.57 | 5.70 | 3 | .999 |
| 200 | 16.54 | 3.66 | 1 | .998 |
| 320 | 14.03 | 2.85 | 0 | .994 |

  A current-season rank of the production live value would have SD 29.78 with identical live order. These are live-grade statistics; final-grade (presentation-input) order is in Section 5.
- **Synthetic probe.** True residuals are set to the 2025 reference, or to the reference deconvolved for its own full-season noise (spread factors .824 or .304). Each room keeps a 2026 Week-4 target count. The production path is run 2,000 times.
  - Production K=80 would show a live SD of 26.2–29.9 and a ranks 6–15 span of 20.9–28.0, against the observed 22.20 and 7.17.
  - Under the overlap noise model, the K=80 Spearman with truth is .59–.66 at four games, rising to .82–.86 at 17.
  - Mean absolute percentile error is lowest near K=80 under the overlap model and near K=320 under the upper-bound model.
  - The observed 2026 receiver distribution is narrower than every probe. The noise model therefore overstates residual noise, or 2026 receiver rooms are unusually homogeneous, or both. The committed data cannot separate those.
- **Mean delta.** The −4.08 channel mean is shape: live mean 45.20, median 53.05, p10 19.81, p90 72.86.

**What the evidence establishes.**
1. Stabilization strength barely changes live-grade order but does change final-grade order after the prior blend (Section 5).
2. The Week-4 receiver signal is weak on the raw scale (reliability about .23), and residual dispersion is compatible with the modelled noise level under the stated assumptions.
3. Receiver grades remain strongly QB-coupled after the partial residual.
4. Receiver channel negativity is distribution shape, not level.

**What it does not establish.**
1. The correct stabilizer.
2. Whether the receiver model needs redesign.
3. Whether wider or narrower receiver grades would predict better.

No receiver model change is proposed.

## 4. Cross-unit synthesis (corrected)

1. **Is the canonical 0–100 scale still unsuitable as a direct public semantic scale?** Yes. On top of Cycle 9's cross-unit mismatch, the OL value moves with league-wide hit rates (mean live 44.5–53.8 across 2025 stages, 40.7 in 2026), and receiver values carry shape and stabilization-dependent spacing. Neither number is a current-season standing.
2. **Is the identity model/presentation seam still the right architecture?** Yes. It isolates presentation from model computation: any presentation transform reads the final grade and cannot change the model. That conclusion does not depend on the rank results corrected here.
3. **What does a current-season standing transform solve?** It removes differences in the numeric *spacing* of whatever final ordering reaches the seam. That covers the OL level offset in the displayed number, receiver compression, and the cross-unit differences in what a given number means. Every unit would then show the same standing scale for the same final rank.
4. **What does it not solve?** It cannot remove *ordering* changes introduced upstream by calibration, stabilization and blending with team-specific priors. Those reach the seam already inside the final grade. The OL level-matched counterfactual subtracts one league-level amount from every raw disruption rate. The nonlinear 2025 CDF map turns that into team-specific live-grade changes (+3.13 to +9.78); in this counterfactual no live rank changed, but after blending it moves 18 teams by up to 3 places. Receiver K alternatives move few live ranks (4–11 teams, at most 3 places), but after blending they move 10–21 teams by up to 7 places. A standing display would show those final-order differences in full.
5. **How sensitive are final standings to receiver K alternatives?**
   - K 80→40: Spearman .981, 19 teams move, maximum 6 places, 20 pair reversals.
   - K 80→120: .997, 10 teams, 2 places, 6 reversals.
   - K 80→200: .985, 19 teams, 5 places, 18 reversals.
   - K 80→320: .963, 21 teams, 7 places, 33 reversals. BAL drops from 4th to 11th, NO from 5th to 12th, and DET rises from 11th to 5th.
   - Section 5 has the full table.
6. **How sensitive are final standings to the measured OL level counterfactual?** Spearman .990, 18 teams move, maximum 3 places, 15 reversals, with no top-5 or top-10 membership change. In this counterfactual no team's live rank changes (DAL and MIA are tied in both vectors), although live-grade changes differ by team (+3.13 to +9.78). That is an empirical result for this adjustment, not a general property of uniform input changes.
7. **Does the evidence establish that standing is preferable to all value-based transforms?** No. This package ran no standardized or other value-based presentation candidate through these counterfactuals. Two things are established. First, for any strictly increasing, unrounded presentation transform the final-rank sensitivity above is *identical*, because such a map preserves order exactly. So these counterfactuals cannot discriminate between such candidates. Transforms that can create ties (rounding, bucketing, clipping or other non-strict steps) are not covered by this statement. Second, structurally, rank transforms discard final-grade spacing and keep ordering, while value-based transforms keep some magnitude and spacing information, including the artifacts in it. The earlier claim that value-based mappings would fare worse is withdrawn as untested.
8. **Is MD-08 ready for an owner decision among display-transform candidates?** Research recommendation, not a decision: yes, with the quantified sensitivity disclosed. The corrected evidence does not expose a blocking research question for the presentation choice. The final-rank sensitivity is a property of the model value that every monotone presentation candidate inherits equally, so further presentation research cannot reduce it. Whether that sensitivity is acceptable for a standing-based display is the owner's judgement. If the owner judges it unacceptable, the remedy is model-layer (stabilization, prior blend), not a different transform. The two model-layer questions below remain open and are not presentation blockers.
   - (a) Receiver residual reliability at k-game windows, which bears on the right K. It needs 2025 play-level data (the pinned `play_by_play_2025.csv.gz`, sha256 recorded in the V149 reference), and fetching it needs separate authorization.
   - (b) Whether the 2026 OL hit-rate rise and low dispersion persist at later dated snapshots. That needs prospective capture.

Other questions:
- **Are the 50–90 distributions stable enough to design against?** Not for value-based designs that rely on fixed numeric levels. The OL live median ranged 40.6–60.5 across 2025 stages, and receiver spacing depends on K and noise. Rank-based designs do not depend on spacing, but they inherit final-order sensitivity (point 4).
- **Unit-specific stabilization before presentation normalization:** no unit is shown to *require* it for a presentation decision. Both the OL level exposure and the receiver stabilizer do change final standings, so they are model-layer questions whose effect a standing display would show (points 5 and 6).
- **Unequal certainty:** four-game reliability differs by unit (OL .53, QB success .44, QB EPA .31 in 2025; receivers about .23 raw in 2026). Equal displayed standing will carry unequal certainty, which is a disclosure question.
- **Does new evidence invalidate an accepted Cycle 9 conclusion?** No. About 3 points of the OL "37.7" framing is skew of the CDF map, and the open OL causes narrow to a hit-driven level rise with no detectable season-stage or PBP-specific provider component. Receiver stabilization's computational contribution is confirmed. The first version of this package called that contribution "spacing-only". Spacing was the dominant effect at the live layer, but small nonzero ordering changes also occurred there (K 80→40/120/200/320 move 6/4/6/11 teams by at most 1/1/2/3 places), and final-layer movements are larger after blending with unequal team priors (Section 5); the "spacing-only" wording is corrected here.

## 5. Final-grade sensitivity (the presentation input)

The seam reads the final grade: live grade → production `blend(team prior, live, games, priorGames)` → `unitDisplayGrade` (identity, asserted). OL and receivers have no post-blend recency or clamp, so this is the complete production path after the live grade, and it reproduces every displayed value exactly. Counterfactual live grades come from the production stabilize/align/CDF functions. Rank convention: exact numeric equality defines a tie, and tied teams share the average (mid) rank, descending (rank = 1 + number of strictly higher grades + (number of exactly equal grades − 1)/2). A team moves when its midrank changes, and moves are absolute midrank differences. Spearman is Pearson on midranks. Kendall is **tau-b** over all 496 pairs: (concordant − discordant)/√((496 − pairs tied in base)(496 − pairs tied in alternative)). Pair reversals are discordant pairs; tied pairs are counted separately and are neither concordant nor reversed. The only tie in any compared vector is the OL live grade of DAL and MIA (identical raw rate and game count), tied in both production and the counterfactual (1 tied pair). No final-grade vector has a tie, so final-layer tau-b equals tau-a. The first version labelled (concordant − discordant)/(concordant + discordant) as tau-a; that formula excludes tied pairs. Under the corrected convention no reported value changes (for OL live, tau-a would be .9980; tau-b is 1). Codex review C's values (K40: .980572/19/6/20; K320: .962977/21/7/33; OL: .990469/18/3/15) reproduce exactly and are asserted in the analysis. ([final_grade_sensitivity.json](results/final_grade_sensitivity.json))

| Counterfactual | Layer | Spearman | Kendall tau-b | Teams moving | Max move | Mean / median move | Pair reversals | Top-5 change | Top-10 change |
|---|---|---:|---:|---:|---:|---|---:|---|---|
| Receiver K 80→40 | live | .9989 | .9879 | 6 | 1 | 0.19 / 0 | 3 | none | CAR out, KC in |
| | **final** | **.9806** | **.9194** | **19** | **6** | **1.13 / 1** | **20** | none | HOU, PHI out; BUF, MIN in |
| | final, equal priors (control) | .9978 | .9758 | 12 | 1 | 0.38 / 0 | 6 | none | none |
| Receiver K 80→120 | live | .9993 | .9919 | 4 | 1 | 0.13 / 0 | 2 | none | none |
| | **final** | **.9971** | **.9758** | **10** | **2** | **0.38 / 0** | **6** | none | PHI out, DET in |
| | final, equal priors | .9974 | .9758 | 11 | 2 | 0.38 / 0 | 6 | none | none |
| Receiver K 80→200 | live | .9978 | .9798 | 6 | 2 | 0.25 / 0 | 5 | none | none |
| | **final** | **.9853** | **.9274** | **19** | **5** | **1.06 / 1** | **18** | NO out, LV in | KC out, DET in |
| | final, equal priors | .9872 | .9315 | 16 | 6 | 0.81 / 0.5 | 17 | none | none |
| Receiver K 80→320 | live | .9938 | .9556 | 11 | 3 | 0.56 / 0 | 11 | none | none |
| | **final** | **.9630** | **.8669** | **21** | **7** | **1.63 / 1** | **33** | BAL, NO out; DET, LV in | BAL, NO out; DET, SEA in |
| | final, equal priors | .9905 | .9435 | 14 | 5 | 0.69 / 0 | 14 | none | none |
| OL level-matched (rate − .0107) | live | 1 | 1 | 0 | 0 | 0 / 0 | 0 | none | none |
| | **final** | **.9905** | **.9395** | **18** | **3** | **0.88 / 1** | **15** | none | none |
| | final, equal priors | .9993 | .9919 | 4 | 1 | 0.13 / 0 | 2 | none | none |

Largest final-grade moves:
- K 80→40: MIN 15→9, BUF 12→7, DET 11→14, HOU 9→12.
- K 80→200: NO 5→10, DET 11→8, KC 8→11.
- K 80→320: BAL 4→11, NO 5→12, DET 11→5, HOU 9→6.
- OL: LAR 14→11, SEA 17→20, DAL 11→13.

**Why live order is stable while final order moves.** Each final grade is `w·live + (1−w)·prior`. The weight w = g/(g+k) has a median of .82, the prior SD is about 20 for both units, and priors differ by team. The OL counterfactual shifts every raw rate by the same amount, which the nonlinear CDF map turns into live-grade changes of +3.13 to +9.78 that differ by team. Receiver K changes live spread (live SD 22.2 → 14.0 at K=320). Either way, live grades move by different amounts relative to fixed and unequal prior gaps, so teams cross in the final grade even where live ranks do not change. When every prior is set to 50 (the control), most of the final-order change disappears: OL goes from 18 movers to 4, and receiver K=320 from 33 reversals to 14. The remainder comes from unequal blend weights (3-game teams and team-specific prior games) and from the small live-order changes. At K=120 and K=200 the equal-prior control moves about as much as production, so there the residual live-order and weight effects dominate.

**Scope.** These rank statistics hold identically for any strictly increasing, unrounded presentation transform. They quantify how much final standings depend on two model-layer choices; they do not say whether that amount is acceptable, and none of the alternative K values or the level-matched OL is proposed.

## Limitations

- One prior season, one 2026 snapshot (Week 4) and weekly caches through Week 3.
- No year-to-year variance, so the significance of the 2026 level and spread is judged against one season's within-season variation and bootstrap sampling only.
- 2025 split-half halves average one-game rates unweighted by dropbacks.
- PFR dropbacks are derived as pressures ÷ pressure rate. Rows with zero pressures cannot be sized and are excluded: 9–69 rows by slice, counted in the JSON.
- σ² is an upper bound, and the residual noise model is an approximation; the "compatible with modelled noise" result is sensitive to the noise estimate.
- Final-grade counterfactuals hold each team's prior and blend weights fixed at the Week-4 snapshot.
- Synthetic probes assume independent plays and normal (receivers) or binomial (OL) noise.
- n=32 throughout. No predictive validation is available, as for MD-07 and Cycle 9.

## Adversarial checks

`check.mjs` runs nine negative controls:
- an altered input pin
- a changed frozen-package file
- the wrong OL window
- a different receiver stabilizer
- the wrong 2025 slot-to-team mapping (fails PFR validation)
- a reordered 2-game reference (fails the chronology bracket)
- a missing weekly cache week (fails bye-team reconstruction)
- live-grade ranks substituted for final grades (fail to reproduce the final-layer movements)
- a non-identity presentation transform (breaks the final-grade path reproduction)

Embedded controls show:
- the shifted-alignment chronology test fails hundreds of windows
- the away-first and rotated team mappings correlate ≈0 with PFR

## Reproducibility

From the repository root (Node v26.7.0):

```text
node research/cycle9/md08_followup_ol_receivers/check.mjs
node research/cycle9/md08_followup_ol_receivers/analyze.mjs <scratch dir>
```

`check.mjs` does the following:
- enforces 13 input pins and the frozen package's own checksums
- reproduces the production OL and receiver path and the Cycle 9 values
- reproduces the final-grade path through the production blend and the identity seam, and Codex review C's final-grade values
- regenerates all five results and requires byte equality
- asserts the reported numeric findings
- runs the negative controls
- verifies [hashes.json](hashes.json)

The synthetic probes are seeded (20261006, 808, 4242). No network is used. Production code, data, tests, generated files and `public/` are unchanged.
