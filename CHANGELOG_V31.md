# FORCE V31 - coherent FORCE-line calibration

V31 fixes a real calibration inconsistency found by tracing the reported KC–IND case from displayed QB-adjusted ratings through the FORCE-implied line.

## Finding

V30 correctly routed the active QB-adjusted rating into the independent FORCE forecast, but the final probability-to-line conversion was internally inconsistent:

- `spreadToProbability()` used `sigmoid(spread / 6.5)`.
- `probToSpread()` converted the resulting probability with an unrelated `28.6 Elo per point` constant.

Those transformations were not inverses. The 28.6 constant compressed displayed FORCE lines toward pick’em by roughly 20% relative to the forecast module’s own spread calibration.

## Fix

`model/forecast_v2.js` now owns both directions of the calibration:

- `spreadToProbability(line)`
- `probabilityToSpread(probability)`

They share the same 6.5 logit scale and are exact inverses apart from the app’s sportsbook sign convention. `assets/app.js` delegates FORCE-line conversion to that canonical helper. The Python reference implementation exposes the same inverse.

With Elo scale 340, the coherent mapping corresponds to approximately **22.72 Elo per point**, not 28.6.

This does not force FORCE to equal Vegas. It only guarantees that a displayed FORCE line is mathematically consistent with the exact predictive rating/probability state FORCE is showing-including an active, Brier-eligible QB correction.

## Regression coverage

`test_v31_force_line_calibration.js` verifies:

1. representative spreads round-trip exactly through spread -> probability -> line;
2. Elo differentials map to line values on the same calibration;
3. a KC-away/IND-home example shaped like the reported ~61 vs ~38 FORCE scores is no longer compressed by the V30 constant;
4. the app uses the canonical forecast helper and the old 28.6 conversion is absent.
