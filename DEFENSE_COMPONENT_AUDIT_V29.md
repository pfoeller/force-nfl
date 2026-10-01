# FORCE V29 - defensive-component audit

## Acceptance criterion

A defense must be able to receive **conflicting evidence** without one combined front score hiding what happened. Pass-rush performance, run defense, and coverage must move independently, and the total defense must always equal:

`0.45 × Coverage + 0.20 × Pass Rush + 0.35 × Run Defense`

The historical `frontIndex` may remain for compatibility, but it cannot affect the V29 defense composite.

## Why the V28 front was insufficient

V28 correctly prevented one poor run-defense sample from erasing an exceptional pass-rush performance. But that still left pass rush and run defense fused before the total defense was calculated. In a Colts-shaped game, a rising combined front could make the overall defense look healthier even when the opponent ran and passed efficiently.

V29 keeps the useful V28 pass-rush benchmark and removes the fusion.

## Production inputs

| Component | Live signal | Direction |
|---|---|---|
| Pass rush | Defensive QB hits + sacks / opponent dropbacks | Higher is better |
| Run defense | Opponent rushing EPA / rush | Lower is better |
| Coverage | Opponent pass EPA/dropback + CPOE | Lower is better |

Pass rush is benchmarked against the stable 2025 pressure-rate distribution. Each live component is then blended with its one-game stabilizing prior, so Week 1 remains 50% live / 50% prior.

## Mixed Indianapolis regression

The V29 synthetic audit deliberately gives Indianapolis useful pressure but very bad rushing and passing efficiency allowed.

| Metric | Before | After |
|---|---:|---:|
| Pass rush | 12.90 | 43.55 |
| Run defense | 41.94 | 20.97 |
| Coverage | 45.20 | 22.60 |
| **V29 defense** | **37.60** | **26.22** |
| Legacy combined front | 16.10 | 41.44 |

Raw defensive inputs in the fixture:

- disruption: 8 QB-hit+sack events over 36 opponent dropbacks = **22.22%**;
- rushing EPA allowed: **+0.400/play**;
- passing EPA allowed: **+0.389/dropback**;
- CPOE allowed: **+9.0**.

This is the key regression: **the legacy front rises by more than 25 points while the new total defense falls by more than 11 points.** The model can now acknowledge improved pressure without mistaking it for a good defensive game.

## Kansas City control

A deliberately dominant Kansas City defensive game moves every explicit component in the expected direction:

| Metric | Before | After |
|---|---:|---:|
| Pass rush | 87.10 | 93.55 |
| Run defense | 54.84 | 77.42 |
| Coverage | 54.80 | 77.40 |
| **V29 defense** | **61.27** | **80.64** |

This confirms the split did not merely make defenses more punitive: coherent positive evidence still raises the total strongly.

## Regression coverage

`scripts/test_v29_defense_components.js` performs **430 assertions** covering:

- all 32 teams;
- before/after bounds for pass rush, run defense, coverage, defense, and legacy front;
- the exact 45/20/35 defense identity before and after;
- the mixed Indianapolis directions;
- the dominant Kansas City control directions;
- exact raw Indianapolis disruption/run/pass/CPOE values;
- explicit component priors while no live stats are present.

`benchmarks/v29_defense_components.json` is generated from the test rather than hand-entered.

## Actual Week 1 replay

`scripts/test_v29_week1_replay.js` is a data-dependent audit for the real nflverse 2026 Week 1 team/player CSVs. The FORCE bundle deliberately does not vendor those external release assets. When local copies are supplied, the replay filters to Week 1 regular-season rows, runs the same production `buildProfiles()` transform, verifies 32-team component coverage and the defense identity, and writes `benchmarks/v29_week1_replay.json`.
