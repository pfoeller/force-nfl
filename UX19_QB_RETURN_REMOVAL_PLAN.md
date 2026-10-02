# UX-19 public QB-return tool removal plan

Roadmap item: `UX-19` (remove public QB adjustment / QB-return tool). Decision status CONFIRMED (owner, 2026-10-01). This document is the planning prerequisite named in the item's acceptance contract: "a bounded public-removal plan identifying retained internal capability, followed by separately authorized removal."

Prepared 2026-10-02 on `cycle4/claude-product` from exact `main @ a5f5557`. **Planning only. Nothing was removed.** No production, model, data, test or generated `public/` file changed in this tranche. Line numbers below refer to `a5f5557`.

## 1. Summary

- The public tool is a **manual override** of the automatic V33 returning-QB correction. It has two entry points: the **QB Return Lab** panel on every team page and the **QB quick button** (`quickQbButton`) on home, rankings, teams, team hero and matchup hero.
- Manual state lives only in the in-memory `S.qbCarryover` object. **Nothing persists it**: no `localStorage`, URL, hash, export or server path reads or writes it. A reload always restores the default (`enabled:false`). No migration is needed.
- **Default behavior does not depend on the tool.** With `S.qbCarryover.enabled === false` every forecast, ranking and projection is driven only by the automatic correction. Removing the controls, and making sure nothing public can set `enabled:true`, leaves default output identical. This was checked with a real-bundle probe (section 9).
- **The manual state is global while it is set.** One click on the home-page KC button replaces the automatic KC correction (+13.2 Elo in the probe after one game) with the preset's full +47.3 Elo, with no decay, in every forecast, ranking, playoff projection and PNG export until Reset or reload. In the probe this moved a KC home game from 56.0% to 61.6%.
- **The manual state is also incoherent for the 31 teams without a preset.** The Lab slider works on any team page. For such a team it changes that team page's projection (+40 Elo in the probe) and the displayed QB unit everywhere, including the QB Rankings FORCE Default column (50 to 67.9 in the probe), but not league forecasts or rankings. This is extra evidence for removal, not a separate fix.
- Some of the surfaces people associate with "QB return" are actually **disclosures of the automatic correction** (team hero "QB auto" chip, "base projection" fragment, "QB-return scenario" unit notes, matchup "returning-QB adjustment active"). Whether those stay, change wording, or go is an owner decision (O1). The Method section that already says the correction applies "only to verified situations" stays.
- QB Rankings Customize (`UX-08`) shares no state or handler with the tool. It reads the canonical displayed QB value, which can carry an automatic overlay; removal does not change that path.

## 2. Three concepts and their shared code

| Concept | What it is | State | Code that is only this concept | Code shared with another concept |
| --- | --- | --- | --- | --- |
| **A. Public manual QB-return tool (UX-19 target)** | Visitor-set override of the returning-QB Elo correction for one team | `S.qbCarryover = {enabled, team, qb, restoreElo}` (app.js:304), written only by the Lab Apply/Reset handlers (5457-5466) and quick-button handler (5468-5478) | `quickQbButton` 1290-1299; `qbCarryoverPanel` 1305-1350; handlers 5454-5478; CSS `.qb-quick`, `.carryover-card/controls/actions/preset/copy/results/warning`, `.qb-action-cell`, `.team-quick-fix`, `.home-qb-fix`, `.card-head-actions .qb-quick` (styles.css:63-66, 82-95) | `qbCarryoverActive` 1263 and the manual branch of `effectiveQbCorrection` 1236-1240 (feed B's consumers); `S.qbCarryover.qb` fallback for the overlay QB label in `qbCarryoverUnitEffect` 1993 |
| **B. Automatic verified QB correction (keep)** | V33 rule: `min(surviving damage, 7.5 Elo × verified missed starts × 70%)`, 60 Elo cap, 4-game half-life, only for presets with `autoEligible`, `verifiedReplacementWindow`, `expectedStarterReturned`. KC (Mahomes) is the only preset. | None in the browser beyond schedule/profile; data in `data/qb-carryover.js`, gate in `data/predictive-feature-gates.js` (`qbCarryover`) | `model/qb_regime.js` (`FORCE_QB_REGIME.correction`); `automaticQbRegimeCorrection` 1230-1234; `predictiveQbCarryoverAllowed` 1267; `qbCarryoverPreset` 1221; `canonicalGameTeamState` 1934-1938; week-2 entry states 2085, 2095; `LP.applyQbCarryoverScenario` (live_profiles.js:508); `suppressQbUnitScenarioOverlay` 1255-1261 | `effectiveQbCorrection`, `ratingsWithActiveQBCarryover` 1280-1288 (all league forecasts), `ratingsWithQBCarryover` 1271-1277 (team page), `qbCarryoverUnitEffect` 1973-2005, `currentTeamState` 2010-2031 (`_qbScenario` overlay), `ratingLedger` 2113 |
| **C. QB Rankings Customize (UX-08, keep, separate gate)** | Visitor weights for a ranking-only QB composite | `S.qbRankingMode`, `S.qbWeights` | `qbCustomRawScore`, `qbCustomScore` 4127-4136; `[data-qb-mode]`, `[data-qb-weight]` handlers 5411-5412 | Reads `qbDebug(t).displayedQbIndex` (via `qbComponentScores` 4094) for the Default column, which comes from `currentTeamState` and therefore from B's overlay (and today from A's overlay too) |

**Coupling to watch.** A and B meet in exactly one place: `effectiveQbCorrection` returns the manual value when `qbCarryoverActive(t)` is true, otherwise the automatic value. Every consumer (league ratings, team page, unit overlay, QB Rankings Default, rating ledger, debug hooks) goes through it. Removing the public writers of `S.qbCarryover` is sufficient to remove A's effect everywhere; the consumers must stay because they carry B. C has no code in common with A beyond reading the same canonical state.

## 3. Current public surface inventory

"Public" means rendered on forceratings.com (not gated by `USE_HASH_ROUTING` or localhost). Visibility conditions are traced from code; KC is the only team with a preset.

| # | Surface | File / function | User-visible behavior | State read / written | Downstream effect | Concept | UX-19 requires removal? | Internal capability to keep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Home, FORCE Rankings card header | `home` app.js:4033 → `quickQbButton('KC')` | Hard-coded KC button: "QB auto +N" (or "Apply QB fix" / "Use auto QB fix"). Visible at all widths, shrunk under 650px | reads `S.qbCarryover`; click writes it | Click sets KC manual +47.3 Elo globally | A | Yes | none |
| S2 | Home, top-8 rank rows | `home` 4026 `.home-qb-fix` | Same button in the KC row if KC is top 8. Hidden under 950px by CSS | same | same | A | Yes | none |
| S3 | Rankings Strength, FLAG and Advanced views | `rankingHeader` 3388 (`<th>QB return</th>`), `rankingRow` 3399 | Extra "QB return" column; KC cell holds the button, every other cell shows "-" via `.qb-action-cell:empty::after`. Not on Luck (V117) or Units | same | same | A | Yes (column and cells) | none |
| S4 | Teams directory cards | `teams` 4177 | Button under the KC card | same | same | A | Yes | none |
| S5 | Team hero, quick button | `teamPage` 4198 `quickQbButton(t,false)` | KC: button with detail line ("Patrick Mahomes \| automatic returning-QB correction"). **Every other team: plain text "No verified QB-return preset"** | same | same | A | Yes | none |
| S6 | Team hero, correction chip | `teamPage` 4196-4198 | When a correction is in effect: "QB auto +N Elo" or "QB manual +N Elo" chip and struck-through base Elo | reads `effectiveQbCorrection` | Display only | B (manual wording is A) | "manual" variant yes; auto variant **O1** | Value from `currentTeamState` |
| S7 | Team hero, record line | `teamPage` 4199 | "· base projection N wins" when a correction is in effect | same | Display only | B | **O1** | `projected(t, baseRatings)` |
| S8 | QB Return Lab panel | `qbCarryoverPanel` 1305-1350, rendered on every team page 4205 | Card "Returning quarterback adjustment / QB Return Lab", AUTO/MANUAL/OFF chip, explainer, preset paragraph (KC) or "No preset for this team. Use the slider for a one-off what-if.", QB select, 0-80 Elo slider with live output, Apply/Reset, before→after FORCE score, offense profile, QB unit, projected wins and next-game forecast, D10 "Why the automatic correction is cautious" warning | reads/writes `S.qbCarryover`; renders hypothetical forecasts | Apply sets manual state (any team) | A; explainer and D10 text describe B | Yes (whole panel) | D10 rationale to internal/deeper docs (section 7) |
| S9 | Matchup hero | `matchupPage` 3945, 3947 | Button under the KC side | same as S1 | same | A | Yes | none |
| S10 | Matchup prediction note | `matchupPage` 3987 | "… \| returning-QB adjustment active." when either side has a unit overlay (`_qbScenario`) | reads profile overlay | Display only | B (fires for manual too) | **O1** | overlay data |
| S11 | Matchup duel and QB notes | `scenarioMetricNote` 2256-2268 via 3939-3942; QB name 3941, 3972, 3976 | "QB-return scenario · was N" beside offense/QB values; QB line shows the overlay QB name | reads `_qbScenario` | Display only | B (manual too) | **O1** (wording "scenario" implies a what-if) | overlay data |
| S12 | Rankings Units view, QB cell tooltip | `rawUnitCell` 2529-2530 | `title` "Displayed QB includes returning-QB scenario overlay: X measured base → Y scenario value." | reads `_qbScenario` | Display only | B | **O1** | same |
| S13 | Units cells / team unit board | `unitCell` 2282-2288 (`N base` small text, `.scenario-unit-cell`), `unitBoardRow` 2567-2572 ("N base · QB-return scenario") | Orange "base" sub-values on overlaid units | reads `_qbScenario` | Display only | B | **O1** | same |
| S14 | QB Rankings FORCE Default column | `qbRankingsPage` 4149 via `qbDebug` | Shows `displayedQbIndex`, which includes any overlay; no label | reads `currentTeamState` | Display only | C reading B (and A today) | No (UX-08 gate) | unchanged |
| S15 | Method, QB return correction | `model` 4301-4307 | h2, paragraph ("…applies the automatic correction only to verified situations…"), three evidence KPIs; status card sub "Automatic only for verified cases; manual what-if available on team pages." | none | none | B, plus A clause | Remove only the clause "manual what-if available on team pages" | Section stays (UX-14 SIMPLIFY, keep evidence) |
| S16 | Method, forecast inputs | `model` 4325 | "…and the limited returning-QB correction." | none | none | B | No | keep |
| S17 | Teams intro | `teams` 4173 | "Rating, context, schedule, and what-ifs." | none | none | A (the only team-page what-if is the Lab) | **Change copy** (see O5) | n/a |
| S18 | Home hero / About positioning | 4030, 4334 | "roster what-ifs" | none | none | Roster Lab, not A | No | keep |
| S19 | PNG export | `exportCurrentPagePng` 5205 removes `.qb-quick`; `prepareCloneForSocialExport` | Rankings PNGs still carry the "QB return" header with "-" cells; team PNG carries the Lab card with controls flattened to text; all PNG numbers reflect any active manual state | reads rendered DOM | Shares manual what-if numbers as if published | A | Yes (follows from S3/S8 removal) | export pipeline unchanged |
| S20 | Accessibility / keyboard | S1-S5, S8, S9 | Each quick button and Lab control is in tab order. Buttons have only a `title` ("Open manual override for Patrick Mahomes carryover correction", which does not match the click behavior); `select#qbCarryoverQB`, `input#qbCarryoverElo` (type range), `output#qbCarryoverValue`, Apply/Reset buttons with visible labels | n/a | n/a | A | Yes, with S1-S9 | n/a |

Local-only or never-visible items: `FORCE_QB_DEBUG` (2441), `FORCE_CURRENT_TEAM_STATE` (2037), `FORCE_RATING_LEDGER` (2438) console hooks; the test harness's direct `S.qbCarryover` writes. None is reachable from the public UI.

## 4. Retained internal capability

| Capability | Location | Disposition |
| --- | --- | --- |
| Automatic verified correction rule | `model/qb_regime.js`, `data/qb-carryover.js`, `data/predictive-feature-gates.js` (`qbCarryover`) | **KEEP INTERNAL** (it is model behavior, unchanged) |
| Automatic correction in current and historical FORCE | `automaticQbRegimeCorrection`, `predictiveQbCarryoverAllowed`, `ratingsWithActiveQBCarryover`, `ratingsWithQBCarryover`, `canonicalGameTeamState`, week-2 entry states | **KEEP INTERNAL**; names and call sites unchanged (frozen tests V33/V45/V69 assert them) |
| Unit overlay transform and its suppression | `LP.applyQbCarryoverScenario`, `qbCarryoverUnitEffect`, `suppressQbUnitScenarioOverlay`, `currentTeamState._qbScenario` | **KEEP INTERNAL**; `qbCarryoverUnitEffect(t, ratings, restoreOverride, qbOverride)` stays as the test/debug what-if entry point |
| Manual override branch in `effectiveQbCorrection` and `S.qbCarryover` | app.js:304, 1236-1240, 1263-1265 | **KEEP INTERNAL, unreachable from public UI** (recommended default, see O4). `test_v33_qb_regime.js` (frozen) asserts the exact override line, and `projection_semantics_audit.js` drives a manual KC fixture through `S.qbCarryover`. Removing it would rewrite a frozen contract for no public benefit. |
| Canonical new FORCE QB Rating, availability and starter selection | `model/live_profiles.js`, `qbDebug`, `qbComponentScores` | **KEEP**, untouched; UX-19 does not touch QB scoring |
| Debug hooks | `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE`, `FORCE_RATING_LEDGER`, `FORCE_CANONICAL_GAME_TEAM_STATE` | **KEEP INTERNAL**, unchanged |
| Historical research and rationale | `QB_REGIME_RESEARCH_V33.md`, `QB_CARRYOVER_RESEARCH*.md`, `research/qb_carryover_event_study.py`, `QBC.study` | **KEEP INTERNAL**; D10 rationale lands here (section 7) |
| Public manual controls, handlers, "No verified QB-return preset" text, "QB return" column | S1-S5, S8, S9, S3; handlers 5454-5478 | **REMOVE PUBLIC ONLY** (the functions they call stay) |
| `quickQbButton`, `qbCarryoverPanel` render functions | 1290-1299, 1305-1350 | **REMOVE ENTIRELY** once no caller remains (pure render code, no test imports them by name). Their hypothetical-forecast math is already available through `qbCarryoverUnitEffect`, `projected` and `forecastFor`. |
| Dead CSS for the tool | styles.css:63-66 (carryover controls), 82-88, 92-95 (`.qb-quick` family) | **REMOVE ENTIRELY**, except `.carryover-inline`, `.muted-strike`, `.scenario-unit-cell`, `.unit-scenario-note`, `.scenario-unit-row` if O1 keeps those disclosures |

## 5. Persisted manual state

Traced writers and readers of `S.qbCarryover`: initializer (app.js:304), Apply (5462), Reset (5466), quick button (5474-5475), test harnesses. `localStorage` holds only `forceRatingView` (302, 5502). Routing (`navigateRoute`, `publicPathForRoute`, legacy hash) carries only the route. The diagnostics payload records `location.hash` but no carryover state. The Worker (`src/index.js`), Python server and snapshot never mention it. PNG export renders the current DOM and stores nothing.

So the only "persistence" is within one open tab: once set, a manual value survives SPA navigation, Back/Forward and snapshot refreshes until Reset or reload.

| Contract | Consequence | Assessment |
| --- | --- | --- |
| Ignore old values | Nothing to ignore across loads; a tab still running the old bundle keeps its in-memory value until reload, which then loads the new bundle with `enabled:false` | Satisfied automatically |
| Clear on migration | No stored value exists to clear | Not needed |
| Retain but inaccessible | Matches the recommended internal default: the object stays, nothing public writes it | Recommended (O4) |
| One-time migration | Nothing to migrate | Not applicable |

**Stale state cannot keep changing forecasts after removal** provided the removal tranche (a) removes every public writer and (b) keeps the `enabled:false` initializer. An acceptance test must render every public page, run the event-binding pass, and assert `S.qbCarryover.enabled === false` and that league ratings equal the automatic-only ratings (section 10).

## 6. Automatic-correction disclosure

Current public language about the automatic correction, after the tool is gone:

- **Stays without change:** Method "QB return correction" paragraph (4302) already says the correction applies "only to verified situations" and fades; evidence KPIs (4304-4305); Method forecast-inputs sentence (4325).
- **Needs a copy change:** Method status card sub (4306) loses "manual what-if available on team pages". It currently reads "Automatic only for verified cases; manual what-if available on team pages."
- **Owner decision (O1):** team hero chip (S6), "base projection" fragment (S7), matchup "returning-QB adjustment active" (S10), "QB-return scenario" unit notes and tooltips (S11-S13). These appear only when a correction is in effect, so they are the team-level disclosure that a correction is active. Today they also have two quirks the owner should know about: the word "scenario" reads as a visitor what-if, and S10 only fires when the unit overlay is shown, so a KC game can carry the Elo correction with no matchup disclosure once Mahomes has current-season stats.

Owner-approved condition (UX-14 D10, 2026-10-01): a short public statement must remain that automatic QB correction applies only in verified cases. The Method paragraph already satisfies that; the options below are for the status card and any team-level line.

Copy options (plain English, no em dashes; not implemented):

1. **Status card:** "Automatic, and only for verified cases." **Team-level line:** none (rely on Method).
2. **Status card:** "Used only in verified cases, and it fades as the starter plays." **Team-level line (when active):** "Includes a small automatic correction for a returning starting quarterback. FORCE uses this only in verified cases."
3. **Status card:** "Automatic QB correction applies only in verified cases." **Team-level chip (when active):** "QB return correction +N" with a tooltip carrying the same sentence; replace "QB-return scenario" unit notes with "Includes QB return correction".

## 7. D10 placement

- **Current text and purpose:** the Lab's warning (app.js:1347) "Why the automatic correction is cautious: in the historical test, this idea improved predictions more often than it hurt them, but it did not help every team. FORCE therefore uses it only for verified replacement-QB cases, starts with a modest correction, and cuts that correction in half about every four team games." It explains why the correction is limited and decays.
- **Why deferred:** it lives inside the panel UX-19 removes, so UX-14 tranches A and B left it for this item (roadmap UX-14, inventory row D10).
- **What remains necessary:** owner condition: detailed rationale goes deeper; a short public "verified cases only" statement stays.
- **Internal destination for the detailed rationale:** `QB_REGIME_RESEARCH_V33.md` already holds it: the gated subset improved 5 of 6 episodes (line 13), the 4-game half-life, and the note that the +47.3 Elo Lab preset is a deliberately more aggressive counterfactual, not the default input (line 37). No new internal document is needed.

| Option | Where the short statement lives | Tradeoffs |
| --- | --- | --- |
| D10-a | No separate placement: Method "QB return correction" paragraph (unchanged) plus the corrected status card | Smallest change; the statement is one click from every page but not next to the affected team |
| D10-b | Method as in D10-a plus a one-line note on the team page of any team with an active correction (replacing the Lab) | Disclosure sits where the number changes; needs new copy and a render branch that appears only for verified, active cases (KC today) |
| D10-c | Method as in D10-a plus a tooltip on the team hero correction chip (S6) | Compact; depends on O1 keeping the chip; tooltip-only content is weaker on touch screens |

No owner direction already selects one of these, so this plan does not choose.

## 8. Surface-by-surface removal matrix

| Surface | Element | Action |
| --- | --- | --- |
| Home | Card-header KC button (S1) | REMOVE |
| Home | Rank-row button and `.home-qb-fix` span (S2) | REMOVE (drop the empty span so the grid does not keep a blank column) |
| Home | "roster what-ifs" hero copy | NO CHANGE (Roster Lab) |
| Home | Ratings and game forecasts via `ratingsWithActiveQBCarryover` | KEEP (automatic only) |
| Rankings | "QB return" header and action cells, Strength/FLAG/Advanced (S3) | REMOVE |
| Rankings | Luck and Units views | NO CHANGE (no column today) |
| Rankings | Units QB tooltip and "base" sub-values (S12, S13) | OWNER DECISION (O1); if kept, CHANGE COPY away from "scenario" |
| Teams directory | KC card button (S4) | REMOVE |
| Teams directory | Intro "Rating, context, schedule, and what-ifs." (S17) | CHANGE COPY (O5) |
| Team page | Hero quick button and "No verified QB-return preset" (S5) | REMOVE |
| Team page | Hero "QB auto/manual +N Elo" chip and struck base (S6) | REMOVE "manual" variant; auto variant OWNER DECISION (O1) |
| Team page | "base projection N wins" (S7) | OWNER DECISION (O1) |
| Team page | QB Return Lab panel (S8) | REMOVE |
| Team page | D10 rationale | Moves to internal docs; short public statement per D10 option (O2) |
| Team page | Unit board "N base · QB-return scenario" (S13) | OWNER DECISION (O1) |
| Matchup | Hero buttons (S9) | REMOVE |
| Matchup | "returning-QB adjustment active" (S10) | OWNER DECISION (O1) |
| Matchup | "QB-return scenario · was N" notes, overlay QB name (S11) | OWNER DECISION (O1); QB name source stays canonical |
| Matchup | Forecast values | NO CHANGE |
| QB Rankings | Default and Customize (S14) | NO CHANGE (UX-08 gate) |
| Method | QB return correction paragraph and evidence KPIs (S15) | KEEP |
| Method | Status card clause "manual what-if available on team pages" | CHANGE COPY (O3) |
| Method | Forecast-inputs sentence (S16) | NO CHANGE |
| About | Positioning and glossary | NO CHANGE (no QB-return content) |
| Exports | Rankings PNG "QB return" column; team PNG Lab card (S19) | REMOVE (follows from source removal); export pipeline NO CHANGE; keep the `.qb-quick` cleanup selector (harmless, asserted by V21) |
| Mobile | Card-header KC button (visible under 950px), team hero and matchup hero buttons, Lab stacked controls (styles.css:66, 93-95) | REMOVE with their elements; remove the now-dead responsive rules |
| Accessibility labels | Quick-button `title` attributes; Lab select/slider/output/button labels | REMOVE with elements; any retained chip (O1) gets a plain accessible name |
| Keyboard | Quick buttons, select, range input, Apply, Reset in tab order | REMOVE from focus order (by removing elements); no `tabindex` workarounds |
| Persisted state | `S.qbCarryover` | KEEP INTERNAL, initializer `enabled:false` unchanged, no public writer (O4) |
| Internal / debug APIs | `qbCarryoverUnitEffect`, `currentTeamState`, `FORCE_QB_DEBUG`, `FORCE_RATING_LEDGER`, automatic correction functions | KEEP |
| Event handlers | `#qbCarryoverElo`, `#applyQBCarryover`, `#clearQBCarryover`, `[data-qbquick]` bindings (5454-5478) | REMOVE |
| CSS | `.qb-quick` family, `.carryover-*` control styles, `.qb-action-cell`, `.team-quick-fix`, `.home-qb-fix`, `.card-head-actions .qb-quick` | REMOVE; keep classes still used by retained disclosures |
| Generated `public/` | `public/assets/app.js`, `public/assets/styles.css` | Regenerate with `scripts/build_public.py`; never hand-edit |

## 9. Model / forecast impact

**Expectation confirmed: removing the public tool does not by itself change default model output.** Evidence:

- Code: every consumer reads `effectiveQbCorrection`, which returns the automatic value whenever `qbCarryoverActive(t)` is false; `qbCarryoverActive` requires `S.qbCarryover.enabled`, which initializes to `false` (app.js:304) and is set to `true` only by the Lab Apply handler and the quick-button handler.
- Real-bundle probe (not committed; same fixture style as `test_v149_qb_propagation.mjs`, through `scripts/lib/force_app_harness.js` on `a5f5557`):

| State | KC Elo (active) | KC vs DEN home win prob. | BUF Elo (league) | BUF Elo (team page path) | BUF displayed QB unit |
| --- | --- | --- | --- | --- | --- |
| Default (`enabled:false`) | 1508.92 (core 1495.67 + auto 13.24) | 56.02% | 1482.92 | 1482.92 | 50.0 |
| Quick button on KC (manual 47.3) | 1542.97 | 61.60% | 1482.92 | 1482.92 | 50.0 |
| After Reset | identical to Default | 56.02% | 1482.92 | 1482.92 | 50.0 |
| Lab on BUF (manual 40) | 1508.92 | 56.02% | 1482.92 | **1522.92** | **67.9** |
| Auto only, KC starter not measured | 1508.92 | 56.02% | 1482.92 | 1482.92 | 50.0 (KC shows overlay 55.8) |

**Coupling risks the removal must respect (flag prominently):**

1. `ratingsWithActiveQBCarryover`, `ratingsWithQBCarryover`, `effectiveQbCorrection`, `qbCarryoverUnitEffect` and `currentTeamState` look like tool code by name but carry the automatic correction into every forecast, projection and the QB Rankings Default value. Deleting or bypassing any of them changes FORCE. They must stay.
2. `qbCarryoverUnitEffect` labels the overlay QB as `qbOverride || S.qbCarryover.qb || preset.qb || …` (1993). The `S.qbCarryover.qb` default is "Patrick Mahomes". If the removal deletes `S.qbCarryover` (not recommended), the fallback must stay `preset.qb` so automatic overlay labels do not change.
3. The automatic overlay (`_qbScenario`) is created for B as well as A, so removing scenario-note renderers changes automatic-correction disclosure, not just the tool. That is why S10-S13 are O1, not REMOVE.

**Pre-existing inconsistencies seen while tracing (not fixed, not in UX-19 scope; recommended for intake):**

- `teamPage` forecasts its schedule with `ratingsWithQBCarryover(t, …)`, which applies only the viewed team's correction. On another team's page, a game against KC uses KC without its automatic correction, while the matchup page and rankings include it. Classification: INVESTIGATE under `UX-09`/`UX-10` (baseline honesty).
- Roster Lab (`lab`, 4223) starts from `currentRatings()`, which excludes the automatic correction. Classification: `UX-09` baseline audit already covers Roster Lab.

## 10. Test impact and future acceptance criteria

Existing tests (catalog suites in brackets):

| Test | What it asserts about QB return | Removal-tranche action |
| --- | --- | --- |
| `test_ux14_tranche_b.mjs` [safe] | Line 165: `Use auto QB fix\|carryover correction` and `<th>QB return</th>` still exist (guard that UX-14 B did not touch UX-19). Line 166: Method contains "manual what-if available on team pages" | **Replace** these two guards: keep the UX-08 half of line 165 (`1.20x expansion`), move the UX-19 assertions into the new UX-19 test as negative assertions; document the change as an intentional UX-19 supersession, not a weakening. Line 45 slices Method at `<h2>QB return correction</h2>`; keep that heading or update the slice. |
| `test_v21_export_packing.js` [safe] | Export cleanup regex contains `.qb-quick` | No change if the selector is kept (recommended) |
| `test_v117_luck_table.js` [safe, model] | Luck rows exclude `quickQbButton` | No change; still true. Comment "QB Return stays available in other views" becomes stale (comment only) |
| `test_v33_qb_regime.js` [safe, qb, model; frozen] | Rule values; `predictiveQbCarryoverAllowed`; exact manual-override line in `effectiveQbCorrection`; decay call | No change under O4 default (keep internal override). If the owner chooses to delete the override, this frozen contract must be explicitly reopened |
| `test_v30_predictive_gates.js` [safe] | `qbCarryover` gate and `predictiveQbCarryoverAllowed()` in app | No change |
| `test_v45_unit_force_bridge.js` [safe, model] | `ratingsWithActiveQBCarryover` signature and use in `matchups`, `home`, `teams` | No change; preservation evidence |
| `test_v69_canonical_historical_state.js` [safe; frozen] | Historical `QR.correction(qbCarryoverPreset(t),gamesPlayed)` | No change |
| `test_v149_qb_propagation.mjs` [safe, release, qb] | `ratingsWithActiveQBCarryover`; `qbCarryoverUnitEffect` overrides; suppression for a measured starter | No change |
| `test_projection_semantics_audit.mjs` + `lib/projection_semantics_audit.js` [safe, model] | Drives manual KC via `Object.assign(S.qbCarryover, …)` | No change under O4 default |
| `test_qb_customize_audit.mjs` [safe, qb, model] | `scenarioGap` from displayed vs measured QB | No change (automatic overlay remains) |
| `test_v123`, `test_v124`, `test_v75`, `test_v40` [safe] | Stub `QB_CARRYOVER` / `FORCE_QB_REGIME` globals | No change |
| Excluded: `test_qb_carryover_ui.js`, `test_v14_matchup_clarity.js` (drive Lab DOM ids), `test_v10_ui.js`, `test_v11_ui.js`, `test_v24_refresh_integration.js`, `test_v27/v28_metric_transform_smoke.js`, `test_v91`-`v94` | Already default exclusions (historical-fixture / research / stale) | Leave excluded and unrepaired; note in TESTING that the Lab-driving ones are superseded by UX-19 |
| `scripts/validate_bundle.py` (legacy validator, not in catalog) | Asserts `'QB Return Lab' in app` and runs `test_qb_carryover_ui.js` | Leave; record as superseded legacy validator in the handoff |

New regression for the removal tranche (suggested name `scripts/test_ux19_qb_return_removal.mjs`, safe suite, real bundle through `force_app_harness.js`):

1. **Public tool gone:** render home, rankings (Strength, FLAG, Advanced, Units, Luck), teams, team pages for KC and a non-preset team, a KC matchup, Method and About. None contains `data-qbquick`, `qb-quick`, `QB Return Lab`, `qbCarryoverQB`, `qbCarryoverElo`, `applyQBCarryover`, `clearQBCarryover`, `<th>QB return</th>`, "No verified QB-return preset", "manual what-if", "Apply QB fix" or "Use auto QB fix".
2. **No public writer:** after rendering every page and running the event-binding pass with a DOM stub that records handlers, `S.qbCarryover.enabled === false` and no handler is bound to the removed ids or `[data-qbquick]`.
3. **Default forecasts identical:** with a fixed fixture, league ratings, a set of `forecastFor` probabilities, `seasonProjection` expected wins and `currentTeamState(t).elo` equal values recorded from `a5f5557` on the same fixture (golden values captured before the edit).
4. **Automatic correction preserved:** `ratingsWithActiveQBCarryover().KC − currentRatings().KC === FORCE_QB_REGIME.correction(preset, gamesPlayed)`; zero for every non-preset team; KC unit overlay still appears when the returning starter has no current-season stats and is suppressed when he does.
5. **Disclosure preserved:** Method still says the automatic correction applies only in verified cases (exact string per O2/O3), and the status card has no manual clause.
6. **Exports:** a rankings export clone has no "QB return" header; a team export clone has no Lab card.
7. **Internal hooks present:** `FORCE_QB_DEBUG`, `FORCE_CURRENT_TEAM_STATE`, `FORCE_RATING_LEDGER` exist and `qbCarryoverUnitEffect(t, ratings, override)` still returns a what-if result.

Acceptance criteria for the removal tranche:

- Items 1-7 pass; `test_ux14_tranche_b.mjs` updated as described with intent documented; safe, release, QB, model, snapshot and server suites pass in an LF export (native Windows: only the known V77 CRLF failure).
- `scripts/build_public.py` regenerates `public/`; generated files match source.
- Desktop 1440×900 and mobile 375×812 checks of home, rankings (Strength/FLAG/Advanced), teams, KC and BUF team pages, KC matchup and Method show no QB-return controls, no empty column or grid gap, no new horizontal overflow and no console errors; keyboard tab order on those pages skips no longer existing controls.
- No model, data, Worker, server or forecast change; `data/qb-carryover.js` and `model/qb_regime.js` unchanged.

## 11. Files expected in the removal tranche

- `assets/app.js`: remove S1-S5, S8, S9 renderers and calls, `quickQbButton`, `qbCarryoverPanel`, handlers 5454-5478, the "QB return" column, the Method clause and the Teams intro wording; apply O1/O2/O3 outcomes.
- `assets/styles.css`: remove dead tool CSS.
- `public/assets/app.js`, `public/assets/styles.css`: regenerated only.
- `scripts/test_ux19_qb_return_removal.mjs` (new), `scripts/test_ux14_tranche_b.mjs` (guard replacement), `scripts/test_catalog.json`, `scripts/TESTING.md`.
- `FORCE_ROADMAP.md` (UX-19 and UX-14 D10 status), `UX14_PUBLIC_EXPLANATION_INVENTORY.md` (D10 and section D status).
- Not expected: `model/*`, `data/*`, `src/index.js`, `force_server.py`, `index.html`.

## 12. Owner decisions required

- **O1. Automatic-correction disclosures at team level.** For S6, S7, S10-S13: (a) keep as is; (b) keep but reword, dropping "scenario" and "manual" language (recommended by this plan); (c) remove and rely on Method only.
- **O2. D10 placement.** D10-a, D10-b or D10-c (section 7).
- **O3. Method status-card wording.** One of the section 6 options, or owner text.
- **O4. Internal manual override.** (a) keep `S.qbCarryover` and the override branch internal and unreachable from public UI (recommended default: frozen V33 contract and the UX-10 projection fixture depend on it); (b) also expose a localhost-only debug hook to set it; (c) delete the override entirely, reopening the frozen V33 assertion and the projection fixture.
- **O5. Teams intro wording.** Drop "what-ifs" (for example "Rating, context and schedule.") or point it at Roster Lab.

## 13. Non-goals and preserved features

- No change to the automatic V33 correction, its data, gate, decay, eligibility or KC preset.
- No change to canonical QB rating, QB weights, opponent/pressure/recency context, offense composite, FORCE bridge, FORCEcast, market blend, playoffs, Luck, FLAG or score simulation.
- QB Rankings Customize (`UX-08`) unchanged and still gated; no QB Rankings copy changes (`UX-14` D1/D2 remain gated).
- Roster Lab and its immediate feedback (PRESERVE) unchanged; the Roster Lab baseline question stays under `UX-09`.
- No fix for the team-page schedule baseline inconsistency in this item.
- Routing, per-page URLs, loader, export pipeline, security gates and the Worker unchanged.
- UX-14 groups 4, 6, 7, D1, D2, D5, D6, D8, D9 and other gates (`UX-08`, `UX-15`, `UX-17`, `UX-18`, `UX-31`) remain under their own items.
