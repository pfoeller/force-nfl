# FORCE V11

## Metric-aware ranking labels

- The first Rankings column now reflects the **active sorted metric**, not the overall FORCE order.
- Sorting Off/Def/QB/OL/Front/Cov/Run/Rec produces that metric's league rank.
- The metric rank is calculated high-to-low and stays attached to the team when users reverse display order.
- When a non-FORCE metric is active, each team still shows its official FORCE rank as a smaller secondary label.

## PNG social export

- Added **Export PNG** to every page.
- Exports use a stable 1200px layout and render at 2× resolution.
- Added a small FORCE/page-name header to exported images.
- Captures page content without the app navigation bar.
- Export CSS can be read through the CSSOM, with fetch as a fallback, so local-server and direct-file use are both better supported.
- PNG encoding uses `canvas.toBlob()` to avoid very large data URLs.

## Validation

- Added `scripts/test_v11_ui.js`.
- Existing model, matchup, forecast-audit, diagnostic-view, QB carryover, FORCE-brand, and V10 UI tests continue to pass.
