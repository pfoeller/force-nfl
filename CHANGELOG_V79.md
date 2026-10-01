# FORCE V79

## FORCEcast Slate

- Adds a new top-level **FORCEcast Slate** tab for a compact weekly view of every game.
- Each game card shows both teams, the canonical FORCEcast win probabilities, and the normalized predicted final score.
- Defaults to the current week and supports switching to later weeks.
- The Slate export is intentionally one single PNG: it bypasses ordinary pagination and lets the canvas grow vertically when needed.
- Export remains output-only: no matchup reasoning or helper prose is included.
- All values reuse the existing FORCEcast / exact-score projection paths rather than introducing a second forecast calculation.
