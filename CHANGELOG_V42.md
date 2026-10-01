# FORCE V42

## Team-level pressure completeness

V41 correctly moved Pass Rush to a pressure-first model, but its PFR readiness gate was only league-wide. During the provider's rolling weekly update, enough games could be fully charted to mark the feed ready even while a specific defense still had a sacks-only placeholder row.

V42 adds a team-level completeness gate. A defense's 2026 charted pressure is accepted only when its own sample is internally credible. In particular, if the ordinary nflverse weekly feed already contains QB-hit evidence that exceeds the pressure events present in the PFR row, the PFR row is treated as incomplete and receives zero live Pass Rush weight.

While a team's current charting is pending, FORCE holds the 2025 Pass Rush prior instead of ingesting partial pressure data.

## Pressure provenance in the UI

Matchup and Units surfaces now distinguish:

- `2026 charted pressure` when current team-level charting is complete; and
- `2025 charted-pressure prior · 2026 charting pending` while the live sample is being held out.

This prevents a prior/placeholder rate from being presented as though it were a current-season pressure rate.

## Matchup team marks

Team identity has been made materially larger on game/matchup pages, especially in the lower comparison and forecast sections:

- duel rows now use 38px team marks;
- forecast/final/market-line identities use 34px marks;
- edge and subedge marks are enlarged as well;
- abbreviations remain visible for unambiguous identification but no longer dominate the available space.

## Validation

`scripts/test_v42_pass_rush_readiness_and_matchup_logos.js` covers the partial-feed case where the league feed is broadly ready but Kansas City's row is still sacks-only, plus the enlarged matchup identity contracts.
