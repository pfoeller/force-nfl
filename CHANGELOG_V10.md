# FORCE V10

## Matchup pages

- Renamed **Watch-outs** to **Weaknesses**.
- All paired team sections now use a true 50/50 layout rather than the app-wide 1.35/0.65 two-column grid.
- Added restrained team-color accents to matchup team headers, offense-vs-defense cards, context cards, strengths/weaknesses cards, team directory cards, and team logos.
- On narrow screens the pairs still collapse to one column.

## QB return correction

- Added a one-click **Apply QB fix** action anywhere a verified carryover preset exists.
- The home FORCE Rankings card exposes the current verified preset directly.
- The full FORCE Rankings table, team directory, team page, and matchup page expose the same action where applicable.
- Clicking it immediately updates the displayed FORCE Score/ranking and future forecasts; clicking **Undo QB fix** removes it.
- The quick action does **not** invent a generic correction for teams without a verified preset. Those teams keep the manual QB Return Lab.
- Historical completed-game forecast snapshots remain frozen and are not rewritten by a current what-if.

## Sortable rankings

- FORCE Rankings now support click-to-sort numeric columns.
- Units view supports **Off, Def, QB, OL, Front, Cov, Run, Rec**.
- FORCE, Elo, luck, penalty, and advanced numeric columns are also sortable where shown.
- A second click reverses sort direction.
- The # column continues to show true FORCE rank while viewing a different sort.

## Validation

- Added `scripts/test_v10_ui.js`.
- Updated diagnostic-view tests for sortable headers.
- Full bundle validation passes.
