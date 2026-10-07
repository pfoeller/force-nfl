# MD-08 Celo replay reassessment

**Research only.** This package reassesses the MD-08 final-grade replay blockers after the owner's decision of 2026-10-07:

- The preserved July 2026 Celo output is accepted as the **authoritative B1 legacy provenance record** for 2008–2025.
- **Historical as-of replay may consume only the leak-free subset** of that record. Excluded fields stay archived as provenance.

It builds on the accepted blocker package [md08_final_grade_history](../md08_final_grade_history/README.md) at `f3471c7`, which is not modified. The Celo tree outside FORCE is read and hashed, never modified or imported.

Production code, formulas, priors, grades, the identity seam and `public/` are unchanged. The production transform, replacement prior/reference semantics, historical replay implementation and UX-41 remain NOT AUTHORIZED. MD-08 stays Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE.

**Corrections after Codex review B of `a9bb0f4`** (§8):
1. The RB leakage count is now defined exactly.
2. The Elo comparison is narrowed to non-equivalence.
3. B2 completeness is qualified.

It also records the owner tie rule. The central reassessment is unchanged.

Files:
- [provenance pins](provenance.json)
- [field classification and unit dependency table](classification.mjs), with results in [classification.json](results/classification.json) and [replayability.json](results/replayability.json)
- [Celo → FORCE mapping and historical diagnostics](celo_mapping.mjs), with results in [celo_mapping.json](results/celo_mapping.json)
- [RB leakage count](rb_leakage.py), with results in [rb_leakage.json](results/rb_leakage.json)
- [checker](check.mjs)

## Headline

**B1 provenance is resolved, and B1 replay semantics are partly resolved.** Two findings decide the outcome.

**1. The FORCE legacy bundle is an exact function of the Celo record.** For 2025, every B1 field matches 32/32, and all seven bundle indices rebuild **224/224** index values:
- **Indices:** each one is an ordinal rank percentile `100·pos/31`, rounded to one decimal.
- **Ties:** preserved Celo source/team-record order, per the owner tie rule (§3).
- **`qbIndex`:** ranks the primary QB's **`epa_per_play`**, not `epaoe`.
- **Primary QB:** most games, then Celo QB-row order.
- **Lead RB:** most carries, then Celo RB dictionary order.
- **Team receiver value:** the target-weighted mean of the top four receivers by targets. This is exact for 2025; historical cases with fewer than four are not established (§4).

**2. Receiver and RB paths depend on fields that leak later information.** The owner keeps both excluded, and no replacement is created.
- **`qb.epaoe`:** read through `priorQbPassEpa` for the receiver/RB betas, QB centre, residual populations and priors. Its Elo term uses hindsight-tuned Celo parameters.
- **Cross-season RB eligibility:** under the producer's own preprocessing (`load_pbp` pass/run, down and ydstogo filter, then regular season), **130 distinct player-seasons (131 team/player/season groups)** are excluded only because of a later first pass. Example: 2008 LAC L. Tomlinson, 292 carries, first regular-season pass in 2009.

These are conditional possibilities, not established replay spans:

| Unit | Week 1 | Weeks 2–11 | Week 12+ | Subject to |
|---|---|---|---|---|
| QB | CONDITIONAL (display 2022–2025) | BLOCKED (B3) | CONDITIONAL (display 2022–2025) | `passing_cpoe` coverage; QB relocation gap where relevant; tie rule; B5; B6 (display < 2022 unavailable) |
| OL | CONDITIONAL (display 2009–2025) | BLOCKED (B3) | CONDITIONAL (display 2009–2025) | Disruption coverage (verified only 2024–25); tie rule; B5; B6 route selection (route 2 below 2022 uses the leak-free `ol.pressure_rate_allowed`) |
| Receivers | BLOCKED | BLOCKED | BLOCKED | Owner-excluded `qb.epaoe` and RB eligibility |
| RB | BLOCKED | BLOCKED | BLOCKED | Owner-excluded RB eligibility and `qb.epaoe` |
| Defense | BLOCKED | BLOCKED | BLOCKED | B4 live pass rush; `passing_cpoe` coverage (the three priors are leak-free) |

No unit is fully replayable.

## 1. Celo provenance pins

[provenance.json](provenance.json) records:
- the 53 source/config hashes, the `ui_data.json` and `entropy_data.json` hashes, and the `Celo.zip` hash
- the two recovered commands
- the regeneration verdict, **B**
- the runtime versions
- the upstream-republication caveats (2020, 2024 and 2025 play-by-play; NGS; schedules)
- all 38 pinned upstream downloads

When the owner's tree is reachable, the checker re-hashes every pinned file read-only, plus the archive, and reproduces `celo_mapping.json` byte for byte. With `MD08_PINNED_PBP_DIR` set, it also recomputes the RB leakage count from the pinned play-by-play.

**Recommended (not performed):** a durable private archive (a private repository or a checksummed bundle) holding the Celo tree, its outputs, these pins, the commands and the 38 pinned upstream assets. Importing it into or next to FORCE needs separate authorization.

## 2. Field-by-field classification (fields current FORCE consumes)

| Field | Class | Later seasons | Hindsight parameters | FORCE consumer | Safe as Y−1 prior |
|---|---|---|---|---|---|
| `qb.epa_per_play` → `qbIndex` | ACCEPTED_LEAK_FREE | no | no | `priorQbIndex` | yes |
| `ol.rating` → `olIndex` | ACCEPTED_LEAK_FREE | no | no | `priorOlIndex` | yes |
| `ol.pressure_rate_allowed` | ACCEPTED_LEAK_FREE | no | no | OL live route 2 | yes |
| `cov.rating` → `coverageIndex` | ACCEPTED_LEAK_FREE | no | no | `priorCoverageIndex`, preseason defense composite | yes |
| `dl.pressure_rate` | ACCEPTED_LEAK_FREE | no | no | pass-rush prior fallback | yes |
| `dl.run_stop_rate` | ACCEPTED_LEAK_FREE | no | no | run-defense prior | yes |
| `dl.rating` → `frontIndex` | ACCEPTED_LEAK_FREE | no | no | prior fallback only | yes |
| `receivers.adj_epa` / `targets` | ACCEPTED_LEAK_FREE | no | no | `priorReceiverWrteEpa` (consumer still blocked) | yes |
| `rb.rush_epa` / `adj_recv` / `targets` | AUTHENTIC_BUT_LEAKED | **yes** (RB eligibility) | no | receiver room adjustment, RB beta, prior, CDF | no |
| `qb.epaoe` | AUTHENTIC_BUT_LEAKED | **yes** | **yes** (tuned Elo) | `priorQbPassEpa`: receiver/RB betas, centre, residuals, priors | no |
| `qb.cpoe` | AUTHENTIC_BUT_ROLE_INCOMPATIBLE | no | no | provenance only (expected completion %) | no |

Every value spans 2008–2025 and is a full season of Y−1. Later games within Y−1 are acceptable for a prior consumed after Y−1 ends. Producer functions and line references are in [classification.mjs](classification.mjs).

**Not consumed by the five canonical units** (archived as provenance):
- `pred_adj`, `off_style_rating` (pooled) and `clutch_rating` (pooled): leaked
- `ol.avg_opp_dl` / `dl.avg_opp_ol`: the quirk where each uses the team's own opposite-unit rating, preserved
- `off_epa` → `offenseIndex`: leak-free, but outside the five units
- `rushIndex`: inherits the RB leak

**`qb.epaoe` detail.** The forward four-game smoothing stays within Y−1, which is acceptable for this role. The disqualifying part is the Elo from `tuned_config.json`. `run.py` tunes on `seasons[-6:-3]`, which is 2020–2022 for 2008–2025 — an inferred window, not proven for this config.

## 3. B1 reassessed

**Provenance: RESOLVED** (owner decision). The producer, definitions and record are authenticated, and the bundle is an exact function of the record (2025: every field 32/32; indices 224/224).

**Replay semantics:**

| Former B1 field | Status |
|---|---|
| `qbIndex`, `olIndex`, `coverageIndex`, `frontIndex`; `dl.run_stop_rate`, `dl.pressure_rate`; `ol.pressure_rate_allowed` | **Removed** as source blockers (leak-free, exact transform) |
| `receivers.adj_epa` / `targets` | Field resolved; consumer blocked by the two rows below |
| `rb.*` lead-back fields | **Retained**: AUTHENTIC_BUT_LEAKED (owner-excluded) |
| `qb.epaoe` | **Retained**: AUTHENTIC_BUT_LEAKED (owner-excluded) |

**Owner tie rule (2026-10-07; compatibility only).**
- Ordinal-index ties keep the preserved Celo source/team-record order, as a stable ascending sort.
- Primary QB: most games, then Celo QB-row order.
- Lead RB: most carries, then Celo RB dictionary order.
- There is no midrank, alphabetical or new football criterion.

Evidence for 2008–2025:
- **53 two-team index tie groups:** QB 14, OL 13, coverage 9, front 9, offense 3, receivers 2, rushing 3. Each has a preserved source order, listed in `celo_mapping.json`.
- **9 primary-QB ties:** Vince Young (TEN 2010), Matt Cassel (KC 2012), Case Keenum (HOU 2013), Gardner Minshew II (JAX 2020), Alex Smith (WAS 2020), Sam Darnold (CAR 2022), Joe Flacco (CLE 2023), Tommy DeVito (NYG 2023), Dak Prescott (DAL 2024).
- **2 lead-RB ties:** R. Mostert (SF 2019) and J. Wright (MIA 2025).

**Historical record gaps:**
- **QB relocation gap.** There are no QB rows for STL/LAR 2008–2015, SD/LAC 2008–2016 or OAK/LV 2008–2019.
  - **Cause:** these are missing Celo rows created by producer aliasing. `data.py` joins per-game QB EPA, keyed by play-by-play `posteam` (current codes LA/LAC/LV), onto schedule rows keyed by relocation-era codes (STL/SD/OAK). Those games therefore carry no QB, and the QBs never enter `qb_by_season`.
  - FORCE relocation mapping cannot recover rows that do not exist. None are reconstructed.
- **2008 receivers.** Eight teams have fewer than four receivers with ≥25 targets: CAR (1), CIN, CLE, DET, LV (2 each), ATL, BAL and LAR (3 each). The FORCE aggregation rule for fewer than four is not established.

## 4. B2 reassessed

**B2 is materially narrowed but not fully resolved.**
- **Available:** authenticated RB and receiver source populations exist for 2008–2025, and the current 2025 reference reproduces exactly.
- **Historical completeness is limited by:**
  - the relocation-era QB-row gaps (the QB centre and environment terms need a team QB value)
  - the under-four-receiver aggregation cases in 2008
  - decisively, the owner-excluded leaked dependencies: `qb.epaoe` and cross-season RB eligibility

Historical references are not claimed complete.

## 5. B3, B4, B6

**B3: unresolved for weeks 2–11; no replacement rule is authorized.**
- **What holds:** current production preseason Elo (`data/model-data.js rankings.elo`) matches the recovered Celo `rankings.elo` exactly, 32/32, trajectories included.
- **What is missing:** the record does not preserve an authenticated per-season state of that full-input run for earlier seasons, which is what the continuity input requires.
- **The 10.7 comparison:** this is the 2025 maximum gap between `rankings.elo` and the preserved `trajectory`/`by_season_rank`. It compares two different Celo runs:
  - `rankings.elo` comes from the main `EloModel` run, *with* the supplementary roster-retention, personnel, team AV, QBR and pressure inputs.
  - The trajectory comes from a separate season-by-season run *without* them.

  That comparison shows only that the two runs are not equivalent. It does not establish a season-end versus preseason distinction.
- Week 1 and Week 12+ remain unaffected by B3 (k = 1).

**B4 is unchanged.** Live pass-rush selection is blocked as-run and is an owner policy decision retrospectively. The pass-rush prior is leak-free.

**B6 is unchanged.** QB needs display ≥ 2022, and OL route 1 likewise; OL route 2 is available below that.

## 6. Historical-standing reference (Candidate A)

**Not unblocked.** A common all-unit reference needs every unit. Receivers and RB (owner-excluded leaked fields) and defense (B4) remain blocked, as do weeks 2–11 everywhere.

Per-unit Week 1 / Week 12+ references for QB and OL remain conditional possibilities and would not give a common scale.

## 7. Remaining owner decisions

1. **`qb.epaoe` and RB eligibility.** Currently excluded by the owner; reconsideration would be a separate decision.
2. **B4 retrospective pass-rush policy.**
3. **B3** (weeks 2–11): no authenticated historical full-run state. Needs a separate rule or reconstruction decision; none is authorized.

Verification steps that need no owner semantics: `passing_cpoe` and play-by-play disruption component coverage per season, and B5 relabelling.

## 8. Corrections after Codex review B of `a9bb0f4`

**1. RB leakage count.** [rb_leakage.py](rb_leakage.py) defines the count exactly and reproduces it from the hash-checked pinned play-by-play.
- **Preprocessing:** the script first applies Celo's own `load_pbp` filter, in the producer's order:
  1. keep `season == s`
  2. keep `play_type` in pass/run
  3. drop rows missing `down` or `ydstogo`

  It then sets a missing `season_type` to REG (there are none) and keeps REG plays. Rush counts and both passer populations are derived only after this filter.
- **Definition:** an affected group is a (season *s*, posteam, rusher) with ≥30 producer-filtered regular-season rushes (`play_type == 'run'`, rusher and EPA present) whose name enters the producer's pooled regular-season passer set only through passes in seasons after *s*.
- **Result:** 131 affected groups, which are **130 distinct player-seasons**. The only multi-team case is 2010 M. Lynch.
- **Tomlinson control:** 2008 LAC, 292 producer-filtered carries, first regular-season pass in 2009.
- **Why `a9bb0f4` said 127:** that count built the passer pool from all plays, regular season plus postseason. That is not the producer's population. Recomputing that way gives 127 player-seasons and 128 groups.
- **Filter correction after Codex review B of `791151c`:** the `791151c` reproducer omitted the `load_pbp` filter. The totals and the affected-group set are unchanged, but **21 groups' carry counts change**. For example, L. Washington (NYJ 2008) goes from 77 to 76, and D. Cook (MIN 2020) from 315 to 312. All 21 are listed in `rb_leakage.json`.
- The qualitative conclusion, that RB eligibility depends on later seasons, is unchanged. No cleaned eligibility rule is defined.

**2. Elo comparison.** The earlier wording ("season-end snapshots that differ from the final Elo") is withdrawn and replaced by the run-provenance statement in §5. B3 itself is unchanged.

**3. B2 completeness.** "Every population input exists … aggregation is exact" is withdrawn and replaced by §4, with the relocation and 2008 receiver gaps recorded as evidence.

## Checks

```text
node research/cycle9/md08_celo_replay_reassessment/check.mjs
node research/cycle9/md08_celo_replay_reassessment/celo_mapping.mjs                 (needs the Celo tree)
python research/cycle9/md08_celo_replay_reassessment/rb_leakage.py <pinned pbp dir>  (needs the pinned play-by-play)
```

The checker verifies:
- the input pins
- byte-equal regeneration of the classification and replayability results
- 56 controls (57 when `MD08_PINNED_PBP_DIR` adds the full recompute of `rb_leakage.json`), including:
  - classification invariants and 13 production consumer anchors
  - stage replayability
  - the 2025 mapping and the 224/224 indices
  - the 53 tie groups and the 9 QB / 2 RB tie picks
  - the run-provenance Elo statement
  - the relocation and 2008 receiver gaps
  - the RB leakage counts: the Celo `load_pbp` filter, 130/131, the Tomlinson, Washington and Cook controls, the 21 changed carry counts, the Lynch case and the 127/128 explanation
  - the provenance pins
- the external Celo pins and mapping, when reachable
- `hashes.json`
