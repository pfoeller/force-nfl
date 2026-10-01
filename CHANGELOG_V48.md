# FORCE V48

## Vector-F identity
- Replaced the V40 field-arc identity with the selected multicolor **Vector-F** system.
- Canonical live-app wordmark: `assets/force-vector-logo.svg`.
- Canonical compact mark/favicon: `assets/force-vector-mark.svg`.
- The primary lockup spells out **Football Objective Rating & Comparative Efficiency** and carries a restrained 1–100 scale motif.
- Kept the full generated concept board in `assets/force-brand-board.jpg` as a design-reference source, but runtime UI and exports use vectors for reliable scaling and serialization.

## Product palette
- Shifted general app chrome from orange-led accents to a dark navy/black + cyan analytics palette.
- Teal / gold / crimson remain concentrated in the FORCE mark rather than becoming noisy global UI colors.
- Existing semantic colors for team/game state, positive/negative movement, warnings, and matchup comparisons are preserved where they carry meaning.
- Forecast exact-score emphasis uses brand gold; active navigation, labels, controls, export chrome, and focus accents use cyan.

## Export hardening
- Rebuilt `forceExportLogoMarkup()` around the Vector-F geometry, full FORCE expansion, and 1–100 motif.
- The export wordmark remains inline SVG so PNG exports do not depend on a relative asset URL.
- Enlarged the export lockup so the new identity remains legible in generated PNGs.
- Updated export canvas/background to the V48 deep-navy base.

## Other
- Added the Vector-F mark as the browser favicon.
- No rating, forecast, score-normalization, unit, or data-refresh logic changed in V48.
