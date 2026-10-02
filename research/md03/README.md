# MD-03 QB-return correction model research

Research artifacts for [MD03_QB_CORRECTION_MODEL_INVESTIGATION.md](../../MD03_QB_CORRECTION_MODEL_INVESTIGATION.md). Nothing here is production code, a production source decision or a selected model.

## Files

| File | Role |
| --- | --- |
| `build_cohort.py` | Stage 1. Replays the FORCE core Elo engine over 1999-2025, detects every incumbent-QB absence and return, classifies availability from injury reports and roster status, and writes the ledgers. Needs the raw input cache. |
| `evaluate.py` | Stage 2. Offline and deterministic. Scores the predeclared candidate family on the ledgers with season splits, bootstraps, probes and placebo controls. |
| `v33_original_evidence_audit.py` | Re-runs the bundled V33 11-episode study unchanged and audits the six-case claim. |
| `celo_prior_harness.py` | Applies the unchanged V33 prior-isolation harness to every verified offseason episode. |
| `data/input_manifest.json` | SHA-256, size and URL of all 34 raw input files. |
| `data/episode_ledger.json` | Every detected episode with features and post-return evaluation games, plus permanent-change events. |
| `data/placebo_ledger.json` | No-absence placebo windows. |
| `data/replay_check.json` | Replay Brier by season, games per season, KC 2025 damage. |
| `results/*.json` | Committed outputs; `scripts/test_md03_qb_model_research.py` checks they reproduce. |

## Reproduce

```bash
python -B research/md03/build_cohort.py --cache <cache-dir> --download
python -B research/md03/evaluate.py --write
python -B research/md03/celo_prior_harness.py --write
python -B research/md03/v33_original_evidence_audit.py --write
python -B scripts/test_md03_qb_model_research.py
```

Stage 1 downloads `games.csv` from `nflverse/nfldata` and the `stats_player`, `injuries` and `weekly_rosters` release files from `nflverse/nflverse-data`. Those release files are updated in place, so a later download can differ; compare hashes with `data/input_manifest.json` before treating a rebuilt ledger as identical. Stages 2-4 and the test need no network.

## Attribution

Historical inputs: nflverse (`nflverse/nfldata`, `nflverse/nflverse-data`). The nflverse-data release files are published under CC-BY 4.0; `nflverse/nfldata` has no license file. The ledgers contain derived facts (game IDs, results, starters, injury designations) for research reproducibility only.
