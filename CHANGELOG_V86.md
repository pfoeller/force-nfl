# FORCE V86

## Causal penalty impact

V86 replaces the V81 whole-play penalty EPA/WPA implementation. The old method summed nflverse EPA/WPA for any accepted-penalty play, which could assign the wrong magnitude or even the wrong practical interpretation because the football action and the enforcement were conflated.

For each accepted penalty V86 now estimates the no-penalty football outcome and compares it with the actual enforced state. Nullified turnovers and touchdowns are explicitly restored in the counterfactual. Ordinary live-ball penalties use the underlying non-penalty play result when it can be reconstructed; pre-snap/dead-ball penalties use the unchanged pre-play state. EPA remains on nflfastR's own expected-points scale, and WPA uses the play's local nflfastR EPA/WPA leverage applied to the counterfactual delta.

The accepted penalty is always oriented to the non-offending team. Declined and offsetting-only penalties remain excluded.

## Same method for 2025 and 2026

The server downloads 2025 play-by-play once, recalculates every team's 2025 penalty context with the V86 method, and caches the derived prior locally. The 2025 league distribution supplies the EPA/game and WPA/game normalization scales. 2026 games use the identical event algorithm and the same calibration.

The displayed live Penalty Impact is 70% causal EPA and 30% causal WPA. Early-season stabilization retains the previous three-game prior strength, but the prior is now each team's recalculated 2025 causal result rather than a neutral 50 or the legacy penalty metric.

## Audit fields

First downs via penalty, erased touchdowns, erased turnovers, and 3rd/4th-down drive saves remain visible. They do not receive separate score weights because their game-state value is already captured in causal EPA/WPA.

## Retained V85 fixes

V85's canonical refresh replacement, queued refreshes, bootstrap verification, Connecting/Offline distinction, health/version handshake, and port-collision guard remain intact.
