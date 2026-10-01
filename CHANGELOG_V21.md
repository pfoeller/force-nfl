# FORCE V21

## Denser, smarter social export pagination

V21 changes PNG pagination from a rigid 16:9 slicer to a content-density-first paginator.

- Desktop exports start from a 16:9 minimum (1200×675) but may grow to 1200×980 when that avoids wasteful extra slides or bad section cuts.
- Mobile exports use the same idea: portrait-first, with modest extra height allowed when useful.
- Export pages now use variable heights instead of forcing every page to the same empty frame.
- Large matchup-edge/duel sections are split into smaller logical chunks so unused space on a page can be filled rather than clipping or pushing the whole section forward.
- Detached split fragments retain measured heights, fixing a pagination bug where cloned fragments could measure as zero and then be clipped.
- Tiny trailing pages are merged or rebalanced into the prior page when practical.
- Navigation-only and low-value social-export content is omitted: back buttons, interactive QB buttons, the prototype footer, and the matchup data-warning strip.
- Multi-page exports still download as one ZIP; one-page exports remain a PNG.
