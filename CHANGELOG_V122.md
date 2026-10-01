# FORCE V122 - FLAG branding + result-relevance layer

V122 promotes the current-season Penalty Impact diagnostic into **FLAG - Flag Leverage & Advantage Gauge** without changing the underlying V97 penalty math or any predictive FORCE/Elo logic.

## Presentation
- Rankings and team context now use the FLAG name.
- FLAG gets a semantic red → neutral → green gauge centered at 50, with explicit **Harmed / Neutral / Benefited** direction labels.
- The team FLAG view gives the score a larger branded treatment while retaining the existing causal EPA/WPA, first-down, erased-TD, turnover, drive-save and sample diagnostics.
- Existing debug fields and server payload names remain backward-compatible (`penaltyImpactScore`, `penalty_games`, etc.).

## FLAG Swing Candidate
V122 adds a conservative game-level result-relevance screen.

A completed game is marked **FLAG SWING** only when:
1. the eventual winner received positive net penalty EPA benefit; and
2. that measured benefit is at least as large as the final scoring margin.

WPA is displayed as supporting leverage but is not used to weaken this threshold. The label therefore means only that the measured penalty impact was large enough, in EPA terms, to be plausibly result-relevant. It does **not** judge whether any call was correct, infer officiating intent, or state that penalties caused the result.

- Team pages list every completed FLAG Swing Candidate involving that team when the FLAG view is selected and also badge those games in the season schedule.
- Individual completed matchup pages show a dedicated FLAG Swing Candidate banner when the threshold is met.
- `FORCE_FLAG_SWING_DEBUG(team)` exposes all completed game assessments and candidates.

No QB/unit/Luck/Elo/forecast/playoff logic changes in V122.
