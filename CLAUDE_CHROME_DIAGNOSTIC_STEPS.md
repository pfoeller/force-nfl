# FORCE V97 - Claude in Chrome Penalty Impact audit

Run FORCE V97 normally. Do **not** clear storage before collecting the audit.

## 1. Verify the running build

```js
await fetch('/api/health?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json())
```

Expected: `app_version: "V97"`, `diagnostic_version: "V97-DIAG-1"`.

## 2. Collect the league audit

```js
FORCE_PENALTY_SCALE_AUDIT()
```

```js
FORCE_PENALTY_OUTLIERS(40)
```

```js
await fetch('/api/penalty-scale-debug?limit=40&force_refresh='+Date.now(),{cache:'no-store'}).then(r=>r.json())
```

Return the complete raw results. For each team preserve:

- score / games / EPA per game / WPA pp per game
- raw z and capped z for EPA, WPA, first downs, erased TDs
- weighted contributions
- `preGuardCombinedZ`
- `combinedZ`
- `directValueAgreement`
- `directionGuardApplied`

For the outlier arrays preserve each event's `causal_epa`, `causal_wpa`, `actual_team_score_delta`, `counterfactual_team_score_delta`, `actual_team_ep`, `counterfactual_team_ep`, `actual_team_state_value`, `counterfactual_team_state_value`, `score_erased_points`, both football states, counterfactual type and description.

## 3. Deep-dive the five V96 audit teams

Run:

```js
FORCE_PENALTY_DEBUG('CAR')
FORCE_PENALTY_DEBUG('NE')
FORCE_PENALTY_DEBUG('MIN')
FORCE_PENALTY_DEBUG('KC')
FORCE_PENALTY_DEBUG('HOU')
```

And independently:

```js
await Promise.all(['CAR','NE','MIN','KC','HOU'].map(team=>fetch('/api/penalty-debug?team='+team+'&force_refresh='+Date.now(),{cache:'no-store'}).then(r=>r.json())))
```

Return the raw outputs, not a summary.

## 4. V97 invariants to flag

- A scoring counterfactual must include the score in `counterfactual_team_score_delta`; it must not rely only on future EP.
- An offensive penalty that erases the offender's own touchdown must not be credited to the offender merely because the post-score opponent possession has positive future EP.
- A made field goal nullified by penalty must use `counterfactual_kind: "erased-field-goal"` and a ±3 score delta in the fixed-team frame.
- If `raw.epa < 0` and `raw.wpa < 0`, the final score may not exceed 50. If both are positive, it may not be below 50.
- If the coherence guard fires, `directionGuardApplied` must be true and the pre/post combined z values must explain the change.
- Opponents in a one-game sample should remain exact sign opposites in net causal EPA/WPA, subject only to floating-point noise.
- A turnover is `turnover_erased` only if actual/no-penalty post-states differ in possession.
- Rankings PNG export should produce two team pages containing ranks 1–16 and 17–32; no blank controls-only page and no clipped rows.
