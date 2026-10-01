# FORCE V89

## Fixed-team causal WPA for Penalty Impact

- Replaces V88's possession-relative/magnitude WPA approximation with a signed fixed-team calculation.
- Uses nflverse `home_wp` and `home_wp_post` for the observed home-team WP movement when available.
- Converts the reconstructed no-penalty EPA state to the same home-team perspective before computing the counterfactual WP movement.
- Converts the final signed home-team WPA delta to the beneficiary/offender only after both actual and counterfactual states are in the same frame.
- Preserves exact zero-sum WPA between opponents for every accepted penalty event.
- Applies the same V89 WPA logic to the full 2025 carryover recalculation and all 2026 games.
- Bumps both the 2025 derived penalty-prior cache key and the 2026 game-flow cache key to prevent reuse of V88 outputs.
- Preserves the approved 40/25/20/15 Penalty Impact blend and all V88 no-play / erased-turnover counterfactual fixes.
- Preserves the V87 Penalty Impact rankings tab, default most-benefit-first ordering, and audit columns.

## Regression coverage

- Erased interception: positive WPA for the beneficiary even though the no-penalty counterfactual flips possession.
- Fourth-down drive rescue: negative WPA for the offending team / positive for the beneficiary.
- Event and game-level WPA remains zero-sum across opponents.
- 2025 and 2026 are recalculated through the same fixed-team WPA pipeline.
