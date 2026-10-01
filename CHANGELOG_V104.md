# FORCE V104 - historical QB calibration + like-for-like offense benchmarks

## Why

V103 fixed the conceptual QB-rushing overlap but exposed a scale problem: pass EPA was still mapped through a 32-team full-season percentile, causing six teams to hit 100 after two games. The early-regime controller could also reduce the QB prior below one game, allowing two-game samples to dominate the final grade. Separate audits found that V102's RB residual and OL disruption metrics were being scored against 2025 benchmarks defined differently from the live metrics.

## Changes

### QB
- Replaces the V103 shifted 32-team full-season pass-EPA percentile with same-sized rolling **2025 regular-season PBP windows**.
- Historical QB benchmark uses the same sack-free actual-pass EPA/attempt ownership as the live PBP path. Current opponent adjustment remains applied before scoring.
- Uses continuous empirical percentile interpolation across hundreds of historical windows, preventing the V103 second-highest-value saturation bug.
- CPOE is shrunk toward zero by pass-attempt volume: `attempts / (attempts + 60)` before the existing tanh transform.
- The QB preseason prior is floored at **1.0 equivalent game through the first four current games**, even when V37 accelerates other units below one game.
- Positive-only, kneel-free QB rushing bonus remains unchanged and capped at +12.
- `FORCE_QB_DEBUG(team)` now reports measured QB, displayed/scenario QB, scenario adjustment, benchmark sample size, raw/effective CPOE, and the QB prior actually used.

### Offensive line
- Live PBP pass-protection disruption rate is now calibrated against same-sized rolling 2025 PBP windows using the identical definition: **QB hit OR sack counts once per dropback**.
- Removes the V103 mismatch between live de-duplicated disruption and the older 2025 `pressure_rate_allowed` benchmark when the historical PBP reference is available.

### Running backs
- V102's receiving-residual RB composite is now scored against a like-for-like 2025 residual benchmark rather than the old raw receiving composite.
- Historical benchmark uses 70% RB rushing EPA + 30% (RB receiving efficiency − team/QB passing baseline), matching the intended orthogonal live construct as closely as the bundled 2025 snapshot permits.

### Returning-QB scenario visibility
- Scenario overlays remain intact for forecast continuity, but QB diagnostics now expose both the measured V104 QB index and the displayed scenario-adjusted value.
- QB unit cells with an active scenario carry an explanatory tooltip.

## Intentionally unchanged
- Offense/Defense top-level display scaling is not rescaled in V104.
- The V46 Unit → FORCE bridge cap remains ±7.5 pending a dedicated historical forecast backtest.
- The V100 defensive points-per-drive weight remains 20% in this release. The observed overlap with Coverage is real, but no clean historical residual/outcome calibration is bundled yet; changing the weight without a replay would mix measurement repair with an unvalidated forecast change.

## Validation
- Adds `test_v104_contract.js`.
- Adds `test_v104_qb_calibration.js` covering historical-window scoring, CPOE shrinkage, QB prior floor, rushing bonus retention, OL benchmark use, and RB residual reference construction.
- Adds `test_v104_reference.py` covering rolling historical PBP window construction.
