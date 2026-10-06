# MD-08 model/presentation separation — bounded implementation

**Owner-authorized architecture tranche only.** Branch `cycle9/claude-md08-model-display-separation`, from the independently re-reviewed research tip `aa0ad397a08cf2ff6f69e73c979e22667667a716` (Codex targeted re-review **A. CORRECTIONS VERIFIED — READY FOR OWNER DECISIONS**). Decision INVESTIGATE; Priority unset; MD-08 NOT COMPLETE. **OWNER ACCEPTED 2026-10-06:** implementation `6a03f09d51e36f5df7e4f80aeb3bffc0b9fac0c6` and documentation correction `3074b89027448cc83a5c94edd321839b399daa04` (Codex implementation review B, sole documentation finding resolved; targeted review **A. DOCUMENTATION CORRECTION VERIFIED — READY FOR OWNER ACCEPTANCE**). ACCEPTED — READY FOR INTEGRATION; not merged, pushed or deployed. The acceptance authorizes no new model or display behavior; the exact display transform remains NOT AUTHORIZED. This document sits beside the frozen research package; it is not part of that package's checksummed set.

## Which checks validate what

There are two separate checks here: one reproduces the frozen research, the other validates this implementation.

- **Frozen research reproduction.** The MD-08 normalization research package in this directory is frozen to exact revision `aa0ad397a08cf2ff6f69e73c979e22667667a716`. To reproduce it, check out that revision (LF-clean) and run `node research/cycle9/md08_unit_normalization/check.mjs`.
- **Expected failure at the implementation tip.** At implementation revision `6a03f09d51e36f5df7e4f80aeb3bffc0b9fac0c6` and later, that frozen checker is expected to fail its `assets/app.js` source pin. This tranche deliberately changed that production file after the research snapshot. The mismatch is the frozen checker doing its job; it does **not** indicate a model/presentation regression.
- **Current implementation health.** Validate with `node scripts/test_md08_model_display_separation.mjs`, plus the project's authoritative suite gates run from an LF-clean tree:
  - `npm run test:safe`
  - `npm run test:model`
  - `npm run test:release`
  - `npm run test:qb`
  - `npm run test:snapshot`
  - `npm run test:server`

  Each wraps `node scripts/run_tests.mjs --suite <name>`. Also check canonical public-build parity: `python scripts/build_public.py` must leave `public/` unchanged.
- **Do not reseal.** The frozen research source pins, result artifacts, output hashes and package checksums (`check.mjs`, `lib.mjs` pins, `results/`, `hashes.json`) must stay unchanged. Do not update them to the implementation tip unless a future explicitly authorized research-revision task creates a new research snapshot.

## Owner decisions recorded (2026-10-05)

1. **Display meaning contract:** human-facing unit ratings are intended to express **current-season / current-reference standing**, answering roughly "how strong is this unit relative to the NFL right now?". This is a presentation contract only. It does not authorize changing the model-consumed grade.
2. **Equal numbers, equal standing:** yes. Equal displayed numbers across unit categories should eventually mean approximately comparable current standing, subject to documented tie and small-sample behaviour. This sets the semantic target only.
3. **Cross-season policy:** the display contract is current-season relative. FORCE does **not** claim that a 90 in 2026 equals the same absolute football quality as a 90 in 2025. Absolute cross-season semantics would need suitable archives or stable references and separate authorization.
4. **Model/presentation separation:** AUTHORIZED as this bounded tranche.
5. **Research-only follow-ups, authorized separately and not performed here:** (A) the OL anchor/reference-definition drift check and (B) the receiver stabilization/compression measurement. No production behaviour depends on either.

**Not authorized:** any final display transform (including percentile/Hazen D, standardized C and normal-score N), threshold labels such as elite/good/average, any change to model-consumed grades, bridge weight or cap recalibration, unit measurement changes, cross-season absolute claims, UX-41 and MD-09 to MD-12. The production UI therefore remains numerically unchanged.

## Consumer audit (pre-edit, `assets/app.js` at `aa0ad39`)

The nine canonical keys are `pointsScoredPerDriveIndex`, `qbIndex`, `receiverIndex`, `olIndex`, `rbIndex`, `coverageIndex`, `passRushIndex`, `runDefenseIndex` and `pointsAllowedPerDriveIndex`. Outside `assets/app.js` they are read only by `model/live_profiles.js` (which produces them), `model/unit_force_bridge.js` (which consumes them) and `data/predictive-feature-gates.js` (status metadata). `src/index.js`, both Python servers and the public mirror contain no other consumer. PNG export rasterizes the rendered page, so it inherits whatever the page shows.

**A. Model / canonical — unchanged, read the profile field directly**

- `unitForceBridgeForProfile` → `FORCE_UNIT_FORCE_BRIDGE_MODEL.compute`, and through it `unitForceBridge`, `currentRatings()`, `currentTeamState`, `canonicalGameTeamState`, every forecast, exact-score projection, season/playoff/division simulation and historical state.
- `liveProfiles()` QB recency promotion and composite recomputation (model-side production of the grades).
- `week2EntryState` and `ratingLedger` (V99 decomposition and audit of model state).
- Debug and audit surfaces: `unitAudit`, `defenseDebug`, `qbDebug`, `passRushDebug`, `FORCE_COMPOSITE_DEBUG` and the null-unit freshness diagnostics. They report model state, so they must keep showing model values.
- QB-return scenario overlay inputs (`qbCarryoverUnitEffect`).

**B. Presentation — now read through `unitDisplayGrade()`**

- Rankings → Units table cells (`rawUnitCell`) and the Units sort keys, so row order follows the displayed numbers.
- Units board rows (`unitBoardRow`), shown on team pages in the Units view.
- Matchup page duels (offensive and defensive profiles plus the seven unit duels).
- Matchup breakdown overall composite edge and the four unit subedges (QB vs coverage, receivers vs coverage, OL vs pass rush, RB vs run defense), including their presentation-only edge shares and colour bands.
- Offense-versus-defense composite edges on the matchup page.
- Team strengths/weaknesses (`profileStrengths`).
- Unit-change rows on completed-game reports (`unitChangeRows`).
- PNG exports and HTML of all of the above, by construction.

**C. Mixed / ambiguous — resolved**

- **Offense/defense composites.** These are computed model-side from the canonical grades and are not bridge inputs. They stay computed exactly as before; their *display* goes through the same seam (keys `offenseComposite`, `defenseIndex`) so a future display contract can map them deliberately. Any future change to how composites are derived is out of scope.
- **QB Rankings page.** Not routed. Its default column is the canonical FORCE QB Rating, and the adjacent Raw, Opponent, Pressure and Recency columns are an additive decomposition of exactly that value; the Custom mode recomputes it from component scores. A unit display transform would break that arithmetic, and the QB metric's identity belongs to MD-09. It therefore stays on the canonical value until a separate decision.
- **Team efficiency (`offenseIndex`) diagnostic.** Shown in unit-change rows but not a canonical unit; `unitDisplayGrade` passes it through untouched.
- **Debug and ledger surfaces.** Classified as model (A): they audit model state.

## Architecture

All of it lives in `assets/app.js`, next to the bridge constants:

- `UNIT_MODEL_KEYS` = the production bridge weight keys (nine).
- `UNIT_PRESENTATION_KEYS` = those nine plus `offenseComposite` and `defenseIndex`.
- `identityUnitPresentation(key, modelGrade)` returns `modelGrade`.
- `unitDisplayGrade(profile, key)` returns the raw field for non-seam keys and for null, empty or non-finite values (so "unavailable" rendering is unchanged), and otherwise the presentation transform of the finite model grade.
- The transform variable is declared as the identity and is reassigned only by `FORCE_UNIT_PRESENTATION_TEST_HOOKS.setTransform/reset`, which exist only inside the `__FORCE_TEST_MODE__` early-return block. Production cannot change it.

Invariants: the model never reads the seam (no reverse dependency), every classified presentation consumer reads it, and a future owner-approved display transform is inserted in one place. Profiles and caches never store presentation values, so no presentation state can leak into canonical state.

## Evidence

- **Focused contract** `scripts/test_md08_model_display_separation.mjs` (safe/model, 686 checks): A1 key inventory; A2 identity for 11 keys × 32 teams; A3 bridge components equal model values, with a static guard that no `model/` file and none of the model functions reference the seam; A6 per-consumer single-key routing probes for every presentation consumer; A7 a test-only `+10` clamped transform changes every presentation surface while ratings, FORCE, bridge components and points, all forecasts and exact scores, season/playoff/division projections, Week-2 entry states, ledgers and historical pre/post states stay bit-identical; A8 a bridge-reads-presentation source mutation is detected; A9 a Units-table bypass and a QB-duel bypass are detected (the latter precisely); A10 public mirror parity; A11 reset restores byte-identical renders and canonical state, including after cache rebuilds; A12 historical states canonical.
- **Cross-version parity (scratch, not committed):** the real bundle at `aa0ad39` versus the candidate gave identical canonical state and byte-identical rendered HTML for every rankings view, every team page in every view, every matchup page and the QB Rankings, divisions, playoff, FORCEcast, home, model and About pages.
- **Golden fixtures:** the UX-19 golden passes unchanged; no fixture was recaptured.

## Boundaries

The exact display transform remains NOT AUTHORIZED. UX-41 remains NOT AUTHORIZED; this tranche only provides the technical seam UX-41 can later consume. No legend, label, colour, chart, wording or percentile copy changed. MD-07's completed bounded state is unchanged.
