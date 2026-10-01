# FORCE V126 - Game PNG export / FLAG compatibility fix

V126 fixes the completed-game PNG export regression without changing FLAG on screen or changing any model calculation.

## Export fix
- The live FLAG gradient gauge remains unchanged on normal pages.
- PNG exports now replace FLAG gauges with a simple text summary (`FLAG score` + direction) before SVG/`foreignObject` rasterization. The explanatory FLAG scale is also converted to a plain 0 / 50 / 100 text key.
- FLAG Swing Candidate cards are converted to a compact export-safe text card carrying winner, EPA, WPA and final-margin context.
- Export pagination measures the simplified FLAG markup rather than the more complex screen-only gauge/card, reducing both SVG rendering risk and unnecessary page height.
- The existing no-image retry remains. If a page still fails after that retry, FORCE performs a final retry with export-safe FLAG markup before surfacing an error.

## Scope
- No penalty EPA/WPA math changed.
- No FLAG score or FLAG Swing threshold changed.
- No FORCE rating, unit, forecast, Luck, playoff or seeding logic changed.
