# FORCE V43 - FTN-first pressure provider

## What changed

V43 moves Pass Rush to an **FTN-first pressure-provider architecture** without fabricating a pressure result that the current public in-season FTN subset does not publish.

- FORCE now refreshes nflverse's live `ftn_charting_2026.csv` play-level charting feed alongside team/player and PFR data.
- A new provider contract inspects the FTN schema for an explicit pressure-outcome field (`was_pressure`, `is_qb_pressure`, `is_pressure`, or `pressure`) and defensive-team identity before FTN may affect Pass Rush.
- If that contract is satisfied, FTN play-level pressure becomes the primary pressure signal. nflverse weekly QB hits and sacks remain the finishing bonuses at the existing +0.20 / +0.60 weights.
- If the FTN pressure contract is not satisfied, FORCE transparently uses the V42 team-verified PFR/Sportradar advanced-pressure path.
- If neither current provider is complete, FORCE holds the 2025 pressure prior with zero current Pass Rush weight.
- `n_pass_rushers`, `n_blitzers`, quarterback movement, and QB-fault sack flags are never treated as substitutes for a true pressure outcome.

## Why the public FTN feed does not drive today's score

The current nflverse FTN charting dictionary has 29 public fields. It includes play-level context such as `n_blitzers`, `n_pass_rushers`, and `is_qb_fault_sack`, but it does not include a generic pressure outcome. nflverse's participation dataset does expose `was_pressure`, but FTN-derived participation for 2023 onward is documented as a post-season release rather than an in-season feed.

V43 therefore makes the source transition structurally now while keeping today's rating honest: FTN is checked first, but PFR remains the scoring fallback until a true in-season FTN pressure outcome is available through the public data contract.

## Provenance

Every live profile now exposes:

- `ftnPressureReady`
- `ftnPressureField`
- `ftnPressureReason`
- `ftnChartingRows`
- `passRushProvider` (`ftn-play-level`, `pfr-advanced`, or `prior`)

The Units and matchup explanations identify whether the displayed current pressure comes from FTN or the PFR fallback.

## Validation

`scripts/test_v43_ftn_pressure_provider.js` adds 20 assertions covering:

- rejection of the real public FTN schema when no pressure outcome exists;
- explicit refusal to infer pressure from `n_pass_rushers`;
- acceptance of a synthetic true `was_pressure` play stream;
- correct 50% play-level pressure aggregation;
- hit/sack finishing bonuses layered on top of FTN pressure;
- FTN precedence over a simultaneous PFR sample;
- automatic PFR fallback when the FTN contract is not satisfied;
- server/app wiring and source disclosure.

The validated forecast engine and predictive feature gates are unchanged.
