# MD-08 historical-standing display prototype

**Prototype and evidence only.** The owner has chosen the presentation direction: a common historical-standing 0–100 scale. In it, 0 is the worst and 100 the best observation in a unit's historical FORCE reference population, 50 is ordinary historical quality, and 10/90 are not caps. This package tests what can honestly be built today. It does not implement anything, and the transform is NOT AUTHORIZED for production.

MD-08 status is unchanged: Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE. UX-41 is NOT AUTHORIZED.

- **Branch:** `cycle9/claude-md08-historical-standing-prototype`, from the accepted follow-up tip `4818619cb48b928f187929a75013f575ced5185d` (base main `6cf05419`).
- **Unchanged:** production code, formulas, priors, stabilizers, weights, grades, the identity seam (asserted to be the identity) and `public/`.

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
2. **The only historical reference available is two seasons (2024–2025).** It is the committed Cycle 7 game-level fixture, built from pinned nflverse PBP. It has exact counts and 17 games for each of the 64 team-seasons.
   - "0" and "100" can therefore mean only the worst and best of 2024–2025 at the same stage (n = 64). That falls far short of the owner's intended "historical extremes".
   - Swapping 2024-only for 2025-only as the reference moves 2026 displays by 4.4–14.0 points on average and by up to 26.7.
3. **Supported at the signal layer:**
   - OL: disruption rate, identical to production. It matches the V149 2025 windows in 544 of 544 team-games.
   - Receivers: production's QB-partial residual, unstabilized.
   - Partial: QB (EPA/play component only) and RB (rushing component only).
   - Not supported: defense overall, and the defensive subunits in current semantics.
4. **Stage matching is required for honest semantics.** Out of sample, a full-season reference makes Week-4 values hit 0 or 100 12–23% of the time, against 3–5% with a stage-matched reference. It also produces up to 28% of values at or below 10. For current 2026 teams, switching from stage-matched to full-season moves displays by 3.9–8.2 points on average (up to 18.7) and roughly doubles the count outside 10–90.
5. **A signal-layer display would not follow the model order.** Its order differs from the final model grade order (Spearman .85–.96; up to 8 places for OL and receivers, 13 for the RB rushing proxy), because priors and stabilization are excluded. Choosing the signal layer or the final grade is an architecture decision for the owner.

## 1. Historical reference availability by unit

| Unit | Seam quantity | Historical data | Seasons | Form | Same semantics as current? | Verdict |
|---|---|---|---|---|---|---|
| QB | `qbIndex` five-component composite with context, prior, recency, clamp | EPA/play (dropbacks + QB runs) only | 2024, 2025 | game-level → windows / season | Component only. Production stabilizes the component; the composite has no replay. | **PARTIAL** |
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

## 2. Candidate transforms (exact definitions in [transforms.mjs](transforms.mjs))

All signals are oriented so that higher is better (OL disruption is sign-flipped). Standing is reported separately as 100 × (#worse + ½ #equal)/n.

- **A: empirical percentile with exact endpoints.**
  - Each distinct historical value is a knot at 100 × midrank/(n − 1). The worst value is forced to 0 and the best to 100.
  - Between knots the map is linear in the signal.
  - Below the worst → 0 and above the best → 100, both flagged.
- **B: smoothed empirical percentile.**
  - A Gaussian-kernel CDF with Silverman bandwidth, rescaled so the worst historical value = 0 and the best = 100.
  - Strictly increasing inside the range; 0/100 (flagged) outside it.
  - The median maps near, not exactly to, 50 (47.7–52.6 in these references).
- **C: quantile mapping with open tails.**
  - Hazen positions 100 × (midrank + ½)/n with linear interpolation. The historical best maps to 99.22 and the worst to 0.78 at n = 64.
  - Beyond the range, a normal tail fitted to the reference fills the remaining headroom toward 0/100 as asymptotes. Records stay distinguishable, but 0/100 are never reached.

Each candidate is applied with three references, R:
- **S:** stage-matched. Games 1..g of each 2024/2025 team-season, where g is the team's current game count (3 or 4). n = 64. ATL and NO (Week-4 bye) use three-game references, so displays are monotone in the signal within each game-count group, not across the two groups.
- **C:** same game count, any stage. n = 896 at four games.
- **F:** full season. n = 64.

## 3. Edge semantics

| Case | A | B | C |
|---|---|---|---|
| Equals the worst historical value | 0 | 0 | 0.78 (n = 64) |
| Equals the best historical value | 100 | 100 | 99.22 |
| Worse than the worst | 0, flagged `belowWorst` | 0, flagged | Between 0 and 0.78 via the normal tail (never 0) |
| Better than the best | 100, flagged `aboveBest` | 100, flagged | Between 99.22 and 100 (never 100) |
| Tied with several historical values | Midrank of the block (OL example: 11.90; first-position 11.11, last 12.70) | Coincident kernels | Midrank Hazen |
| At the historical median | 50 exactly (asserted) | 47.7–52.6 | 50 |
| Between sparse observations | Linear between neighbours | Smooth | Linear between Hazen positions |

**Frozen, dynamic and open-tail semantics** (prototyped in `distributions.json` → `dynamicRecordSemantics`):
- **Frozen reference (A/B).** The same signal always gives the same number. 100 means "at or beyond the frozen best", with records flagged but not distinguished.
- **Dynamic records (A/B).** The current season's stage-matched values join the reference. A new record becomes the new 100, and every other team's number can shift; up to 8.0 points in 2026 for OL. Published numbers then need the reference version to be reproduced. In 2026, the QB EPA leader (SF) and the worst QB (ATL) become the new endpoints, and receivers' LAC becomes the new 0.
- **Open tail (C).** Records stay distinguishable, but the historical best shows 99.22. That contradicts "100 = best observation".

## 4. Stage and sample-size fairness

**Out-of-sample calibration.** Each season's games 1–4 windows are mapped against references from the other season only. If calibrated, about 20% of values should be ≥80 and few should hit 0 or 100.

| Unit | S: ≥80 / ≥90 / ≤10 / at 0 or 100 | C: ≥80 / ≥90 / ≤10 / at 0 or 100 | F: ≥80 / ≥90 / ≤10 / at 0 or 100 |
|---|---|---|---|
| OL | 20% / 9% / 9% / 5% | 20% / 11% / 13% / 2% | 27% / 17% / 22% / **23%** |
| Receivers | 25% / 20% / 16% / 3% | 11% / 8% / 9% / 0% | 28% / 13% / 27% / **19%** |
| RB (rushing) | 19% / 13% / 13% / 5% | 16% / 11% / 8% / 2% | 16% / 14% / 28% / **13%** |
| QB (EPA) | 20% / 14% / 17% / 5% | 14% / 9% / 16% / 0% | 20% / 14% / 19% / **14%** |

- **Full season (F)** is not stage-fair. Four-game values are noisier than season values, so too many current units are labelled historically extreme.
- **Same game count at any stage (C)** has a larger n, but under-fills the top for receivers, QB and RB (11–16% ≥80). That points to stage effects within the same window length.
- **Stage-matched (S)** is closest to calibrated. With n = 32 per season, ±5–8 points of share is sampling noise.

**Current 2026 effect (Candidate A, S compared with F):**

| Unit | Mean shift | Max shift | Outside 10–90 (S → F) |
|---|---:|---:|---|
| OL | 4.6 | 9.4 | 1 → 5 |
| Receivers | 6.1 | 18.7 | 7 → 14 |
| RB | 8.2 | 18.4 | 8 → 15 |
| QB | 3.9 | 11.2 | 6 → 14 |

**Conclusion:** stage matching is required for semantic honesty. "80" for a Week-4 receiver room compared against full-season rooms does not mean the same standing as 80 against Week-4 rooms.

## 5. Current 2026 outputs (Candidate A, stage-matched; full tables for every candidate × reference in [team_tables.csv](results/team_tables.csv))

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
| Receivers | SF 98.7 | Historically exceptional | LAC 0 (below the worst) | Below the 2024–25 stage worst |
| RB (rushing) | BUF 96.1 | Historically exceptional | GB 1.1 | Historically awful |
| QB (EPA) | SF 100 (beyond the best) | Beyond the 2024–25 stage best | ATL 0 (below the worst) | Below the 2024–25 stage worst |

The OL row is the clearest case of the owner's distinction. SF leads the league but sits at the 89th historical stage standing. Against a full-season reference the same team would read 97, which illustrates the stage problem.

## 6. Cross-unit semantic test

- **By construction.** Under Candidate A with a stage-matched reference, 80 corresponds to the same historical standing (79.7) in every supported unit. For example: OL disruption .113, receiver residual .242, RB rushing EPA .014, QB EPA/play .171.
- **Out of sample.** Equal displays carry approximately equal historical standing only with stage-matched references. The table in Section 4 shows S near 20% ≥80 for all four units, while F and C distort by unit.
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
| Display order vs final model order | Spearman .951, 22 move, max 8 | .951, 25, 8 | .849, 28, 13 | .962, 23, 6 |

Prior-blend sensitivity of the final grades was established in the accepted follow-up (receiver K and OL level counterfactuals: up to 7 places) and is copied into `sensitivity.json`. All candidates are monotone in the signal, so within a unit they share an order and differ only in spacing.

## 8. Owner decision table

| | A: empirical percentile | B: smoothed percentile | C: open-tail quantile |
|---|---|---|---|
| Semantic clarity | High: "better than X% of comparable historical units" | High, with a "smoothed" caveat | Medium: 0/100 are asymptotes |
| Historical extremes | 0/100 = worst/best exactly; records flagged at 0/100 (frozen) or re-anchored (dynamic) | Same as A | Best = 99.2, records 99.2–100 |
| Cross-unit comparability | Equal standing by construction with stage-matched references | Same, approximately | Same as A in the body |
| Stage fairness | Requires stage-matched references (S); F is unfair | Same | Same |
| Stability | Step-like at sparse tails; season-inclusion shifts up to 27 points (two seasons) | Smoother tails; same season sensitivity | Like A |
| Sample-size sensitivity | High at n = 64 | Slightly lower in the tails | Like A |
| Ease of explanation | Easiest | Harder (kernel) | Hard (tail model) |
| Implementation complexity | Low | Medium | Medium |
| 0/50/100 defensible? | Yes: 0/100 = worst/best of the reference, median = 50 | 0/100 yes, 50 approximate | 50 yes; 0/100 not historical observations |
| Major drawback | Ties, sparse jumps, and only two seasons of "history" | Bandwidth choice; median not exactly 50 | Violates the owner's "100 = best observation" |

**Research recommendation, not an owner decision.** Candidate A with stage-matched references and frozen-reference semantics, with records flagged as "beyond the reference best", is the closest match to the stated meaning and the simplest to explain. Two things limit it:
- It is honestly available only at the signal layer, and only for OL and receivers fully (QB and RB partially). Defense is not covered.
- Its "history" is two seasons long.

## 9. Remaining owner decisions

1. **Layer:** should the historical-standing display map the unit's measured signal or the final canonical grade? The final grade has no historical population. The signal layer would make displayed order differ from model order (Spearman .85–.96).
2. **History length:** should a multi-season reference be built by running the pinned Cycle 7 extractor on additional nflverse seasons? This needs separate fetch authorization.
3. **Unsupported units:** how should QB (composite), RB (receiving part) and defense be handled until they have a historical construct in current semantics?
4. **Record semantics:** frozen with flags, dynamic re-anchoring, or open tails.
5. **The exact candidate**, and whether "historically exceptional" labels are wanted. The thresholds in this package are illustrative only.

## Reproducibility and checks

```text
node research/cycle9/md08_historical_standing_prototype/check.mjs
node research/cycle9/md08_historical_standing_prototype/analyze.mjs <scratch dir>
```

`check.mjs` does the following:
- enforces the input pins and the accepted follow-up package checksums
- asserts the identity seam
- reproduces the canonical qb/receiver/OL/RB/defense values exactly (within the 6-decimal frozen CSV)
- checks the fixture's 2025 OL against production V149 (544/544)
- regenerates all seven results byte for byte
- asserts the edge semantics and stage findings
- runs 7 negative controls:
  - wrong unit reference
  - wrong stage reference
  - reversed orientation
  - incorrect tie handling
  - a missing historical observation
  - raw min/max scaling
  - an altered pin
- verifies [hashes.json](hashes.json)

No network is used. The frozen Cycle 9 package and the accepted follow-up package are untouched.
