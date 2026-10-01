# FORCE V15 - PNG export reliability

## What was wrong

V13 introduced real team logos as HTML `<img>` elements. The social export path then copied normal HTML with `outerHTML` into an SVG `<foreignObject>`. The browser parses that export as XML (`image/svg+xml`), where normal HTML void-element serialization can be invalid. That could make PNG export fail even while FORCE was correctly served from `localhost`.

The old catch message blamed local serving for every export failure, so it pointed users in the wrong direction.

## Fix

- Export markup now uses `XMLSerializer`, producing valid XHTML for the SVG renderer.
- Successfully fetched team logos are converted to data URLs and stripped of cross-origin/event attributes before export.
- A failed logo fetch removes the remote `<img>` rather than leaving a hidden cross-origin URL inside the export.
- If the browser still cannot render an export containing image assets, FORCE retries once with team-abbreviation fallbacks. A logo can no longer kill the entire page export.
- Canvas availability is checked explicitly.
- The failure dialog now reports the actual browser error instead of automatically saying to serve the app locally.

No rating, forecast, QB-return, or matchup math changed in V15.
