# FORCE V68

## Customer-facing rematch and export cleanup
- Postgame rating-change cards now show change in FORCE points, not raw Elo.
- Rematch/unit language is simplified for customers: `Pregame → Postgame`, `Predicted rematch line`, `Predicted rematch score`, and `Same venue`.
- Removed internal-facing matchup phrases such as canonical-current-state, frozen-snapshot, live-bridge, and next-week-blend wording from active customer UI.
- Renamed `Predicted exact score` to `Predicted final score`.
- Social PNG exports now omit deep matchup reasoning cards and strengths/weaknesses while retaining headline ratings, FORCEcast outputs, context scores, postgame FORCE movement, rematch projections, and unit rating changes.
