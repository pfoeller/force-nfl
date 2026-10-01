# FORCE v4 changelog

## Clickable games

- Command Center game cards now open a dedicated matchup report.
- Matchup Center cards use the same report.
- Every row on a team's season schedule is clickable, including completed games.
- Completed-game reports retrieve the season engine's frozen pregame ratings and
  probabilities instead of recalculating the historical forecast from today's
  rating.

## Rich matchup model data

Added `data/matchup-data.js`, canonicalized to the 32 current franchises. It
packages 2025 model diagnostics for:

- offense EPA/play;
- primary-QB EPA/play, CPOE and predictive adjustment;
- offensive line;
- defensive front / pass rush / run defense;
- coverage;
- receiving efficiency;
- rushing efficiency;
- expected-win luck;
- penalty EPA, win-probability swing and penalty-decisive games;
- 2025 points scored/allowed baselines.

The game report turns these into descriptive 0–100 percentile comparisons while
retaining raw metrics beneath them.

## Projection finale

Each matchup report ends with:

- the active forecast's implied predicted line;
- the independent-model implied line for comparison;
- a model total estimate; and
- an exact final-score point estimate.

Exact score is intentionally labeled lower-confidence than line/win
probability. For completed games, 2026 scoring inputs are restricted to prior
weeks to prevent outcome leakage.
