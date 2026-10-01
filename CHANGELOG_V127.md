# FORCE V127 - Contextual Luck ranking

V127 fixes the Luck table rank column so it matches the metric currently used to order the table.

## Rankings fix
- When Luck is sorted by **Luck score**, the rank column now shows Luck rank.
- Sorting by **Actual record** or **Expected record** likewise changes the rank column to that metric's rank.
- Sorting by **FORCE** continues to show FORCE rank.
- When a non-FORCE metric is active, the team label retains `FORCE #N` as secondary context, matching the behavior used elsewhere in FORCE rankings.
- Rank remains metric rank (1 = highest value) even if the user flips the table to ascending order; it is not just the visible row number.

## Scope
- No Luck calculation changed.
- No FORCE rating, forecast, FLAG, unit, playoff, or export logic changed.
