# FORCE V116 - Football-valid quarter scoring

- Prevents Game Flow from projecting a one-point quarter.
- Keeps the existing exact-final allocator: the four quarter totals still sum exactly to the unchanged FORCEcast final.
- Treats the one-point-safety edge case as unavailable for projection because it is not a reasonable quarter-score forecast state.
- Adds a sweep regression over normal NFL final scores to ensure no generated quarter contains 1.
- Display/research layer only: no change to FORCE/Elo, win probability, predicted spread, or final projected score.
