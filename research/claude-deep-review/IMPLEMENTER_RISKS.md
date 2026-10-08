# Additive implementer high-recall risk declarations

Implementer self-assessment supplements independent selection; it never replaces it. A defect author can share the blind spot that caused the defect. Unflagged files are not presumed safe.

> You are not rewarded for producing a short risk list. False-positive review flags are relatively cheap. Failing to flag a plausible material risk is expensive.

> When uncertain whether something deserves reviewer attention, flag it.

> Uncertainty is itself a risk signal.

## Required schema and provenance

Every substantive implementation/integration must produce a JSON object with schema 1, integrationId, exact forty-character baseSha/resultSha, and risks. The base must be an ancestor of the result, which must be an ancestor of the review target. changedFiles must exactly match the no-renames Git diff, including deletions. The integration event's id/previousMain/main must match the declaration. Real declarations cannot use synthetic simulation provenance.

Seventeen required unique string arrays:

- changedFiles; affectedSubsystems; indirectConsumers; truthOwners;
- testsRun; testsNotRun; assumptions; invariants; unresolvedQuestions;
- shortcuts; compatibilityFallback; dataProviderSemantics;
- modelStatisticalSemantics; runtimeBuildDeploymentSemantics;
- parallelImplementations; staleContracts; lowConfidenceAreas.

Arrays may be empty only when honestly inapplicable; explain untested/uncertain areas rather than asserting safety. Consumers, owners, peers and stale contracts are actual target paths. Each risk requires riskId, nonempty eligible files, subsystem, category, explanation, potentialFailureMode, blastRadius, implementationConfidence and validationConfidence (HIGH/MEDIUM/LOW/UNKNOWN), reviewPriority, recommendedContext, relevantTests and dependenciesConsumers. The last three are arrays of target paths. Bounds limit declaration size, not independent repository coverage.

Priorities: CRITICAL REVIEW (ratings, historical validity, providers, public semantics, security, deployment or persistent-state exposure); HIGH REVIEW (meaningful narrower behavior/architecture risk); REVIEW (plausible interaction/validation gap); UNCERTAIN (cannot confidently establish safety). All four are mandatory direct content. UNCERTAIN is elevated attention, never low priority. A demonstrated defect is not required.

## Planner behavior and independence

Selection retains Tier 1, changed, new/promoted, deterministic-risk and due files independently. Declared roots add direct review; one hop adds direct callers/callees, tests, parallel peers, truth owners and explicit fixture/config/provider/state/consumer paths. Context does not recurse. Existing eligibility/security exclusions remain: an excluded raw cache is not silently uploaded; its owner/source and explicit eligible compact evidence provide context. Manifest reasons identify root and risk ID for every neighbor.

Optional ordinary rotation may be displaced, but no mandatory or due file may be displaced. Above normal source capacity, risk expansion is elevated and needs existing explicit owner budget authorization. The declaration is untrusted review evidence, with no spending, deployment, acceptance or escalation permission. Adversarial packets carry full declarations and the complete repository map plus this instruction:

> Treat the implementer's risk list as useful evidence, not as the boundary of the audit. Look specifically for important risks the implementer failed to identify.

Metrics separate flagged roots, added neighborhood, independently selected unflagged files, deterministic static risk, rotation-only and separately scoped reviewer escalation. Synthetic substantive-cycle reports include risk-driven extra bytes, optional rotation displacement and signed incremental ceiling versus the same history/change metadata without declarations. A lower net cost may reflect displaced rotation; it does not show risk evidence is free.

## Integration workflow

Create the declaration after the resulting commit so its SHAs and file list are exact. Keep it in an explicitly selected local evidence path; use a new immutable name/version, and do not put credentials in it. An integration event's `riskManifest` is a repository-relative path; `record-integration --event EVENT.json` validates it and records its hash. `plan --risk-manifest PATH` permits explicit supplemental evidence. Do not specify the same integration twice. The manifest is pinned into the immutable plan. Known SUBSTANTIVE events without declarations appear as `MISSING IMPLEMENTER RISK DECLARATION — uncertainty, not no risks` in cadence/plan/map evidence. Never fabricate a main integration to test this mechanism. Preview and simulation require no credential or API request.

## FORCE high-recall self-critique

Ask explicitly about normalization and raw/display grades; opponent adjustments, priors, regression, smoothing, sample size and recency; QB EPA/play, ANY/A, success, CPOE, rushing and pressure; unit/team bridges, correlated inputs, double counting/circularity, calibration and Brier calculations.

Ask about future/same-season leakage and historical-as-run meaning; provider priority, fallback/stale/null handling, identities, publication timing and freshness. Ask about Monte Carlo inputs, score distributions, representative scores, spread/total, playoff odds, seeding/tiebreakers and rounding that suggests certainty.

Ask about JS/Python and frontend/backend mirrors, duplicate formulas, stale compatibility, error paths, state persistence/cache invalidation, runtime/Worker/container and build/deploy dependencies. Ask whether tests share implementation assumptions, miss negative controls, use stale fixtures or inadequate mocks, leave code without behavior coverage, or pass because both reference and implementation have the same defect. These are prompts, not an exhaustive or proof-producing checklist. Record low-confidence answers as risks.

## Standing implementation handoff rule

[FORCE execution doctrine](../../FORCE_ROADMAP.md#implementer-self-challenge--high-recall-risk-declaration) now requires the compact nine-part self-challenge for every future substantive Codex implementation before independent review. It applies to targeted and deep handoffs, rather than only planner internals. Include highest risk/blast radius, weakest assumption/test, unperformed validation, hidden consumer, parallel implementation, plausible-but-methodologically-wrong output, and reviewer attack-first area. The [targeted brief contract](../../tooling/claude-review/README.md#implementer-self-challenge-for-future-substantive-work) supplies exact field names. A declaration may include this object as `selfChallenge`; the full declaration remains in the adversarial packet. Missing fields in an explicitly supplied block are surfaced; this does not retroactively alter old manifests or accepted history.

The machine-readable seventeen-array contract remains required for substantive deep integrations. Explicitly classified trivial housekeeping can omit the compact block, with rationale; documentation changing model/authority/workflow semantics is substantive. Self-assessment may only add priority. It cannot remove mandatory/due/independently selected content or reviewer escalation. UNCERTAIN remains elevated. No declaration authorizes spending or acceptance.
