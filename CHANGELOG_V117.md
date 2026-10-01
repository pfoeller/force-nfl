# FORCE V117 - Focused Luck Rankings

- FORCE Rankings > Luck now contains only: FORCE Rank, Team, FORCE, Actual Record, Expected Record, and Luck Score.
- Removes the user-facing Outcome Z and QB Returning columns from the Luck table. Underlying outcome-surprise and QB-regime diagnostics remain available in debug/other appropriate surfaces.
- Expected Record is the rounded expected-win point estimate expressed as a whole-number W–L record over games completed; exact expected wins remain available in FORCE_LUCK_DEBUG.
- The first Luck-table rank column is always canonical FORCE Rank, even when another Luck-table column is used for sorting.
- Rankings exports inherit the same reduced table because they export the rendered Luck board.
- No changes to Luck calculations, FORCE/Elo, unit ratings, forecast probabilities, predicted scores, or bridge weights.
