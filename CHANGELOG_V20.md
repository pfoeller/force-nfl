# FORCE V20

## Export download fix

V19 correctly split long pages into multiple PNG frames, but browsers may allow only the first programmatic download from a single click. The remaining rendered pages could therefore be generated without being saved.

V20 changes multi-page export to **one browser download**:

- One-page export still downloads a normal `.png`.
- Two or more pages are rendered as PNGs and packaged into one `.zip` in the browser.
- The ZIP contains the same numbered filenames (`1-of-N`, `2-of-N`, etc.).
- ZIP creation is implemented locally with stored ZIP entries; no CDN/library/network dependency is added.
- The button reports `Rendering X/N` and then `Packing N pages…` before the single download begins.

This avoids Chrome/Edge/Safari automatic-multiple-download restrictions while preserving the V19 smart pagination.
