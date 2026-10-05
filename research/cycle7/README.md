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

## Historical Roster Lab baseline

The Roster Lab reproduction was captured against the reviewed pre-implementation baseline `b066de747f20e1f2ae3872f554496eb8ba5b67cd`. `roster.mjs` reproduces the **pre-tranche** public control representation (bare player names as option, checkbox and lookup values) and the pathology inventory recorded in `results/roster_and_bridge.json`.

The owner-authorized MD-04 decision-free tranche (`cycle7/claude-md04-accounting`) intentionally changed those control values to `team|pos|name` row keys. Running `roster.mjs`, and therefore `check.py`, directly on a post-tranche tree is expected to fail the "actual rendering agrees to its one-decimal precision" assertion. That failure is a baseline mismatch, not corrupted research.

- To reproduce the original research, use an LF-clean export or worktree of `b066de7` (for example `git -c core.autocrlf=false archive b066de7 | tar -x -C <scratch>`), then run the commands above there.
- Do not rewrite or recapture the historical fixtures or results because the public control representation changed. The Cycle 7 findings describe the baseline they were captured on.
- Current Roster Lab behaviour is validated by `scripts/test_md04_roster_lab_accounting.mjs` and the current production test suites, not by this package.

## Inputs and extraction

`inputs.json` pins four public nflverse files by URL, bytes and SHA-256 (2024/2025 regular-season PBP and weekly player positions). Raw downloads remain outside Git. For independent extraction, retrieve those URLs into a scratch directory, verify pins, then:

```text
python -B research/cycle7/extract.py --raw-dir <scratch-raw-directory>
```

Extraction is offline; it refuses differing raw hashes. Derived fixtures are committed for ordinary network-free reproduction: paired team-game outcomes (544/year) and pre-play game-clock-minute states (16,422 /16,225). Neither fixture is synthetic. Prototype slot/share parameters and bridge grade perturbations are explicitly synthetic.

Attribution: nflverse contributors, [nflverse-data](https://github.com/nflverse/nflverse-data), [CC BY 4.0](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md). These derived CSVs modify source data by selecting regular-season records, aggregating outcomes and sampling pre-play states. Retain attribution, source links, license link and change notice on redistribution. This statement does not license other provider/FTN/logo data. Sources were retrieved on 2026-10-04. Released historical data can change; pins, not “latest”, identify this evidence.

Pinned PBP has no `no_play` column; cancellation detection uses `play_type == 'no_play'`. Extraction excludes nullified plays, kneels/spikes from efficiency, de-duplicates sacks/hits by union and restricts normal QB/pass protection/pass-attempt metrics to downs1–4. Weekly position mapping is a full published-season identity classification for descriptive unit probes, not a replay of roster information available at every original kickoff. WR/TE targets exclude unassigned receivers; RB/FB carries use position IDs. Unit team averages are equal-game, not the exact production opportunity-weighted/stabilized units. These boundaries prevent interpreting coefficients as causal skill separation.

**Score-leak correction:** `home_diff` now uses pre-play `score_differential`, sign-normalized using posteam/home. Original post-play totals are superseded; the source helper/assignment AST and poisoned-total/`*_post` mutations are checked. WP states contain only pre-play score, possession, clock, down/distance, field and timeouts plus game IDs and final outcome **label**. Ties and OT are excluded from WP evaluation; extraction records them in results/extraction.json. Sampling is game-clock minute, not wallclock/live publication cadence. Features explicitly exclude post-play scores, vendor WP, odds and EPA. A fresh generic Elo strength proxy is causal and week-batched, **not FORCE**. Current canonical pregame historical prior reconstruction is unavailable here; its proper comparison remains required.

## Controls and result contracts

- `roster.mjs`: real rendered current cases (clock pinned to 2026-10-04T12:00Z), 13 name-collision groups and all 93 team × offered-option misresolutions (three wrong rows), +119/+67 non-starting QB removals, duplicate BUF checkboxes, an incumbent-exclusion mutation, no canonical-rating writes, public reset, two candidate allocators across QB/RB/WR; 60 mostly construction/invariant checks, not football validity; both states clamp to the synthetic replacement benchmark; mixed WR/TE/RB-alias slots are football-unrealistic; explicit replacement sensitivity and insurance counterexample; **synthetic bridge sensitivity only**: offline live profiles equal priors and bridge is zero for all 32 teams. Bundled-current-Elo correlations equal core-Elo correlations, not actual production materiality. Expected-win deltas are not decision-useful: one remaining MIA fallback fixture game. Source-override mutation proves rendered signed-removal evidence responds to changed arithmetic.
- `units.py`: all original paired correlations use shared plays; disjoint receiver/non-WRTE, clean QB/protection, non-stuffed RB and clean coverage probes plus a seeded part-whole shuffle null; 2024-fit/2025-evaluation partial residuals for all three mandatory overlaps plus receiving; identity and residual+shared conservation; rank/stability/parent-correlation diagnostics; next-game proxy target and reparameterization negative control, never full-stack promotion.
- `live_wp.py`: 2024-fit/2025-evaluation; equal-game Brier/calibration, early/mid/late and predeclared feature ablations; future-final mutation, neutral-prior identity, deterministic predictions; 1,000 game-cluster bootstraps with fixed seed.
- `costs.mjs`: batched shared games/status, cursor-retained per-game tails, periodic full rereads, featured/all scope and deliberately overcounting stress ceiling (16 concurrent games is unreachable); pricing inputs are checked facts, duration/selected-game/page count are planning assumptions.

No candidate is promoted, no uncertainty interval is a licensing clearance, and no source is adopted. No long research job is added to the safe/default catalog. Existing inventory remains 257 entries with 112 default exclusions; research runs are explicit.

Corrections preserve the original broad conclusions. MD-04's potential next implementation is decision-free row identity/transaction accounting only, with acquisition and removal benchmark left to the owner. MD-05 first needs actual production per-team/per-key bridge-materiality **research tooling**, then possible ablation design; full historical causal replay is unavailable without archived live/provider inputs. MD-06 source feasibility and prospective pregame FORCE-prior archival are later follow-ups; no public pilot before licensing certainty, and even an internal feed trial needs owner purchase/trial approval. No business model or feature is authorized.
