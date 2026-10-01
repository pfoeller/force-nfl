# FORCE V25

## Live data transport
- Replaced direct browser fetches of GitHub release assets with same-origin `/api/schedule`, `/api/team-stats`, and `/api/player-stats` endpoints served by `force_server.py`.
- The proxy keeps a short last-good cache so transient upstream failures do not immediately wipe live profiles.
- Updated Windows/macOS/Linux launch scripts to use the FORCE server.

## Early-season unit responsiveness
- Reduced the unit-profile stabilizing prior from four games to one game.
- Week 1 unit values are therefore 50% current-season performance, Week 2 about 67%, and Week 4 80%.
- Added regression coverage ensuring an elite Week 1 rushing/OL sample cannot remain implausibly near the bottom solely because of the prior.

## Forecast boundary
- These updates affect live unit/profile diagnostics, matchup explanation, EPA displays, luck, penalties and related views.
- The validated FORCE Elo/market win-probability engine remains unchanged pending separate out-of-sample testing of unit inputs.
