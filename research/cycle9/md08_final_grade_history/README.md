# MD-08 final-grade history build

**Research/data infrastructure only.** Owner decisions of 2026-10-07:
- The public historical-standing rating must derive from the final canonical grade.
- A deeper historical-reference build is authorized.
- History must use current model semantics.
- Dynamic record semantics are selected in principle.
- Candidate A is provisional.
- Sample-length matching is required.

Production transform implementation and UX-41 remain NOT AUTHORIZED. MD-08 stays Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE.

- **Branch:** `cycle9/claude-md08-final-grade-history`, from the accepted prototype tip `a1a781019388cd86f5f60f3345b7b6c757ba9d74` (base main `6cf05419`).
- **Unchanged:** production code, formulas, priors, stabilizers, weights, grades, the identity seam and `public/`.

Results:
- [replay contracts and blockers](results/contracts.json)
- [prior reproducibility evidence](results/prior_reproducibility.json)
- [coverage matrix](results/coverage_matrix.json)
- [current reproduction gate](results/current_reproduction.json)
- [dynamic-record versioning](results/dynamic_record.json)
- [decision package](results/decision_package.json)
- [nflverse source listing](results/source_listing.json)
- [contracts and validator](contracts.mjs)

## Headline

**No historical population of final canonical grades can be reconstructed under current semantics, for any displayed unit, for any season.** The live layer is not the main problem: most live inputs come from public nflverse data that reach back to 1999. The blockers are the non-live state each final grade blends with:

| Blocker | Affects | What is missing |
|---|---|---|
| **B1 Legacy prior bundle** | Every unit prior (QB, OL, receivers, RB, coverage, run defense, scoring) | Priors are regressed fields of `data/matchup-data.js`, which covers 2025 only. It was added in CHANGELOG_V4 as "2025 model diagnostics" and no generator exists in the repository. Its fields are legacy, player-level or adjusted constructs (primary-QB `epaoe`, lead-RB `adj_*`, a receiver subset with its own targets, legacy rank indices). None reproduces from public 2025 play-by-play for any team: 0/32 exact for every field tested, with correlations .68–.95. |
| **B2 Legacy reference population** | Receiver and RB **live** grades | Their live CDF, median and ridge beta are built from the same bundle. |
| **B3 Preseason Elo / regime state** | Effective prior games k for every blended unit | k comes from the V34/V37 regime state on core Elo, replayed from the regressed `data/model-data.js` end-2025 ratings. The repository's Elo history (`research/season_end_elo.json`, 2008–2025) differs from those ratings by up to 10.7 points (mean 3.9) in 2025, so it is not the same chain. |
| **B4 Pass-rush provider state** | Pass rush, hence defense overall | The provider is chosen per team at run time (manual → FTN → StatRankings → complete PFR → nflverse weekly). StatRankings has no archive, FTN exists only from 2022, PFR only from 2018, and readiness at historical dates is not archived. |
| B5 Season literals | All (engineering only) | `buildProfiles` filters the literal seasons 2026/2025. A replay harness must relabel rows; this is auditable and not a semantic blocker. |

Using the 2025 bundle as the prior for any earlier season would be future leakage. Substituting a public proxy would replace a canonical component, which the authorization forbids. The build therefore **stops at the blocker registry** and does not produce substituted history. No external data files were downloaded, because a download cannot fix B1–B4. Only a read-only release listing was retrieved, to document coverage.

## 1. Final-grade replay contracts (Phase 1)

Each unit's complete present-day chain is in `contracts.json`, with code anchors (file:line) resolved at analysis time. In summary:

- **QB.**
  - Reproducible: live components (all-play EPA, success, ANY/A rank, CPOE, rushing bonus), V139 opponent adjustment, V137 pressure context, stabilization, the Y−1 17-game CDF, the ×1.20 expansion and clamp, and V148 recency.
  - **Blocked:** prior (B1) and k (B3).
- **OL.**
  - Reproducible: disruption rate and the Y−1 same-length window CDF.
  - **Blocked:** prior (B1) and k (B3).
- **Receivers.**
  - Reproducible: WR/TE EPA/target, sack-free attempt EPA, stabilization and alignment.
  - **Blocked:** the beta, the live CDF reference and the prior (B1/B2), and k (B3).
- **RB.**
  - Reproducible: rushing EPA and stabilization.
  - **Blocked:** the receiving residual beta, the live reference and the prior (B1/B2), and k (B3).
- **Defense overall.**
  - Reproducible: live coverage, run defense and prevention (prevention's prior is fixed at 50 with k = 1). The pass-rush prior is reproducible from Y−1 PFR for 2019 onward.
  - **Blocked:** the coverage and run-defense priors (B1), the pass-rush live provider (B4), and k (B3).

**As-of rule:** a season-Y week-g observation may use season-Y rows with week ≤ g, matching production's `profileBeforeWeek` filter. It may also use season Y−1 full-season inputs for prior-season roles. Nothing later is allowed.

## 2. Coverage matrix (Phase 2)

| Input | Seasons available | Notes |
|---|---|---|
| nflverse play-by-play | 1999–2026 | Same definitions via `force_server.py`; the 2025 Cycle 7 and V149 pins differ by release |
| nflverse weekly player and team stats | 1999–2026 | |
| PFR advanced weekly passing | 2018–2026 | Data reproducible; per-date completeness is not |
| FTN charting | 2022–2026 | Data reproducible; readiness state is not |
| StatRankings pressure | none archived | |
| Manual pressure override | 2026 only | |
| Bundled prior profiles | 2025 only | No generator |
| Preseason Elo (production) | 2025 only | Repository history is a different chain |
| nflverse schedules | full history | |

**Per-unit honest replay span:** none.

**Conditional spans, if B1–B4 were resolved:**
- OL: 2000+
- QB: 2007+ (CPOE from 2006)
- Receivers and RB: 2000+
- Defense: 2019+ with PFR-based pass rush, or 2023+ with FTN semantics
- Common all-unit: 2019+ or 2023+, depending on the pass-rush policy

Every unit needs season Y−1 as a burn-in season, which is not eligible for display.

## 3. Prior and state reconstruction (Phase 3)

- **Regressed team priors:** BLOCKED (B1), since they come from the legacy bundle.
- **LIVE_FITTED RB prior:** BLOCKED (B1/B2), since it is fitted on the same bundle.
- **Prior-games state (V37 k):** BLOCKED (B3).
- **QB recency:** reproducible, from in-season weekly rows.
- **Opponent and pressure context:** reproducible, from current-season play-by-play.
- **Rolling references (OL/QB windows):** reproducible from Y−1 play-by-play with the `force_server.py` builder.

The minimum burn-in is one prior season per unit, plus a verified Elo chain start before the first display season.

## 4. Historical final grades (Phase 4)

**Not produced.** Every unit-season replay plan is refused by `validatePlan` / `replayFinalGrade` because each unit has at least one BLOCKED component. No proxy or signal-layer substitute is generated.

## 5. Current-state reproduction gate (Phase 5)

| Unit | Path | Result |
|---|---|---|
| qb, OL, receivers | Stored prior and live → production blend (QB: recency and clamp) → identity seam | Residual 0 against the snapshot, all 32 teams |
| RB | Post-correction LIVE_FITTED prior → blend → seam | Within the frozen CSV's 6-decimal rounding (≤5e-7) |
| Defense | `defenseCompositeFrom(stored constituents)` → seam | Residual 0 |

- **Raw → live:** reproduced in earlier accepted packages (OL and receivers in the follow-up; QB components and RB in Cycle 9).
- **Not re-run here:** the server step from play-by-play to drive context.
- **Not attempted:** a historical raw-input gate, because B1–B4 block it before any comparison is possible.

## 6. Invariants and adversarial checks (Phase 6)

`contracts.mjs`'s `validatePlan` fails a replay plan instead of substituting. `check.mjs` asserts that each of these is detected:
- future leakage (week 6 data in a week-4 observation)
- wrong season
- wrong prior year (the 2025 bundle used for 2024)
- wrong game-count window
- signal-layer substitute
- proxy substitute
- missing stabilization
- missing context adjustment
- missing recency
- duplicated input
- a blocked component supplied from the bundle
- unknown unit
- invalid game count

It also checks that an altered pin is rejected and that the reference version changes with any grade or design change, while ignoring observation order.

Orientation and tie controls from the accepted prototype still pass in its own checker.

## 7–8. Common coverage and S vs C (Phases 7–8)

There is no per-unit or common final-grade history, so S vs C cannot be compared on final grades. The question remains unresolved, as the owner direction anticipated.

Coverage tradeoffs, if the blockers are lifted later:
- A common 2023+ reference (FTN semantics) would be shallow: about three display seasons at first.
- Unit-specific deeper references would break the common-scale premise for defense.
- Withholding the normalization for defense would leave it out of the common scale.

None of these is chosen.

## 9. Dynamic record semantics (Phase 9)

- **Metadata schema** (`dynamic_record.json`):
  - `transformVersion`
  - `referenceVersion`: SHA-256 of the canonical serialization of {transform, unit, design, game count, model source hashes, sorted (season, team, as-of week, full-precision final grade)}
  - `unit`, `design`, `gameCount`, `asOf`, `population`, `sourceHistorySpan`
- **Exact re-anchoring bounds for Candidate A** with n reference values:
  - One new record (best or worst) moves any existing value by at most **100/n**.
  - Adding m observations moves any value by at most **100·m/(n+m−1)**.

| Reference size n | Seasons at 32/season | One new record | One new season of 32 |
|---:|---:|---:|---:|
| 64 | 2 | 1.56 | 33.7 |
| 160 | 5 | 0.63 | 16.8 |
| 320 | 10 | 0.31 | 9.1 |
| 640 | 20 | 0.16 | 4.8 |

On seeded synthetic populations (mechanics only, not FORCE grades), one record hit the bound exactly. A season of 32 moved values by at most 11.5 at n = 64 and 1.7 at n = 320, inside the bounds. Previously published values therefore move little once history is deep, but a lot while it is two seasons long.

## 10–11. Candidate A on final grades; 0/50/100 meaning

**Not run.** No historical final-grade reference exists. Candidate A on a single common reference is monotone in the final grade by construction, but its real-history behaviour cannot be shown. No "historical" wording is defensible for final grades yet, and none is produced.

## 12. Owner decision package

1. **Replayable for every unit?** No. All five are blocked for all historical seasons.
2. **Blocked units and years:**
   - All: B1.
   - Receivers and RB: also B2.
   - All blended units: B3.
   - Defense: also B4.
3. **Maximum common span?** None established. Conditional on resolving the blockers: 2019+ (PFR pass rush) or 2023+ (FTN).
4. **Deep enough for historical 0/100?** Not assessable without final-grade history.
5. **Candidate A on final grades?** Untestable on history. The exact re-anchoring bounds above apply.
6. **S or C?** Unresolved; there is no final-grade history to compare them on.
7. **Re-anchoring movement:** at most 100/n per record and 100·m/(n+m−1) per batch; large at n = 64, small at n ≥ 320.
8. **Metadata:** the schema in §9.
9. **Remaining owner decisions:**
   - (a) **B1/B2:** recover the legacy `matchup-data.js` generator (if it exists outside this repository) and verify it reproduces the 2025 bundle exactly; or authorize a new, versioned prior/reference definition. The second option is a model change outside MD-08 and would change current grades.
   - (b) **B3:** a verified current-semantics Elo replay that reproduces `data/model-data.js` 2025 exactly, or an owner rule for historical k.
   - (c) **B4:** a historical pass-rush provider policy.
   - (d) Then S vs C, and Candidate A adoption, on real history.
10. **Ready for production-transform authorization?** No. The blocking dependency is prior and state reconstruction (B1–B3) plus the provider policy (B4). The smallest next question is whether the legacy profile generator can be recovered and shown to reproduce the 2025 bundle exactly. If not, the owner must decide whether a new versioned prior definition is acceptable.

## Reproducibility and checks

```text
node research/cycle9/md08_final_grade_history/check.mjs
node research/cycle9/md08_final_grade_history/analyze.mjs <scratch dir>
```

The checker enforces:
- input pins and the accepted prototype's checksums
- that the seam is the identity
- the current reproduction gate
- the blocked status of all five units
- the bundle non-reproducibility
- the Elo mismatch
- the dynamic-record bounds
- 13 validator controls, plus pin and versioning controls
- byte-equal regeneration of six results
- `hashes.json`

The checker uses no network: the release listing is committed evidence. The frozen Cycle 9 package, the follow-up package, the prototype package and the Cycle 7 fixture are untouched.
