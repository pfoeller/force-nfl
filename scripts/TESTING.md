# FORCE test execution

Run package commands from the repository root. Direct historical commands such
as `node scripts/test_v12_ui.js` also work. Current ESM commands use `.mjs`, for
example `node scripts/test_v149_release_hardening.mjs`.

## Module convention

- The production root package remains ESM.
- `scripts/package.json` scopes historical `.js` tests as CommonJS.
- ESM test entrypoints use `.mjs`; the 14 existing ESM bodies were only renamed.
- `scripts/lib/package.json` keeps the shared `.js` helpers ESM. Explicit `.cjs`
  helpers may be required by CommonJS tests.
- Python entrypoints are unaffected. The runner uses `-B`, UTF-8 and
  `PYTHONDONTWRITEBYTECODE=1`, also inherited by test subprocesses.

## Commands

| Command | Audited selection |
| --- | --- |
| `npm test` / `npm run test:safe` | 141 tests: 109 JavaScript and 32 Python |
| `npm run test:release` | 17 release/correctness tests |
| `npm run test:qb` | 26 QB/pressure regressions |
| `npm run test:snapshot` | 6 snapshot/bootstrap/current-identity tests |
| `npm run test:server` | 30 server and PBP/calibration fixtures |
| `npm run test:model` | 46 model/unit regressions |
| `npm run test:list` | Every test, suite membership, exclusions and special requirements |
| `npm run test:inventory` | Machine-readable catalog and baseline inventory |

Cycle 3 integration verification (2026-10-02, `cycle3/integration`, reviewed
`6f03f4e` + `97ed745` and `2f2346e` + `c09fddc`): the combined catalog
has 253 entries, 141 safe (109 JavaScript / 32 Python) and 112 unchanged default
exclusions. Authoritative LF export passed safe 141/141, model 46/46, release
17/17, QB 26/26, snapshot 6/6 and server 30/30. Native results matched except
safe 140/141, with only the known V77 CRLF timing-source assertion failing.
The five focused UX-25/UX-14-B/UX-10/UX-14-A/FLAG regressions and modified
V36/V38/V39/V112/V124 tests passed 10/10 in both native and LF trees. All 11
changed JS/MJS paths, public-build Python syntax and staged/unstaged diff checks
passed; the canonical build reproduced all 33 source-identical generated files.
Default and tracked-schedule UX-25 CLI outputs were byte-identical on repeat
runs. The tracked 2026 REG calendar has 272 games (48 completed, 224 remaining),
including 31 January 2027 games in Weeks 17/18; structural counts pass, every
actual-state outcome stays unknown, and source authority stays unverified.
Offline real-renderer smoke at 1440×900 and 375×812 covered the ten Claude-touched
surfaces and controlled pressure/event-count/current-evidence states: unchanged
from corrected Claude, no new page overflow or console errors. The existing
header refresh-meta overflow remains deferred. Integration reconciles evidence
and history only; it does not authorize main merge, deployment, owner decisions
or another tranche.

Cycle 3 local-main closeout (2026-10-02): owner-reported final independent
review accepted `840e53b1` with A. READY TO MERGE TO MAIN. Local `main` was
fast-forwarded from exact `093bd734` to that candidate, preserving both reviewed
lane histories and correction commits. `origin/main` remains at `093bd734`;
this closeout authorizes no push or deployment.
Post-merge inventory/catalog validation confirmed 253 entries, 141 safe
(109 JavaScript / 32 Python) and 112 default exclusions. Authoritative LF export
passed safe 141/141, model 46/46, release 17/17, QB 26/26, snapshot 6/6 and
server 30/30. Native results matched except safe 140/141: only the known V77
CRLF timing-source assertion failed. All ten focused/modified regressions passed
in both trees; all 11 changed JS/MJS paths, public-build Python syntax and diff
checks passed. Canonical public build reproduced all 33 generated files unchanged.
The single post-merge tracked-schedule probe passed structural counts, including
31 January 2027 games in Weeks 17/18; every actual state remains unknown and
source authority unverified. Offline real-renderer smoke of the seven touched
surfaces at 1440×900 and 375×812 matched the reviewed candidate, with no new page
overflow or browser errors; fallback, missing-count, representative-Out and blend
semantics passed. The known refresh-meta/header overflow remains deferred.

Integration verification (2026-10-01, `integration/roadmap-lanes`): `npm test`
passed 136/136, QB 26/26, model 44/44 and release 16/16 in LF scratch. Both new
focused regressions passed individually. The normal public build left all 33
generated files unchanged. Use LF scratch for the known Windows CRLF-sensitive
`test_v77_game_flow_blend.js` timing-source assertion; no production rewrite is
needed for that line-ending issue.

Pure Cycle 2 integration verification (2026-10-02, `cycle2/integration @ ce8fba6`): catalog
validation found 250 entries, 138 safe (106 JavaScript / 32 Python) and 112
default exclusions. Authoritative LF scratch passed safe 138/138, model 45/45,
release 16/16, QB 26/26, snapshot 6/6 and server 30/30; both focused regressions
passed separately. Native results matched except safe 137/138: only the known
V77 CRLF timing-source assertion failed. Changed JS/MJS syntax, public-build
Python syntax and diff checks passed. Two full synthetic diagnostic outputs were
byte-identical. Canonical public build reproduced all 33 generated files unchanged.
Desktop 1440×900 and mobile 375×812 smoke comparisons against reviewed Claude
`1ac894c` found no integration differences across the touched surfaces/status
states; the pre-existing 397px stale-header mobile overflow remains deferred.
This is review evidence, not merge-to-main, follow-on-work or deployment authority.

The initial integration was withheld on the required missing-input semantic gate:
the full-schedule synthetic fixture's BUF FLAG panel had `pen.live === true`,
`pen.unavailable === true` and null penalty EPA/WPA inputs, yet rendered
`0.00 expected points/game | 0.0 win-chance points/game`. Reproduced through
`projectionAuditHarness(projectionSemanticsFixture({fullSchedule:true}))`, setting
`S.ratingView = 'penalties'` and calling `teamPage('BUF')`, on both exact shared
base `e7f0895` and the pure integration tree. The unguarded `signed()` call coerced
null to zero, and this secondary FLAG card guarded `pen.live` alone. Original
automated suites passed but did not certify this broader invariant. The owner
then explicitly authorized recording pure integration commit `ce8fba6`, followed
by a separate bounded FLAG EPA/WPA presentation correction.

Bounded FLAG correction verification (2026-10-02): catalog 251, safe 139
(107 JavaScript / 32 Python), with 112 default exclusions. Authoritative LF
scratch passed safe 139/139, model 45/45, release 17/17, QB 26/26, snapshot 6/6
and server 30/30, plus separate FLAG, projection-semantics and UX-14 focused
regressions. Native results matched except safe 138/139: only the known V77 CRLF
timing-source assertion failed. The new FLAG regression detects the original
defect at pure integration `ce8fba6`; 18 paired/mixed-value cases cover both
renderers and unchanged current ratings. All nine changed integration/correction
JS/MJS files passed syntax checks; public-build Python syntax and diff checks
passed. Two full synthetic diagnostic outputs were byte-identical. Canonical
public generation changed only the app mirror; all 33 generated files match
their sources. Desktop/mobile FLAG smoke passed 12 cases with no page overflow
or browser errors. This verification does not authorize main merge, deployment,
unrelated defect corrections or another roadmap tranche.

Cycle 2 local-main closeout (2026-10-02): owner-reported final independent review
accepted candidate `e264db7` with A. READY TO MERGE TO MAIN. Local `main` was
fast-forwarded from exact `e7f0895` to that candidate, preserving both reviewed
lane histories and the separate FLAG correction. `origin/main` remains at
`e7f0895`; no push or deployment was authorized/performed.
Post-merge inventory/catalog validation confirmed 251 entries, 139 safe and 112
default exclusions. Authoritative LF export passed safe 139/139, model 45/45,
release 17/17, QB 26/26, snapshot 6/6 and server 30/30. Projection-semantics,
UX-14 and FLAG focused regressions each passed separately in both native main
and the LF export. Canonical public build left all 33 generated files unchanged
and matching their sources; diff checks passed. The LF export was removed and
validation left the main worktree unchanged.

Selections overlap. Requirements are Node.js, Git and Python 3.10+; the safe
suite uses standard-library Python only. Set `FORCE_TEST_PYTHON` to an executable
path if Python is not on PATH. `PYTHON` is also supported. On Windows the runner
can use the existing bundled Codex Python runtime when present. It installs
nothing.

```powershell
$env:FORCE_TEST_PYTHON = 'C:\path\to\python.exe'
npm run test:release
```

Each runner invocation copies tracked and non-ignored untracked files to a new
OS temporary directory, preserving relative paths and `__dirname`. It runs
children with that directory as cwd, then removes only its own temporary copy.
The original worktree's Git status and file hashes must match before/after.
This works with uncommitted changes; no stash/reset/restore is performed.

Node and Python test-child guards deny external network access and public
listeners. In-process fetch stubs and ephemeral loopback HTTP fixtures remain
available. These guards support the audited tests; they are not a security
sandbox for arbitrary untrusted code. Services/configuration/deployment commands
are never part of the runner.

A failed test, timeout, incomplete catalog, missing runtime, or changed real
worktree returns nonzero. Normal tests have a 20-second per-process limit; the
catalog records explicit exceptions. The runner continues through test failures
to report the complete selected result.

## Excluded and special tests

The catalog has 253 entries including the runner, QB correctness, Customize audit,
FLAG penalty-value, postseason state sourcing, projection semantics audit, semantic
migration, UX-14 public-explanation, UX-14 tranche B and UX-16 public-positioning
regressions. Its 112 default
exclusions remain visible in `test_catalog.json`;
exclusion does not mean pass.
102 retain failing historical assertions/fixtures. The remaining 10 are:

- Four benchmark writers: `test_v27_metric_transform_smoke.js`,
  `test_v28_metric_transform_smoke.js`, `test_v29_defense_components.js`, and
  `test_v29_week1_replay.js`. Three overwrite tracked benchmark reports; the last
  creates a benchmark artifact.
- `test_v77_game_flow_proxy.py`, which writes canonical live-cache files.
- Three optional Pillow image tests: V54, V55 and V56.
- `test_v116_game_flow_valid_scores.js`, an exhaustive allocation sweep with a
  120-second opt-in limit.
- `test_v10_ui.js`, whose legacy UI/timer harness exceeded the audit deadline.

Use explicit opt-in to run these in isolation:

```text
node scripts/run_tests.mjs --test test_v27_metric_transform_smoke.js --allow-special
node scripts/run_tests.mjs --test test_v77_game_flow_proxy.py --allow-special
node scripts/run_tests.mjs --suite all --allow-special
```

The last command is an audit of historical debt and is expected to report
failures. A single ordinary historical test can be selected without enabling
special cases. Direct execution of artifact writers bypasses runner isolation.

## Version assertions and catalog maintenance

Frozen model/module identities remain unchanged, including the V34 regime and
historical Week-2 checks. Four current identity/layout tests (V138, V141, V146,
V147) now read the server identity through `lib/current_version.cjs`; all their
behavior/layout assertions remain. Older version, authorization, scoring and UI
fixture assertions are cataloged separately and were not broadly rewritten.
The two CommonJS browser-scale tests load the browser script through a VM rather
than depending on CommonJS-to-production-ESM `require` support.

When adding a test, classify it explicitly in `test_catalog.json`. The runner
rejects unknown, missing or duplicate entries. Review network, output writes,
optional dependencies and cost before adding it to `safe`. Never select tests
dynamically just because they happened to pass, and never change production
behavior to satisfy an archived assertion.

Cycle 2 UX-10 adds `test_projection_semantics_audit.mjs` to safe/model. It calls
the real forecasts, 5,000-run season simulation and projection renderers offline;
the catalog allows 60 seconds for that bounded workload. Reproduce the labeled
synthetic evidence with `node scripts/audit_projection_semantics.mjs`, or use
`--input offline-input.json` for supplied inputs with unverified provenance.
The [semantic map](../UX10_PROJECTION_SEMANTICS_AUDIT.md) records source paths,
limitations and unresolved owner choices. The diagnostic does not change public
probability formatting or infer actual clinch/elimination from simulation results.

Cycle 2 UX-14 adds `test_ux14_public_explanations.mjs` to safe. It checks the
approved public copy, retained internal diagnostics, active model ingredients,
canonical/public parity, and real refresh/failure/backoff transitions offline.
Run either focused regression through `node scripts/run_tests.mjs --test` followed
by its filename. The [public explanation inventory](../UX14_PUBLIC_EXPLANATION_INVENTORY.md)
records tranche A and its deferred gates; the regression does not authorize the
remaining content tranche.

Cycle 3 UX-14 tranche B adds `test_ux14_tranche_b.mjs` to safe (standalone lane catalog 252,
safe 140, 112 default exclusions). It renders the real Luck, FLAG, units, team
Advanced, matchup, Playoffs and Method paths offline and checks the approved
plain-English copy, provider-neutral pass-rush labels, localhost-only raw reasons,
preserved limitations, untouched gated rows, unchanged ratings and public parity.
The cross-review correction commit adds the full hits-and-sacks fallback tooltip,
missing-versus-zero event counts, usable-stat status cases rendered on the team
Advanced card, and unit-prior model-contract checks behind the Method blend copy.
This lane's catalog after tranche B: 252 entries; safe 140 (108 JavaScript /
32 Python), model 45, release 17, QB 26, snapshot 6, server 30; 112 default
exclusions.
Historical copy assertions in V36, V38, V39, V112 and V124 now match the new
wording with unchanged intent. Verification (2026-10-02, LF export of the
tranche): safe 140/140, release 17/17, QB 26/26, model 45/45, snapshot 6/6 and
server 30/30; native safe 139/140 with only the known V77 CRLF assertion.

Integration-discovered FLAG correctness coverage: `test_flag_penalty_values.mjs`
is selected by safe/release. It exercises the real team card and adjacent rankings
EPA/WPA cell with null, undefined, NaN and both infinities, mixed available/missing
inputs, measured zeroes and positive/negative finite values. It also checks existing
non-live/unavailable guards and unchanged FORCE ratings. Run it with
`node scripts/run_tests.mjs --test test_flag_penalty_values.mjs`. The presentation
uses the existing `-` placeholder; no generic formatter or model rule is changed.

Cycle 3 UX-25 source investigation adds `test_postseason_state_audit.mjs` to
safe/model. It checks real tiebreak/outcome helpers, synthetic fallback sensitivity,
schedule count-only evidence, input rejection and deterministic provenance. Run
`node scripts/audit_postseason_state.mjs [--input offline-input.json]` for JSON
evidence; supplied input needs an app-shaped `schedule` array and remains
unverified. The [source assessment](../UX25_POSTSEASON_STATE_SOURCING.md) compares
compute/external/hybrid options. No actual-state solver, feed, formatter or
production behavior is implemented. Standalone lane catalog: 252; safe: 140; model: 46; release:
17; default exclusions: 112 unchanged.

Cycle 4 UX-25 source-contract research extends the existing focused regression
with the [offline matrix](fixtures/ux25_source_contracts.json) and
[claim validator](lib/postseason_source_contract.js). It distinguishes documented,
bounded-absent, conditionally inferable and unknown source coverage. It pins the
13×8 status/proof table and source price/access classes, allowlists proof outcomes,
guards explicit seed-lock claims and requires curated published numeric-price
evidence. Mutation attacks reject classification changes, wrong-direction proofs,
rank-as-lock, invented prices and paid-to-free relabeling. The validator rejects
source adoption and preserves all Cycle 3 behavior and byte-determinism checks. It neither parses live provider payloads nor proves
actual state or citation semantics/production rights. A classification change
requires deliberate fixture and validator baseline review. Run `node scripts/run_tests.mjs --test test_postseason_state_audit.mjs`.
The [contract investigation](../UX25_SOURCE_CONTRACT_INVESTIGATION.md) leaves
display PLANNED and strategy/owner decisions open. Catalog membership unchanged.
Cycle 4 authoritative LF export: catalog 253 (safe 141, exclusions 112); safe
141/141, model 46/46, release 17/17; focused UX-25 plus UX-10 2/2. Native UX-25
1/1 and both changed JS/MJS syntax checks passed. Canonical public build/parity
was unchanged; diagnostic byte-determinism retained. Final diff/governance
checks passed; no production/model/generated change.

## Cycle 4 integration verification (2026-10-02)

`cycle4/integration` combines complete reviewed Claude `bb73001` and Codex
`dba8573` histories from exact `a5f55575`. The roadmap history conflict
retains both lane entries; the integrated roadmap has 35 unique authoritative
IDs, including MD-03, and 140 checked local documentation links resolve.
UX-19 planning remains REVIEW and removal PLANNED/not authorized/BLOCKED on
separately implemented and independently validated MD-03. Its current-state
examples describe `a5f5557`; removal acceptance must use the accepted post-MD-03
baseline. UX-25 research remains REVIEW, display PLANNED, and source/budget/UX-11
decisions remain open. Main is unchanged; final independent integration review
is still pending. No production/model/data/UI/generated change.

Authoritative LF-clean export: catalog 253; safe 141 (109 JavaScript, 32 Python);
model 46; release 17; QB 26; snapshot 6; server 30; default exclusions 112.
Safe 141/141, model 46/46, release 17/17, QB 26/26, snapshot 6/6 and server
30/30 passed with zero failures. Twelve focused tests passed: UX-25, UX-10,
UX-14 tranches A/B, FLAG unavailable values, QB Customize, QB correctness,
V149 QB propagation, and V33/V30/V45/V69 preservation.

The unchanged UX-25 regression rejects all 134 mutation attacks (24 named,
104 cell reclassifications, six proof-direction cases) and retains diagnostic
byte-determinism. Fixture parse/contract validation and both changed JS/MJS
syntax checks passed. Canonical public build/parity, diff and governance checks
passed; validation left the integration source worktree unchanged. No broad
visual regression was needed because production/UI sources are unchanged.
