# MD-03 QB-return correction model research

Research artifacts for [MD03_QB_CORRECTION_MODEL_INVESTIGATION.md](../../MD03_QB_CORRECTION_MODEL_INVESTIGATION.md). Nothing here is production code, a production source decision, a selected model or evidence that the predictive-feature policy has been passed.

## Files

| File | Role |
| --- | --- |
| `build_cohort.py` | Stage 1. Replays FORCE core Elo over 1999-2025. Detects incumbent-QB absences, returns and role takeovers. Assigns corrected cause classes (VERIFIED_MEDICAL, PROBABLE_MEDICAL, AMBIGUOUS_CAUSE, NONMEDICAL, ROLE_CHANGE) and emulates the Codex prototype detector rules. Needs the raw input cache. |
| `evaluate.py` | Stage 2. Offline and deterministic. Scores the predeclared candidates (plus labelled post-hoc probes) with season splits, unique-game cluster bootstraps, paired decay comparisons, population sensitivity, placebo and cause-class controls. |
| `classification_migration.py` | Audits how episodes moved between the reviewed ledger (`0a6dcb8`) and the corrected one. |
| `v33_original_evidence_audit.py` | Re-runs the bundled V33 11-episode study unchanged. |
| `celo_prior_harness.py` | Applies the unchanged V33 prior-isolation harness to every medically verified offseason episode. |
| `data/input_manifest.json` | SHA-256, size and URL of all 62 raw inputs (`games.csv`; weekly QB stats 1999-2025; injury reports and weekly rosters 2009-2025). |
| `data/episode_ledger.json` | Episodes with cause evidence, features and post-return evaluation games, plus no-return and role-takeover events. |
| `data/detector_like_ledger.json` | Returns found by the detector-rule emulation, with the same fields. |
| `data/placebo_ledger.json` | No-absence placebo windows. |
| `data/replay_check.json` | Replay Brier and games by season, plus KC 2025 damage. |
| `results/*.json` | Committed outputs. `scripts/test_md03_qb_model_research.py` checks that they reproduce. |

## Two modes

**PINNED REPRODUCTION** (default) aborts before writing anything if any raw file is missing or differs from the committed manifest hash or size. It never rewrites the manifest.

```bash
python -B research/md03/build_cohort.py --cache <cache-dir>
python -B research/md03/evaluate.py --write
python -B research/md03/celo_prior_harness.py --write
python -B research/md03/v33_original_evidence_audit.py --write
python -B scripts/test_md03_qb_model_research.py
```

**SOURCE REFRESH** is used only for a deliberate new evidence version. It accepts whatever the cache holds (downloading missing files with `--download`) and rewrites `data/input_manifest.json`. Results built this way are new evidence, not a reproduction.

```bash
python -B research/md03/build_cohort.py --cache <cache-dir> --refresh-sources --download
```

`games.csv` is pinned to `nflverse/nfldata` commit `5898b627`. The release files are updated in place upstream, so a fresh download may not match the manifest; in that case keep the original bytes or use refresh mode deliberately.

The migration audit needs the reviewed ledger:

```bash
git show 0a6dcb8:research/md03/data/episode_ledger.json > OLD.json
python -B research/md03/classification_migration.py OLD.json --write
```

## Attribution

Historical inputs come from nflverse (`nflverse/nfldata`, `nflverse/nflverse-data`). The nflverse-data release files are published under CC BY 4.0; `nflverse/nfldata` has no license file. The ledgers contain derived facts (game IDs, results, starters, injury and roster designations), kept for research reproducibility only.
