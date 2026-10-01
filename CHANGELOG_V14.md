# FORCE V14 - Matchup clarity + QB-return unit propagation

## Matchup cards

- Replaces ambiguous signed `matchup pts` badges with a named advantage, e.g. `DEN DEF +10` or `KC OFF +6`.
- Removes the unexplained `Trench edge` label.
- Uses explicit component comparisons:
  - QB vs coverage
  - Receivers vs coverage
  - OL vs defensive front
- States that **overall edge = offense profile − defense profile**.
- States that the component rows are supporting matchup context; they are **not added together** to create the overall edge.
- Explains the unit composites in plain English:
  - offense = 45% team offense + 25% QB + 15% receivers + 15% OL
  - defense = 45% defensive front + 55% coverage
  - run-game score is shown separately as a diagnostic

## QB-return scenarios

The QB carryover correction now propagates into current/future unit displays instead of changing only team Elo/FORCE Score.

The scenario is intentionally offense-specific:

1. Apply the selected QB-return Elo restoration to the team rating.
2. Convert the resulting whole-team FORCE Score movement into an implied offensive movement while holding defense fixed.
3. Apply that offensive movement to the two QB-sensitive inputs in the current offensive composite: team offensive performance and QB play.
4. Leave OL, receivers, run-game, defensive front, and coverage unchanged unless their underlying data changes.

For the built-in Kansas City / Patrick Mahomes +47.3 Elo example, the current bundled snapshot moves approximately:

- FORCE Score: 45.5 → 53.8 before live-game bridge differences
- Offense profile: 61.3 → 77.9
- QB unit: 71.0 → 94.8
- Defense: unchanged

The UI labels these as **QB-return scenario** values and retains the original unit score as `base` where useful. This does not rewrite historical 2025 stats.

Historical completed-game matchup reports remain frozen and do not receive a present-day QB-return overlay.

## Rankings and team pages

When a QB-return scenario is active:

- Units view reflects the scenario offense and QB ratings.
- Sorting Offense or QB uses the scenario value.
- The base unit value remains visible under the adjusted number.
- Strengths/weaknesses and future matchup pages use the same scenario-adjusted unit view.

## Validation

Added `scripts/test_v14_matchup_clarity.js` to verify:

- the Mahomes preset materially raises the KC offense display;
- matchup pages explain overall edge and line play explicitly;
- the old `Trench edge` and `matchup pts` language is absent;
- active QB-return scenarios propagate into matchup offense ratings.
