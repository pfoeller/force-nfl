# FORCE V40

## Team identity now carries the real logo everywhere practical

V39 already had real NFL marks on matchup heroes, team profiles, context cards, and the team directory. V40 centralizes that identity treatment and propagates it through the remaining team-reference surfaces so a team is visually recognizable without relying on text alone.

### Added

- `teamIdentity()` - canonical full-name + logo renderer for tables, lists, cards, and schedule rows.
- `teamToken()` - compact logo + abbreviation renderer for dense score/line/diagnostic text.
- `logoizeTeamCodes()` - presentation helper that upgrades existing canonical team-code strings (for example `KC -3.5` or `BUF 24 · KC 27`) without changing underlying forecast/audit data structures.
- 18px `team-mark-xxs` treatment for dense inline references.

### Updated surfaces

- Home FORCE Rankings rows.
- FORCE Rankings in every view, including Units.
- Game cards on Home and Games pages.
- Forecast audit strips: predicted line, predicted score, final, rating changes, and immediate rematch.
- Matchup diagnostics: duel rows, offense-vs-defense headers, edge badges, strengths/weaknesses, predicted line/score, actual final, postgame rating change/rematch, and unit-change cards.
- Team-page schedule opponent rows and audit text.
- QB Return Lab next-game preview.
- Roster Lab remaining-schedule opponent rows.
- Method / Adaptive team-state table.
- Home "Biggest riser" KPI.
- Export page labels for team and matchup pages.

Existing large hero logos on Team and Matchup pages remain unchanged rather than duplicating a second inline mark directly inside the adjacent team heading.

### Layout polish

- Compact marks use fixed sizes to keep Units and other dense tables readable.
- Away/home game identities align toward the score columns.
- Schedule opponent rows reserve a small `vs/@` prefix and keep the logo/name together.
- Inline forecast tokens wrap safely on narrow screens.

### Model impact

None. V40 changes presentation only. Ratings, transform behavior, unit values, forecasts, calibration, and predictive gates are unchanged.

### Validation

- `scripts/validate_bundle.py` passes.
- Existing V38/V39 Units regressions still pass (V38 assertion generalized to allow the V40 identity wrapper while preserving the FORCE-score contract).
- `scripts/test_v40_team_logos.js` adds 23 assertions covering helper presence, principal render paths, 32-team ranking logo output, matchup repeated-reference output, and team-page schedule identity.
- Historical `test_v14_matchup_clarity.js` is not part of the canonical bundle validator and already fails unchanged in V39 on its legacy KC offense-lift threshold; V40 does not alter that model behavior.

## Brand selection: Option 3 - The Field

V40 now adopts the sport-inspired FORCE field logo selected from the three concept directions. The mark uses a blue field arc and yard-line ticks over the FORCE wordmark, matching the app's ice-blue/navy visual language while leaving orange as the UI action/accent color.

- Added `assets/force-field-logo.svg` as the primary wordmark.
- Added `assets/force-field-mark.svg` as a compact standalone mark for future icon/favicon use.
- Replaced the temporary orange `F` treatment in the persistent header.
- Updated the About FORCE identity card to show the selected mark.
- Updated generated PNG/social-export branding to use the same mark.
- Branding only; no model, metric, transform, or forecast behavior changed.
## Rankings export: two 16-team PNGs + embedded FORCE mark

The FORCE Rankings export is now deterministic across **Strength, Luck, Penalties, Units, and Advanced**:

- Every rankings sub-tab exports the full 32-team board as exactly **2 PNGs**: rows 1–16 and rows 17–32.
- Table headers repeat on both PNGs.
- Screen-only ranking controls, notes, and search chrome are removed from export so they cannot create extra pages.
- Any active team-search filter is cleared in the export clone, ensuring the exported board still contains all 32 teams.
- The export header now names the active rankings view (for example, `FORCE Rankings · Units`).
- The selected Option 3 / Field FORCE logo is embedded directly as inline SVG in the export. This avoids the broken-image behavior caused by a relative `assets/force-field-logo.svg` URL after the page is serialized into an SVG `foreignObject` for PNG rendering.
- Added `scripts/test_v40_rankings_export.js` and folded it into the canonical bundle validator.

This remains presentation/export-only; no ratings, transforms, metrics, forecasts, or calibration logic changed.


## Units clarity: Pass Rush / Run Defense / Run Offense

The Units board no longer uses the ambiguous `Rush` heading for pass rush. The three potentially confusable run/rush columns are now explicit:

- **Pass Rush** - defensive QB-hit/sack disruption;
- **Run Defense** - opponent rushing efficiency allowed;
- **Run Offense** - own rushing efficiency.

The Units explanatory note now defines the pass-rush score as a **disruption proxy**, not a complete pressure grade: non-sack QB hits + sacks per opponent dropback, benchmarked against the stable 2025 distribution and blended with the prior. It explicitly notes that hurries and pass-rush win rate are not present in the current weekly nflverse feed used by FORCE.

Pass-rush cells also expose a hover explanation with the team's current disruption rate, QB-hit/sack counts, and live/prior blend. This makes cases such as Dallas Week 1 auditable from the UI instead of leaving a high score unexplained.

No unit formula was changed in this pass. The Dallas Week 1 `96` is reproducible from the existing V29/V37 contract: 6 non-sack QB hits + 2 sacks on 31 opponent dropbacks = 25.8% disruption; the live subgrade is 100 against the 2025 reference distribution, the 2025 Dallas prior is 90.3, and V37's early-regime confidence adjustment yields a 54.8% live / 45.2% prior blend, producing 95.63 before display rounding.

- Added `scripts/test_v40_unit_clarity.js` with 10 assertions, including a synthetic DAL–NYG replay that reproduces the displayed 96.
- Added the new regression to `scripts/validate_bundle.py`.
