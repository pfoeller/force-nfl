# Game Flow research - V72

V72 keeps the V71 conclusion that raw team-specific quarter timing is not sufficiently persistent to receive predictive weight. The new work is a presentation-normalization layer: it decomposes the already-selected FORCEcast final score into four plausible football quarter totals.

The allocator searches exact four-quarter partitions, penalizes distance from the league-average quarter scoring shape, and applies a football scoring prior that favors common totals such as 0, 3, 7, 10, 14 and 21 over arbitrary proportional-rounding artifacts. It then evaluates the two teams together for score-state conversion plausibility.

A strong explicit rule covers the common down-eight case: if a team is down 21–13 and scores a lone touchdown, the path strongly prefers 19 (failed two-point try) or 21 (successful two-point try) over 20, because the expected strategy is to attempt two. A softer late-game rule covers the modern down-14 first-touchdown two-point strategy.

This layer does not alter FORCEcast win probability, line, final score, or Brier. It makes the displayed game path consistent with football scoring strategy while the deeper game-state EPA research remains gated behind leakage-safe historical validation.
