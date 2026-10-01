# FORCE V70

- Fixes completed-matchup PNG pagination after the rematch/postgame sections expanded.
- Splits the completed-game finale into three logical export blocks: forecast/final, postgame FORCE + rematch, and unit update.
- Rebalances any underfilled export page by pulling a fitting logical block forward from the next page.
- Prevents the unit-update table from being clipped below the bottom of the final PNG.
- Live matchup pages and model calculations are unchanged; this is export pagination only.
