# FORCE V83

## Partial-week live-data freshness repair

- Freshness is now explicitly team-specific during an in-progress NFL week. A team that has only completed Week 1 remains current on Week 1 data even after another team has completed a Week 2 game.
- Teams whose newest game is ahead of the nflverse weekly-stat publication retain their last-known-good 2026 unit/profile rows and are marked pending, rather than blanking or reverting to 2025 priors.
- Current pages no longer fail league-wide merely because one or two teams are waiting on the newest weekly stat rows; only teams with no usable 2026 snapshot trigger the integrity block.
- Browser refreshes merge partial weekly team/player payloads into the already-loaded season rows instead of replacing them.
- The local proxy also merges partial nflverse weekly assets onto the disk-backed last-known-good snapshot, preserving previous weeks across restarts while allowing official corrections to replace matching rows.
- Update Center distinguishes CURRENT, PENDING/PARTIAL, and genuinely unavailable data using each team's own latest completed week.
