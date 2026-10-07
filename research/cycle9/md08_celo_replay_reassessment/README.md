# MD-08 Celo replay reassessment

**Research only.** This package reassesses the MD-08 final-grade replay blockers after the owner's decision of 2026-10-07:

- The preserved July 2026 Celo output is accepted as the **authoritative B1 legacy provenance record** for 2008–2025.
- **Historical as-of replay may consume only the leak-free subset** of that record. Excluded fields stay archived as provenance.

It builds on the accepted blocker package [md08_final_grade_history](../md08_final_grade_history/README.md) at `f3471c7`, which is not modified. The Celo tree outside FORCE is read and hashed, never modified or imported.

Production code, formulas, priors, grades, the identity seam and `public/` are unchanged. The production transform, replacement prior semantics and UX-41 remain NOT AUTHORIZED. MD-08 stays Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE.

Files:
- [provenance pins](provenance.json)
- [field classification and unit dependency table](classification.mjs), with results in [classification.json](results/classification.json) and [replayability.json](results/replayability.json)
- [Celo → FORCE mapping and historical diagnostics](celo_mapping.mjs), with results in [celo_mapping.json](results/celo_mapping.json)
- [checker](check.mjs)

## Headline

**B1 provenance is resolved, and B1 replay semantics are partly resolved.** Two findings decide the outcome.

**1. The FORCE legacy bundle is now an exact function of the Celo record.** For 2025, every B1 field and all seven bundle indices rebuild 32/32:
- **Indices:** each one is an ordinal rank percentile `100·pos/31` rounded to one decimal.
- **`qbIndex`:** ranks the primary QB's **`epa_per_play`**, not `epaoe`. That explains the earlier 9.68 gap.
- **Selection rules:**
  - The primary QB is the one with the most games.
  - The lead RB is the one with the most rush attempts.
  - The team receiver value is the target-weighted mean of the top four receivers by targets.

**2. The receiver and RB paths depend on fields that leak later information.**
- **`qb.epaoe`:** current FORCE reads it through `priorQbPassEpa` for the receiver/RB ridge betas, the QB centre, the residual populations and the priors. Its Elo term uses hindsight-tuned Celo parameters.
- **RB eligibility:** it excludes every player who passed in **any** loaded season, including later ones. In the pinned play-by-play, 127 RB-seasons with ≥30 carries were dropped solely because of a later-season pass; for example, 2008 LAC L. Tomlinson with 292 carries.

Neither field may be substituted under the no-proxy rule.

| Unit | Week 1 | Weeks 2–11 | Week 12+ | What still stands between it and exact replay |
|---|---|---|---|---|
| QB | **CONDITIONAL** (display 2022–2025) | BLOCKED (B3) | **CONDITIONAL** (display 2022–2025) | Index and primary-QB tie rule; `passing_cpoe` coverage; B5 relabel; B6 (display < 2022 unavailable) |
| OL | **CONDITIONAL** (display 2009–2025) | BLOCKED (B3) | **CONDITIONAL** (display 2009–2025) | Index tie rule; disruption coverage verified only for 2024–25; B5. Route 2 (display < 2022) uses the leak-free `ol.pressure_rate_allowed`. |
| Receivers | BLOCKED | BLOCKED | BLOCKED | `qb.epaoe` hindsight; RB selection uses later seasons |
| RB | BLOCKED | BLOCKED | BLOCKED | RB selection uses later seasons; `qb.epaoe` hindsight |
| Defense | BLOCKED | BLOCKED | BLOCKED | B4 live pass rush; `passing_cpoe` coverage. All three priors are now leak-free. |

No unit is fully replayable today. QB and OL are no longer blocked by B1. They are conditional on verification steps and one narrow owner rule, ties.

## 1. Celo provenance pins

[provenance.json](provenance.json) records:
- the 53 source/config hashes, the `ui_data.json` and `entropy_data.json` hashes, and the `Celo.zip` hash
- the two recovered commands
- the regeneration verdict, **B**
- the upstream-republication caveats (2020, 2024 and 2025 play-by-play; NGS)
- all 38 pinned upstream downloads

When the owner's tree is reachable, the checker re-hashes every pinned file read-only, plus the archive, and reproduces `celo_mapping.json` byte for byte.

**Recommended (not performed):** a durable private archive, such as a private repository or a checksummed bundle, holding the Celo tree, its outputs, these pins, the commands and the 38 pinned upstream assets. Importing it into or next to FORCE needs separate authorization.

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
- `pred_adj`, `off_style_rating` and `clutch_rating`: leaked
- `ol.avg_opp_dl` and `dl.avg_opp_ol`: the quirk where each uses the team's own opposite-unit rating, preserved
- `off_epa` → `offenseIndex`: leak-free, but outside the five units
- `rushIndex`: inherits the RB leak

**`qb.epaoe` detail.** Its forward four-game smoothing stays within Y−1, which is acceptable for this role. The disqualifying part is that its Elo comes from `tuned_config.json`. `run.py` tunes on `seasons[-6:-3]`, which for 2008–2025 is 2020–2022 — an inferred window, not proven for this config. The owner could separately consider Y−1 ≥ 2022; that is not assumed here.

## 3. B1 reassessed

**Provenance: RESOLVED** (owner decision). The producer, definitions and record are authenticated, and the FORCE bundle is an exact function of the record (2025: 32/32 on every field and index).

**Replay semantics:**

| Former B1 field | Status |
|---|---|
| `qbIndex`, `olIndex`, `coverageIndex`, `frontIndex`; `dl.run_stop_rate`, `dl.pressure_rate`; `ol.pressure_rate_allowed` | **Removed** as source blockers (leak-free, exact transform) |
| `receivers.adj_epa` / `targets` | Field resolved; consumer blocked by the two rows below |
| `rb.*` lead-back fields | **Retained**: AUTHENTIC_BUT_LEAKED |
| `qb.epaoe` | **Retained**: AUTHENTIC_BUT_LEAKED |

**New narrow residuals** that no Celo field settles:
- **Index tie order.** The 2025 ties resolve only by reverse bundle file order, whose provenance is unknown. Historical ties occur in most seasons and affect tied teams by at most one ordinal step (3.23 before regression).
- **Primary-QB and lead-RB selection ties** (listed per season in `celo_mapping.json`).
- **QB relocation gap.** The record has no QB rows for STL 2008–2015, SD 2008–2016 or OAK 2008–2019.
- **2008 receivers.** 8 teams have fewer than four qualifying receivers, and the bundle rule for that case is unobserved.

## 4. B2 reassessed

**Materially narrowed; not resolved.**
- **Reproducible:** every population input exists for 2008–2025, the filters and aggregation are exact, and the current 2025 reference still reproduces exactly.
- **Remaining semantic:** earlier Y−1 populations cannot be generated under the owner contract, because the beta, centre and residual definitions read `qb.epaoe`, and RB selection uses later seasons.
- **If the owner accepts those as-run values separately:** the earliest reference is Y−1 = 2008 (display 2009, burn-in 2008). Some seasons have 29–31 teams with a lead RB, so the ≥20-value requirement is met.

## 5. B3, B4, B6

- **B3 is unchanged in effect, but narrowed in provenance.** Production preseason Elo (`data/model-data.js rankings.elo`) equals Celo `rankings.elo` exactly (32/32, trajectories included). For earlier seasons, the record keeps only season-end snapshots, which differ from the final Elo (2025: up to 10.7, no team equal). The historical analogue is therefore not preserved, and that Elo is also hindsight-tuned. Weeks 2–11 stay blocked.
- **B4 is unchanged.** Live pass-rush provider selection is blocked as-run and is an owner policy decision retrospectively. The pass-rush prior is now leak-free.
- **B6 is unchanged.** QB needs display ≥ 2022; OL route 1 likewise, with route 2 available below that.

## 6. Historical-standing reference (Candidate A)

**Not unblocked.** A common all-unit reference needs every unit, and receivers, RB (leaked fields) and defense (B4) remain blocked, as do weeks 2–11 everywhere.

Per-unit Week 1 / Week 12+ references for QB (display 2022–2025) and OL (display 2009–2025) become possible once the conditions in the headline table are met. They would not give a common scale.

## 7. Remaining owner decisions

1. **Index and selection tie rule.** Needed for exact QB/OL/defense priors in seasons with ties. It is narrow, but semantic.
2. **`qb.epaoe`.** Keep it excluded (receivers/RB stay blocked), or accept as-run values for some Y−1 span (for example ≥ 2022 under the inferred tuning window).
3. **RB eligibility.** Keep it excluded, or accept the as-run Celo exclusion set.
4. **B4 retrospective pass-rush policy.**
5. **B3** (weeks 2–11): no preserved historical preseason Elo. Needs a rule or a reconstruction decision.

Verification steps that need no owner semantics: `passing_cpoe` and play-by-play disruption component coverage per season, and B5 relabelling.

## Checks

```text
node research/cycle9/md08_celo_replay_reassessment/check.mjs
node research/cycle9/md08_celo_replay_reassessment/celo_mapping.mjs   (regenerates the mapping; needs the Celo tree)
```

The checker verifies:
- input pins
- byte-equal regeneration of the classification and replayability results
- 34 controls: classification invariants, 13 production consumer anchors, active policies, stage replayability, the 2025 mapping and indices, the Elo provenance, historical coverage and the provenance pins
- the external Celo pins and mapping, when reachable
- `hashes.json`
