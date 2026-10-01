# FORCE V44 - hard current-pressure freshness

## Goal

V44 makes **freshness a correctness requirement** for the Pass Rush unit. Once a team has played a 2026 game, FORCE will not display a Pass Rush grade based only on a 2025 pressure prior or an incomplete current-season pressure sample.

## Current-pressure provider order

For the present live profile, FORCE now selects the first eligible source in this order:

1. **Curated current override** - a browser/Codex-assisted value in `data/pressure-current.manual.json`.
2. **FTN true play-level pressure** - only when the in-season FTN schema exposes an explicit pressure outcome and defensive-team identity.
3. **StatRankings current-season team pressure rate** - fetched automatically from the current team defensive Pressure Rate page and normalized by `force_server.py`.
4. **PFR/Sportradar advanced pressure** - only when the team-specific sample is complete and covers every completed current-season game.
5. **Unavailable** - no stale substitute is inserted.

The provider choice is provenance, not branding: StatRankings pressure is labeled StatRankings, PFR pressure is labeled PFR, and a manually sourced NFL Next Gen Stats number remains labeled as the curated source supplied in the override file.

## Hard freshness rule

A current-season pressure row is eligible only when FORCE can establish that it is newer than the team's latest completed game.

Because the automatic StatRankings page exposes a calendar date rather than a precise timestamp, FORCE conservatively requires its `as_of` date to be **at least the next calendar day after the latest completed game**. A manual row may additionally declare `games`; if present, that count must cover all current completed games for the team.

If no source passes these checks:

- `passRushIndex` is `null` rather than a stale prior;
- the raw pressure rate is suppressed;
- Units and matchup surfaces render `-` / `current pressure data unavailable · stale prior suppressed`;
- the defense display composite is re-normalized over Coverage + Run Defense for that team rather than inserting an old or neutral Pass Rush value.

The validated forecast engine is unchanged: descriptive unit ratings remain Brier-gated at zero predictive weight under the V30 policy.

## Automatic current source

`force_server.py` adds `/api/current-pressure`. It attempts to fetch:

`https://statrankings.com/nfl/advanced/teams/defense/pressure-rate`

The parser reads the page's `Last updated` date, identifies teams from visible text or team image/link attributes, and returns normalized current-season pressure rates. It does **not** reuse the page's 2025 comparison as current data.

If page markup changes, the parser is blocked, or team coverage is partial, uncovered teams do not receive a stale replacement. The app shows a pressure-freshness warning and the manual path remains available.

## Browser/Codex override escape hatch

`data/pressure-current.manual.json` is intentionally part of the bundle. A weekly browser-assisted extraction can enter a trusted current value there:

```json
{
  "as_of": "2026-09-16",
  "source": "NFL Next Gen Stats via browser review",
  "source_url": "https://www.nfl.com/...",
  "teams": {
    "KC": {
      "pressure_rate": 0.455,
      "games": 1,
      "through_week": 1,
      "note": "Week 1 current-season pressure rate"
    }
  }
}
```

A percentage from 0–100 is also accepted and normalized to 0–1. Per-team `as_of`, `source`, and `source_url` can override the top-level values. Manual rows are still subject to the same freshness/game-coverage checks; FORCE does not trust a manual value merely because it exists.

After editing the file, click **Refresh** in FORCE. The server re-reads the manual file on every `/api/current-pressure` refresh.

## Leak protection

The present season-to-date current-pressure table is **not** passed into `profileBeforeWeek()`. Historical/completed-game transforms continue to use only data that existed in their filtered week scope. This prevents a Week 2 season-to-date pressure value from leaking backward into a Week 1 historical view.

## Validation

V44 adds:

- `scripts/test_v44_pressure_freshness.py` - automatic-page parser, hidden team identity, update-date extraction, and manual-override server contract.
- `scripts/test_v44_pressure_freshness.js` - fresh KC current-pressure acceptance, finishing bonuses, stale-date rejection, hard score suppression, defense re-normalization, manual override precedence, incomplete-manual rejection, and null-safe UI behavior.

The live StatRankings network request cannot be exercised inside the packaging sandbox because outbound DNS/network access is unavailable there. The parser/provider contracts are regression-tested with representative HTML, and the manual override path is the intentional fail-safe if the live scrape is blocked or its markup changes.
