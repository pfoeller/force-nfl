# FORCE V84

## Runtime diagnostics for live-data / partial-week failures

V84 is intentionally a diagnostic build on top of the V83 partial-week freshness repair. It does not change rating or freshness policy; it makes the full startup/data path observable so the exact failure can be identified from one browser session.

### Browser diagnostics

- Added a bounded `[FORCE-DIAG]` event log for startup, browser online/offline state, schedule refreshes, every live-data request, response status/body size/cache headers, CSV parsing, weekly-row merges, profile construction, and integrity-gate decisions.
- Feed summaries now record row count, columns, seasons, weeks, rows by week, and team coverage. This makes schema changes and partial upstream publications immediately visible.
- Profile diagnostics record, for all 32 teams, completed games/latest completed week, team/player stat games, freshness/usable/pending flags, pass-rush state, and which unit ratings are null.
- Added `window.FORCE_DIAGNOSTICS` with `snapshot()`, `collect()`, `report()`, `copy()`, and `reset()` helpers.
- Update Center now includes **Collect diagnostic report** and a selectable report field. The report combines browser state with the local proxy's diagnostic snapshot when available.
- A direct `file://` launch or an old/non-running local proxy is visible in the report instead of collapsing into a generic offline/unavailable state.

### Local proxy diagnostics

- Added an in-memory server event ring and `/api/diagnostics` endpoint.
- Logs upstream request start/response/error, memory/disk fallback choice, persisted payload size, and CSV row/week/team coverage.
- Weekly merge logging distinguishes the critical `weekly-merge:no-prior-snapshot` case from a successful partial-week merge. This is important on a fresh install if the current nflverse asset is itself partial and there is no Week 1 disk snapshot available to merge onto.
- Current-pressure and game-flow endpoints now log success/cache state and errors.

### Verification

- V82 integrity contract: pass.
- V83 team-specific partial-week freshness: pass.
- V82 persistent cache contract: pass.
- V83 partial-week server merge: pass.
- New V84 client/server diagnostics tests: pass.
- Existing stale tests `test_v11_ui.js`, `test_v14_matchup_clarity.js`, `test_v16_spread_sign.js`, and `test_v80_penalty_impact.js` already fail against the supplied V83 baseline and were not introduced by V84.
