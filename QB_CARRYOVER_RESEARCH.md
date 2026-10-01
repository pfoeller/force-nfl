# QB Injury Carryover Research

## Question

Should a temporary starting-QB injury be prevented from depressing the persistent team/QB state that becomes the following season's baseline?

The specific hypothesis is sensible: if an established starter misses games, the team performs worse with a backup, and the starter is expected back, the next season should not inherit a baseline that treats the backup period as representative of the returning roster.

## What the existing model already does

The current Elo engine is more protected against this than classic team Elo. Pregame team strength is:

`team Elo + QB adjustment`

The Elo update then uses the win probability after that QB adjustment. A backup start therefore lowers the team's expected win probability before the result is observed. If the backup loses as expected, the underlying team Elo takes a smaller penalty than an unadjusted Elo model would. This already prevents much of the injury damage from becoming permanent team-strength damage.

The remaining potential leak is the per-team `qb_baseline`. Every start currently moves that persistent baseline 10% toward the QB who played. A multi-week backup stint can therefore pull the team's priced-in QB state toward the backup even if the established starter is expected to return.

## Experiments run

Synthetic walk-forward seasons were generated using the same Celo Elo/QB architecture. Evaluation seasons were 2021-2025, and each game was always predicted before its result was used. Two candidate families were tested:

1. **Offseason starter re-anchor.** Before preseason reversion, move team Elo and the team QB baseline toward the known returning starter by 25%, 50%, 75%, or 100%.
2. **Slower persistent QB-baseline drift.** Reduce the per-start baseline update from the current 10% to 2.5%, 5%, or 7.5%.

Tests were run at a roughly normal synthetic QB injury rate (4.5% per healthy QB-week) and a deliberately stressful 10% injury rate.

## Results

The effect is real in the synthetic environment, but small. In a focused three-seed run using 2014-2025 simulations and 2021-2025 evaluation:

| Candidate | Injury rate | All-game Brier Δ vs current | Weeks 1-4 Brier Δ vs current |
|---|---:|---:|---:|
| 100% offseason starter re-anchor | 4.5% | **-0.000083** | +0.000012 |
| 75% offseason starter re-anchor | 4.5% | **-0.000070** | +0.000014 |
| 5% QB-baseline drift | 4.5% | **-0.000090** | **-0.000015** |
| 2.5% QB-baseline drift | 4.5% | **-0.000121** | +0.000040 |
| 100% offseason starter re-anchor | 10% | **-0.000106** | **-0.000467** |
| 75% offseason starter re-anchor | 10% | **-0.000089** | **-0.000369** |
| 5% QB-baseline drift | 10% | **-0.000031** | **-0.000231** |
| 2.5% QB-baseline drift | 10% | **-0.000035** | **-0.000402** |

Negative is better. Earlier three-seed tests showed the same broad pattern: re-anchoring can help when injury exposure is high, and a slower baseline update often beats the current 10% rate, but seed-to-seed results are not uniformly positive.

## Decision

**Do not promote this into the production model yet.**

The hypothesis is warranted and the synthetic evidence is mildly encouraging, but the Brier gains are on the order of 0.00003-0.00012 overall. That is too small to justify a production change without a real historical injury-episode backtest. The early-season benefit also is not stable enough at the more realistic injury rate.

The most promising candidate for the next real-data test is not a blunt offseason Elo bonus. It is:

- identify temporary backup starts caused by injury rather than benching/trade;
- prevent or substantially reduce those starts from pulling the team's persistent `qb_baseline` toward the backup;
- at season rollover, re-anchor only when the pre-Week-1 expected starter is the established returning starter;
- test the correction strictly on future-season games, with special reporting for Weeks 1-4 and full-season Brier;
- require improvement across multiple held-out seasons before promotion.

This avoids giving a team free rating points merely because its quarterback was injured, while still testing the user's intended idea: preserve the underlying quality signal that should return with the starter.
