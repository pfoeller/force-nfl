# Deep-review implementation handoff

Purpose: implement periodic actual-content Opus exposure, not perform FORCE’s product/model audit. New branch: `codex/claude-api-deep-review-harness`, exact validated targeted base `24bb3b0738f4177b1289becccec9450e7d11c7d9`. Production target: `39bc08e41fe3c1c8d57de385faa568733c52efc2`. Bank and targeted branch remain separate and unchanged.

## Architecture and narrow review scope

Review the base-to-this-branch diff in:

- `tooling/claude-review/client.mjs`: three additive transport hooks (stable suffix, suffix cost, injected deep parser); targeted defaults and reviewer.txt unchanged.
- `tooling/claude-review/deep-review.mjs`: explicit CLI; no default/send-all spending.
- `tooling/claude-review/deep/{util,inventory,plan,doctrine,cadence,run,synthesis}.mjs`: deterministic Git inventory/policy/byte coverage/themes, extended nature schema, calendar cadence, durable request intent, budget-before-key, resume, result validation and local synthesis.
- `tooling/claude-review/deep/deep.test.mjs` and `scripts/test_claude_deep_review.mjs`: injected synthetic-key/API safety tests and disposable Git repos.
- `scripts/test_catalog.json`: one additional safe regression; no existing suite/exclusion changes.
- `research/claude-deep-review/{README.md,deep-review-state.json}` and harness README: bootstrap truth and operating contract.

Recommended targeted Opus questions: Can eligible bytes vanish? Are exclusions sufficiently narrow and evidenced? Are themes actual-content/cross-cutting rather than summaries? Can a routine audit bypass date/24h semantics? Can a trigger or ambiguity silently disappear? Can an interrupted/completed/truncated result be repaid or reset cadence? Can an unapproved total budget reach the key loader? Can hash/path/state handling be defeated? Do additive client hooks preserve targeted mode? Is synthesis explicit about missing passes, duplicate/corroborating evidence and conflicts?

Do not reproduce production/model research, full FORCE suites, deep historical datasets or a whole-repository product audit. Do not read credentials, execute paid scripts or infer integration authority. This targeted infrastructure review should happen **before the first paid deep audit**; it has not been sent by this task.

## Mechanisms

Git-object policy includes readable source/config/tests/docs/methodology by default; unknown evidence remains included with visible ambiguity. Exclusions use named codes, not file size. Source-backed generated mirror/result exclusions require included truth owners; JSON test fixtures are reviewed. Binary, raw provider caches and numeric CSV fixture populations remain explicit scoped exclusions.

32 KiB lossless UTF8 chunks prefer lines and preserve BOM/CRLF. Greedy lexical content groups are bounded at 384 KiB; theme groups at 512 KiB; 1 MiB hard ceiling remains. Coverage proof reconstructs each eligible file’s original bytes and verifies ranges/shards. Each of four theme families carries the full compact inventory and deterministic source-backed context, with full selected files distributed across bounded subpasses.

Cadence counts five owner-authorized SUBSTANTIVE integrations, not commits, or seven America/Chicago calendar dates. Routine completion/scheduling is suppressed inside elapsed 24h; explicit mandatory reviews are exempt. Ambiguous threshold decisions are surfaced. Bootstrap has no historical completion. Triggers require explicit classification across model, unit/QB, priors/SOS, providers, forecasts, playoffs, calibration, historical, Luck/FLAG/drives and runtime/release/trust.

Ignored immutable plans/packets and separate mutable run-state are pinned to target/manifest/packet/doctrine/tooling. Only an explicit one-pass `--send` can load the outside-repo DPAPI secret. Whole planned and reserved/pending/retry cost guards precede key access. Clean off-main tooling HEAD and local/tracking/direct-remote main are verified before request. Lock plus atomic pre-request intent makes crashes owner-action-required; results remain exclusive. Completed passes cannot resend. Failed/truncated retries require explicit rationale, preserve attempts and consume another conservative reservation. `max_tokens` is dedicated TRUNCATED_RESPONSE. No paid synthesis, scheduler or automatic retry exists.

Local synthesis retains raw finding IDs/provenance and produces mechanical duplicate/corroboration/conflict groups plus severity/subsystem/theme/path indexes. Missing results remain explicit. Cadence completion requires all required valid non-truncated artifacts and an explicit confirmation, and does not imply findings were resolved. Events after the reviewed snapshot remain pending.

## Validation and first preview checkpoint

Pinned validation runtime: Node 24.19.0. Existing targeted regression, new mocked deep suite, FORCE runtime/public-refresh regressions, inventory/catalog validation, syntax and whitespace checks are run independently. No production build outputs are rewritten. Exact test totals are in the final task report; mock requests are not Anthropic calls.

Run ID: `FORCE-DEEP-2026-10-08-001`. Manifest SHA256: `3f073095a328454bb88a35c9ea80a678a9532c4d57ff8eed1747d51c24edc258`.

- Tracked target files: **766**; included **623**; excluded **143**.
- Included bytes **8,781,722**; excluded bytes **23,195,834**; uncovered eligible files **0**.
- Exclusions: binary 12; exact public mirrors 27; numeric CSV fixture populations 2; generated research evidence 58; raw provider caches 44.
- Calls planned: **27 coverage + 33 thematic = 60**; themes architecture 7, correctness 8, statistical/football 11, adversarial 7.
- Default output cap 8192 tokens; $5 per-call guard; total conservative ceiling **$119.606864**, total guard **$200**.
- Price assumptions frozen as of 2026-10-07; full prefix cache-write, no guaranteed cache hit. No paid synthesis.
- Complete ignored plan, manifest, actual packets and exact pinned one-pass owner scripts are generated after the implementation commit at `research/claude-api-reviews/deep/FORCE-DEEP-2026-10-08-001/`. They pin the actual committed tooling HEAD, not a future placeholder. Status/resume/synthesis/completion scripts accompany them.

This is a $0 preview, not a completed audit or authorization to spend. Cadence remains **DEEP REVIEW DUE — INITIAL BASELINE — NO COMPLETED DEEP REVIEW RECORDED**. The key is not read, paid scripts are not run, and no PR/merge/deploy is performed.
Verified checkpoint: targeted harness **43/43**; deep suite **105 passed, 1 Unix-only skipped, 0 failed (106 total)**; catalog **261→262**, safe **149→150**, exclusions **112 unchanged**; runtime **15**, public-refresh UI/Worker **80**, backend **102** checks. Both wrappers and the three regressions also passed **5/5** through the isolated network-disabled catalog runner with worktree hashes unchanged. Harness syntax, local doc links and whitespace checks passed.
