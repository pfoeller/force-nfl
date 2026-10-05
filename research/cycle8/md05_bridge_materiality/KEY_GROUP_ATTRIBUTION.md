# MD-05 key/group attribution and persistence — Cycle 8 second tranche

Research only. The owner accepted first-tranche evidence (`61561fc` + `d16c5d7`) on **2026-10-05**, following Claude's targeted verdict A. This second key/group, descriptive redundancy/attribution and persistence tranche alone is authorized. Independent review and owner acceptance of second findings are **PENDING**. Production implementation, formula/weight/share/cap/normalization changes, residualization adoption and historical causal replay remain **NOT AUTHORIZED**. MD-05 stays REVIEW, priority unset; MD-06/07/08 authority is unchanged.

## Input and exact method

The accepted [input](inputs/snapshot.json), [provenance](inputs/provenance.json), [first result](results/bridge_materiality.json) and four original scripts are immutable. No new live capture. Base `f2ce02c9f4ac7e54f22b372b6583cc878b030c45`; October 5 capture/generation details are in the [README](README.md#capture-and-scope). Input hash remains `8a25682fc22ab08c85c8fdc5701d8ffdcef8d9d5dfe3e47b06b3954f43e20376`; accepted result remains `ffdeec4705d6a360b86b36f45d82552c82d68e9e4696626bea621381a6809a87`.

[Analysis](key_group_ablation.mjs) verifies all nine current production keys/weights, share .5 and cap ±7.5 against source and accepted accounting. In a scratch VM each selected current key is set to its actual prior, zeroing only its direct contribution before the existing cap. Unselected components remain identical; no weight redistribution, unit rebuild or partial-orthogonalization refit. This is **direct bridge-channel sensitivity**, not removal of a unit's football influence from other metrics. QB channel removal does not recalculate receivers/scoring. Core, profiles/priors, schedule, markets, anchors and state are frozen/hash-checked. Retired automatic/manual QB state remains identity.

Actual ratings, forecasts, implied lines, analytic wins and entire season reproduce accepted references. All 14 variants use existing smart forecasts and 5,000-run season engine. Passive observation of production LCG calls confirms **1,045,000 identical random states** (209 remaining games × 5,000), stream SHA-256 `acc792bbc1d23887ec54571e93a5c306d298f31d998814bb3a88890c146161a8`. No RNG returns or model functions are replaced. Completed results are fixed; absent-line market handling and rating-based tiebreak fallback remain unchanged. Per-game score simulations are not repeated in this second tranche.

Signed effect = actual minus ablated. Tables summarize absolute effects. Positive rank delta = ablated rank minus actual rank; another team's movement can change rank with own Elo fixed. Probability units are percentage points (pp), lines points; Elo is not display FORCE. [JSON](results/key_group_ablation.json) preserves all signed vectors, FORCE/ranks, medians/maxima, cap directions/sign flips, 209 game and 32 season rows. [CSV](results/key_group_ablation.csv) summarizes variants.

## Individual team effects

| Key | Mean abs Elo | Median abs Elo | Max abs Elo | Largest signed team | Mean abs rank | Max rank |
| --- | --- | --- | --- | --- | --- | --- |
| Scoring/drive | 8.757 | 7.352 | 19.957 | CAR 19.957 | 0.688 | 2 |
| QB | 5.040 | 3.512 | 13.829 | CAR 13.829 | 0.375 | 2 |
| Receivers | 2.529 | 1.871 | 11.215 | ARI -11.215 | 0.250 | 1 |
| OL protection | 3.125 | 2.081 | 10.285 | PIT -10.285 | 0.312 | 2 |
| RB | 2.606 | 2.794 | 9.075 | KC 9.075 | 0.250 | 1 |
| Coverage | 6.849 | 6.366 | 23.662 | HOU -23.662 | 0.562 | 2 |
| Pass rush | 3.065 | 2.280 | 8.866 | NYG -8.866 | 0.250 | 1 |
| Run defense | 6.802 | 4.474 | 24.043 | DEN -24.043 | 0.500 | 2 |
| Prevention/drive | 4.131 | 3.305 | 10.469 | DET -10.469 | 0.312 | 2 |

## Individual game effects

Fixed descriptive thresholds are not adoption criteria. Endpoint boundary crossings use ≥; categories are not mutually exclusive. JSON also includes 25/75% and ±3/±7 line crossings.

| Key | Mean abs pp | Median abs pp | Max abs pp | Mean abs line | Max abs line | Games ≥1 pp | Games ≥5 pp | 50% crossings | Games ≥1 line point |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scoring/drive | 1.681 | 1.469 | 5.410 | 0.521 | 1.427 | 136 | 4 | 6 | 25 |
| QB | 0.982 | 0.695 | 3.867 | 0.301 | 1.073 | 80 | 0 | 1 | 3 |
| Receivers | 0.501 | 0.436 | 2.529 | 0.159 | 0.709 | 25 | 0 | 2 | 0 |
| OL protection | 0.611 | 0.447 | 2.452 | 0.191 | 0.717 | 39 | 0 | 3 | 0 |
| RB | 0.487 | 0.434 | 2.240 | 0.152 | 0.590 | 22 | 0 | 2 | 0 |
| Coverage | 1.475 | 1.080 | 5.442 | 0.451 | 1.426 | 116 | 2 | 6 | 20 |
| Pass rush | 0.656 | 0.529 | 2.651 | 0.205 | 0.699 | 53 | 0 | 1 | 0 |
| Run defense | 1.514 | 1.121 | 5.630 | 0.463 | 1.766 | 117 | 3 | 8 | 22 |
| Prevention/drive | 0.867 | 0.795 | 2.665 | 0.280 | 0.855 | 84 | 0 | 3 | 0 |

## Individual season effects

Current-input sensitivity, not prediction improvement. Common random numbers reduce comparison noise but do not smooth discrete outcomes or provide confidence intervals.

| Key | Mean abs analytic wins | Max abs analytic wins | Mean abs MC wins | Mean abs playoff pp | Mean abs division pp | Mean abs bye pp | Largest signed playoff pp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scoring/drive | 0.173 | 0.397 | 0.175 | 2.455 | 1.916 | 0.206 | ATL -8.860 |
| QB | 0.094 | 0.279 | 0.095 | 1.364 | 0.837 | 0.189 | IND -6.960 |
| Receivers | 0.045 | 0.151 | 0.045 | 0.468 | 0.479 | 0.122 | LAR -2.620 |
| OL protection | 0.058 | 0.210 | 0.059 | 0.704 | 0.631 | 0.267 | BAL 3.420 |
| RB | 0.045 | 0.149 | 0.045 | 0.510 | 0.751 | 0.240 | BAL 2.460 |
| Coverage | 0.148 | 0.424 | 0.150 | 1.796 | 1.669 | 0.591 | DET -6.900 |
| Pass rush | 0.062 | 0.168 | 0.063 | 0.781 | 0.570 | 0.146 | CLE -3.960 |
| Run defense | 0.147 | 0.463 | 0.148 | 2.134 | 1.779 | 0.413 | CIN 9.840 |
| Prevention/drive | 0.088 | 0.227 | 0.089 | 1.058 | 0.944 | 0.419 | DAL -5.540 |

## Cap accounting

Binding means strict abs(pre-cap)>7.5; equality uses the cap without excess. Actual binding count is nine throughout. Removing an opposing key can create a cap. Each team actual/ablated pre/post-cap is recorded.

| Variant | Binds→binds | Binds→unbound | Unbound→binds | Unbound→unbound | Bridge sign flips |
| --- | --- | --- | --- | --- | --- |
| Scoring/drive | 3 | 6 | 0 | 23 | 1 |
| QB | 5 | 4 | 0 | 23 | 1 |
| Receivers | 8 | 1 | 0 | 23 | 1 |
| OL protection | 6 | 3 | 1 | 22 | 1 |
| RB | 7 | 2 | 1 | 22 | 1 |
| Coverage | 6 | 3 | 1 | 22 | 3 |
| Pass rush | 8 | 1 | 0 | 23 | 1 |
| Run defense | 6 | 3 | 1 | 22 | 4 |
| Prevention/drive | 8 | 1 | 1 | 22 | 1 |
| Passing/protection | 2 | 7 | 0 | 23 | 2 |
| Offensive bridge | 0 | 9 | 0 | 23 | 4 |
| Defensive pass | 5 | 4 | 1 | 22 | 4 |
| Defensive bridge | 3 | 6 | 1 | 22 | 8 |
| Drive outcome | 2 | 7 | 0 | 23 | 2 |

LV's scoring contribution is +4.903 pre-cap points; its removal leaves +9.780 before cap and +7.500 after cap, so own Elo effect is zero. Every individual key removal leaves LV capped. Offensive-group removal moves it off cap to +6.864, changing Elo by +3.522. Receiver removal leaves eight of nine originally capped teams at the same cap.

## Exactly five predefined groups

| Group | Removed direct keys |
| --- | --- |
| Passing/protection | QB, Receivers, OL protection |
| Offensive bridge | Scoring/drive, QB, Receivers, OL protection, RB |
| Defensive pass | Coverage, Pass rush |
| Defensive bridge | Coverage, Pass rush, Run defense, Prevention/drive |
| Drive outcome | Scoring/drive, Prevention/drive |

OL is pass protection, not run blocking. These are bridge-channel groups, not disjoint causal partitions. No extra groups/combinatorial search.

| Group | Mean abs Elo | Max abs Elo | Mean abs game pp | Max abs game pp | Mean abs line | Mean abs analytic wins | Mean abs playoff pp | Mean abs division pp | Mean abs bye pp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Passing/protection | 8.866 | 26.390 | 1.758 | 6.462 | 0.537 | 0.164 | 2.201 | 1.672 | 0.296 |
| Offensive bridge | 19.793 | 44.032 | 3.856 | 11.577 | 1.182 | 0.395 | 5.134 | 4.866 | 0.857 |
| Defensive pass | 7.447 | 20.661 | 1.509 | 6.300 | 0.463 | 0.150 | 2.054 | 1.841 | 0.551 |
| Defensive bridge | 14.176 | 36.702 | 3.021 | 10.905 | 0.914 | 0.297 | 4.521 | 3.631 | 1.000 |
| Drive outcome | 8.980 | 28.127 | 1.679 | 4.686 | 0.542 | 0.152 | 1.750 | 1.355 | 0.557 |

Offense has largest mean team/game/analytic-win/playoff effect, followed by defense. Passing/protection team effect is close to drive outcome; game/playoff effects are larger. No combined importance score.

## Signed interaction accounting

Interaction = joint signed effect minus sum of individual signed effects, calculated row by row before magnitude summaries. Sums of absolute effects would confuse cancellation. JSON stores all individual sums/joint effects/differences.

| Group | Mean abs Elo interaction | Game pp | Analytic wins | Playoff pp | Uncapped sign-conversion Elo | Cap-mediated Elo remainder | Max Elo interaction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Passing/protection | 1.077 | 0.290 | 0.030 | 0.458 | 0.002 | 1.075 | 8.925 |
| Offensive bridge | 4.099 | 1.048 | 0.105 | 1.437 | 0.040 | 4.060 | 28.379 |
| Defensive pass | 0.587 | 0.166 | 0.016 | 0.369 | 0.012 | 0.575 | 8.255 |
| Defensive bridge | 1.660 | 0.424 | 0.041 | 0.906 | 0.088 | 1.572 | 9.474 |
| Drive outcome | 0.769 | 0.208 | 0.020 | 0.385 | 0.012 | 0.757 | 5.403 |

Uncapped columns are accounting identities only, not uncapped forecasts or cap proposals. They separate piecewise positive/negative Elo conversion from remaining cap effects. Most team non-additivity is cap-mediated; offensive max is 28.379 Elo. Games/analytic wins add nonlinear probability/market conversion; playoff outputs add discrete outcomes, tiebreaks, allocation interactions and finite simulation variation. These layers are not separately causally identified. Non-additivity is not double counting.

## Gross versus marginal rankings

| Key | Gross rank | Gross share | Marginal Elo rank | Game rank | Analytic-win rank | Playoff rank |
| --- | --- | --- | --- | --- | --- | --- |
| Scoring/drive | 1 | 20.988% | 1 | 1 | 1 | 1 |
| Coverage | 2 | 15.654% | 2 | 3 | 2 | 3 |
| Run defense | 3 | 14.741% | 3 | 2 | 3 | 2 |
| QB | 4 | 12.718% | 4 | 4 | 4 | 4 |
| Prevention/drive | 5 | 9.261% | 5 | 5 | 5 | 5 |
| OL protection | 6 | 7.272% | 6 | 7 | 7 | 7 |
| Pass rush | 7 | 7.010% | 7 | 6 | 6 | 6 |
| Receivers | 8 | 6.293% | 9 | 8 | 8 | 9 |
| RB | 9 | 6.063% | 8 | 9 | 9 | 8 |

Scoring leads all marginal metrics. Run defense overtakes coverage for game/playoff effects. Pass rush overtakes OL for game/wins/playoffs; RB overtakes receivers for Elo/playoffs. League divergences are modest (one place); do not exaggerate. Team suppression can be complete. Schedule/opponent contrasts, curvature, cancellation and playoff position also matter; not all rank changes are exclusively cap effects or optimal-weight evidence.

## Descriptive correlation and bounded redundancy screening

Every correlation is cross-sectional **n=32**, one capture. Keys are current-minus-prior, weight/share-adjusted contributions, not raw unit grades or independent skill estimates. The full 13-variable Pearson/Spearman matrix includes nine keys, applied bridge Elo, current core Elo, final Elo and result-only movement. Final includes core+bridge mechanically; correlation with final is not independent validation. No fitted replacement, VIF selection or multivariable model.

The [ledger supplement](inputs/core_movement_ledger.json) comes from the existing full first-capture ledger, not a new capture. All 32 current rows match accepted ledger rows; resultElo matches current causal Elo minus recorded Week-2-entry causal Elo. It isolates **causal/result-only movement since that entry**, excluding early-regime, retrospective, unit-bridge and retired-QB terms. Ablation core includes overlays; this narrower movement definition is deliberately distinct. Source/generation hashes and 32 unique Week-2 entries are checked. No arbitrary baseline or mixed-snapshot subtraction.

| Contribution | Core Pearson | Core Spearman | Result movement Pearson | Result movement Spearman |
| --- | --- | --- | --- | --- |
| Scoring/drive | 0.168 | 0.160 | 0.476 | 0.525 |
| QB | 0.068 | 0.082 | 0.337 | 0.380 |
| Receivers | 0.215 | 0.187 | 0.347 | 0.360 |
| OL protection | -0.128 | -0.141 | 0.104 | 0.084 |
| RB | 0.260 | 0.266 | 0.232 | 0.197 |
| Coverage | 0.191 | 0.246 | 0.414 | 0.389 |
| Pass rush | 0.124 | 0.149 | -0.144 | -0.172 |
| Run defense | -0.246 | -0.246 | -0.220 | -0.153 |
| Prevention/drive | 0.582 | 0.561 | 0.423 | 0.405 |
| Applied bridge Elo | 0.243 | 0.202 | 0.431 | 0.402 |

Prevention has largest positive key/core r=.582. Run defense is negative (−.246); contribution deltas need not increase with core quality. Bridge/core r=.243 and bridge/result movement r=.431 are consistent with shared quality/completed-game reuse but cannot diagnose overcount.

The 36 pairwise partial correlations control only core, descriptive screening with no significance/causal claim. Strongest scoring/QB raw r=.852, partial .855; scoring/receiver .605 (partial .591), coverage/prevention .567 (.571), QB/receiver .564 (.564) identify future leads. Controlling core does not remove shared plays, priors, opportunity or measurement error. Low correlation cannot certify attribution independence.

Group pre-cap/core Pearson: passing/protection .067, offense .157, defensive pass .228, defense .177, drive outcome .381. Group/result movement: .350/.450/.314/.191/.599. Spearman and marginal/core are in JSON. Drive outcome has strongest group/result-movement association; a full-stack research lead, not proof of harm.

## Structural overlap map

Current [live model](../../../model/live_profiles.js): historical QB-environment shrinkage/partial residualization 1218–1243; pass-protection-only OL 1506–1512; QB composite/context 1555–1571. Current [app](../../../assets/app.js): stabilized profile/once-only QB recency 1688–1785. [Bridge](../../../model/unit_force_bridge.js): nine-key compute 98–135. Line numbers refer to pinned base. [Cycle 7 investigation](../../../MD05_UNIT_ATTRIBUTION_INVESTIGATION.md) preserves prior shared-play/falsification findings.

| Key | Events/stat families and existing treatment | Adjacent overlap / classification |
| --- | --- | --- |
| Scoring/drive | Broad offensive points per drive; current PPD sample/prior/context handling | QB/receiving/rushing/protection drive outcomes; correlated parent outcome and legitimate interaction |
| QB | All-play EPA, ANYA, pass success, CPOE, meaningful rush; opponent/protection context, stabilization and once-only recency | Receivers shared attempts, sack/protection and PPD parent; shared-play quality, not literal extra event credit |
| Receivers | Target/catch/yardage/efficiency; active historical ridge-shrunk QB-environment subtraction, target stabilization/calibration | QB passing, coverage and drive outcomes; partial residualization limits environment credit without causally isolating receiver skill |
| OL | Pass protection/disruption allowed, dropback/context treatment; no current run-block channel | QB timing/escape/sack and opposing rush; legitimate interaction/proxy confounding, no identical full-value charging established |
| RB | Rush and receiving efficiency/opportunity; historical partial QB-environment subtraction, carry stabilization/calibration | QB/offense/drive and opposing rush; shared opportunities/correlated outcomes, not an invented OL-run duplicate |
| Coverage | Sack-free passing-attempt EPA/CPOE with attempts/sample treatment | QB/receiver and pressure influence on attempts; sack exclusion does not remove pressure/coverage synergy |
| Pass rush | PFR advanced pressure when available, otherwise weekly sacks/hits disruption; provider-compatible benchmarks | OL/QB responsibility/coverage timing; legitimate interaction and source measurement heterogeneity |
| Run defense | Opposing rushing efficiency/opportunities with current sample/context treatment | Runner/blocking/drive; correlated parent outcomes/interaction; no sole-tackler EPA ownership established |
| Prevention/drive | Broad points allowed per drive; current PPD sample/prior/context handling | Coverage/rush/run defense/game context; parent outcome and legitimate interaction |

All nine use completed-game-derived information while the same games' wins/margins feed core Elo: **team-level core/bridge reuse** is the main structural question. It is not a second literal addition of core Elo. Transformations and priors differ. Offense/defense display composites are **display-only** relative to this bridge, not additional bridge keys. No literal full-value duplicate event charging is proven.

## Passing triad and drive outcomes

Passing contribution Pearson/Spearman: QB/receiver .564/.572, QB/OL .392/.430, receiver/OL .183/.169, n=32. Gross shares 12.718%/6.293%/7.272%, total 26.283%. Individual mean Elo 5.040/2.529/3.125; joint 8.866. Mean abs signed interaction 1.077 Elo/.290 game pp/.458 playoff pp; seven caps become unbound. Cycle 7 raw QB/receiver .938/.975 were largely part-whole/shared-play arithmetic; disjoint r=.076362 and production partial receiver residualization remain counterevidence. Current delta-contribution correlations are different vectors, not replacements for that finding.

Scoring/core r=.168; prevention/core .582; scoring/prevention .023 (Spearman .005), n=32. Joint drive outcome: 8.980 Elo, 1.679 game pp, .152 analytic wins, 1.750 playoff pp; seven caps become unbound. Mean abs interaction .769 Elo, cap remainder .757. Scoring is a major current-output driver; weak pair correlation does not settle shared core reuse. No MD-10 implementation/PPD change.

## Pass-rush source quality

| Source | n | Mean abs grade delta | Mean abs gross midpoint | Mean abs marginal Elo | Mean abs playoff pp |
| --- | --- | --- | --- | --- | --- |
| nflverse-weekly-disruption | 28 | 20.592 | 0.741 | 3.177 | 0.697 |
| pfr-advanced | 4 | 11.288 | 0.406 | 2.279 | 1.370 |

PFR is four teams ATL/CLE/NO/PIT; source allocation is not randomized. Fallback has larger raw/gross/Elo effects, but PFR larger playoff effects due to downstream context. No causal source-bias conclusion. MD-07 research lead: provider-matched dispersion/coverage/source-switch comparability. No source policy or MD-07 authority change.

## Persistence inventory

[Manifest](inputs/persistence_candidates.json) and [result](results/persistence_inventory.json) retain candidate paths/hashes/dates/schema and individual rejection reasons. Read-only search of 117 existing local FORCE project/managed-worktree/TEMP roots excluded .git/node_modules/public; all-ref Git path history also inspected. Content/filename searches found **325 candidate paths, 36 byte-distinct JSON variants**. This bounded inventory does not claim unknown external archives or every computer file.

Three eligible normalized variants/four copies are the **same October 5 generation** (accepted input, CRLF review copies, private full normalization draft). Only **one independent eligible production snapshot**; no eligible prior observation. Backing raw capture and regenerated outputs are not independent.

| Classification, byte-distinct variants | Count | Treatment |
| --- | ---: | --- |
| Eligible accepted-generation normalized copies | 3 | One observation |
| Fixture/source/validation | 13 | Ineligible production capture |
| Historical V33 | 2 | Different historical model/input semantics |
| Historical event ledger | 8 | No current nine-key/prior/production reconstruction |
| Offline/synthetic | 4 | Not live production |
| Raw/migration capture | 3 | Unproven deployed pins/normalization; transformations |
| Same-capture backing/derived | 3 | No temporal independence |

Older October 1 migration files share builtAt `2026-10-01T18:30:32.432Z`, generation `1790879432432-21d9bbbb-e27e-44a3-b1aa-ebfe48137742`, but lack demonstrated deployed-code pins and complete normalized current/prior/core reconstruction. Corrected/final files are transformations. Reject rather than restamp/reconstruct/mix versions. **Persistence unresolved**: no temporal correlations, ranking/sign stability or season conclusion; no `persistence_analysis.json`. No synthetic proxy replaces time evidence.

## Manual prospective capture method

[prospective_capture.mjs](prospective_capture.mjs) is an offline research normalizer, not a provider fetcher/importer. A researcher may manually GET the existing public bootstrap, retaining raw bytes **outside Git**, exact UTC capture time, HTTP status, byte count/raw SHA-256, and LF-normalized SHA-256 for all 18 ordered published scripts. Capture-meta keys: `capturedAt`, `url`, `status`, `bytes`, `sha256`; optional public response headers. URL `https://forceratings.com/api/bootstrap`, status 200. Published hashes map each ordered script path from base index to its hash. Raw files contain provider data: keep private, no new redistribution right.

From the exact-source checkout:

```text
node research/cycle8/md05_bridge_materiality/prospective_capture.mjs <private-bootstrap.json> <capture-meta.json> <published-script-hashes.json>
```

Rejects source/base/hash mismatch, stale/degraded/incomplete/zero bridge, missing current/prior keys, unscored started-game windows, accepted generation and existing directories. Writes only minimal FORCE-derived input/provenance in **new** `inputs/persistence/<generation>/`; cannot overwrite accepted input/results. No network calls/background service/scheduler/endpoint changes. Live/integrity/freshness, base/time/generation/raw/normalized/source hashes and runtime are recorded. Existing frozen runtime must reproduce `referenceLite` ratings, forecasts and analytic wins exactly. Future season comparison is reviewed analysis, not hidden work during capture.

A distinct generation is necessary but insufficient for meaningful independence. Prefer after another completed NFL week or meaningful profile update, once games finish and integrity/freshness pass. Same-day or identical input updates are not season persistence. Source changes require fresh explicit version/provenance review before comparison; exact base remains pinned to avoid silent mixed models. This tranche establishes the accepted snapshot as baseline and manual method; **no new capture or future job is run**. Synthetic TEMP write controls are not evidence.

## Acceptance questions and decisions

Q1: Gross order: scoring, coverage, run defense, QB, prevention, OL, pass rush, receivers, RB.

Q2: Scoring leads team/game/analytic wins/playoffs. Separate downstream rankings are tabulated; no optimal weight follows.

Q3: LV shows complete single-channel suppression; group unbinding exposes suppressed effects. Opposing-key removal can create a cap. League rank divergences modest, per-team suppression substantial.

Q4: Offense largest, then defense, for team/game/wins/playoffs. Drive outcome/passing triad are narrower consequential probes.

Q5: Effects not perfectly additive: cap dominates team interaction; probability conversion and discrete playoffs add downstream interactions. Not duplicate credit.

Q6: Prevention key/core r=.582; drive group/core .381 and group/result movement .599. Descriptive n=32 only.

Q7: Scoring/QB, scoring/receiver, coverage/prevention plausibly share plays/parent outcomes; completed games plausibly link core/bridge. Existing context/residualization and legitimate synergy prevent a duplication inference.

Q8: **NO double counting proven.** No predictive harm/improved removal/optimal cap or weight claim.

Q9: Yes, output exposure and specific overlap leads justify recommending a **separately authorized historical/predictive full-stack ablation design**. Historical causal input availability remains prerequisite; no replay begins/candidate selected. Future evaluation must use frozen causal inputs, full-stack incremental accuracy/calibration and holdouts under predictive policy, not fit this 32-team cross-section.

Q10–Q11: No eligible independent prior snapshot; persistence unresolved with manual prospective method. No temporal conclusion.

Q12: MD-07 provider dispersion/coverage/source comparability and MD-08 normalization anchors/dispersion/prior comparability are consequential because deltas flow into active caps/bridge. Discussed as future research only. MD-07/08 PLANNED / NOT AUTHORIZED; MD-06 REVIEW / NOT AUTHORIZED. No priorities assigned.

Owner decisions remain: second-tranche acceptance, future persistence collection/comparison scope, historical/predictive design, attribution policy, sources/normalization and any production adoption. This commit chooses none.

## Reproduction and validation

Node v26.7.0, repository root:

```text
node research/cycle8/md05_bridge_materiality/key_group_ablation.mjs
node research/cycle8/md05_bridge_materiality/persistence_inventory.mjs
node research/cycle8/md05_bridge_materiality/check_key_group.mjs
```

Check verifies four new syntaxes, all eight accepted artifacts against `d16c5d7`, two complete 14-variant runs/two inventories with byte-identical JSON/CSV equal to saved results, actual references, common RNG states, team/cap accounting, group membership and synthetic selected/retained-key controls, frozen market/schedule/state/config hashes. Also prospective frozen-input compatibility and accepted/existing-destination refusal. Optional argument: private **existing** first-capture directory, for positive normalization and bad published-source rejection without fetching. That local positive path passed; reviewers without raw private files retain deterministic normalized evidence and source/hash guards.

Original `check.mjs` still passes including both original full replays. New result SHA-256 `ab3f26c4c8975bf3c84932858ee512daa857b0c53078580d57c44bdd621324d3`; inventory SHA-256 `05796a57652a00dd931679f0861879c81b121627502530b0cbeece8df6fe66cc`. CRLF normalized for comparisons only; numbers not rounded for output/hash. Roadmap IDs/links, catalog integrity, exact scope and whitespace checked at handoff. No production suite/build rerun claimed: production/test/generated diff is empty.
