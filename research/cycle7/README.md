# Cycle 7 isolated research reproduction

These scripts have no production importers, provider/network fetchers or new default tests. They use the actual bundle via the existing test VM and isolated statistical prototypes. They only write this directory's research results. Production model/app/data/generated assets, tests and snapshots are untouched.

## Run

From repository root (Node and Python with NumPy available):

```text
node research/cycle7/roster.mjs
python -B research/cycle7/units.py
python -B research/cycle7/live_wp.py
node research/cycle7/costs.mjs
python -B research/cycle7/check.py
```

`check.py` repeats the four commands twice and verifies committed numeric evidence by LF-normalized bytes and fixture hashes (tolerating Git CRLF checkout conversion), important assertions and syntax. Use the Python configured for the project; no package installation is required in the supplied bundled runtime. The observed environment is recorded in results/validation.json; floating-point last-bit differences on another NumPy/BLAS platform should be investigated and compared with tolerance, not silently recaptured.

## Inputs and extraction

`inputs.json` pins four public nflverse files by URL, bytes and SHA-256 (2024/2025 regular-season PBP and weekly player positions). Raw downloads remain outside Git. For independent extraction, retrieve those URLs into a scratch directory, verify pins, then:

```text
python -B research/cycle7/extract.py --raw-dir <scratch-raw-directory>
```

Extraction is offline; it refuses differing raw hashes. Derived fixtures are committed for ordinary network-free reproduction: paired team-game outcomes (544/year) and pre-play game-clock-minute states (16,422 /16,225). Neither fixture is synthetic. Prototype slot/share parameters and bridge grade perturbations are explicitly synthetic.

Attribution: nflverse contributors, [nflverse-data](https://github.com/nflverse/nflverse-data), [CC BY 4.0](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md). These derived CSVs modify source data by selecting regular-season records, aggregating outcomes and sampling pre-play states. Retain attribution, source links, license link and change notice on redistribution. This statement does not license other provider/FTN/logo data. Sources were retrieved on 2026-10-04. Released historical data can change; pins, not “latest”, identify this evidence.

Extraction excludes nullified plays, kneels/spikes from efficiency, de-duplicates sacks/hits by union and restricts normal QB/pass protection/pass-attempt metrics to downs1–4. Weekly position mapping is a full published-season identity classification for descriptive unit probes, not a replay of roster information available at every original kickoff. WR/TE targets exclude unassigned receivers; RB/FB carries use position IDs. Unit team averages are equal-game, not the exact production opportunity-weighted/stabilized units. These boundaries prevent interpreting coefficients as causal skill separation.

WP states contain only pre-play score, possession, clock, down/distance, field and timeouts plus game IDs and final outcome **label**. Ties and OT are excluded from WP evaluation; extraction records them in results/extraction.json. Sampling is game-clock minute, not wallclock/live publication cadence. Features explicitly exclude post-play scores, vendor WP, odds and EPA. A fresh generic Elo strength proxy is causal and week-batched, **not FORCE**. Current canonical pregame historical prior reconstruction is unavailable here; its proper comparison remains required.

## Controls and result contracts

- `roster.mjs`: real rendered current cases (clock pinned to 2026-10-04T12:00Z), 13 name-collision groups and a wrong-player selection, no canonical-rating writes, public reset, two candidate allocators across QB/RB/WR; 60 synthetic capacity/reversibility/identity checks; explicit replacement sensitivity and insurance counterexample; real bridge sensitivity. Source-override mutation proves rendered signed-removal evidence responds to changed arithmetic.
- `units.py`: 2024-fit/2025-evaluation partial residuals for all three mandatory overlaps plus receiving; identity and residual+shared conservation; rank/stability/parent-correlation diagnostics; next-game proxy target and reparameterization negative control, never full-stack promotion.
- `live_wp.py`: 2024-fit/2025-evaluation; equal-game Brier/calibration, early/mid/late and predeclared feature ablations; future-final mutation, neutral-prior identity, deterministic predictions; 1,000 game-cluster bootstraps with fixed seed.
- `costs.mjs`: central fanout arithmetic, featured/primetime/all scope, pagination, high concurrency/retry envelope; pricing inputs are checked facts, duration/selected-game/page count are planning assumptions.

No candidate is promoted, no uncertainty interval is a licensing clearance, and no source is adopted. No long research job is added to the safe/default catalog. Existing inventory remains 257 entries with 112 default exclusions; research runs are explicit.
