# QB injury carryover research - v8

## Question

When an established starting quarterback is temporarily unavailable late in a season, replacement-QB games can depress the team's persistent rating. If the starter is expected to return the following season, should some of that temporary damage be removed from the offseason carryover prior?

This is **not** the same as the existing game-level QB adjustment. Celo already lowers a team's effective pregame strength when a weaker quarterback starts, which reduces the Elo penalty for losing with the backup. But the raw team rating can still decline when the team performs worse than even that backup-adjusted expectation, and the persistent QB baseline also drifts toward whoever starts.

## Kansas City 2025 sanity check

The supplied Celo game history gives Kansas City's effective pregame win probabilities for the three post-Mahomes games. Replaying the shipped update equations, including the tuned opponent-quality weighting, produces approximately:

| Week | Opponent | Result | Approx KC raw Elo change |
|---|---|---:|---:|
| 16 | at TEN | L 9–26 | -41.3 |
| 17 | DEN | L 13–20 | -12.0 |
| 18 | at LV | L 12–14 | -14.4 |
| **Total** | | | **-67.6** |

With the model's 17-game-season offseason reversion of 30%, roughly **47.3 Elo points of that damage survive** into the next-season prior before other priors are applied. That is not negligible. It is large enough to materially move a 0–100 FORCE Score, projected record, and early-season lines.

This does **not** prove that all 67.6 Elo points were caused by quarterback absence. Defense, line play, coaching, injuries elsewhere and ordinary variance also contributed. It establishes that the mechanism the proposed correction is trying to address is large enough to matter.

## Real historical event study

The included `research/qb_carryover_event_study.py` uses 11 curated episodes in which an established starter missed a substantial part of a season and returned the next year:

- Tom Brady / 2008 New England
- Deshaun Watson / 2017 Houston
- Ben Roethlisberger / 2019 Pittsburgh
- Dak Prescott / 2020 Dallas
- Jimmy Garoppolo / 2020 San Francisco
- Lamar Jackson / 2021 Baltimore
- Matthew Stafford / 2022 Los Angeles Rams
- Joe Burrow / 2023 Cincinnati
- Justin Herbert / 2023 Los Angeles Chargers
- Dak Prescott / 2024 Dallas
- Trevor Lawrence / 2024 Jacksonville

The test uses the real Celo end-of-season Elo snapshots and real following-season outcomes. It changes only the injured team's next-season starting prior and then evaluates the first four or eight games. Opponent priors are held fixed. This isolates the value of the offseason-prior correction, but it is **not an exact full-play-by-play Celo rerun**.

### All 11 episodes

A simple restore proportional to missed starts was tuned leave-one-episode-out:

| Window | Baseline Brier | Carryover candidate | Delta | Episodes improved |
|---|---:|---:|---:|---:|
| Weeks 1–4 | 0.19567 | 0.18528 | **-0.01039** | 6 / 11 |
| Weeks 1–8 | 0.23032 | 0.22090 | **-0.00942** | 7 / 11 |

Those are large enough improvements to take seriously. A simple influence check also shows the result is not solely a Pittsburgh-2019 artifact: with a fixed 7.5-Elo-per-missed-start research rule, removing the single most favorable episode still leaves an aggregate Weeks 1–8 improvement of about **0.0063 Brier** (and about **0.0045** over Weeks 1–4). They are also heterogeneous. Several episodes become worse, which argues strongly against a blanket “starter missed N games, add X Elo” rule. With only 11 episodes, an episode-level bootstrap is still wide: the 95% bootstrap interval for the mean delta is roughly **-0.028 to +0.006** over Weeks 1–4 and **-0.024 to +0.005** over Weeks 1–8. In other words, the point estimate is encouraging but this sample alone is not statistically decisive.

### Gated decline subset

A stricter six-case subset was used as a proxy for the production rule we actually want: cases where the starter absence coincided with a clear deterioration in team strength rather than merely a change in quarterback identity. With a gradually decaying overlay, Weeks 1–8 improved by as much as about **0.0140 Brier**, with **5 of 6 episodes** improving across a broad range of conservative parameter choices.

That is the most important finding in this pass: **gating matters more than the exact size of the adjustment.** Even here the six-episode sample is too small for a narrow confidence interval (episode-bootstrap 95% interval is approximately -0.030 to +0.001 for the best Weeks 1–8 setting), so this is a design signal rather than final proof.

## Recommended production rule

The model should eventually be based on measured rating damage, not missed starts:

1. Verify that an established starter was unavailable for injury/medical reasons rather than benched, traded, rested, or replaced for performance.
2. Verify before the next season that the starter is expected to return.
3. Freeze the raw team rating at the start of the replacement-QB window.
4. Track the raw team-Elo movement generated during verified replacement-QB starts.
5. Consider only **negative** persistent movement. Successful backup play does not earn an arbitrary bonus.
6. Estimate how much of that negative movement is attributable to temporary QB unavailability, ideally using the game's QB adjustment, offensive performance, and other injury context.
7. Restore only a conservative fraction of that estimated damage before normal offseason reversion, with a hard cap.
8. Let the correction decay naturally as new-season games arrive.

A good initial grid for the exact historical backtest is a restore fraction of 25%, 50%, 75%, and 100% of verified backup-window damage, caps of 40/60/80 Elo, and optional 4/8/16-game half-lives.

## Why it is not default in v8

The effect size is promising enough that this is now a **priority candidate**, not a rejected idea. One further caveat matters: this study evaluates the **independent rating prior**. It does not establish a 0.009 Brier gain for Smart v2 when a closing market line is available, because Smart v2 currently gives the independent model only about 2% logit weight in that situation. The largest product value is therefore likely to be FORCE Score accuracy, preseason/early-week forecasts before mature lines exist, and long-range projected records. It is still not on by default because:

- only 11 curated episodes are in the current event study, so manual episode selection itself can introduce selection bias;
- case selection needs a reproducible injury-status rule rather than manual curation;
- the event study isolates the prior instead of rerunning every Celo feature and opponent update;
- 4 of 11 episodes worsen in the ungated test;
- other offseason priors (team AV, roster continuity, QB seeding, etc.) could partially overlap the same information;
- the exact historical injury-feed replay could change the best restore fraction.

The threshold for automatic promotion should be an exact walk-forward replay showing improvement in aggregate early-season Brier, improvement in a clear majority of eligible episodes/seasons, and no large regression bucket.

## What v8 ships

The production forecast remains unchanged by default. Every team page now includes an optional **Returning-QB Carryover Lab**. Users can choose a quarterback and apply a one-off Elo restoration to see the resulting FORCE Score, projected record, next-game win probability/line/score, and full remaining schedule. Kansas City / Patrick Mahomes has a research preset of **+47.3 Elo**, representing the approximate portion of the three-game backup-window Elo loss that survives the normal offseason reversion.

That preset is a counterfactual research scenario, not a claim that Kansas City “deserves” exactly 47.3 points.

## V14 display propagation

The optional QB-return correction now has an explicit **unit-display overlay** for current/future scenarios. This is not a new historical backtest result; it is a consistency rule for presenting an already-selected carryover correction.

Because the correction is specifically attributed to temporary QB/offensive contamination, defense is held fixed. The implied whole-team FORCE Score movement is translated into an offensive-profile movement, then allocated to the QB-sensitive inputs already used by the bundled offense composite (team offense and QB play). Historical raw EPA/CPOE data remain unchanged and are labeled as base data.

This prevents an internally inconsistent screen where the team rating rises for a returning quarterback while the displayed offense and QB unit ratings remain unchanged.
