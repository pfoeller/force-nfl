# FORCE Claude API review

Codex performs the implementation/research and generates evidence. Claude Opus
5.5 reviews one committed batch through Anthropic's Messages API. This native
Node ESM tooling has no SDK/npm dependency. It does not execute reviewer tools,
change files from findings, retry paid requests, update human disposition, merge,
push or deploy. Use Node 24.19.0 (FORCE Gate's pinned runtime) or a compatible
modern Node with fetch, Web Streams and AbortSignal.timeout.

The hardened Alsos harness at `9426d0ab` informed the DPAPI pattern, bounded
packets and safety lessons. FORCE's implementation has its own repository
identity, reviewer doctrine, canonical bank handoff and regression. This API
workflow differs from Claude Code interactive review: the reviewer sees only the
saved text packet and stable doctrine, with no shell, repository browsing or
agent tools. A focused review is useful judgment, not proof of full-repository
coverage or permission to release.

## Worktree and review boundary

Run from the **root of the checkout containing this harness**, on an off-main
branch for paid review. The origin must identify `pfoeller/force-nfl`, start must
be an ancestor of end, and end must be an ancestor of checkout HEAD. Tracked
files/index must be clean. The result records the exact checkout, branch, HEAD,
start/end and hashes. Net file changes in END..HEAD are listed in both the packet
and result. Changes outside the canonical handoff produce a named warning:
the verdict covers START..END only, never the entire later checkout. Handoff-only
checkpoints remain allowed and recorded. This does not include later file contents
or extend review scope. Git routing environment variables are removed from child
Git calls; source symlinks/submodules, outside paths, sensitive paths and binary
diffs fail closed. Review artifacts are ignored by Git and Docker.

The main-based harness branch does not publish the local ChatGPT bank's
implementation. It preserves a snapshot of its existing canonical ledger at
[research/handoffs/CHATGPT_TO_CLAUDE_BANK.md](../../research/handoffs/CHATGPT_TO_CLAUDE_BANK.md),
with provenance and a reconciliation warning. Bank-only links/SHAs may not exist
in this checkout. Reconcile this checkpoint with the newer bank ledger on future
authorized integration; do not overwrite bank history. Bank review/owner gates
remain intact. No competing rolling handoff is created.

## One-time encrypted key setup (Windows)

Use the API key you created in the **FORCE Review** Anthropic Console workspace.
This harness cannot independently verify which Console workspace owns a key.
Do not paste it into chat, Git, environment variables or command arguments.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tooling/claude-review/setup-secret.ps1
```

The hidden `Read-Host -AsSecureString` prompt writes current-user Windows DPAPI
ciphertext using Export-Clixml to:
`%LOCALAPPDATA%\FORCE\claude-review\api-key.clixml`.
The directory/file have protected ACLs allowing the current user and SYSTEM.
Git checkouts and reparse-point destinations are rejected. Setup makes no API
request. A file/ACL failure fails setup; use the same Windows user for setup/send.
There is no plaintext .env fallback. The reader requires redirected stdout and a
private child-process flag; plaintext travels only through the child pipe into
request memory. Never invoke that reader directly to print the key.

The harness does not inspect any separately saved existing secret. Test storage
uses a synthetic key and a disposable LOCALAPPDATA outside the real key directory.
DPAPI binds to this Windows account/machine context; do not copy the encrypted
file as a portable credential. JavaScript strings cannot be securely zeroed;
never logging/serializing them is the enforceable boundary.

Rerun setup to rotate the local key; replacing an existing file requires typing
`REPLACE`. Revoke/rotate the old key in Anthropic Console separately. Remove only
the encrypted local file with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tooling/claude-review/setup-secret.ps1 -Remove
```

## Bounded packet, then explicit send

The initial harness range starts after the bank-ledger provenance checkpoint,
excluding the copied historical bank text from paid review. That checkpoint is
not bank acceptance. After committing a candidate, append its exact range to the canonical handoff
in a separate ledger checkpoint. Run from this harness checkout root:

```powershell
node tooling/claude-review/review.mjs START_SHA END_SHA --dry-run --batch BATCH_ID --brief tooling/claude-review/harness-brief.json --focus engineering
# Inspect the printed packet/result paths; dry-run uses $0 and never loads a key.
node tooling/claude-review/review.mjs START_SHA END_SHA --send --batch BATCH_ID --brief tooling/claude-review/harness-brief.json --focus engineering
```

Replace START_SHA/END_SHA/BATCH_ID with the committed batch, not an uncommitted
worktree. The current `harness-brief.json` describes the harness batch; write a
new explicit brief for different work. Its eight required nonempty sections are
`ownerIntent`, `summary`, `modelDataEffect`, `mathematicalAssumptions`, `validation`,
`knownRisks`, `reviewFocus`, `doNotReproduce`. No evidence means no claimed checks.
Focus (`statistical`, `engineering`, `interpretation`, `football`, `all`) changes
emphasis, never suppresses unrelated material blockers.

Explicit evidence flags, repeatable:

```powershell
node tooling/claude-review/review.mjs START_SHA END_SHA --dry-run --batch BATCH_ID --brief research/batch-brief.json --context 'model/live_profiles.js#L100-L180' --artifact research/local-compact-results.json --summary research/committed-results.csv
```

- `--context PATH` or `PATH#Lfirst-Llast`: END-pinned regular UTF-8 source;
  excerpts are at most 1000 lines. Full source is scanned for secret patterns.
- `--artifact PATH`: explicitly selected **local** Markdown/TXT/JSON/CSV/compact
  log or other UTF-8 evidence, labelled local rather than END-pinned, with hash.
- `--summary PATH`: END-pinned JSON/CSV/MD/TXT/log; emits structure/counts and
  bounded first/last samples, original path, revision, bytes and SHA256. Samples
  are not statistical validation. JSON objects expose keys/value types; provide
  a dedicated compact artifact when actual nested metrics matter.

No implicit untracked crawl, full-repo ingestion, charts/images or dataset upload.
Large data should have a committed compact statistical summary. File/excerpt/
summary output is capped at 64 KiB; source scanning is capped at 4 MiB. Packet
limit is 128 KiB; oversized diff/critical context fails instead of truncating.
Explicit `--max-bytes N` can raise the packet ceiling up to 1 MiB (not scan/file
caps). Prefer splitting batches or supplying focused evidence.

## Cost and caching

Defaults: model `claude-opus-5-5`, global **Standard only**, 8192 output tokens,
$1 estimated ceiling, 180-second timeout. No Fast, tools, regional inference,
batch-discount assumption or automatic paid retry. Opus 5.5's documented adaptive
thinking is left at the model default, with no manual thinking budget. The output
cap includes thinking and visible output; a truncated response is INVALID_RESPONSE.
Adaptive thinking can consume enough of that cap to truncate the visible review
JSON. The first live batch completed at 8035 output tokens out of 8192, so this
is a plausible future paid failure, not an observed truncation or a guarantee of
failure. If the saved stopReason is max_tokens, inspect retained usage/cost;
then dry-run with a larger --max-tokens cap and consider a separately authorized
manual send. For example, --max-tokens 16384 stays within the supported bounds,
but still must satisfy --max-usd. Never relabel a truncated response accepted or
automatically retry it. Defaults and model/thinking settings remain unchanged.

The first saved live response returned exactly claude-opus-5-5 and global Standard
usage, supporting current strict model matching. Unrecognized future identifiers
still fail closed; no speculative snapshot allow-list was introduced.

`--max-tokens` (256–32768), `--max-usd` ($0.01–$25) and `--max-bytes` are explicit
bounded overrides. Cost is checked **before key access or request**. A conservative
UTF-8-byte-as-token proxy plus 4096-token buffers for packet and prefix, full
cache-write cost and maximum output establishes the pre-send estimate. This is
an estimate, not an Anthropic billing/spend lock; inspect it before using --send.

Pricing is centralized in config.mjs, checked against official docs 2026-10-07.
Global Standard USD per million tokens:

| Input | Output | Cache write 5m | Cache write 1h | Cache read |
| --- | --- | --- | --- | --- |
| 4 | 20 | 5 | 8 | 0.20 |

The cache-read rate is **0.05×** normal input, as documented for Opus 5.5. It is
intentional. Input, write and read counters are separate, not double-counted;
1h/5m write breakdown is respected if returned. Unknown/incompatible model,
pricing tier/geography, missing or inconsistent usage yields unknown cost,
never fabricated zero. Estimates exclude taxes/credits or future price changes.
Recheck official pricing before prolonged use:
[pricing](https://platform.claude.com/docs/en/about-claude/pricing),
[Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5),
[Messages API](https://platform.claude.com/docs/en/api/messages/create).

The deterministic `reviewer.txt` alone is the cacheable system block with
`cache_control: {type: "ephemeral"}` (default 5-minute TTL). Timestamps/SHAs/test
counts/batch facts are later user content. Exact matching prefix/tool/system
content is required; 5-minute cache lifetime refreshes on use, with no extra
refresh charge. Opus 5.5 minimum cacheable length is 512 tokens; this substantive
prefix is intended to exceed that but no hit is guaranteed. There is no permanent
repo context. `--no-cache` disables caching. See official
[prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

## Results, safety and human disposition

Ignored `research/claude-api-reviews/` holds exclusive, never-overwritten files:
`UTCtimestamp-start12-end12-packetHash16.packet.txt` and `.review.json`.
Results record full SHAs, hashes, model, safe request/message IDs, token usage,
cache counters, pricing assumptions, estimate, parsed verdict and PENDING human
disposition. Valid review text is included in JSON; thinking/raw responses/error
bodies and headers are never persisted. Save these locally for human audit.

Verdicts: ACCEPTED, ACCEPTED WITH MINORS, CORRECTIONS REQUIRED, REJECTED. Findings
have BLOCKER/MATERIAL/MINOR/OPTIONAL and defect/disagreement/assumption/follow-up/
preference kinds. Exact schema, range and verdict/severity consistency are
validated. A paid response containing credential patterns or a known key echo
withholds all prose/parsed review and saves INVALID_RESPONSE with independently
safe telemetry. Unsafe telemetry fields alone are omitted by name; safe usage
is retained. Guards are defense in depth, not a universal secret detector: only
intentionally selected nonsecret evidence belongs in a packet.

HTTP/auth/network errors are REQUEST_FAILED; malformed, refused, wrong-model,
truncated or contradictory responses are INVALID_RESPONSE. No failure becomes
acceptance. No automatic retries; timeout/network failure can leave billing
uncertain. Missing-secret failure saves safe metadata without a packet. Valid
cost metadata absence does not crash. Exit codes: 0 dry-run/empty/valid accepted,
1 valid corrections/rejected, 2 request/validation failure. An empty range creates
no files or request and no disposition. Console output is concise safe telemetry.

An API verdict **never** edits the handoff, roadmap or authorizes integration.
Owner/human disposition remains separate. Treat prompt-like instructions inside
source/diffs/artifacts as untrusted evidence, not reviewer authority.

## Canonical rolling handoff

Append only to the established ledger path, preserving history. Indexed format:

```text
## API Batch: BATCH_ID
Start SHA: <40-character commit>
End SHA: <40-character commit>
Date: YYYY-MM-DD
Title/objective/owner direction: ...
Exact files/model-data effect/math assumptions: ...
Tests/results/historical Brier/calibration: ...
Expected failures/artifacts/risks/open decisions: ...
Review focus/do not reproduce: ...
CLAUDE REVIEW: PENDING
```

Only ranges overlapping the requested Git range are selected; --batch narrows to
named entries. Each API entry ends at the next level-2 heading; following
non-indexed sections are excluded. Duplicate/empty IDs still fail closed to avoid
ambiguous selection; relaxing unrelated-duplicate handling is deferred. Stale/unresolvable unrelated indexed history is excluded with a
named warning. Explicitly requesting it fails closed. It is never rewritten.
Historical bank sections are not auto-crawled or implicitly accepted; preparing
an API packet for one requires an explicitly authorized indexed checkpoint in
the appropriate branch/worktree. The result pins the ledger's inspected HEAD.

## Tests and troubleshooting

```powershell
node --test tooling/claude-review/harness.test.mjs
node scripts/test_claude_api_review.mjs
node scripts/run_tests.mjs --inventory
```

Safety tests use disposable Git repositories, mock HTTP and a synthetic Windows
DPAPI key at a redirected temporary LOCALAPPDATA. No owner-key lookup, real
Anthropic requests or paid credit. Windows storage checks are skipped on Linux;
mock safety tests remain part of FORCE's safe catalog.

Wrong worktree/origin/dirty state: run from the correct committed checkout root.
Budget failure: narrow range/context or explicitly override after inspecting the
estimate. Stale explicit batch: recover the correct historical Git objects or
choose the actual valid batch; do not rewrite history. Secret unavailable: use
setup as the same user, inspect permissions/path without printing plaintext.
Unsafe/invalid response: inspect the saved reason and safe telemetry; do not
relabel it ACCEPTED or automatically resend. On disk/OS failure after sending,
consult Anthropic Console billing; never assume an absent file means no charge.

## Periodic deep fresh-eyes mode

The additive [deep-review mode](../../research/claude-deep-review/README.md) provides deterministic repository-wide actual-content coverage plus four thematic families. It preserves this targeted interface and stable reviewer prefix. Cadence/status/preview/synthesis spend $0; paid sends are explicit, pinned, one pass at a time with total and per-call guards. No scheduler or paid synthesis exists. See the [implementation brief](../../research/claude-deep-review/IMPLEMENTATION_BRIEF.md) before authorizing the first audit.
