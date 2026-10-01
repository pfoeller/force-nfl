# FORCE V59

## Rams logo-provider alias fix
- FORCE continues to use `LAR` as the canonical/model team ID.
- The external squared-logo provider uses `LA.png` for the Los Angeles Rams.
- Added a dedicated logo-provider alias (`LAR -> LA`) rather than changing model/team IDs.
- The fix applies everywhere that calls the canonical `teamLogoUrl()` helper, including live UI and PNG export logo inlining.
- Added a 32-team provider-manifest regression test so every canonical team resolves to a known logo filename.
