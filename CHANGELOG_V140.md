# FORCE V140

- Adds a third QB context term: Recency Adjustment.
- Current-season game weights are 2.00x, 1.75x, 1.50x, 1.25x for the four most recent games and 1.00x for older current-season games.
- Applies 40% of the difference between recency-weighted and normally weighted current-season performance, capped at +/-4 FORCE QB points.
- Uses current-season game-level EPA, ANY/A, Success Rate, QB rushing EPA/attempt, and CPOE where available, translated to the current FORCE component scale.
- Moves Raw QB Rating directly beside the final FORCE QB Rating, followed by Opponent, Pressure, and Recency adjustments.
- Updates client/server identity to V140.
