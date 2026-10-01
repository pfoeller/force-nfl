# FORCE V109

- Stabilizes WR/TE residual receiving EPA toward the live 2026 league environment by WR/TE target volume before converting it to a full-season 0–100 receiver scale.
- Stabilizes RB/FB rushing EPA by carries and receiving-residual EPA by targets separately before the existing 70/30 RB room blend, eliminating tiny-target receiving explosions and the repeated 98.44 live-score pileup.
- Rebuilds the RB preseason prior on the same orthogonal residual definition used live.
- Rebuilds Receiver preseason calibration on the same residual definition used live.
- Replaces Luck expected wins based on pregame FORCE probabilities with postgame Pythagorean expected wins from points scored/allowed. Pregame expected wins remain visible only for audit.
- Overall Luck is 70% expected-win-surplus luck and 30% Penalty Impact, so net penalty benefit contributes directly and directionally to the Luck score.
- Adds `FORCE_LUCK_DEBUG(team)` and expands Receiver/RB diagnostics with stabilized values, sample sizes, reliability weights, and live scores.
