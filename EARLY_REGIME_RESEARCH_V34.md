# V34 Early-regime research note

## Question

Can FORCE react faster when the preseason prior is plainly wrong without turning the entire season into a high-K Elo model?

## Signal

For every completed game, compute:

`margin surprise = actual home margin - FORCE baseline expected home margin`

The baseline expected margin is reconstructed from the independent FORCE win probability using the same 6.5-logit mapping used by the V31 line calibration.

The signal is team-oriented: the home team receives the residual and the away team receives its negative. Opponent quality at the time of the game is stored with the observation.

## Why this differs from generic dynamic K

Generic dynamic K increases the response to *every* early result. V34 accelerates only when the model is being repeatedly surprised in the same direction. Ordinary or contradictory early results produce little or zero correction.

That distinction matters. A 2-0 team that won two games almost exactly as FORCE expected does not receive the same treatment as a 2-0 team that beat strong opponents by margins far beyond expectation.

## Chosen production rule

- 3-point surprise deadband
- 24-point per-observation cap
- 40% conversion of the weighted surprise signal into a temporary line correction
- ±7-point final correction cap
- three-game rolling window
- 0.60 recency weight
- two-game directional consistency gate once two observations exist
- opponent-quality multiplier: 20% per +100 Elo, bounded
- week fade: 0 / 1.0 / 1.0 / 0.80 / 0.55 / 0.30 / 0 from Weeks 1-7+

## Evidence available in the supplied archive

The only preserved game-level historical forecast rows are the 285 2025 rows in Celo's UI export. Those probabilities are rounded to three decimal places.

The rule improved Weeks 2-3 from 0.200727750 to 0.187473660 Brier. More importantly, Weeks 4-6 - treated as the later temporal check - improved from 0.257775444 to 0.254174807. Weeks 2-6 combined improved from 0.234067312 to 0.226454850.

A 288-point parameter neighborhood improved both the early selection window and the Weeks 4-6 temporal check in every case tested. The median Weeks 2-6 improvement in that neighborhood was -0.006416198 Brier.

## Interpretation

The 2025 evidence supports the user's core hypothesis: early-season Elo conservatism can be worse than temporary volatility when the early games sharply contradict the prior.

It does **not** establish that the exact V34 parameters are globally optimal or that the improvement will repeat across 2008-2024. For that reason the correction is deliberately temporary and the code preserves ordinary Elo as a separate core state.
