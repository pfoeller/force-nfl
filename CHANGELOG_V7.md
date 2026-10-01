# FORCE v7

## Optional rating-detail views

The public default remains **Power**: a clean 0–100 FORCE Score plus raw Elo and live bridge movement. Users can now switch the league rankings and every team page into four additional diagnostic views without changing the underlying rating:

- **Luck** - actual record, expected record, win surplus/deficit, and luck percentage.
- **Penalties** - net penalty EPA, estimated win-probability swing, raw penalty-event counts, yardage fields, and penalty-decisive games.
- **Units** - offense, defense, QB, offensive line, defensive front, coverage, rushing, and receiver indexes.
- **Advanced** - raw Elo, bridge delta, offensive EPA/play, scoring profile, adaptive market residual, Vegas weight, and forecast-only Elo equivalent.

The selected view persists through `localStorage`, making it practical to move between team pages while comparing the same category.

## Product doctrine

Luck and penalty benefit remain **diagnostics**, not hidden rating inputs. Their visibility has increased; their causal status has not. Unit indexes are also explicitly labeled as model-comparison indexes rather than the same historical 0–100 scale used by FORCE Score.

## Validation

Added `scripts/test_diagnostic_views.js` and extended bundle validation to verify all five views render in both league and team contexts.
