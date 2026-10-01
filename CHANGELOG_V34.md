# FORCE V34 - Early-season regime acceleration

V34 attacks a specific weakness in traditional Elo: preseason priors can remain too sticky after the first few games even when results strongly contradict them.

## Production change

A new transient early-season regime layer observes each team's scoring-margin surprise relative to FORCE's own baseline independent pregame expectation.

The V34 rule:

- no correction in Week 1;
- full correction strength in Weeks 2-3;
- taper to 80% / 55% / 30% in Weeks 4 / 5 / 6;
- exactly zero from Week 7 onward;
- subtracts a 3-point noise band from each game surprise;
- caps one observation at 24 surprise points;
- uses at most the three most recent games, with 0.60 recency decay;
- once two games exist, the latest two must both be meaningful surprises in the same direction or the correction shuts off;
- beating/losing to a strong opponent modestly amplifies the signal (20% per +100 Elo, capped);
- final transient line correction is capped at ±7 points;
- the correction is converted to Elo using the same coherent 6.5-logit probability/spread scale as V31.

The ordinary Elo state is kept separate. V34 changes the predictive/current displayed rating temporarily, but does not permanently bake the shock correction into Elo. This is deliberate: early volatility is allowed; season-long yo-yoing is not.

## 2025 preserved-row replay

The supplied Celo archive preserves 285 game-level 2025 pregame probabilities, rounded to 0.001. Replaying V34 on those rows produced:

| Window | Baseline Brier | V34 | Delta |
| --- | ---: | ---: | ---: |
| Week 2 | 0.181658063 | 0.153572295 | -0.028085768 |
| Week 3 | 0.219797438 | 0.221375025 | +0.001577588 |
| Weeks 2-3 | 0.200727750 | 0.187473660 | -0.013254090 |
| Weeks 4-6 temporal holdout | 0.257775444 | 0.254174807 | -0.003600637 |
| Weeks 2-6 | 0.234067312 | 0.226454850 | -0.007612462 |
| Weeks 7+ | 0.207845151 | 0.207845151 | 0.000000000 |
| Full 2025 | 0.213992505 | 0.211935805 | -0.002056700 |

The individual Week 3 result is slightly worse, but the combined early window materially improves and later-season games are mathematically untouched.

## Robustness check

A 288-configuration local neighborhood around the chosen rule was tested across threshold, scale, observation cap, opponent-strength interaction, and recency choices. All 288 improved:

- Weeks 2-3;
- the Weeks 4-6 temporal holdout;
- Weeks 2-6 combined;
- full-season 2025 Brier.

That reduces concern that the result comes from one knife-edge parameter choice.

## Important limitation

This is still **provisional**. The supplied archive does not preserve 2008-2024 game-level pregame FORCE probabilities, so a true multi-season walk-forward replay cannot be performed from the available artifacts. The preserved 2025 probabilities are also rounded, which is why the replay baseline (0.213992505) differs slightly from the exact canonical 2025 aggregate (0.213987578).

V34 therefore promotes the feature only as an early-window provisional correction and keeps it exactly zero after Week 6. It should be revalidated over historical row-level predictions as soon as those are available.
