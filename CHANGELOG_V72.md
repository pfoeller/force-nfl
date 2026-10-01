# FORCE V72

## Game Flow scoring realism
- Replaces cumulative checkpoints with Q1 / Q2 / Q3 / Q4 / Final quarter-specific scoring.
- Quarter totals always sum exactly to the existing FORCEcast final.
- Adds a common-football-score prior so 0/3/7/10/14-style quarters are preferred over arbitrary proportional rounding.
- Adds score-state conversion strategy priors. In particular, when a team is down 8 and scores a lone touchdown, +6 or +8 is strongly preferred over +7 because a two-point try is the expected strategy.
- Keeps team-specific quarter timing at zero predictive weight; this remains a presentation/research layer, not a Brier-changing model input.
