# FORCE V77

## Team/opponent-aware Game Flow timing
- Replaces the generic league-average quarter allocation target with a pregame-safe blend of 2025 and 2026 quarter scoring tendencies.
- Current-season trust uses `n / (n + 6)`: ~14% after 1 game, 25% after 2, 40% after 4, and ~57% after 8, capped at 80%.
- Each team's timing target combines 50% of its blended offensive timing, 30% of the opponent's blended points-allowed timing, and a 20% league-average anchor.
- The existing football-normalized quarter-score allocator remains in force, including exact-final arithmetic and conversion-strategy rules.
- The timing layer has zero win-probability/FORCEcast-line weight; it only determines when the already-projected points are expected to arrive.
- Adds a local `/api/game-flow-2026` endpoint that aggregates nflverse 2026 play-by-play into per-game regulation quarter splits so historical matchup pages can exclude same/future-week data.
