# FORCE periodic deep fresh-eyes review

This tooling adds repository-wide **actual-content exposure**, alongside deterministic FORCE checks and bounded targeted Opus reviews. Rare interactive investigation is a later, separately authorized option when findings need direct debugging. Exposure mitigates targeted review’s blind spots; it does not prove correctness or guarantee every defect is discovered. An API verdict never authorizes a product decision, integration, release or model change.

Use targeted mode for important bounded changes. Use deep mode for the cadence below and explicitly recorded major-risk events. The existing targeted CLI, packet limits, reviewer prefix, credential storage and outcome semantics remain unchanged. Deep transport adds a stable schema/doctrine block after the existing cacheable `reviewer.txt`; the default targeted parser and request remain identical.

## No-spend interface

Run from the committed off-main deep-tooling worktree with FORCE’s pinned Node **24.19.0**. No npm SDK, new dependency, scheduler, send-all or retry loop exists.

```powershell
node tooling/claude-review/deep-review.mjs status
node tooling/claude-review/deep-review.mjs evaluate
node tooling/claude-review/deep-review.mjs record-integration --event research/claude-api-reviews/integration.json
node tooling/claude-review/deep-review.mjs classify-integration --id EVENT_ID --classification SUBSTANTIVE --rationale "Owner classification"
node tooling/claude-review/deep-review.mjs record-trigger --id TRIGGER_ID --category HISTORICAL --rationale "Owner classified major pipeline change"
node tooling/claude-review/deep-review.mjs clear-trigger --id TRIGGER_ID --rationale "Explicit disposition"
node tooling/claude-review/deep-review.mjs plan --target EXACT_MAIN_SHA --run RUN_ID --max-usd 5 --max-total-usd 200 --max-tokens 8192
node tooling/claude-review/deep-review.mjs run-status --run RUN_ID
node tooling/claude-review/deep-review.mjs resume --run RUN_ID
node tooling/claude-review/deep-review.mjs pass --run RUN_ID --pass coverage-001 --dry-run
node tooling/claude-review/deep-review.mjs synthesize --run RUN_ID
node tooling/claude-review/deep-review.mjs owner-scripts --run RUN_ID
```

`initialize --target EXACT_MAIN_SHA` creates a baseline only when no state exists. This branch already has an honest initialized baseline, with no completed audit. `status` is read-only; `evaluate` records its evaluation. Other cadence commands explicitly update the lightweight tracked [state](deep-review-state.json), never main or ignored artifact cadence truth. State updates still require the normal review/integration workflow; these commands do not commit or push. Duplicate IDs, invalid classifications/timestamps, unknown triggers and broken owner-recorded main integration chains fail closed.

Integration JSON has `id`, UTC `time`, `main`, `previousMain`, `title`, `classification`, `rationale`, `tags`. It records one **owner-authorized production integration event**, even when several commits are fast-forwarded together. `SUBSTANTIVE` means materially changed application/model/data/provider behavior, behavioral test/release contracts, runtime/deploy architecture, substantial product capability, or significant methodology infrastructure. Docs-only housekeeping normally uses `HOUSEKEEPING`. `AMBIGUOUS` requires an owner rationale and later classification; it is neither silently counted nor silently excluded. `tags` contains explicitly confirmed mandatory category names, never path-derived guesses.

## Cadence and mandatory triggers

Routine audit is due at **5 confirmed substantive integrations OR 7 calendar-date changes in America/Chicago** since completion. Calendar cadence uses local dates, including DST; it is not a 168-hour timer. The routine suppression window is actual elapsed **24 hours**. Routine completion is also refused within 24 hours of the previous completion. An explicit mandatory audit is exempt and reports `MANDATORY DEEP REVIEW DUE — LAST AUDIT <24H` when applicable. Due status spends nothing.

Ambiguity affecting the five-event threshold yields `CADENCE AMBIGUOUS — OWNER CLASSIFICATION REQUIRED`, unless another rule already establishes due status. All ambiguous IDs remain visible, including during suppression. Bootstrap reports `INITIAL BASELINE — NO COMPLETED DEEP REVIEW RECORDED` without inventing an audit.

Explicit mandatory categories (major changes only, not tiny edits to a matching path):

| Category | Covered major changes |
| --- | --- |
| MODEL_SCORING | FORCE scoring, normalization/raw-display architecture, team/unit bridges, cross-unit weights |
| UNIT_PLAYER | Unit/player aggregation, QB methodology, QB/OL/pressure interaction |
| OPPONENT_PRIORS | Opponent adjustment, SOS, priors, continuity, recency |
| DATA_PROVIDER | Provider introduction/replacement/precedence/fallback, identity/team mapping |
| FORECASTING | FORCEcast, Monte Carlo, score/spread/total distributions, representative scores |
| PLAYOFFS | Simulation, probability, seeding and tiebreaks |
| VALIDATION_CALIBRATION | Calibration, Brier and backtest methodology |
| HISTORICAL | Historical data/replay/reference/normalization and temporal boundaries |
| LUCK_FLAG_DRIVES | Substantial Luck/FLAG/penalty/drive/scoring-prevention semantics |
| RUNTIME_RELEASE_TRUST | Worker/container/server/deployment/security/trust boundaries, major release/launch |

No silent heuristic activation is implemented. Record and classify events explicitly.

## Eligibility and coverage

Inventory comes from the exact target commit’s Git tree/blob objects, not the tooling HEAD or checkout. Every tracked path receives exactly one INCLUDED/EXCLUDED disposition, object identity, SHA256, bytes, encoding, class, reason, source-owner links, ambiguity, content ranges and separate thematic membership. Unknown/evidence text is **included and surfaced**, not discarded. Credentials detected in otherwise eligible text stop planning instead of silently removing a file. No key is loaded for this scan; it is a defensive pattern screen, not a universal secret detector.

Readable source, model/statistical code, methodology, tests, configuration, docs, governance, SVG markup, embedded production data contracts and JSON test fixtures default to actual-content inclusion. No extension allowlist or size exclusion suppresses unknown text. Numeric CSV fixture populations are explicit data exclusions. Raw provider cache payloads/metadata are excluded; their ingestion/source and contracts remain reviewed. Generated research result CSV/JSON is excluded only with an included analysis/check truth owner in the same package. Benchmark and research input/provenance text remains included when policy is ambiguous.

Other narrow reason codes: `BINARY_MEDIA` (NUL/non-UTF8), `NONREGULAR_OBJECT` (Git symlink/gitlink, not followed), `EXACT_PUBLIC_MIRROR` (byte-identical source plus included public builder), `VENDORED_THIRD_PARTY` (explicit vendor/node_modules directories), `REVIEW_OUTPUT` (the recorded API output directory only). Public text that is not byte-identical is included. Every exclusion remains visible with bytes/hash/reason; excluding a data population does not claim that its individual records were audited. An excluded generator or mirror truth owner makes planning fail.

UTF8/BOM/CRLF Git bytes are preserved. Default chunks are at most **32 KiB**, preferably ending at a newline. A pathological line splits at UTF8 code-point boundaries. Each chunk records zero-based half-open byte range, line range, sequence, blob/file/chunk hash and target SHA. Empty files have an explicit zero-byte range. The checker reconstructs every included file byte-for-byte, checks inventory/dispositions/reasons and rejects gaps, altered content, overlap or missing shard membership.

Coverage shards are lexically ordered, deterministic and bounded at **384 KiB**. They ask for independent review of actual supplied regions; they do not pretend a shard has whole-repo context. Themes are separately bounded at **512 KiB**, retaining a 1 MiB hard ceiling. Oversized themes become numbered subpasses, each carrying the full compact target inventory, coverage summary, source-backed import/script declarations and actual selected content. A full inventory that cannot fit stops planning explicitly; it never truncates eligible content.

Four deterministic theme families:

- Architecture/integration: model, frontend, server, provider, deploy/config, data contracts and test infrastructure, plus explicit architecture/governance docs.
- Correctness/tests: all tests/infrastructure, server/provider/config, and current app/live-model/policy anchors.
- Statistical/football integrity: model and research source, provider/data contracts, app, named statistical tests and methodology docs. Instructions challenge current FORCE-specific causal/calibration/football semantics, rather than inventing a model or assuming deferred roadmap ideas are active.
- Adversarial fresh eyes: cross-language model/runtime/provider/build/data, app/entry/docs/governance plus a deterministic SHA256-selected one-in-seven test sample. It receives source, not previous findings.

Every file selected for a theme is fully included across that theme’s subpasses. Thematic duplication supplements, never replaces, baseline coverage. Static declaration context is a navigation aid, not an implementer’s product audit.

## Run, cost and credential safety

Ignored run artifacts live in `research/claude-api-reviews/deep/RUN_ID/`: immutable plan/manifest/packets, separate mutable run-state, exclusive attempt result files, scripts and local synthesis. Plan status begins PENDING; creating a preview never records completion. Plan reconstruction verifies Git content, manifest, packets, reviewer/deep doctrine hashes and immutable options before use. Symlink/junction redirection, traversal, result tampering and orphaned results fail closed.

`pass` without `--send` is $0, even with injected transport. Paid `pass --send` requires exactly one pass ID and exact tooling HEAD/target/manifest/packet pins. Immediately before credential access, guards check per-call ceiling, whole planned ceiling and conservative reserved attempts + pending/retry ceiling against `--max-total-usd`; verify a clean off-main tooling checkout and local/tracking/direct-remote main target. Changed main invalidates the pinned owner command. The owner can lower budgets; guards stop before key access. Replanning is explicit and never overwrites a run.

Price assumptions reuse the validated config as of **2026-10-07**: input $4, output $20, 5m cache write $5, 1h write $8, read $0.20 per million tokens. Byte-as-token estimates include buffers, maximum output and full prefix cache-write cost, with **no assumed cache hit**. Defaults: 8192 output tokens, $5 per-call guard, $200 total guard. These are inspectable planning limits, not an Anthropic billing lock; recheck pricing before prolonged paid use. Retries consume an additional worst-case reservation and may need a larger explicit owner budget. Known/unknown usage is reported honestly, not fabricated as zero.

The original `reviewer.txt` is unchanged, first, and cacheable with ephemeral 5-minute TTL. The stable additive deep block changes only the deep response schema and review scope. SHA/date/pass/content follows in user content. Later sequential calls may obtain prefix cache hits while valid; no hit or permanent repository cache is guaranteed.

DPAPI secret loader/setup remain outside repository storage. Default, preview, inventory, cadence, status, synthesis and script generation never call the loader. API keys, raw HTTP error bodies, unsafe response prose and thinking are never persisted. Tests use synthetic injected credentials/transports; targeted DPAPI tests redirect to disposable storage, never the owner key.

## Resume, truncation and completion

The exclusive run lock and atomically persisted request intent precede the request. A crash leaves `OWNER_ACTION_REQUIRED`; a missing result is never assumed unbilled. Inspect stale locks and billing before any explicit retry; there is no automatic stale-lock removal. Request/network failure is REQUEST_FAILED. Bad schema/model/verdict is INVALID_RESPONSE. `max_tokens` is dedicated TRUNCATED_RESPONSE with safe usage/cost telemetry; incomplete prose is withheld as in targeted mode. No failure becomes acceptance.

Sending a COMPLETED pass is refused. `resume` is only status: it lists pending and owner-action-required passes without requests. Retrying a failed/truncated/interrupted pass requires `--retry --retry-reason "Owner rationale"`, preserves the prior attempt/result, and rechecks budgets. No automatic paid retry or synthesis exists.

A complete audit requires **every coverage and thematic subpass** to have a validated non-truncated result, then explicit `complete --run RUN_ID --confirm-complete`. Findings may still require corrections: completion means exposure/results, not product acceptance. Failed, dry, pending or truncated work cannot reset cadence. Integrations/triggers recorded after the reviewed snapshot was planned remain active rather than being consumed by a slow audit.

Local synthesis creates exclusive Markdown/JSON aggregates, retains all raw findings and pass/finding/packet/result provenance, and indexes severity/subsystem/theme/affected paths. Exact path/location groups are heuristic: identical evidence is a likely duplicate; differing evidence across passes is possible independent corroboration requiring human review. Severity/nature conflicts are flagged. This is mechanical grouping, not a paid final judgment. Incomplete reports explicitly list missing passes and cannot imply completed review.

## Infrastructure review before paid audit

See [implementation brief](IMPLEMENTATION_BRIEF.md). Recommend a bounded targeted Opus infrastructure review of this branch diff, especially coverage/eligibility, temporal cadence, total-before-key safety, durable request intent, single-pass boundaries, theme context and truncation/completion logic **before** the first paid deep audit. Do not ask it to reproduce full production tests, deep historical research, a whole-repo product audit or paid calls. Neither review nor the generated owner scripts are executed by this build task.