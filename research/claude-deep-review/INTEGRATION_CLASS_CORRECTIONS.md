# Final integration-class completion correction

Parent `015f23ca1412009b40ab8500a1f9567fa3c3b6ba`. Its valid narrow review accepted substantive identity/hash/source-trigger/ancestry/late/replay protection and returned one MATERIAL class-completeness defect, two MINOR interpretation findings and one OPTIONAL sentence. This correction does not reopen accepted architecture, economics or product/model work. Independent acceptance is pending.

## All-class membership and completion

New schema-2 membership pins every registered SUBSTANTIVE, HOUSEKEEPING and AMBIGUOUS identity: ID, previous/result main, classification, tags, declaration path/hash when present, plus active source-trigger identity/provenance. The substantive integration list still contains only substantive IDs; non-substantive events do not invent a substantive declaration requirement. Packet reproduction and the reviewer-visible snapshot remain immutable.

SUBSTANTIVE retains exact identity, declaration hash, target ancestry and planned mandatory source-treatment requirements. HOUSEKEEPING with matching pin and included ancestry retires without substantive cadence count or substantive declaration; any actual mandatory tags still require pinned treatment. Late HOUSEKEEPING remains pending.

Pinned AMBIGUOUS in ancestry remains pending as **AMBIGUOUS CLASSIFICATION — OWNER DISPOSITION REQUIRED**, with `contentInReviewedTarget:true`. It is not late, not consumed and not silently classified. Its source triggers stay active. Counts and threshold behavior remain the standing cadence policy; completion does not grant a new classification.

After explicit AMBIGUOUS→HOUSEKEEPING or →SUBSTANTIVE classification, the event remains pending and requires a new plan pinning its current class. Prior ambiguous content coverage is not retroactive substantive declaration or mandatory-review coverage. HOUSEKEEPING retires on that next valid class-specific completion; SUBSTANTIVE gets its ordinary declaration/cadence/trigger obligations. No historical backfill or classification-time automatic consumption is added. The recorded integration chain tip is retained independently of pending classification rows, so consuming a newer event while keeping an older ambiguous event cannot mis-anchor the next registration. Legacy state derives this tip from its last recorded event before filtering. Old-class pins fail closed on replacement.

Only events absent from a complete schema-2 snapshot receive **LATE-REGISTERED ANCESTOR INTEGRATION — NOT PRESENT IN PINNED REVIEW PLAN**. Existing schema-1 substantive-only plans reconstruct unchanged. For their absent non-substantive classes, the accurate pending reason is **INTEGRATION NOT REPRESENTED IN LEGACY PINNED PLAN — CLASS MEMBERSHIP UNKNOWN**; no late provenance or coverage is invented.

## Two minor interpretation corrections

Creation checks consistency between a caller-provided state object and its plan. The production CLI passes the same in-memory state, so this does not detect an independent on-disk registration race. The test is renamed accordingly. Completion uses the latest state under the existing cadence lock: unpinned late registrations in that state stay pending. No multi-host or arbitrary lock-bypassing writer guarantee is claimed and no concurrency architecture was added.

Status now exposes `deferredIntegrationsFromLastCompletion`, covering membership, ancestry, mandatory-treatment and owner-classification deferrals. The misleading old field is removed; no tracked consumer besides the tests used it. Reasons are the last completion's history, not newly issued classifications. After reclassification, current counts and missing-declaration fields reflect the current class; earlier completion reasons are not rewritten.

## Optional documentation

The existing companion explanation now explicitly notes E's lower observed change-only peaks/bursts and D's slightly lower 24-audit aggregate total. Neither dominates; D remains default and weighting remains an owner choice. No new economic simulation or policy analysis was run.

## Validation and review gate

New controls cover all classes, pre-plan/late housekeeping, pre-plan/late ambiguous events, ambiguity thresholds, both reclassification routes, mandatory housekeeping tags, legacy provenance and plan persistence. A substantive-only capture mutant fails the all-class expectation. All previously accepted substantive controls remain. Full targeted/deep harnesses, catalog, syntax, PowerShell parsing, local links and diff checks accompany the narrow packet. Earlier paid receipts and previews are hash-pinned and preserved; mocks are not paid lifecycle evidence.

Batch **FORCE-DEEP-INFRA-INTEGRATION-CLASS-CORRECTION-001** is DRY RUN only, with a 12,288-token output cap. Review only class-specific completion, tests and interpretation fixes. Do not rereview economics, SLA, D/E, context/environment/cost architecture or FORCE product/model.

ACCEPTED closes the infrastructure loop. ACCEPTED WITH MINORS closes unless spend, coverage, credentials, completion or cadence/trigger truth is threatened. CORRECTIONS REQUIRED with only MINOR/OPTIONAL closes after human disposition, without automatic correction iteration. Inspect only any BLOCKER/MATERIAL before deciding. Baseline remains **NOT AUTHORIZED**; no paid request, merge, PR, bank push or deployment is authorized by this correction.
