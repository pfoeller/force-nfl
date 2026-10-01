# FORCE V24 - live in-season metrics

## Fixed: 2026 games were moving FORCE while unit/diagnostic profiles stayed on the 2025 snapshot

V24 adds a separate current-season profile pipeline. Hourly refresh now attempts to load both nflverse 2026 team stats and player stats in addition to schedule/scores/lines.

### Live/blended fields

The following now update during the 2026 season instead of remaining frozen at the 2025 bundle:

- overall offense
- overall defense
- quarterback
- offensive line
- defensive front
- coverage
- run game
- receivers
- offensive EPA/play
- QB EPA/play and CPOE
- receiving EPA/target
- rushing EPA
- scoring profile
- luck / expected-record surplus
- tracked penalty context
- matchup edges
- strengths / weaknesses
- Units, Luck, Penalties, and Advanced ranking/team views

### Early-season shrinkage

Unit ratings use the 2025 unit profile as a four-game prior. The 2026 share is `games / (games + 4)`, so the live component is 20% after one game and 50% after four games. This prevents one September game from completely rewriting a unit rating while still allowing every unit to move immediately.

### Live proxies and honesty about data

Some old 2025 unit components came from richer play-level analysis than the light-weight browser refresh can reproduce directly. V24 does not fake equivalence:

- OL uses sack rate allowed plus rushing EPA as the live proxy.
- Defensive front uses sack rate generated plus opponent rushing EPA.
- Coverage uses opponent passing EPA/play plus CPOE allowed.
- Penalties use tracked defensive-penalty counts/yards from current player stats. FORCE displays the live yard swing as a proxy and does not invent current penalty EPA or win-probability swing without play-level context.

### Forecast contract unchanged

These live unit profiles update explanatory matchup analysis and diagnostics. They do **not** silently enter the validated Elo/market win-probability model. Any direct addition of unit metrics to forecast probability requires a new historical out-of-sample validation.
