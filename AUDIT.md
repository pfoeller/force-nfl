# Deep audit - Celo / Elo++ → Sunday Command Center

## Executive assessment

The core concept is strong, but the current repository should not be promoted from an exploratory/backtest project into a live consumer ratings product without a data-contract pass. The biggest risk is not visual polish; it is identity, reproducibility, and prediction-vs-evaluation boundaries.

## Critical / must fix before production

### 1. Franchise identity is not canonicalized at ingestion
`data.py` loads nflverse schedules and filters them, but never maps historical aliases to one franchise identity. The observed output therefore contains 35 identities: STL plus LA, SD plus LAC, and OAK plus LV. Because Elo state is keyed by team string, this is a model-state bug, not merely a display bug. Relocated franchises effectively restart while a ghost franchise remains in the rating pool and season reversion.

**Fix:** one canonical ID module used by schedule, PBP, odds, injuries, roster, UI and external scrapers. Recommended internal IDs: `LAR`, `LAC`, `LV`, `JAX`, with an explicit source adapter (`nflverse LA→LAR`, `JAC→JAX`, and historical `STL→LAR`, `SD→LAC`, `OAK→LV`). Preserve original source code in a separate field for traceability. Add tests asserting exactly 32 current franchises.

### 2. The “current” UI bundle is stale by architecture
The attached `ui_data.json` was generated 2026-07-16 and ends with the 2025 season. `data.py:128` explicitly drops every future game (`dropna` on both scores), so the core loader cannot power a full live schedule or remaining-season projections.

**Fix:** split inputs into `played_games` (rating updates) and `schedule_games` (projection surface). Version every snapshot with generated-at, games-through timestamp, source commit/hash, and model config hash.

### 3. Shipped-model documentation and tuned config disagree
README says the shipped model is classic 538-style Elo plus QB and that other candidates were cut, while `sample_data/tuned_config.json` enables designation injury, divisional adjustment, team AV prior, and quality weighting. That makes the displayed methodology and reported Brier score non-reproducible from the obvious config artifact.

**Fix:** one immutable production config, one model-version ID, one generated model card from the exact config, and experimental configs kept outside the production bundle. CI should rerun the frozen test split and fail if the published score/model card no longer matches.

### 4. Prediction and evaluative player metrics are easy to conflate
The exporter itself correctly notes that internal QB adjustment is predictive while UI QB rankings are evaluative. The same distinction becomes much more dangerous in a roster simulator: RB/WR/TE/OL/DL/coverage leaderboards are not automatically causal “team Elo points.”

**Fix:** build and backtest a player-absence/replacement model separately. Use snap share, position, replacement baseline, recent usage, injury/transaction timing, and uncertainty. Until validated, label non-QB roster effects experimental exactly as this prototype does.

## High severity

### 5. `home_elo_pre` / `away_elo_pre` are misnamed
`elo.py:1078` stores `home_eff` and `away_eff` into fields named `home_elo_pre` / `away_elo_pre`. Those effective values can contain QB and other game-specific adjustments, so downstream code may mistake a matchup-specific effective rating for the persistent team Elo.

**Fix:** emit both `home_team_elo_pre` and `home_effective_rating_pre` (and away equivalents). Never overload one field.

### 6. Divisional-adjustment block mutates wind after effective ratings were computed
`elo.py:727–739` calculates effective ratings using `_wind`; later, `elo.py:749–754` sets `_wind *= 0` for divisional games. This cannot affect the already-computed effective ratings and the comment “let wind handle separately” is inconsistent with the mutation. At best it is dead/confusing code; at worst future refactoring makes it silently change behavior.

**Fix:** remove it or apply the intended divisional attenuation explicitly to the rating difference in one tested place.

### 7. Legitimate zeros are converted to NaN in several signal reads
Patterns like `float(row.get("wind_speed", nan) or nan)` make `0` become NaN. Zero wind or zero burden is real data, not missing data.

**Fix:** explicit null/NaN coercion helper; never use truthiness for numeric data.

### 8. Odds capture is not a durable market-data model
`scrape_odds.py:212–216` hard-codes `week = 1` and deduplicates by `(season, home, away)`. This is insufficient for reschedules, corrections, multiple snapshots, opening/current/closing distinction, neutral-site games, and auditability.

**Fix:** join to schedule `game_id`; store source event ID, bookmaker, captured-at, market timestamp, line type/version, and normalized home/away IDs. Treat opening/current/closing as separate immutable observations.

### 9. Future games currently become visible only through odds rows in one UI path
A schedule product cannot depend on a betting-feed row existing. A game with no market line still exists and must appear.

**Fix:** schedule is the primary game table; odds are optional joined attributes.

### 10. “All-time” 0–100 anchors are not currently all-time
The model starts in 2008. The prototype's observed end-season anchor range is 1214.2–1782.0. Calling those literal worst/best NFL teams ever would overstate historical coverage.

**Fix:** either expand the model to the desired historical era or call 0/100 “model-era floor/ceiling.” Freeze/version anchors so a new record does not silently rescale every old public score.

## Medium severity / model integrity

### 11. A single affine 0–100 mapping cannot meet all three requested anchors
Because the high and low Elo extremes are not symmetric around 1505, one straight line cannot simultaneously put low=0, mean=50, high=100. The correct public transform is piecewise linear around 50 (used in this prototype), or a percentile/logistic mapping if you prefer stability over literal endpoints.

### 12. Expected record needs a distribution, not only a mean
Summing remaining game win probabilities is a good expected-win center. It does not produce a credible interval, playoff odds, division odds, or account for future rating movement.

**Fix:** Monte Carlo simulation with rating updates per simulated result, tie probability, QB/roster uncertainty, and scenario-specific player availability. Show median/mean plus 10–90% or 20–80% record band.

### 13. The binary win-probability model has no explicit tie probability
Historical ties can be treated as 0.5 in rating updates, but a consumer season simulator should be able to output W-L-T distributions.

### 14. Game ordering should be timestamp-first
Sorting by season/week/game_id is usually adequate for weekly football, but ratings and any league-wide renormalization should be deterministic by kickoff timestamp. International/neutral and unusual scheduling make assumptions more fragile.

### 15. Cross-source team codes are already inconsistent
nflverse currently uses `LA` and `JAX`; other parts of the repo use `LAR`, `JAC`, and current-location aliases. The position datasets also show current aliases applied to older seasons in some places while team Elo keeps old aliases. This breaks joins even when each table looks individually plausible.

### 16. Production data freshness has no hard gate
The UI should refuse to say “current” if the latest completed game is missing. Add freshness checks against schedule status and expose a visible “games through” timestamp.

### 17. Market-edge terminology needs leakage protection
If closing spreads ever enter an ostensibly pregame model comparison, apparent predictive quality can be overstated. Keep model prediction timestamp, line timestamp, and market snapshot type explicit.

## Engineering / maintainability

### 18. `EloModel.run()` contains a duplicated initialization/docstring block
`elo.py:1103–1134+` repeats the run docstring and starts reassigning optional state a second time. It is mostly harmless today but is a strong merge-drift smell and increases the chance two initialization paths diverge.

### 19. The repository's “tests” are not a normal pytest suite
`pytest` discovers no conventional tests; several files are executable analysis scripts, and real-data checks depend on an environment with `nflreadpy`.

**Fix:** add deterministic unit tests and fixtures for alias normalization, Elo updates, 0–100 transform, schedule joining, no-lookahead guarantees, config snapshots, odds versioning, roster-scenario math, and end-to-end 32-team bundle generation.

### 20. Evaluative analyses with known look-ahead must be quarantined
Any retrospective/clutch analysis that uses season-wide information is useful for explanation but must never feed same-season pregame prediction without walk-forward construction. Make the boundary architectural, not merely a comment.

### 21. Source changes and generated bundle can drift apart
The existing UI data predates some current source changes. Generated artifacts should embed the exact Git commit/config hash that produced them.

## Product / UX risks

### 22. One number needs uncertainty and provenance
A 73.4 FORCE Score looks precise. Give users the reason for the number, recent movement, games-through timestamp, and (eventually) uncertainty. Keep raw Elo under an Advanced disclosure.

### 23. Roster simulation can imply false causality
“Remove player X = minus 6.4 rating” is a strong causal statement. For non-QBs, use ranges and confidence labels until backtests prove otherwise. Trades also need source-team subtraction, destination-team addition, replacement effects, and role/snap redistribution.

### 24. Additions are not independent
Adding two elite receivers should not simply sum two individual effects. Position saturation, QB interaction, snap displacement and scheme matter. Production scenario engine should recompute a roster state, not sum sliders.

### 25. Injury timing matters
Season projection should support “out one week,” “out 4–6,” “season-ending,” and uncertain return, rather than treating every removed player as absent for all remaining games.

## Recommended production sequence

1. Canonical team/franchise identity module + tests.
2. Split played-game and schedule ingestion; live freshness/version metadata.
3. Freeze/reconcile the actual production config and rerun validation.
4. Refactor effective-vs-base rating fields and odds storage.
5. Add deterministic test suite and no-lookahead checks.
6. Ship FORCE Score as presentation layer with versioned anchors and raw Elo disclosure.
7. Add schedule/team projection using Monte Carlo.
8. Ship QB-only roster what-if first.
9. Develop/backtest non-QB player-value model; only then graduate the full roster lab from Experimental.

## Re-check note

During early inspection I flagged a possible duplicate expected-wins accumulation. I re-checked the uploaded source before packaging: `export_ui_data.py:430–431` contains a single expected-win accumulation and single game-count increment. I have **not** included that as a defect in the final audit.

---

## V2 forecast-layer audit: Brier improvement

The original research bundle already identifies the strongest defensible Brier
improvement available from the supplied data: the pregame market. The latest
model card reports an independent 2023–2025 holdout around **0.2170**, while the
closing spread alone and the logistic Elo+spread blend are both approximately
**0.2095**. The fitted Elo contribution after the closing market is known is
near zero.

That creates an important product boundary:

- **Do not feed betting lines into FORCE Score.** Doing so would turn a team
  strength rating into a market replica and make explanations circular.
- **Do use pregame market data in game forecasts when the goal is minimum Brier
  score.** It contains injury, availability, matchup, weather, and information
  aggregation that historical-result Elo cannot fully observe.
- **Do not call every live Smart-v2 forecast a “0.2095 model.”** The measured
  figure is for closing lines. Earlier lines may be less efficient and require
  their own timestamped backtest.
- **Preserve a market-free fallback.** Far-future season projections often have
  no line. They must still work from independent ratings.

The v2 prototype implements those rules and records the benchmark contract in
`benchmarks/brier_summary.json`.

### Recommended next model-research pass

For a genuine improvement to the *independent* model below 0.2170, the best next
work is new information rather than more tuning of the same result-derived
features. Highest-value candidates are timestamp-correct player availability
and starter quality, snap-weighted roster continuity, QB depth/backup quality,
travel/rest context, and richer play-by-play efficiency that is strictly frozen
before each prediction. Every candidate should be evaluated with rolling-origin
season splits and compared against both the independent baseline and the market.

---

## V3 audit: adaptive Vegas weighting and live refresh

### 26. Team-specific market residuals are plausible, but easy to leak
The proposed signal - a team repeatedly winning by less than its market-implied
margin - can only be used **after** those games occur. Using the current game's
final margin, closing outcome, or any post-kickoff price to modify that same
game's probability is direct target leakage.

**V3 guard:** Adaptive state is frozen for an entire weekly slate. Week N uses
only information through Week N-1; Week N results enter the state only after all
Week N forecasts have been scored.

### 27. “Vegas was wrong about the margin” is not identical to “Vegas was wrong about win probability”
Point-spread residual and Brier residual answer related but different questions.
A favorite can fail to cover while still winning often enough that its win
probability was well calibrated.

**V3 guard:** Keep two states. Margin-vs-market drives only a capped directional
adjustment. The *weight* assigned to Vegas vs the independent probability is
based on prior Brier advantage, not ATS performance alone.

### 28. Team residuals need aggressive shrinkage
A 17-game season is tiny. Raw team ATS/margin residuals are noisy and can swing
wildly after one blowout or injury-driven upset.

**V3 guard:** exponential decay + six-game-equivalent zero prior + capped
correction. The historical fitter searches the shrinkage strength rather than
assuming the runtime research defaults are optimal.

### 29. Large-favorite behavior deserves a separate interaction
A team's error profile as a 7-point favorite may differ from its profile as a
2-point underdog. Averaging those situations together can wash out the exact
pattern the user is trying to capture.

**V3 implementation:** a separate lagged residual is maintained when a team was
favored by 6+ points. It is combined with the general residual only for future
large-favorite situations.

### 30. Division effects must be tested *after* the market, not inferred from raw NFL scoring
It is well established in the original Celo configuration that divisional games
receive an independent-model compression. That does not prove Vegas leaves the
same bias unpriced. The sportsbook knows the matchup is divisional.

**V3 guard:** the market-layer division coefficient is zero by default. The
walk-forward fitter searches 0 alongside non-zero candidates and is allowed to
reject the entire feature.

### 31. A dynamic market weight is safer when based on forecast error, not narrative
“Vegas underrates this team” should have an operational definition. Adaptive v3
uses lagged market-vs-independent Brier advantage for games involving each team.
The weight is clipped to prevent a short streak from causing the model to ignore
the market.

### 32. Opening/current/closing lines must remain distinct
The embedded fallback contains opening lines from the supplied project. The
online nflverse schedule can expose pregame/closing market fields. These are not
interchangeable samples, and a 0.2095 closing-line result cannot be attached to
an opening-line forecast.

**Required production fix:** persist line timestamp, source, bookmaker and line
stage (open/current/close). Backtest each stage separately.

### 33. Hourly browser refresh is useful but not a production ingestion architecture
V3 refreshes every hour while open, provides a manual button, catches up after a
background-tab delay, and preserves the last good data on transient failure.
That is suitable for the prototype.

A production product should ingest server-side, version snapshots, expose the
source timestamp, verify all completed games are present, and push/cache a
small application payload rather than making every client download a multi-MB
league CSV hourly.

### 34. Adaptive Power should remain separate from independent FORCE Score
If betting markets directly alter the headline team-strength rating, the product
becomes partly a market index and can create circular explanations. V3 therefore
shows an Elo-equivalent forecast correction as a separate diagnostic. It does
not move the public 0–100 FORCE Score.

### 35. No adaptive Brier improvement is claimed until the historical harness runs
The current research defaults make the hypothesis interactive, but selecting
coefficients on the 2026 outcomes now visible would be classic overfitting.
`model/fit_adaptive_market.py` performs nested chronological tuning and contains
a promotion gate. Until a full historical run passes that gate, **0.2095 remains
the best validated market-aware benchmark in this package.**

## v4 matchup-report audit notes

### Unit data freshness is distinct from schedule freshness

The browser can refresh schedules, final scores and nflverse market fields every
hour, but the rich unit diagnostics (offense, OL, defensive front, coverage,
QB, luck and penalties) are still bundled from the supplied 2025 model export.
The UI states this explicitly. Production should regenerate these diagnostics
from the full model pipeline on a regular cadence rather than implying the
hourly schedule refresh updates player/unit quality.

### Luck and penalty data are explanatory, not automatically causal

Expected-win luck and penalty EPA are shown because they help explain why a
team's record may differ from underlying strength. The supplied research itself
finds penalties explain little of broad performance variance. The matchup page
therefore treats these as context unless the selected forecast model explicitly
includes them.

### Completed games must use frozen pregame state

A historical matchup page can easily become a hidden leakage surface if it uses
current Elo or later-season scoring. v4 stores each completed game's pregame
ratings/forecast while replaying the season week-by-week. Exact-score baselines
include only completed 2026 games from weeks strictly before the displayed
game.

### Exact-score predictions are intrinsically noisy

The line/win probability is the main calibrated forecast. The displayed exact
score is a point estimate constructed from the forecast-implied margin plus a
blended team scoring-total estimate. It should never be marketed as having the
same validation status as the Brier-scored win probability.

## v5 forecast-audit notes

### Forecast snapshots must remain immutable after kickoff

The product now displays predicted spread and predicted exact score next to the
actual final for completed games. This makes forecast provenance user-visible,
so production storage should eventually persist a timestamped forecast snapshot
per model version rather than reconstructing old predictions from mutable live
feeds. The prototype remains leak-safe by replaying the season with week-frozen
ratings and prior-week-only scoring inputs.

### Market-field semantics matter even more in an audit UI

The live nflverse `spread_line` field may represent a current/closing-like value
rather than the exact line a user saw when the forecast was originally issued.
The model's own predicted line remains reproducible, but a production forecast
audit should persist opening/current/closing market snapshots separately with
timestamps and bookmakers.

### Exact-score accuracy should be evaluated separately from Brier

Brier score evaluates win probabilities, not exact scores. Now that exact-score
predictions are displayed beside finals, production evaluation should add MAE
for home points, away points, total points, and margin, plus calibration of the
predicted total. Do not infer exact-score quality from the 0.2095 win-probability
Brier benchmark.


## V14 matchup clarity audit

- Replaced ambiguous negative `matchup pts` labels with named team advantages.
- Replaced `Trench edge` with `OL vs defensive front`.
- Added short plain-English explanation of offense/defense composite construction and clarified that component matchup rows are not additive.
- Propagated active QB-return scenarios into offense and QB unit displays while holding defense unchanged.
- Kept historical completed-game matchup reports frozen to their historical unit snapshot.
- Added regression coverage in `scripts/test_v14_matchup_clarity.js`.


## V24 live-metrics audit

- Hourly refresh now attempts schedule/scores/lines plus nflverse 2026 team and player weekly stats.
- Every displayed unit rating has a current-season path: offense, defense, QB, OL, front, coverage, run, receivers.
- Raw/diagnostic current-season paths include offensive EPA/play, QB EPA/play/CPOE, receiving EPA/target, rushing EPA, scoring, Luck, and tracked penalty context.
- Unit ratings use a four-game 2025 prior (`games/(games+4)` live weight) to control September noise.
- Luck is rebuilt from 2026 results and frozen pregame FORCE-only probabilities.
- Current penalty display does not fabricate EPA/WP from incomplete context; it uses tracked defensive-penalty yard swing as a clearly labeled live proxy.
- Live profiles drive rankings, team pages, matchup edges, strengths/weaknesses and explanatory cards.
- They do not silently enter the validated Elo/market probability model.
- Synthetic live-profile regression and full app refresh integration tests added.

## V37 unit-prior consistency
V37 resolves the mismatch where FORCE Score used the V34 early-regime signal but unit grades retained a fixed one-game prior. The V34 signal now changes only the *confidence* placed in the 2025 unit prior (1.00 down to 0.25 effective games); it never supplies a unit direction. Historical unit comparisons reconstruct only evidence available before the requested week. Predictive weights for these unit features remain zero under the V30 gate, so this is not represented as a Brier-validated forecast feature.
