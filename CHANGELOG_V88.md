# FORCE V88

## Penalty Impact correctness repair

- Restores the approved V81/V82 four-component blend: 40% causal penalty EPA, 25% causal penalty WPA, 20% net first downs via penalty, 15% net touchdowns erased by penalty.
- Retains the V86 enforcement-counterfactual concept for EPA/WPA rather than reverting to whole-play EPA/WPA.
- Recalculates 2025 with the exact same V88 causal + four-component pipeline used for 2026; no old 70/30 historical score carries into the live rating.
- Keeps erased turnovers and 3rd/4th-down drive saves as explicit audit facts without double-counting them on top of causal EPA/WPA.
- Fixes `no_play` rows where nflverse reports `yards_gained=0`: live-ball nullifications now recover the erased gain from the description.
- Fixes pre-snap/dead-ball no-plays so the no-penalty counterfactual preserves the same down/distance instead of consuming a phantom down.
- Bumps the derived 2025 penalty cache key so V88 cannot reuse a V86 70/30 prior.
- Preserves V87 Penalty Impact rankings and default most-benefit-first ordering.
- Adds net penalty first downs and net erased TDs to the rankings table for component-level auditing.
