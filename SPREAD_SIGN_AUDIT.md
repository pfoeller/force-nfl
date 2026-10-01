# FORCE V16 - spread-sign audit

## Finding

The DEN @ KC matchup exposed a **presentation-only sign bug**.

FORCE stores nflverse `spread_line` in its native, home-oriented convention:

- `+2.5` = the **home team is favored by 2.5** (expected home margin +2.5)
- `-2.5` = the **away team is favored by 2.5**

Sportsbook notation is the opposite presentation convention for the favorite:

- home favorite by 2.5 -> `HOME -2.5`
- away favorite by 2.5 -> `AWAY -2.5`

The V15 matchup page printed the internal home-oriented number directly beside the home team, so KC's internal `+2.5` appeared incorrectly as `KC +2.5`.

## What was correct already

The sign was already interpreted consistently inside the predictive system:

- `model/forecast_v2.js` converts positive `spreadLine` to a home win probability above 50%.
- `model/forecast_v2.py` uses the same convention.
- `model/adaptive_v3.js` and `.py` treat positive spread as a home-favorite state.
- Market residual is `actual home margin - expected home margin`, which is correct in this coordinate system.
- The 6+ favorite logic assigns positive spreads to the home favorite and negative spreads to the away favorite.
- `fit_market_blend.py` explicitly documents positive `spread_line` as home favored.
- `fit_adaptive_market.py` uses the same orientation.
- `data/opening-lines.js` is stored in the same home-oriented convention.
- FORCE's derived **predicted line** already uses sportsbook notation and was not affected.

## V16 fix

Raw `spreadLine` never goes directly to user-facing line text anymore.

A presentation helper converts the internal representation at the boundary:

- internal `KC +2.5 expected margin` -> `KC -2.5 · DEN +2.5`
- internal `KC -2.5 expected margin` -> `DEN -2.5 · KC +2.5`

The Matchup page also says: **Sportsbook notation: negative = favorite.**

Adaptive line movement is now labeled directionally (`toward KC by 1.2 pts`) rather than as an ambiguous signed value.

## Regression guard

`scripts/test_v16_spread_sign.js` verifies:

1. KC's bundled `spreadLine: +2.5` renders as `KC -2.5 · DEN +2.5`.
2. The old `KC +2.5` presentation cannot leak back into the matchup page.
3. Positive internal spread produces a home probability above 50%.
4. Negative internal spread produces a home probability below 50%.

This keeps the model's internal coordinate system unchanged while making sportsbook-facing text correct.
