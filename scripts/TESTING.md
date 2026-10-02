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
| `npm test` / `npm run test:safe` | 138 tests: 106 JavaScript and 32 Python |
| `npm run test:release` | 16 release/correctness tests |
| `npm run test:qb` | 26 QB/pressure regressions |
| `npm run test:snapshot` | 6 snapshot/bootstrap/current-identity tests |
| `npm run test:server` | 30 server and PBP/calibration fixtures |
| `npm run test:model` | 45 model/unit regressions |
| `npm run test:list` | Every test, suite membership, exclusions and special requirements |
| `npm run test:inventory` | Machine-readable catalog and baseline inventory |

Integration verification (2026-10-01, `integration/roadmap-lanes`): `npm test`
passed 136/136, QB 26/26, model 44/44 and release 16/16 in LF scratch. Both new
focused regressions passed individually. The normal public build left all 33
generated files unchanged. Use LF scratch for the known Windows CRLF-sensitive
`test_v77_game_flow_blend.js` timing-source assertion; no production rewrite is
needed for that line-ending issue.

Cycle 2 integration verification (2026-10-02, `cycle2/integration`): catalog
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

The integration commit is withheld on the required missing-input semantic gate:
the full-schedule synthetic fixture's BUF FLAG panel has `pen.live === true`,
`pen.unavailable === true` and null penalty EPA/WPA inputs, yet renders
`0.00 expected points/game | 0.0 win-chance points/game`. Reproduced through
`projectionAuditHarness(projectionSemanticsFixture({fullSchedule:true}))`, setting
`S.ratingView = 'penalties'` and calling `teamPage('BUF')`, on both exact shared
base `e7f0895` and the integrated tree. The unchanged `signed()` formatter coerces
null to zero, and this secondary FLAG card guards `pen.live` alone. Existing
automated suites pass but do not certify this broader invariant. Production
correction is outside this integration-only assignment; no fix or follow-on
authority is introduced here.

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

The catalog has 250 entries including the runner, QB correctness, Customize audit,
projection semantics audit, semantic migration, UX-14 public-explanation and
UX-16 public-positioning regressions. Its 112 default exclusions remain visible in `test_catalog.json`;
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
