# FORCE V45 Update Center contract

## Purpose

The Update Center is the operational front end for FORCE's canonical live-data state. It is not a separate ratings store and it is not limited to Pass Rush.

## Refresh scope

A refresh requests the latest schedule plus the live sources used for:

- team efficiency and team-level unit inputs
- player/QB/receiver inputs
- FTN pressure charting
- current PFR advanced pressure
- 2025 PFR pressure benchmark data
- the fresh current-pressure resolver/manual override

After refresh, FORCE clears its derived profile and engine caches. Every page then recomputes from the same live profile/rating state.

The individual-team button is a *team-scoped update request* from the UI perspective. The upstream files are league-level resources, so FORCE may re-fetch the league source files rather than issuing a provider-specific one-team request; only the requested team's update status is logged by that button. This preserves one coherent source snapshot and avoids mixing files fetched at different moments.

## Freshness

For a team that has completed games, a live family must reach the team's latest completed week. Currentness is tracked separately for:

- team-stat families
- player-stat families
- Pass Rush
- schedule-derived Scoring/Luck

If a family is behind, its current-season unit values are not displayed or propagated into FORCE.

## FORCE propagation

`model/unit_force_bridge.js` is the only V45 Unit → FORCE transform. It compares current stabilized unit grades with the bundled prior profile, applies fixed unit weights, takes 50% of the weighted movement, caps the result to ±7.5 FORCE points, and converts the adjusted FORCE score back to the rating scale.

No missing unit weight is redistributed.

`currentRatings()` applies this bridge team by team, and the downstream QB-carryover/scenario layers operate on those already-adjusted current ratings.
