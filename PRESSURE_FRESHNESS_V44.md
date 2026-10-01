# FORCE V44 pressure freshness contract

## Non-negotiable rule

After a team has played a current-season game, **FORCE must either show a pressure-derived Pass Rush grade backed by current data through that team's latest completed game, or show the metric as unavailable.** A prior-year pressure number must never be presented as the team's current Pass Rush grade.

## Source ladder

| Priority | Source | Eligibility |
|---|---|---|
| 1 | Curated manual/browser override | Current `as_of`; if `games` is supplied it must cover all completed games |
| 2 | FTN play-level | Explicit pressure outcome exists; defensive team resolvable; rows cover all current games |
| 3 | StatRankings | Current team season pressure row; source update date clears freshness floor |
| 4 | PFR/Sportradar | Advanced charting is team-complete and covers every current game |
| 5 | None | Suppress Pass Rush; never substitute 2025 |

## Weekly browser-assisted workflow

Use this only when the automatic current source is missing, delayed, or contradicted by a more authoritative current source.

1. Read a trustworthy page that reports the team's current pressure rate.
2. Record the provider exactly (for example, `NFL Next Gen Stats via browser review`).
3. Record an `as_of` date that proves the page is newer than the latest completed game.
4. Record the number of games included when known.
5. Add/update the team in `data/pressure-current.manual.json`.
6. Click FORCE **Refresh**.
7. Confirm the matchup/Units provenance label names the manual provider and current date.

Example:

```json
{
  "as_of": "2026-09-16",
  "source": "NFL Next Gen Stats via browser review",
  "source_url": "https://www.nfl.com/...",
  "teams": {
    "KC": {"pressure_rate": 0.455, "games": 1, "through_week": 1}
  }
}
```

## What FORCE refuses

- a 2025 prior displayed after a 2026 game as though it were current;
- an advanced-pressure row that contains only sacks while hits/hurries are missing;
- a date-only source stamped the same day as the game, because FORCE cannot prove it was refreshed after the game;
- a manual row whose declared game count trails the team's completed-game count;
- inferring pressure from number of rushers, blitzers, sacks, or QB hits alone;
- coercing a missing Pass Rush value to zero or 50 in the displayed rating.

## Scoring after freshness is satisfied

V41's pass-rush signal remains:

`pressure rate + 0.20 × hit rate + 0.60 × sack rate`

A pressure supplies the base signal; a hit receives incremental finishing credit and a sack receives more. The current sample is then blended against the prior using the existing early-season prior-confidence logic. Freshness and calibration are separate: a fresh raw value that cannot be validly calibrated also yields an unavailable rating rather than a stale prior.

## Historical views

A present-day season-total source is never injected into a historical `before Week X` transform. Historical views use week-filtered FTN/PFR data only, preserving the no-look-ahead contract.
