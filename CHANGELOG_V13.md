# FORCE V13

## Real team logos

- Removed the synthetic helmet artwork introduced in V12.
- Team surfaces now use real transparent NFL team marks from the public `shoenot/NFL-Team-Logos-Transparent-Squared` dataset.
- The team abbreviation remains as a fallback only when a logo cannot load.
- Matchup headers, matchup context cards, offense-vs-defense cards, strengths/weaknesses cards, team directory cards, and team profile headers all use the same logo treatment.
- PNG export attempts to inline the remote logo assets before rendering. If a logo cannot be fetched for export, FORCE falls back to the abbreviation rather than failing the entire export.
- Core app data remains usable offline; real logo images require a network connection unless already cached.

No model or forecast math changed in V13.
