# FORCE V97 - score-aware penalty value + direct-value coherence

V97 is the result of a V96 event-level audit of the largest and most internally surprising 2026 Penalty Impact outputs.

## Audit findings fixed in V97

1. **Scored points were missing from causal EPA state value.** V95/V96 compared future EP(actual post-state) with future EP(no-penalty post-state). That is correct for ordinary non-scoring penalties but wrong whenever one branch already contains points. A touchdown erased by an offensive penalty could therefore look favorable to the offending team on EPA because the hypothetical post-touchdown possession had lower *future* EP after the score. V97 values each branch as `realized fixed-team score-margin change + future fixed-team EP` before subtracting.
2. **Nullified scoring plays now have explicit counterfactuals.** V97 reconstructs erased touchdowns, made field goals, successful extra points and successful two-point tries before generic down/distance logic. A made FG erased by defensive offside is therefore a +3 no-penalty branch rather than a fictional fourth-down scrimmage result. Turnovers returned for TD are treated as scoring before generic turnover reconstruction.
3. **Counted scores with an accepted enforcement are also score-state aware.** If the score stands and the accepted penalty changes the ensuing field state, the no-penalty branch preserves the observed score and uses the ordinary post-score receiving spot.
4. **Turnover-erased bookkeeping now checks actual possession change.** A turnover is counted as erased only when actual and no-penalty post-states disagree on possession, avoiding false “erased turnover” labels on return penalties where the turnover still stood.
5. **Direct-value coherence guard.** The approved 40/25/20/15 weights are unchanged. If both causal EPA and causal WPA agree that a team was harmed, the first-down/erased-TD context terms may pull the score toward 50 but may not push it above 50. If both agree the team benefited, those context terms may not push it below 50. When EPA and WPA disagree, all four components decide normally. The audit payload exposes the pre-guard and post-guard combined z values and whether the guard fired.
6. **Rankings PNG pagination repair.** The Rankings export strips the Penalty Impact sort toolbar and gives forced 16-row pages enough height instead of clipping rows 15–16 and 31–32. Rankings remain two 16-team PNGs.

## Penalty Impact formula retained

- 40% causal penalty EPA
- 25% causal penalty WPA
- 20% net first downs via penalty
- 15% net touchdowns erased by penalty
- current season only for team results
- 2025 used only for league calibration / state-reference modeling
- component z cap ±3
- final tanh softness 3.0

## V97 diagnostics

`FORCE_PENALTY_DEBUG('TEAM')`, `FORCE_PENALTY_SCALE_AUDIT()` and `FORCE_PENALTY_OUTLIERS(30)` now surface score deltas as well as future EP, total state value, pre/post coherence-guard z values, scoring counterfactual types, and the actual/counterfactual football states.
