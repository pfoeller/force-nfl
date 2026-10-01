# FORCE V82 - live-data integrity repair

V82 fixes a state-coherence failure exposed after the V80/V81 penalty work. When
current nflverse team/player feeds were unavailable, the browser could know that
2026 games had been completed while the live-profile builder was handed an empty
schedule. That let bundled 2025 unit priors appear as if they were current values,
which then contaminated rankings and future FORCEcasts.

## Changes

- The live-profile builder always receives the real completed 2026 schedule and
  game history, even when current stat rows are unavailable.
- After a team has played, stale/missing current unit families are suppressed;
  raw 2025 priors can no longer masquerade as current unit ratings.
- Current ranking/forecast surfaces are protected by a live-data integrity gate
  when the core team/player feeds are not fresh through the latest completed week.
- Critical runtime model modules (forecast engine, score normalizer, live profile
  engine, Unit→FORCE bridge) no longer fail silently in production.
- Exact-score projection no longer has a production fallback to simple integer
  rounding. If the football-score normalizer is absent, the forecast is withheld.
- The refresh window is 60 seconds so slower optional PBP aggregation does not
  unnecessarily abort an otherwise healthy refresh.
- `force_server.py` now persists last-known-good upstream responses to
  `data/live-cache/`, allowing a transient GitHub/provider outage after a server
  restart to reuse the last successful live snapshot rather than fall back to
  priors.
- Generic proxy endpoints now honor `force_refresh` while still retaining the
  last-known-good fallback.
- The 2026 PBP fetch uses the compressed nflverse CSV asset and persists the
  aggregated Game Flow / Penalty Impact payload.

The V81 four-component live Penalty Impact formula remains unchanged:
40% net penalty EPA + 25% net penalty WPA + 20% net first downs via penalty +
15% net touchdowns erased by penalty. If the PBP context is unavailable, the
score is blank rather than replaced with the historical 70/30 prior for a team
that has already played.
