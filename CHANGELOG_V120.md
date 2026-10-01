# V120 - Localized kickoff time display

- Replaces raw nflverse 24-hour `gametime` display values such as `20:20` with a human 12-hour kickoff time.
- Treats nflverse schedule `gametime` as the canonical Eastern-time wall clock, converts the kickoff instant into the viewer browser timezone, and appends a generic zone label such as ET, CT, MT, or PT.
- Applies the shared formatter across slate cards, game headers, and matchup views.
- DST conversion uses `Intl.DateTimeFormat` timezone data rather than hard-coded EST/EDT dates.
- Display-only: schedule ordering, FORCE/Elo, forecasts, playoff logic, and game results are unchanged.
