# Deep-review economics and steady-state evidence

**Historical policy-v3 evidence, preserved.** Policy v4 supersedes the SLA and baseline described below; see [current rotation report](ROTATION_SLA.md). These earlier results and immutable previews are not rewritten or sent.

All figures are $0 planner projections for production main `39bc08e41fe3c1c8d57de385faa568733c52efc2`, not billed usage or completed Opus review. Prices are the unchanged supplied 2026-10-07 configuration. One UTF8 byte is used as the conservative token proxy; actual tokenization and cache hits are not measured.

## Before optimization: exact preview 003 decomposition

| Pass | Packet bytes | Input proxy | Raw content bytes | Map bytes | Duplicate source bytes | Output cap | Input $ | Output $ | Cache write $ | Ceiling $ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| theme-architecture-001 | 765675 | 771363 | 642189 | 85176 | 0 | 4096 | 3.085452 | 0.081920 | 0.056420 | 3.223792 |
| theme-architecture-002 | 366960 | 372648 | 262447 | 85176 | 0 | 4096 | 1.490592 | 0.081920 | 0.056420 | 1.628932 |
| theme-correctness-001 | 784177 | 789865 | 625829 | 85176 | 0 | 4096 | 3.159460 | 0.081920 | 0.056420 | 3.297800 |
| theme-correctness-002 | 453676 | 459364 | 308315 | 85176 | 0 | 4096 | 1.837456 | 0.081920 | 0.056420 | 1.975796 |
| theme-statistical-001 | 780636 | 786324 | 655491 | 85176 | 0 | 4096 | 3.145296 | 0.081920 | 0.056420 | 3.283636 |
| theme-statistical-002 | 484279 | 489967 | 378840 | 85176 | 0 | 4096 | 1.959868 | 0.081920 | 0.056420 | 2.098208 |
| theme-adversarial-001 | 472555 | 478243 | 368024 | 85176 | 0 | 4096 | 1.912972 | 0.081920 | 0.056420 | 2.051312 |

Exact aggregate: input $16.591096 + output reservation $0.573440 + full stable-prefix cache write $0.394940 = **$17.559476**. Cache reads assumed zero; every request reserves a full prefix write. Input buffers ($0.114688) and prefix buffers ($0.143360) are already included, not added again. No other reserve and no rounding delta in this plan.

Total packet bytes 4,107,958; raw selected bytes 3,241,135; serialized content 3,503,784; map 596,232. The 85,176-byte map repeats beyond its first occurrence by 511,056 bytes ($2.044224 under the input proxy). Literal source repetition is zero. Input dominates; outputs are only 3.27% of the old ceiling. The old plan already used 4096, not 8192.

## Bounded changes

The complete sparse map now uses 71,800 bytes per baseline packet, preserving every path, exclusion, relationship and metadata default. Seven packets save 93,632 map bytes ($0.374528 input). Complementary source assignment remains unchanged: four mandatory perspectives receive actual code, with selected content split once across primary themes and escalation available for missing joint context. No summary-only theme, source elision or eligibility change.

The 896 KiB soft packet limit retains 128 KiB below the 1 MiB hard limit and reduces the tested routine range to 7–8 requests. Output caps use a deterministic schema/evidence allowance, not a uniform historic cap; the increased appropriate reservation offsets part of the map saving. Paid truncation frequency is unmeasured and truncation never completes review history.

BASELINE keeps the broad related-test backlog. ROUTINE related-test closure includes current catalog-selected contracts; historical/default-excluded/unmapped tests remain eligible Tier 2 with mandatory changed/overdue selection and two-audit rotation. This fixes unnecessary every-audit promotion by legacy app references; it does not remove these files from review. All Tier 1, source risk, truth-owner and changed inclusion remains.

## Five real-inventory cycles

| Audit | Scenario | Calls | Ceiling $ | Direct files / % | T1 / T2 / T3 | Changed | Cumulative % | Never reviewed | Oldest age | Audits until ordinary sweep |
| --- | --- | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | CURRENT BASELINE | 7 | 17.348564 | 409 / 65.65 | 48 / 300 / 61 | 0/N.A. | 65.65 | 214 | 0 | 3 |
| 2 | QUIET ROUTINE | 8 | 22.360728 | 358 / 57.46 | 48 / 259 / 51 | 0/N.A. | 80.42 | 122 | 1 | 2 |
| 3 | SYNTHETIC MODERATE INTEGRATION | 8 | 22.230117 | 356 / 57.14 | 48 / 241 / 67 | 6/100% | 91.01 | 56 | 2 | 1 |
| 4 | QUIET / ROTATION PRESSURE | 8 | 24.454009 | 363 / 58.27 | 48 / 259 / 56 | 0/N.A. | 100.00 | 0 | 3 | 0 |
| 5 | ROTATION COMPLETION PRESSURE | 7 | 16.808689 | 349 / 56.02 | 48 / 240 / 61 | 0/N.A. | 100.00 | 0 | 3 | 0 |

Every row has 48/48 Tier-1 content, four theme families and no escalation. Content continuation calls are 3/4/4/4/3, included in the thematic call totals above, not additional duplicated requests. Audit 3 flags six real paths synthetically: model/unit_prior_controller.js, assets/app.js, scripts/test_v37_unit_prior.js, scripts/lib/force_app_harness.js, data/predictive-feature-gates.js, CHANGELOG_V37.md. Real current Git bytes are sizing proxies; this is not a forecast of future changed code.

Each hypothetical successful audit advances only a private cloned ledger. Incomplete/failed/truncated/partial runs do not advance real or hypothetical completed-history policy. All Tier 2 receive exposure within two completed audits; all Tier 3 by audit 4 and thereafter within every four. Baseline counts as audit 1. The real ledger remains zero completed audits / 623 never-reviewed files. Preview and map are not direct Opus exposure. Full per-file hypothetical states, paths, per-pass caps and cost decomposition are in the ignored `FORCE-ECONOMICS-2026-10-08/five-cycle-final.json`.

## Economic verdict

**Call target demonstrated; $5–$8 routine ceiling NOT demonstrated.** The measured routine range is 7–8 / $16.808689–$24.454009. This is not a defensible one-time baseline premium followed by $5–$8 routine plans. The retained periodicity requires at least an average of 1,031,481 + 2,189,408/2 + 5,560,833/4 = 3,516,393.25 original input bytes per audit: **$14.065573** before map, escaping, output, buffers, context or changes. That conservative lower bound alone rules out $8. Actual billing may be lower, but no tokenizer or paid result establishes it. No policy weakening is authorized or performed.

Defaults: target $8; warning above $10; default owner-run guard $10; absolute supported tool maximum $200. Every over-$10 plan still requires a sufficient numerical guard AND explicit owner override/explanation; $100+ requires extraordinary authorization. Baseline is labelled PREMIUM; routine is labelled COST WARNING. Exact evidence-volume drivers are exposed. No automatic send, escalation, retry, paid synthesis or cheaper-file starvation.

## Preview comparison

| Plan | Calls | Ceiling $ | Direct files |
| --- | ---: | ---: | ---: |
| Literal 001, rejected | 60 | 119.606864 | 623/623 |
| Risk rotation 003, superseded | 7 | 17.559476 | 409/623 |
| Optimized BASELINE 004 | 7 | 17.348788 | 409/623 |

New baseline: 48/48 Tier 1, 300 Tier 2, 61 Tier 3, 65.650080% direct content; no changed denominator. Real cumulative coverage remains 0%. Guard $10 blocks sending until the owner separately approves the exact premium. Older previews remain intact and reproduce through archived policy modules, but cannot send through current policy. New pass sizes/caps/ceilings are recorded in its ignored immutable plan; owner scripts pin the final committed tooling HEAD.

No real API request, owner-key access or paid escalation is needed to reproduce this evidence. The goal is not to reread every file weekly; complete system awareness plus bounded critical/changed/rotating direct exposure is the policy. A separately bounded infrastructure-review packet covers validated targeted base through the final tooling tip before any first paid deep audit.
