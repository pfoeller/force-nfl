# FORCE V60

## Quick fixes
- Standardized predicted-line presentation to sportsbook-style one-decimal nearest-half notation (`x.0` / `x.5`). Whole-number NFL spreads remain valid; values are not artificially forced to `.5`.
- Restored live Penalty Impact by using nflverse team-stat `penalties` and `penalty_yards` fields instead of unavailable player-level defensive-penalty fields.
- Renamed ambiguous `Vs Vegas` context to `Recent vs spread` and clarified that it is each team's decayed/shrunk historical margin relative to the market spread, so opposing team values are not expected to mirror one another.
