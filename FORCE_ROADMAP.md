# FORCE Roadmap

Canonical project direction and decision record. Established 2026-10-01 from the owner's Product / UX audit intake. This roadmap describes direction, status, dependencies, and completion; it does not authorize execution.

## Purpose and authority

Use this document to understand what work is planned, why it matters, what is decided, what remains open, and which work areas become legitimate candidates after a tranche finishes. Do not infer project direction from an adjacent implementation opportunity or an old audit recommendation.

The owner's active prompt defines the authorized tranche. Roadmap order, a `CONFIRMED` decision status, and an unblocked dependency are not permission to start work. Agents may report completion, discover issues, recommend candidate next work, and propose roadmap updates. They must stop for owner direction before starting a new tranche unless the prompt explicitly authorizes continuation.

An explicit owner instruction can reopen a preservation constraint or change this roadmap's direction. Record that instruction and its resulting decision; do not treat an agent's recommendation as owner approval.

## Current production baseline

The owner-specified starting milestone is **2026-10-01, `main @ 8d72a03`**, “Fix FORCE QB correctness and migrate V5 reference.” It includes:

- Canonical V149 all-play QB EPA semantics: actual passes, sacks, scrambles, and designed QB runs counted once, with kneels, spikes, and canceled plays excluded.
- V5 historical QB reference, rebuilt with matching canceled-play semantics and pinned provenance.
- Corrected ANY/A sack-yard handling and compatibility with legacy aliases.
- Corrected Raw QB Rating display, exposing the calibrated live five-component composite before context and continuity/prior blending.
- Production schema-migration support for `v149-all-play-v2`, rejecting incompatible old QB inputs.
- Repaired test infrastructure and the isolated safe test runner.

This identifies the repository/release starting point; a commit alone is not evidence that deployment or production migration succeeded. Record deployed verification separately when an authorized release supplies that evidence. The application identity remains V149.

Technical mechanisms remain in their existing sources and documentation:

| Reference | Use |
| --- | --- |
| [Deployment structure](DEPLOYMENT_STRUCTURE.md) | Worker/container/static-asset boundaries, public-mode restrictions, and canonical/generated source layout. |
| [Testing guide](scripts/TESTING.md) | Suite selection, isolation, worktree checks, test catalog, and excluded/special tests. |
| [V148 changelog](CHANGELOG_V148.md) | Canonical QB unit propagation and once-only recency application. |
| [V149 changelog](CHANGELOG_V149.md) | Possession-level score simulation and representative displayed score. |
| [V124 changelog](CHANGELOG_V124.md) | Representative season versus marginal playoff/division probabilities. |
| [V137](CHANGELOG_V137.md), [V139](CHANGELOG_V139.md), [V140](CHANGELOG_V140.md) | Pressure, opponent, and recency context history; consult the current source for subsequent changes. |
| [Brand guidance](BRAND_FORCE.md) | FORCE naming, public-copy principles, and versioned visual-identity history. |
| [Predictive feature policy](PREDICTIVE_FEATURE_POLICY_V30.md) | Evidence and promotion gates, including the V33 amendment. |
| [Application](assets/app.js), [live model](model/live_profiles.js), [server](force_server.py), [Worker](src/index.js) | Current implementation, including the V5 reference/semantic compatibility contract. |
| [Seed helper](scripts/seed_v149_qb_reference.py) | Explicit local historical-reference generation and pinned-input verification. |

Documentation chronology matters. [README](README.md) still describes V105; [model overview](model/README.md) describes earlier forecast architecture; [AUDIT](AUDIT.md) includes historical recommendations. They are context, not a competing current roadmap or proof that an old issue remains unresolved. Revalidate historical claims before proposing current work. Do not rewrite these documents as part of this intake.

## How to use this roadmap

1. Read the baseline, execution doctrine, decision state, and dependencies before proposing substantial work.
2. Locate the authorized item by its stable ID. `UX-01` through `UX-18` correspond to the original accepted Product / UX audit items; `UX-19` through `UX-31` come from the 2026-10-01 owner-direction intake. Model items use `MD-` IDs; security items use `SEC-` IDs. Every ID has exactly one authoritative roadmap entry.
3. Separate accepted outcomes from open implementation details. An investigation can establish a cause without deciding the desired product behavior.
4. Agree a bounded deliverable, non-goals, acceptance criteria, and necessary owner decisions within the active prompt's scope. Do not assign yourself the next tranche.
5. Use the linked technical documents rather than duplicating their mechanisms here. Report conflicting or stale documentation as intake evidence in the tranche handoff.
6. After completion, update status/history as authorized, identify newly unblocked candidates, and stop for owner direction.

There is no new implementation tranche in progress merely because this roadmap exists. Product / UX execution states are recorded per item and in Completed / history; unspecified entries remain `PLANNED`, and `PRESERVE` entries are ongoing constraints. Completed lane work under `REVIEW` does not authorize follow-on implementation or resolve an open owner decision. The 2026-10-01 owner intake below records direction and decisions, not implementation completion or permission to start Phase 1.

## Execution doctrine

For future coding agents:

1. Read `FORCE_ROADMAP.md` before proposing substantial new work.
2. Follow only the authorized item/tranche. Do not automatically implement neighboring items.
3. When implementation reveals another issue, report evidence in the tranche handoff, classify it, recommend whether it belongs in roadmap intake, and explain urgency/dependencies. Add candidate work directly to `FORCE_ROADMAP.md` only when the active prompt explicitly authorizes roadmap/documentation edits. Do not expand scope except for work required for correctness within the authorized task; explain that dependency. A new product/model choice still requires owner direction.
4. For `INVESTIGATE`, gather evidence, determine semantics/root cause, prepare options, and stop before selecting a product/model direction unless explicitly authorized.
5. For `OWNER DECISION`, present alternatives and their consequences. Do not select for the owner.
6. Treat `PRESERVE` as a constraint unless the authorized prompt explicitly reopens it.
7. Keep implementation tranches independently reviewable. State concrete non-goals and avoid combining unrelated redesigns.
8. At completion, report changes, tests/evidence, limitations, and roadmap items now unblocked. Recommend the next candidate work, then **STOP and wait for owner direction** unless continuation was explicitly authorized.
9. Roadmap ordering is never blanket permission to continue automatically. Commits, publication, deployment, and production verification are separate actions subject to the active task's authorization.
10. If an authorized prompt appears to bypass a roadmap dependency, phase order, or a `PRESERVE` constraint, state the conflict and confirm the intended scope with the owner before implementing. An explicit owner instruction governs once the conflict is acknowledged and scope is confirmed.

## Roadmap status taxonomy

Decision status and execution status are distinct fields; progress does not settle an open decision.

| Decision status | Meaning |
| --- | --- |
| **CONFIRMED** | The problem or desired direction is accepted. Implementation details may still need design work. |
| **INVESTIGATE** | Evidence suggests a real issue/product question, but root cause and semantics must be established before selecting a change. Agents must not silently convert it into implementation work. |
| **OWNER DECISION** | Multiple reasonable product/model directions exist. Agents may prepare evidence and options; the owner chooses the direction. |
| **PRESERVE** | Current behavior/pattern is explicitly valued or invariant. Do not casually redesign it. |

| Execution status | Meaning |
| --- | --- |
| **PLANNED** | Recorded for future work; not authorization to begin. |
| **IN PROGRESS** | An explicitly authorized tranche is underway. |
| **REVIEW** | Deliverable/evidence is ready for the review specified by its acceptance criteria. This does not imply release authorization. |
| **COMPLETE** | Authorized acceptance criteria are satisfied and any explicitly required review is resolved; completion evidence is recorded. |
| **DEFERRED** | Paused/postponed by owner direction, with reason and revisit condition recorded. |

An investigation may be execution-`COMPLETE` while its resulting product choice remains `OWNER DECISION`. A preserved behavior need not be treated as a new implementation task.

## Current execution sequence

The authoritative near-term order is **Phase 1 → Phase 2 → Phase 3**. This is dependency order, not automatic execution authority or a release calendar.

| Phase | Scope | Deliverable and handoff |
| --- | --- | --- |
| **PHASE 1 — Understand before redesigning** | Audit `UX-08`–`UX-12` with the revised `UX-09` scope; prepare alternatives for still-open `UX-13`, `UX-15`, `UX-17`, `UX-18`, `UX-24`, and `UX-31`. | Evidence, calculation/source traces, the projection semantic map, baseline contracts/options, and an owner-decision brief. Also prepare the `UX-14` explanation inventory/approval proposal, mobile navigation options for `UX-30`, and quarter-score approach options for `UX-26`. Gather later taper-review evidence for `MD-02` when separately authorized and appropriate. No product-design choices are implemented without a separately authorized prompt. Stop for owner direction. |
| **PHASE 2 — Build shared UI foundations** | `UX-01`, `UX-02`, `UX-05`, informed by `UX-20`, `UX-23`, `UX-28`, `UX-29`, and `UX-30`. | Shared navigation/header, responsive data-view, and numeric/label conventions, with reviewable examples and applicable responsive/accessibility verification. Account for semantic theme tokens, mobile architecture, universal sort/rank behavior, intentional viewport use, and human-language copy architecture. Obtain owner decisions required by the authorized design; agents do not resolve open `OWNER DECISION` items themselves. Unrelated open choices remain open. |
| **PHASE 3 — Apply foundations in bounded product tranches** | `UX-03`, `UX-04`, `UX-06`, `UX-07`. | Independently reviewable page/workflow changes using the shared foundations. Avoid a giant redesign PR or repeated page-local solutions. |

Phase 1 findings must be recorded before choosing changes that depend on their semantics. Phase 2 numeric labels depend on `UX-10` and incorporate `UX-25`'s display rule; navigation placement depends on `UX-15` and the still-open destinations in `UX-30`; semantic colors depend on `UX-13`. Theme modes (`UX-23`) are confirmed without deciding that palette. Phase 3 copy depends on `UX-14`'s inventory/owner approval gate and `UX-18`; matchup graphics remain subject to `UX-17`. Prototype removal (`UX-16`) is now decided, not an open positioning choice. Pending choices do not authorize agents to invent defaults; bounded work can leave unrelated decisions unresolved when the owner authorizes that scope.

Apply the remaining new accepted directions through separately authorized, independently reviewable tranches using the relevant foundations: `UX-19` public-surface changes; `UX-20`–`UX-22` copy/narratives/education; `UX-25`/`UX-26` odds/quarter presentation; and `UX-27`/`UX-28` loader/layout application. `UX-16` prototype removal is COMPLETE from the first parallel-roadmap cycle. This does not assign an unsupplied priority or bypass an item's gate. `UX-30` is the broader mobile initiative informing foundations and their later page applications, not a duplicate navigation/table implementation.

**Security (`SEC-01`) is a separate CONFIRMED HIGH-priority workstream.** It need not wait for all UX work to finish and must not be buried in visual redesign. Bound each authorized security cycle independently around its threat model, safe test environment, and findings ledger. Neither its priority nor this sequence authorizes starting it automatically.

## Product / UX

Initial evidence is the owner's 2026-10-01 live product audit/intake. `CONFIRMED` accepts the supplied problem/direction, not an agent-selected design. Detailed reproductions, widths, screenshots, and current-source traces belong in each authorized tranche's evidence record. No extra page defect is assumed from a vague example.

### Confirmed

`UX-01`–`UX-07` retain **Decision status: CONFIRMED; Execution status: PLANNED; Priority: HIGH**. Resolved owner decisions and new confirmed directions below have explicit item-level status/priority; they do not inherit an invented HIGH priority.

Priority does not override phase order or dependencies.

#### UX-01 — Navigation / header architecture

- **Problem:** Navigation overflows at common desktop widths and becomes effectively unusable on tablet/mobile. Operational controls consume primary-nav space; the mobile header occupies too much initial viewport height.
- **Accepted direction:** Compact primary navigation; intentional overflow/“More”; dedicated mobile navigation; compact sticky header once the navigation model is sound; operational status/actions outside primary navigation.
- **Dependencies/open decisions:** Phase 1 handoff; `UX-15` for Update/status placement; `UX-16`'s confirmed positioning direction if touched; broader mobile requirements/options in `UX-30`; brand/viewport balance in `UX-28`. Exact navigation contents, including the approximately five mobile destinations, breakpoints, and interaction remain open.
- **Acceptance:** Every destination remains discoverable; desktop/tablet/mobile navigation is usable without overflow; operational actions remain reachable; header footprint is compact; keyboard/focus behavior and per-page URLs are preserved.
- **Candidate next deliverable (requires authorization):** Navigation alternatives and a bounded shared-header implementation after required decisions. Related: [layout/application](assets/app.js), [styles](assets/styles.css), [deployment structure](DEPLOYMENT_STRUCTURE.md).

#### UX-02 — Responsive data-table architecture

- **Problem:** Page-primary metrics disappear off-screen in several mobile views; horizontal scrolling substitutes for an adapted information hierarchy.
- **Accepted direction:** A reusable narrow-screen table/list pattern keeping **Rank · identity · page-primary metric** visible. Secondary fields intentionally collapse, hide, or expand; exact columns may differ by page.
- **Dependencies/open decisions:** Phase 1 semantics, `UX-05` conventions, `UX-29`'s universal sorting/rank invariant, `UX-30`'s mobile requirements, and a per-page primary/secondary field inventory. These are shared requirements, not duplicate table projects. Do not introduce unrelated page-specific scroll hacks as the long-term architecture.
- **Acceptance:** Shared rules are demonstrated on representative dense views; primary answers stay visible; secondary data remains intentionally accessible; sorting/search and identity links survive; desktop and applicable export behavior are checked.
- **Candidate next deliverable (requires authorization):** Field inventory and shared-pattern proposals, followed by a bounded implementation. Related: [application](assets/app.js), [styles](assets/styles.css), [QB export history](CHANGELOG_V146.md), [paging history](CHANGELOG_V147.md).

#### UX-03 — Games information architecture

- **Problem:** The current all-season, oldest-first feed makes the current in-season week harder to reach.
- **Accepted direction:** Make current week the primary in-season view; add previous/next-week navigation; retain All / Completed / Upcoming as secondary access; make prediction versus result easy to evaluate for completed games.
- **Dependencies/open decisions:** Phase 2 navigation/data/numeric foundations; `UX-10`/`UX-12` semantics. Offseason and empty-week behavior need design within the authorized tranche.
- **Acceptance:** Current-week entry and week navigation work; secondary access remains available; completed cards clearly distinguish prediction from actual result; the presentation does not imply unavailable historical forecast provenance.
- **Candidate next deliverable (requires authorization):** A bounded Games workflow design/implementation. Related: [game cards/application](assets/app.js), [score-simulation history](CHANGELOG_V149.md).

#### UX-04 — Matchup / FORCEcast information hierarchy

- **Accepted direction:** Surface win probability, predicted line, and predicted score immediately in the hero. Put explanatory edges/context afterward and reduce internal diagnostic language in normal presentation.
- **Dependencies/open decisions:** Phase 2 foundations; `UX-10`/`UX-12`; `UX-14`, `UX-17`, and `UX-18` where affected.
- **Acceptance:** The forecast answer is easy to find at desktop/mobile widths; context follows it; strengths/weaknesses remain useful; no forecast value or score-generation method changes merely to improve layout.
- **Candidate next deliverable (requires authorization):** A bounded hierarchy/presentation tranche. Related: [matchup/application](assets/app.js), [forecast overview](model/README.md), [V149 score mechanism](CHANGELOG_V149.md).

#### UX-05 — UI consistency / numeric conventions

- **Accepted direction:** Shared rules for decimal precision, percentages, projected wins, signed deltas, zero handling, numeric alignment, tabular figures, and recurring metric labels.
- **Explicit invariants:** Never render `-0.0`; comparable numeric columns are consistently right-aligned with tabular figures; identical labels represent identical quantities.
- **Dependencies/open decisions:** `UX-10` defines quantity/source semantics; `UX-13` governs color meanings; `UX-25` adds actual-state-gated 1%/99% postseason display bounds without changing probabilities. Exact precision/rounding conventions must be documented, not guessed per page.
- **Acceptance:** A reusable convention/formatter contract covers rounding-to-zero, signed deltas, percentages, missing values, and projection labels; representative views follow it without altering underlying calculations.
- **Candidate next deliverable (requires authorization):** Convention matrix and bounded shared implementation. Related: [formatting/application](assets/app.js), [styles](assets/styles.css).

#### UX-06 — Public-copy / tooltip system

- **Accepted direction:** Reduce unnecessary internal/provider/model jargon, repeated methodology paragraphs, and repeated card-level source/debug text. Use concise labels with contextual tooltips/details while preserving transparency.
- **Dependencies/open decisions:** Phase 2 foundations; `UX-10` labels; `UX-14`'s confirmed high-level explanation direction and owner-approved removal inventory; `UX-18` market disclosure placement. `UX-20` supplements this item with human-language voice; `UX-21` supplies data-grounded narratives; `UX-22` supplies canonical feature/score education. They do not replace this disclosure-system work.
- **Acceptance:** Shared explanation/disclosure patterns exist; normal workflows use understandable labels; definitions and limitations remain accessible; technical implementation prose is not repeated on every card. Touch and keyboard users can access necessary explanations.
- **Candidate next deliverable (requires authorization):** Copy inventory and a bounded disclosure-system tranche after owner choices. Related: [brand/copy guidance](BRAND_FORCE.md), [application](assets/app.js).

#### UX-07 — Confirmed responsive / polish defects

- **Known examples:** Team-name/percentage collisions; mobile mid-word breaks/clipping; QB control-card spacing/state styling; oversized mobile header; inconsistent numeric alignment; repeated/constant/empty elements; other verified breakage from the 2026-10-01 audit.
- **Dependencies:** Phase 2 foundations and the relevant Phase 3 workflow. Fix through shared patterns where possible rather than one-off CSS exceptions.
- **Acceptance:** Each selected defect has a reproducible example and before/after evidence; verified duplicate/empty elements are removed only after checking their purpose; responsive fixes preserve interactions and applicable exports. Do not infer new defects without evidence.
- **Candidate next deliverable (requires authorization):** A short, explicitly selected defect tranche. Related: [application](assets/app.js), [styles](assets/styles.css), [testing guide](scripts/TESTING.md).

#### UX-14 — Public methodology depth

- **Decision status: CONFIRMED; Execution status: REVIEW for content tranche A (approved R1–R9, D3, D4 and D7 implemented on `cycle2/claude-product`, merged to local `main @ e264db7` after final independent review; not deployed); REVIEW for content tranche B (non-gated section C groups 1, 2, 3 and 5 plus C1 for the rankings FLAG view, implemented on `cycle3/claude-product` from exact `093bd73`; reciprocal cross-review and corrections complete; final independent review accepted; merged to local `main @ 840e53b1`; not pushed or deployed); remaining approved content PLANNED; inventory/approval tranche completed and merged to `main` 2026-10-01; Priority: unset. Owner decision: 2026-10-01.** Public explanations should be high-level and sufficient to understand/use FORCE. This resolves the earlier open depth direction; the specific removal/simplification list was approved separately on 2026-10-01 (see owner disposition below).
- **Direction:** Deep mechanics, exact formulas, provider details, implementation internals, and unusually detailed methodology should not be spread through ordinary public pages. Some About FORCE / Method material may belong in internal documentation or a future deeper/paid layer; no paid product or placement is selected by this item.
- **Required inventory before removal:** Inventory EVERY customer-facing explanation on EVERY public page: About FORCE, Method, rankings, QB, Games, matchup/FORCEcast, team pages, standings/playoffs, retained labs and surfaces pending removal, cards, footnotes, tooltips, loaders/status text, and any other public explanatory text.
- **Classification / OWNER APPROVAL gate:** Classify each explanation as `KEEP PUBLIC`, `SIMPLIFY PUBLIC`, `REMOVE FROM PUBLIC`, or `RESERVE FOR DEEPER / FUTURE PAID LAYER`. Present the proposed removal/simplification inventory to the owner. Do NOT remove customer-facing explanatory content until the owner explicitly confirms the proposed removals. Preserve technical/model documentation internally when public copy is removed.
- **Dependencies/non-goals:** Gates relevant `UX-06`/`UX-04` copy work; coordinate `UX-19`'s separately decided tool removal, `UX-20` voice, `UX-22` education, and `UX-18`'s still-open market disclosure placement. Do not implement QB Rankings copy under `UX-14` until the owner selects the `UX-08` Customize product contract. Preserve public limitations/benchmark transparency. No wholesale deletion or formula/model change.
- **Acceptance / next candidate:** Complete inventory, classifications, retained internal destinations, and recorded owner approval of the actual removal list before a separately authorized content tranche. Related: [brand/copy guidance](BRAND_FORCE.md), [Method/application](assets/app.js).
- **Progress note (2026-10-01, `claude/roadmap-lane @ 8a91d6b`, integrated and merged to `main @ 0f41552f`):** Inventory, owner-approved classifications and internal destinations delivered in [UX-14 public explanation inventory](UX14_PUBLIC_EXPLANATION_INVENTORY.md) are now canonical repository evidence. No UX-14 public explanation was removed or simplified. Reciprocal lane review passed with non-blocking notes; merge and deployment do not authorize the content tranche. Existing gates, including the `UX-08` contract dependency for QB Rankings copy, remain intact.
- **Owner disposition (2026-10-01):** Approved REMOVE FROM PUBLIC R1–R9; for R3–R5 only internal wording goes, and concise plain-English failure/staleness messages remain (for example: some inputs are delayed; FORCE did not load completely, please reload; last good data is being shown). Approved RESERVE FOR DEEPER D1–D9. Approved D10 on condition that the detailed correction rationale moves deeper while a short public statement remains that automatic QB correction applies only in verified cases; `UX-19` removes the public tool, not disclosure of the limited verified correction. Approved the SIMPLIFY PUBLIC direction: concepts instead of formulas, human football language instead of provider/model jargon, plain-English continuity/staleness explanations, “thousands of simulations” instead of public “Monte Carlo”, and market transparency without implementation dumps. This does not resolve `UX-18` placement or other gates; `UX-08`, `UX-12`/`UX-26`, `UX-15`, `UX-17`, `UX-18`, `UX-19`, and `UX-31` remain under their own items. Inventory findings C1 (duplicate explanations), C2 (raw implementation strings reaching visitors), C4 (contradictory refreshed/stale messaging), and C5 (stale V82 runtime wording) are confirmed findings; C3 (market “never changes FORCE” versus “market effect on team rating”) remains INVESTIGATE under `UX-10`/`UX-18`. This approval does not authorize the content tranche; implementing the approved removals/simplifications requires a separately authorized prompt.
- **Content tranche A (2026-10-01, `cycle2/claude-product` from `main @ e7f0895`, owner-authorized Cycle 2 product lane; merged to local `main @ e264db7` 2026-10-02; not deployed):** Implemented owner-approved R1–R9 and the non-gated reservations D3 (Method offense/defense weights, replaced by the ingredient concepts already used on matchup pages), D4 (Method per-unit construction paragraph) and D7 (team Advanced "Base snapshot · bridge" detail). R3–R5 keep honest status in plain English: visitors see "Some inputs are delayed…", "FORCE is showing the last good data…", "Quarterback ratings are unavailable until current QB data loads.", "FORCE did not load completely. Please reload the page." The banner's raw `statsError`/`refreshError` text is replaced at the same render point under the approved simplification direction, which addresses C4 in this public banner path only (the unchanged header status line from `refreshText()` can still show "metrics refreshed" beside a stale/freshness warning; that path is deferred); R5 removes the stale "V82 bundle" text (C5). Raw warnings, provider IDs, `pen.source`, module lists and `FORCE_QB_DEBUG` remain in state, diagnostics and the localhost banner; no data, model, forecast or Worker change. Evidence: `scripts/test_ux14_public_explanations.mjs` (new safe regression); `test_v149_release_hardening.mjs` now checks the plain-English QB availability warning instead of the raw string; safe 137, release 16, QB 26, model 44 and snapshot 6 passed; desktop 1440×900 and mobile 375×812 checks of About, Method, Update, team FLAG/Advanced and matchup pages with no horizontal overflow. **Still PLANNED/gated:** D1/D2 (QB Rankings copy, `UX-08` gate); D5, D6, D8, D9 (Adaptive/market rows flagged `UX-18`, deferred so market disclosure changes stay together; D8 also touches INVESTIGATE C3); D10 (rides with `UX-19`, short verified-cases statement must stay); the section C simplification groups; C1 duplicates. Lane cross-review and bounded corrections passed; final independent review accepted A. READY TO MERGE TO MAIN; the reviewed candidate is merged to local `main`. This note authorizes no follow-on tranche.
- **Tranche A cross-review corrections (2026-10-02, follow-up commit on `cycle2/claude-product`; `82400c4` not amended):** Codex review accepted the tranche with five bounded corrections, now applied. The public metric-failure banner says FORCE keeps using the last good data it has and leaves out anything it cannot back with good data, matching real retention; the stale banner says fresh data "is loading" only while a refresh is running and otherwise "is delayed"; the Method offense sentence now names scoring efficiency per drive, quarterback play, running backs, receivers and the offensive line; the C4 claim above is narrowed to the banner path; the inventory's current-state wording is reconciled. New behavioral regressions drive a real retained-input partial failure and a real failed-refresh/backoff transition. Still deferred, not fixed here: raw `S.refreshError` and "metrics refreshed" wording in the header `refreshText()`, the baseline 397px stale-state mobile overflow, broader provider vocabulary, section C simplifications, `UX-15` and `UX-19`. Merged to local `main @ e264db7` after final independent review; not deployed; no follow-on tranche authorized.
- **Content tranche B (2026-10-02, `cycle3/claude-product` from exact `093bd73`, owner-authorized Cycle 3 product lane; reviewed `2f2346e` + correction `c09fddc`, merged to local `main @ 840e53b1` after final independent review; not pushed or deployed):** Implemented the non-gated section C simplification groups under the approved direction. **Group 1, Luck weights:** the rankings/team Luck notice, matchup Luck context card and Method Luck section explain the ingredients as concepts (most of it is scoreboard versus play-by-play efficiency; the rest is penalty impact, fumble recoveries and unusually fortunate or unfortunate results) with no 60/20/15/5 weights; the "a great team can look unlucky" idea stays; exact weights remain in `FORCE_LUCK_DEBUG`. **Group 2, pass-rush provider cascade:** matchup pass-rush notes and units tooltips name the measure, as-of date and events instead of FTN/StatRankings/Pro Football Reference/nflverse/override labels; the QB-hits-and-sacks fallback is now labeled a disruption rate rather than a pressure rate in the tooltip; the raw unavailable-reason string shows only on localhost; "missing data is not counted as zero" stays. **Group 3, current-season/preseason blend:** duel notes, the team Advanced efficiency card, the units tooltip and Method describe the blend without percentages or fractions; no `MD-01` taper change. **Group 5, simulation wording:** the Playoffs note says "representative simulated season" instead of "Monte Carlo" and keeps the representative-season versus every-simulation odds distinction; the matchup score note says "thousands of drive-by-drive game simulations" and keeps "Treat the exact score as less certain than the line or win probability." **C1:** on the rankings FLAG view the 0 to 100 / 50 neutral definition now appears once (intro panel); the notice below keeps only the FLAG Swing rule and the sort hint keeps the direction; team pages keep the full FLAG note because they have no intro panel. Evidence: new safe regression `scripts/test_ux14_tranche_b.mjs` (fails on `093bd73`, passes on the tranche); historical copy assertions in V36/V38/V39/V112/V124 updated to the new wording with unchanged intent; LF export passed safe 140, release 17, QB 26, model 45, snapshot 6 and server 30; native safe 139/140 with only the known V77 CRLF assertion; public build reproduces all 33 generated files; desktop 1440×900 and mobile 375×812 checks of rankings Luck/FLAG/Units, team Luck/FLAG/Advanced, matchup, Divisions, Playoffs and Method found no new overflow and no console errors (the only mobile overflow is the pre-existing header `refresh-meta` line). **Still PLANNED/gated:** group 4 status vocabulary (`UX-15`, and the deferred header `refreshText()` path), group 6 market wording and the Method FORCEcast paragraph including its "25,000 possession-level simulations" sentence (`UX-18`), group 7 internal labels (mixed `UX-10`/`UX-18`), remaining C1 duplicates (footer versus rankings note), D1/D2 (`UX-08`), D5/D6/D8/D9 (`UX-18`) and D10 (`UX-19`). No formula, weight, model, forecast or Worker change. This note authorizes no follow-on tranche. **Cross-review corrections (2026-10-02, follow-up `c09fddc` on `cycle3/claude-product`; `2f2346e` not amended):** Codex review accepted tranche B with five bounded corrections, now applied. The hits-and-sacks fallback tooltip explains itself entirely in hits-and-sacks terms; missing hurry, hit or sack counts are omitted instead of shown as zero while measured zeroes stay; the status line counts usable current team-stat (or, for QB notes, player-stat) games rather than completed games and says the preseason baseline is still used when no usable current stats exist; Method no longer claims the current season counts for more with every game, because the stabilizer adapts and some units start from a neutral average; this lane's testing summary is reconciled to its own catalog (252 / safe 140 / model 45). Tranche B remains REVIEW; no model change.

#### UX-16 — Prototype badge / positioning

- **Decision status: CONFIRMED; Execution status: COMPLETE; Priority: unset. Owner decision: 2026-10-01.** FORCE is no longer a prototype; remove public-facing prototype labeling/positioning.
- **Scope/invariant:** Badge, footer, and other public positioning copy. Keep the FORCE brand unchanged; do not substitute another misleading maturity label. This is a bounded copy change, not a rebrand.
- **Prior context:** Keep/rename/remove was previously open. The owner selected removal; do not reopen it as a design choice without new owner direction/evidence. The separate expanded-name question in `UX-31` remains open.
- **Acceptance satisfied:** Public prototype references were inventoried and removed in the authorized tranche; brand continuity and accurate positioning were verified. Related: [application](assets/app.js), [brand guidance](BRAND_FORCE.md).
- **Completion note (2026-10-01, `claude/roadmap-lane @ 8a91d6b`, integrated and merged to `main @ 0f41552f`, deployed):** Public references found: the header "prototype" badge, the footer "FORCE prototype" prefix, and the About FORCE "Prototype name" warning. All three were removed and the orphaned badge styles deleted; the FORCE mark, footer explanation and expanded name are unchanged. Remaining matches are non-public (a code comment, the unused `prototypeDate` data key, historical docs). Lane evidence: `scripts/test_ux16_public_positioning.mjs`, safe suite, desktop/tablet/mobile checks. Reciprocal lane review passed with non-blocking notes; the owner confirmed successful Cloudflare deployment and a passed live smoke check. Completion/deployment evidence is recorded in Completed / history.

#### UX-19 — Remove public QB adjustment / QB-return tool

- **Decision status: CONFIRMED; Execution status: REVIEW for the public-removal plan (Cycle 4, `cycle4/claude-product` from exact `a5f5557`; final independent review accepted; merged to local `main @ 681a961`; not pushed or deployed); removal PLANNED, not authorized, and BLOCKED on `MD-03`; Priority: unset. Owner decision: 2026-10-01; prerequisite added 2026-10-02.** Remove the public-facing QB adjustment/QB-return UI/tool; its current targeting is confusing because it meaningfully applies to only one QB at present.
- **Boundary:** Preserve underlying data, adjustment logic, diagnostics, and useful internal model capability. Public-surface removal does not authorize deleting that machinery or changing the canonical model.
- **Prerequisite (owner requirement, 2026-10-02):** Public removal waits until `MD-03` delivers a league-wide automatic QB-return correction and it is independently validated and accepted by the owner. The current KC-only V33 preset is current state, not an acceptable final state. Sequence: `MD-03` investigation/design, separately authorized implementation, independent validation, owner acceptance, then separately authorized UX-19 removal under the reviewed boundary in the [removal plan](UX19_QB_RETURN_REMOVAL_PLAN.md) (section 14 defines the prerequisite contract).
- **Reconciliation/dependencies:** Supersedes the public QB Return Lab portion of `UX-09`; retained labs still require baseline honesty. Identify all public entry points and distinguish this surface from QB Rankings Customize (`UX-08`). Coordinate explanation inventory (`UX-14`) and product education (`UX-22`); do not remove unrelated tools.
- **Acceptance / next candidate:** A bounded public-removal plan identifying retained internal capability, followed by separately authorized removal only after MD-03 is independently validated and accepted by the owner, and evidence that public entry points are gone while useful internal behavior/data remain. Related: [application](assets/app.js), [QB-return research](QB_REGIME_RESEARCH_V33.md).
- **Planning note (2026-10-02, Cycle 4 `cycle4/claude-product` from exact `a5f5557`):** [Public-removal plan](UX19_QB_RETURN_REMOVAL_PLAN.md) inventories every public surface (QB Return Lab on every team page; quick buttons on home, rankings, teams, team hero and matchup hero; the rankings "QB return" column; "No verified QB-return preset" on non-preset team pages; the Method manual-what-if clause; export carry-through), separates the manual tool from the automatic verified correction and from `UX-08` Customize, and gives a surface-by-surface removal matrix, retained internal capability, test impact and acceptance tests. Manual state is in-memory only (no persistence or migration). Default forecasts do not depend on the tool; while set, manual state is global and, for non-preset teams, incoherent (real-bundle probe recorded in the plan). Owner decisions (2026-10-02, recorded for the future removal tranche): O1 keep and reword the team-level automatic-correction disclosures in plain automatic-correction language ("QB return correction +N Elo", "Includes verified QB return correction"), dropping "manual" and "scenario" framing; O2 D10-b, with the detailed rationale in Method/internal research and the retained O1 team-level disclosure as the short active-team statement (never tooltip-only); O3 Method status card "Used only in verified cases, and it fades as the starter plays." (editorial); O4 keep `S.qbCarryover` and the internal override branch, unreachable from public UI, with no new setter and no deletion; O5 Teams intro "Ratings, context and schedule." (editorial). Codex cross-review corrections F1-F7 (Customize versus Default description, narrowed coupling/persistence claims, selector-level CSS and grid boundary, decision classification, stronger acceptance criteria, export description, exact test catalog memberships) are applied in a follow-up commit; `c9d03fe` is not amended. Two pre-existing baseline inconsistencies (team-page schedule applies only the viewed team's correction; Roster Lab excludes the automatic correction) are reported for `UX-09`/`UX-10` intake, not fixed. No tool removed; no production, model, data, test or generated file changed. This note does not authorize the removal tranche.

#### UX-20 — Human-language public voice

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Public copy should sound like a knowledgeable NFL analyst or podcast: natural football language and short, conversational explanations, without gimmicky or overly casual tone.
- **Standard:** Remove em dashes from customer-facing copy; avoid visibly machine-like punctuation/style habits and provider/internal implementation vocabulary in normal UI. Maintain statistical accuracy and do not invent unsupported causality.
- **Style examples, subject to factual fit:** “Monte Carlo simulation” → “thousands of simulations”; exact FLAG percentages/formula → “a blend of play efficiency, win impact, first downs and erased touchdowns”; exact recency coefficients → “recent games count more”; “leave-one-matchup-out opponent adjustment” → “adjusted for opponent strength.” These are voice examples, not permission to misdescribe a quantity or calculation.
- **Boundary/dependencies:** Supplements `UX-06`; does not replace tooltips/transparency or `UX-14`'s inventory/owner approval gate. Exact formulas, weights, stabilizers, provider names, implementation details, and the term “Monte Carlo” may remain in appropriate deeper/internal documentation. Informs `UX-21`/`UX-22` and shared copy architecture before page application.
- **Acceptance / next candidate:** Shared voice examples and an accuracy-checked public-copy inventory, then bounded authorized applications. No calculation changes. Related: [brand/copy guidance](BRAND_FORCE.md), [application](assets/app.js).

#### UX-21 — Tokenized football narratives

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Explain why a team's rating looks as it does through deterministic, data-grounded football narratives reusable on team pages and suitable other surfaces.
- **Illustrative pattern:** “QB X leads a formidable offense, but the defense is holding back the team's overall FORCE rating.” Use such a sentence only when the underlying data supports it.
- **Candidate factual tokens, not final definitions:** Elite/strong/average/weak QB, offense, or defense; strong pass rush; weak coverage; strong/weak run defense or recent form; record outperforming/underperforming underlying performance; a strong rating held back by one unit; balanced, offense-driven, or defense-driven team.
- **Required design:** Define tokens, thresholds, priority rules, sentence templates/variation, conflict resolution, and placement. Do not invent final thresholds now; reuse canonical definitions only when verified. No live generative-AI prose dependency, unsupported causal claims, contradictory tokens, or absurd combinations.
- **Dependencies/acceptance:** `UX-10` semantics, `UX-20` voice, `UX-14` disclosure gate, and `UX-22` feature roles. Future authorized design must show adequate variation and regression coverage for contradictory/absurd combinations without changing model outputs. Next candidate is the bounded narrative design, not implementation in this intake.

#### UX-22 — How FORCE Works / How to Use FORCE

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Create a primary public product-education surface; its final name/placement remains to be designed. Explain the product in plain football language, not deep formulas.
- **Coverage:** Overall FORCE; offense/defense/unit ratings; QB Ratings; FORCEcast; Luck; FLAG; playoff/division projections; retained scenario/what-if tools; common adjustments; and interpreting scores, bars, and projections.
- **Canonical feature map:** Explicitly classify roles conceptually as `PART OF THE FORCE RATING`, `CONTEXT ONLY / DOES NOT CHANGE FORCE`, `FORECAST / OUTPUT`, `WHAT-IF / SCENARIO TOOL`, and `DIAGNOSTIC / RESEARCH VIEW`. Labels may be refined, but the role distinctions must remain explicit and come from one canonical map rather than conflicting page descriptions.
- **Dependencies/non-goals:** `UX-10` quantities, `UX-20` voice, `UX-14` inventory/approval, and `UX-19`'s public-tool boundary. Ordinary pages become shorter/conversational while retaining necessary transparency. Do not expose deep internals, revive a removed tool, invent feature contributions, or promise a paid layer.
- **Acceptance / next candidate:** Verified feature-role map and high-level education outline, followed by a bounded authorized surface; actual public explanation removals remain gated by `UX-14`.

#### UX-23 — Shared accessibility themes

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Support Dark, Light, Dark High Contrast, and Light High Contrast. Dark may remain the default unless later changed.
- **Shared architecture:** Semantic theme tokens for surfaces, text, borders, focus, interaction states, warnings/errors, rating semantics, and context semantics. Persist user preference and consider OS `prefers-color-scheme`; do not implement page-specific theme CSS.
- **Accessibility:** Intentionally design high-contrast modes rather than merely increasing saturation; validate contrast across all semantic states.
- **Dependencies/open decisions:** Theme modes are confirmed; `UX-13` still owns the exact semantic rating/context palette. `UX-24` favorite-team personalization is separate and unapproved. Retain the dark navy identity in the dark presentation; adding owner-approved light modes does not authorize a rebrand or removal of preserved typography/brand patterns.
- **Acceptance / next candidate:** Token/theme architecture and semantic-state contrast evidence, then a bounded authorized implementation integrated with Phase 2 foundations. No autonomous palette choice. Related: [styles](assets/styles.css), [brand guidance](BRAND_FORCE.md).

#### UX-25 — Postseason odds display floor / ceiling

- **Decision status: CONFIRMED; Execution status: REVIEW for the Cycle 3 source-feasibility and Cycle 4 source-contract investigations; display implementation PLANNED; Priority: unset. Owner direction: 2026-10-01.** If the relevant outcome is not actually clinched, displayed probability must not show 100%: cap presentation at 99%. If not actually eliminated, it must not show 0%: floor presentation at 1%. True 100%/0% display is allowed once the corresponding actual clinch/elimination condition is satisfied.
- **Scope:** Playoff, division, bye, seed-related, and equivalent bounded postseason odds across public surfaces. Underlying simulation probabilities remain unchanged; this is display semantics, not a model change.
- **Dependencies/non-goals:** `UX-10` maps raw probability, displayed probability, and actual outcome state distinctly; `UX-11` cannot use a representative “Out”/seed result as actual elimination/clinch. `UX-05` provides shared formatting. Identify authoritative actual-state gates; do not blindly clamp forever or infer clinching from rounding/simulation extremes.
- **Acceptance / next candidate:** State/source contract and consistent presentation checks for unresolved, clinched, and eliminated outcomes, including rounding boundaries. Design a bounded authorized display tranche without altering probability calculations.

- **Cycle 3 source-feasibility evidence (2026-10-02, `cycle3/codex-analysis`, exact shared base `093bd734`):** [Actual-state source assessment and owner options](UX25_POSTSEASON_STATE_SOURCING.md), reproducible offline count/tiebreak diagnostic and behavioral regression passed reciprocal cross-review with correction `97ed745` after initial `6f03f4e`; both passed final independent integration review and are merged to local `main @ 840e53b1`; not pushed or deployed. The correction accepts the tracked 2026-season January 2027 calendar, precisely bounds the external-source candidate and keeps strategy options neutral. Current projection tiebreak fallbacks depend on FORCE/code order, omit later score/TD evidence and sample no future ties; they do not certify actual clinch/elimination. Compute, verified external state and bounded hybrid remain alternatives; no strategy, unknown-state presentation or source authority is selected. The confirmed 1%/99% direction remains intact; actual-state/formatting implementation and all other owner gates stay unstarted/open. Production/model/generated sources unchanged; no follow-on authority.

- **Cycle 4 source-contract evidence (2026-10-02, `cycle4/codex-analysis`, exact shared base `a5f55575`):** [Free-first contract investigation](UX25_SOURCE_CONTRACT_INVESTIGATION.md) and [offline coverage/provenance matrix](scripts/fixtures/ux25_source_contracts.json) assess 13 source scopes, conditional gap proofs, current public access/prices and the minimum local-solver contract. No adequate free automated production route is yet established; this is not proof none exists. Quote-only prices stay UNKNOWN; the published modest paid standings tier has no documented terminal flags in the reviewed endpoint. Owner policy prefers adequate free sources; paid adoption requires unavailable adequate free coverage and relative affordability, with no invented dollar threshold. Independent-review corrections add the gated NFL API lead, observed ESPN position schema, historical/community/commercial inventory leads, conservative bye mapping, overall-elimination proof and display-risk/solver boundaries. The existing focused regression pins classifications/proof directions and published-price evidence; no live provider state was certified. Investigation execution remains REVIEW; display PLANNED, UX-11 unresolved, strategy/authority/coverage/stale-state and paid adoption gates open. No source, solver, adapter or product decision implemented; no follow-on authority.

#### UX-26 — Football-plausible quarter-score presentation

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Representative quarter scoring must be football-plausible, not merely four integers summing to the final. A 26-point winner should not display `1 / 1 / 12 / 12`; a technically possible but unusual `7 / 7 / 10 / 2` should not ordinarily outrank normal constructions.
- **Open approach / required investigation:** Prepare alternatives using simulated possession/scoring events, constrained post-processing grounded in empirical NFL quarter-scoring distributions, or another defensible approach. Exact strategy remains an owner decision; confirmation of the outcome does not select the method.
- **Invariants:** Quarter totals sum exactly to the displayed final; no fabricated scoring events; common totals favor common football constructions; rare safeties/XP oddities remain possible in underlying simulation but do not disproportionately become representative output; quarters belong to the same forecast, not an independent second model.
- **Dependencies/non-goals:** `UX-12` score-selection evidence, `UX-10` terminology, and the existing V149 forecast. Do not encode simplistic “1 point is impossible” bans or retune FORCEcast. Phase 1 prepares approach/evidence; any chosen strategy requires a separately authorized implementation.
- **Acceptance / next candidate:** Source trace, plausible/rare case examples, comparison of approaches and tradeoffs, then recorded owner strategy choice and later regression evidence for sums/plausibility/forecast consistency. Related: [V149 scoring](CHANGELOG_V149.md), [application](assets/app.js).

#### UX-27 — Loader progression / brand semantics

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Preserve the branded loader; progress red → yellow → green and reach the visual bar's end at approximately 3 seconds, aligned with the existing minimum branded-loader duration.
- **Behavior:** If ready earlier, observe the minimum presentation time. If readiness takes longer, hold the bar complete without restarting/erratic behavior. Exit only when both minimum time and required app readiness are satisfied.
- **Dependencies/non-goals:** Shared theme/state accessibility (`UX-23`); preserve the loader concept and readiness contract. This specific owner-approved progression does not settle `UX-13`'s general palette and is separate from `UX-17`'s matchup graphics.
- **Acceptance / next candidate:** A bounded authorized loader tranche with early/late readiness evidence, stable completion, and preserved readiness gating. Related: [application/minimum loader duration](assets/app.js), [styles](assets/styles.css).

#### UX-28 — Brand scale / intentional viewport use

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Give the FORCE logo/name/wordmark greater presence and use the available viewport deliberately. Eliminate accidental blank areas or use them meaningfully; avoid compressing content into one region beside large unused areas.
- **Layout principle:** Rebalance content width, columns, cards, secondary information, and whitespace responsively. Preserve breathing room; this does not require filling every pixel or creating giant mobile headers.
- **Dependencies/acceptance:** `UX-01`'s compact mobile header, `UX-02` hierarchy, and `UX-30` mobile initiative. Larger brand presence must coexist with compact mobile navigation and preserved brand identity. Next candidate is shared layout/brand-scale examples and a bounded authorized application, with viewport evidence.

#### UX-29 — Universal table sorting / selected-metric rank

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset. Owner direction: 2026-10-01.** Every meaningful data column in every table should sort unless a documented reason makes sorting nonsensical. Selecting a column reorders rows; ascending/descending behavior is consistent and active column/direction is visually obvious.
- **Rank invariant:** For quantitative columns, the leftmost displayed rank reflects the CURRENT selected metric, not the original/default rank. Ties use deterministic tie-breaking. Identity/action fields may support alphabetical/action sorting where useful, but must not acquire invented quantitative rank meaning.
- **Dependencies/non-goals:** Part of `UX-02`'s Phase 2 shared table/data-view infrastructure, with `UX-05` numeric conventions and `UX-30` mobile transformations. This is the authoritative sort/rank contract, not a separate per-page reinvention.
- **Acceptance / next candidate:** Column inventory with documented exceptions, common sort/direction/tie/rank rules, and verification on selected desktop/mobile views in the authorized foundation tranche. Exact tie-rank convention remains design work, not an invented rule in this intake.

#### UX-30 — Mobile as a first-class FORCE experience

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: unset; Scope: major product initiative. Owner direction: 2026-10-01.** Mobile must be a first-class experience, not compressed desktop. No key page should require horizontal scrolling to access its primary answer.
- **Deep-dive scope:** Information architecture, persistent navigation, thumb reach, one-handed use, sticky controls, table-to-list/card transformations, team/matchup page hierarchy, charts/graphs, typography, tap targets, safe areas, horizontal overflow elimination, and loading/status states.
- **Navigation option to investigate:** A persistent bottom bar with approximately five primary destinations and secondary destinations under an additional menu/surface. Evaluate `Home / Slate · Rankings · Games · Teams · More` and `Home · Rankings · QB · Games · More`, among defensible options. Neither the bottom-bar choice nor the exact five destinations is decided.
- **Dependencies/non-goals:** This broader initiative informs/depends on `UX-01` navigation and `UX-02` data views rather than duplicating them; coordinate `UX-23` themes, `UX-28` viewport use, and `UX-29` sorting. Preserve the Slate's strong mobile behavior as a design reference and the compact-header constraint.
- **Acceptance / next candidate:** A bounded mobile audit/design brief with primary-answer access and interaction evidence; obtain owner decisions on navigation before implementing it. Shared architecture precedes separately authorized page applications, not a giant redesign.

### Investigate

All entries in this group have **Decision status: INVESTIGATE; Sequence: PHASE 1**. Execution status is `PLANNED` unless the item records progress explicitly. No separate urgency ranking is assigned within this group. Completion means evidence and options, not automatic implementation.

#### UX-08 — QB Customize baseline

- **Execution status: REVIEW (Customize contract unresolved; investigation/tooling merged to `main` 2026-10-01).** [Reproducible audit and decision brief](UX08_QB_CUSTOMIZE_AUDIT.md) traces the actual model/app and rendered cells, quantifies three labeled synthetic cohorts, and supplies owner-contract alternatives. The Codex tranche from `codex/roadmap-lane @ 485c976` is merged in `main @ 0f41552f`; its evidence is now canonical repository evidence. Decision status remains `INVESTIGATE`; no desired behavior is selected and no production QB behavior changed. Any future implementation requires separate owner direction; merge and deployment do not resolve the Customize contract.
- **Observed:** Untouched 30/30/20/10/10 Customize does not reproduce the published canonical FORCE QB Rating.
- **Confirmed pipeline distinctions:** Both Customize (`qbCustomScore` in [application](assets/app.js)) and canonical FORCE QB Rating apply opponent, pressure, and recency context. Canonical Default additionally includes prior/continuity blending in [live model](model/live_profiles.js); its staged clipping can differ from Customize's single final clamp, and its displayed value may include a QB-return scenario overlay that Customize does not apply. The [detailed audit](UX08_QB_CUSTOMIZE_AUDIT.md) separates these effects. These observations do **not** establish which product behavior is desired.
- **Questions:** What does Customize claim to customize? Should canonical default weights reproduce canonical Final exactly? If prior/continuity is omitted, should it be labeled as a different analytical rating? Should weight customization retain the canonical context/continuity pipeline? What do Raw and Final mean in custom mode?
- **Required outcome:** Trace both pipelines on identical snapshots and controls, quantify the difference, and explicitly document a proposed product invariant and alternatives for owner choice. Current observed Raw is the calibrated five-component live score before opponent, pressure, prior, and recency; this observation is not a new `PRESERVE` constraint or a selected product contract.
- **Dependencies/non-goals:** Owner must decide the contract before behavior changes. Do not retune weights or silently add/remove continuity to make numbers match.
- **Acceptance/next step:** Evidence-backed cause, examples, and consequences for each option; record the owner-selected contract when supplied and create a separate implementation item if needed. Related: [V148 canonical propagation](CHANGELOG_V148.md), [correctness regression](scripts/test_qb_correctness.mjs).

#### UX-09 — What-if lab baseline consistency

- **Audit scope:** Roster Lab and other retained scenario tools, against the published rating/forecast state they claim to use. The 2026-10-01 owner decision in `UX-19` supersedes the public QB Return Lab/QB-adjustment audit: remove that public surface, rather than investigate its public baseline for continued use. Internal diagnostics/capability remain preserved; any separately authorized internal baseline review still follows this invariant.
- **Invariant:** **Every lab or mode must reproduce the state it claims as its baseline.** If it intentionally starts elsewhere, it must identify that state explicitly.
- **Questions:** Is a discrepancy stale input, an alternate projection path, a pre-adjustment state, omitted context, a deliberate counterfactual, or an actual defect?
- **Dependencies/non-goals:** Common snapshot/state evidence; `UX-08` where Customize is relevant, `UX-10` for projection labels, and `UX-19` for the public removal boundary. Do not force unlike baselines equal or change the intended counterfactual without owner direction. Preserve Roster Lab's immediate feedback and useful underlying QB-return machinery.
- **Acceptance/next step:** Baseline/source/control matrix, reproducible comparisons, classified causes, and proposed contracts/fixes for review. Related: [application](assets/app.js), [forecast/lab overview](model/README.md), [returning-QB research](QB_REGIME_RESEARCH_V33.md).

#### UX-10 — Projection source-of-truth / terminology

- **Execution status: REVIEW (2026-10-01, Cycle 2 `cycle2/codex-analysis`, based on exact `e7f0895`; merged to local `main @ e264db7` after final independent review; not deployed). Decision status remains INVESTIGATE.** [Projection semantic map and reproducible evidence](UX10_PROJECTION_SEMANTICS_AUDIT.md) maps the public occurrence families and supplies an offline real-path diagnostic with rendered-cell/coherence regression. Analytic season-end expectations, Monte Carlo means, representative records/seeds, retrospective Luck expectations, displayed odds and actual outcome state are distinct. The traced paths supply no authoritative actual clinch/elimination gate; seed probabilities are not publicly exported. Different rating inputs also distinguish Roster Lab, team and league projections. Synthetic examples quantify these distinctions, not production prevalence. Label/baseline options remain for owner review; `UX-09`/`UX-11` contracts, `UX-25` actual-state prerequisites, `UX-05` formatting and `UX-18` placement still require their own direction. No production behavior or public copy changed; no follow-on tranche is authorized.
- **Audit scope:** Projected wins, expected wins, projected record, expected record, most-likely record, representative simulated season, base projection, playoff probability, division probability, and seed probability across public pages.
- **Invariant:** **Distinct mathematical quantities retain distinct labels.** Identically named quantities use the same canonical source; do not force different concepts to the same number.
- **Required artifact:** A semantic map containing quantity, definition, calculation source, current pages, and proposed desired public label. Separate expected values, marginal probabilities, modes, and representative realizations where the actual calculations warrant that distinction.
- **Dependencies:** Feeds/state evidence shared with `UX-09`; findings inform `UX-11` and Phase 2 numeric conventions. Map `UX-25`'s displayed odds separately from raw simulation probability and actual clinch/elimination state; do not collapse those quantities. Label proposals involving a product choice go to the owner.
- **Acceptance/next step:** Every public occurrence is mapped, inconsistent names/sources are identified, and proposed naming contracts are explicit. Related: [projection/application](assets/app.js), [V124 projection semantics](CHANGELOG_V124.md).

#### UX-11 — Playoff / division presentation semantics

- **Issue:** Representative simulated-season output can conflict visually with marginal probabilities, such as “Out” beside high playoff odds.
- **Audit:** Determine what controls row order, displayed seed, probability columns, leader chips, and representative-season visibility. Do not assume current ordering communicates a probability ranking.
- **Options to prepare:** Odds-first ordering with a most-likely-seed column; representative simulation as a clearly labeled secondary view; or another defensible presentation, with consequences for record/seed coherence.
- **Dependencies/non-goals:** `UX-10` semantic map and `UX-25`'s confirmed display bounds, gated by actual clinch/elimination rather than representative “Out”/seed results. Owner still chooses the presentation interpretation. Do not change simulations, probabilities, or tiebreak behavior to resolve the presentation issue. Preserve Out dimming as a visual constraint; it does not settle which view is primary.
- **Acceptance/next step:** Verified source map, confusing examples, and concrete alternatives for owner decision. Any proposed “Out”/seed presentation beside marginal odds must unmistakably label the different quantities. Related: [V124 representative season](CHANGELOG_V124.md), [playoff/application](assets/app.js).

#### UX-12 — Rounded / modal predicted-score ties

- **Audit:** Cases where displayed scores tie while line/win probability favors one side. Establish whether each displayed score is a mean, median, mode, rounded expectation, representative simulation outcome, or another statistic.
- **Initial reference:** [V149 changelog](CHANGELOG_V149.md) describes a representative score selected from simulated outcomes near the joint center. Verify the actual current path and examples rather than inferring from a generic “predicted score” label.
- **Dependencies/non-goals:** `UX-10` terminology and forecast source tracing. Do **not** manufacture a non-tied score for visual agreement with the favored side or alter probability/line calculations.
- **Acceptance/next step:** Reproducible cases, exact score-selection explanation, and product options for labels/disclosure. Owner decides the presentation contract before changes. Related: [application](assets/app.js), [score normalizer](model/score_normalizer.js), [V149 changelog](CHANGELOG_V149.md).

### Owner decisions

All entries in this group have **Decision status: OWNER DECISION; Execution status: PLANNED**. Phase 1 prepares alternatives; priorities beyond these dependencies are not assigned. `UX-14` and `UX-16` moved to Confirmed with their stable IDs after dated owner decisions; `UX-13`, `UX-15`, `UX-17`, and `UX-18` remain open. Preparing options does not authorize implementing one.

#### UX-13 — Color-system direction

- **Accepted problem:** Colors carry too many unrelated meanings.
- **Owner choices:** Distinct meanings for FORCE rating scale, Luck/FLAG context, positive/negative deltas, predicted winners, and interaction/brand accents; then palette choices.
- **Preserve/non-goals:** Dark visual identity and cyan brand character unless explicitly reopened. Do not choose a replacement palette autonomously.
- **Evidence/acceptance:** Semantic inventory, concrete palette/application options, accessibility/contrast evidence, and consequences. Record the owner's decision and date. `UX-23` confirms theme modes, not this exact rating/context palette; `UX-27`'s loader progression does not settle it either. Informs shared styles and `UX-05`; related: [brand guidance](BRAND_FORCE.md), [styles](assets/styles.css).

#### UX-15 — Public status / Update placement

- **Owner choices:** First-class navigation item; compact status surface; footer/status menu; or public secondary destination.
- **Dependencies/non-goals:** Feeds/refresh limitations must remain accurately communicated. `UX-01` cannot silently decide this while shrinking navigation.
- **Evidence/acceptance:** Concrete placement/access options and consequences, followed by a dated owner decision. Related: [application](assets/app.js), [deployment structure](DEPLOYMENT_STRUCTURE.md), [historical Update guidance](UPDATE_CENTER_V45.md).

#### UX-17 — Matchup comparative graphics

- **Owner choices:** Keep presentation-only donuts, replace with team-colored comparison bars, use another visualization, or remove them.
- **Dependencies/non-goals:** `UX-04` hierarchy and `UX-13` color semantics. Graphics are presentation-only; do not change model outputs or imply a new predictive contribution. This remains an open choice separate from `UX-27`'s confirmed loader direction.
- **Evidence/acceptance:** Comparable desktop/mobile options showing comprehension, space use, and accessible alternatives, then a dated owner decision. Related: [application](assets/app.js), [matchup-edge donut introduction](CHANGELOG_V73.md).

#### UX-18 — Market-blend visibility

- **Owner choices:** Game cards, tooltip/details, matchup, Method, or a combination for market weighting/sourcing.
- **Preserve/non-goals:** Do not reduce transparency without owner approval. Presentation choices must not change forecast weighting or benchmark claims.
- **Evidence/acceptance:** Surface inventory, disclosure alternatives, distinction between current/opening inputs and closing-line benchmark evidence, then a dated owner decision. Informs `UX-03`/`UX-04`/`UX-06`; related: [forecast overview](model/README.md), [application](assets/app.js).

#### UX-24 — Favorite-team personalization

- **Decision status: OWNER DECISION; Execution status: PLANNED; Priority: unset. Owner question recorded: 2026-10-01.** Evaluate whether a favorite-team selection should give non-semantic surfaces/background accents that team's visual identity. This is an experiment candidate, not implementation approval.
- **Guardrails if approved:** Do not recolor FORCE rating meaning, Luck/FLAG meaning, positive/negative semantics, or warnings/errors. Preserve accessibility; use safe fallback colors when team palettes have poor contrast.
- **Dependencies / next candidate:** `UX-23`'s confirmed accessibility themes and `UX-13`'s semantic families. Prepare concrete options, contrast/fallback evidence, and consequences for owner choice. Keep this separate from the four confirmed theme modes.

#### UX-31 — Expanded FORCE name: Rating vs Ratings

- **Decision status: OWNER DECISION; Execution status: PLANNED; Priority: unset. Owner question recorded: 2026-10-01.** Current expanded name: “Football Objective Rating & Comparative Efficiency.” Proposed alternative: “Football Objective Ratings & Comparative Efficiency.” Do not change the name yet.
- **Rationale/options:** Plural may better describe overall FORCE, offense/defense, unit, QB, and other normalized ratings while preserving the acronym. Singular may remain defensible as “the FORCE rating system.” The owner decides; `UX-16`'s prototype removal is not approval for renaming.
- **Acceptance / next candidate:** Inventory expanded-name usage, assess branding implications and the singular rationale, and prepare a recommended option with alternatives for owner decision. Related: [current name/brand guidance](BRAND_FORCE.md).

### Preserve

**Decision status: PRESERVE.** These are explicit constraints, not redesign tasks. Agents may refine them only when an authorized task explicitly calls for it:

- Dark navy visual identity.
- Inter typography.
- Cyan brand accent, subject to owner-approved semantic-color clarification.
- Real NFL team logos.
- Team-color card borders.
- FORCE number + bar when FORCE is the primary metric.
- FORCEcast Slate structure and strong mobile behavior.
- Rankings segmented view controls.
- Rankings sorting.
- Rankings search.
- Playoff “Out” dimming.
- Matchup strengths/weaknesses presentation.
- Per-page URLs.
- Clickable ranking rows leading to team pages.
- Roster Lab's immediate feedback behavior.
- Transparent presentation of model limitations and the market benchmark.

Related: [brand guidance](BRAND_FORCE.md), [team-logo history](CHANGELOG_V40.md), [forecast overview](model/README.md). These constraints do not pre-decide the owner-choice items above.

## Model design

Record design questions, evidence, competing hypotheses, validation requirements, and owner decisions before proposing model changes. Distinguish a data/display defect from a change in modeling judgment. The entries below preserve current-season behavior and bank a later review; further technical intake has no guessed priority or implementation authorization.

The Product / UX sequence does not authorize changes to current QB weights, scoring/stabilization, rushing floor, prior identity, team-room ownership, qualification, non-QB attribution, opponent/pressure/protection/recency formulas, 1.20 expansion, offense composite, FORCE bridge, FORCEcast, playoffs, Luck, or FLAG. Preserve the milestone's behavior unless an explicitly scoped task reopens it.

Known reference material: [predictive feature policy](PREDICTIVE_FEATURE_POLICY_V30.md), [returning-QB research](QB_REGIME_RESEARCH_V33.md), [forecast overview](model/README.md). Historical research questions require fresh applicability checks; they are not an accepted prioritized model backlog here.

### MD-01 — Preserve the current 2026 early-season taper

- **Decision status: PRESERVE; Execution status: n/a (constraint); Priority: unset. Owner working recommendation recorded: 2026-10-01.** This is an ongoing constraint, not an implementation task. Do not change a tested model mechanism merely because public launch timing changed. Preserve the current 2026 taper unless a dedicated empirical/model review establishes a reason and the owner authorizes a change.
- **Current source fact, not an assumed Week 7 cutoff:** [Application](assets/app.js) prefers `FORCE_RATING_CONTINUITY` for correction/prior-confidence signals; [index](index.html) loads [V99 rating continuity](model/rating_continuity.js). Its fade is zero in Week 1; full strength in Weeks 2–3; then 0.85, 0.70, 0.55, 0.40, 0.28, 0.18, 0.10, and 0.05 in Weeks 4–11; zero from Week 12. The realized correction also depends on observations and is not guaranteed to be nonzero each week.
- **Historical distinction:** [V34 early-regime detector](model/early_regime.js) has the legacy fade: full strength in Weeks 2–3, then 0.80, 0.55, and 0.30 in Weeks 4–6; zero from Week 7. It remains a fallback/research target. Some [unit-prior controller](model/unit_prior_controller.js)/application comments describe that older timing; the canonical V99 call path must not be mistaken for it. Do not rewrite those sources in this intake.
- **Observation machinery:** V34's observation machinery still feeds the canonical V99 continuity state; its legacy fade schedule, not that observation machinery, has been superseded by the V99 schedule. `early_regime.js` is not dead or removable merely because its fade schedule is legacy.
- **Boundary:** No launch-driven removal, Week 4 cutoff, formula change, or retuning is authorized. `MD-02` holds the later evidence review; its existence does not reopen this preservation constraint automatically.

### MD-02 — Later empirical early-season movement review

- **Decision status: INVESTIGATE; Execution status: PLANNED; Priority: unset; Timing: later dedicated empirical/model review.** Determine historical predictive benefit, Brier impact, calibration, week-by-week effects, and whether taper timing remains optimal.
- **Owner questions recorded 2026-10-01:** Remove now because FORCE is public; remove after Week 4; allow the existing taper to expire naturally; or retain/rework longer-term. The working recommendation is current-season preservation (`MD-01`), not a settled longer-term redesign.
- **Dependencies/non-goals:** Trace canonical V99 versus legacy V34 behavior, use causal/held-out validation and the [predictive feature policy](PREDICTIVE_FEATURE_POLICY_V30.md), and distinguish results from product-launch timing. Phase 1 may gather appropriate evidence only under separate authorization; this intake conducts no empirical review.
- **Acceptance / next candidate:** An evidence-backed comparison with uncertainty, alternatives, and owner decision on any longer-term change. Update findings without silently converting them to model implementation; retain the current taper until separately authorized.
### MD-03 — League-wide automatic QB-return correction

- **Decision status: CONFIRMED (requirement only); implementation design INVESTIGATE; Execution status: PLANNED; Priority: unset; prerequisite for `UX-19` public removal. Owner requirement: 2026-10-02.** "Any retained automatic QB-return correction must operate generally across teams/QBs and support midseason qualifying injury/return cases." The current V33 mechanism applies only through a hand-authored KC / Patrick Mahomes preset (`data/qb-carryover.js`); that is the current baseline, not an acceptable final state once the public manual tool is removed.
- **Required capability:** For any team and QB, establish the current starter, missed starts or meaningful absence, the replacement period, a verified return, qualifying replacement-window evidence, the surviving degradation attributable to that regime, a cap and decay, and suppression once current-season starter data suffice. Handle midseason and repeated episodes, and distinguish benching, permanent changes, trades, rookies/new starters and bye weeks. Incomplete or conflicting evidence yields no correction. Normal operation must not need a per-QB preset; presets may remain for research, override or exceptional manual validation.
- **Open questions (not decided):** Which source reliably identifies starts and participation, and whether an injury/absence source is required or regimes can be inferred safely from participation history. Distinguishing injury return from benching or permanent change. Correction/finality when starter data change after a game. Whether the V33 calculation generalizes, tested separately as event detection/eligibility, correction magnitude, decay/transition and unit-display overlay. Source policy applies: free first when adequate, a modest paid source only if no adequate free route exists, no large expense, no adoption without owner approval.
- **Dependencies/non-goals:** Causal, held-out validation under the [predictive feature policy](PREDICTIVE_FEATURE_POLICY_V30.md) and [returning-QB research](QB_REGIME_RESEARCH_V33.md). Does not authorize changing the current correction, its frozen tests or any data feed; no mechanism or source is selected. `UX-19` removal waits until this item is separately implemented, independently validated and accepted by the owner.
- **Acceptance / next candidate:** A separately authorized investigation answering the data and model questions, then owner direction, separately authorized implementation, and independent validation covering the cases in the [UX-19 plan, section 14](UX19_QB_RETURN_REMOVAL_PLAN.md): known offseason return, non-KC midseason return, in-season injury, worse and similar/better replacement, one missed game, benching, permanent change, rookie/new starter, a returning QB with immediate data, repeated episodes and no qualifying case. It must show no team/QB special casing, the same logic for all 32 teams, zero correction for nonqualifying teams, and midseason activation without code or data preset edits. After independent validation, owner acceptance is required before separately authorized UX-19 removal.

- **Data/event investigation evidence (2026-10-02, Cycle 5 `cycle5/codex-md03-data`, exact shared base `bd15a2c`; pending independent review):** [Investigation](MD03_QB_EVENT_DETECTION_INVESTIGATION.md) traces the hand-authored KC flags, inventories free-first starter/injury/participation/role sources with rights/freshness gaps, and records a pinned 12-window / eight-team / six-season retrospective sample. After bounded F1-F6 cross-review corrections (pending re-review), named-episode scoring finds six of eight documented injury returns in the crops under the strict injury-Out onset hypothesis; cause-free scoring finds all eight plus two non-injury false positives. Uncropped regular-season replay keeps the same targets/all competing events: injury-aware six of eight, cause-free seven of eight plus two false positives; unresolved role turnover misses the MIA thumb target. The prototype is WITHIN-SEASON ONLY and does not satisfy the complete MD-03 capability contract; cross-season continuity remains required/unimplemented and mixed-season input explicitly abstains. Broader retrospective model-cohort sensitivity is documented; its effect estimates cannot transfer unchanged to this detector population. Two open/ambiguous windows are separate; a real Carolina starter-source conflict blocks. All outputs deny production correction. These selected, overlapping windows are not population accuracy or magnitude evidence. Proposed episode/revision/finality contracts and 32-team, bye, repeated-episode, transaction/conflict/retraction tests are decision support only. No source, threshold, formula or production behavior is adopted; requirement CONFIRMED / design INVESTIGATE / execution PLANNED remain, and UX-19 remains unauthorized and blocked on implemented, independently validated, owner-accepted MD-03.

## Data semantics / provenance

**Future intake placeholder; priority unset.** Record source definitions, pinned input hashes, schema compatibility, cache identities, reproducibility evidence, and effects on historical/current comparisons. A semantic change must keep producers, consumers, reference provenance, and migration behavior coherent.

Known mechanism: the V5/`v149-all-play-v2` contract in [server](force_server.py), [Worker](src/index.js), [live model](model/live_profiles.js), and [seed helper](scripts/seed_v149_qb_reference.py). This completed mechanism is a baseline to preserve, not permission to regenerate data during unrelated UX work.

## Production / operations

**Future intake placeholder; priority unset.** Record deployment/recovery observations, public-versus-administrative boundaries, rollback/last-known-good requirements, and independently verified production status.

Use [deployment structure](DEPLOYMENT_STRUCTURE.md) and the current Worker/server implementation as mechanism references. Keep public refresh/security protections intact. A local commit, generated build, or mock migration test is not a production-verification record.

## Security assurance

### SEC-01 — Deep security assurance / alternating red-blue review

- **Decision status: CONFIRMED; Execution status: PLANNED; Priority: HIGH. Owner direction: 2026-10-01.** Comprehensive, independently challenged, evidence-backed hardening. **No claim of “proven secure.”** Security cannot literally be proven absolute.
- **Round authorization:** Each security round, and each subsequent alternating round, requires explicit owner authorization of its scope and environment. Round 1 uses Claude as red team and Codex as blue team; Round 2 reverses those roles. One authorized round does NOT automatically authorize the next; swapping Claude/Codex roles does NOT authorize another tranche. The owner controls whether another cycle begins.
- **Round handoff / stop:** At the end of each round, report the findings ledger, fixes/mitigations, regression evidence, and residual risk; recommend the next security round if useful; then **STOP for owner direction**. The overall closeout goal is resolved material findings, regression coverage, and both independent reviewers eventually reporting no unresolved material findings within the declared scope. Report explicitly untested/unprovable areas rather than implying absolute assurance.
- **Minimum scope:** Worker/API attack surface; Durable Object storage; internal container namespace; public/internal trust boundaries; refresh/migration paths; input parsing; XSS and HTML/script injection; query/path manipulation; cache poisoning; CORS; security headers; secrets/config leakage; SSRF-style paths; request-smuggling assumptions where relevant; dependency/supply-chain exposure; public debug/admin endpoints; denial-of-service/resource exhaustion; oversized requests; repeated refresh/rebuild attempts; stale-cache/schema manipulation; static/generated asset assumptions; unsafe upstream-feed trust; information disclosure; authorization bypass; and internal endpoint reachability.
- **Testing safety:** Production probes require explicit owner approval for that specific cycle and must be bounded and non-destructive; an agent's assessment that a probe is safe does not authorize it. DoS, resource-exhaustion, oversized-request, rebuild-storm, destructive, or availability-impacting testing must run only against local/scratch/staging environments.
- **Evidence / acceptance:** Threat model, attack-surface inventory, findings ledger, severity, safe reproduction/exploit evidence, mitigation/fix, regression test, residual risk, and untested/unprovable areas. Both reviewers' independent closeout evidence is required; historical audit claims or one review alone do not meet this cycle's criteria.
- **Dependencies / next candidate:** Establish the bounded scope and safe environment from [deployment boundaries](DEPLOYMENT_STRUCTURE.md), [Worker](src/index.js), [server](force_server.py), and [testing guide](scripts/TESTING.md). Security may proceed under separate authorization before UX completion; it is not a visual-redesign subtask. This roadmap intake launches no audit, probes, reviewers, or fixes.

## Testing

**Future intake placeholder; priority unset.** Existing testing debt is documented in [testing guide](scripts/TESTING.md) and [catalog](scripts/test_catalog.json): 112 default exclusions, including 102 historical assertion/fixture failures and special cases. Exclusion does not mean pass, and this roadmap does not automatically authorize repairing all excluded tests.

Preserve the repaired isolated runner. For an authorized tranche, select checks appropriate to the change using the guide, classify new tests explicitly, verify worktree hygiene, and distinguish relevant regression failures from historical debt without weakening assertions to obtain a pass.

## Performance / reliability

**Future intake placeholder; no accepted item or priority yet.** Capture measured latency, responsiveness, memory/cost, freshness, concurrency, or recovery evidence with environment and baseline. Distinguish product responsiveness from model correctness before proposing a remedy.

Reference current [snapshot/release tests](scripts/TESTING.md) and [deployment boundaries](DEPLOYMENT_STRUCTURE.md); do not assume an optimization is necessary without measurement.

## Documentation

**Future intake placeholder; priority unset.** Record stale/conflicting guidance, missing public definitions, and documentation ownership. The earlier-version README/model overview noted above is a known documentation gap for owner intake, not an authorized rewrite in this task.

Keep this roadmap directional. Technical mechanisms belong in their appropriate docs/source, release details in version history, and public explanation choices in the authorized copy workstream.

## Research / validation

**Future intake placeholder; priority unset.** Record hypotheses, evaluation populations/windows, causal input timing, baseline/candidate results, uncertainty, and promotion decisions. Do not present exploratory results as shipped predictive claims.

Use [predictive feature policy](PREDICTIVE_FEATURE_POLICY_V30.md), [research sources](research/README.md), and the relevant versioned research document. Preserve the distinction between independent ratings and market-aware forecasts, including benchmark limitations.

## Shared product / UX principles

- **Primary metric first:** In dense views, **Rank · identity · page-primary metric** occupy stable, easy-to-find positions. Secondary context must not displace the page's subject.
- **Baseline honesty:** A control, lab, or scenario reproduces the state it claims as its baseline. If it uses another baseline, label that state explicitly.
- **Semantic consistency:** The same public label means the same mathematical quantity and canonical source. Different quantities receive different labels.
- **Progressive disclosure:** Concise default presentation; tooltips/details for explanation; Method/product education for high-level guidance. Preserve deeper mechanics in internal documentation or an owner-approved future deeper layer. Retain transparency without dumping implementation prose into every card; actual public explanation removals require `UX-14`'s approved inventory and market placement remains subject to `UX-18`.
- **Responsive hierarchy:** Mobile adapts information hierarchy rather than merely inheriting desktop horizontal scrolling. Preserve the page's answer first, then reveal secondary information.
- **Evidence before retuning:** Identify display bugs, state/source mismatches, intentional alternate calculations, and genuine model decisions before selecting a remedy. Do not retune as a shortcut for presentation inconsistency.

The accepted shared principles also include intentional viewport/brand use (`UX-28`), metric-relative sorting (`UX-29`), and first-class mobile access (`UX-30`). Their authoritative contracts are the items above; theme modes and human-language voice are similarly defined once in `UX-23` and `UX-20`.

## Roadmap item template

Use stable IDs and this format for material additions; compact polish sub-items may omit fields that add no value.

```text
ID / short name:
Decision status: CONFIRMED / INVESTIGATE / OWNER DECISION / PRESERVE
Execution status: PLANNED / IN PROGRESS / REVIEW / COMPLETE / DEFERRED
Priority: owner-assigned, sequence prerequisite, or unset
Problem / opportunity:
Evidence: reproduction, snapshot/date, measurements, source trace
Desired invariant / outcome: identify proposals versus decided contracts
Dependencies:
Non-goals:
Acceptance criteria:
Owner decisions required:
Recommended next step: candidate, not automatic authorization
Related files/docs:
Completion note: date, release/commit, result, evidence, follow-ups
```

Preserve original IDs when descriptions evolve. Add resulting implementation work separately from the investigation/decision record so evidence and product choice remain traceable.

## Completion and roadmap maintenance

A tranche is complete when its explicitly authorized deliverable and acceptance criteria are satisfied; appropriate tests/evidence and limitations are reported; any required review is resolved; relevant preservation constraints and non-goals are checked; and the final changed-file/worktree state is disclosed. Implementation work checks source/generated parity when applicable; documentation-only work does not require regenerating production assets. A tranche must not claim completion while its required work remains unresolved.

At handoff:

- Record execution state, completion date, release/commit when available, short result, verification evidence, and follow-ups. Use “uncommitted” or “deployment unverified” when that is the actual state.
- Identify items now unblocked and recommend next candidates without beginning them.
- Do not delete completed history immediately. Move older completed entries to the compact history section or a linked changelog when needed for readability.
- When an investigation resolves a question, update its original finding and decision state as appropriate, keeping unresolved choices explicit. Add any resulting implementation item separately; findings alone are not owner approval.
- When the owner decides, record the decision/date and evidence, convert the chosen direction into a `CONFIRMED` implementation item, and briefly retain useful rejected alternatives to prevent unsupported reopening.
- When work is deferred, record the owner's reason and revisit condition. Do not invent dates or priorities.
- Report newly discovered candidate work in the tranche handoff: identify it, classify it, recommend whether it belongs in roadmap intake, and explain urgency/dependencies. Add it directly to `FORCE_ROADMAP.md` only when the active prompt explicitly authorizes roadmap/documentation edits; an unrelated coding tranche must not silently mutate the roadmap. Stop for owner direction before a new tranche.

## Completed / history

| Date | Milestone | Execution status | Result / evidence | Follow-up |
| --- | --- | --- | --- | --- |
| 2026-10-01 | `main @ 8d72a03`, “Fix FORCE QB correctness and migrate V5 reference” | COMPLETE — repository milestone; production deployment not certified by this document | QB semantics, V5 reference/migration, ANY/A, Raw display, and repaired test infrastructure. Recorded verification: 134 safe, 16 release, 25 QB, and 6 snapshot tests passed; historical V4 reproduced and V5 provenance preserved. See baseline and technical references above. | Product / UX audit sequence remains planned; none of its choices were implemented by this milestone. |
| 2026-10-01 | `codex/roadmap-lane @ 485c976` from `8fc1f87`: `UX-08` investigation/tooling | Investigation/tooling merged to `main @ 0f41552f`; execution REVIEW, decision INVESTIGATE | Canonical [reproducible audit and decision brief](UX08_QB_CUSTOMIZE_AUDIT.md), offline tooling and behavioral regression; lane verification: 135 safe and 26 QB passed. | Reciprocal review: B ACCEPT WITH NON-BLOCKING NOTES. No production QB behavior changed. Owner must choose the Customize contract and separately authorize any follow-on implementation. |
| 2026-10-01 | `claude/roadmap-lane @ 8a91d6b` from `8fc1f87`: `UX-16` prototype-positioning removal and `UX-14` public explanation inventory | Merged to `main @ 0f41552f`; UX-16 COMPLETE and deployed; UX-14 inventory/approval completed, content PLANNED | Prototype badge/footer/About warning removed with regression test; canonical inventory and owner disposition in [UX14_PUBLIC_EXPLANATION_INVENTORY.md](UX14_PUBLIC_EXPLANATION_INVENTORY.md); lane verification: 135 safe, 25 QB and 16 release passed. | Reciprocal review: B ACCEPT WITH NON-BLOCKING NOTES. Owner live smoke check passed. `UX-14` content tranche not started or authorized; existing gates remain intact. |
| 2026-10-01 | First parallel-roadmap cycle: `integration/roadmap-lanes @ 0f41552f` from exact `8fc1f87`, preserving reviewed `485c976` and `8a91d6b` histories | COMPLETE — integration tip reached `main` and `origin/main`; Cloudflare deployment succeeded; owner live smoke check passed | [Integrated test counts/results](scripts/TESTING.md): 136 safe, 26 QB, 44 model and 16 release passed in LF scratch; both new focused regressions passed. Final bounded audit-document correction included. Normal public build unchanged; 34 unique IDs and all local roadmap references verified. Merge/push/deployment/live-check outcomes confirmed by the owner; deployment identifiers below. | Cycle closeout does not resolve the `UX-08` contract or any other open gate. `UX-14` public-content implementation remains PLANNED and unstarted. Any next tranche requires separate owner direction. |
| 2026-10-01 | Cycle 2 `cycle2/codex-analysis` from exact `e7f0895`: `UX-10` projection semantics investigation/tooling | REVIEW — final independent review accepted; merged to local `main @ e264db7` (`b1768ca` + `d9c3b97`); not deployed | [Semantic map, synthetic examples and owner options](UX10_PROJECTION_SEMANTICS_AUDIT.md); offline real-path diagnostic and rendered-cell/coherence regression. Verification: 137 safe, 45 model and 16 release passed in LF scratch; focused regression, syntax and diff checks passed. Production/model/generated sources unchanged. | Decision remains INVESTIGATE. `UX-09`/`UX-11` interpretation, `UX-25` actual-state source, naming/baseline options and all other owner gates remain open. No follow-on work authorized. |
| 2026-10-01 | `cycle2/claude-product` from exact `e7f0895`: `UX-14` content tranche A (R1–R9, D3, D4, D7) | REVIEW — final independent review accepted; merged to local `main @ e264db7` (`82400c4` + `1ac894c`); not deployed | Approved removals implemented with plain-English R3–R5 status messages; internal detail retained in diagnostics/localhost. New `test_ux14_public_explanations.mjs`; safe 137, release 16, QB 26, model 44, snapshot 6 passed; desktop/mobile checks recorded in `UX-14`. | Final independent review accepted A. READY TO MERGE TO MAIN; owner-authorized local main merge recorded. Push/deployment require separate authorization. D1/D2 (`UX-08`), D5/D6/D8/D9 (`UX-18`), D10 (`UX-19`) and section C simplification remain PLANNED. |
| 2026-10-02 | Cycle 2 integration-discovered FLAG EPA/WPA null-display correction, separately owner-authorized after pure integration `ce8fba6` | REVIEW — bounded correctness correction accepted in final independent review and merged to local `main @ e264db7`; not deployed | Team FLAG card and adjacent rankings EPA/WPA cell use the existing unavailable placeholder for missing/non-finite inputs while preserving measured zeroes and finite formatting. [Focused behavioral regression](scripts/test_flag_penalty_values.mjs) covers both renderers and unchanged current ratings; [verification](scripts/TESTING.md). No penalty calculation, acquisition or ranking/scoring change. | This is not a new roadmap tranche. `UX-10` remains REVIEW / INVESTIGATE; `UX-14` tranche A remains REVIEW and remaining content PLANNED. Header/raw-error/mobile/provider issues and owner gates remain deferred/open. |
| 2026-10-02 | Cycle 3 `cycle3/codex-analysis` from exact `093bd734`: `UX-25` actual-state sourcing feasibility | REVIEW — investigation `6f03f4e` + correction `97ed745`; reciprocal review/corrections and final independent review accepted; merged to local `main @ 840e53b1`; not pushed or deployed; display implementation PLANNED | [Source trace, synthetic tiebreak boundary, complexity/coverage evidence and strategy comparison](UX25_POSTSEASON_STATE_SOURCING.md); offline diagnostic/regression and validation in the artifact. | Source strategy, authority, coverage and unknown/stale-state presentation remain for owner direction. No actual-state gate, solver, feed or formatter implemented. |
| 2026-10-02 | Cycle 3 `cycle3/claude-product` from exact `093bd73`: `UX-14` content tranche B (section C groups 1, 2, 3, 5 and C1 for the rankings FLAG view) | REVIEW — tranche `2f2346e` + correction `c09fddc`; reciprocal review/corrections and final independent review accepted; merged to local `main @ 840e53b1`; not pushed or deployed | Luck weights, provider names, blend percentages and "Monte Carlo" replaced with approved concepts; limitations and representative-versus-every-simulation distinctions kept. New `test_ux14_tranche_b.mjs`; LF safe 140, release 17, QB 26, model 45, snapshot 6, server 30 passed; public build parity; desktop/mobile checks recorded in `UX-14`. | Groups 4, 6 and 7, remaining C1, D1/D2 (`UX-08`), D5/D6/D8/D9 (`UX-18`) and D10/`UX-19` remain PLANNED. `UX-19` still needs its public-removal plan before removal. |
| 2026-10-02 | Cycle 3 `cycle3/integration @ 840e53b1` from exact `093bd734`, preserving both reviewed lane histories and corrections | Final independent review accepted A. READY TO MERGE TO MAIN; owner-authorized fast-forward to local `main`; not pushed or deployed | Local merge recorded; [post-merge verification](scripts/TESTING.md). `origin/main` remains at `093bd734`; synchronization requires separate authorization. | UX-25 investigation and UX-14 tranche B remain REVIEW; display/follow-on work stays PLANNED or gated. No source strategy or other owner decision selected; deferred findings N1–N6 remain untouched. |
| 2026-10-02 | Cycle 4 `cycle4/claude-product` from exact `a5f5557`: `UX-19` public QB-return removal plan | REVIEW — planning only; final independent review accepted; merged to local `main @ 681a961`; not pushed or deployed; removal PLANNED | [Removal plan](UX19_QB_RETURN_REMOVAL_PLAN.md): surface inventory, removal matrix, retained capability, persisted-state trace, disclosure and D10 options, test impact, acceptance tests. Documentation only; no production, model, data, test or generated file changed. | Owner decisions O1-O5 recorded 2026-10-02 and cross-review corrections applied. Public removal is now blocked on the new `MD-03` league-wide QB-correction prerequisite (owner requirement 2026-10-02); separate authorization still required. Baseline inconsistencies reported for `UX-09`/`UX-10` intake. |
| 2026-10-02 | Cycle 4 `cycle4/codex-analysis` from exact `a5f55575`: `UX-25` free-first source contracts | REVIEW — bounded investigation; display implementation PLANNED | [13-source outcome/access/price matrix and proof obligations](UX25_SOURCE_CONTRACT_INVESTIGATION.md); independent-review F1–F8 evidence corrections, pinned offline coverage/proof/price validation and mutation regressions. | No source strategy or owner choice selected; adequate free production coverage, paid affordability and correction/finality contracts remain unverified. Final independent review accepted; merged to local `main @ 681a961`; not pushed or deployed. No production change. |
| 2026-10-02 | Cycle 4 `cycle4/integration` from exact `a5f55575`, combining Claude `bb73001` and Codex `dba8573` with complete reviewed histories | Final independent review accepted A. READY TO MERGE TO MAIN; owner-authorized fast-forward to local `main @ 681a961`; not pushed or deployed | Both Cycle 4 histories retained; current roadmap has 35 unique authoritative IDs, including `MD-03`. Roadmap history conflict retained both lanes; local closeout clarifies the existing owner-acceptance gate, still-open MD-03 design and observed ESPN field wording. | UX-19 plan REVIEW, public removal PLANNED/not authorized/BLOCKED on separately implemented, independently validated and owner-accepted MD-03; MD-03 requirement CONFIRMED, design INVESTIGATE, execution PLANNED. UX-25 research REVIEW, display PLANNED, UX-11/source/budget decisions open. No follow-on authority. |

Owner-confirmed production deployment for integration tip `0f41552f4126b67bd2887d791fdbebb57040c650`: Worker Version ID `20315d1d-62ca-4238-b76b-ee4443c37c06`; container digest `sha256:2531332f85fcf61c4942d1a50d0b14672d1086825fd81380e427f20e09826e00`.

This is a starting marker, not a replacement for the versioned changelogs. Future entries should link the actual completion/release evidence and distinguish local completion from production verification.

### Owner direction intake — 2026-10-01

This records decisions and accepted requirements only. At intake, resulting work was `PLANNED`; no implementation was marked complete by that intake. Subsequent item-level progress is recorded in the authoritative entries, alongside outcomes, dependencies, gates, and prior context.

| Owner decision / accepted requirement | Authoritative item(s) | Decision record |
| --- | --- | --- |
| FORCE is no longer a prototype; remove prototype positioning | `UX-16` | Resolved: remove; keep brand, do not substitute a misleading maturity label. Previous keep/rename options are superseded. |
| Remove public QB adjustment/QB-return tool | `UX-19`, revised `UX-09` scope | Resolved public removal; preserve useful internal data/logic/diagnostics. |
| High-level public methodology; inventory and owner approval before explanation removal | `UX-14` | Depth direction resolved; the specific removal/simplification inventory was owner-approved on 2026-10-01 with conditions recorded in `UX-14`. Implementation still requires a separately authorized tranche. Internal technical documentation remains. |
| Human-language public voice | `UX-20`, supplements `UX-06` | Confirmed customer-facing standard; deeper/internal terminology remains available. |
| Deterministic football narratives and public product education | `UX-21`, `UX-22` | Confirmed outcomes; narrative thresholds/templates and education name/placement remain design work. |
| Dark/Light and both high-contrast variants | `UX-23` | Theme modes confirmed; exact semantic palette and favorite-team personalization are not selected. |
| 1%/99% display bounds until actual elimination/clinch | `UX-25` | Confirmed presentation rule; simulation probabilities unchanged. |
| Football-plausible representative quarters | `UX-26` | Outcome confirmed; exact generation strategy remains open. |
| Red → yellow → green loader, approximately 3-second progression | `UX-27` | Confirmed; preserve minimum-time and required-readiness exit gates. |
| Larger brand presence and intentional viewport use | `UX-28` | Confirmed alongside compact mobile headers and breathing room. |
| Universal sorting with selected-metric rank | `UX-29` | Confirmed common table behavior; do not give non-metric fields quantitative rank meaning. |
| First-class mobile experience | `UX-30` | Confirmed initiative; bottom navigation and exact destinations remain open. |
| Current-season taper preservation pending empirical review | `MD-01`, `MD-02` | Preserve current canonical V99 behavior; longer-term changes remain undecided. |
| Deep security assurance workstream | `SEC-01` | Confirmed HIGH priority, independent review cycles and evidence requirements; no absolute-security claim. |

**Still open:** `UX-13` exact semantic color palette; `UX-15` public status/Update placement; `UX-17` matchup comparative graphics; `UX-18` market disclosure placement; `UX-24` favorite-team theme; `UX-31` Rating vs Ratings; `UX-30` exact mobile navigation/destinations; `UX-26` quarter-generation strategy; `MD-02` longer-term taper changes; and `MD-03` league-wide QB-correction design. `UX-08`–`UX-12` remain investigations, not decisions to force matching numbers. `UX-14`'s removal inventory is owner-approved (2026-10-01); content tranches A and B passed final independent review and are merged to local `main` (not deployed); the remaining approved content still requires separately authorized tranches.

## Candidate recommendations / intake

**Candidate recommendations are NOT authorized roadmap work until accepted by the owner.** Agents should report newly discovered candidate work, evidence, classification, and urgency/dependencies in the tranche handoff. Add it directly to this intake section only when the active prompt explicitly authorizes roadmap/documentation edits. Permission to record a candidate does not authorize implementing it.

Use this compact proposal format:

```text
Candidate title:
Why it surfaced:
Evidence:
Suggested category: CONFIRMED / INVESTIGATE / OWNER DECISION / PRESERVE
Dependency / urgency: supported evidence; otherwise unset
Blocks current authorized work: yes/no, with reason
Owner disposition/date: pending, accepted, rejected, or deferred
```

The 2026-10-01 owner additions are accepted direction in the authoritative items above, with open choices explicitly retained; they are not unreviewed agent candidates or implementation authorization. Historical audit recommendations and newly noticed documentation gaps still require owner intake rather than automatic promotion. Phase 1 evidence/options preparation and the independently bounded HIGH-priority security workstream are legitimate next candidate areas; an agent must wait for an explicit prompt to begin either. This task banks direction only and does not start an investigation or implementation.
