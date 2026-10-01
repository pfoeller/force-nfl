# FORCE v5 changelog

## Full-season matchup browser

- Matchup Center now includes completed, current-week, and upcoming games rather
  than only remaining games.
- Added status filtering for All / Completed / Current week / Upcoming.
- Week and team filters continue to work together with the status filter.

## Forecast audit on every game

Every game card now exposes three audit fields:

- **Pred line** - the model-implied pregame spread.
- **Pred score** - the model's exact-score point estimate.
- **Final** - actual score when available.

Completed-game predictions use the frozen pregame forecast stored by the
week-by-week season replay. The actual result never enters its own forecast.

## Command Center

- Added a full current-week forecast-audit panel.
- Added a recent-finals panel for quick prediction-vs-result review.
- Upcoming games retain the same predicted line and predicted score fields.

## Team pages

Each schedule row now carries the model prediction in addition to the existing
W/L result. Completed rows show predicted line + predicted score + final score;
future rows show the same prediction with the final left pending.

## Matchup report finale

Completed matchup reports now finish with three side-by-side audit cards:

1. predicted line;
2. predicted exact score;
3. actual final score and actual winning margin.

Future games show the first two until a final is available.

## Regression coverage

Added `scripts/test_forecast_audit_ui.js`. The fallback bundle is asserted to
contain exactly 15 completed Week 1 games, and the test verifies completed,
current-week, and upcoming classifications plus forecast-vs-actual rendering on
the Matchup Center, a completed game page, and a team schedule.
