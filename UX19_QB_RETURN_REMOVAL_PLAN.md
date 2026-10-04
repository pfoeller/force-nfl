# UX-19 public QB-return tool removal plan

Roadmap item: `UX-19` (remove public QB adjustment / QB-return tool). Decision status CONFIRMED (owner, 2026-10-01). This document is the planning prerequisite named in the item's acceptance contract: "a bounded public-removal plan identifying retained internal capability, followed by separately authorized removal."

**This document is a plan; it removed nothing itself.** On 2026-10-03 the owner resolved N1 as option (a) and separately authorized UX-19 implementation (MD-03 step F) under this reviewed plan. The removal is implemented on `cycle6/claude-ux19-removal` from exact `fe09e67` (`f562928`, `7dc67e8`, corrections `538a4d9`); independent implementation validation PASSED and the owner ACCEPTED the implementation on 2026-10-04. The accepted Cycle 6 chain is integrated onto local `main @ cb80c827` on 2026-10-04; not pushed or deployed. UX-19 execution is COMPLETE under the roadmap acceptance/review taxonomy. Sections 1-3 and 5-12 describe the pre-removal state at `fe09e67` and the removal boundary, and are kept as written apart from N1 and status.

## 0. Revision history and current baseline

- **First version (2026-10-02, Cycle 4, `cycle4/claude-product` from `a5f5557`)**, corrected after Codex cross-review and the owner's O1-O5 decisions. It assumed the automatic V33 QB-return correction would stay, and later recorded a superseded league-wide `MD-03` prerequisite. That version is preserved in git history (for example at `8e6a180`).
- **This revision (2026-10-03, Cycle 6, `cycle6/claude-md03-retirement` on top of `8e6a180`)** rewrites the plan for the accepted no-automatic-correction state. The owner accepted the `MD-03` retirement at `8e6a180` on 2026-10-03 after Claude implementation and evidence, Codex independent full validation, Claude's bounded correction of three review findings, and a Codex targeted re-review ("A. CORRECTIONS VERIFIED — READY FOR OWNER ACCEPTANCE"). See [MD-03 retirement implementation](MD03_RETIREMENT_IMPLEMENTATION.md) and `MD-03` in the [roadmap](FORCE_ROADMAP.md). That retirement is a decision under uncertainty, not a finding that QB-return effects are zero; the research is preserved for possible reconsideration.

Line numbers below refer to `8e6a180` (`assets/styles.css` is unchanged since `a5f5557`). Function names are authoritative if lines drift.

**Accepted production baseline this plan is written against:**

| Area | State at `8e6a180` |
| --- | --- |
| Automatic correction | None. No automatic eligibility, no decay, no automatic current, historical (V69) or V99 Week-2 correction. `assets/app.js` no longer reads `model/qb_regime.js` or the `qbCarryover` gate; legacy `autoEligible:true` or an accepted gate, alone or together, cannot reactivate it (`scripts/test_md03_retirement.mjs`). |
| Manual what-if | Still public and functional. A visitor explicitly applies a value (QB Return Lab Apply, or a quick button for a preset team). It changes applicable current ratings, forecasts and projections, never historical canonical states. State is in-memory only (`S.qbCarryover`, app.js:307, initializer `enabled:false`). The pre-existing scope quirk stays: a manual value for a team without a preset changes only that team page. Status language is MANUAL/OFF. |
| Research | V33 rule, `model/qb_regime.js`, `data/qb-carryover.js` values (including the former 15.75 Elo initial restore), `QB_REGIME_RESEARCH_V33.md`, `QB_CARRYOVER_RESEARCH*.md`, `research/` and the Cycle 5 MD-03 investigations are preserved as evidence only. Nothing in research implies production activation. |
| Public copy | Already truthful: the Lab and Method say FORCE applies no automatic QB-return correction, research is preserved, and a manual what-if is available on team pages. |

## 1. Summary

- The public tool is now the **only** source of any QB-return correction in production. With no manual value set, every rating, forecast, projection, page and export equals the canonical no-correction state.
- It has two entry points: the **QB Return Lab** panel on every team page and the **QB quick button** (`quickQbButton`) on home, rankings, teams, team hero and matchup hero. Every other public QB-return element only displays a manual value.
- Removing every public writer of `S.qbCarryover` therefore makes all remaining QB-return display paths unreachable in production. The plan removes those displays too, rather than keeping dormant public markup.
- The manual state is global while set (one click on the KC button raises KC by the +47.3 Elo preset on rankings, matchups, playoffs and exports until Reset or reload) and incoherent for the 31 teams without a preset. Both remain reasons for removal.
- **QB Rankings Customize (`UX-08`)** shares no state or handler with the tool (section 2).
- Internal, research and test capability is kept where it is safely isolated (section 5). Roster Lab shares no QB-return primitive (section 5.2).

## 2. Concepts and shared code

| Concept | What it is | State | Code that is only this concept | Code shared with another concept |
| --- | --- | --- | --- | --- |
| **A. Public manual QB-return tool (UX-19 target)** | Visitor-set Elo restore for one team | `S.qbCarryover = {enabled, team, qb, restoreElo}` (307). Public writers: Lab Apply (5454), Lab Reset (5458), quick-button handler (5460-5469). | `quickQbButton` 1286-1294; `qbCarryoverPanel` 1300-1345; handlers 5446-5470; tool-only CSS (section 8.2) | The internal manual chain in B |
| **B. Internal manual-override chain (retained, O4)** | Applies a manual value when `S.qbCarryover` is set; otherwise identity | `S.qbCarryover` | `effectiveQbCorrection` 1235 (manual or 0), `qbCarryoverActive` 1261, `ratingsWithQBCarryover` 1268, `ratingsWithActiveQBCarryover` 1277, `qbCarryoverUnitEffect` 1966, `suppressQbUnitScenarioOverlay` 1253, `currentTeamState._qbScenario` 2000-2028, `qbCarryoverPreset` 1224 | `LP.applyQbCarryoverScenario` (live_profiles.js:508, pure transform, also used by V27/V28 research tests); `ratingsWithActiveQBCarryover` is the ratings source for home, rankings, teams, matchups, playoffs, divisions and slate; `currentTeamState` feeds every "current" view, `qbDebug` and `ratingLedger` |
| **C. Retired automatic V33 correction (research only)** | V33 rule kept as a record | `data/qb-carryover.js` (preset not auto-eligible), `qbCarryover` gate `retired-md03-cycle6`, weight 0 | `model/qb_regime.js` (loaded by `index.html`, called by nothing in production) | None in production |
| **D. QB Rankings Default and Customize (UX-08, separate gate)** | Default ranks the displayed QB value; Customize ranks a visitor-weighted composite | `S.qbRankingMode`, `S.qbWeights` | `qbCustomRawScore`, `qbCustomScore`; `[data-qb-mode]`/`[data-qb-weight]` handlers | Both read `qbDebug` via `qbComponentScores` (4087). Default reads `displayedQbIndex`, which equals the measured value unless a manual unit overlay is set. Customize uses measured component scores and never the overlaid value. |

**Where A and B meet.** Every public effect of A flows through B. Removing A's writers leaves B as an identity in production; B stays because O4 keeps it and because tests drive it (section 5).

**Existing reset/name-fallback coupling (recorded, not fixed).** Lab Reset only sets `enabled:false` and keeps `team`, `qb` and `restoreElo`; `qbCarryoverUnitEffect` labels an overlay with `qbOverride || S.qbCarryover.qb || preset.qb`. With no automatic overlay this only matters for internal manual use. Fixing it is out of scope.

## 3. Current public surface inventory (`8e6a180`)

"Public" means rendered on forceratings.com. KC is the only team with a preset. Every display surface below fires only while a manual value is set.

| # | Surface | File / function | User-visible behavior | State | Concept |
| --- | --- | --- | --- | --- | --- |
| S1 | Home, FORCE Rankings card header | `home` 4026 → `quickQbButton('KC')` | KC button "Apply QB fix" / "Clear QB fix". Visible at all widths, shrunk under 650px | reads; click writes `S.qbCarryover` | A |
| S2 | Home, top-8 rank rows | `home` 4019 `.home-qb-fix` | Same button in the KC row when KC is top 8. Hidden under 950px | same | A |
| S3 | Rankings Strength, FLAG, Advanced | `rankingHeader` 3378-3386, `rankingRow` 3392 | "QB return" column; KC cell holds the button, others show "-". Not on Luck or Units | same | A |
| S4 | Teams directory cards | `teams` 4170 | Button under the KC card | same | A |
| S5 | Team hero, quick button | `teamPage` 4190 | KC: button with detail line. Every other team: "No verified QB-return preset" | same | A |
| S6 | Team hero, overlay chip | `teamPage` 4188-4190 | "QB manual +N Elo" and struck-through base Elo while manual is set | reads `effectiveQbCorrection` | A display |
| S7 | Team hero, record line | `teamPage` 4191 | "· base projection N wins" while manual is set | same | A display |
| S8 | QB Return Lab panel | `qbCarryoverPanel` 1300-1345, on every team page (4197) | MANUAL/OFF chip, explainer, preset paragraph or "No preset for this team…", QB select, 0-80 Elo slider, Apply/Reset, before→after results, "Historical research, manual what-if" warning | reads/writes `S.qbCarryover` | A |
| S9 | Matchup hero | `matchupPage` 3938, 3940 | Button under the KC side | same as S1 | A |
| S10 | Matchup prediction note | `matchupPage` 3930, 3980 | "returning-QB adjustment active" when either side has a manual unit overlay | reads `_qbScenario` | A display |
| S11 | Matchup duel and QB notes | `scenarioMetricNote` 2249-2261; overlay QB name in matchup QB lines | "QB-return scenario · was N"; overlay QB name | reads `_qbScenario` | A display |
| S12 | Rankings Units QB tooltip | `rawUnitCell` 2518-2523 | `title` "Displayed QB includes returning-QB scenario overlay: …" | reads `_qbScenario` | A display |
| S13 | Unit cells / team unit board | `unitCell` 2275; `unitBoardRow` 2560-2564 | "N base" sub-values; "N base · QB-return scenario" | reads `_qbScenario` | A display |
| S14 | QB Rankings FORCE Default column | `qbRankingsPage` 4137 | Shows `displayedQbIndex` (includes a manual overlay while set) | reads `currentTeamState` | D reading A |
| S15 | Method, "QB return correction" section | `model` 4290-4299 | Paragraph (historical research, no automatic correction applied, research kept), three historical V33 evidence KPIs, STATUS card "NOT APPLIED" / "No automatic correction; manual what-if available on team pages." | none | research note plus A clause |
| S16 | Method, forecast inputs | `model` 4317 | "core team rating and validated betting-market information" (already has no QB-return clause) | none | none |
| S17 | Teams intro | `teams` 4166 | "Rating, context, schedule, and what-ifs." | none | A wording |
| S18 | Home hero / About positioning | home, About | "roster what-ifs" | none | Roster Lab, not A |
| S19 | PNG export | `exportCurrentPagePng`, `prepareCloneForSocialExport` 5146 | See section 8.3 | DOM | A |
| S20 | Accessibility / keyboard | S1-S5, S8, S9 | Quick buttons and Lab controls are tab stops; buttons carry only a `title` | n/a | A |

Not public: console hooks `FORCE_QB_DEBUG` (2434), `FORCE_CURRENT_TEAM_STATE` (2030), `FORCE_RATING_LEDGER` (2431), `FORCE_CANONICAL_GAME_TEAM_STATE`, and test-harness writes to `S.qbCarryover`. `qbDebug` exposes `qbRegimeCorrection`/`scenario` fields, which are null unless a manual value is set.

## 4. Owner decisions

### 4.1 Earlier decisions (2026-10-02) under the accepted retirement

| # | Original decision (summary) | Status after retirement |
| --- | --- | --- |
| O1 | Keep and reword team-level **automatic**-correction disclosures (hero chip, base projection, matchup disclosure, unit notes) | **SUPERSEDED.** Its premise, an active automatic correction to disclose, no longer exists. With no automatic correction and no public manual writer, these surfaces can never fire in production, so the plan removes them (section 8.1). |
| O2 | D10-b: detailed rationale in Method and research, short team-level statement via O1 when a correction is active | **SUPERSEDED** for the team-level statement (nothing is ever active). What remains public after removal is the Method question in 4.2. |
| O3 | Method status card copy "Used only in verified cases, and it fades as the starter plays." | **SUPERSEDED.** It would be false. The retirement already replaced the card with "NOT APPLIED". |
| O4 | Keep `S.qbCarryover` and the internal manual-override branch, unreachable from public UI; no new public or localhost setter; do not delete frozen research/debug machinery | **STILL APPLIES** and already answers the internal-preservation question (section 5). Its old clause about keeping the automatic V33 correction as the current baseline is moot: the automatic correction is retired, and its research record is kept. |
| O5 | Teams intro target wording "Ratings, context and schedule." | **STILL APPLIES.** |

### 4.2 Owner decision before UX-19 implementation (resolved)

- **N1. Method "QB return correction" section after public removal. RESOLVED 2026-10-03: option (a).** Owner wording target: "QB return adjustment. FORCE does not apply an automatic QB-return adjustment. Historical testing found a small effect that varied depending on which cases were included, so the automatic correction was retired. The research is preserved for future evaluation." Detailed historical KPIs stay in technical docs. Original framing, kept for the record: existing direction did not settle it: D10 assumed a retained automatic correction, and the UX-14 "simplify public" direction prefers concepts over research numbers. Options:
  - (a) **Recommended:** keep a short public note that FORCE applies no automatic QB-return correction and that earlier research is preserved; remove the "manual what-if available on team pages" clause; move the three historical V33 KPIs to technical docs only.
  - (b) Keep the section as today minus the manual clause, including the historical KPIs.
  - (c) Remove the section entirely; the topic lives only in technical docs.

  Whatever is chosen, the implementation removes the manual clause in the same change that removes the tool, and updates `test_ux14_tranche_b.mjs` at the same time (section 10.1).

No other owner decision is needed. Removing the whole Lab section rather than only its controls follows from the confirmed UX-19 decision and the 2026-10-01 intake ("remove public QB adjustment/QB-return tool"). Keeping internal machinery is settled by O4. Copy wording beyond N1 may be polished in the FORCE voice.

## 5. Retained internal and research capability

### 5.1 Disposition

| Capability | Location | Disposition |
| --- | --- | --- |
| Internal manual override | `S.qbCarryover` (307, `enabled:false` initializer), `effectiveQbCorrection`, `qbCarryoverActive` | **PRESERVE INTERNALLY**, no public writer (O4) |
| Internal what-if chain | `ratingsWithQBCarryover`, `ratingsWithActiveQBCarryover`, `qbCarryoverUnitEffect(t, ratings, restoreOverride, qbOverride)`, `suppressQbUnitScenarioOverlay`, `currentTeamState._qbScenario` | **PRESERVE INTERNALLY.** Identity in production without manual state. Names and call sites unchanged: V45 asserts `ratingsWithActiveQBCarryover` in home/teams/matchups, and `test_v149_qb_propagation.mjs` and `test_projection_semantics_audit.mjs` drive `qbCarryoverUnitEffect` and `S.qbCarryover`. |
| Unit overlay transform | `LP.applyQbCarryoverScenario` (live_profiles.js:508) | **PRESERVE INTERNALLY.** Pure model transform; V27/V28 research tests call it. |
| Preset record | `data/qb-carryover.js` (`autoEligible:false`, `automaticRetired:true`, `suggestedRestoreElo` 47.3, V33 values), `qbCarryoverPreset` | **PRESERVE AS RESEARCH.** Still the internal manual default and the V33 record; no longer read by any public UI after removal. |
| Retired V33 calculation and gate | `model/qb_regime.js`, `qbCarryover` gate (`retired-md03-cycle6`, weight 0) | **PRESERVE AS RESEARCH.** Unchanged; not called by production. `test_v33_qb_regime.js` checks the math on an explicitly re-enabled preset copy. |
| Research documents and code | `QB_REGIME_RESEARCH_V33.md`, `QB_CARRYOVER_RESEARCH*.md`, `research/`, `MD03_QB_CORRECTION_MODEL_INVESTIGATION.md`, `MD03_QB_EVENT_DETECTION_INVESTIGATION.md`, `QBC.study` | **PRESERVE AS RESEARCH** |
| Debug hooks | `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE`, `FORCE_RATING_LEDGER`, `FORCE_CANONICAL_GAME_TEAM_STATE` | **PRESERVE INTERNALLY** (not public pages) |
| Canonical QB rating, availability, starter selection | `model/live_profiles.js`, `qbDebug`, `qbComponentScores` | **OUT OF SCOPE**, untouched |
| QB Rankings Default and Customize | `qbRankingsPage`, `qbCustomRawScore`, `qbCustomScore` | **OUT OF SCOPE** (UX-08 gate) |
| Public controls, handlers and render functions | S1-S5, S8, S9, S3; `quickQbButton`, `qbCarryoverPanel`; handlers 5446-5470 | **REMOVE** (render functions removed entirely once no caller remains; no test imports them by name) |
| Public manual displays | S6, S7, S10-S13 markup and the "returning-QB adjustment active" note | **REMOVE** (unreachable without a public writer; O1 superseded) |
| Tool-only CSS | section 8.2 | **REMOVE** at selector level only |

No research-only public entry point survives, and O4 forbids adding a localhost or debug setter without separate authorization. Internal use stays possible through the test harness (`scripts/lib/force_app_harness.js`, including its `sources` override) and the console hooks.

### 5.2 Roster Lab and shared-primitive boundary

- Roster Lab (`lab`, 4213) reads `currentRatings()` and its own scenario state (`S.scenario`). It does not call `effectiveQbCorrection`, `ratingsWith*QBCarryover`, `qbCarryoverUnitEffect`, `LP.applyQbCarryoverScenario` or `S.qbCarryover`. Removing the QB-return tool cannot change Roster Lab.
- Roster Lab **does** share CSS with the QB Return Lab: `.scenario-hero` and `.scenario-stat*` (styles.css line 2). These must stay.
- `.primary-action` is used only by the Lab Apply button today; remove it only if an implementation-time source search still finds no other user.
- The "roster what-ifs" copy on home/About describes Roster Lab and stays.
- No other what-if tool or planned feature consumes the QB-return chain. `MD-04` (Roster Lab marginal value) and `MD-05` (attribution-isolated ratings) must not assume it.

## 6. Persisted manual state

Readers and writers of `S.qbCarryover`: the initializer (307), Apply (5454), Reset (5458), the quick button (5466-5467) and test harnesses. `localStorage` holds only `forceRatingView`. Routing carries only the route. The Worker, Python server and snapshot never mention it. PNG export renders the current DOM and stores nothing. The only persistence is within one open tab until Reset or reload.

| Contract | Consequence | Assessment |
| --- | --- | --- |
| Ignore old values | No stored value exists across loads. An old open tab keeps its code and in-memory value until reload, which loads the new bundle with `enabled:false`. | Satisfied automatically |
| Clear on migration | Nothing stored | Not needed |
| Retain but inaccessible | O4: the object stays, nothing public writes it | Decided (O4) |
| One-time migration | Nothing to migrate | Not applicable |

After removal, stale manual state cannot change any output in the new bundle; acceptance tests A2 and A3 prove it by source search and behavior.

## 7. Public copy after removal

- **Remove with the tool:** the Lab explainer, preset paragraph, "No preset for this team…", the "Historical research, manual what-if" warning, MANUAL/OFF chip, "Apply QB fix"/"Clear QB fix", "QB manual +N Elo", "base projection", "returning-QB adjustment active", "QB-return scenario" notes and tooltips, and "No verified QB-return preset".
- **Method (S15):** governed by N1. Under every option the "manual what-if available on team pages" clause goes, because it becomes false when the tool goes. Until UX-19 is implemented it stays, because it is true today and `test_ux14_tranche_b.mjs` guards it.
- **Method forecast inputs (S16):** no change; it already names no QB-return correction.
- **Teams intro (S17):** "Ratings, context and schedule." (O5).
- **Technical docs:** `QB_REGIME_RESEARCH_V33.md`, the MD-03 investigations and `MD03_RETIREMENT_IMPLEMENTATION.md` keep the full research and retirement record.
- No em dashes in new public copy.

## 8. Removal boundary

### 8.1 Surface matrix

| Surface | Element | Classification |
| --- | --- | --- |
| Home | Card-header KC button (S1) | REMOVE |
| Home | Rank-row button and `.home-qb-fix` span (S2) | REMOVE, with the grid change in 8.2 |
| Home | "roster what-ifs" hero copy (S18) | OUT OF SCOPE (Roster Lab) |
| Home | Ratings and forecasts via `ratingsWithActiveQBCarryover` | PRESERVE INTERNALLY (identity without manual state) |
| Rankings | "QB return" header and action cells on Strength/FLAG/Advanced (S3) | REMOVE |
| Rankings | Units QB scenario tooltip and "base · QB-return scenario" notes (S12, S13) | REMOVE the scenario-specific `title`/notes; keep the cells |
| Teams directory | KC card button (S4) | REMOVE |
| Teams directory | Intro (S17) | REWORD to "Ratings, context and schedule." (O5) |
| Team page | Hero quick button and "No verified QB-return preset" (S5) | REMOVE |
| Team page | Hero "QB manual +N Elo" chip and struck-through base Elo (S6) | REMOVE |
| Team page | "· base projection N wins" (S7) | REMOVE |
| Team page | QB Return Lab panel, including QB selector, slider/value, Apply, Reset, MANUAL/OFF chip, explainer and warning (S8) | REMOVE (whole section) |
| Matchup | Hero buttons (S9) | REMOVE |
| Matchup | "returning-QB adjustment active" note (S10) | REMOVE |
| Matchup | "QB-return scenario · was N" duel/QB notes and overlay QB name (S11) | REMOVE the scenario note; QB name falls back to the measured starter as today without manual state |
| Matchup | Forecast values | No change |
| QB Rankings | Default and Customize (S14) | OUT OF SCOPE (UX-08) |
| Method | QB return correction section (S15) | REWORD or REMOVE per N1; the manual clause goes in all options |
| Method | Forecast-inputs sentence (S16) | No change |
| About | Positioning and glossary | OUT OF SCOPE |
| Forecast/projection propagation | `ratingsWithActiveQBCarryover` into home, rankings, teams, matchups, playoffs, divisions, slate | PRESERVE INTERNALLY; no public input remains |
| Exports | Rankings "QB return" column; team Lab card; manual-state numbers (S19) | REMOVE, following source removal (8.3) |
| Debug/ledger | Console hooks; `qbDebug` scenario fields; ledger `qbElo` | PRESERVE INTERNALLY (not public pages) |
| Mobile | Card-header KC button, team/matchup hero buttons, Lab stacked controls | REMOVE with their elements |
| Accessibility labels | Quick-button `title`s; Lab labels | REMOVE with elements |
| Keyboard | Quick buttons, select, range, Apply, Reset | REMOVE from focus order by removing elements; no `tabindex` workarounds |
| Persisted state | `S.qbCarryover` | PRESERVE INTERNALLY, `enabled:false` initializer unchanged, no public writer (O4) |
| Event handlers | `#qbCarryoverElo`, `#applyQBCarryover`, `#clearQBCarryover`, `[data-qbquick]` (5446-5470) | REMOVE |
| Generated `public/` | `public/assets/app.js`, `public/assets/styles.css` | Regenerate with `scripts/build_public.py`; never hand-edit |

### 8.2 CSS and grid boundary (selector level, `assets/styles.css`)

Do not delete line ranges. Several lines mix tool selectors with shared ones.

**Tool-only selectors, safe to remove once their markup is gone:**
- Line 64: `.carryover-card`.
- Line 65: `.carryover-card .card-head h2`, `.carryover-copy`, `.carryover-preset`, `.carryover-preset b`, `.carryover-controls` and its `label`/`select`, `.range-line` and its `input`/`output` (only the Lab uses `range-line`), `.carryover-actions`, `.carryover-results`, `.carryover-warning`, `.carryover-on`, and `.carryover-inline` and `.muted-strike` (only S6 uses them now that no retained chip exists; confirm by source search).
- Line 66: the whole `@media(max-width:950px)` block (carryover controls only).
- Lines 82-85: `.qb-quick`, `.qb-quick:hover`, `.qb-quick.active`, `.qb-quick small`, `.qb-quick.active small`.
- Line 86: `.qb-action-cell`, `.qb-action-cell:empty::after`.
- Line 87: `.team-quick-fix`.
- Line 88: `.home-qb-fix`.
- Line 92: only `.team-directory-card>.qb-quick`.
- Line 93: only `.home-qb-fix{display:none}`, `.rank-row>.home-qb-fix` (from `.rank-row>.raw,.rank-row>.home-qb-fix`) and `.qb-action-cell{min-width:80px}`.
- Lines 94-95: only `.card-head-actions .qb-quick` (both rules).
- `.primary-action` (line 65 and the line 310 override): only if a source search still finds no other user.

**Shared rules that must stay:**
- `.scenario-hero`, `.scenario-stat*` (line 2): Roster Lab uses them.
- `.scenario-unit-cell small`, `.unit-scenario-note`, `.scenario-unit-row` (line 130): remove only if the S12/S13 removal leaves no user; confirm by source search.
- `.team-directory-card`, `.team-directory-link` (line 92); the `.card-head-actions` container (line 94), which still holds the "32 teams" chip; the rest of line 93's responsive rules.
- `.name-verdict*`, `.recommended-name` (line 65): unused naming-lab leftovers, out of scope.

**Grid and table structure:**
- Home `.rank-row` base grid (line 2) has 5 tracks; line 89 adds a sixth track for `.home-qb-fix`. Remove the line-89 override with the span.
- Rankings tables: remove the "QB return" `<th>` in `rankingHeader` and the `<td class="qb-action-cell">` in `rankingRow` together for Strength, FLAG and Advanced. No `colspan` or `nth-child` width rule depends on that column.

### 8.3 Export behavior

Today `exportCurrentPagePng` clones the page and removes `.footer, .matchup-warning, .matchup-back, .qb-quick` (5197); `prepareCloneForSocialExport` (5146) turns buttons and links into spans and removes `.sub` and `small`, but does not transform `select`, `input` or `output`. A team-page export therefore carries the Lab card with its form elements and before→after values, and rankings exports keep the "QB return" header with "-" cells.

Required after removal: exported rankings have no "QB return" column; exported team pages have no Lab card, no manual controls and no manual-state output; exported numbers equal the canonical no-correction state. The `.qb-quick` cleanup selector can stay (harmless; `test_v21_export_packing.js` asserts it).

## 9. Model / forecast impact

**Removal of the public tool does not change default output.** With `S.qbCarryover.enabled === false` (the initializer and the only state after removal), `effectiveQbCorrection` returns 0, `ratingsWithActiveQBCarryover` and `ratingsWithQBCarryover` return their input, and `currentTeamState` has no overlay. Historical states never read manual state. The Cycle 6 before/after audit ([MD-03 retirement](MD03_RETIREMENT_IMPLEMENTATION.md), section 5) already establishes the no-correction values for every team.

Coupling to respect:
1. `ratingsWithActiveQBCarryover`, `effectiveQbCorrection`, `qbCarryoverUnitEffect` and `currentTeamState` look like tool code but are the internal chain (O4) and are asserted by V45 and V149 tests. Keep them.
2. The overlay QB label still falls back through `S.qbCarryover.qb`; keep the object and do not change the fallback order.

**Inconsistencies resolved by the retirement:** the team-page schedule omitting an opponent's automatic correction, and Roster Lab's baseline excluding it, no longer apply, because no automatic correction exists. Roster Lab's broader baseline question stays under `UX-09`.

## 10. Test impact and future acceptance criteria

### 10.1 Existing tests (catalog membership at `8e6a180`)

| Test | Catalog suites / classification | QB-return relevance today | Removal-tranche action |
| --- | --- | --- | --- |
| `test_md03_retirement.mjs` | safe, qb, model / regression | Automatic-zero, legacy-inert and historical checks; also drives the public Lab (rendered warning, MANUAL/OFF, Apply/Reset/quick handlers) | **Keep** every automatic-zero, legacy preset/gate, resolver, historical, ledger and fresh-start check. **Replace** the public-Lab sections (rendered warning/controls and the real-handler block) with harness-level manual checks (O4) plus the UX-19 negative assertions; record as intentional supersession. |
| `test_ux14_tranche_b.mjs` | safe / regression | Asserts `Use auto QB fix\|carryover correction` and `<th>QB return</th>` exist; asserts Method contains "manual what-if available on team pages"; slices Method at `<h2>QB return correction</h2>` | **Replace** the UX-19 parts with negative assertions in the new UX-19 test; keep the UX-08 half (`1.20x expansion`). Update the Method clause guard and, if N1 removes the section, the slice heading. Document as intentional UX-19 supersession. |
| `test_ux14_public_explanations.mjs` | safe / regression | No QB-return assertion | No change |
| `test_v21_export_packing.js` | safe / regression | Export cleanup regex contains `.qb-quick` | No change (selector kept) |
| `test_v117_luck_table.js` | safe, model / regression | Luck rows exclude `quickQbButton` | No change; comment becomes stale |
| `test_v33_qb_regime.js` | safe, qb, model / frozen-regression | Retired production assertions plus V33 math on a re-enabled preset copy | No change |
| `test_v30_predictive_gates.js` | safe / regression | `qbCarryover` gate retired, weight 0; manual +47.3 line-movement math | No change |
| `test_v69_canonical_historical_state.js` | safe / frozen-regression | No historical QB restore | No change |
| `test_v45_unit_force_bridge.js` | safe, model / regression | `ratingsWithActiveQBCarryover` use in matchups, home, teams | No change; preservation evidence |
| `test_v149_qb_propagation.mjs` | safe, release, qb / regression | `ratingsWithActiveQBCarryover`; `qbCarryoverUnitEffect` overrides and suppression | No change |
| `test_projection_semantics_audit.mjs` (+ `lib/projection_semantics_audit.js`) | safe, model / regression | Drives manual KC through `Object.assign(S.qbCarryover, …)` | No change (O4) |
| `test_qb_customize_audit.mjs` | safe, qb, model / regression | `scenarioGap` = displayed minus measured QB | No change; gap is zero without manual state |
| `test_qb_correctness.mjs` | safe, release, qb, model / regression | Canonical QB | No change |
| `test_v123_*`, `test_v124_*`, `test_v75_*` | safe, model / regression | Stub `QB_CARRYOVER` | No change |
| `test_v40_team_logos.js` | safe / regression | Loads `data/qb-carryover.js` and `model/qb_regime.js` | No change (files stay) |
| `test_qb_carryover_ui.js` | default-excluded / historical | AUTO/reset UI contract; obsolete since retirement and failing at base on preset wording | Leave excluded; note as superseded by UX-19 |
| `test_v14_matchup_clarity.js` | default-excluded / historical | Manual preview/scenario contract; fails on the current integrity gate | Leave excluded; note as superseded by UX-19 |
| `test_v10_ui.js` | default-excluded / historical | Expects `data-qbquick="KC"` | Leave excluded |
| `test_v27_*`, `test_v28_metric_transform_smoke.js` | default-excluded / research | Call `LP.applyQbCarryoverScenario` | No change (transform stays) |
| `scripts/validate_bundle.py` | not catalogued | Asserts retired flags and `'QB Return Lab' in app` | Update the Lab assertion or record as superseded |

### 10.2 New regression for the removal tranche

Suggested name `scripts/test_ux19_qb_return_removal.mjs` (safe suite; real bundle through `force_app_harness.js`). Freeze harness time, schedule and completed games, profiles (including starter names and `playerStatGames`), `S.engineCache`, presets, gates and other inputs. Capture golden values from the accepted `8e6a180` baseline (or the then-current accepted main) on that fixture before the removal edit, and compare unrounded values with a documented tolerance (for example `1e-9`).

- **A1. Public controls absent.** Home, rankings (Strength, FLAG, Advanced, Units, Luck), teams, team pages for KC and a non-preset team, a KC matchup, QB Rankings (Default and Customize), Method and About contain none of: `data-qbquick`, `qb-quick`, `QB Return Lab`, `qbCarryoverQB`, `qbCarryoverElo`, `applyQBCarryover`, `clearQBCarryover`, `<th>QB return</th>`, "No verified QB-return preset", "Apply QB fix", "Clear QB fix", "QB manual", "base projection", "returning-QB adjustment active", "QB-return scenario".
- **A2. No public MANUAL/OFF state.** No `carryover-on`, no MANUAL/OFF chip and no Lab warning on any page.
- **A3. No public writer (source).** `assets/app.js` has no assignment to `S.qbCarryover` or its fields outside the initializer.
- **A4. No public writer (behavior).** After rendering every page and running the binding pass with a DOM stub that records handlers, `S.qbCarryover.enabled === false` and nothing is bound to the removed ids or `[data-qbquick]`.
- **A5. Canonical ratings unchanged.** `currentRatings()`, `currentTeamState(t).elo` and `ratingsWithActiveQBCarryover()` equal the golden values for all 32 teams.
- **A6. Automatic correction still zero and not reactivated.** Rerun the automatic-zero and legacy preset/gate checks from `test_md03_retirement.mjs` against the removal tree; no automatic resolver or `QR.correction(` reappears.
- **A7. Forecasts and projections unchanged.** `forecastFor` probabilities for a fixed game set, Monte Carlo score projections and `seasonProjection` expected wins and odds equal golden values (no manual scenario in either tree).
- **A8. Historical states unchanged.** `canonicalGameTeamState` pre/post and `week2EntryState` equal golden values; `qbRestore` stays 0.
- **A9. Internal capability preserved.** Setting `S.qbCarryover` in the harness still changes `ratingsWithActiveQBCarryover` and `currentTeamState` as before; `qbCarryoverUnitEffect(t, ratings, override)` returns a what-if; `LP.applyQbCarryoverScenario` works; `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE`, `FORCE_RATING_LEDGER` exist; `model/qb_regime.js` math still reproduces V33 on a re-enabled preset copy.
- **A10. Roster Lab intact.** Roster Lab renders with `.scenario-hero`/`.scenario-stat` styling and its add/remove feedback is unchanged against golden values.
- **A11. Exports.** A rankings export clone has no "QB return" header; a team export clone has no Lab card, no Lab `select`/range `input`/`output` and no manual-state output.
- **A12. Method copy.** Method no longer contains "manual what-if available on team pages", and matches the N1 choice.
- **A13. QB Rankings.** Default equals the measured `qbIndex` for every team; Customize ranking for fixed weights equals golden values.

### 10.3 Acceptance criteria for the removal tranche

- **Entry conditions:** `MD-03` retirement accepted (met 2026-10-03 at `8e6a180`); N1 decided; separate UX-19 implementation authorization (MD-03 step F).
- A1-A13 pass. `test_md03_retirement.mjs` and `test_ux14_tranche_b.mjs` are updated as in 10.1 with intent documented. Safe, release, QB, model, snapshot and server suites pass in an LF export (native Windows: only the known V77 CRLF failure is acceptable).
- `scripts/build_public.py` regenerates `public/`; generated files match source.
- Desktop 1440×900 and mobile 375×812 checks of home, rankings (Strength/FLAG/Advanced/Units), teams, KC and BUF team pages, a KC matchup, Roster Lab and Method show the intended controls gone on both widths, no empty column or grid gap, no new horizontal overflow and no console errors.
- No model, data, Worker, server or forecast change in the removal tranche.

## 11. Files expected in the removal tranche

- `assets/app.js`: remove S1-S5, S8, S9 renderers and calls, `quickQbButton`, `qbCarryoverPanel`, handlers 5446-5470, the "QB return" column, and the S6, S7, S10-S13 manual displays; apply O5 and N1 copy.
- `assets/styles.css`: selector-level removals and the line-89 grid override (8.2).
- `public/assets/app.js`, `public/assets/styles.css`: regenerated only.
- `scripts/test_ux19_qb_return_removal.mjs` (new), `scripts/test_md03_retirement.mjs` and `scripts/test_ux14_tranche_b.mjs` (supersession updates), `scripts/test_catalog.json`, `scripts/TESTING.md`, and optionally `scripts/validate_bundle.py`.
- `FORCE_ROADMAP.md` (UX-19, UX-14 D10, MD-03 step F status), `UX14_PUBLIC_EXPLANATION_INVENTORY.md` (D10 status).
- Not expected: `model/*`, `data/*`, `src/index.js`, `force_server.py`, `index.html`, research documents.

## 12. Final contract for the removal tranche

- **REMOVE PUBLIC:** quick QB buttons (S1, S2, S4, S5, S9); the whole QB Return Lab section (S8); the rankings "QB return" column (S3); manual displays (S6, S7, S10-S13); "No verified QB-return preset"; manual handlers and focus targets; dead tool CSS; manual export artifacts; the Method "manual what-if available on team pages" clause.
- **REWORD:** Teams intro (O5); Method QB-return section per N1.
- **PRESERVE INTERNALLY:** `S.qbCarryover` and the manual-override chain; `qbCarryoverUnitEffect`; `LP.applyQbCarryoverScenario`; `ratingsWithActiveQBCarryover` as the ratings source; debug hooks.
- **PRESERVE AS RESEARCH:** `model/qb_regime.js`, `data/qb-carryover.js` record, retired gate entry, V33 and MD-03 research documents and code.
- **OUT OF SCOPE:** canonical QB rating, QB Rankings Default/Customize (UX-08), Roster Lab, forecast/model/data, routing, Worker, server.

## 13. Non-goals and preserved features

- No change to the retired automatic correction, its data, gate or research record, and no reconsideration of an automatic correction (that would need new owner authorization under `MD-03` and fresh validation against then-current FORCE).
- No change to the canonical QB rating, QB weights, opponent/pressure/recency context, offense composite, FORCE bridge, FORCEcast, market blend, playoffs, Luck, FLAG or score simulation.
- QB Rankings Customize (`UX-08`) unchanged and still gated; UX-14 D1/D2 remain gated.
- Roster Lab and its immediate feedback unchanged; its baseline question stays under `UX-09`.
- No fix for the reset/name-fallback coupling.
- No localhost or debug setter for the manual override (O4).
- Routing, per-page URLs, loader, export pipeline, security gates and the Worker unchanged.
- Other UX-14 groups and gates (`UX-08`, `UX-15`, `UX-17`, `UX-18`, `UX-31`) remain under their own items.

## 14. MD-03 dependency (satisfied) and superseded prerequisite

The UX-19 public removal originally waited on `MD-03`. The sequence and its state after this revision:

| Step | State |
| --- | --- |
| A. Authorize retirement | Done (owner, 2026-10-02) |
| B. Implement retirement | Done (`a40feed` + correction `8e6a180`, `cycle6/claude-md03-retirement`) |
| C. Independent validation | PASSED (Codex full validation; targeted re-review of the corrections returned "A. CORRECTIONS VERIFIED — READY FOR OWNER ACCEPTANCE") |
| D. Owner acceptance | ACCEPTED (owner, 2026-10-03, at `8e6a180`) |
| E. Revise this plan for the no-automatic-correction state | Done; independent review accepted it after supporting-document corrections (`fe09e67`) |
| F. Separately authorize UX-19 implementation | AUTHORIZED (owner, 2026-10-03, with N1 option (a)); implemented on `cycle6/claude-ux19-removal`, independently validated and owner-ACCEPTED 2026-10-04; integrated onto local `main @ cb80c827` on 2026-10-04; not pushed or deployed; UX-19 execution COMPLETE |

**Superseded league-wide prerequisite (historical).** On 2026-10-02 the owner first required that any retained automatic correction work for any team and QB, including midseason injury and return cases, before UX-19 removal. The same day the owner chose retirement instead. That league-wide capability contract, its data/model questions and its 12 acceptance cases now live only in the `MD-03` roadmap entry as the "historical retained-feature" requirement, which applies only if an automatic correction is ever reconsidered. It is not a UX-19 entry condition. The full original text is in git history.
