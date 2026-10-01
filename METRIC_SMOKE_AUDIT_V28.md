# FORCE V28 - before/after metric and current-state audit

## Acceptance criterion

V28 treats the reported Kansas City failures as examples of a broader requirement: **every available live/display metric must remain coherent before and after a simulated game transform, and every UI surface that says “current” must read the same state.**

## What V27 missed

V27's 2,127-check test validated the pure transform, but its synthetic Kansas City case was deliberately elite in every category. That made expected directions obvious, but it did not stress conflicting evidence. In particular, a front could still post an extraordinary pass-rush game while a noisy run-defense component dragged the combined Week-1 percentile below an elite prior.

V27 also did not render or contract-test cross-page current-state semantics. Rankings applied the active QB carryover/unit overlay while a completed Matchup suppressed it, and the matchup's “Current FORCE Score” used the frozen rating immediately after that game rather than the actual current rating.

## V28 Kansas City stress case

The new regression intentionally creates conflicting evidence instead of an all-elite fixture:

- Kansas City defeats Denver 31–10;
- Kansas City records 18 defensive QB hits + 1 sack over 40 Denver dropbacks: **47.5% disruption**;
- Denver is deliberately given a strong rushing-EPA game so Kansas City's run-defense input is unfavorable;
- Kansas City's pass/offensive inputs are positive;
- the existing 2025 Kansas City priors are used unchanged.

Results:

| Metric | Before | After |
|---|---:|---:|
| Defensive front | 87.10 | 88.55 |
| Front disruption | 23.71% prior raw | 47.50% live |
| Base FORCE | 45.53 | 52.94 |
| QB-adjusted FORCE | 53.84 | 61.48 |
| Offense composite | 61.30 | 80.23 |
| QB-adjusted offense | 77.91 | 91.12 |

The run-defense live input in the stress fixture is intentionally poor (`+0.333 EPA/rush allowed`), so the front improvement is not an artifact of making every component favorable.

## Metric coverage

`benchmarks/v28_metric_smoke.json` records the before/after matrix for all 32 teams. The V28 suite performs **2,325 assertions** covering:

- offense, defense, QB, OL, defensive front, coverage, receivers, run game;
- offense and defense composite equations;
- offensive EPA/play;
- QB EPA/play and true live CPOE;
- QB-hit+sack disruption allowed, sack rate, hits and sacks allowed;
- front disruption rate, sack rate, hits, sacks, and run EPA allowed;
- pass EPA/CPOE allowed;
- receiving EPA/target;
- RB rushing and receiving efficiency;
- actual/expected record and luck;
- tracked penalty counts, yards, and per-game swing;
- scoring for/against;
- every `_live` provenance/input field exposed to the UI;
- finite/range checks for all 32 teams before and after transform;
- Week-1 live/prior weight;
- result-only Elo/FORCE direction;
- QB-adjusted FORCE/offense direction;
- QB-overlay invariants.

## Stable early-season benchmarks

### Defensive front

Pass disruption is now benchmarked against the 2025 league distribution of prior pressure rates. The live front grade is:

`90% pass-disruption benchmark + 10% current run-defense percentile`

That live grade is then blended with the one-game preseason prior. This lets genuinely extreme pressure evidence move an elite prior upward without allowing one secondary one-game component to dominate.

### Offensive line

Pass-protection disruption allowed is likewise benchmarked against the stable 2025 OL pressure-allowed distribution. The live OL grade is:

`70% pass-protection benchmark + 30% current rushing-efficiency percentile`

### Ties

Percentiles use mid-ranks. Equal observations receive equal grades; ordering no longer changes a tied team's score.

## Cross-view current-state contract

The app now exposes `currentTeamState(team)`. Any view claiming to show current strength must use it.

A completed matchup intentionally preserves historical snapshots, but labels them separately:

1. Pregame;
2. After this game;
3. Current FORCE Score.

The third is the same canonical value used by Rankings, and current matchup unit cards use the same canonical profile as Rankings/Team. The regression test rejects a return of the old completed-game `allowScenario=false` path or the old `hist.post*` value masquerading as current.
