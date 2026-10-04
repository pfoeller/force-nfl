# MD-05 Unit attribution investigation

Cycle 7, 2026-10-04; base `cf391daa2d43a44fe9d742ea0b96cc537d1a7136`. Investigation REVIEW; replacement formulas and implementation NOT AUTHORIZED. [Shared architecture](CYCLE7_MULTI_MD_SYNTHESIS.md), [reproduction](research/cycle7/README.md), [paired outcomes/prototypes](research/cycle7/results/units.json).

## Current architecture

[Live profiles](model/live_profiles.js) constructs units; [application](assets/app.js) adds one bounded [unit bridge](model/unit_force_bridge.js) to core season-engine Elo. `currentTeamState()` exposes that rating/profile; `ratingLedger()` decomposes result/regime/retro/unit/retired-QB terms. Its residual verifies numerical accounting, not causal ownership of a football event.

QB uses 30% all-play EPA, 30% ANY/A, 20% pass success, 10% rushing, 10% CPOE, then opponent/pressure and continuity context. V148 promotes recency into the canonical unit once (±4); do not reapply it downstream. EPA already includes sacks and meaningful QB runs; ANY/A also uses sacks. These are correlated indicators within an intentional composite, not automatically several full-EPA charges. Pressure context is 75% standard-rush protection difficulty plus 25% pressure performance (70% EPA/30% success, 30-play shrinkage). Opponent context uses FORCE QB Rating allowed in other matchups, excluding the evaluated team's game.

OL uses de-duplicated hit **OR** sack per normal dropback on the canonical PBP route. It still depends on QB behavior and opposing rush. Current live OL is **pass protection only**; the older rush/stuff term is not a direct current OL→bridge rushing channel. Preseason fields may retain that historical concept.

WR/TE EPA/target already receives a historically fitted, ridge-shrunk QB-environment subtraction (covariance/variance divided by1.5), target stabilization and calibration. RB combines direct rushing EPA and partially residualized receiving (70/30), separately stabilized. Current units are not simply unadjusted receiving EPA, but residualization does not establish pure player talent.

Coverage uses sack-free pass-attempt EPA plus CPOE (75/25). Sack exclusion avoids literal sack duplication; pressure still changes throw outcomes. Pass rush follows available curated/FTN/external/PFR/nflverse disruption/held-prior inputs with provider-compatible benchmarks. Run defense uses opposing rushing efficiency. Scoring/defensive points per drive are broad outcomes; the server excludes defensive/kick-return touchdowns from offensive-drive points. ST context and penalties exist, but no standalone ST unit enters the bridge.

The current bridge weights are scoring/drive .20, QB .12, receiver .08, OL .08, RB .07, coverage .162, rush .072, run defense .126, defensive points/drive .090. Current-minus-prior movement receives share .5 and cap ±7.5 midpoint-equivalent FORCE points before Elo conversion. Missing/stale units contribute zero movement without redistributing weight. Display offense/defense composites are **not added again** by today's fixed bridge. Core results and unit outcomes can still share completed-game information.

V30's earlier display-only/zero-weight unit history does not establish an inactive current bridge. Current source, V148 and bridge regressions are operative evidence. The historical policy is not rewritten; any new feature remains gated.

## Attribution ledger

| Signal | Direct/indirect routes and bridge weights | Shared nature / risk | Candidate treatment |
| --- | --- | --- | --- |
| Sack | QB EPA/ANYA .12, OL disruption .08, opponent rush .072; core/PPD indirectly | QB decisions, blockers, rush, coverage duration | Union event IDs; separate indicators and shared sack/context budget; retain interaction |
| Pressure then throw | QB context .12, OL if hit .08, rush .072, coverage .162 | True pressure differs from proxy; timing/escape/scheme | Source-specific definitions; blocker/QB responsibility if available; missing not zero |
| Completion/TD/interception | QB .12, receiver residual .08, coverage .162; PPD .20/.090 | Partial residual retains common passing; scoring is parent outcome | Shared passing environment; evaluate aggregate incremental contribution, not cosmetic decorrelation |
| QB run | QB EPA union and rushing indicator .12; run defense .126; PPD | Same run feeds different concept indicators | Preserve once-only EPA union; ledger interaction instead of deleting rushing evidence |
| RB run/stuff | RB .07, run defense .126, PPD; no current OL run grade | Blocking, box, runner and situation | Block/runner data, explicit shared environment; stuff rate is not blocker responsibility |
| RB target | QB .12, RB .07 through receiving component, coverage .162 | Partly shared passing environment | Partial rather than full subtraction; holdout signal conservation |
| Drive points | .20/.090 plus core game results | Broad parent efficiency overlaps components | Shared aggregate budget and full-stack ablation; no literal EPA-conservation claim |
| Opponent/prior/recency | Unit estimates and core continuity | Shared schedule/early-regime evidence | Causal timestamp/provenance ledger, matched replay; no extra display-composite channel |
| Penalty/ST context | FLAG/Luck/drive/game context; no standalone ST bridge key | Attribution ambiguous, broader results already reflect it | Separate research; do not add the same PPD/penalty value again |

## Historical overlap and channel materiality

Pinned 2024/2025 REG PBP with weekly position IDs yields 544 paired team-games/year. These are **raw outcome proxies**, not regenerated canonical unit grades. Season means are equal-game, not opportunity-weighted production aggregates. Opponent observations are dependent; 544 rows are not 544 independent experimental trials.

| 2025 pair | Game r | 32-team season r | Interpretation |
| --- | ---: | ---: | --- |
| QB all-play EPA / good protection (negative disruption) | .381 | .523 | Shared sack/pressure; contextual QB relief partly counters OL difficulty |
| Sack-free pass EPA / WRTE target EPA | .938 | .975 | Strongest observed raw overlap; current residual already addresses part |
| Not-stuffed RB runs / RB EPA | .364 | .501 | Run-block proxy, not current OL input or identifiable block talent |
| Defensive disruption / good sack-free coverage EPA | .250 | .490 | Sack exclusion does not remove pressure-induced passing dependence |

Bundled legacy prior grades: QB/OL r=.412; QB/receiver r=.835. Correlations with bundled current Elo: QB .611, OL .378, receiver .500. These are descriptive legacy associations, **not current V115 residual correlations**. The bundled prior has no explicit passRushIndex/rbIndex/runDefenseIndex/PPD keys; those pairs remain null. Anonymous historical percentile arrays are not paired team observations. Cached V137 game-flow lacks V149 QB semantics and is not restamped or used as current canonical data.

Real bridge sensitivity, synthetic +10 grade versus50 prior at midpoint core: QB +3.324 Elo, receiver/OL +2.216 each, scoring/drive +5.540, coverage +4.487, rush +1.994, RB +1.939, run defense +3.490, defensive PPD +2.493. QB+receiver+scoring shifts jointly imply2 bridge points /11.08 Elo before saturation. This measures channel capacity, **not a sack's actual duplicate charge**. Nonlinear grades, context compensation and prior deltas prevent multiplying raw correlation into duplicated Elo. Shared passing plus scoring (.40 aggregate offense weight) is the highest-priority materiality hypothesis; actual current overcount remains unmeasured.

## Partition prototypes and falsification

Four isolated probes fit 2024 and apply unchanged to2025: `residual = y - beta*(x-train_center)`, beta=covariance/(variance×1.5). The shared term remains in a ledger; residual+shared reconstructs y within1e−12. Fits are associational, not causal football attribution.

| Probe | Holdout r before→after | Half-season stability before→after | Max rank move | Next-game proxy MSE raw→residual |
| --- | --- | --- | ---: | --- |
| QB/protection | .381→.118 | .555→.465 | 9 | .104844→.105598 (worse) |
| RB/run-block proxy | .364→.083 | .053→−.040 | 9 | .048852→.048887 (worse) |
| Coverage/disruption | .250→.082 | .386→.363 | 3 | .112733→.112586 (tiny improvement) |
| Receiver/pass environment | .938→.698 | .509→.287 | 7 | .147331→.147072 (tiny improvement) |

The next-game exercise fits only previous same-team game predictors on2024 and evaluates2025 (512 transitions). Target is the next outcome proxy, **not winner Brier or full-stack increment**. Exact coefficients, ranks and parent correlations are in JSON. Across season team means, residual correlation with bundled current FORCE Elo remains .555/.361/.718/.456 for QB/RB/coverage/receiver respectively; descriptive crosssection only. QB residual remains strongly correlated with parent offense (.889 versus .924), so reducing correlation against one unit does not isolate skill.

Raw+shared and residual+shared contain essentially the same linear information and have near-identical next-game MSE. Ridge regularization produces tiny differences; re-labeling creates no predictive magic. Zero-subtraction identity, conservation and nonzero erased-shared variance are checked. Dropping the shared term erases real blocker/receiver/rush synergy; full subtraction can punish an excellent unit partnered with another excellent unit. All three mandatory probes reduce half-season stability. No candidate passes predictive policy.

## Unit-specific candidate designs, not selections

| Unit | Target/input and direction | Opponent/context | Sample/recency | Attribution/failure |
| --- | --- | --- | --- | --- |
| QB | Execution/decision value: all-play EPA, ANYA, success, CPOE, meaningful rush | Validated opponent/context architecture as reference; inspect pressure responsibility | Opportunity shrinkage/continuity; once-only recency preserved | Shared sacks/passing; indicator composite not event-credit sum; hold-ball confounding |
| OL | Protection responsibility: disruption lower better; block/quick-pressure evidence where adequate | Opponent front, blitz, throw timing, escape | Dropbacks; no assumed QB-style recency; lineup evidence needed | QB/sack shared budget; true pressure versus proxy distribution mismatch; coarse outcomes cannot identify blocker |
| Receiver | Route/catch execution above QB environment; target/route quality | Coverage, depth, contested chances, placement if observed | Targets/routes; role-change recency only if validated | Partial passing residual plus interaction; selection and air/YAC jointly caused |
| RB/rushing | Runner execution and receiving above opportunity environment | Box, blocking, down/distance, front if observed | Carries/targets separately; committee exposure | Run environment/runner/shared channel; stuff rate not OL ownership; replacement calibration |
| Pass rush | Pressure creation/quick win, sack finish separately | OL/QB timing, rush count | Provider-matched event volume; no universal recency | Coverage interaction preserved; source-switching can fake improvement |
| Coverage | Throw/route suppression and catch-point execution | QB/depth and rush/pressure | Attempts/targets, CPOE availability | Sack-free reference still excludes no-throw events; joint channel needed |
| Run defense | Front/fit/tackle performance above run opportunity | Runner/OL, box, run type/situation | Carries; roster/recency response only with replay | Shared running/blocking/drive context; no sole-tackler EPA credit |
| ST | No current standalone grade; prospective kicking/return/net field value | Distance, venue, rules, return opportunity | Separate opportunity counts; not QB template | Research only until distinct outcome budget/data; avoid duplicate FLAG/PPD |

PBP supports proxies/coarse context, not reliable block responsibility, separation or coverage assignments. Opponent, recency and shrinkage must be justified per unit, not universally copied from QB. Full-stack evaluation needs causal unit inputs/priors and core/regime/retro state at every kickoff, matched references, frozen weights, forecast-time/market provenance, multiple seasons and untouched holdouts. MD-03 core-only replay infrastructure cannot certify this gate; its preserved research stays untouched.

Recommendation: an attribution/provenance ledger and causal **shared-passing/scoring bridge ablation** before formula selection. Support: strongest raw overlap and active bridge routes. Counterevidence: existing residual/context handling and insufficient responsibility data. Uncertainty: incremental harm from current shared evidence. Falsifier: matched full-stack holdout showing current combinations outperform constrained/residual alternatives with stable calibration. Owner chooses unit concepts/shared budget, not one-unit-per-play dogma. Broad redesign and new ST/OL-run channels remain parked.
