# FORCE V18

## PNG text-color fidelity

V17 fixed Chromium canvas tainting, but some exported text could render black on dark panels even though it was white or muted in the live app.

Root cause: the SVG `foreignObject` rasterizer did not reproduce every inherited CSS color/custom-property relationship exactly.

V18 freezes the browser's already-computed text presentation onto the staged export clone before SVG serialization. It explicitly snapshots color, font properties, line height, letter spacing, text decoration/alignment, white-space behavior, text shadow, and WebKit text fill color. This makes the exported PNG use the same visible text colors as the live FORCE page.
