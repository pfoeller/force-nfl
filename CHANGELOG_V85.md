# FORCE V85

## Canonical refresh/bootstrap repair

V85 targets the observed asymmetry where a full browser reload could restore correct current data while the in-app Refresh / Update actions did not, and where an initial load could settle into an unavailable-looking state until a later reload.

### 1. Browser refreshes no longer accumulate stale weekly rows

V83 already made the local Python proxy the durable owner of partial-week reconciliation: it merges an in-progress nflverse weekly publication onto its last-known-good disk/memory snapshot before returning the response. V84 then redundantly merged that already-reconciled response into the browser's existing in-memory arrays.

That second merge could preserve stale or superseded browser rows that were absent from the new canonical proxy response. A browser reload appeared to fix the problem because it cleared those arrays before fetching again.

V85 removes that second ownership layer. A successful `/api/team-stats` or `/api/player-stats` response now **replaces** the browser's 2026 in-memory weekly snapshot. Partial-week retention remains server-side, where it persists across browser reloads and has one authoritative implementation.

### 2. Refresh requests during startup are queued, not discarded

V84 returned immediately when `S.refreshing` was already true. A user clicking Refresh or Update All while the initial bootstrap was in flight could therefore issue a request that did nothing.

V85 coalesces those requests into a pending refresh and runs it immediately after the active refresh completes. League-wide requests remain league-wide.

### 3. Initial incomplete state self-verifies once

After the first startup metric pull, V85 evaluates the same current-data integrity contract used by the UI. If played teams are still missing required current team/player coverage, V85 waits briefly and performs one additional canonical metrics pull automatically. The user should not have to discover that a browser reload fixes the first-load state.

### 4. `Connecting` is no longer mislabeled as `Offline`

Before the first successful live refresh, the header now reports Connecting / Live data unavailable as appropriate. `Offline` is reserved for an actual browser offline condition (`navigator.onLine === false`).

### 5. Local-server identity and launch race fixed

V85 adds `/api/health`, returning FORCE/V85 identity. Every data refresh verifies that identity before accepting data. This makes a stale or unrelated process on `localhost:8080` explicit rather than silently consuming it.

`serve_local.bat` / `.sh` no longer open the browser before the server binds. `force_server.py` binds first, detects port collisions, and opens the browser only after the V85 server is listening.

### Diagnostics retained

V84 browser/server diagnostics remain enabled and are versioned `V85-DIAG-1`. New events include `weekly-canonical-replace`, `schedule:refresh-queued`, `schedule:refresh-dequeued`, and bootstrap verification events.
