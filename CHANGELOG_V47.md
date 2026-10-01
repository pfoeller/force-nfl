# FORCE V47

## Exact scores now prefer real football score shapes

V46 could still overfit the exact-score display to the continuous forecast. The score normalizer rounded the forecast margin and then gave margin error a weight of 100, which effectively forced the displayed score to reproduce the line exactly. That produced arithmetic-looking outputs such as **KC 30–17** for a 13-point / 47-total target and **TB 26–18** for an 8-point / 44-total target.

V47 treats the exact score as what it actually is: a discrete point estimate sitting underneath a more authoritative continuous win probability and line.

- The line and underlying scoring total remain the targets.
- Candidate exact scores are limited to a tight ±4-point neighborhood of both targets.
- Distance from the targets is now a squared fit penalty rather than a hard margin-first rule.
- The existing TD/FG football-score prior is given enough weight to break near-ties strongly in favor of common score shapes.
- The forecasted winner is preserved whenever the continuous forecast meaningfully favors one side.

Representative regressions:

- target total **47**, margin **+13** → **31–17**, rather than forcing **30–17**;
- target total **44**, margin **+8** → **27–17**, rather than forcing **26–18**;
- target total **47**, margin **+11** still normalizes to the already-good **28–17**.

The predicted line itself is unchanged. The UI now explicitly says the exact-score margin may differ slightly from the line when a much more typical football score is nearby.

## Bottom forecast boxes are truly logo-only

The large **Predicted line** and **Predicted exact score** boxes now use a dedicated logo-only renderer with no abbreviation fallback element. The QB-correction mark inside that forecast copy uses the same treatment. This removes the stray team-code badges that could appear beneath the logos while leaving the shared logo/fallback behavior elsewhere in the app untouched.

## Regression coverage

`scripts/test_v47_score_prior_and_forecast_logos.js` locks the two reported score examples, symmetry, winner preservation, ±4-point score-neighborhood bounds, and the strict logo-only forecast rendering contract.
