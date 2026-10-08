# Periodic FORCE deep fresh-eyes review

This mode provides a **repo-wide fresh-eyes audit with complete inventory/analytic coverage and risk-prioritized + rotating direct-content review**. Local mapping is not direct Opus review. Neither mapping nor API verdicts guarantee correctness or authorize integration. The policy amendment supersedes literal-every-file review on every audit.

## Four separate coverage contracts

1. Every tracked target-SHA path appears in an inventory read from Git objects, with blob/hash/size/type/classification, subsystem, eligibility/exclusion reason, tier, change state, dependency/test/truth-owner metadata and direct-review history. No tracked path silently disappears.
2. Every eligible file is inspected locally for declared and relative imports, source/path references, reverse consumers/test mapping, exact and whitespace-normalized duplicates, cross-language filename peers, TODO/FIXME, legacy/version/provider/trust markers, line/size indicators and source-owner links. These are deterministic navigation signals, not AST analysis, semantic-equivalence proofs or Codex product verdicts. Every thematic packet carries the complete compact map, including map-only and excluded paths. Full metadata lives in the manifest.
3. Actual complete content is selected for all Tier-1 files, eligible changes since the last completed audit, source risk signals, related dependencies/consumers/tests, current architecture/model/governance truth owners, deterministic Tier-2/Tier-3 rotation and overdue files. Map-only files are eligible and scheduled, not excluded. Original Git UTF8/BOM/CRLF bytes are reconstructed from contiguous lossless ranges for every directly selected file.
4. A reviewer concern about a map-only path can generate an exact-content escalation packet with one-hop dependencies/consumers/tests and the exact concern. Creating it is $0. Sending it requires separate explicit owner authorization and rationale. An escalation cannot complete/reset the whole-repository audit cadence.

Tier assignment derives from the target tree's classification and present contracts. Tier 1 includes model/statistical source, runtime/server, providers, build/deploy configuration, current app/entry/gates and critical runtime/QB/seam/release contracts. Elevated source/tests/tooling/data contracts are Tier 2; remaining ordinary evidence/docs are Tier 3. The manifest exposes the exact current list. Classification does not imply every retained model module is active production code.

Tier 1 is directly included every audit. Tier 2 has a maximum two-completed-audit interval; Tier 3 has four. Stable baseline/path hashes assign buckets; deterministic bucket ordering starts with the smaller nonempty population. Overdue enforcement overrides rotation regardless of bucket changes or newly introduced files. No size cutoff removes eligible source. Bootstrap includes meaningful ordinary rotation without pretending all never-reviewed files are immediately overdue. A full Tier-3 initial sweep is due by completed audit 4, with the baseline counting as audit 1. Promotion to a higher risk tier selects the file immediately. During ROUTINE closure, current catalog-selected test contracts remain mandatory related evidence; historical/default-excluded/unmapped tests retain Tier-2 changed, rotation and overdue guarantees instead of being forced by broad legacy app references on every audit. BASELINE keeps that broad initial test exposure.

## Complementary themes and packets

Architecture/integration, correctness/tests, FORCE statistical/football-model integrity and adversarial fresh eyes remain mandatory. Direct files are assigned to one primary question; their large corpus is not duplicated four times. All themes see the complete compact local map and can flag missing literal dependencies or ask what might be wrong outside risk-selected areas. Related source may therefore be in another theme; this is an explicit limitation, not an assertion of universal cross-file reasoning. Use bounded escalation when a reviewer needs that source together.

Chunks default to 32 KiB, preserving lines where possible and safely splitting pathological UTF8 lines. Complementary thematic packets default to 896 KiB, leaving 128 KiB below the 1 MiB hard limit. Oversized themes use numbered content subpasses. Additional content-shard calls are those subpasses, not a second duplicated coverage corpus. Preview counts distinguish required theme families, thematic calls, additional content shards and unique total calls. Required map/content that cannot fit stops planning rather than truncating.

Existing exclusions remain narrow and evidenced: binary/nonregular objects, explicit vendor paths, raw provider caches, numeric CSV fixture populations, recorded review outputs, byte-identical generated public mirrors and generated research results with eligible analysis/check truth owners. Unknown readable evidence remains eligible with ambiguity surfaced. Source/secret screens and generated-owner checks are unchanged; source-owner inventory/local coverage does not claim excluded data rows were directly audited.

## Durable history and completion

The tracked [state](deep-review-state.json) contains the cadence and per-file direct-review ledger: tier, last run/date/target/blob, last audit ordinal, passes/themes, selection reasons and changed-since-last-direct-review state. Bootstrap contains null review fields and zero completed audits. Immutable plans pin the exact ledger snapshot and comparison target so later history updates cannot change old packets. On preview, current blob comparison refreshes changed-since-review evidence in the manifest; durable ages are never advanced by preview/status.

Only all required validated, non-truncated results plus explicit `complete --confirm-complete` update ages. Selected files advance together; map-only files retain their previous review dates. Stale concurrent audit snapshots fail completion. Pending/failed/truncated runs and escalations cannot advance ages or reset cadence. Preview reports planned direct count/percentage separately from cumulative **completed** coverage, never-reviewed paths, oldest completed date/audit age, rotation deadline estimate and overdue selected paths.

Cadence remains five explicitly classified substantive main integration events OR seven America/Chicago calendar days since completion, with actual elapsed 24-hour routine suppression. An explicit mandatory trigger bypasses suppression. Ambiguity is visible; housekeeping is not counted. Owner-authorized integration events are not Git commit counts. Existing MODEL_SCORING, UNIT_PLAYER, OPPONENT_PRIORS, DATA_PROVIDER, FORECASTING, PLAYOFFS, VALIDATION_CALIBRATION, HISTORICAL, LUCK_FLAG_DRIVES and RUNTIME_RELEASE_TRUST categories remain unchanged. New events/triggers after a planned snapshot remain pending on completion.

## Cost and one-request safety

Routine targets are 4–8 calls and $5–$8 conservative ceiling. Pass-specific output caps derive from evidence paths/bytes and the eight-field finding schema: 4–12 finding slots at 350 tokens, 512 envelope tokens, 1536 reasoning headroom, and 512 extra statistical/adversarial headroom, rounded to 1024 with a 4096 minimum. Current baseline caps range from 4096 to 7168; an explicit supported override is visible. This allowance has not been validated against paid truncation rates; `max_tokens` remains incomplete. Per-call guard is $5, default owner-run guard $10, supported absolute maximum $200. Target, warning, authorized run guard and absolute maximum are distinct. A $0 preview preserves required coverage even if over budget and explains the warning. Any planned or reserved/pending/retry exposure **over $10** needs explicit `--budget-override --override-reason "Owner explanation"` plus a sufficient `--max-total-usd` before key access. Raising the numerical guard alone does not authorize the override. At $100 or above, extraordinary explicit owner authorization is additionally required; that is a routine planning failure otherwise.

Pricing remains the validated 2026-10-07 config: $4/M input, $20/M output, $5/M 5m cache write, $8/M 1h write, $0.20/M read. Byte-as-token conservative estimates retain buffers, maximum output and full prefix cache-write cost without assumed hits. The original stable reviewer prefix remains first/cacheable; dynamic SHA/map/content is not moved into the cached doctrine. Recheck price assumptions before later prolonged paid use.

Only explicit `pass --send` sends exactly one pinned request. Before key access it verifies immutable reproduction, packet/manifest/tooling pins, clean off-main worktree, local/tracking/direct-remote main, per-call/total/override guards and separate escalation authorization when applicable. DPAPI storage remains outside the repo. Preview/inventory/cadence/status/resume/synthesis/scripts do not load credentials. No scheduler, send-all command, paid synthesis or automatic retry exists.

Exclusive run lock plus durable pre-request intent makes a crash owner-action-required. Failed/interrupted/truncated attempts retain telemetry and reservations; explicit retries need rationale and renewed budgets. Completed passes cannot resend. Unsafe response/key/error prose is withheld. Local synthesis preserves raw findings/provenance and mechanical duplicate/corroboration/conflict groups; it is not paid adjudication or product acceptance.

## Commands and archived plan

```text
node tooling/claude-review/deep-review.mjs status
node tooling/claude-review/deep-review.mjs plan --target EXACT_MAIN_SHA --run RUN_ID
node tooling/claude-review/deep-review.mjs simulate --target EXACT_MAIN_SHA
node tooling/claude-review/deep-review.mjs cost-report --run RUN_ID
node tooling/claude-review/deep-review.mjs run-status --run RUN_ID
node tooling/claude-review/deep-review.mjs resume --run RUN_ID
node tooling/claude-review/deep-review.mjs owner-scripts --run RUN_ID
node tooling/claude-review/deep-review.mjs escalate --parent-run RUN_ID --run ESCALATION_ID --source-pass PASS_ID --finding-id FINDING_ID --path repository/path --concern "Exact reviewer concern"
node tooling/claude-review/deep-review.mjs synthesize --run RUN_ID
node tooling/claude-review/deep-review.mjs complete --run RUN_ID --confirm-complete
```

`initialize-direct-state --target EXACT_BASELINE_SHA` is only for an existing honestly unreviewed baseline missing the ledger; it refuses reinitialization. `initialize`, `evaluate`, `record-integration`, `classify-integration`, `record-trigger` and `clear-trigger` retain existing explicit cadence interfaces. Mutation commands refuse main and never commit or push themselves.

Ignored immutable plans/packets and mutable attempt states live in `research/claude-api-reviews/deep/RUN_ID/`. Replanning uses a new run ID; no overwrite. Owner scripts pin the actual committed tooling HEAD and issue one request each. Scripts for over-$10 previews intentionally cannot run until the owner supplies an explicit override/explanation and larger guard. Escalation scripts additionally need `--authorize-escalation --escalation-reason "Owner authorization"`. No generated command fabricates either approval.

The rejected `FORCE-DEEP-2026-10-08-001` literal plan is retained unchanged for comparison: 60 calls / $119.606864 / all 623 eligible files directly planned. `literal-plan-v1.mjs` exists solely for immutable reconstruction/status; current execution refuses paid sending or completion of superseded plans. Its old scripts are not approved or runnable through current execution. Policy-v2 preview `FORCE-DEEP-2026-10-08-003` is also retained and reconstructible but superseded for paid execution. `risk-plan-v2.mjs` and `selection-v2.mjs` preserve its exact immutable reconstruction only. The new BASELINE preview uses `FORCE-DEEP-2026-10-08-004`; see the [economics evidence](ECONOMICS.md) and [implementation brief](IMPLEMENTATION_BRIEF.md).

Before paid review, obtain a bounded infrastructure review of selection/deadline enforcement, complete map versus actual bytes, completion-only ledger transitions, escalation boundaries, and cost/credential safety. Do not use this tooling task to substitute a FORCE product/model audit.

## BASELINE, ROUTINE and private simulation

BASELINE applies to honestly unreviewed state (`lastCompletedDeepReview == null`, direct ledger completed audits zero); ROUTINE applies after validated completion. The baseline establishes initial direct exposure; routine retains critical/changed/risk evidence and bounded rotation. A $0 five-cycle simulation clones the real baseline ledger and labels all advancement hypothetical. Cycle 3 overlays six synthetic change flags on real committed bytes solely for sizing; it does not create future product code, commits or review history. Simulation plans cannot be saved as executable runs.

The measured routine range is 7–8 calls / $16.808689–$24.454009 under the conservative byte-as-token estimate. The preferred dollar envelope is NOT demonstrated, and the baseline is NOT a one-time explanation for those recurring costs. Required 1/2/4-audit exposure alone averages at least $14.065573 of original input before maps/outputs. BASELINE over $10 is classified `BASELINE PREMIUM — OWNER OVERRIDE REQUIRED`; ROUTINE over $10 is `ROUTINE COST WARNING` with evidence-volume drivers. No coverage is dropped automatically.

The goal is not to have Opus reread the entire repository every week. The goal is to make the entire repository visible to the review system while ensuring high-risk material receives direct review every audit and lower-risk material receives bounded rotating direct review. Complete local mapping, selected actual content, hypothetical simulation and completed paid exposure are separate claims.

Escalation estimates expose parent/source pass/finding, exact concern, requested path, related dependencies/tests, packet bytes, derived output cap and incremental ceiling. They are separately authorized work; no automatic escalation or send occurs and their spend does not silently join a completed parent audit.
