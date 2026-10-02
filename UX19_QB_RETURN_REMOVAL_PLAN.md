# UX-19 public QB-return tool removal plan

Roadmap item: `UX-19` (remove public QB adjustment / QB-return tool). Decision status CONFIRMED (owner, 2026-10-01). This document is the planning prerequisite named in the item's acceptance contract: "a bounded public-removal plan identifying retained internal capability, followed by separately authorized removal."

Prepared 2026-10-02 on `cycle4/claude-product` from exact `main @ a5f5557` (`c9d03fe`), then corrected after Codex's independent cross-review and the owner's O1-O5 decisions (same date, follow-up commit). **Planning only. Nothing was removed.** No production, model, data, test or generated `public/` file changed. Line numbers refer to `a5f5557`. This plan does not authorize the removal tranche.

## 1. Summary

- The public tool is a **manual override** of the automatic V33 returning-QB correction. It has two entry points: the **QB Return Lab** panel on every team page and the **QB quick button** (`quickQbButton`) on home, rankings, teams, team hero and matchup hero.
- Manual state lives only in the in-memory `S.qbCarryover` object. No `localStorage`, URL, hash, export or server path reads or writes it. A freshly loaded bundle always starts with `enabled:false`. An already-open tab running the old bundle keeps its old code and in-memory state until it reloads.
- **Default behavior does not depend on the tool.** With `S.qbCarryover.enabled === false`, current and future ratings, rankings and projections use only the automatic correction. Removing every public writer of `S.qbCarryover` leaves default output identical. This was checked with a real-bundle probe (section 9).
- **The manual state is global while it is set.** One click on the home-page KC button replaces the automatic KC correction (+13.2 Elo in the probe after one game) with the preset's full +47.3 Elo, with no decay, in the current-rating paths that read `effectiveQbCorrection`. Those paths include rankings, matchups, playoffs and PNG exports, and the value stays until Reset or reload. In the probe, a KC home game moved from 56.0% to 61.6%.
- **The manual state is also incoherent for the 31 teams without a preset.** The Lab slider works on any team page. For such a team it changes that team page's projection (+40 Elo in the probe) and the displayed QB unit (50 to 67.9), which also appears in the QB Rankings **FORCE Default** column. It does not change league forecasts or rankings. This is extra evidence for removal, not a separate fix.
- Some surfaces that look like tool UI are **disclosures of the automatic correction** (team hero chip, "base projection", matchup "returning-QB adjustment active", unit notes). The owner decided (O1) to keep them and reword them in plain automatic-correction language.
- **QB Rankings Customize (`UX-08`)** shares no state or handler with the tool. It recomputes its own weighted composite from measured component scores plus its own context adjustments. It does not score from the displayed (possibly overlaid) Default value (section 2).

## 2. Three concepts and their shared code

| Concept | What it is | State | Code that is only this concept | Code shared with another concept |
| --- | --- | --- | --- | --- |
| **A. Public manual QB-return tool (UX-19 target)** | Visitor-set override of the returning-QB Elo correction for one team | `S.qbCarryover = {enabled, team, qb, restoreElo}` (app.js:304). Public writers: Lab Apply (5462), Lab Reset (5466), quick-button handler (5474-5475). | `quickQbButton` 1290-1299; `qbCarryoverPanel` 1305-1350; handlers 5454-5478; tool-only CSS (section 8.2) | Manual branch of `effectiveQbCorrection` 1236-1240 and `qbCarryoverActive` 1263-1265; the `S.qbCarryover.qb` label fallback in `qbCarryoverUnitEffect` 1993 |
| **B. Automatic verified QB correction (keep)** | V33 rule: `min(surviving damage, 7.5 Elo × verified missed starts × 70%)`, 60 Elo cap, 4-game half-life, only for presets with `autoEligible`, `verifiedReplacementWindow` and `expectedStarterReturned`. KC (Mahomes) is the only preset. | Data `data/qb-carryover.js`; gate `qbCarryover` in `data/predictive-feature-gates.js` | `model/qb_regime.js` (`FORCE_QB_REGIME.correction`); `automaticQbRegimeCorrection` 1230-1234; `predictiveQbCarryoverAllowed` 1267; `qbCarryoverPreset` 1221; historical paths that call `QR.correction` directly: `canonicalGameTeamState` 1934-1938, week-2 entry states 2085 and 2095; `LP.applyQbCarryoverScenario` (live_profiles.js:508); `suppressQbUnitScenarioOverlay` 1255-1261 | Current/future paths through `effectiveQbCorrection`: `ratingsWithActiveQBCarryover` 1280-1288, `ratingsWithQBCarryover` 1271-1277 (team page), `qbCarryoverUnitEffect` 1973-2005, `currentTeamState` 2010-2031 (`_qbScenario` overlay), `ratingLedger` 2113 |
| **C. QB Rankings Default and Customize (UX-08, keep, separate gate)** | Default ranks the canonical displayed QB value. Customize ranks a visitor-weighted composite. | `S.qbRankingMode`, `S.qbWeights` | `qbCustomRawScore`, `qbCustomScore` 4127-4136; `[data-qb-mode]` and `[data-qb-weight]` handlers 5411-5412 | Both read `qbDebug(t)` via `qbComponentScores` 4094. **Default** reads `displayedQbIndex` (4149), which comes from `currentTeamState` and so can reflect the automatic overlay today, and the manual overlay while it is set. **Customize** uses `qbDebug`'s measured component scores (`passEpaScore`, `anyAScore`, `passSuccessScore`, `rushingValueScore`, `cpoeScore` from `profile(t).qb`), its own calibration, `opponentRatingAdjustment`, `olRatingAdjustment` and `qbRecencyAdjustment`. It never uses the overlaid Default value as its score. |

**Where A and B meet.** Current and future rating paths commonly meet in `effectiveQbCorrection`, which returns the manual value when `qbCarryoverActive(t)` is true and the automatic value otherwise. Historical game-state paths (`canonicalGameTeamState`, week-2 entry states) call `QR.correction` directly, so manual state never reached them. The overlay QB label also reads `S.qbCarryover.qb` as a fallback (1993). Removing every public writer of `S.qbCarryover` removes A's public effect; the consumers must stay because they carry B.

**Existing reset/name-fallback coupling (recorded, not fixed).** Lab Reset only sets `enabled:false`; it keeps `team`, `qb` and `restoreElo`. Because `qbCarryoverUnitEffect` labels an automatic overlay with `qbOverride || S.qbCarryover.qb || preset.qb`, a stale manual QB name leaks into the automatic label. Probe: apply the Lab on BUF with QB "Josh Allen", Reset, then let KC's automatic overlay appear; the KC overlay is labeled "Josh Allen". After removal no public path can write that name, so the label stays the initializer's "Patrick Mahomes". That equals today's KC preset only by coincidence of the hard-coded default. Fixing the fallback order is out of scope.

## 3. Current public surface inventory

"Public" means rendered on forceratings.com (not gated by `USE_HASH_ROUTING` or localhost). KC is the only team with a preset.

| # | Surface | File / function | User-visible behavior | State read / written | Downstream effect | Concept |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Home, FORCE Rankings card header | `home` 4033 → `quickQbButton('KC')` | Hard-coded KC button ("QB auto +N", "Apply QB fix" or "Use auto QB fix"). Visible at all widths, shrunk under 650px | reads; click writes `S.qbCarryover` | Click sets KC manual +47.3 Elo | A |
| S2 | Home, top-8 rank rows | `home` 4026 `.home-qb-fix` | Same button in the KC row when KC is top 8. Hidden under 950px | same | same | A |
| S3 | Rankings Strength, FLAG, Advanced | `rankingHeader` 3388, `rankingRow` 3399 | "QB return" column; KC cell holds the button, others show "-" via `.qb-action-cell:empty::after`. Not on Luck or Units | same | same | A |
| S4 | Teams directory cards | `teams` 4177 | Button under the KC card | same | same | A |
| S5 | Team hero, quick button | `teamPage` 4198 | KC: button with detail line. **Every other team: "No verified QB-return preset"** | same | same | A |
| S6 | Team hero, correction chip | `teamPage` 4196-4198 | "QB auto +N Elo" or "QB manual +N Elo" chip and struck-through base Elo | reads `effectiveQbCorrection` | display | B (manual variant is A) |
| S7 | Team hero, record line | `teamPage` 4199 | "· base projection N wins" when a correction is in effect | same | display | B |
| S8 | QB Return Lab panel | `qbCarryoverPanel` 1305-1350, on every team page (4205) | AUTO/MANUAL/OFF chip, explainer, preset paragraph or "No preset for this team. Use the slider for a one-off what-if.", QB select, 0 to 80 Elo slider, Apply/Reset, before→after results, D10 warning | reads/writes `S.qbCarryover` | Apply sets manual state for any team | A (explainer and D10 describe B) |
| S9 | Matchup hero | `matchupPage` 3945, 3947 | Button under the KC side | same as S1 | same | A |
| S10 | Matchup prediction note | `matchupPage` 3987 | "returning-QB adjustment active" when either side has a unit overlay | reads overlay | display | B |
| S11 | Matchup duel and QB notes | `scenarioMetricNote` 2256-2268 via 3939-3942; QB name 3941, 3972, 3976 | "QB-return scenario · was N"; overlay QB name | reads `_qbScenario` | display | B |
| S12 | Rankings Units QB tooltip | `rawUnitCell` 2529-2530 | `title` "Displayed QB includes returning-QB scenario overlay: …" | reads `_qbScenario` | display | B |
| S13 | Unit cells / team unit board | `unitCell` 2282-2288; `unitBoardRow` 2567-2572 | "N base" sub-values; "N base · QB-return scenario" | reads `_qbScenario` | display | B |
| S14 | QB Rankings FORCE Default column | `qbRankingsPage` 4149 | Shows `displayedQbIndex` (includes any overlay) | reads `currentTeamState` | display | C reading B (and A while set) |
| S15 | Method, QB return correction | `model` 4301-4307 | Paragraph ("…only to verified situations…"), three evidence KPIs, status card "Automatic only for verified cases; manual what-if available on team pages." | none | none | B plus A clause |
| S16 | Method, forecast inputs | `model` 4325 | "…and the limited returning-QB correction." | none | none | B |
| S17 | Teams intro | `teams` 4173 | "Rating, context, schedule, and what-ifs." | none | none | A wording |
| S18 | Home hero / About positioning | 4030, 4334 | "roster what-ifs" | none | none | Roster Lab, not A |
| S19 | PNG export | `exportCurrentPagePng` 5177; `prepareCloneForSocialExport` 5154 | See section 8.3 | DOM | Shares manual what-if numbers as if published | A |
| S20 | Accessibility / keyboard | S1-S5, S8, S9 | Quick buttons and Lab controls are tab stops. Buttons carry only a `title` ("Open manual override for … carryover correction"), which does not match the click behavior. Lab: `select#qbCarryoverQB`, `input#qbCarryoverElo` (range), `output#qbCarryoverValue`, Apply/Reset buttons | n/a | n/a | A |

Not public: the console hooks `FORCE_QB_DEBUG` (2441), `FORCE_CURRENT_TEAM_STATE` (2037), `FORCE_RATING_LEDGER` (2438), and test-harness writes to `S.qbCarryover`.

## 4. Owner decisions (approved 2026-10-02 for the removal tranche)

Each question is recorded by the kind of decision it is, so no question is treated as still open.

| # | Kind | Decision |
| --- | --- | --- |
| O1 | Product / disclosure decision | **Keep and reword** the team-level automatic-correction disclosures. The team hero chip stays when a correction is active; base-projection context may stay; the matchup active-correction disclosure stays; relevant unit notes and tooltips may stay. Replace "QB auto/manual", "QB-return scenario" and similar what-if wording with plain automatic-correction language. Preferred concepts: "QB return correction +N Elo" and "Includes verified QB return correction." Exact copy may be polished in the FORCE voice if that meaning is kept. |
| O2 | Product / disclosure decision | **D10-b, conceptually.** The detailed explanation stays in Method and internal research (`QB_REGIME_RESEARCH_V33.md`). A short team-level statement remains when an automatic correction is active, and the O1 team-level disclosure supplies it; no duplicate text. A tooltip is never the only D10 placement. |
| O3 | Approved editorial copy (not a gate or model contract) | Method status card sub reads: "Used only in verified cases, and it fades as the starter plays." |
| O4 | Already-constrained preservation, now decided | **Keep** `S.qbCarryover` and the internal manual-override branch, unreachable from public UI. No localhost UI setter; no deletion; the frozen V33 contract is not reopened. Adding a debug setter or deleting the branch would need separate authorization. |
| O5 | Approved editorial copy | Teams intro target wording: "Ratings, context and schedule." Not implemented in this planning pass. |

## 5. Retained internal capability

| Capability | Location | Disposition |
| --- | --- | --- |
| Automatic verified correction rule | `model/qb_regime.js`, `data/qb-carryover.js`, `qbCarryover` gate | **KEEP INTERNAL**, unchanged |
| Automatic correction in current and historical FORCE | `automaticQbRegimeCorrection`, `predictiveQbCarryoverAllowed`, `ratingsWithActiveQBCarryover`, `ratingsWithQBCarryover`, `effectiveQbCorrection`, `canonicalGameTeamState`, week-2 entry states | **KEEP**; names and call sites unchanged (V33, V45 and V69 assert them) |
| Unit overlay transform and suppression | `LP.applyQbCarryoverScenario`, `qbCarryoverUnitEffect`, `suppressQbUnitScenarioOverlay`, `currentTeamState._qbScenario` | **KEEP**; `qbCarryoverUnitEffect(t, ratings, restoreOverride, qbOverride)` stays as the test/debug what-if entry point |
| Internal manual override | `S.qbCarryover` (304), override branch in `effectiveQbCorrection` (1238), `qbCarryoverActive` | **KEEP INTERNAL, no public writer** (O4) |
| Canonical FORCE QB Rating, availability and starter selection | `model/live_profiles.js`, `qbDebug`, `qbComponentScores` | **KEEP**, untouched |
| QB Rankings Default and Customize | `qbRankingsPage`, `qbCustomRawScore`, `qbCustomScore` | **KEEP**, untouched (UX-08 gate) |
| Debug hooks | `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE`, `FORCE_RATING_LEDGER`, `FORCE_CANONICAL_GAME_TEAM_STATE` | **KEEP INTERNAL** |
| Research and D10 rationale | `QB_REGIME_RESEARCH_V33.md` (5 of 6 gated episodes improved, line 13; 4-game half-life and the +47.3 preset described as an aggressive counterfactual, line 37), `QB_CARRYOVER_RESEARCH*.md`, `research/qb_carryover_event_study.py`, `QBC.study` | **KEEP INTERNAL**; no new document needed |
| Public controls, handlers, "No verified QB-return preset", "QB return" column | S1-S5, S8, S9, S3; handlers 5454-5478 | **REMOVE PUBLIC** |
| `quickQbButton`, `qbCarryoverPanel` render functions | 1290-1299, 1305-1350 | **REMOVE ENTIRELY** once no caller remains (no test imports them by name) |
| Tool-only CSS | section 8.2 | **REMOVE** at selector level only |

## 6. Persisted manual state

Traced readers and writers of `S.qbCarryover`: the initializer (304), Apply (5462), Reset (5466), the quick button (5474-5475) and test harnesses. `localStorage` holds only `forceRatingView` (302, 5502). Routing carries only the route. The diagnostics payload records `location.hash`, not carryover state. The Worker, Python server and snapshot never mention it. PNG export renders the current DOM and stores nothing.

The only persistence is within one open tab: a manual value survives SPA navigation, Back/Forward and snapshot refreshes until Reset or reload.

| Contract | Consequence | Assessment |
| --- | --- | --- |
| Ignore old values | No stored value exists across loads. A tab still running the old bundle keeps its old code and in-memory value until it reloads; the reload loads the new bundle with `enabled:false`. | Satisfied automatically |
| Clear on migration | Nothing stored to clear | Not needed |
| Retain but inaccessible | Matches O4: the object stays, nothing public writes it | Decided (O4) |
| One-time migration | Nothing to migrate | Not applicable |

Stale manual state cannot change forecasts **in the new bundle** if the tranche removes every public writer and keeps the `enabled:false` initializer. Acceptance tests A2 and A3 (section 10) prove that by source search and by behavior. An old open tab is outside any code change; it ends at reload.

## 7. Automatic-correction disclosure and D10 (decided)

- **Stays unchanged:** Method "QB return correction" paragraph (4302), which already says the correction applies "only to verified situations" and fades; the evidence KPIs (4304-4305); the forecast-inputs sentence (4325).
- **Method status card (O3):** "Used only in verified cases, and it fades as the starter plays."
- **Team-level disclosures (O1):** keep and reword. Target concepts:
  - S6 chip: "QB return correction +N Elo". It must be a visible text element, not only a `title`.
  - S7: keep base-projection context in plain words.
  - S10: the matchup disclosure stays, worded as "Includes verified QB return correction" or equivalent.
  - S11-S13: drop "scenario" wording; keep or reword the unit notes in automatic-correction language.
- **D10 (O2):** the detailed rationale lives in Method and `QB_REGIME_RESEARCH_V33.md`. On a team page with an active correction, the O1 chip/context is the short statement; no separate duplicate line. On touch and keyboard, the statement must be readable without hovering.
- **Known disclosure gap to watch (not a new decision):** S10 fires only when the unit overlay exists. Once the returning starter has current-season stats the overlay is suppressed, so a KC game can carry the Elo correction with no matchup disclosure. The tranche should make the retained matchup disclosure follow the Elo correction (`effectiveQbCorrection > 0` for either side) so O1's "matchup active-correction disclosure stays" holds. That is a display condition only, not a model change.

## 8. Removal boundary

### 8.1 Surface matrix

| Surface | Element | Action |
| --- | --- | --- |
| Home | Card-header KC button (S1) | REMOVE |
| Home | Rank-row button and `.home-qb-fix` span (S2) | REMOVE, with the grid change in 8.2 |
| Home | "roster what-ifs" hero copy | NO CHANGE (Roster Lab) |
| Home | Ratings and forecasts via `ratingsWithActiveQBCarryover` | KEEP |
| Rankings | "QB return" header and action cells on Strength/FLAG/Advanced (S3) | REMOVE |
| Rankings | Units QB tooltip and "base" sub-values (S12, S13) | KEEP BUT REWORD (O1) |
| Teams directory | KC card button (S4) | REMOVE |
| Teams directory | Intro (S17) | CHANGE COPY to "Ratings, context and schedule." (O5) |
| Team page | Hero quick button and "No verified QB-return preset" (S5) | REMOVE |
| Team page | Hero chip (S6) | KEEP BUT REWORD: "QB return correction +N Elo", visible text; no "manual" variant |
| Team page | "base projection N wins" (S7) | KEEP BUT REWORD (O1) |
| Team page | QB Return Lab panel (S8) | REMOVE |
| Team page | D10 statement | Supplied by the reworded S6/S7 disclosure (O2) |
| Matchup | Hero buttons (S9) | REMOVE |
| Matchup | Active-correction note (S10) | KEEP BUT REWORD; show whenever either side has an active correction |
| Matchup | Duel/QB notes (S11) | KEEP BUT REWORD; QB name from canonical/preset source |
| Matchup | Forecast values | NO CHANGE |
| QB Rankings | Default and Customize (S14) | NO CHANGE (UX-08) |
| Method | QB return correction paragraph and KPIs (S15) | KEEP |
| Method | Status card sub | CHANGE COPY (O3) |
| Method | Forecast-inputs sentence (S16) | NO CHANGE |
| About | Positioning and glossary | NO CHANGE |
| Exports | Rankings "QB return" column; team Lab card; manual-state numbers (S19) | REMOVE, following source removal (8.3) |
| Mobile | Card-header KC button, team/matchup hero buttons, Lab stacked controls | REMOVE with their elements |
| Accessibility labels | Quick-button `title`s; Lab labels | REMOVE with elements; retained disclosures get visible text |
| Keyboard | Quick buttons, select, range, Apply, Reset | REMOVE from focus order by removing elements; no `tabindex` workarounds |
| Persisted state | `S.qbCarryover` | KEEP INTERNAL, `enabled:false` initializer unchanged, no public writer (O4) |
| Internal/debug APIs | `qbCarryoverUnitEffect`, `currentTeamState`, debug hooks, automatic-correction functions | KEEP |
| Event handlers | `#qbCarryoverElo`, `#applyQBCarryover`, `#clearQBCarryover`, `[data-qbquick]` (5454-5478) | REMOVE |
| Generated `public/` | `public/assets/app.js`, `public/assets/styles.css` | Regenerate with `scripts/build_public.py`; never hand-edit |

### 8.2 CSS and grid boundary (selector level)

Do not delete line ranges. Several lines in `assets/styles.css` mix tool selectors with shared ones.

**Tool-only selectors, safe to remove once their markup is gone:**
- Line 64: `.carryover-card`.
- Line 65: `.carryover-card .card-head h2`, `.carryover-copy`, `.carryover-preset`, `.carryover-preset b`, `.carryover-controls`, `.carryover-controls label`, `.carryover-controls select`, `.range-line`, `.range-line input`, `.range-line output` (only the Lab uses `range-line`), `.carryover-actions`, `.carryover-results`, `.carryover-warning`, `.carryover-on`.
- Line 66: the whole `@media(max-width:950px)` block (carryover controls only).
- Lines 82-85: `.qb-quick`, `.qb-quick:hover`, `.qb-quick.active`, `.qb-quick small`, `.qb-quick.active small`.
- Line 86: `.qb-action-cell`, `.qb-action-cell:empty::after`.
- Line 87: `.team-quick-fix`.
- Line 88: `.home-qb-fix`.
- Line 92: only `.team-directory-card>.qb-quick`.
- Line 93: only `.home-qb-fix{display:none}`, `.rank-row>.home-qb-fix` (from the selector list `.rank-row>.raw,.rank-row>.home-qb-fix`) and `.qb-action-cell{min-width:80px}`.
- Lines 94-95: only `.card-head-actions .qb-quick` (both rules).
- `.primary-action` (line 65 and the line 310 override) is used only by the Lab Apply button today. Remove both only if a source search at implementation time still finds no other user.

**Shared rules that must stay:**
- `.carryover-inline` and `.muted-strike` (line 65), if the reworded S6 chip reuses them; otherwise rename with the markup.
- `.scenario-hero`, `.scenario-stat*` (line 2): Roster Lab uses them (4251-4254).
- `.scenario-unit-cell small`, `.unit-scenario-note`, `.scenario-unit-row` (line 130): retained unit disclosures (O1).
- `.team-directory-card`, `.team-directory-link` (line 92); `.card-head-actions` container (line 94), which still holds the "32 teams" chip; the rest of line 93's responsive rules (`.matchup-pair`, `.rank-row` 4-track mobile grid, `.rank-row>.raw`, `.matchup-team.home-team`).
- `.name-verdict*`, `.recommended-name` (line 65) are unused naming-lab leftovers, not part of the tool. Leave them; removing them is out of scope.

**Grid and table structure:**
- Home `.rank-row` base grid (line 2) has 5 tracks: `36px 1fr 74px 72px 78px` (rank, team, score, Elo, record). Line 89 overrides it with a sixth track `minmax(0,92px)` for `.home-qb-fix`. When the span goes, remove the line-89 override so the 5-track base applies. Mobile (≤950px) uses `30px 1fr 68px 58px` with `.raw` hidden and is otherwise unaffected.
- Rankings tables are `<table>` markup: remove the "QB return" `<th>` in `rankingHeader` and the `<td class="qb-action-cell">` in `rankingRow` for Strength, FLAG and Advanced together, so header and row counts match. No rankings `colspan` or `nth-child` width rule depends on that column. The generic `.diagnostic-table td:nth-child(n+4)` tabular-number rule is unaffected.

### 8.3 Export behavior (corrected)

What the exporter does today:
- `exportCurrentPagePng` (5177) clones the page and removes `.footer, .matchup-warning, .matchup-back, .qb-quick` (5205). On rankings routes it also removes `.section-title, .diagnostic-viewer, .diagnostic-note, .penalty-sort-toolbar, p.raw` (5210).
- `prepareCloneForSocialExport` (5154) then:
  1. calls `simplifyInteractiveControlsForExport` (5139), which replaces every `button` and `a` (except `.export-preserve-control`) with a `span` that keeps class, inner HTML, style and `aria-label`;
  2. removes a fixed list of notes;
  3. removes every `.sub` and `small` element.
- It does **not** transform `select`, `input` or `output`. A team-page export therefore carries the QB Return Lab card, including its `select#qbCarryoverQB`, range `input#qbCarryoverElo` and `output` as cloned form elements, its Apply/Reset buttons turned into spans, and its before→after `strong` values (the `small` notes are removed).
- The rankings exports keep the "QB return" header; KC's button cell becomes empty and shows "-".

Required after removal: exported rankings contain no "QB return" column; exported team pages contain no Lab card, no manual controls and no manual-state output; exported numbers equal the automatic-only state. The `.qb-quick` cleanup selector can stay (it is harmless and `test_v21_export_packing.js` asserts it).

## 9. Model / forecast impact

**Expectation confirmed: removing the public tool does not by itself change default output.** Evidence:

- Code: current/future consumers read `effectiveQbCorrection`, which returns the automatic value whenever `qbCarryoverActive(t)` is false. `qbCarryoverActive` requires `S.qbCarryover.enabled`, which initializes to `false` (304) and becomes `true` only through the Lab Apply and quick-button handlers. Historical paths call `QR.correction` directly and never read manual state.
- Real-bundle probe (scratch only; fixture style of `test_v149_qb_propagation.mjs`, via `scripts/lib/force_app_harness.js` on `a5f5557`):

| State | KC Elo (active) | KC vs DEN home win prob. | BUF Elo (league) | BUF Elo (team-page path) | BUF displayed QB unit |
| --- | --- | --- | --- | --- | --- |
| Default (`enabled:false`) | 1508.92 (core 1495.67 + auto 13.24) | 56.02% | 1482.92 | 1482.92 | 50.0 |
| Quick button on KC (manual 47.3) | 1542.97 | 61.60% | 1482.92 | 1482.92 | 50.0 |
| After Reset | same as Default | 56.02% | 1482.92 | 1482.92 | 50.0 |
| Lab on BUF (manual 40) | 1508.92 | 56.02% | 1482.92 | **1522.92** | **67.9** |
| Auto only, KC starter not measured | 1508.92 | 56.02% | 1482.92 | 1482.92 | 50.0 (KC overlay 55.8) |

**Coupling risks the removal must respect:**
1. `ratingsWithActiveQBCarryover`, `ratingsWithQBCarryover`, `effectiveQbCorrection`, `qbCarryoverUnitEffect` and `currentTeamState` look like tool code but carry the automatic correction into current ratings, projections and the QB Rankings Default value. They must stay.
2. The overlay QB label falls back through `S.qbCarryover.qb` (section 2). Keep the object (O4); do not change the fallback order in this tranche.
3. The automatic overlay (`_qbScenario`) exists for B as well as A. Rewording S10-S13 must not remove the overlay or its data.

**Pre-existing inconsistencies (not fixed; reported for UX-09/UX-10 intake):**
- `teamPage` forecasts its schedule with `ratingsWithQBCarryover(t, …)`, which applies only the viewed team's correction. On another team's page, a game against KC omits KC's automatic correction, while matchup and rankings include it.
- Roster Lab (`lab`, 4223) starts from `currentRatings()`, which excludes the automatic correction.

## 10. Test impact and future acceptance criteria

### 10.1 Existing tests (exact files and current catalog membership at `a5f5557`)

| Test | Catalog suites / classification | QB-return relevance | Removal-tranche action |
| --- | --- | --- | --- |
| `test_ux14_tranche_b.mjs` | safe / regression | Line 165 asserts `Use auto QB fix\|carryover correction` and `<th>QB return</th>` exist; line 166 asserts Method contains "manual what-if available on team pages"; line 45 slices Method at `<h2>QB return correction</h2>` | **Replace** the UX-19 parts of 165-166 with negative assertions in the new UX-19 test; keep the UX-08 half (`1.20x expansion`) and the line-45 slice heading. Document as intentional UX-19 supersession. |
| `test_ux14_public_explanations.mjs` | safe / regression | No QB-return assertion | No change |
| `test_v21_export_packing.js` | safe / regression | Export cleanup regex contains `.qb-quick` | No change (selector kept) |
| `test_v117_luck_table.js` | safe, model / regression | Luck rows exclude `quickQbButton` | No change; its comment becomes stale (comment only) |
| `test_v33_qb_regime.js` | safe, qb, model / **frozen-regression** | Rule values, gate, exact manual-override line, decay call | No change (O4) |
| `test_v30_predictive_gates.js` | safe / regression | `qbCarryover` gate, `predictiveQbCarryoverAllowed()` | No change |
| `test_v45_unit_force_bridge.js` | safe, model / regression | `ratingsWithActiveQBCarryover` signature and use in `matchups`, `home`, `teams` | No change; preservation evidence |
| `test_v69_canonical_historical_state.js` | safe / **frozen-regression** | Historical `QR.correction(qbCarryoverPreset(t),gamesPlayed)` | No change |
| `test_v149_qb_propagation.mjs` | safe, release, qb / regression | `ratingsWithActiveQBCarryover`; `qbCarryoverUnitEffect` overrides and suppression | No change |
| `test_projection_semantics_audit.mjs` (+ `lib/projection_semantics_audit.js`) | safe, model / regression | Drives manual KC through `Object.assign(S.qbCarryover, …)` | No change (O4) |
| `test_qb_customize_audit.mjs` | safe, qb, model / regression | `scenarioGap` = displayed minus measured QB | No change (automatic overlay remains) |
| `test_qb_correctness.mjs` | safe, release, qb, model / regression | Canonical QB; no tool assertion | No change; preservation evidence |
| `test_v123_playoff_record_seed_coherence.js` | safe, model / regression | Stubs `QB_CARRYOVER` | No change |
| `test_v124_representative_playoff_projection.js` | safe, model / regression | Stubs `QB_CARRYOVER` | No change |
| `test_v75_playoff_structure.js` | safe, model / regression | Stubs `QB_CARRYOVER`, `FORCE_QB_REGIME:null` | No change |
| `test_v40_team_logos.js` | safe / regression | Loads `data/qb-carryover.js` and `model/qb_regime.js` in its bundle list | No change (files stay) |
| `test_qb_carryover_ui.js` | none (default exclusion) / historical-fixture | Drives Lab DOM ids | Leave excluded and unrepaired; note as superseded by UX-19 |
| `test_v14_matchup_clarity.js` | none / historical-fixture | Drives Lab DOM ids and expects a "QB-return scenario" effect | Same |
| `test_v10_ui.js` | none / historical-fixture | Expects `data-qbquick="KC"` in the home card header | Same |
| `test_v118_playoffs.js` | none / historical-fixture | Stubs `QB_CARRYOVER` | No change |
| `test_v11_ui.js`, `test_v16_spread_sign.js`, `test_v24_refresh_integration.js` | none / historical-fixture | Load `data/qb-carryover.js` only | No change |
| `test_v27_metric_transform_smoke.js`, `test_v28_metric_transform_smoke.js` | none / research-artifact | Call `LP.applyQbCarryoverScenario` | No change (transform stays) |
| `scripts/validate_bundle.py` | not in catalog (legacy validator) | Asserts `'QB Return Lab' in app`; runs `test_qb_carryover_ui.js` | Leave; record as superseded |

### 10.2 New regression for the removal tranche

Suggested name `scripts/test_ux19_qb_return_removal.mjs` (safe suite; real bundle through `force_app_harness.js`). The golden fixture must freeze:
- harness time (`now`);
- schedule and completed games;
- profiles, including each team's current starter name and `playerStatGames`, so overlay suppression is deterministic;
- `S.engineCache` ratings;
- presets, gates and every other environmental input.

Golden values are captured from `a5f5557` on that same fixture before the edit. Unrounded values are compared with a documented absolute tolerance (for example `1e-9` for Elo and probabilities) wherever exact equality is not guaranteed.

- **A1. Public tool gone.** Render home, rankings (Strength, FLAG, Advanced, Units, Luck), teams, team pages for KC and a non-preset team, a KC matchup, QB Rankings (Default and Customize), Method and About. None contains `data-qbquick`, `qb-quick`, `QB Return Lab`, `qbCarryoverQB`, `qbCarryoverElo`, `applyQBCarryover`, `clearQBCarryover`, `<th>QB return</th>`, "No verified QB-return preset", "manual what-if", "Apply QB fix", "Use auto QB fix", "QB manual" or "QB-return scenario".
- **A2. No public writer (source-level proof).** A source search of `assets/app.js` finds no assignment to `S.qbCarryover` or its fields outside the initializer, and no remaining manual-control ids or `data-qbquick`. Event-binding absence is supporting evidence, not the only proof.
- **A3. No public writer (behavior).** After rendering every page and running the binding pass with a DOM stub that records handlers, `S.qbCarryover.enabled === false` and no handler is bound to the removed ids or `[data-qbquick]`.
- **A4. Default outputs identical.** League ratings, `forecastFor` probabilities for a fixed game set, `seasonProjection` expected wins and `currentTeamState(t).elo` equal the golden values within tolerance.
- **A5. Automatic correction preserved.**
  - `ratingsWithActiveQBCarryover().KC − currentRatings().KC` equals `FORCE_QB_REGIME.correction(preset, gamesPlayed)`, and is zero for non-preset teams.
  - The KC overlay appears when the returning starter has no current-season stats and is suppressed when he does.
- **A6. QB Rankings FORCE Default correct.** The Default rating equals `displayedQbIndex` from `currentTeamState`. With the unmeasured-starter fixture, the automatic overlay still moves KC's Default value as designed.
- **A7. QB Rankings Customize unchanged.** For fixed weights, `qbCustomRawScore`, `qbCustomScore` and the rendered Customize ranking order equal golden values. Customize never reads `displayedQbIndex`.
- **A8. Disclosures (O1/O2/O3).**
  - With an active correction, the team hero shows a visible text disclosure meaning "QB return correction +N Elo", and the matchup shows a visible active-correction disclosure.
  - The matchup disclosure also appears when the overlay is suppressed but the Elo correction is active.
  - The Method status card reads "Used only in verified cases, and it fades as the starter plays." The Method paragraph keeps the verified-cases statement.
  - No retained disclosure relies on `title` alone.
- **A9. Exports.** A rankings export clone has no "QB return" header. A team export clone has no Lab card, no `select`/range `input`/`output` from the Lab and no manual-state output.
- **A10. Internal capability present.** `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE` and `FORCE_RATING_LEDGER` exist. `qbCarryoverUnitEffect(t, ratings, override)` still returns a what-if result. Setting `S.qbCarryover` in the harness still overrides as before (O4).

### 10.3 Acceptance criteria for the removal tranche

- A1-A10 pass. `test_ux14_tranche_b.mjs` is updated as in 10.1 with intent documented. Safe, release, QB, model, snapshot and server suites pass in an LF export (native Windows: only the known V77 CRLF failure).
- `scripts/build_public.py` regenerates `public/`; generated files match source.
- Desktop 1440×900 and mobile 375×812 checks of home, rankings (Strength/FLAG/Advanced), teams, KC and BUF team pages, a KC matchup and Method show:
  - no QB-return controls;
  - no empty column or grid gap;
  - no new horizontal overflow;
  - no console errors;
  - retained disclosures readable without hover on touch and focusable or visible for keyboard users.
- No model, data, Worker, server or forecast change; `data/qb-carryover.js` and `model/qb_regime.js` unchanged.

## 11. Files expected in the removal tranche

- `assets/app.js`:
  - remove S1-S5, S8 and S9 renderers and calls, `quickQbButton`, `qbCarryoverPanel`, handlers 5454-5478 and the "QB return" column;
  - reword S6, S7 and S10-S13 (O1);
  - make the matchup disclosure follow the active Elo correction;
  - apply O3 and O5 copy.
- `assets/styles.css`: selector-level removals and the line-89 grid override (section 8.2).
- `public/assets/app.js`, `public/assets/styles.css`: regenerated only.
- `scripts/test_ux19_qb_return_removal.mjs` (new), `scripts/test_ux14_tranche_b.mjs` (guard replacement), `scripts/test_catalog.json`, `scripts/TESTING.md`.
- `FORCE_ROADMAP.md` (UX-19 and UX-14 D10 status), `UX14_PUBLIC_EXPLANATION_INVENTORY.md` (D10 and section D status).
- Not expected: `model/*`, `data/*`, `src/index.js`, `force_server.py`, `index.html`, `QB_REGIME_RESEARCH_V33.md`.

## 12. Final contract for the removal tranche

- **REMOVE PUBLIC:**
  - quick QB buttons (S1, S2, S4, S5, S9);
  - QB Return Lab (S8);
  - rankings "QB return" column (S3);
  - "No verified QB-return preset";
  - manual handlers and focus targets;
  - dead tool CSS;
  - manual export artifacts.
- **KEEP:**
  - automatic verified correction and all its consumers;
  - canonical QB rating;
  - QB Rankings Default and Customize;
  - internal manual-override machinery (`S.qbCarryover`, override branch);
  - debug and research machinery;
  - Method QB return paragraph and evidence.
- **KEEP BUT REWORD:**
  - team-level automatic-correction chip and base-projection context;
  - matchup and unit correction disclosures;
  - Method status card;
  - Teams intro.
- **D10:** Method and internal research hold the rationale; the retained O1 team-level disclosure is the short active-team statement.

## 13. Non-goals and preserved features

- No change to the automatic V33 correction, its data, gate, decay, eligibility or KC preset.
- No change to the canonical QB rating, QB weights, opponent/pressure/recency context, offense composite, FORCE bridge, FORCEcast, market blend, playoffs, Luck, FLAG or score simulation.
- QB Rankings Customize (`UX-08`) unchanged and still gated; UX-14 D1/D2 remain gated.
- Roster Lab and its immediate feedback (PRESERVE) unchanged; its baseline question stays under `UX-09`.
- No fix for the team-page schedule baseline inconsistency or the reset/name-fallback coupling.
- No localhost or debug setter for the manual override (O4).
- Routing, per-page URLs, loader, export pipeline, security gates and the Worker unchanged.
- Other UX-14 groups and gates (`UX-08`, `UX-15`, `UX-17`, `UX-18`, `UX-31`) remain under their own items.
