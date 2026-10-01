# FORCE V95 - same-state causal EPA

- Keeps the V94 WPA and special-teams state-reconstruction corrections unchanged.
- Replaces the V94 EPA path that mixed stored whole-play `epa` with a separate counterfactual approximation.
- Builds one shared expected-points state surface from 2025 nflverse/nflfastR pre-play `ep` values. The surface is used for both the actual enforced post-state and the reconstructed no-penalty post-state.
- Converts both EP states into one fixed-team perspective before subtraction, so possession-changing penalties remain zero-sum and correctly oriented.
- Kickoff/punt penalties use the same dedicated receiving-team return states for EPA that V94 already uses for WPA.
- Stored play `epa` is retained only as an audit field and rare end-state fallback; it no longer drives ordinary causal penalty EPA.
- Adds event-level `actual_team_ep`, `counterfactual_team_ep`, and `actual_ep_source` diagnostics.
- Adds a separate V95 2025 EP-surface cache plus new V95 penalty-reference and 2026 game-flow cache keys so V94 EPA values cannot be reused.
- Keeps Penalty Impact current-season only and preserves the approved 40% EPA / 25% WPA / 20% net penalty first downs / 15% erased TDs blend.
