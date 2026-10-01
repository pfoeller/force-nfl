# FORCE V46 - scale tails, logo cleanup, and real pressure rescue

V46 closes three defects exposed by live Week 1 use.

## FORCE 100 is theoretical

V45 could push an elite team to a displayed 100 because the Unit → FORCE bridge operated additively in displayed score-space and the public scale hard-clipped at the historical high anchor. V46 moves the bridge into Elo-space. The central scale remains linear, 50 remains average, and only the outer tails soften. The historical 2008–2025 end-season low/high anchors display as 5/95; finite Elo values approach 0/100 asymptotically and are bounded at 0.1/99.9 for display.

## Forecast strings use one team identifier

`logoizeTeamCodes()` used to replace `KC` with a full token containing both the logo and the abbreviation, producing competing marks and awkward wraps in predicted-line/exact-score cards. V46 replaces codes in those strings with logo-only marks. Explicit team tokens still keep text where it is useful.

## KC/DEN/DAL pressure gaps have a real rescue path

The V45 team Update button was a forced refresh of automatic providers; it did not invoke a browser agent or write a manual value. V46 adds `POST /api/current-pressure/manual` plus a Manual current-pressure rescue editor in the Update tab whenever a team's Pass Rush family is unavailable. The editor stores pressure percentage, source date, games/week covered, source, and URL, then recomputes the canonical team snapshot. The hard freshness gate still rejects incomplete or stale overrides.

The bundle is seeded with current Week 1 recovery rows for the three teams that exposed the provider-identity gap:

- KC: 45.5% - NFL Next Gen Stats (Bo Nix pressured on 45.5% of dropbacks), as of 2026-09-16.
- DEN: 27.3% - StatRankings Offensive Pressure Rate for Patrick Mahomes, as of 2026-09-16.
- DAL: 32.4% - NFL Next Gen Stats reported 11 pressures on 34 Jaxson Dart dropbacks, as of 2026-09-16.

Each row declares one game / Week 1, so it automatically becomes ineligible after another completed game unless refreshed.

## Update Center remains system-wide

The manual rescue editor is pressure-specific because pressure is the observed provider hole. The Update Center itself remains all-metric: per-team and league refreshes update schedule, team/player metrics, pressure providers, canonical unit profiles, the Unit → FORCE bridge, rankings, team pages, matchup pages, diagnostics, projections, and future forecasts.
