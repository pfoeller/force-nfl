# FORCE V75

## Playoff Picture structure and tiebreaking
- Every simulated conference now produces exactly seven playoff teams: four division winners seeded 1–4 and three wild cards seeded 5–7.
- Replaced FORCE-only tie sorting with an NFL-style sequence using head-to-head, division/conference record, common games where applicable, strength of victory, strength of schedule, then FORCE only as the final deterministic fallback.
- Projected playoff seeds now come from one coherent most-likely remaining-game path instead of independent per-team modal seeds, eliminating impossible displayed fields with too many or too few projected playoff teams.
- Division projected finishes use the same coherent projected standings.
- Playoff/division/bye probabilities still come from all 5,000 Monte Carlo simulations.
- Added V75 structural/tiebreak regression coverage.
