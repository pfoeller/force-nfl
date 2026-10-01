# FORCE V51

## 2026 offseason regression correction
- Deep verification found that the current-era (17-game-season) FORCE/Celo offseason rule is **30% regression toward the league mean**, not 33.3%.
- The older 33.3% value remains preserved as the legacy pre-2021 setting in the historical config artifact.
- Runtime `MODEL_DATA.config.reversion` is now 0.30 for the 2026 season boundary.
- `seasonEngine()` now explicitly constructs a preseason rating map as `mean + (prior_end - mean) * 0.70` before replaying any 2026 result.
- Every completed 2026 game is replayed from that corrected preseason state; current ratings, game histories, forecasts, and downstream displays therefore remain internally coherent.
- The season engine exposes `preseasonRatings`, `offseasonMean`, and `offseasonReversion` for audit/testing.
- Added `data/production-config-v51.json` to separate the live current-era rule from the preserved historical tuned-config artifact.
