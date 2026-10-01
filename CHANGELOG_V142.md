# FORCE V142

## QB pressure context uses actual FTN-charted pressure

V142 replaces the V135-V141 hit-or-sack disruption proxy in the QB Pressure Adjustment with FTN's charted pressure outcome when joined to nflverse play-by-play by game/play ID.

- The 75% protection component is now actual FTN-charted pressure on qualifying four-or-fewer-rusher dropbacks. Screens, QB-out-of-pocket plays, and QB-fault sacks remain excluded when charted.
- The 25% performance component is 70% EPA/play and 30% Success Rate on all joined FTN-charted pressured dropbacks, with the existing small-sample stabilization.
- QB diagnostics are now EPA Under Pressure, EPA Without Pressure, and Pressure EPA Drop.
- Missing FTN pressure classifications are treated as unavailable, never inferred from hits or sacks.
- The raw QB formula, opponent adjustment, recency adjustment, qualification threshold, and 75/25 pressure-adjustment split are unchanged.
