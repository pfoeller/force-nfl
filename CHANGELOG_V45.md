# FORCE V45 - Update Center + canonical unit-to-FORCE propagation

V45 turns live-data refresh into a product-level workflow rather than a collection of page-specific feeds.

## Update Center

A new **Update** tab exposes the state of every team and every live metric family. It provides:

- **Update all 32 teams**
- **Update missing / stale**
- **Update TEAM** on each individual team card
- per-team `CURRENT`, `PARTIAL`, `STALE`, or `PRESEASON` status
- per-family freshness for Offense, O-Line, Run Offense, Coverage, Run Defense, QB, Receivers, Penalties/player detail, Pass Rush, and Scoring/Luck
- the amount by which current unit movement is changing that team's overall FORCE rating

Every update action performs a fresh upstream pull and invalidates the shared schedule/profile/rating caches. There is no separate Update-tab copy of the ratings.

## One canonical live snapshot

The refreshed sources feed `live_profiles.js`, which remains the canonical current team-profile layer. Rankings, team pages, matchup pages, projections, future-game forecasts, diagnostics, and the Update Center all read from that same current state.

V45 extends the hard-freshness idea introduced for Pass Rush in V44 to the other live metric families. After a team has played a 2026 game, a family is considered current only when its source reaches the latest completed week for that team. A stale family is suppressed instead of carrying forward an older live value or substituting a 2025 value as if it were current.

The team-stat and player-stat families are independently freshness-gated. A current team feed can therefore restore Offense/O-Line/Run Offense/Coverage/Run Defense while QB/Receivers remain unavailable until the player feed catches up, and vice versa.

## Unit → FORCE bridge

V45 promotes first-class unit movement into the canonical FORCE rating via `model/unit_force_bridge.js`.

The bridge uses these weights on **movement from each unit's stabilized 2025 baseline**:

- Team Offense: 20%
- QB: 12%
- Receivers: 8%
- Offensive Line: 8%
- Run Offense: 7%
- Coverage: 20%
- Pass Rush: 10%
- Run Defense: 15%

The weighted unit movement is multiplied by **50%** and capped at **±7.5 FORCE points** before being converted back to the canonical Elo-like FORCE rating.

Missing/stale units contribute **zero new movement**. Their weight is not redistributed to the remaining units, so losing one feed cannot artificially amplify another unit.

The resulting rating is returned by `currentRatings()` and is therefore consumed by rankings, teams, matchups, projections, future-game forecasts, the roster/QB layers, and other current-rating consumers.

Luck and penalties remain contextual diagnostics; they are not part of the Unit → FORCE bridge.

## Missing-data behavior

V45 removes several misleading null fallbacks:

- missing unit values render as `-`
- matchup edge badges render **DATA UNAVAILABLE** when either required side is missing
- subedges render `data unavailable`
- stale current penalty/player-detail data are suppressed
- stale Pass Rush remains suppressed under the V44 pressure-freshness contract

## Regression coverage

New V45 tests:

- `scripts/test_v45_update_center.js` - Update tab, all-team/stale/team actions, multi-family scope, and shared-state copy
- `scripts/test_v45_all_metric_freshness.js` - independent team/player freshness and stale-unit suppression
- `scripts/test_v45_unit_force_bridge.js` - weights, non-redistribution, Pass Rush → FORCE propagation, cap, and canonical-current-rating integration

The full bundle validator also retains and passes the V41/V42/V43/V44 pressure-provider/freshness regressions. Their synthetic fixtures now include completed schedule evidence where required by V45's stricter freshness contract.
