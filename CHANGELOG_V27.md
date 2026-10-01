# FORCE V27

## Full metric-transform audit

V27 replaces symptom-by-symptom unit fixes with a full before/after transformation smoke harness. The harness builds a 32-team synthetic Week 1, gives Kansas City an intentionally elite all-around game and Denver an intentionally poor one, then checks every live/display metric before and after the transform.

### Fixes found by the smoke audit

- **Defensive front:** the in-season pass-rush signal was sack-only. It now uses defensive QB hits + sacks per opponent dropback as the disruption proxy, with run defense as the secondary component (75% disruption / 25% run defense).
- **Offensive line:** the field labeled `pressure_rate_allowed` was actually just sacks allowed. OL now uses opponent QB hits + sacks per offensive dropback as the pass-protection disruption proxy, blended with rushing efficiency (65% pass protection / 35% rushing).
- **QB CPOE:** the 2025 snapshot's `qb.cpoe` field is on a completion-percentage-like 0–100 scale, while nflverse `passing_cpoe` is true CPOE. V27 no longer blends those incompatible scales. The legacy value is retained only as `prior_completion_pct` provenance.
- **QB-return transform:** the offense/QB scenario transform is now a shared pure model function used by both the UI and regression tests, preventing UI-only drift.
- **Documentation/UI:** corrected stale copy that still said the live unit layer used a four-game prior. The production transform uses a one-game stabilizing prior (Week 1 = 50% live / 50% prior).

### Regression coverage

`test_v27_metric_transform_smoke.js` performs 2,127 assertions, including:

- all 32 teams
- every 0–100 unit index and composite
- offense and defense composite identities
- offensive/pass/QB/rush/receiving EPA
- true CPOE
- OL disruption allowed and sack rate allowed
- defensive-front disruption and sack rates
- run/pass EPA allowed and coverage CPOE allowed
- penalty event/yard context
- luck and expected wins
- scoring profile
- live sample/provenance fields
- Elo/FORCE movement after a simulated result
- Mahomes QB-return adjusted FORCE, offense, and QB unit
- QB-return invariants (defense/OL/front unchanged by the QB-only overlay)
- same-site rematch directionality

The synthetic elite-KC test now moves every major KC unit in the expected direction, including the high-prior defensive front.
