# FORCE V93 - canonical per-game Penalty Impact aggregation + live audit

## Penalty aggregation correctness

- The browser no longer consumes `penalty_profiles` as the current-season source of truth. It rebuilds every team season Penalty Impact directly from `penalty_games`.
- Therefore season WPA is mathematically the sum/mean of finalized game-level team WPA values; no later home/away sign pass or legacy aggregate can reverse it.
- The server aggregate remains in the payload only as an audit comparison. Any disagreement is logged as `penalty:aggregation-audit`; the game-row result wins.
- `window.FORCE_PENALTY_DEBUG(team)` exposes game rows, individual penalty events, arithmetic WPA/EPA sums and averages, the direct server profile, the browser-recomputed profile, and the final live profile used by the UI.
- `/api/penalty-debug?team=BUF` exposes the same server-side game/profile audit without depending on browser closures. Add `&force_refresh=1` to force fresh nflverse inputs.
- V93 uses new game-flow/reference cache keys so a V92 aggregate cannot be silently reused.

## Scoring

No event-level penalty math or weighting changes in this version: current-season only, same-model nflfastR actual/counterfactual WPA, and the approved 40/25/20/15 blend remain intact.
