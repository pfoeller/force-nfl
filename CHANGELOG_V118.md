# FORCE V118 - Playoff Picture + NFL Tiebreak Audit

- Makes AFC and NFC playoff cards full-width/stacked so the Bye odds column is visible for both conferences.
- Confirms seven playoff teams per conference: four division champions seeded 1–4, three wild cards seeded 5–7, with only seed No. 1 receiving a bye.
- Replaces pairwise sorting for multi-club ties with NFL-style selection/restart logic.
- Division ties now use head-to-head, division record, common games, conference record, strength of victory, then strength of schedule before a FORCE fallback.
- Wild-card/seeding ties now reduce same-division clubs first, preserve the original within-division seed order on subsequent Wild Card passes, apply head-to-head sweep where applicable, then conference record, common games (minimum four), strength of victory, and strength of schedule, restarting when clubs are eliminated.
- Conference division-winner seeding uses the Wild Card tiebreak sequence as required by NFL procedure.
- Projection runs still do not simulate exact future scoring margins; if a tie survives through strength of schedule into the NFL points/TD criteria, current FORCE is used only as the terminal deterministic fallback.
- No FORCE/Elo, forecast probability, unit-rating, Luck, or Game Flow math changed.
