# V71 Game Flow research

## Decision

Game-state context is promising enough to continue researching, but **raw team-specific quarter scoring timing is not promoted into FORCEcast probability or the headline FORCE rating**.

## What was tested

A leakage-safe proxy test compared each team's 2024 distribution of points across Q1/Q2/Q3/Q4 with its 2025 distribution, using all 32 teams. A team-specific prior performed materially worse than simply using the league-average quarter shape:

- prior-team quarter-share RMSE: **0.06737**
- league-average quarter-share RMSE: **0.04759**
- relative degradation from using the team-specific prior: **+41.6%**
- best shrinkage weight on prior-team quarter timing: **0.00**

Year-to-year correlations were likewise weak:

- Q1 scoring share: **-0.067**
- first-half scoring share: **-0.051**
- Q4 scoring share: **-0.125**
- first-half net scoring: **0.180**
- second-half net scoring: **0.280**

The implication is that "Team X is a Q2 team" is mostly too noisy to use as a durable predictive input.

## Why game state still merits research

Score differential and quarter materially change football strategy and expected win probability. EPA is specifically designed to value plays conditional on game context, and score-adjusted EPA is a standard way to handle game-script effects. The next candidate should therefore be **opponent-adjusted residual EPA while trailing/leading**, not raw points by quarter.

A small quarterback situational sanity check also showed why aggressive shrinkage is required. For a seven-QB sample with 2024 and 2025 NFL situational splits, passer rating while trailing had very poor year-to-year stability (sample correlation approximately **-0.63**, mean absolute change about **12.5 rating points**). This is not a production-grade test, but it reinforces the no-raw-split rule.

## V71 product treatment

V71 adds a **Game Flow · Research** panel to matchup pages. It allocates the existing FORCEcast predicted final score over Q1 / halftime / Q3 / final using the league-average 2025 scoring shape. This does **not** alter win probability, line, final score, FORCE rating, or Brier.

The panel also shows each team's 2025 quarter-scoring profile as descriptive context only, explicitly marked as non-predictive. This creates the presentation surface now without making an unsupported model claim.

## Promotion gate for a future predictive state layer

To alter FORCEcast, a future play-by-play harness must calculate pregame-only, heavily shrunk, opponent-adjusted residual EPA for:

- trailing by 1-8 and 9-16
- leading by 1-8 and 9-16
- close Q4 situations
- early drives / Q1

and must beat the current FORCEcast Brier out of sample, improve a majority of held-out seasons, and avoid material single-season regressions.

## V77 follow-up: current-season timing without promoting it to win probability

V71 rejected raw prior-year quarter shares as a standalone predictive input to win probability. V77 keeps that conclusion intact, but improves the **presentation timing model** by blending 2025 with pregame-safe 2026 quarter scoring once current-season play-by-play exists.

Current-season trust is deliberately slow: `w_2026 = games / (games + 6)`, capped at 0.80. That is about 14% after one game, 25% after two, 40% after four, and 57% after eight. Each matchup's quarter timing target is then 50% the offense's blended scoring profile, 30% the opponent defense's blended points-allowed profile, and 20% league-average quarter timing.

This changes only the Q1-Q4 allocation of the already-predicted FORCEcast final score. It does **not** change FORCE rating, win probability, predicted line, or predicted final score.
