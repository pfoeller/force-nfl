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
| `npm test` / `npm run test:safe` | 148 tests: 115 JavaScript and 33 Python |
| `npm run test:release` | 17 release/correctness tests |
| `npm run test:qb` | 28 QB/pressure/research regressions |
| `npm run test:snapshot` | 6 snapshot/bootstrap/current-identity tests |
| `npm run test:server` | 30 server and PBP/calibration fixtures |
| `npm run test:model` | 51 model/unit/research regressions |
| `npm run test:list` | Every test, suite membership, exclusions and special requirements |
| `npm run test:inventory` | Machine-readable catalog and baseline inventory |

### FORCE Gate (Phase 2A)

[FORCE Gate](../.github/workflows/force-gate.yml) is a single validation job on
`pull_request` events targeting `main`. It checks out and immediately verifies
the exact PR head SHA with full history and no persisted checkout credentials;
the synthetic merge SHA is recorded for comparison, not tested. The
`ubuntu-24.04` runner verifies index-LF files remain LF in its working tree,
without rewriting files. Runtimes are exactly Node **24.19.0** and Python
**3.12.14**; `FORCE_TEST_PYTHON` selects that Python and
`PYTHONDONTWRITEBYTECODE=1` prevents bytecode writes.

The gate validates inventory structure: known suite names, every normal-suite
test in `safe`, no special test in a normal suite, and reasons for every
exclusion. Counts are reported rather than frozen. It runs `test:safe` once;
model, release, QB, snapshot and server selections are subsets of safe and are
not rerun. Fixtures are read-only: tracked or untracked fixture changes fail.
The canonical `build:public` must leave all tracked and non-ignored untracked
files clean, with HEAD still the tested PR SHA. No fixture capture, dependency
installation, cache, secrets, artifact upload or deployment is part of the gate.
The token has only `contents: read`. One concurrency group per PR cancels older
runs; there are no conditional jobs or paths that report success by skipping
validation. The job summary records revisions, ancestry, runtime versions,
inventory and validation outcomes.

Fast-forward eligibility from both the event base and main at checkout is
**report-only** in Phase 2A: a false result warns without failing validation.
The gate never updates or rebases the branch. FORCE's required integration
path remains local exact-SHA `ff-only` integration; web merge, rebase and squash
methods do not preserve the desired reviewed SHA state.

**FORCE Gate is NOT YET REQUIRED; the PR requirement is NOT YET ENABLED.**
Phase 1 remains deletion and non-fast-forward protection only. A real PR must
first establish event/check-run behavior and observation evidence before any
separate authorization of required-check enforcement. Require-PR compatibility
with local exact-SHA fast-forward integration remains unproven; it stays OFF
until a separately authorized disposable ruleset/branch experiment proves it.
Local LF dry runs do not prove those GitHub semantics.

### Golden fixture: `scripts/fixtures/ux19_golden.json`

This fixture records UX-19 production-output parity. Its original independently
reviewed baseline was captured from the reviewed pre-removal tree `fe09e673783814eb9367add2c2f50253b02965d9`
(Cycle 6) with `node scripts/test_ux19_qb_return_removal.mjs --capture`, and a
repeat capture was byte-identical.

- Normal test runs only read it. They must never regenerate or overwrite it, and
  `--capture` is never part of a suite.
- A failing parity check is a finding, not a fixture problem. Do not "fix" it by
  running `--capture` or replacing the file.
- An intended, separately authorized model or data change may require a
  recapture. That is a deliberate action: capture from the accepted comparison
  tree, review why each expected value changed, and commit the new fixture on
  its own with the source SHA in the commit message and in this section.
- Replacing the committed fixture requires that review before it is accepted.

Owner-authorized cross-platform portability correction (2026-10-06): the
committed fixture is unchanged. The complete 2,248-leaf audit found Windows
exact throughout and Linux exact except for one 1-ULP forecast `prob` difference
at `played.games["2|2026-09-20|SEA|ARI"].prob`, isolated to platform `Math.pow`
rounding. A7/A8 compares exact first, then permits at most 2 IEEE-754 ULP only
for finite, non-integer game-row `prob` values. Ordered keys, structure, array
lengths and every non-probability value (including historical Elo and
`qbRestore`) remain exact; ratings, teams, projections and HTML hashes retain
their existing exact assertions. Bounded synthetic controls reject a 3-ULP
probability change and even a 1-ULP historical Elo change. This is a test-only
portability allowance; fixture recapture still requires separate authorization
and the review/provenance procedure above.

Fixture provenance log: Cycle 8 MD-07, `cdcfa8de4eed10f26be0c28b05583c4240586537` (transition `e35145aac5a66bb141d6dc8593b2902d0fc52503` independently verified and owner ACCEPTED 2026-10-05); Cycle 7 MD-04, `f984ed9`; Cycle 6, `fe09e67`.

Cycle 8 MD-07 fixture-only transition (2026-10-05): captured with
`node scripts/test_ux19_qb_return_removal.mjs --capture` from a clean LF export
of independently reviewed implementation `cdcfa8de4eed10f26be0c28b05583c4240586537`.
Combined owner acceptance of the implementation and fixture followed capture
and independent fixture review on 2026-10-05.
A second clean export produced byte-identical capture. The owner separately
authorized this fixture transition after Claude independently verified the
V115 LIVE_FITTED implementation with no correction required and found no
unrelated movement. The named Codex validation scratch was moved out of main;
supplied attachments were preserved. Independent fixture review PASSED:
**A. FIXTURE TRANSITION VERIFIED — READY FOR OWNER ACCEPTANCE**. The owner
then ACCEPTED implementation/source `cdcfa8de4eed10f26be0c28b05583c4240586537`
and fixture transition `e35145aac5a66bb141d6dc8593b2902d0fc52503` on 2026-10-05;
required corrections NONE. State at acceptance: ACCEPTED — READY FOR INTEGRATION.
Integrated onto local main by fast-forward on 2026-10-05; not pushed or deployed.
This note grants no follow-on or release authority.

Whole-tree comparison covers 2,248 leaf fields with exactly four changes:

| Bundled field | Previous | Captured | Classification |
| --- | ---: | ---: | --- |
| DEN RB (`teams.DEN.units[4]`) | 27.36350417032484 | 31.40625 | Direct authorized RB output |
| KC RB (`teams.KC.units[4]`) | 16.638284326313986 | 18.281250000000004 | Direct authorized RB output |
| DEN offense (`teams.DEN.units[0]`) | 51.227465379671074 | 52.521792294828295 | Expected derived offense output |
| KC offense (`teams.KC.units[0]`) | 47.03958027579622 | 47.56498243187875 | Expected derived offense output |

Existing offense weights (.20 scoring/drive, .30 QB, .15 receivers, .15 OL,
.20 RB) give raw-composite deltas .8085491659350339 for DEN and
.3285931347372042 for KC. The unchanged softness-35 normalized tanh calibration
reproduces both old/new offense values; only the RB input changes.
Played state has zero changes. All other 2,244 leaves—including ratings,
active ratings, games/forecasts, projection, Lab, QB Rankings and other units—
match exactly. These are bundled fixture values, not the separate frozen
live-snapshot impact bracket.

Fixture SHA-256: previous
`dccab41d90066edbcff92710ee3ec76af7c0f91d715e82a8c967719f4cf63379`;
captured
`c8b1390dcd1033ad40d40b464ed60a5d097e0da578abc5768d556d4fd41eb24a`.
Accepted fixture Git blob: `d8de578f498cf33c249346b33695ae593eb50ad7`.
The complete parent/candidate fixture comparison is reproducible with
`git diff cdcfa8de4eed10f26be0c28b05583c4240586537 -- scripts/fixtures/ux19_golden.json`;
normal UX-19 runs read the recaptured fixture without changing test logic.

Authoritative LF post-transition validation: inventory/catalog 259; safe
147/147; model 50/50; release 17/17; QB 28/28; snapshot 6/6; server 30/30.
The unchanged focused V115 RB prior-frame test passed 1,060 checks. No gate,
test logic, catalog membership or production source changed.

Cycle 7 recapture (2026-10-05, from an LF export of `f984ed9`, repeat capture
byte-identical): only the twelve Roster Lab HTML hashes changed (`lab` KC, BUF,
MIA and their first-removal variants, bundled and played). Lab option and
checkbox values are now `team|pos|name` row keys, so the markup changes while the
selected rows and their deltas do not. Every other golden value (ratings, active
ratings, teams/units, forecasts, Monte Carlo scores, historical and V99 states,
season projections, QB Rankings) is unchanged from the `fe09e67` capture.

Cycle 7 MD-04 decision-free Roster Lab accounting/identity tranche (2026-10-05,
`cycle7/claude-md04-accounting` from exact `b066de7`; not merged, pushed or
deployed): new `test_md04_roster_lab_accounting.mjs` (safe; `timeoutMs` 120000)
checks every offered row on every team, the known DET/SF/BUF collisions,
removal-before-incumbent accounting, open-policy cases pinned unchanged,
canonical/unit/forecast isolation, Lab propagation, reset, accessible controls
and real bind() handlers, plus three source mutations (name-only lookup,
removed-incumbent inclusion, removals not applied before the addition). It
fails on `b066de7`. Catalog 258 entries, 146 safe (113 JavaScript / 33 Python)
and 112 unchanged default exclusions.

Cycle 6 UX-19 public QB-return tool removal (2026-10-03,
`cycle6/claude-ux19-removal` from exact `fe09e67`, implementation `f562928`,
independently validated and owner-accepted, integrated onto local
`main @ cb80c827` on 2026-10-04; not pushed or deployed): new
`test_ux19_qb_return_removal.mjs`
(safe; `timeoutMs` 420000; about three minutes) compares canonical ratings,
units, forecasts, Monte Carlo scores, season projections, historical and V99
states, Roster Lab and QB Rankings with `scripts/fixtures/ux19_golden.json`,
captured at `fe09e67`. Catalog 257 entries, 145 safe (112 JavaScript / 33
Python) and 112 unchanged default exclusions. Authoritative LF clone of
`f562928` passed safe 145/145, model 49/49, release 17/17, QB 28/28, snapshot
6/6 and server 30/30. Native CRLF safe 144/145 with only the known V77 CRLF
timing-source assertion failing. The new test fails on `fe09e67` and on five
scratch mutations (a reintroduced public writer, the QB return column, a
MANUAL/OFF chip, the Method manual clause, and a one-Elo model change).
`test_md03_retirement.mjs` now runs 1,357 checks after its public-Lab
assertions were superseded; its automatic-retirement checks are unchanged.

Cycle 6 MD-03 retirement (2026-10-02, `cycle6/claude-md03-retirement` from exact
`0e6b745`, independently validated and owner-accepted, integrated onto local
`main @ cb80c827` on 2026-10-04; not pushed or deployed): new
`test_md03_retirement.mjs` (safe, qb, model; `timeoutMs` 120000) brings the
catalog to 256 entries, 144 safe (111 JavaScript / 33 Python) and 112 unchanged
default exclusions. Authoritative LF clone passed safe 144/144, model 49/49,
release 17/17, QB 28/28, snapshot 6/6 and server 30/30. The native CRLF
worktree also passed safe 144/144; the known V77 CRLF assertion did not trigger
there. The new test and the updated V30, V33 and V69 contracts fail on `0e6b745`.
Evidence: [MD-03 retirement](../MD03_RETIREMENT_IMPLEMENTATION.md).

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

## Cycle 4 integration verification and local main closeout (2026-10-02)

`cycle4/integration` combines complete reviewed Claude `bb73001` and Codex
`dba8573` histories from exact `a5f55575`. The roadmap history conflict
retains both lane entries; the integrated roadmap has 35 unique authoritative
IDs, including MD-03, and 140 checked local documentation links resolve.
UX-19 planning remains REVIEW and removal PLANNED/not authorized/BLOCKED on
separately implemented, independently validated and owner-accepted MD-03. Its current-state
examples describe `a5f5557`; removal acceptance must use the accepted post-MD-03
baseline. UX-25 research remains REVIEW, display PLANNED, and source/budget/UX-11
decisions remain open. Final independent review accepted A. READY TO MERGE TO
MAIN; reviewed candidate `681a961` was fast-forwarded to local main. Not pushed
or deployed; origin/main remains at `a5f55575`. No production/model/data/UI/generated change.

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
passed; post-merge validation left the main source worktree unchanged. No broad
visual regression was needed because production/UI sources are unchanged.

## Cycle 5 MD-03 model investigation (2026-10-02; corrected after cross-review)

`cycle5/claude-md03-model` from exact `bd15a2c` adds one research regression,
`test_md03_qb_model_research.py` (safe, model; 60-second timeout). It re-derives
every committed MD-03 result file from the committed ledgers offline, checks
determinism, confirms all 62 raw inputs are pinned and that pinned reproduction
rejects hash, size and missing-file mismatches, and checks the corrected cause
classes (generic reserve codes are never medical; CAR 2010 Moore is a role change;
the CAR 2022 Darnold takeover is not a return; MIA 2020 Tua thumb is detected),
the B0/B2 separation, population-sensitivity coverage and that cluster-bootstrap
point estimates equal the headline unique-game Brier. It touches no production
code. `research/md03/build_cohort.py` defaults to PINNED REPRODUCTION; SOURCE
REFRESH (`--refresh-sources`) is the only mode that rewrites the manifest.
Standalone Claude lane record before integration: catalog 254 entries, safe 142 (109 JavaScript / 33 Python), model 47, release 17,
QB 26, snapshot 6, server 30, 112 default exclusions unchanged. Authoritative LF export of the corrected
version passed safe 142/142, model 47/47, release 17/17, QB 26/26, snapshot 6/6
and server 30/30, plus the focused MD-03, V33, V45, V69, V149 propagation, QB
correctness and V30 gate tests (8/8). A full pinned rebuild reproduced every
ledger and result byte for byte, a tampered raw input was rejected before any
write, and the canonical public build left generated files unchanged.

## Cycle 5 MD-03 offline event research

`node scripts/audit_md03_qb_events.mjs` replays the frozen local sample without
network calls, production imports or file writes. `test_md03_qb_events.mjs` is
cataloged in safe / QB / model; the standalone Codex lane had catalog 254, safe 142 (110 JS / 32 Python),
model 47, QB 27; release 17, snapshot 6, server 30 and 112 exclusions unchanged.
The 12-window sample and synthetic contracts exercise starter conflicts, byes,
repeated episodes, role/transaction disqualifiers, unknown evidence, retraction
and all-team symmetry. Every output denies production correction.
`research/md03_build_sample.py SOURCE_DIRECTORY OUTPUT.json` reproduces the
fixture from local source files matching its frozen manifest, without fetching
or adopting a feed. See [investigation](../MD03_QB_EVENT_DETECTION_INVESTIGATION.md).

Authoritative LF export passed safe 142/142, model 47/47, release 17/17 and
QB 27/27. Focused MD-03 passed natively and in LF export; JS/MJS syntax,
Python AST, fixture parsing, catalog/inventory, diff check and local document
links passed. All 35 authoritative roadmap IDs remain unchanged and unique.
Two diagnostic CLI runs were byte-identical; the local source-file rebuild
matched the frozen fixture. The canonical public build in scratch reproduced
generated output unchanged, and validation preserved all source-worktree
status/hashes. Snapshot/server selections stay 6/30; those suites were not
rerun for this research-only change.


## Cycle 5 MD-03 detector cross-review corrections

Historical standalone Codex follow-up to `e32ee2b`, still research-only. Its lane counts remained:
254 catalog, safe 142 (110 JS / 32 Python), model 47, QB 27, release 17,
snapshot 6, server 30 and 112 default exclusions. The schema-2 fixture names
incumbent/onset/window/return/cause targets and crop reasons, and adds nine
uncropped regular-season streams from the same 14 frozen inputs. The CLI scores
only those targets and retains every competing event. Cropped counts remain
injury-aware 6 TP / 0 FP / 2 FN / 2 TN and cause-free 8 TP / 2 FP / 0 FN / 0 TN;
full-season cause-free changes to 7 TP / 2 FP / 1 FN / 0 TN because Tua's thumb
target is not established under the earlier Fitzpatrick anchor. Both views
have two open/ambiguous cases; none is population accuracy.

Focused regression adds one-start tenure rejection, explicit
`CROSS_SEASON_UNSUPPORTED`, `RETURN_IDENTITY_ONLY` semantics, tainted/nested/
conflicting-return abstention, exact target/window/return matching, competing-
episode non-credit and recursive denial of production authorization. Mutation
probes kill one-start establishment, tainted qualification, identity-name
overclaim, hidden cross-season reason and any-episode scoring. Broadening
onset support for duplicate injury rows remains candidate-equivalent because
the separate duplicate guard still taints and abstains; no artificial behavior
was added. Fixture rebuilding remains local/hash-checked; no source is adopted.

Authoritative LF validation passed: inventory/catalog 254; safe 142/142;
model 47/47; release 17/17; QB 27/27; snapshot 6/6; server 30/30; focused
MD-03 regression 1/1. All three changed JS/MJS files passed `node --check`,
and the builder passed Python AST syntax validation. Two independent local
fixture rebuilds were byte-identical to the committed fixture; rebuilt and
committed evaluations matched, with cropped/full-season counts above. All
14 pinned source hashes/sizes validated; a tampered source was rejected before
output. Repeated diagnostic output was byte-identical. Mutation probes gave
five kills and the documented candidate-equivalent survivor. All 35 roadmap
IDs remained unique/unchanged and local roadmap references resolved. Canonical
public build/parity and `git diff --check` passed; generated output and source
worktree status/hashes were unchanged by validation.

## Cycle 5 integration / local-main closeout (2026-10-02)

`cycle5/integration` from exact `bd15a2c` preserves complete Claude
`0a6dcb8` → `4b1759b` → `609cddf` → `a60dffa` and Codex `e32ee2b` →
`c765690` histories. The current combined catalog has 255 entries: safe 143
(110 JavaScript / 33 Python), model 48, QB 27, release 17, snapshot 6, server
30 and 112 default exclusions. Both new entries are retained in normal sorted
positions; the model regression retains its 60-second timeout. The earlier
lane counts above are historical, not current integrated selections.

Offline research reproduction (explicit local inputs; no source refresh):

```text
python -B research/md03/build_cohort.py --cache MODEL_SOURCE_DIRECTORY
python -B research/md03/evaluate.py --write
python -B research/md03/celo_prior_harness.py --write
python -B research/md03/v33_original_evidence_audit.py --write
python -B research/md03/classification_migration.py OLD_REVIEWED_LEDGER.json --write
python -B research/md03_build_sample.py DETECTOR_SOURCE_DIRECTORY OUTPUT.json
node scripts/audit_md03_qb_events.mjs
node scripts/run_tests.mjs --test test_md03_qb_model_research.py
node scripts/run_tests.mjs --test test_md03_qb_events.mjs
```

The model rebuild validates 62 frozen raw inputs before writing, while the
detector builder validates 14. Source refresh is a separate deliberate evidence
version. Research rebuilding belongs in scratch when preserving a worktree.
The owner chose retirement/Null as product direction; production correction
remains active until separately authorized implementation, independent
validation and owner acceptance. UX-19 remains planned, unauthorized and
blocked; its later plan revision is not performed here.

Authoritative LF validation passed: catalog/inventory 255; safe 143/143,
model 48/48, release 17/17, QB 27/27, snapshot 6/6 and server 30/30.
Both MD-03 regressions plus active V30, V33, V45 freshness/unit-bridge,
V69, V149 QB and QB correctness selections passed 11/11. All seven new
Python files passed AST syntax checks; all three detector JS/MJS files
passed node syntax checks. Two pinned rebuilds reproduced all nine model
ledger/manifest/result outputs and the detector fixture byte for byte.
All 62 model and 14 detector input hashes/sizes matched; same-size tampering
was rejected before output writes in both builders. Repeated detector CLI
output was byte-identical. No source refresh occurred.

Integration-stage checks before the local-main merge: canonical public build/parity
and diff checks passed. All 35 authoritative
IDs remain unique/unchanged, 169 local documentation links resolve, and
unrelated roadmap items/governance remain unchanged from reviewed Claude.
All 27 integrated paths are research, documentation or test tooling; all
production Git blobs and native baseline checkout bytes remain unchanged
from bd15a2c. Main and both lane worktrees retained their status/file hashes.
Final independent review accepted A. READY TO MERGE TO MAIN. Local `main`
was fast-forwarded from exact `bd15a2c` to reviewed integration `966828e`,
preserving both complete lane histories. `origin/main` remains at `bd15a2c`;
no push or deployment occurred. Closeout changes only merge/review status
and history; retirement and UX-19 implementation remain separately
unauthorized. The existing automatic correction remains active.

## MD-08 model/presentation separation — 2026-10-05

Owner-authorized architecture tranche only; no display transform is adopted.
`test_md08_model_display_separation.mjs` (safe/model; `timeoutMs` 180000) drives
the real ordered bundle. It proves the identity `unitDisplayGrade()` seam for
11 keys x 32 teams, routes every classified presentation consumer through it,
and shows that a TEST-ONLY synthetic transform installed through
`FORCE_UNIT_PRESENTATION_TEST_HOOKS` (test mode only) changes presentation while
ratings, bridge, forecasts, exact scores, projections, Week-2 and historical
states stay bit-identical. Bridge-reads-presentation and consumer-bypass source
mutations must be detected. `test_v148_canonical_qb_everywhere.mjs` keeps its
matchup qbIndex source assertion, updated to the seam form
`unitDisplayGrade(offProfile,'qbIndex')`. No golden fixture was recaptured. Expected
inventory: catalog 260; safe 148; model 51; default exclusions 112.

## MD-07 V115 RB effective-prior frame correction — 2026-10-05

Owner-selected LIVE_FITTED, not proven original V115 intent.
`test_v115_rb_prior_frame.mjs` (safe/model) exercises synthetic distinct frames,
fitted argument observations, QB/rushing fallbacks, independent composite/prior
arithmetic, five semantic mutations, full-profile parity for six non-V115
policies in preseason/live states and frozen MD-07 LIVE_FITTED parity.
Frozen checks use the corrected production prior path plus accepted live
grades/games; no private-feed replay or total FORCE/forecast claim.
Catalog 259; safe 147; model 50; default exclusions 112.
Canonical `scripts/build_public.py` regenerates the tracked model mirror.
Independent implementation/fixture reviews PASSED; owner ACCEPTED 2026-10-05;
required corrections NONE; integrated onto local main 2026-10-05 (fast-forward).
MD-07 execution COMPLETE for the authorized bounded tranches only; Decision
INVESTIGATE; Priority unset; not pushed or deployed.

Historical LF authoritative result at implementation source `cdcfa8d`,
before the subsequently accepted fixture transition: inventory 259;
safe 146/147; model 50/50; release
17/17; QB 28/28; snapshot 6/6; server 30/30. The sole safe failure is
`test_ux19_qb_return_removal.mjs` A5/A13 bundled teams unchanged, because the
golden pins pre-correction RB/derived offense unit grades. It passes on parent
`207f4b5`; this is not pre-existing. At that source the fixture/test was unchanged.
At implementation source `cdcfa8d` no recapture or exclusion was performed;
normal safe was blocked. The subsequent separately authorized fixture-only
transition is recorded in the Golden fixture section above.
