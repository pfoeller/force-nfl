# FORCE V91 - nflfastR-model Penalty WPA

## Penalty Impact

- Penalty Impact remains current-season only. 2025 team penalty results do not carry into 2026.
- The approved score blend remains unchanged: 40% causal penalty EPA, 25% causal penalty WPA, 20% net first downs via penalty, 15% net touchdowns erased by penalty.
- V91 removes the empirical/nearest-state WP surrogate used in V90/Preview91.
- Reconstructed no-penalty states are now scored with nflfastR's actual **no-spread** XGBoost win-probability model (`fastrmodels::wp_model`). The model has been exported to `data/nflfastr_wp_model.json` and is evaluated by a small pure-Python tree runner, so FORCE does not require R, xgboost, or another Python package at runtime.
- Actual enforced-state WP continues to use nflverse `home_wp_post`. Counterfactual posteam WP is converted to the same fixed home-team frame before subtraction.
- The counterfactual scoreboard now always branches from the **pre-play** score (`posteam_score` / `defteam_score`), not post-play `total_home_score` / `total_away_score`, preventing actual scoring from leaking into the hypothetical state.
- Pre-snap no-play penalties preserve the down and clock in the no-penalty counterfactual. Live-ball nullifications continue to recover the underlying football action where possible.

## Historical use

- 2025 play-by-play is used only to calibrate the league-wide 0–100 component scales under the V91 method.
- A new V91 2025 reference cache key and V91 game-flow cache key prevent reuse of V90 surrogate-WP penalty values.

## Diagnostics / identity

- App identity: `V91` / `V91-DIAG-1`.
- Penalty UI provenance now explicitly states that WPA uses nflfastR's no-spread model.

## Regression coverage

- Pure-Python model inference is checked against reference XGBoost outputs to <1e-6.
- Buffalo/Houston late false-start benchmark: the Houston penalty produces roughly **+3.0 WPA percentage points for Buffalo**, not a negative value.
- Counterfactual scoring starts from the pre-play scoreboard, preventing erased-score double counting.
- Existing refresh/bootstrap, partial-week cache/freshness, Update Center, Unit→FORCE bridge, historical-state, and 2,455-metric transform smoke tests remain passing.
