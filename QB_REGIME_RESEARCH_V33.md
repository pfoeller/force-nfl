# V33 returning-QB regime research

**Status (2026-10-03, MD-03 Cycle 6):** the owner retired the automatic correction from current production as a decision under uncertainty; it was not disproven. The retirement passed independent validation and was accepted by the owner on 2026-10-03, and the accepted candidate applies no automatic QB-return correction. This research and `model/qb_regime.js` are preserved unchanged for possible future reconsideration. See [MD-03 retirement implementation](MD03_RETIREMENT_IMPLEMENTATION.md).

## Decision

Promote a **conservative, registry-gated** returning-QB correction to the default FORCE rating layer. Do not promote a blanket missed-start rule.

The distinction matters. The historical evidence says that some temporary starter absences leave persistent rating damage that should be partially unwound when the established starter returns, but the effect is heterogeneous. The production gate therefore requires a verified replacement-QB injury/medical window, a clear team-strength decline during that window, and confirmation that the same established starter returns.

## Evidence used

The existing 11-episode study isolates the next-season prior using real Celo season-end ratings and following-season outcomes. It is not a full-PBP rerun, but it is pregame-safe and leave-one-episode-out for the broad parameter search.

The six-case decline-gated subset is the closer analogue to the intended production rule. With an overlay of 7.5 Elo per verified missed start before offseason reversion and a 4-game half-life, Weeks 1–8 Brier changes from **0.2316760387** to **0.2218171743**, a **-0.0098588644** improvement, with **5 of 6** episodes improving.

The most aggressive gated setting tested did slightly better, but V33 deliberately does not use it. The selected setting sits inside a broad region of positive results and reduces the chance that the correction becomes a disguised manual power-rating override.

## Production transform

For an eligible preset:

`initial = min(measured surviving damage, min(60, 7.5 × verified missed starts) × offseason survival)`

Current-era offseason survival is 70%. The active overlay after `g` team games is:

`overlay(g) = initial × 0.5^(g / 4)`

The correction is rating-only. It feeds the independent FORCE line/probability through the same Elo transform as other rating changes and is also reflected in the QB/offense display overlay. Defense is unchanged.

A manual QB Return Lab value overrides the automatic total correction instead of adding to it.

## Kansas City 2026

The verified 2025 Mahomes replacement window contains three missed starts and approximately 47.33 Elo of measured damage surviving normal offseason reversion. The V33 production formula therefore chooses the smaller starts-based value:

`7.5 × 3 × 0.70 = 15.75 Elo`

The automatic V33 opening overlay is **+15.75 Elo**, with a 4-game half-life. The +47.3 Elo lab preset remains a deliberately more aggressive case-specific counterfactual, not the default model input.

## What V33 rejected

### Refit HFA / probability scale

The compact Celo archive preserves 285 individual 2025 game rows. Reconstructing the raw Elo win probability at HFA 15 / scale 340 gives 0.214575527 Brier. A same-sample grid reaches 0.214328307 at HFA 25 / scale 360, only -0.000247220 better. Because this uses one season in-sample and does not exactly reproduce the complete QB/effective-margin path, V33 does not change HFA or scale.

### Refit market decay

The archive preserves the historical closing-market aggregate result but not the joint per-game historical FORCE probability + market line + outcome rows needed to fit a week-specific decay honestly. V33 leaves the V32 schedule unchanged rather than tune against incomplete data.

## Baseline bookkeeping

Canonical independent-model scores preserved by Celo:

- 2008–2025: **0.21980551008673274**
- 2023–2025: **0.21696480283086164**
- 2025: **0.21398757779230115**
- 2023–2024 combined, derived from preserved sums of squared error: **0.21845341535014187**

Separate 2023 and 2024 scores are not recoverable from the supplied archive because their game-level prediction rows were not retained.

The complete machine-readable audit is `benchmarks/v33_research_audit.json`; `research/v33_research_audit.py` reproduces it from the compact bundled source snapshot plus the existing QB event-study files.
