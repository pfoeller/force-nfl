# FORCE V99

## Canonical rating continuity

V99 fixes the early-season rating cliff exposed after Week 2. The source audit found that the dominant discontinuity was V34's transient early-regime correction: one large Week-1 surprise could create up to a seven-point expected-margin overlay, while the old two-result consistency gate could remove that overlay in one step after a quieter or opposite Week-2 result. On the Elo scale used by FORCE, that removal can be roughly 159 Elo - enough to create a ~30-point FORCE move without a comparably large change in causal football evidence.

`model/rating_continuity.js` replaces that production cliff. Its one-observation behavior preserves the Week-2-entry signal already established by FORCE, while later observations unwind or reverse the correction continuously. The public canonical state therefore remains on one rating lineage rather than switching meaning when a new week/data regime activates.

The ordinary result Elo update remains causal and unchanged in sign: winners receive non-negative result deltas and losers non-positive deltas. V98 retrospective opponent-strength look-back is retained as a separate current adjustment.

## Rating ledger and diagnostics

V99 adds:

- `FORCE_RATING_LEDGER(team?)`
- `FORCE_UNIT_AUDIT(team?)`
- `FORCE_PASS_RUSH_DEBUG(team)`
- `FORCE_WEEK2_ENTRY_STATE(team)`

The ledger reconstructs each team's canonical Week-2-entry state from the V98 historical recipe (including V98's missing-Pass-Rush semantics, so V99's new fallback cannot retroactively rewrite the baseline) and reconciles movement through result/core Elo, early-regime continuity, retrospective opponent-strength adjustment, unit bridge and QB adjustment. It exposes a residual so hidden rebases are detectable.

## Week 2 Pass Rush recovery

Advanced PFR/Sportradar pressure data can publish late or incompletely. V99 keeps the existing rule that incomplete advanced charting is never scored as zero, but no longer leaves Pass Rush unavailable league-wide when valid current nflverse weekly disruption data exist.

Provider order is:

1. curated/manual current pressure;
2. true FTN play-level pressure when the feed exposes a real pressure outcome;
3. fresh StatRankings current pressure;
4. complete PFR advanced pressure;
5. nflverse weekly QB-hit+sack disruption per opponent dropback;
6. explicit prior hold only if no valid current signal exists.

The weekly disruption fallback uses same-current-sample scoring rather than pretending a hit+sack proxy is the same measurement as PFR hurry-inclusive charted pressure. Provider provenance is exposed in the UI and diagnostics.

## Missing-data behavior

Pass Rush now remains a first-class defensive component through a valid fallback or explicit prior hold. Missing advanced charting therefore does not silently become zero performance and does not force a league-wide null Pass Rush state.

## Retained V98 look-behind

The V98 retrospective opponent-strength mechanism remains intact. Later opponent results can incrementally strengthen or weaken the current value of an earlier result while the historical pregame forecast state remains frozen.

## Regression coverage

V99 adds dedicated tests for:

- smooth early-regime continuity and removal of the abrupt two-result shutdown;
- Week-2-entry continuity hooks and rating-ledger reconciliation contracts;
- nflverse weekly Pass Rush fallback for teams without complete advanced pressure charting;
- V99 app/server identity and diagnostics.

Historical regression tests were updated only where older assertions described superseded UI wording or intentionally replaced fallback behavior.
