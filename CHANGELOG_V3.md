# V3 changes

## Data freshness
- Added visible **↻ Refresh** button.
- Added automatic refresh every 60 minutes while page is open.
- Added background-tab catch-up refresh and online/reconnect refresh.
- Added last-updated / next-refresh indicator.
- Failed refresh preserves last good data.
- Refresh invalidates and recomputes 2026 result bridge, projections and adaptive state.

## Adaptive market research
- Added third forecast mode: **Adaptive v3 · research**.
- Added lagged team margin-vs-market residual.
- Added separate residual for teams favored by 6+ points.
- Added dynamic team-specific Vegas weight based on prior market-vs-independent Brier advantage.
- Added forecast-only Elo-equivalent history overlay for future games without a line.
- Added division-game interaction to the fitting harness, with runtime coefficient fixed at zero until validated.
- State is frozen for each full NFL week to avoid intra-slate lookahead.
- Added team-page Market Read cards and a full Model-page adaptive-state table.

## Research / validation
- Added `model/adaptive_v3.js` and `.py`.
- Added `model/fit_adaptive_market.py` nested chronological fitter.
- Added `scripts/test_adaptive_v3.py`.
- Added `benchmarks/adaptive_v3_status.json` explicitly recording that v3 is not yet promoted.
- Added `MODEL_RESEARCH_V3.md` with broader candidate features and promotion sequence.
- Retained **0.2095** as the best validated closing-market Brier benchmark; no unsupported lower number is claimed.

## Existing behavior retained
- 32 canonical current franchises only.
- Market-independent 0–100 FORCE Score.
- Rating bars remain red 0–40, yellow 41–70, green 71+.
- Smart v2 and Independent modes remain available.
- Team schedules, projected records and Roster Lab remain interactive.
