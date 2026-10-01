# FORCE V107 - Composite Scale Calibration

- Keeps V106's QB architecture unchanged.
- Keeps V102 orthogonal Offense weights unchanged: 20% points/drive, 30% QB, 15% receivers, 15% OL, 20% RB.
- Keeps Defense weights unchanged: 36% Coverage, 16% Pass Rush, 28% Run Defense, 20% points allowed/drive.
- Fixes the apparent Offense/Defense ceiling caused by weighted-average variance compression.
- Stores the raw weighted means as `offenseCompositeRaw` and `defenseCompositeRaw`.
- Displays calibrated composites using `50 + (raw - 50) * 1.45`, clamped to 0–100.
- The 1.45x factor is fixed rather than recalculated from the current 32 teams, so the scale does not move just because league dispersion changes week to week.
- Predictive FORCE is unchanged: the Unit → FORCE bridge still consumes the underlying component unit deltas directly, not the calibrated composite.
- Adds `FORCE_COMPOSITE_DEBUG(team)` for raw/displayed scale auditing.
