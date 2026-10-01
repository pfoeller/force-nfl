# V17 - PNG export reliability

- Fixed Chrome `SecurityError: Tainted canvases may not be exported` during PNG export.
- Root cause: the export SVG contains `<foreignObject>` and was loaded through a `blob:` URL before being drawn to canvas.
- The SVG is now encoded as a `data:image/svg+xml` URL before rasterization.
- `toBlob()` failures now trigger a full second render with team-logo images removed and abbreviation fallbacks shown.
- The exporter no longer blames the local server for canvas-origin errors.
- Added `scripts/test_v17_export.js`.
