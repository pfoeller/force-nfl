# FORCE V113 - League-wide Luck calibration + fumble ledger repair

- Replaces V112's hand-picked deserved-win conversion weights with a ridge-regularized logistic calibration fit across the full 2025 regular-season league game sample.
- Calibration inputs are EPA/play differential, success-rate differential, yards/play differential, total scrimmage-yards differential, offensive points/drive differential, and interception differential. Final score margin remains audit-only and is not a fitted predictor.
- Strengthens fumble-event parsing for every team: replay-reversed/overturned fumbles are excluded, play IDs support deduplication, and center/QB exchange fumbles can be recognized from quarterback-role context even when the PBP description does not literally say "bad snap."
- Keeps V112 standardized outcome-surprise semantics, V111 botched-snap weighting, the 55/25/20 raw Luck blend, rounded expected-wins UI, and nonlinear displayed-Luck calibration.
- Luck remains contextual/diagnostic only. It is not read by the Unit→FORCE bridge or forecast model, preserving FORCE/Elo predictive behavior and prior Brier characteristics.
