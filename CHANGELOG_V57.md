# FORCE V57

## 2026 unit priors
- Apply the same current-era 30% offseason regression-to-mean used by team Elo to 0–100 unit priors, toward neutral 50, before blending 2026 evidence.
- Derived Pass Rush, Run Defense, and RB priors are regressed after their 2025 percentile construction.
- Unit-to-FORCE compares live units against the regressed preseason unit prior, so offseason regression itself is not mistaken for in-season improvement/decline.

## First-class RB unit
- Add `rbIndex`, based on the RB/FB room's 70% rushing EPA/attempt + 30% receiving EPA/target composite, benchmarked against the 2025 RB composite distribution.
- Replace team `rushIndex` with `rbIndex` in the first-class Unit-to-FORCE bridge while retaining team rushing EPA as a diagnostic.
- Replace Run Offense/Run Game UI columns with RB and expose Team Efficiency separately in postgame unit-change diagnostics.

## Forecast cleanup
- Remove the redundant team logo and trailing orphan dot after “QB correction active” in the Predicted Line explanation.
