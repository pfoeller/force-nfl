# FORCE V26

## Postgame consistency
- Immediate rematch forecasts no longer silently switch from the active pregame forecast to independent Elo.
- The rematch now starts from the frozen pregame forecast and applies only the net postgame Elo change. No new market data are introduced.
- FORCE-only immediate-rematch line remains visible as a secondary diagnostic.

## Completed matchup unit updates
- Completed matchup pages now use postgame FORCE values in the current matchup-edge section.
- Added explicit pregame → current changes for Offense, Defense, QB, OL, Defensive Front, Coverage, Run, and Receivers.
- Pregame forecast/audit values remain frozen so historical evaluation is still leak-safe.
