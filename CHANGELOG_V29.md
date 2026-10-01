# FORCE V29

## Why V29 exists

V28 hardened the combined defensive-front grade, but the Colts-shaped failure exposed a deeper modeling problem: **pass rush and run defense are different signals and should not be forced through one front score before the defense composite is calculated.** A team can create useful pressure while still getting gashed on the ground and through the air. The old combined front could rise and partially mask the broader defensive failure.

V29 removes that ambiguity from the production defense model.

## 1. Pass rush and run defense are first-class components

The live profile now exposes:

- `passRushIndex` - QB hits + sacks per opponent dropback, benchmarked against the stable 2025 pressure-rate distribution;
- `runDefenseIndex` - opponent rushing EPA/play, lower is better;
- `coverageIndex` - pass EPA/CPOE allowed, retained from the existing coverage model.

The old `frontIndex` remains in the profile only for backward compatibility with older consumers/tests. It no longer drives the displayed defense score or current UI.

## 2. Defense is rebuilt from explicit components

The V29 defense composite is:

`45% Coverage + 20% Pass Rush + 35% Run Defense`

This is implemented once in `defenseCompositeFrom()` and exported with `DEFENSE_WEIGHTS`, so tests and consumers use the same formula.

## 3. Preseason priors are split too

The bundled 2025 snapshot predates explicit pass-rush and run-defense indices. V29 therefore derives component priors from the raw 2025 distributions already in the snapshot:

- pass rush from `dl.pressure_rate`;
- run defense from `dl.run_stop_rate`.

That means some preseason defensive scores change in V29: the model definition itself is more explicit rather than merely relabeling the old combined-front score.

## 4. UI follows the model split

Rankings, Team, and Matchup surfaces now show **Pass rush** and **Run defense** independently. Matchup diagnostics use OL-vs-pass-rush and a separate run-defense duel. Methodology copy states the new 45/20/35 defense equation.

The app also builds the explicit component priors before current-season stats arrive, so the new fields do not render blank during the initial live-data fetch.

## 5. Colts-shaped mixed-evidence regression

`scripts/test_v29_defense_components.js` adds a complete 32-team Week-1-like fixture with a deliberately mixed Indianapolis game:

- IND pass rush improves;
- the legacy combined `frontIndex` also rises, reproducing the old masking behavior;
- IND run defense falls;
- IND coverage falls;
- the new V29 total defense correctly falls.

The same test includes an all-around dominant Kansas City control case where pass rush, run defense, coverage, and total defense all improve.

The test performs **430 assertions** over all 32 teams, including bounded component values, the exact defense identity before and after the transform, raw Colts inputs, and no-live component availability. Results are written to `benchmarks/v29_defense_components.json`.

## 6. Real Week 1 replay hook

`scripts/test_v29_week1_replay.js` can replay the production transform against actual nflverse 2026 team/player Week 1 CSVs when those files are supplied locally. It validates all 32 teams and the 45/20/35 identity and writes `benchmarks/v29_week1_replay.json`.

The raw nflverse release assets are not vendored into FORCE, so this replay remains an explicit data-dependent audit rather than silently substituting synthetic rows for real production data.
