# FORCE V149

- Replaced algebraic exact-score normalization with a deterministic 25,000-run possession-level Monte Carlo score simulation.
- Existing FORCEcast win probability and predicted spread remain unchanged and anchor the simulation.
- Simulation varies pace, possession count, TD/FG/no-score outcomes, and correlated game-level offensive performance.
- Representative displayed score is selected from outcomes actually produced by the simulation near the joint center.
- Same matchup/data state produces the same public score across refreshes.
