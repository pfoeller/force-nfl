# FORCE V90 - current-season Penalty Impact + game-state counterfactual WPA

## Penalty Impact

- Penalty Impact is now **current-season only**. No team-specific 2025 penalty score is carried into 2026.
- The approved score blend remains unchanged: **40% causal EPA + 25% causal WPA + 20% net first downs via penalty + 15% net touchdowns erased**.
- 2025 play-by-play is used only for two modeling purposes:
  1. building an empirical nflverse home-win-probability state surface, and
  2. calibrating the league-wide 0–100 component scales.
- Counterfactual WPA no longer uses any EPA×leverage approximation. For each accepted penalty, FORCE reconstructs the no-penalty post-play state (score, time, possession, down, distance and field position), estimates nflverse-equivalent fixed-team home WP for that state from the 2025 WP surface, and compares it directly with the actual `home_wp_post`.
- Possession-changing penalties therefore compare two fixed-team post-state probabilities rather than mixing possession-team WPA orientations.
- The Penalty Impact rankings and team diagnostic panels no longer display a 2025 prior or a separate 2026 raw value; the headline value itself is the 2026 score.
- WPA remains displayed in percentage points per game (`WPA pp/g`).

## Cache/versioning

- App identity: V90 / V90-DIAG-1.
- New 2025 modeling-reference cache key and V90 game-flow cache key prevent reuse of V89 penalty calculations.
- Packaged live-cache test artifacts were removed.
