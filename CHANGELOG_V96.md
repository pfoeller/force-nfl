# FORCE V96 - Penalty Impact scale widening + deep audit logging

- Keeps V95 same-state causal EPA, V94 same-model WPA, special-teams reconstruction, fixed-team orientation, and canonical game-row aggregation unchanged.
- Preserves the approved Penalty Impact weights: 40% causal EPA, 25% causal WPA, 20% net penalty first downs, 15% net erased touchdowns.
- Reduces early-season 0/100 saturation by winsorizing each standardized component at ±3 z before weighting and widening the final tanh mapping from softness 2.0 to 3.0.
- Displays Penalty Impact to one decimal place so near-tail values are not visually rounded into literal 0 or 100.
- Stores a full score breakdown on server and browser profiles: raw inputs, 2025 RMS scales, raw z-scores, capped z-scores, weights, weighted contributions, combined z, softness, cap, and final score.
- Extends `FORCE_PENALTY_DEBUG(team)` with browser/server score breakdowns and event-level EP/WP state details.
- Adds `FORCE_PENALTY_SCALE_AUDIT()` for a compact all-team scale table and range audit.
- Adds `FORCE_PENALTY_OUTLIERS(limit)` for the largest absolute causal EPA and WPA events with reconstructed states.
- Adds `/api/penalty-scale-debug?limit=30` as a server-side league-wide audit equivalent.
- Uses fresh V96 penalty-reference, EP-surface, and 2026 game-flow cache keys so V95 scale results cannot be reused silently.
