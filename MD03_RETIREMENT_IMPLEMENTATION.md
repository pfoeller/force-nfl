# MD-03 automatic QB-return correction retirement (Cycle 6)

**Status:** owner retirement decision CONFIRMED (2026-10-02); retirement IMPLEMENTED ON REVIEW BRANCH `cycle6/claude-md03-retirement` from exact `0e6b745d5cff5fdf8be18ff5676212f3247512f1`; independent validation PENDING; owner acceptance PENDING. Not pushed, merged or deployed. `UX-19` plan revision stays BLOCKED and `UX-19` implementation stays unauthorized. MD-03 is not complete.

The owner retired the automatic correction as a decision under uncertainty. The corrected Cycle 5 research found a small, population-sensitive historical signal, about zero on detector-like populations, with marginal value in the production stack untested. That is not a finding that the effect is zero or that candidates A, B0 or B2 are invalid. All research is preserved ([model investigation](MD03_QB_CORRECTION_MODEL_INVESTIGATION.md), [detector investigation](MD03_QB_EVENT_DETECTION_INVESTIGATION.md), [V33 research](QB_REGIME_RESEARCH_V33.md), `research/`).

## 1. Pre-edit automatic-correction map (base `0e6b745`)

| Question | Finding at base |
| --- | --- |
| Eligibility origin | `data/qb-carryover.js`: hand-authored KC / Patrick Mahomes preset with `autoEligible:true`, `verifiedReplacementWindow:true`, `expectedStarterReturned:true`, `missedStarts:3`. `model/qb_regime.js` `eligiblePreset()` requires all four. |
| Magnitude | `FORCE_QB_REGIME.initialRestore()` = min(measured surviving damage 47.33, 7.5 × 3 × 0.70) = 15.75 Elo; `correction()` decays it with a 4-team-game half-life. |
| Gate | `data/predictive-feature-gates.js` `qbCarryover` accepted, weight 1.0; `assets/app.js` `predictiveQbCarryoverAllowed()` = `PF.brierEligible('qbCarryover')`. The same gate also wrapped manual values in `ratingsWithQBCarryover` and `ratingsWithActiveQBCarryover`. |
| Current application | `automaticQbRegimeCorrection(t)` → `effectiveQbCorrection(t)` (manual overrides, otherwise automatic) → `ratingsWithActiveQBCarryover()` (added to the canonical rating for every preset team) and `ratingsWithQBCarryover(t)` (team page). |
| Propagation | `currentTeamState()` (elo, `qbRegimeCorrection`, unit overlay `_qbScenario` via `qbCarryoverUnitEffect()` unless `suppressQbUnitScenarioOverlay()`), which feeds rankings, teams, matchups, `qbDebug()`, `ratingLedger()`. `ratingsWithActiveQBCarryover()` feeds `seasonProjection()` (playoffs, divisions), `forcecastSlatePage()`, rankings, teams directory and matchups, hence FORCEcast probabilities, Monte Carlo scores and PNG exports of those pages. |
| Representation | Separate overlay added after the unit bridge; never baked into the result Elo, the season engine or server state. |
| Historical | `canonicalGameTeamState()` (V69 pre/post game pages, rematch seeding, `FORCE_V69_STATE_AUDIT`) and both branches of `week2EntryState()` (V99 ledger entry) called `QR.correction()` directly, bypassing the resolver. |
| Manual path | In-memory `S.qbCarryover`, set only by the QB Return Lab Apply/Reset and the quick button. Manual replaced (did not stack on) automatic. Manual never reached historical states. |
| Gate reactivation | Yes: the gate alone switched every automatic route on or off. |
| Stale preset | Yes: any preset with `autoEligible:true` became live on every route. |
| Persistence | None. `localStorage` holds only `forceRatingView`; no URL, server, snapshot or export path stores carryover state. A fresh bundle starts with manual off. |
| Server / Worker / snapshot | No reference. `force_server.py` "carryover" hits are unrelated penalty calibration strings. |
| Contracts asserting automatic behaviour | `test_v33_qb_regime.js`, `test_v30_predictive_gates.js`, `test_v69_canonical_historical_state.js` (catalogued, safe); `test_qb_carryover_ui.js` and `test_v14_matchup_clarity.js` (default-excluded, already failing at base for other reasons); `scripts/validate_bundle.py` (not catalogued). Research tests (`test_md03_qb_model_research.py`, `test_md03_qb_events.mjs`) reproduce V33 offline and never touch production. |

## 2. Retirement implementation

Production entry points removed, not masked:

- `automaticQbRegimeCorrection()` and `predictiveQbCarryoverAllowed()` deleted from `assets/app.js`; the app no longer binds `FORCE_QB_REGIME` or `FORCE_PREDICTIVE_FEATURES` at all.
- `effectiveQbCorrection(t)` returns the manual value when the lab is active, otherwise 0.
- `ratingsWithQBCarryover` / `ratingsWithActiveQBCarryover` apply only manual values and no longer consult the gate. At base the gate was always open, so manual behaviour is unchanged (the existing quirk that a manual value for a team without a preset changes only that team page is preserved).
- `canonicalGameTeamState()` and both `week2EntryState()` branches no longer add a QB restore; `qbRestore` remains in the state objects as an explicit 0 so ledger and audit consumers keep their shape.
- Copy that asserted an automatic correction now says FORCE does not apply one: the QB Return Lab intro and preset sentence, the chip (MANUAL/OFF), quick-button labels (`Clear QB fix` instead of `Use auto QB fix`), the team-page overlay label, and the Method "QB return correction" paragraph, STATUS card (`NOT APPLIED`) and predictive-feature sentence. Controls, layout and the lab itself are unchanged. No em dashes.

Data and dormant machinery:

- `data/qb-carryover.js`: `defaultEnabled:false`, `promotionDecision:"retired-md03-cycle6"`, KC `autoEligible:false` plus `automaticRetired:true`; the V33 numbers (`automaticInitialRestoreElo` 15.75, study) are kept as a record and `suggestedRestoreElo` 47.3 still seeds the manual tool.
- `data/predictive-feature-gates.js`: `qbCarryover` status `retired-md03-cycle6`, weight 0, V33 Brier record kept.
- `model/qb_regime.js`: calculation unchanged, header marks it retired from production. It stays in `index.html` so load order and the public bundle layout are unchanged, but nothing in production calls it.

Defence in depth: even with the legacy preset (`autoEligible:true`) and the legacy accepted gate restored together, every production output is identical to the retired default, because the app has no code path that reads either.

## 3. Historical / canonical policy

The production stack applies no automatic QB-return correction at any timestamp. Completed-game pre/post states, rematch seeding, the V69 audit hook and the V99 Week-2 entry state are reconstructed without it, so for KC they now differ from what the base bundle displayed (section 5). The manual what-if never applied to historical states before and still does not. Offline research artifacts that reproduce V33 (`research/`, `test_md03_qb_model_research.py`, `test_v33_qb_regime.js` math checks on an explicitly re-enabled copy of the preset) remain and cannot affect production.

## 4. Manual QB Return Lab (UX-19 surface) status

Present and functional with its pre-Cycle-6 behaviour: same panel, slider, QB selector, Apply/Reset, quick buttons on rankings, teams directory, team page and matchup, same propagation of a manual value into current ratings, forecasts and projections, same unit overlay and suppression. Only copy that claimed an automatic correction changed. With the lab off, KC now shows OFF and `Apply QB fix` where it showed AUTO and `QB auto +15.7`. `UX19_QB_RETURN_REMOVAL_PLAN.md` is untouched; its D10 short statement ("automatic QB correction applies only in verified cases") and the automatic-chip/base-projection items now describe a state that no longer exists and belong to the blocked plan revision (MD-03 step E).

## 5. Before/after production output audit

Method: the real ordered bundle (`scripts/lib/force_app_harness.js`) was run on LF exports of base `0e6b745` and of the implementation tree for five states: preseason (no completed games), bundled (15 completed, no KC game), all bundled games completed with fixed scores (KC 2 games played), and bundled with a manual KC 47.3 or manual BUF 20 value. For all 32 teams and every bundled game it captured current, active and team-page ratings, `currentTeamState`, QB debug, Week-2 entry, ledger, unit profile values, canonical pre/post states, FORCEcast probabilities and Monte Carlo score projections, the season projection, and hashes of rankings, team, matchup, Playoffs, Divisions, slate and QB Rankings pages. The base dump was reproduced byte for byte on a second run.

| Output | Result |
| --- | --- |
| KC current rating, before any game | 1502.55 → 1486.80 Elo (−15.75), FORCE 49.58 → 46.87 (−2.708). Same in the bundled state. |
| KC after 2 games | 1422.36 → 1411.22 (−11.137), FORCE 35.79 → 33.88. |
| KC Week-2 entry / ledger | Entry qbRestore 15.75 (13.24 after a Week-1 game) → 0; ledger QB entry/current 0; residual unchanged. With a manual 47.3 the ledger QB delta becomes 47.3 instead of 31.55 because the entry no longer contains the automatic part; the current rating is identical. |
| KC historical game states | Week 1 pre 1502.55 → 1486.80, post 1491.03 → 1477.78; Week 2 pre 1491.03 → 1477.78, post 1422.57 → 1411.43. |
| KC unit displays | Unchanged: the base automatic overlay was already suppressed because Mahomes has current-season data. `qbRegimeCorrection` 15.75 → null in state and `FORCE_QB_DEBUG`. |
| Any other team's rating, state, units, ledger or history | No change in any state (31 teams). |
| FORCEcast | Only the two KC games move: DEN–KC home probability 0.5372 → 0.5305; IND–KC 0.6600 → 0.6480 (bundled). Integer Monte Carlo predicted scores for those games were unchanged in these states. Opponents' expected wins move with those probabilities (DEN +0.007, IND +0.012). |
| Season projection | KC playoff odds 35.0% → 34.0%, division 34.4% → 33.4% (bundled). Other teams' odds move by up to about 0.6 points through shared standings, and representative-season records for some teams change in preseason; no team rating changes. No change once every game is complete. |
| Pages / PNG exports | Rankings (KC row and quick button, KC moves 16th → 17th), every team page (lab copy), KC team page, KC matchups, Playoffs, Divisions, slate and Method. Exports render these pages, so they change the same way. QB Rankings unchanged. |
| Manual KC 47.3 | Current rating, forecasts and projections identical to base. |
| Manual for a team without a preset (BUF) | Identical to base apart from KC's automatic part disappearing. |
| Roster Lab | No code change; it never consumed the automatic correction. |
| Server, Worker, snapshot, cron, loader, security gates | No change. |

## 6. Tests

New `scripts/test_md03_retirement.mjs` (safe, qb, model; 1,346 checks) drives the real bundle: preseason, bundled and played states with no automatic correction on any route for all 32 teams; legacy `autoEligible:true` preset plus a reopened gate producing outputs identical to the retired default; the resolver unreachable (requesting it as a hook throws `ReferenceError`); rankings, team, matchup, FORCEcast, season projection, Method, ledger and debug paths; historical pre/post states; the manual lab through its real Apply, Reset and quick-button handlers; and a fresh start. It fails on the base tree, as do the updated V30, V33 and V69 contracts. `scripts/lib/force_app_harness.js` gained an optional `sources` override so a test can load legacy data; existing callers are unaffected.

Updated contracts: V33 keeps every V33 calculation check on an explicitly re-enabled copy of the preset and the benchmark record checks, and now asserts the production retirement; V30 asserts the gate is retired with zero weight while the historical benchmark record stays; V69 asserts no historical QB restore. `validate_bundle.py` asserts the retired flags. Suite results are recorded in [scripts/TESTING.md](scripts/TESTING.md).

## 7. Open points for validation

- Independent validation and owner acceptance (MD-03 steps C and D).
- The UX-19 plan revision (step E) needs to handle D10 and the automatic-chip, base-projection, matchup disclosure and Method items in light of this state.
- `test_qb_carryover_ui.js` and `test_v14_matchup_clarity.js` remain default-excluded; their automatic-state expectations are now intentionally obsolete in addition to their earlier baseline failures.
- An already-open browser tab keeps the old bundle and its automatic correction until it reloads.
