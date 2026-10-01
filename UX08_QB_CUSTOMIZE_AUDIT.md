# UX-08 QB Customize audit

2026-10-01. Codex lane, starting at `8fc1f87` (`Add canonical FORCE roadmap`).

This is one bounded Phase 1 investigation/tooling tranche. The owner authorized
selection of an eligible item; no product/model answer is selected here.

## Candidate assessment before implementation

All five candidates are initially PLANNED. The phase/dependency assessment
selects investigation work without bypassing Phase 1.

| ID / decision status | Dependencies | Likely files | Expected verification | Claude UI overlap | Decision |
| --- | --- | --- | --- | --- | --- |
| UX-08 / INVESTIGATE | Same snapshot/controls; owner chooses the contract before behavior changes | `scripts/audit_qb_customize.mjs`, audit helper/fixtures, regression/catalog, this report | Actual app/model pipeline comparisons; context/prior/clipping/missing-data regressions; safe/QB suites | Low: internal tooling, no public UI edits; catalog/roadmap need integration review | Select: clear source trace and measurable baseline gap; evidence can inform a bounded owner decision. |
| UX-10 / INVESTIGATE | Cross-page quantity/source inventory; no chosen public labels | Projection functions in `assets/app.js`, semantic-map report, existing projection tests | Cross-page expected/marginal/representative comparisons | Low for read-only evidence; labels would overlap copy work | Eligible investigation, but the all-page inventory is larger than this tranche. Recommend separately. |
| UX-25 / CONFIRMED | UX-10/11 semantics, actual clinch/elimination source, UX-05 shared formatting | `assets/app.js`, shared odds helper, postseason regressions | Raw probabilities unchanged; actual-state-gated 1%/99% across outcomes | Medium: public projection surfaces | Defer implementation: prerequisites/actual-state contract are not yet established. |
| UX-29 / CONFIRMED | Phase 2 UX-02/05 foundations, UX-30 mobile requirements | Shared sort/rank helper, table consumers, table regressions | Selected-metric ranks, both directions, deterministic ties, missing data | High: same data-view markup as UI lane | Defer implementation: Phase 1 handoff/shared table architecture precede it. |
| UX-26 / CONFIRMED outcome, approach still open | UX-10/12 evidence; owner selects quarter strategy | Simulation/quarter functions in `assets/app.js`, score fixtures/report | Sums, plausible event paths, same-forecast provenance | Medium: forecast output surfaces | Investigation is eligible, but implementing an approach now would choose an unresolved strategy. |

## Authorized deliverable and non-goals

Build a reproducible offline diagnostic around the real browser app and live
model, quantify Default versus untouched Customize on identical inputs, and
prepare product-contract alternatives. Add behavioral coverage for the audit's
evidence and availability handling. Keep production code, public copy, model
weights, priors, recency, qualification, and generated assets unchanged.

The diagnostic and findings below are prepared for owner review. No
second tranche, security round, production probe, or deployment is authorized.

## Reproduce the evidence

From the repository root:

```text
node scripts/audit_qb_customize.mjs
node scripts/run_tests.mjs --test test_qb_customize_audit.mjs
```

The diagnostic prints JSON to stdout, writes no files, and disables app
boot/network through the existing test harness. It executes the ordered scripts
from `index.html` and calls the actual `liveProfiles`, `qbComponentScores`,
`qbCustomRawScore`, and `qbCustomScore` functions. It does not substitute a
parallel model. The test checks the actual Rankings page's Default/Customize
Final and Raw cells for every fixture team.

Three default runs use a declared synthetic 32-team, three-week league with
distinct weekly opponents, identical inputs/controls, and the tracked V5
historical reference. They are not live or deployed measurements. The two prior
variants change only the supplied preseason QB index (5 or 95); existing model
reversion still applies, producing effective priors 18.5 or 81.5.

For separately obtained offline evidence:

```text
node scripts/audit_qb_customize.mjs --input offline-input.json
```

Input is an object with `teamRows`, `playerRows`, `schedule`, and `gameFlow` in
the current app's shapes. Optional `priorProfiles` contains team-keyed preseason
overrides. This is not a bootstrap-response parser or production fetcher. Input
provenance is explicitly unverified; no fresh/live claim is made. Output records
Node version, SHA-256 of the complete ordered browser sources, diagnostic
sources and V5 reference, and each input's SHA-256. The public 60% primary-QB
qualification controls the summary population.

## Source trace and current semantics

| Stage | Canonical Default | Customize |
| --- | --- | --- |
| Component scores | Live historical-scale EPA/play, ANY/A, success, rushing value, CPOE from `model/live_profiles.js` | Same scores through `qbDebug` / `qbComponentScores` |
| Raw | 30/30/20/10/10 composite, existing 1.20 expansion around 50 and clipping | User weights normalized, same calibration/clipping; untouched weights reproduce canonical Raw when all five component scores are available |
| Opponent / pressure | Added to Raw, then the live score is clipped | Same adjustments added directly in `qbCustomScore` |
| Continuity | `blend(prior, live, playerStatGames, qbPriorGames)`; effective confidence follows the V99/unit-prior path | No continuity blend |
| Recency | Added once by app `liveProfiles`, after continuity, then clipped | Same stored canonical recency added once before final clip; custom weights do not recompute it |
| Published Final | Rankings reads `displayedQbIndex`, falling back to measured; the displayed value may include a QB-return scenario overlay; audit records both | Rankings reads `qbCustomScore`; no displayed QB-return scenario overlay |

Raw excludes opponent, pressure, continuity, and recency. Its component inputs
still include existing statistical stabilization; Raw does not mean
unstabilized native statistics. Customization changes this ranking only, not
team FORCE, FORCEcast, or the canonical QB unit.

Through the normal production `qbDebug` -> `qbComponentScores` path, an actually
missing component contributes 0 to Customize. For each of the five component
fields, `qbDebug` maps an absent property, undefined, NaN or either infinity to
null; explicit null and explicit 0 become 0, and ordinary finite values remain
unchanged. `qbComponentScores` then converts the null to 0:
`Number(null) === 0`, and `Number.isFinite(0) === true`. Its coded neutral-50
fallback exists for values that remain nonfinite after numeric conversion, but
normal `qbDebug` output is finite-number-or-null, so that fallback is bypassed
for ordinary missing production components.

Canonical Raw handles components differently. EPA must be finite or Raw is
unavailable/null. Success and CPOE use `?? 50` for nullish scores. ANY/A has its
own finite-number/50 fallback; its numeric conversion also turns explicit null
into 0. Rushing value is constructed from its rush bonus, with a zero bonus
yielding the neutral 50 result. There is no universal canonical missing-value
policy. The diagnostic deliberately reports missing component stages as
unavailable rather than treating production fallbacks as complete-data evidence.

This is relevant evidence for the future UX-08 product contract: missing-as-zero
can penalize a customized composite, while missing-as-neutral would not impose
that zero-value penalty. No contract or preference is selected here, and these
source-path observations do not establish how often this occurs in deployed
production.

All-zero custom weights currently yield Raw 0: the denominator falls back to 1,
the weighted composite is 0, and calibration/clipping returns 0. Final can still
contain opponent, pressure and recency terms. This is observed behavior, not a
selected contract or a proposed production fix.

For available inputs, `R` is calibrated Raw, `O`/`P` opponent/pressure,
`T` stored recency, `H` the effective prior, `g`/`h` current/equivalent-prior
games, and `clip` the 0–100 bounds:

```text
canonical live        = clip(R + O + P)
canonical pre-recency = H * h/(g+h) + canonical live * g/(g+h)
canonical measured   = clip(canonical pre-recency + T)
custom final         = clip(custom Raw + O + P + T)
```

Both paths use all three context terms; canonical additionally blends
continuity, including the contextual live score. Changing only the prior leaves
Raw and Customize unchanged while moving canonical Final. Any displayed/measured
scenario difference is separately reported rather than attributed to continuity;
the built-in synthetic cohorts include a nonzero KC `scenarioGap`, detailed below.

Clipping order is another boundary distinction. In a controlled stage fixture,
Raw/live/prior are 100, opponent is +8, pressure is 0, and recency is -4.
Canonical first clips the contextual live score to 100 and later displays 96;
Customize clips `100 + 8 - 4` to 100. The four-point gap survives identical
live/prior values. This is an illustrative stage fixture, not an observed NFL QB.

## Quantified fixture results

All 32 teams are available/qualified. Every default-weight Raw pair matches;
opponent, pressure, and recency are nonzero for every team. Final-score gaps
below are absolute rating points, not predictive accuracy.

| Fixture | Mean absolute Customize–Default gap | Maximum absolute gap | Synthetic ARI Default | Synthetic ARI Customize |
| --- | --- | --- | --- | --- |
| Tracked preseason priors | 6.010205 | 16.484262 | 30.314566 | 30.168941 |
| Supplied prior index 5 | 9.196739 | 16.743675 | 27.281371 | 30.168941 |
| Supplied prior index 95 | 5.690984 | 12.623086 | 42.792026 | 30.168941 |

Input SHA-256s, in that order:

```text
73c8446e8a178db3f88eb26125e8eebe0b5a5782ca05099360e4997167aed596
7f659b6d4029d7148c071b2d0e711d87c27f94814a2beee53556c402c17191d8
f407760a4dc9ce27b942e19446d254fbc7479cbaa5d4f2093630aa178288d192
```

Intermediate custom stages are labeled counterfactuals. An exact telescoping
decomposition separates continuity/raw-stage, clipping-order, and
displayed/measured scenario differences. Incompatible schemas, unavailable
canonical/component stages, and null values produce an unavailable comparison,
not invented zero/neutral scores.

The output field `continuityAndRawGap` is the difference between the clipped
counterfactual `customStagedFinal` and clipped canonical measured Final. Near
0/100 it describes the visible post-clamp effect, not an unclipped prior-blend
delta; with changed weights it also contains the Raw-stage difference. The
separate `scenarioGap` is displayed Default minus measured Default; Customize
does not apply that overlay. The built-in synthetic cohorts record KC
`scenarioGap` values of 4.261664 with tracked priors, 4.220547 with low priors,
and 4.294644 with high priors. The diagnostic already recorded these values
correctly; the numeric tables and gap decomposition were already correct. Only
the prose claiming zero overlay was wrong. These are synthetic-fixture
observations, not estimates of real-world production prevalence.

## Product-contract alternatives for owner choice

These are proposed invariants, not accepted implementation directions:

| Option | Proposed invariant | Consequences / decisions needed |
| --- | --- | --- |
| A. Customize the canonical pipeline | Untouched weights reproduce canonical Default exactly; changed weights retain continuity/context/clipping stages | Weight effects are attenuated through continuity. Decide custom recency policy and Raw/Final wording; implementation requires separate authorization. |
| B. Preserve a separate live analytical rating | Explicitly name the unblended current-evidence baseline and current single-clamp formula | Retains current math and stronger immediate weight effects. Default-weight agreement describes its analytical contract, not canonical Final. Decide label/disclosure and clipping explanation. |
| C. Anchor adjustments to canonical Default | Zero weight perturbation produces canonical Default; custom component changes are relative to that baseline | Different contract from both current paths. Decide scaling, clipping, context/prior ownership, and Raw/Final meaning before specifying a formula. |

The owner must choose what Customize claims to customize, whether untouched
weights reproduce canonical Final, how continuity/context/recency are retained,
and public Raw/Final meanings. No option is selected here. Current Raw semantics
and ranking-only customization are observations of current behavior, not new
roadmap `PRESERVE` constraints. The product contract remains open.

## Verification and handoff

The new regression covers actual pipelines/rendered cells, varied priors and
weights, source/input provenance, clipping bounds, null/unavailable stages,
qualification, incompatible schema, and validation. It rejects audits that
silently equate the ratings, omit custom recency, attribute all gaps to the prior,
or manufacture neutral comparisons.

No new production invariant or product fix is introduced: this tranche
implements investigation tooling, not a chosen Customize behavior.

Verified 2026-10-01 on `codex/roadmap-lane`:

- Targeted isolated audit regression: 1 passed, 0 failed.
- `npm test`: 135 passed, 0 failed, including release/model/snapshot/server
  regressions already selected by the safe catalog.
- `npm run test:qb`: 26 passed, 0 failed.
- Both full-suite runners verified real worktree status and file hashes
  unchanged; external network was disabled.
- `node --check` passed for the CLI, two new library modules, and regression.
- `git diff --check`, all new-file whitespace checks, catalog counts, and the
  34-ID roadmap/governance/phase/preservation checks passed.

The eight changed files are this report, `FORCE_ROADMAP.md`, the CLI, two new
audit/fixture helpers, the new regression, its catalog entry, and updated test
guide counts. No production or generated file changed. UX-08 remains
INVESTIGATE with execution REVIEW pending contract/cross-review; no option is
chosen. The lane commit SHA is supplied in the final handoff, avoiding a
self-referential commit hash inside its own document.

Limits: synthetic populations do not estimate production gap size. The input
adapter covers the documented core profile inputs, not every advanced feed or
public-bootstrap envelope. Live validation needs separately obtained evidence
with provenance. Rerun the audit as pipelines change rather than treating these
numbers as permanent model targets.

Recommend owner review of the alternatives or a separately authorized UX-10
semantic inventory. Neither begins automatically. Reciprocal cross-review has
now passed and the reviewed lanes are combined in `integration/roadmap-lanes`;
the original lane refs and `main` remain unchanged.

Integration reconciliation (2026-10-01, `integration/roadmap-lanes`) clarified
the missing-component fallbacks, displayed scenario overlay, zero-weight Raw,
post-clamp gap terminology and observation-versus-constraint distinction above.
The original lane verification remains historical; combined verification is in
[the testing guide](scripts/TESTING.md). Reciprocal review passed with
non-blocking notes. No new investigation, product contract or production
behavior change was introduced by this documentation reconciliation.
