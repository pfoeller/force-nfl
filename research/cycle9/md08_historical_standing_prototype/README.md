# MD-08 historical-standing display prototype

**Prototype and evidence only.** The owner has chosen the presentation direction: a common historical-standing 0–100 scale. In it, 0 is the worst and 100 the best observation in a unit's historical FORCE reference population, about 50 is ordinary historical quality, and 10/90 are not caps. This package tests what can honestly be built today. It does not implement anything, and the transform is NOT AUTHORIZED for production.

MD-08 status is unchanged: Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE. UX-41 is NOT AUTHORIZED.

- **Branch:** `cycle9/claude-md08-historical-standing-prototype`, from the accepted follow-up tip `4818619cb48b928f187929a75013f575ced5185d` (base main `6cf05419`).
- **Unchanged:** production code, formulas, priors, stabilizers, weights, grades, the identity seam (asserted to be the identity) and `public/`.
- **Corrected after Codex review B** of `2465c8e`. Six corrections were made:
  1. defense reproduction labelling
  2. Candidate C numerical saturation
  3. median semantics for 3-game and 4-game references
  4. V149 QB component history
  5. a bounded stage-matching conclusion
  6. actual displayed order compared with final order

Results:
- [availability](results/availability.json)
- [32-team tables, every candidate × reference](results/team_tables.csv)
- [distributions, dynamic records and leaders](results/distributions.json)
- [edge semantics](results/edge_semantics.json)
- [stage and cross-unit tests](results/stage_and_cross_unit.json)
- [sensitivity](results/sensitivity.json)
- [reproduction](results/reproduction.json)
- [inputs](inputs.json)
- [transforms](transforms.mjs)

## Headline findings

1. **No unit has a historical population of the quantity the seam receives.** The seam receives the final canonical grade: live grade blended with a regressed prior, plus QB recency and clamp. No past season's final grades exist in that semantics, so a historical standing of the final grade cannot be built honestly for any unit today. Every prototype here maps the unit's measured signal instead.
2. **The historical signals used here cover two seasons (2024–2025).** They come from the committed Cycle 7 game-level fixture, built from pinned nflverse PBP, with exact counts and 17 games for each of the 64 team-seasons.
   - Other component histories exist in the repository. The production V149 reference holds one season (2025) of QB pass-success-rate, QB pass EPA, QB EPA/play and OL disruption windows; for example, 448 four-game and 32 full-season success-rate observations. Neither source holds final grades.
   - "0" and "100" here therefore mean only the worst and best of 2024–2025 at the same stage (n = 64). That falls far short of the owner's intended "historical extremes".
   - Swapping 2024-only for 2025-only as the reference moves 2026 displays by 4.4–14.0 points on average and by up to 26.7.
3. **Supported at the signal layer:**
   - OL: disruption rate, identical to production. It matches the V149 2025 windows in 544 of 544 team-games.
   - Receivers: production's QB-partial residual, unstabilized.
   - Partial: QB (component histories only) and RB (rushing component only).
   - Not supported: defense overall, and the defensive subunits in current semantics.
4. **Comparing Week-4 signals with full-season populations is clearly inappropriate, and matching sample length is strongly supported.**
   - Out of sample, a full-season reference puts 8–15 of 64 Week-4 values on exactly 0 or 100. A same-length reference puts 0–3 there, whether it uses the first four games (S) or any four games (C).
   - For current 2026 teams, switching from S to full-season moves displays by 3.9–8.2 points on average (up to 18.7) and roughly doubles the count outside 10–90.
   - Among the tested designs, S is a reasonable and recommended reference. Exact calendar-stage matching is **not** shown to be uniquely necessary: C has no more endpoint hits than S in every unit and remains a plausible alternative that needs validation on deeper history.
5. **A signal-layer display would not follow the model order.**
   - Candidate A's actual displayed order differs from the final model order: Spearman .85–.96, with 23–28 teams moving by up to 8 places for OL and receivers and 13 for the RB rushing proxy.
   - That happens because priors and stabilization are excluded.
   - Choosing between the signal layer and the final grade is an architecture decision for the owner.

## 1. Historical reference availability by unit

**Three layers are distinguished:**
1. **The selected prototype fixture** (`research/cycle7/fixtures/unit_games.csv`, 2024–2025). It provides every historical signal this prototype uses.
2. **Other existing component references** (V149 `data/live-cache/c6cb7af1f41f107e7e3f.bin`, 2025 only). These are rolling 1–17-game windows of `qb_pass_epa`, `qb_epa_per_play`, `qb_pass_success_rate` and `ol_disruption_rate`, each with 544 one-game, 448 four-game and 32 full-season observations. They are not used by the prototype, but they show that further component populations exist.
3. **Historical final canonical grades.** None exist for any unit.

| Unit | Seam quantity | Historical data | Seasons | Form | Same semantics as current? | Verdict |
|---|---|---|---|---|---|---|
| QB | `qbIndex` five-component composite with context, prior, recency, clamp | Fixture: EPA/play (dropbacks + QB runs), used here. V149: pass success rate and sack-free pass EPA, 2025 only, not used. | 2024–2025 (fixture); 2025 (V149) | game-level → windows / season | Components only. ANY/A, CPOE and the rushing bonus have no committed history. Opponent/pressure context, stabilization, prior, recency and clamp cannot be replayed. | **PARTIAL** |
| OL | `olIndex`: live is the 2025-window percentile of the disruption rate, blended with a legacy prior | Hit-or-sack disruption per dropback | 2024, 2025 | game-level, exact dropbacks recovered | **Yes at the signal layer.** Fixture 2025 equals production V149 for all 544 team-games. The prior construct differs. | **SUPPORTED (signal)** |
| Receivers | `receiverIndex`: residual stabilized at 80 targets, centre-aligned, 2025 CDF, prior | WR/TE EPA/target and sack-free attempt EPA, giving the production residual (β .5880, centre .0615) | 2024, 2025 | game-level | Residual yes. Stabilization and alignment are not applied. Weekly-stat vs PBP aggregation of the same targets. | **SUPPORTED (signal, unstabilized)** |
| RB | `rbIndex`: 70% rushing + 30% residual receiving, stabilized, LIVE_FITTED prior | RB/FB rushing EPA/carry only | 2024, 2025 | game-level | Rushing only. | **PARTIAL** |
| Defense overall | `defenseIndex`: soft-tail composite of current-season ranks | None in current semantics | — | — | No. Rank components; prevention has no history; provider and construct differences. | **NOT SUPPORTED** |
| Coverage, pass rush, run defense, prevention | Current ranks / provider maps | Fixture has related signals | 2024, 2025 | game-level | No. Coverage adds a 25% CPOE share, pass rush uses a different provider, run defense excludes QB runs, prevention has no data. | **Inspected, not prototyped** |

Other properties of the reference:
- **Future information:** none. A window uses only its own games.
- **Positions:** classified on a full-season basis, a Cycle 7 boundary.
- **Release difference:** the QB fixture differs from V149 in 16 of 544 team-games (maximum .171). The two come from different nflverse 2025 releases.
- **External fetch:** a true multi-season history would need additional nflverse seasons processed by the same pinned Cycle 7 extractor. That fetch was not made; it needs separate authorization.

**Canonical reproduction before any transform.** This is limited to the current snapshot.
- **qb/receiver/OL/RB:** recomputed from the snapshot live grades and priors through the production blend (QB: recency and clamp) and the identity seam.
- **Defense** is evidenced at three distinct levels:
  1. *Snapshot consistency:* the stored `defenseIndex` agrees with the frozen baseline.
  2. *Recomputation from stored constituents:* `L.defenseCompositeFrom(stored display grades)` equals the stored value exactly for all 32 teams (residual 0).
  3. *Historical-input replay:* **not available**. The constituents are current-season snapshot grades, and defense is not rebuilt from raw inputs.

All five quantities match the frozen Cycle 9 baseline CSV within its 6-decimal rounding (≤4.9e-7).

## 2. Candidate transforms (exact definitions in [transforms.mjs](transforms.mjs))

All signals are oriented so that higher is better (OL disruption is sign-flipped). Standing is reported separately as 100 × (#worse + ½ #equal)/n.

- **A: empirical percentile with exact endpoints.**
  - Each distinct historical value is a knot at 100 × midrank/(n − 1). The worst value is forced to 0 and the best to 100.
  - Between knots the map is linear in the signal.
  - Below the worst → 0 and above the best → 100, both flagged.
- **B: smoothed empirical percentile.**
  - A Gaussian-kernel CDF with Silverman bandwidth, rescaled so the worst historical value = 0 and the best = 100.
  - Strictly increasing inside the range; 0/100 (flagged) outside it.
  - The sample median maps near, not exactly to, 50. In the tested references it maps to 47.7–52.6 for four games and 44.0–52.5 for three games (OL three-game: 44.04).
- **C: quantile mapping with open tails.**
  - Hazen positions 100 × (midrank + ½)/n with linear interpolation. The historical best maps to 99.22 and the worst to 0.78 at n = 64.
  - Beyond the range, a normal tail fitted to the reference fills the remaining headroom. The tail is asymptotic to 0 and 100 in exact arithmetic.
  - **Numerical contract (documented, not changed):** the simple implementation is kept. In double precision, sufficiently distant finite inputs saturate to exactly 0 or 100. For example, `candidateC([0,1,2,3], 100) === 100` and `candidateC([0,1,2,3], −100) === 0`. Every tested reference does the same for a value 1,000 ranges beyond its extreme.
  - The historical best itself never maps to 100 (99.22 at n = 64; 87.5 for `[0,1,2,3]`). So C still does not meet the owner's "100 = best historical observation".

Each candidate is applied with three references:
- **S:** first g games of each 2024/2025 team-season, where g is the team's current game count (3 or 4). n = 64.
  - ATL and NO (Week-4 bye) use three-game references. Displays are therefore monotone in the signal within each game-count group, but not necessarily across the two groups.
- **C:** every g-game window at any stage. n = 896 at four games.
- **F:** full season. n = 64.

## 3. Edge semantics

| Case | A | B | C |
|---|---|---|---|
| Equals the worst historical value | 0 | 0 | 0.78 (n = 64) |
| Equals the best historical value | 100 | 100 | 99.22 |
| Worse than the worst | 0, flagged `belowWorst` | 0, flagged | Between 0 and 0.78 via the normal tail; exactly 0 once double precision saturates |
| Better than the best | 100, flagged `aboveBest` | 100, flagged | Between 99.22 and 100; exactly 100 once double precision saturates |
| Tied with several historical values | Midrank of the block (OL example: 11.90; first-position 11.11, last 12.70) | Coincident kernels | Midrank Hazen |
| At the sample median | Near 50. 4-game: 50.000 in all units. 3-game: OL 49.603, others 50.000. Not a guarantee: a tied centre block shifts it (`[0,1,1,1,2,3]`: median 1 → 40). | 4-game 47.7–52.6; 3-game 44.0–52.5 | Near 50 (OL 3-game 49.609; tied-block example 41.667) |
| Between sparse observations | Linear between neighbours | Smooth | Linear between Hazen positions |

Midrank handling of ties is valid. "About 50" expresses ordinary, middle historical quality. Exact 50 is a property of some reference structures, not a mathematical guarantee.

**Frozen, dynamic and open-tail semantics** (prototyped in `distributions.json` → `dynamicRecordSemantics`):
- **Frozen reference (A/B).** The same signal always gives the same number. 100 means "at or beyond the frozen best", with records flagged but not distinguished.
- **Dynamic records (A/B).** The current season's same-length values join the reference. A new record becomes the new 100, and every other team's number can shift; up to 8.0 points in 2026 for OL. Published numbers then need the reference version to be reproduced. In 2026, the QB EPA leader (SF) and the worst QB (ATL) become the new endpoints, and receivers' LAC becomes the new 0.
- **Open tail (C).** Records stay distinguishable until numerical saturation, but the historical best shows 99.22. That contradicts "100 = best observation".

## 4. Sample length and stage

**Out-of-sample calibration.** Each season's games 1–4 windows are mapped against references from the other season only (n = 64 test values per unit).

| Unit | S (first four games): ≥80 / ≥90 / ≤10 / hits on 0 or 100 | C (any four games): same measures | F (full season): same measures |
|---|---|---|---|
| OL | 20% / 9% / 9% / 3 of 64 | 20% / 11% / 13% / 1 of 64 | 27% / 17% / 22% / **15 of 64** |
| Receivers | 25% / 20% / 16% / 2 of 64 | 11% / 8% / 9% / 0 of 64 | 28% / 13% / 27% / **12 of 64** |
| RB (rushing) | 19% / 13% / 13% / 3 of 64 | 16% / 11% / 8% / 1 of 64 | 16% / 14% / 28% / **8 of 64** |
| QB (EPA) | 20% / 14% / 17% / 3 of 64 | 14% / 9% / 16% / 0 of 64 | 20% / 14% / 19% / **9 of 64** |

- **Full season (F)** is clearly inappropriate for short-window current signals. Four-game values are noisier than season values, so too many current units would read as historical extremes.
- **Matching sample length (S or C)** is strongly supported. Both keep endpoint hits low.
- **S compared with C:** C has fewer endpoint hits than S in every unit, but a lower share ≥80 for receivers, QB and RB. With two seasons, those differences could come from:
  - calendar-stage effects
  - season-level shifts
  - overlapping-window composition
  - sampling noise (n = 32 per season)
  - some combination

  The prototype cannot separate these, and it does not establish a universal cross-unit calibration rule.

**Current 2026 effect (Candidate A, S compared with F):**

| Unit | Mean shift | Max shift | Outside 10–90 (S → F) |
|---|---:|---:|---|
| OL | 4.6 | 9.4 | 1 → 5 |
| Receivers | 6.1 | 18.7 | 7 → 14 |
| RB | 8.2 | 18.4 | 8 → 15 |
| QB | 3.9 | 11.2 | 6 → 14 |

**Conclusion:**
- Comparing short-window current signals with full-season populations is clearly inappropriate for this use, and matching sample length is strongly supported.
- Among the tested approaches, S is a reasonable, recommended reference design.
- Exact calendar-stage matching is not proven uniquely necessary, and C remains a plausible alternative that needs deeper-history validation.

## 5. Current 2026 outputs (Candidate A, S reference; full tables for every candidate × reference in [team_tables.csv](results/team_tables.csv))

| Unit | Min | p10 | p25 | Median | Mean | p75 | p90 | Max | SD | <10 | >90 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| OL | 6.7 | 17.4 | 26.0 | 35.5 | 41.5 | 55.9 | 72.6 | 88.8 | 21.6 | 1 | 0 |
| Receivers | 0 | 20.3 | 30.5 | 67.1 | 59.2 | 87.8 | 91.6 | 98.7 | 30.0 | 2 | 5 |
| RB (rushing) | 1.1 | 6.9 | 20.9 | 41.4 | 44.4 | 67.4 | 89.5 | 96.1 | 29.5 | 5 | 3 |
| QB (EPA) | 0 | 16.0 | 21.9 | 56.1 | 54.3 | 88.3 | 91.2 | 100 | 31.4 | 1 | 5 |

Distributions for B, C, any-stage and full-season references are in `distributions.json`.

**Best in 2026 or historically exceptional?** The labelling rule here is for research only: ≥95 is "historically exceptional", ≤5 is "historically awful", and a value beyond the reference is flagged.

| Unit | 2026 leader (A, S) | Reading | 2026 worst | Reading |
|---|---|---|---|---|
| OL | SF 88.8 (full-season reference: 97.3) | Best in 2026 only | LAC 6.7 (full-season: 0) | Worst in 2026 only |
| Receivers | SF 98.7 | Historically exceptional | LAC 0 (below the worst) | Below the 2024–25 first-four-game worst |
| RB (rushing) | BUF 96.1 | Historically exceptional | GB 1.1 | Historically awful |
| QB (EPA) | SF 100 (beyond the best) | Beyond the 2024–25 first-four-game best | ATL 0 (below the worst) | Below the 2024–25 first-four-game worst |

The OL row is the clearest case of the owner's distinction. SF leads the league but sits at the 89th historical standing among first-four-game windows. Against a full-season reference the same team would read 97, which illustrates the sample-length problem.

## 6. Cross-unit semantic test

- **By construction.** Under Candidate A with the S reference, 80 corresponds to the same historical standing (79.7) in every supported unit. For example: OL disruption .113, receiver residual .242, RB rushing EPA .014, QB EPA/play .171.
- **Out of sample.** Equal displays carry approximately comparable standing when the reference matches the sample length. S is near 20% ≥80 for all four units. C varies by unit (11–20%), and F distorts most.
- **Residual mismatches.** Four things still pull equal displays apart:
  - The two-season sample, which makes extremes depend on which season is included.
  - Unequal reliability of four-game signals (OL .53, QB EPA .31, receivers about .23, from earlier MD-08 research). An 80 is a noisier claim for receivers than for OL.
  - Partial constructs for QB and RB.
  - Exclusion of priors and stabilization at the signal layer.

## 7. Sensitivity (Candidate A, S as base; mean / max absolute display change)

| Change | OL | Receivers | RB | QB |
|---|---|---|---|---|
| Any-stage reference (C) | 2.4 / 10.1 | 4.5 / 11.2 | 2.5 / 8.0 | 4.1 / 10.4 |
| Full-season reference (F) | 4.6 / 9.4 | 6.1 / 18.7 | 8.2 / 18.4 | 3.9 / 11.2 |
| 2024 only vs 2025 only | 6.8 / 14.3 | **14.0 / 26.7** | 4.4 / 10.4 | 10.7 / 17.0 |
| Tie convention (first or last position vs midrank) | 0.006 / 0.19 | 0 | 0 | 0 |
| B vs A (smoothing) | 2.1 / 3.9 | 2.2 / 7.3 | 1.6 / 4.1 | 1.7 / 5.1 |
| C vs A (open tails) | 0.3 / 0.7 | 0.4 / 0.8 | 0.4 / 0.8 | 0.4 / 0.8 |

**Order compared with the final model grade** (midranks; teams moving / max move / pair reversals):

| Comparison | OL | Receivers | RB | QB |
|---|---|---|---|---|
| Raw signal order vs final grade order | .951; 22 / 8 / 38 | .951; 25 / 8 / 39 | .849; 28 / 13 / 78 | .962; 23 / 6 / 39 |
| **Actual Candidate A/S displayed order vs final grade order** | **.951; 24 / 8 / 39** | **.951; 23 / 8 / 38** | **.849; 28 / 13 / 78** | **.962; 23 / 6 / 39** |
| A/S displayed order vs raw signal order | .9996; 2 / 1 / 1 | .9996; 2 / 1 / 1 | 1; 0 / 0 / 0 | 1; 0 / 0 / 0 |

The displayed-order Spearman values are .950784, .950880, .849340 and .961877. They reproduce Codex's values exactly.

Why the displayed order differs:
- One strictly increasing transform applied with one common reference keeps the signal order, apart from ties.
- Here the 3-game teams (ATL, NO) and the 4-game teams use different references, so the global displayed order can differ from the raw-signal order (OL and receivers: 2 teams, 1 place).
- Clipping at 0/100 can also create ties: OL has one tied pair in the signal.
- Both orders differ materially from FORCE's final canonical order.
- Prior-blend sensitivity of the final grades was established in the accepted follow-up (receiver K and OL level counterfactuals: up to 7 places) and is copied into `sensitivity.json`.

## 8. Owner decision table

| | A: empirical percentile | B: smoothed percentile | C: open-tail quantile |
|---|---|---|---|
| Semantic clarity | High: "better than X% of comparable historical units" | High, with a "smoothed" caveat | Medium: 0/100 are asymptotes, numerically saturating for distant values |
| Historical extremes | 0/100 = worst/best exactly; records flagged at 0/100 (frozen) or re-anchored (dynamic) | Same as A | Best = 99.2, records 99.2–100 (100 only through numerical saturation) |
| Cross-unit comparability | Comparable standing by construction with a same-length reference | Same, approximately | Same as A in the body |
| Sample-length / stage fairness | Needs a same-length reference. S is recommended, C plausible; F is inappropriate | Same | Same |
| Stability | Step-like at sparse tails; season-inclusion shifts up to 27 points (two seasons) | Smoother tails; same season sensitivity | Like A |
| Sample-size sensitivity | High at n = 64 | Slightly lower in the tails | Like A |
| Ease of explanation | Easiest | Harder (kernel) | Hard (tail model) |
| Implementation complexity | Low | Medium | Medium |
| 0/50/100 defensible? | 0/100 = worst/best of the reference. About 50 at the centre (exact in most tested references, not guaranteed with tied blocks) | 0/100 yes; centre 44–53 in tested references | Centre about 50; 0/100 are not historical observations |
| Major drawback | Ties, sparse jumps, and only two seasons of "history" | Bandwidth choice; centre can sit well off 50 | Violates the owner's "100 = best observation" |

**Research recommendation, not an owner decision.** Candidate A with the S reference (or another same-length design once deeper history exists) and frozen-reference semantics, with records flagged as "beyond the reference best", is the closest match to the stated meaning and the simplest to explain. Three things limit it:
- It is honestly available only at the signal layer, and only for OL and receivers fully (QB and RB partially). Defense is not covered.
- Its "history" is two seasons long.
- Its displayed order differs from FORCE's final canonical order.

## 9. Remaining owner decisions

1. **Layer:** should the historical-standing display map the unit's measured signal or the final canonical grade? The final grade has no historical population. The signal layer would make displayed order differ from model order (Spearman .85–.96).
2. **History length:** should a deeper multi-season reference be built by running the pinned Cycle 7 extractor on additional nflverse seasons? This needs separate fetch authorization.
3. **Full composites:** how should the QB composite, RB receiving and defense be reconstructed or handled until they have a historical construct in current semantics?
4. **Reference design:** S, or another same-length strategy such as C, once deeper history allows validation.
5. **Record semantics:** frozen with flags, dynamic re-anchoring, or open tails.
6. **The exact transform**, and whether "historically exceptional" labels are wanted. The thresholds in this package are illustrative only.

## Withdrawn or qualified claims (Codex review B)

- "Defense reproduced through production helpers": now three explicit evidence levels, with no historical replay.
- "C never reaches exactly 0/100": true only in exact arithmetic. Distant finite inputs saturate in double precision.
- "A maps the median to exactly 50" and the unscoped B range: medians are near 50 and not guaranteed. B ranges are scoped to the tested 3-game and 4-game references.
- "Only EPA/play has QB history" and "the fixture is the only historical reference": V149 also holds 2025 QB success-rate and pass-EPA windows. Final-grade history is still absent.
- "Stage matching is required" and "equal standing only with stage matching": now "full-season is inappropriate; sample-length matching is strongly supported; S recommended; exact calendar-stage matching not proven necessary".
- "Display order vs final" (it was raw-signal order) and "all candidates/references share one order": both relabelled or removed, and the actual A/S display order has been added.

## Reproducibility and checks

```text
node research/cycle9/md08_historical_standing_prototype/check.mjs
node research/cycle9/md08_historical_standing_prototype/analyze.mjs <scratch dir>
```

`check.mjs` does the following:
- enforces the input pins and the accepted follow-up package checksums
- asserts the identity seam
- reproduces the canonical qb/receiver/OL/RB values and the recomputed defense composite
- checks the fixture's 2025 OL against production V149 (544/544)
- regenerates all seven results byte for byte
- asserts the edge, median (3-game and 4-game), numerical-saturation, availability, sample-length and display-order findings
- runs 11 negative or adversarial controls:
  - wrong unit reference
  - wrong stage reference
  - reversed orientation
  - incorrect tie handling
  - a missing historical observation
  - raw min/max scaling
  - an altered pin
  - a changed defense constituent
  - raw-signal order standing in for displayed order
  - a claimed strictly open C interval
  - a claimed universal exact-50 median
- verifies [hashes.json](hashes.json)

No network is used. The frozen Cycle 9 package, the accepted follow-up package and the Cycle 7 fixture are untouched.
