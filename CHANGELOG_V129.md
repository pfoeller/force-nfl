# FORCE V129 — XML-safe PNG export

V129 fixes the root cause of the PNG rasterization failure that survived the V126/V128 fallbacks.

## Root cause

FORCE exports HTML by serializing it inside an SVG `<foreignObject>`. The stylesheet was inserted into the SVG `<style>` element as raw text. V122 added a CSS comment containing a literal ampersand (`Flag Leverage & Advantage Gauge`). In XML, a bare `&` makes the SVG malformed. Chromium therefore rejected the SVG at the temporary-image load step, producing `Browser could not render the export image` before canvas rendering began.

## Fix

- XML-escape stylesheet text at the SVG serialization boundary (`&`, `<`, and `>`).
- Preserve the browser-visible CSS semantics because the XML parser decodes the escaped entities back into normal stylesheet text.
- Keep the V126 export-safe FLAG representation and V128 non-interactive export clone hardening as secondary defenses.
- Improve the image-load error so any future raw XML ampersand leakage is reported explicitly.
- No FORCE, Luck, FLAG, penalty, forecast, playoff, or ranking math changed.
