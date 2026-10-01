# FORCE V112 - Standardized Outcome Surprise Luck

- Replaces raw decimal deserved-win surplus as the 55% win-luck input with standardized game-by-game outcome surprise.
- Outcome residuals are divided by the Bernoulli variance implied by each game's deserved-win probability.
- Adds a 0.5-sigma neutral band so overwhelmingly deserved wins are effectively neutral rather than automatically positive luck.
- Retains V111 true-fumble parsing: ordinary loose balls use a 50/50 baseline; botched snaps use 30% event weight and an 80% offense-recovery baseline.
- Retains rounded expected wins in normal UI; exact expected wins and raw outcome residuals remain diagnostic-only.
- Retains the nonlinear Luck display calibration and the 55/25/20 blend: standardized outcome surprise / Penalty Impact / fumble recovery.
- Adds FORCE_LUCK_DEBUG fields for outcome variance, standard deviation, surprise z-score, neutral band, and excess z-score.
