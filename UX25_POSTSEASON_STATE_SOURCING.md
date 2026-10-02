# UX-25 actual postseason-state sourcing — Cycle 3

2026-10-02. Exact shared base: `093bd734afb1a3c31c68243b1b16f330eb83d353`.
Lane: `cycle3/codex-analysis`. Decision direction remains **CONFIRMED** (the
owner's display floor/ceiling); source strategy is unresolved. Execution:
**REVIEW for this source-feasibility investigation; display implementation
PLANNED**. This is internal evidence and options, not a production state gate.

Local-main closeout (2026-10-02): investigation `6f03f4e` and correction
`97ed745` passed final independent integration review beneath `840e53b1`,
accepted A. READY TO MERGE TO MAIN. The owner-authorized fast-forward has merged
that candidate to local `main`; not pushed or deployed. Investigation remains
REVIEW, display implementation remains PLANNED, and source strategy/authority
and all other owner choices remain unresolved.

## Selection before changing files

Read the full current roadmap, UX-10 semantic audit, UX-08 baseline audit,
UX-14 inventory, V124 history, model overview, deployment boundaries and testing
guide. Verify those historical descriptions against current source.

| Candidate | Dependency readiness / owner choices | Product value | Expected files / testability | Likely Claude overlap / decision risk |
| --- | --- | --- | --- | --- |
| **UX-25 source feasibility — selected** | UX-10 distinctions available; authoritative actual-state strategy, source trust and missing-state policy still open | Removes a concrete blocker for correct 0%/100% presentation across outcomes | This report, offline CLI/helper/regression, catalog/testing guide and UX-25 roadmap note; real tiebreak boundary, input coverage and deterministic evidence | Low production overlap; shared roadmap/catalog may conflict. Low risk if no feed, solver or formatter is installed |
| UX-11 presentation brief | UX-10 map available; UX-25 state distinction required, owner selects primary view | Clarifies representative Out versus marginal chance, sorting and seed labels | Separate presentation report and renderer diagnostic/regression; quantify labeled synthetic examples | Moderate overlap with copy/presentation lane; high risk if ordering or labels are chosen |
| UX-09 retained Roster Lab baseline audit | Current snapshots and UX-10 correction trace available; UX-19 boundary and desired baseline remain open | Determines effects of uncorrected versus team/league correction inputs | Separate baseline report, lab diagnostic and behavioral regression | Moderate overlap with retained public tools; risk of forcing unlike baselines equal or inferring historical intent |
| UX-10 residual labels | Existing map available; naming and correction-baseline owner choices remain open | Narrows exp. wins and record-shaped wording | Label decision brief and existing diagnostic extensions | Greater overlap with public copy; comparatively less new uncertainty removed |

Exactly one tranche: UX-25 sourcing feasibility. No second item is investigated
to its acceptance criteria. UX-11/09/10 references below are dependencies only.
No product choice, model change, public copy, formatter, feed, solver, security
probe, deployment, or generated-output change is included.

## Current repository source contract

| Path / function | Observed inputs and output | Consequence for actual-state work |
| --- | --- | --- |
| `force_server.py`, `UPSTREAMS['/api/schedule']` | nflverse games CSV; cached schedule input | A results/schedule source, not an actual-clinch feed |
| `assets/app.js`, `scheduleFromBootstrapText` and live schedule parser | Filter 2026 REG; keep teams, date, week, scores, status/time and lines; bootstrap accepts more than 200 rows | Does not retain original game ID/season/type on each normalized row or prove complete 272-game coverage; count threshold alone is insufficient |
| `records` / `completedProjectionOutcomes` | Loaded actual W-L-T; projection outcomes retain winner/tie and teams, discard scores | Actual records are useful, but projection outcome context cannot evaluate score/TD criteria |
| `twoTeamDivisionWinner`, `resolveDivisionTie`, wildcard selectors | Head-to-head, relevant division/common/conference records, SOV/SOS; multi-team elimination/restart and within-division selection logic | Source contains substantial early tiebreak machinery, but this audit does not certify every multi-team edge |
| `fallbackTieWinner` | FORCE strength, then alphabetic team code | A model fallback, never evidence of the actual official tie resolution |
| `seasonProjection` | 5,000 samples; future home or away wins; actual ties retained; representative bracket and marginal odds | Does not enumerate possible futures, future ties, score-dependent tie resolutions or authoritative actual state |
| `pct`, standings renderers | Rounded percentage, no actual-state argument | The confirmed UX-25 formatting rule still has no authoritative gate |

Source search finds no additional clinch/elimination producer consumed by these
paths. This does not claim no such data exists elsewhere on the internet.

## Reproduce offline evidence

```text
node scripts/audit_postseason_state.mjs
node scripts/audit_postseason_state.mjs --input offline-input.json
node scripts/run_tests.mjs --test test_postseason_state_audit.mjs
```

The supplied-input adapter reads only the app-shaped `schedule` array. A full
UX-10-style input also works; its other fields are hashed but are not used to
determine state. No provider response, bootstrap envelope or proof certificate
is parsed. Supplied provenance remains **unverified**, including any supplied
clinch flags. Output always reports actual outcome state as **unknown**.

The CLI prints JSON to stdout, performs no network or repository writes, records
Node version, the complete ordered browser sources and diagnostic dependency
byte hashes, and serialized input hashes (plus original supplied-file hash).
It runs real tiebreak/record/outcome functions through the existing offline VM,
without replacing production calculations. Source hashes differ across CRLF/LF.
The diagnostic does not measure live production, freshness, prevalence, runtime
of a real solver, provider reliability or access rights.

### Synthetic schedule coverage and complexity

Both default cohorts reuse the explicitly synthetic UX-10 fixtures: fabricated
current data, repeated future pairings, tracked team identities/priors/reference.
They are not official schedules even when their counts match.

| Cohort | Loaded / completed / remaining games | Actual ties | Count-only check |
| --- | --- | --- | --- |
| Four games per team | 64 / 48 / 16 | 1 | Fails; all 32 teams lack 17 loaded games |
| Seventeen games per team | 272 / 48 / 224 | 1 | Passes counts only; still unverified/synthetic |

The count audit requires 32 unique known identities, regular-season weeks 1-18,
strict ISO calendar dates in the declared 2026 NFL season window (September
2026 through January 2027), distinct teams, unique date/week/pair keys and paired
nonnegative integer finals. Supplied `season` must be 2026 and supplied
`game_type`/`season_type` must be REG. FORCE's normalized rows omit that metadata
after filtering 2026 REG; accepting that shape does not verify season identity.
It does not validate NFL opponent rotations, official game IDs, game finality,
postponements, forfeits, feed watermarks or the truth of results. Its 17/272
assumptions are a declared normal-season audit scope, not a production acceptance
gate; exceptional seasons/scheduling must use an explicit separate contract.

**Tracked real-calendar probe (correction F1):** normalize
`data/live-cache/9b3c086e80ae9f89bbf3.bin` with the unchanged
`scheduleFromBootstrapText` parser. The tracked 2026 REG cohort has 272 games,
48 completed and 224 remaining, spanning 2026-09-09 through 2027-01-10; 31 games
fall in January 2027, including Weeks 17 and 18. The old diagnostic rejected
these dates; the corrected supplied-input CLI accepts them and passes 17/272
counts. All four actual-state outcomes remain unknown and provenance remains
unverified. This is tracked calendar evidence, not a live freshness or clinch
check. Regressions also reject wrong-season metadata, dates outside the window
and impossible dates within it.

| Remaining games | Binary result vectors | Win/loss/tie vectors |
| --- | --- | --- |
| 0 | 1 | 1 |
| 1 | 2 | 3 |
| 16 | 65,536 | 43,046,721 |
| 32 | 4,294,967,296 | 1,853,020,188,851,841 |
| 64 | 18,446,744,073,709,551,616 | 3,433,683,820,292,512,484,657,849,089,281 |

These exact `2^R` / `3^R` counts are an unpruned result-vector search space,
not time estimates or proof that every vector is feasible under every schedule
exception. Future margins, touchdowns and residual tie resolutions require
additional distinctions. Even exhaustive W-L-T enumeration alone does not
establish every official seed. Cross-conference results can affect opponent
strength and later ranks; deleting those games requires a proven reduction.

### Real tiebreak boundary (synthetic, not an NFL title determination)

KC wins 21–20; LAC wins 35–7. Both finish 1–1 in this deliberately tiny
split-series context. The early modeled metrics match (common-opponent record
is unavailable for both). Points differ: KC PF/PA 28/55; LAC 55/28.

| FORCE supplied to unchanged resolver | Division winner returned | Same-division wildcard tie winner |
| --- | --- | --- |
| KC 90, LAC 10 | KC | KC |
| KC 10, LAC 90 | LAC | LAC |
| KC 50, LAC 50 | KC | KC |

Games, outcomes and records remain fixed. This establishes a FORCE/code-order
dependency at the fallback boundary; it does not claim a production frequency
or assign an official division title. The fixture is intentionally incomplete.
The score evidence disappears from `completedProjectionOutcomes`, even though
the original schedule keeps scores. A future actual-state path must retain/use
required official inputs or defer to verified external state.

The actual `addProjectedOutcome` helper can represent a tie; the caller in
`seasonProjection` supplies only home/away winners for future games. The
regression exercises all three constructed helper branches without changing
the sampler. Zero remaining loaded games is therefore also insufficient to
promote the current simulation's terminal seed to authoritative actual state.

## Rule and external-source research

Public documentation checked 2026-10-02; no authenticated provider request, live
FORCE probe, purchase, data ingestion or dependency installation was performed.

- [NFL tiebreak procedures](https://www.nfl.com/standings/tie-breaking-procedures)
  establish that official tiebreaks extend beyond SOV/SOS; FORCE is absent.
  [NFL support](https://support.nfl.com/hc/en-us/articles/35869798026260-NFL-Tiebreaking-Procedures)
  directs readers to that official procedure.
- [nflseedR's maintained procedure description](https://nflseedr.com/articles/tiebreaker.html)
  enumerates the sequence: division head-to-head, division, common and conference
  records, SOV/SOS, then points rankings/net points, net touchdowns and residual
  coin resolution. Wildcard common games require four; multi-team comparisons
  eliminate/restart and reduce divisions before selecting further wildcards.
  This is primary implementation documentation, not an adopted solver.
- [nflseedR standings API](https://nflseedr.com/reference/nfl_standings.html)
  documents depth choices and incomplete terminal coverage: default SOS depth
  uses random tie resolution; POINTS still stops before net touchdowns. It is
  a possible differential research oracle at matched depth, not an authoritative
  clinch certificate or a drop-in full-rule solution.
- [NFL published scenarios](https://www.nfl.com/_amp/playoff-clinching-scenarios-week-17-2025-nfl-season)
  explicitly include ties and other-game dependencies. This historical publication
  is not a current-season machine-readable feed.
- The retrieved [NFL league standings](https://www.nfl.com/standings/league/2026/REG)
  and [playoff page](https://www.nfl.com/standings/playoff-picture) did not expose a
  documented comprehensive actual-state API contract in the retrieved content.
  This is a retrieval limitation, not proof that NFL offers no API.
- [Sportradar's standings guide](https://developer.sportradar.com/football/docs/nfl-ig-standings-retrieval)
  documents season/team identity, postgame records and `rank.clinched`.
  Its examples show division, wildcard and eliminated markers. This is a
  concrete external-feed candidate, not an already approved FORCE source.
- [Sportradar's endpoint reference](https://developer.sportradar.com/football/reference/nfl-postgame-standings)
  documents `rank.clinched` as a **single enum/string state**, with values
  `conference`, `division_first_round_bye`, `division`, `eliminated`,
  `playoff_berth` and `wildcard`. Only one overall `eliminated` marker is
  documented. **Separate division-title elimination, separate first-round-bye
  elimination and exact-seed-lock state are NOT verified**; those unsupported
  outcome-specific actual states remain **unknown** under this source contract.
  Current rank is not a locked seed. The documented season-year choices are
  **2014-2026**, not guaranteed future-season access. Verify enum meanings and
  precedence before mapping; the guide illustrates fewer values than the reference.
  It specifies a 10-minute cache and updates within two minutes of completion.
- The standings guide requires authenticated **`x-api-key`** access.
  [Sportradar account documentation](https://developer.sportradar.com/getting-started/docs/your-account)
  distinguishes trial access from production access reserved for customers;
  production use needs a commercial provider relationship. FORCE's access,
  contractual authority, licensing, price and SLA remain unverified.
- The standings guide acknowledges corrections and directs consumers to the
  **Daily Change Log** to refetch affected-season standings. How `clinched`
  itself is revised after corrections remains **unverified**; this guidance
  is not a verified terminal-state invalidation/revision contract.

## Compute, ingest, or bounded hybrid

| Option for owner choice | Feasibility / required inputs | Correctness risks / testability | Outcome coverage and unresolved boundary |
| --- | --- | --- | --- |
| A. Own mathematical proofs | Possible in principle; complete actual schedule/results/identity, rules version, finality and correction history, all required tiebreak statistics. Use sound bounds, branch-and-bound or a verified constraint formulation, not a 5,000-run sampler | High implementation/review cost. Future ties, repeated opponents, SOV/SOS coupling, multi-team restarts, points/TD branches and exceptional games; prove UNSAT or exhaust all relevant states. A timeout returns unknown. Small exhaustive oracle tests and published scenarios required | Could eventually cover playoff/division/bye/exact seed. Not ready using the current projection resolver alone; no full solver implemented or benchmarked |
| B. Verified external state | Technically concrete via documented provider enum; needs approved source authority/access, evidence snapshots, identity/version mapping and covered-through watermark | Latency/stale snapshots, corrections, single-enum precedence, missing outcomes and source outage. Test adapter with recorded approved payloads; do not equate absent marker with elimination or clinching | Documented positive marker candidates include berth/division/bye; one overall eliminated marker exists. Separate division/bye elimination and exact-seed locks are unverified and stay unknown. No source adopted |
| C. Bounded hybrid | External source for verified outcomes; optionally separately proved local sufficient conditions for unsupported outcomes, with common snapshot/version identity | Avoid a circular cross-check using the same feed. Conflict returns unknown/quarantine pending reconciliation; do not manufacture certainty from agreement or pick a source silently | Allows incremental outcome coverage. Extra operations/authority complexity; owner must select precedence, conflict and stale-state policies. No hybrid implemented |

A local sufficient-condition proof can be useful without solving every possible
tie: e.g., if an outcome holds regardless of all unresolved tie resolutions,
those resolutions need not be guessed. Conversely, a single valid witness can
refute a universal clinch claim. Neither an incomplete search nor a merely
likely counterexample certifies a clinch/elimination. Full-score future states
may be bounded symbolically; sampling scores does not make a universal proof.

**Neutral decision support — next investigations:**

- External-source path: verify access, outcome coverage, enum semantics,
  correction/revision behavior and freshness with provider evidence.
- Local-solver path: build and independently validate a deliberately small
  proof prototype against official tiebreak requirements, including unproved
  boundaries and search exhaustion.
- Hybrid path: assess only after those investigations establish what each
  approach can prove and where coverage, precedence and conflict questions remain.

The owner decides which investigation to fund/authorize first. No strategy is
ranked or recommended; no source, purchase, trust policy or follow-on execution
authority is selected.

## Proposed future state contract (unimplemented)

For owner review: maintain separate state per `team × season × outcome`
(playoff berth, division title, bye, exact seed N). Suggested values:
`clinched`, `eliminated`, `unresolved`, `unknown`. Unknown means evidence
missing/invalid/stale; unresolved means verified evidence says neither terminal
condition holds. A null/absent provider flag does not establish unresolved
without a documented complete-coverage contract.

Each future record should include outcome scope, provenance/source ID, rules
version, source generation and retrieval times, covered-through results/game
IDs, normalized identity, input hash, evidence/proof reference and validation
state. A fresh HTTP fetch is not evidence that it includes the latest completed
game. Bind state to the projection snapshot or explicitly reconcile watermarks;
do not carry a terminal flag blindly across score corrections.

Do not infer bye/exact-seed locks from current rank, playoff clinch, representative
seed or division clinch alone. Provider enum values require explicit approved
mapping; `conference` is not self-defining simply because its name resembles a
conference championship. Keep raw simulation probabilities independent.
Representative Out may legitimately coexist with nonzero odds and is never
actual elimination. No public Out dimming, order, label or UI choice is made.

Unknown/stale state with a raw extreme requires an owner-approved presentation
policy. The confirmed 1%/99% rule does not authorize inventing true 0%/100%
without proof; whether unknown state uses those bounds, a placeholder, or a
qualified unavailable-state disclosure remains a product decision. No formatter
or runtime default is introduced by this proposed contract.

## Required evidence before a separately authorized implementation

1. Owner selects source strategy, authority/access, outcome coverage, stale/missing
   handling and the interaction with UX-11/UX-05 presentation.
2. Pin rule/source schema versions and capture approved real payloads or proof
   inputs; validate identity, schedule/results completeness and correction
   watermarks, without turning normal 17/272 counts into universal truth.
3. At the selected boundary, test true clinched/eliminated/unresolved/unknown
   separately for playoff/division/bye/seeds; combined/absent/unknown enums;
   stale/conflicting/wrong-season payloads, aliases, partial schedules, ties,
   score corrections and replay. Keep raw odds unchanged at 0, tiny positive,
   near-100 and exact-100 values, across every occurrence in the UX-10 map.
4. If computing locally, add independent exhaustive tiny-league oracles covering
   multi-team restart/sweep/within-division reduction, repeated opponents,
   common-game eligibility, SOV/SOS, later score/TD criteria, unresolved coin
   branches and bounded search exhaustion. Compare published historical cases
   at matching snapshots and report unproved coverage.
5. Integration/cross-review checks every public outcome source and generated
   parity. No following implementation begins from this report alone.

## Validation and handoff

The new regression checks actual unchanged tiebreak functions and their
score-dropping boundary, three constructed result branches, count-only versus
authoritative evidence, malformed inputs, retained actual ties and byte-identical
complete diagnostic outputs. It protects evidence classification, not a selected
source or the permanence of current simulation behavior. Renew this source trace
if the sampler changes; that observation is not a new PRESERVE constraint.

Verified 2026-10-02: focused UX-25 regression and UX-10 dependency regression
each passed 1/1 through the native isolated runner. Authoritative LF export
passed safe **140/140**, model **46/46**, release **17/17** and separate UX-25
**1/1**, with zero failures. Catalog/inventory: **252**, safe 140 (108 JS /
32 Python), model 46, release 17, **112 unchanged exclusions**. All three new
JS/MJS files passed syntax checks. Complete default CLI output was byte-identical
on repeat runs; supplied-input provenance/rejection coverage also passed. Test
runners preserved worktree hashes/status and removed their LF scratch copy.
Diff/new-file whitespace checks, **34 unique authoritative IDs**, **115 local
roadmap references**, unchanged doctrine/phase/security/PRESERVE/owner gates,
and **33/33 unchanged source-identical generated mirrors** passed.

Scope is seven files:
this report, UX-25-only roadmap progress/history, CLI/helper/new regression,
catalog entry and testing-guide counts/instructions. Production, model, feeds,
reference, public copy and generated files remain unchanged.

Correction follow-up (F1-F3, 2026-10-02): the real-calendar acceptance/rejection
regressions, UX-10 dependency, authoritative LF safe/model/release families,
catalog/inventory, changed JS/MJS syntax, repeated default and tracked-schedule
CLI byte determinism, and diff checks passed. Counts remain 252 catalog,
140 safe, 46 model, 17 release and 112 exclusions. Only the offline schedule
helper/regression and this report changed; roadmap/governance and production
remain unchanged. Same-week reversed-pair validation, one-team-two-games-in-week
validation and the textual sampler sentinel remain untouched nonblocking
follow-ups, outside this correction pass.

Remaining unknowns: approved source terms/authority, complete enum meanings,
exact-seed terminal coverage, freshness/correction policy, solver soundness/cost
and the public treatment of unknown actual state. UX-10/11/09/08, UX-14 and
other owner decisions remain open. No follow-on tranche is authorized. STOP.
