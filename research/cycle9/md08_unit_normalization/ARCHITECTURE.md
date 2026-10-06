# MD-08 unit architecture and normalization inventory

Research only, base `65170f7dd9e17ac6ece1ab97790e944624d3f66f`. Traced from code before any new research was written; machine-readable copy in [architecture_inventory.json](results/architecture_inventory.json) with source line anchors resolved at analysis time. [Findings](README.md).

## Canonical unit keys

The canonical bridge list is read from production at analysis time (`FORCE_UNIT_FORCE_BRIDGE_MODEL.WEIGHTS`, [unit_force_bridge.js:19](../../../model/unit_force_bridge.js)) and asserted equal to the research table. There are **nine** bridge keys; their weights sum to exactly 1.000.

| Key | Public label | Bridge weight | Offense / defense composite weight | Public Units row |
|---|---|---:|---|---|
| `pointsScoredPerDriveIndex` | Scoring/drive | .200 | offense .20 | No (bridge and diagnostics only) |
| `qbIndex` | QB play | .120 | offense .30 | Yes |
| `receiverIndex` | Receivers | .080 | offense .15 | Yes |
| `olIndex` | Offensive line | .080 | offense .15 | Yes |
| `rbIndex` | RB | .070 | offense .20 | Yes |
| `coverageIndex` | Coverage | .162 | defense .36 | Yes |
| `passRushIndex` | Pass rush | .072 | defense .16 | Yes |
| `runDefenseIndex` | Run defense | .126 | defense .28 | Yes |
| `pointsAllowedPerDriveIndex` | Pts/drive prevention | .090 | defense .20 | Yes |

Display-only grades: `offenseComposite` (Overall offense), `defenseIndex` (Overall defense) and the diagnostic `offenseIndex` (team EPA/play). None is a bridge input. `frontIndex` and `rushIndex` are legacy compatibility fields. The V99 Week-2 ledger baseline uses its own frozen weight set (`V99_UNIT_FORCE_WEIGHTS`, [app.js:379](../../../assets/app.js)) for a diagnostic decomposition only.

## The four layers, per unit

Every bridge unit passes through the same outer pipeline ([live_profiles.js](../../../model/live_profiles.js)):

1. **Measurement** — a raw football signal from the current season.
2. **Adjustment / stabilization** — unit-specific (below).
3. **Live mapping to 0–100** — one of three families: *current-rank* (`percentileMap`, `100*midrank/(n-1)` among the 32 current teams, line 59), *historical CDF* (`continuousPercentileValue`, interpolated empirical midpoints `100*(i+.5)/n`, line 965) or an *analytic* tanh/linear form.
4. **Prior blend** — `display = (k*prior + g*live)/(g+k)` (line 320) with `prior = 50 + 0.70*(source-50)` (`regressUnitIndex`, reversion 0.30 from [model-data](../../../data/model-data.js), app.js:1729). `g` is the unit's game count; `k` is the V37 effective prior-games (1.00, falling to 0.25 for strong early regime signals, [unit_prior_controller.js:20](../../../model/unit_prior_controller.js)). QB then adds V148 recency (±4) and clamps (app.js:1761).

**There is no separate display value.** The blended number written to `profile[key]` is the value printed on the Units board (one decimal), in tables and matchup duels (whole points), and the value the bridge reads.

| Unit | Measurement | Adjustment | Stabilization | Live map (family) | Prior | Missing-data behaviour |
|---|---|---|---|---|---|---|
| Scoring/drive | Qualifying offensive points/drive | None | None (prior blend only, by drive games) | Current rank | Regressed bundled 2025 `offenseIndex` (legacy team-EPA grade; different construct) | Prior held until drives exist |
| QB play | 30% all-play EPA/play, 30% ANY/A, 20% actual-pass success, 10% extra rushing value, 10% CPOE | V139 leave-one-matchup-out opponent adj `4*(50-allowed)/50`; V137 pressure context; V148 recency ±4 after blend | EPA 150 plays, success 100 att, CPOE 60 att toward current league means | Multicomponent: EPA and success → 2025 17-game CDF (n=32); ANY/A → current rank; CPOE → `50+50*tanh(dev/7.5)`; rushing → `50+50*bonus/12` (floor 50); weighted then `50+1.20*(x-50)` clamped | Regressed bundled 2025 `qbIndex` | Canonical QB becomes unavailable (NaN) when all-play input/reference invalid; bridge skips it |
| Receivers | WR/TE EPA/target | Ridge-fitted partial QB-environment subtraction (beta .588, centre .0615) | 80 targets toward current league residual; current centre aligned to 2025 median | 2025 32-team residual CDF | 2025 residual percentile, regressed | Freshness gate; prior held pre-season |
| Offensive line | PBP de-duplicated hit-or-sack disruption allowed/dropback | None (no opponent, no run block) | None; same-length windows instead | 2025 same-length window CDF, lower better (n=448 at 4 games) | Regressed bundled 2025 `olIndex` | As above |
| RB | RB/FB room 70% rush EPA/carry + 30% residual receiving EPA/target | Receiving part: ridge partial QB subtraction (beta .327) | 50 carries / 40 targets; centre aligned to 2025 median | 2025 32-team room CDF (LIVE_FITTED frame) | 2025 room percentile in the same frame, regressed | As above |
| Coverage | Sack-free attempt EPA allowed (75%) + CPOE allowed (25%) | None | None | Current ranks, weighted | Regressed bundled 2025 `coverageIndex` | As above |
| Pass rush | Weekly hit+sack disruption (28 teams) or PFR charted composite (4 teams) | None | None | Weekly: current rank among all 32. PFR: same-length 2025 charted window CDF | 2025 PFR composite percentile, else 2025 pressure-rate percentile, regressed | Provider cascade; prior held only if no current provider |
| Run defense | Opponent rush EPA/carry (includes QB runs) | None | None | Current rank, lower better | Regressed 2025 `run_stop_rate` percentile (different construct) | As above |
| Pts/drive prevention | Opponent offensive points/drive | None | Fixed neutral one-game prior | Current rank, lower better | Neutral 50, `k=1` | Prior 50 held |

### Composites

`offenseComposite = calibrateComposite(availableWeightedMean(.20 scoring, .30 QB, .15 WR, .15 OL, .20 RB))` with soft-tail `50 + 50*tanh((raw-50)/35)/tanh(50/35)`; defense uses `.36 coverage, .16 rush, .28 run, .20 prevention` and softness 42 (live_profiles.js:456–504). Both are re-aggregated from the blended component grades (and after QB recency, app.js:1764) and are **display-only**: they are not in `WEIGHTS` and never feed the bridge.

## Normalization inventory

"Nominal midpoint" is what the code intends 50 to mean; "effective midpoint" is the live grade the current (Week-4 2026) league-average signal actually receives ([midpoint_thresholds.json](results/midpoint_thresholds.json)).

| Unit | Transform | Nominal midpoint | Effective midpoint (live) | Hard floor / ceiling (live) | Anchor constants and provenance |
|---|---|---|---|---|---|
| Scoring/drive | Current-rank percentile | Median current team | 50 by construction | 0 / 100, always hit by worst/best team | None; recomputed every build |
| QB play | Multicomponent, ×1.20 expansion, clamp | League average | 53.98 before context (EPA comp 53.70, success 58.70) | 0 / 100 clamp; rushing component floor 50 | 1.20 (V144, hand-selected), weights 30/30/20/10/10 (hand-selected), CPOE softness 7.5, stabilizers 150/100/60, 2025 V149 reference v5 (fitted data) |
| Receivers | Stabilize → centre-align → 2025 CDF | Current league centre | 50.00 by construction | 1.5625 / 98.4375 | Stabilizer 80 (V115, hand-selected), ridge fraction .50 (hand-selected), 2025 bundled team values |
| Offensive line | Raw rate → 2025 same-length window CDF | 2025 window median (.1545) | **37.68** (pooled 2026 rate .1698) | 0.11 / 99.89 | 2025 V149 reference windows; no centre alignment |
| RB | As receivers, 70/30 | Current league centre | 50.00 by construction | 1.5625 / 98.4375 | Stabilizers 50/40 (V115), 70/30 (V57), ridge .50; LIVE_FITTED frame (owner decision 2026-10-05) |
| Coverage | .75/.25 current-rank mix | Median | 50 | 0 / 100 (needs both ranks extreme) | .75/.25 (V101, hand-selected) |
| Pass rush | Weekly: current rank. PFR: 2025 window CDF | Median / 2025 window median | 50 (weekly) | 0 / 100 weekly; CDF bounds PFR | PFR hit .20 / sack .60 bonuses (hand-selected); provider order |
| Run defense | Current rank | Median | 50 | 0 / 100 | None |
| Pts/drive prevention | Current rank, then blend with 50 at `k=1` | Median | 50 | live 0 / 100; **display exactly 10 / 90 at four drive-games** | Neutral prior 50 (V100) |
| Priors (all) | `50 + .70*(source-50)` | 50 | 50 (all priors mean 50.00) | 15 / 85 (16.09 / 83.91 for CDF-based priors) | Reversion .30 (2021+ era, model-data) |
| Composites | Soft-tail tanh | 50 | — | 0 / 100 preserved | Softness 35 / 42 (V108, hand-selected) |

The bundled 2025 grades that seed `qbIndex`, `olIndex`, `coverageIndex` and the scoring prior are themselves pure 32-team percentile ranks (mean 50.0, SD 29.8, min 0, max 100 in every case, [cross_season.json](results/cross_season.json)). Every prior except prevention (fixed 50) is therefore a 2025 within-season standing (rank or reference percentile), regressed 30% toward 50.

No 0–100 label in this inventory is evidence of cross-unit calibration. Three different reference populations stand behind "the X-th percentile": the 32 current 2026 teams (rank units), 32 full 2025 team-seasons after early-season stabilization (QB EPA/success, WR, RB), and 2025 team windows of matching length (OL, PFR pass rush).

## Model use versus display

- **Model:** `unitForceBridgeForProfile` (app.js:1189) → `FORCE_UNIT_FORCE_BRIDGE_MODEL.compute`: for each available key, `delta = current - effective prior` (bridge.js:118), `bridgePoints = clamp(0.50*Σ w*delta, ±7.50)`, `eloDelta = bridgePoints * 5.54` (up) or `* 5.816` (down), then the soft-tail FORCE score. `currentRatings()` (app.js:1218) applies this to every team, so every forecast, projection, ranking and historical game state consumes the 0–100 unit grades.
- **Display only:** composites; the Units board and Rankings Units columns; team cards; matchup duels and subedges coloured by the overall FORCE band `<41 / 41–<71 / ≥71` (`bandClass`, app.js:388); matchup subedges that compare different units directly (`QB vs coverage`, `Receivers vs coverage`, `OL vs pass rush`, `RB vs run defense`, app.js:2542) through a presentation-only share `50+35*tanh(diff/45)`; QB custom weights; exports.
- **Separation today:** none for the nine bridge keys. Display formatting rounds, but the number is the model number. A display-only normalization therefore requires a new display field; changing the existing field changes the model.
