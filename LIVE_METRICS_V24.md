# FORCE V24 live-metrics audit

## Data refreshed hourly

- nflverse schedule / scores / lines
- nflverse team weekly stats for 2026
- nflverse player weekly stats for 2026

If a live metric feed fails, FORCE preserves the last good live data. If no live unit feed has loaded yet, it falls back to the bundled 2025 prior. Current results can still update Luck and scoring context from the schedule feed.

## Unit construction

All live components are converted to league-relative 0–100 scores before early-season blending.

- **Team offense:** offensive EPA/play.
- **QB:** 80% QB EPA/play percentile + 20% CPOE percentile. The displayed QB name is the current-season QB with the most passing dropbacks in the feed.
- **Receivers:** receiving EPA/target.
- **Run game:** rushing EPA/carry.
- **OL:** 70% sack-rate-allowed percentile + 30% rushing-EPA percentile.
- **Defensive front:** 55% sack-rate-generated percentile + 45% opponent-rushing-EPA percentile (reversed).
- **Coverage:** 75% opponent passing EPA/play percentile (reversed) + 25% opponent CPOE percentile (reversed).
- **Defense:** 45% defensive front + 55% coverage, preserving the existing FORCE composite.
- **Offense composite:** 45% team offense + 25% QB + 15% receivers + 15% OL, preserving the existing FORCE composite.

## Prior blend

`live weight = current-season games / (current-season games + 4)`

Examples:
- Week 1 / one game: 20% live, 80% prior
- four games: 50% live, 50% prior
- eight games: 67% live, 33% prior

## Other diagnostics

- **Offensive EPA/play:** raw 2026 EPA/play is blended with the 2025 raw prior on the same four-game schedule.
- **QB EPA/CPOE:** current QB metrics are blended with the prior for display stability.
- **Scoring:** current points for/against are blended with the 2025 scoring prior.
- **Luck:** current-season actual wins (ties worth 0.5) minus the sum of frozen pregame FORCE-only win probabilities. This is current-season only once games exist; it is not blended with prior-year luck.
- **Penalties:** current tracked defensive-penalty yards by the team versus its opponents are used as a live diagnostic proxy. No fake EPA/WP conversion is applied.

## Forecast isolation

The live profile affects matchup cards, team/unit diagnostics, rankings, strengths/weaknesses, and raw EPA displays. The validated win-probability model remains Elo/market based until a unit-aware forecast is separately backtested out of sample.
