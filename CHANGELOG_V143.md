# FORCE V143

- Replaces V142's all-neutral live pressure behavior with a source-aware pressure classifier.
- Preferred path remains an explicit play-level pressure flag when one is actually present.
- Current public 2026 FTN charting has no such field, so live fallback is explicitly labeled `observable-pressure-proxy`: nflverse QB hit OR sack OR FTN-charted throwaway.
- Standard-rush protection still requires FTN rush context (1-4 rushers) and excludes screens, out-of-pocket plays, and QB-fault sacks.
- Adds concise browser-console pressure diagnostics with selected source, FTN row count, join count, explicit-pressure count, and a short warning on fallback/failure.
- Does not infer pressure from rush count, blitz count, EPA, or pocket movement alone.
