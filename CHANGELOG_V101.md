# FORCE V101 - Pass Rush / Coverage separation

## Scope

V101 is intentionally narrow. It preserves V100's 36/16/28/20 Overall Defense weights and the V99/V100 canonical continuity architecture. It changes only the Coverage efficiency input so sacks are no longer counted twice.

## Coverage definition

Coverage's EPA signal now comes from 2026 nflverse play-by-play on **actual pass attempts only**:

- `pass_attempt = true`
- `sack = false`
- `qb_spike = false`
- normal scrimmage downs 1–4 only
- EPA summed across those throws and divided by actual attempts

CPOE remains the secondary Coverage signal. The live Coverage grade remains 75% opponent pass-attempt EPA percentile + 25% opponent CPOE percentile, blended with the existing unit prior.

Sacks remain entirely in Pass Rush. A sack can no longer both raise Pass Rush and lower the opponent passing-EPA input used by Coverage.

If the play-by-play attempt-only Coverage sample is unavailable, V101 holds the prior Coverage value rather than falling back to sack-inclusive aggregate passing EPA.

## Continuity

The Week-2 entry anchor continues to use V100 historical Coverage semantics when reconstructing the frozen baseline. V101's new sack-free Coverage method applies to current/new evidence only. This avoids another baseline rewrite while still correcting the live model going forward.

## Defense / FORCE weights

Unchanged from V100:

- Coverage: 36% of Overall Defense
- Pass Rush: 16%
- Run Defense: 28%
- Defensive points allowed per opponent drive: 20%

The unit-to-FORCE bridge weights are likewise unchanged.

## Diagnostics

`FORCE_DEFENSE_DEBUG(team)` now exposes:

- final Coverage index
- raw EPA allowed per actual pass attempt
- CPOE allowed
- actual pass-attempt count
- old aggregate dropback EPA for comparison
- Coverage scope/provenance
- four Overall Defense component contributions

## Opponent adjustment

Still deferred. V101 is the clean-measurement step. Opponent-quality adjustment should only be added after the sack-free Coverage and simple points/drive model demonstrate proper directionality.

## Validation

New regressions prove:

1. sack EPA is excluded from Coverage PBP aggregation;
2. spikes and non-scrimmage conversion attempts are excluded;
3. V101 Coverage follows actual-throw EPA even when aggregate passing EPA tells the opposite story because of sacks;
4. V100 historical Coverage semantics remain available for the Week-2 entry anchor;
5. V101 identity and diagnostics are exposed correctly.
