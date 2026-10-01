# FORCE V37

## Regime-aware unit priors

V34 made the team-strength forecast deliberately more responsive when early results repeatedly showed that the preseason prior was probably wrong. Through V36, however, the Rankings → Units grades continued to use a fixed one-game 2025 stabilizing prior. That meant FORCE Score and the unit board could visibly update at different speeds.

V37 makes the unit system use the same *confidence* signal without pretending that a team-level surprise identifies which unit caused it.

- The V34 early-regime correction is converted to a 0–1 prior-failure strength using the absolute correction magnitude.
- With no regime signal, unit grades retain the legacy **1.00 effective prior game**.
- At the capped V34 signal (±7 implied spread points), the stabilizing prior falls to **0.25 effective games**.
- Intermediate signals interpolate continuously between those endpoints.
- The sign of the team correction is intentionally ignored for unit direction. A positive team surprise does not automatically raise every unit, and a negative surprise does not automatically lower every unit. Each unit still moves only toward its own measured 2026 performance.
- Because V34 fades in Weeks 4–6 and becomes exactly zero in Week 7+, unit prior acceleration fades with it and ordinary blending resumes automatically.
- Historical pregame/postgame unit views reconstruct only the early-regime evidence available before that week, preserving leakage safety.

### Example weighting after one live game

| V34 correction magnitude | Effective 2025 prior games | Live weight | Prior weight |
|---:|---:|---:|---:|
| 0 points | 1.000 | 50.0% | 50.0% |
| 3.5 points | 0.625 | 61.5% | 38.5% |
| 7.0 points | 0.250 | 80.0% | 20.0% |

This is a display/diagnostic unit-model improvement. Under the V30 predictive-feature policy, these unit scores remain zero-weight in the win-probability forecast unless separately validated out of sample, so V37 does **not** claim a Brier-score improvement from this change.
