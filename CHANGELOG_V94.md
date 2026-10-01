# FORCE V94 - special-teams penalty counterfactual repair

- Keeps V93 canonical game-row season aggregation. The V93 audit proved aggregation was correct and the remaining error was inside game-level event reconstruction.
- Adds dedicated kickoff/punt counterfactual reconstruction. Return penalties now compare the enforced receiving-team state against receiving-team possession at the unpenalized return/fair-catch spot.
- Prevents punts from being interpreted as ordinary fourth-down failures and kickoffs from being interpreted as ordinary scrimmage plays.
- Locks the fixed home-team second-half-kickoff receiver context to the same value on both actual and counterfactual states. This game-level invariant previously could flip when possession changed and materially inflate early-game WPA swings.
- Keeps actual and counterfactual states on the same packaged nflfastR no-spread WP model.
- Expands penalty audit rows with actual/counterfactual model states, play type, special-teams flag, and separate WPA-vs-EPA counterfactual classifications.
- Uses new V94 2025 calibration and 2026 game-flow cache keys; V93 penalty context cannot be silently reused.
- Preserves the approved 40% causal EPA / 25% causal WPA / 20% net penalty first downs / 15% erased TDs blend and current-season-only team scoring.
