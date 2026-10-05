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

Pinned 2024/2025 REG PBP with weekly position IDs yields 544 paired team-games/year. These are **raw outcome proxies**, not regenerated canonical unit grades. Season means are equal-game, not opportunity-weighted production aggregates. **All four original paired correlations below are computed on overlapping/shared plays.** They cannot distinguish part-whole arithmetic from causal unit interaction or duplicated rating value. Opponent observations are dependent; 544 rows are not 544 independent experimental trials.

| 2025 pair | Game r | 32-team season r | Interpretation |
| --- | ---: | ---: | --- |
| QB all-play EPA / good protection (negative disruption) | .381 | .523 | Partly shared-play arithmetic plus real interaction/team quality; existing QB protection relief |
| Sack-free pass EPA / WRTE target EPA | .938 | .975 | Mostly part-whole arithmetic: receiver targets are a subset of the pass attempts; not evidence of severe attribution harm |
| Not-stuffed RB runs / RB EPA | .364 | .501 | Mostly mechanical: stuffed runs are the negative tail of those same runs; not current OL input |
| Defensive disruption / good sack-free coverage EPA | .250 | .490 | Mostly legitimate rush/coverage interaction, not literal duplicate charging |

### Shared-play falsification

| 2025 diagnostic (544 paired team-games each) | Game r | Meaning |
| --- | ---: | --- |
| WR/TE receiver EPA vs disjoint non-WR/TE attempt EPA | 0.076362 | Weak common outcome signal after removing the part-whole identity |
| Receiver vs reconstructed pass EPA, shuffled non-WR/TE component | 0.904987 mean | High correlation survives without a shared non-WR/TE QB signal |
| Clean-dropback QB EPA vs protection | 0.190346 | Excludes sacks/hits from the QB outcome subset; remaining interaction/team quality |
| Non-stuffed RB EPA vs not-stuffed fraction | -0.126894 | Original positive correlation was mostly the mechanical stuffed-play tail |
| Clean/no-QB-hit attempt coverage EPA vs disruption | 0.190346 | Residual correlation is legitimate interaction or general defensive quality |

The disjoint complement is **all** sack-free normal-down attempts not mapped to WR/TE, including unassigned receivers (throwaways etc.). This exact definition gives .076362, rather than copying the review's approximate .13. Clean dropbacks exclude sacks and hits; RB non-stuffed means yards gained >0. Defensive coverage is the opponent's negative clean-attempt EPA, paired with opponent disruption. Clean QB/protection and clean defense/disruption are equal up to rounding because swapping the 544 offense/defense rows negates both variables. Definitions, counts and values are reproducible in extraction/results; none estimates causal skill.

The part-whole null retains real WR/TE outcomes and per-game target shares, shuffling only disjoint non-WR/TE EPA 1,000 times (seed71005). WR/TE attempts are 78.10% of this filtered population. Its permutation interval is [0.889899, 0.917443], **not a population confidence interval**. The .938/.975 correlations are withdrawn as primary support for a Tranche 2 or severe attribution overlap. Current FORCE already partially residualizes receiving; no literal full-value double charging is proven.

Bundled legacy prior grades: QB/OL r=.412; QB/receiver r=.835. Correlations with bundled current Elo: QB .611, OL .378, receiver .500. **In this offline bundle `currentRatings - coreCurrentRatings = 0` for all 32 teams: live profiles equal priors.** Thus every bundled-current-Elo correlation here is effectively a **core-Elo** correlation and cannot measure actual production bridge magnitude. These are descriptive legacy associations, **not current V115 residual correlations**. The bundled prior has no explicit passRushIndex/rbIndex/runDefenseIndex/PPD keys; those pairs remain null. Anonymous historical percentile arrays are not paired team observations. Cached V137 game-flow lacks V149 QB semantics and is not restamped or used as current canonical data.

Real bridge sensitivity, synthetic +10 grade versus50 prior at midpoint core: QB +3.324 Elo, receiver/OL +2.216 each, scoring/drive +5.540, coverage +4.487, rush +1.994, RB +1.939, run defense +3.490, defensive PPD +2.493. QB+receiver+scoring shifts jointly imply2 bridge points /11.08 Elo before saturation. This measures channel capacity, **not a sack's actual duplicate charge**. Nonlinear grades, context compensation and prior deltas prevent multiplying raw correlation into duplicated Elo. The .40 passing/scoring offense weight is channel capacity, not evidence of harmful overlap or measured importance. Completed games feeding both core results and PBP-derived bridge movements are a structural reuse hypothesis; actual production contribution, incremental value and overcount remain unmeasured.

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

PBP supports proxies/coarse context, not reliable block responsibility, separation or coverage assignments. Opponent, recency and shrinkage must be justified per unit, not universally copied from QB. **Full historical causal replay is not available:** archived pre-kickoff live profiles and pressure-provider inputs/provenance do not exist in this package. Full-stack evaluation would need causal unit inputs/priors and core/regime/retro state at every kickoff, matched references, frozen weights, forecast-time/market provenance, multiple seasons and untouched holdouts. MD-03 core-only replay infrastructure cannot certify this gate; its preserved research stays untouched.

Recommendation: **first measure actual production bridge materiality**, by team, unit key and total contribution from a published/current production snapshot using `ratingLedger`/debug, recording source/time/model/input provenance. This is proposed **RESEARCH TOOLING**, not a production formula or authorization to probe/fetch now. The offline zero bridge cannot answer it. If the passing triad is small, lower the priority of broader attribution work.

Only after materiality measurement should possible shared-passing/PPD ablation design and causal archival tooling be prioritized. Full replay cannot be promised without the missing historical inputs; prospective archives can support later held-out evaluation. The raw .938/.975 part-whole correlation is not a justification for that work. Support: source-traced bounded bridge routes and structural completed-game reuse. Counterevidence: existing residual/context handling and weak disjoint signal. Uncertainty: actual production magnitude and incremental predictive harm. Falsifier: materiality is negligible, or matched future full-stack holdouts favor current combinations with stable calibration. Owner attribution choices and predictive-policy gates remain open. Broad redesign and new ST/OL-run channels remain parked; no formula earns adoption.

## Cycle 8 current production measurement — 2026-10-05

The owner separately authorized the first production bridge-materiality measurement recommended above. [Pinned live snapshot and research ablation](research/cycle8/md05_bridge_materiality/README.md) replaces the zero-bridge offline evidence boundary for this specific measurement: all 32 teams have nonzero bridges, nine hit the cap, and current-state outputs are materially sensitive. This does not supersede the historical/descriptive evidence or prove causal duplication/predictive increment. The owner ACCEPTED corrected first findings (`61561fc` + `d16c5d7`) on 2026-10-05 following Claude's targeted verdict A. MD-05 remains REVIEW. Formula implementation, unit redesign and historical causal replay remain NOT AUTHORIZED. MD-06 remains REVIEW / NOT AUTHORIZED; MD-07 and MD-08 remain PLANNED / NOT AUTHORIZED. No follow-on work begins.

## Cycle 8 second research tranche — 2026-10-05

The owner separately AUTHORIZED only key/group ablation, descriptive redundancy/attribution and persistence research. [Methods/evidence](research/cycle8/md05_bridge_materiality/KEY_GROUP_ATTRIBUTION.md) use immutable accepted capture: nine direct-key/five predefined groups, cap interactions and n=32 descriptive correlations. Current partial orthogonalization/legitimate shared-play interactions preserved; no literal full-value duplicate charging or predictive harm proven. Result-only movement since recorded Week-2 entry uses same-capture ledger excluding overlays. One independent eligible snapshot; persistence unresolved with research-only manual capture method. No historical causal replay. The owner ACCEPTED the corrected second tranche (`3d98f0e2d0d59c4c602a4e76c94ad2c268f5e4c3` + `9efc6b2452fe7176f536ad544cf1785e41256e0f`) on 2026-10-05 after Codex completed the owner-authorized research, Claude independent review B identified the required local-path correction and recommended seed-noise disclosure, Codex applied both in `9efc6b2`, and Claude targeted re-review returned **A. CORRECTIONS VERIFIED — SECOND TRANCHE READY FOR OWNER DECISION**. Earlier first-tranche acceptance (`61561fc` + `d16c5d7`) is reconfirmed. [Full acceptance record and accepted interpretation](research/cycle8/md05_bridge_materiality/KEY_GROUP_ATTRIBUTION.md#owner-acceptance-and-research-branch-closeout--2026-10-05). MD-05 remains REVIEW (BANKED pending future evidence), Priority unset, NOT COMPLETE: broader design is unresolved and no production design selected. Formula changes, residualization adoption, redesign/implementation NOT AUTHORIZED. MD-06/07/08 status/authority unchanged; no automatic follow-on work.

## Owner acceptance and banked research status — 2026-10-05

Both corrected Cycle 8 tranches are OWNER ACCEPTED. Accepted interpretation preserves gross versus marginal effect, descriptive correlation versus causal redundancy/double counting, nonlinear interaction versus duplication, current sensitivity versus historical predictive value, and cap/source differences versus proof of faulty cap/source bias. Persistence UNRESOLVED: one independent eligible production generation; same-generation copies do not add temporal evidence. The manual capture method is PRESERVED; future independence generally requires another completed week or substantial profile update. Any future comparison remains separately reviewable research requiring authorization; capture does not authorize analysis or model changes.

No further MD-05 tranche/deeper research, historical/predictive full-stack ablation or its design, historical causal replay, production implementation, bridge reweighting/share/cap/normalization/formula changes, residualization adoption or unit formula changes is authorized. No scheduler, background monitoring, new production endpoint or automatic recurring capture is authorized. MD-06 REVIEW / NOT AUTHORIZED; MD-07 and MD-08 PLANNED / NOT AUTHORIZED, without reprioritization or feed/vendor/license/purchase/pilot authority. No merge, push or deployment.
