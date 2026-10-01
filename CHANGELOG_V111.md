# FORCE V111 - Fumble Luck Repair + Cleaner Luck Display

V111 keeps V110's game-level deserved-win model, V109's stabilized RB/Receiver units, V108's Offense/Defense composite calibration, and V106's QB architecture. It makes three focused Luck changes:

1. **True fumble-event accounting.** Fumble Luck now counts de-duplicated, identifiable live-ball recovery events rather than every PBP fumble marker. Overturned/non-fumbles and no-play rows are rejected. Exact duplicate indexed fumble/recovery records on the same play collapse to one event, while genuinely separate second fumbles remain separate.
2. **Botched snaps are not treated like 50/50 loose balls.** A botched/aborted snap has 30% of an ordinary fumble's Luck weight and uses an 80% expected recovery baseline for the fumbling offense (20% defense). An offense simply falling on its own bad snap therefore contributes very little positive luck, while a defense recovering one remains meaningfully lucky.
3. **Simpler expected-wins UI.** Normal Luck views show only a single expected-wins point estimate, rounded to the nearest whole win. Exact expected wins, expected losses, Pythagorean expectation, pregame expectation, and per-game deserved-win probabilities remain available in `FORCE_LUCK_DEBUG(team)`.
4. **Wider displayed Luck scale.** The raw three-part Luck blend remains 55% deserved-win surplus / 25% Penalty Impact / 20% fumble-recovery luck. V111 preserves that raw value for diagnostics and applies a 50-centered nonlinear display calibration (softness 22) so meaningful league differences are easier to see without forcing the best/worst teams to 100/0.

`FORCE_LUCK_DEBUG(team)` now exposes raw and displayed Luck separately plus raw/weighted fumble opportunities, recoveries, expected recoveries, excess recovery, botched-snap counts, and the rounded expected-wins display value.
