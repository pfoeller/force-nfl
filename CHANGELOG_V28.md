# FORCE V28

## Why V28 exists

V27 proved that the pure live transform could move a synthetic elite Kansas City game in the expected direction, but it did not prove that every app surface consumed the same transformed state. It also left a Week-1 small-sample failure mode: an exceptional pass-rush game could still lower an elite defensive-front prior if a secondary run-defense percentile was poor enough.

V28 addresses both classes of failure.

## 1. One canonical current team state

`assets/app.js` now owns `currentTeamState(team)` as the single current-state accessor for:

- current Elo / FORCE Score;
- active QB-carryover adjustment;
- current live unit profile;
- QB-adjusted offense and QB unit overlay.

Rankings, Team, and Matchup current-state displays consume that same state.

Completed matchup pages no longer suppress the QB/unit overlay merely because the game is final. They now distinguish:

- **Pregame** - frozen pregame rating shown in the matchup header;
- **After this game** - frozen immediate-postgame result-only Elo snapshot;
- **Current FORCE Score** - the same canonical current score used by Rankings;
- **Current unit profile** - the same canonical current profile used by Rankings and Team.

This removes the V27 contradiction where the Chiefs could show one offense/front/current FORCE value in Rankings and another on the completed Denver matchup page.

## 2. Defensive-front small-sample hardening

V27 graded the live front as 75% current-week pass-disruption percentile + 25% current-week run-defense percentile. With only one game per team, a terrible run-defense percentile could pull an objectively exceptional pass-rush performance below a strong preseason prior.

V28 changes the pass-rush component to a stable benchmark:

- live disruption = defensive QB hits + sacks per opponent dropback;
- the disruption rate is percentile-ranked against the **2025 prior league distribution** of front pressure rate;
- current front grade = **90% disruption + 10% live run-defense diagnostic**;
- the resulting live grade is still blended with the one-game 2025 stabilizing prior.

Regression fixture: Kansas City starts at **87.1** front, disrupts **47.5%** of opponent dropbacks, and is deliberately assigned a poor run-defense game. The V28 transformed front is **88.55**, not lower.

## 3. Offensive-line early-season benchmark

OL pass protection now benchmarks live QB-hit+sack disruption allowed against the stable 2025 league distribution of pressure allowed. The live OL grade is **70% pass protection + 30% rushing efficiency**, then blended with the one-game prior.

## 4. Percentile tie correctness

`percentileMap()` now uses mid-ranks for tied observations. Equal teams no longer receive different percentiles because of object/team iteration order. A completely tied three-team sample correctly returns 50/50/50.

## 5. Exhaustive regression coverage

New tests:

- `scripts/test_v28_metric_transform_smoke.js` - **2,325 checks**;
- `scripts/test_v28_current_state_consistency.js` - cross-view current-state contract.

The V28 smoke audit records before/after values for all 32 teams across every exposed unit index, composite, raw live field, QB metric, OL/front/coverage metric, receiving/rushing metric, luck, penalties, scoring, and live provenance path.

Specific Kansas City assertions include:

- ~48% disruption cannot lower the elite front;
- base FORCE rises after the simulated 31–10 win;
- QB-adjusted FORCE rises after the win;
- QB-adjusted offense rises rather than falling;
- QB overlay cannot mutate defense or the defensive front.

The full previous validation suite still runs after these tests.
