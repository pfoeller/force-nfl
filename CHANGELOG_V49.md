# FORCE V49

## Branding refinement
- Refined the canonical Vector-F mark so the lower crimson arm is a single continuous segment again.
- Preserved the three small trailing accent bars at the lower-left of the mark.
- Updated the shared logo assets used by the runtime, About FORCE board, favicon mark family, and export branding.

## 1–100 scale semantics
- Updated the logo's 1–100 scale motif to use FORCE rating-band colors instead of neutral ticks.
- Low values now render in red, mid values in gold, and high values in green.
- Major ticks are emphasized while minor ticks remain fainter.
- The About FORCE board now includes decade labels across the scale.

## Export safety
- Rebuilt the inline SVG export brand markup to match the canonical V49 logo so exported PNGs render the same corrected logo and band-colored scale.

## Regression coverage
- Added `scripts/test_v49_brand_scale.js` to assert:
  - one-piece crimson lower arm across canonical logo assets,
  - presence of the three accent bars,
  - FORCE-band coloring on the 1–100 scale,
  - and preservation of the football-field side-rail tick cadence.
