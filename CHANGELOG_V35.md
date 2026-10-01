# FORCE V35 - Forecast coherence

V35 resolves the public forecast contradiction exposed by the Week 2 IND–KC matchup, where the page could simultaneously show an approximately 93% model-only probability / KC -17 line and an approximately 85% blended probability / 29-18 score.

## One public FORCE forecast

- The main product now exposes one canonical **FORCE forecast**.
- When market data are available, that forecast uses the approved week-decaying market blend: W1 75%, W2 50%, W3 25%, W4 15%, W5 10%, W6+ 5% market.
- The independent rating-model probability remains available internally for research and diagnostics, but is not presented as a competing user-facing prediction.
- The forecast-mode selector was removed from the main UI. Public forecasts always use the canonical `smart` blend.

## Probability, line, and score are one stream

The displayed win probability, predicted line, and predicted score now all derive from the same canonical FORCE forecast probability. The old V30–V34 public line path that deliberately used the model-only probability has been retired from presentation.

A Week 2 shape such as ~93% independent model probability plus a market line around KC -6.5 now produces a blended FORCE probability around 86%, an implied line around KC -11.5, and an exact-score margin consistent with that same forecast.

## Football-score normalization

Raw expected scores are continuous arithmetic outputs. V35 adds `model/score_normalizer.js`, which:

1. preserves the rounded probability-implied margin first;
2. keeps the scoring-profile total nearby;
3. applies a light scoring-event plausibility prior based on ordinary 7-point touchdowns and 3-point field goals, with higher cost for less-common 8/6/2-point paths.

This turns a raw 47-total / 11-point-margin arithmetic output (29-18) into a nearby, more football-natural 28-17 while preserving the entire 11-point margin.

The normalizer is general; no team or matchup is hard-coded.

## Regression coverage

`test_v35_forecast_coherence.js` verifies:

- Week 2 remains exactly 50% market / 50% model;
- the KC-like blend lands around an 86% win probability and ~11.5-point line;
- 47 total / +11 margin normalizes to 28-17;
- margin preservation and home/away symmetry;
- the UI contains no competing FORCE-only probability/line labels;
- public line and score both use the same blended projection.
