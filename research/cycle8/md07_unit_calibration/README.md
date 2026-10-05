# MD-07 current unit calibration research — first bounded tranche

**Execution REVIEW; Decision INVESTIGATE; owner acceptance PENDING; Priority unset.** Owner authorized current architecture/calibration/independence/discrimination/sanity research only on 2026-10-05, from exact synchronized/deployed base `fd585891214db483112f52d4746106c606afeb43`. This branch is not merged, pushed or deployed. Production implementation, formula/prior redesign, MD-08 normalization changes and UX-41 changes are NOT AUTHORIZED. MD-05 remains REVIEW/BANKED; no additional MD-05 research is performed. MD-06 remains REVIEW / NOT AUTHORIZED.

WR does **not** meet the declared compression convention in this snapshot. Partial QB residualization reduces its association but leaves a strong descriptive relationship. KC's RB score reflects live efficiency, stabilization and an old prior, not overlooking Walker's current team. The clearest reproducible code-level lead is an RB prior callback/reference mismatch, with at most 1.63 current-grade points in a frozen prior-only control. Pass-rush measurement quality cannot be established uniformly across charted/proxy providers. No replacement or calibration change is selected.

[Exact architecture](ARCHITECTURE.md) maps every formula, physical signal, prior, context/fallback path, public label and bridge weight. [Distributions](results/unit_distributions.json), [dependencies](results/unit_dependencies.json), [benchmark alignment](results/benchmark_alignment.json), [sanity cases and all tails](results/pathology_bank.json), [summary matrix](results/unit_summary.json), [CSV](results/unit_audit.csv) and [RB prior call audit](results/rb_prior_call_audit.json) are frozen evidence, not model adoption.

## Frozen provenance and completeness

- Capture `2026-10-05T18:03:19.979028Z` from the public `/api/bootstrap`, HTTP 200; built `2026-10-05T18:01:57.385Z`.
- Generation `1791223317385-dfe3e0cd-b518-4dc4-97e6-1d81b11f1c76`.
- Raw response SHA-256 `1c78e575e4252cc8073bffcba471b1c1ecb31f7707f9c83145492b84824945dd`; 8,356,380 bytes; retained privately, not committed.
- [Normalized input](inputs/current_snapshot.json) SHA-256 `b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247`.
- App live true; integrity ready true; stale false; 1.38-minute age at capture; 32/32 current teams; no unscored already-started games; no bootstrap warnings.
- All 18 ordered published scripts match exact base after LF normalization. Prior successful Cloudflare check identifies Worker version `6f108636-5d00-425e-8588-41e1b08cc4b7`. Bootstrap does not attest a Git SHA; deployed-base evidence is source parity plus the deployment record.
- Four pass-rush teams use `pfr-advanced`: ATL, CLE, NO, PIT. Twenty-eight use `nflverse-weekly-disruption`: explicit current proxy fallback, not offline/prior-held data. Every audited QB/rush team is live-current.
- Derived numeric stages and team aggregates only: no bootstrap/FTN/PFR/player/PBP rows or restricted raw pages committed. [Provenance](inputs/provenance.json) and [official fact summaries](inputs/independent_facts.json) retain URLs/times/hashes. Benchmark aliases LA/STL→LAR, SD→LAC, OAK→LV, JAC→JAX normalized; all 33 comparisons n=32.
- One independent current generation; repeated calculations of it do not establish temporal persistence.

## Predeclared diagnostic conventions

Population SD; quantiles interpolate at `(n-1)*p`; Spearman uses midrank ties. Inputs require finite numbers, missing values stay null, pairwise n is reported, and non-finite output is rejected before serialization. No p-values, tuned coefficients or causal inference from 32 teams.

Display clustering by middle-80% span: <15 VERY COMPRESSED; 15..<30 COMPRESSED; 30..60 REASONABLY DISCRIMINATIVE; >60 VERY WIDE. These research thresholds are not validated football/UI thresholds. A wide scale does not prove valid measurement.

Raw compression is marked when stabilized/current IQR <.50 or like-for-like current/historical raw IQR <.50. Display compression is <30 displayed middle80 despite raw/historical IQR >=.50. Both yield BOTH. Diagnosis is conditional on available scalar stages; missing comparable historical scalars are explicit. QB/coverage are multivariate, rush is provider-heterogeneous and composites are weighted existing grades, not a common physical quality scale.

Sanity PASS means available non-formula outcomes agree directionally, or scope/prior/components explain discordance. QUESTIONABLE means opposite score/benchmark quartiles or important construct/evidence limits. CLEAR PATHOLOGY needs two genuinely independent same-construct facts and unexplained opposite tails; same-feed comparisons alone cannot certify it. Cases are top tails plus systematic rank-gap >=10 discordances, never tuning targets. Ingredient correlations are labeled, not independent validation.

## Display distribution and discrimination

Raw summaries, 31 intermediate-signal summaries, raw/display rank orders and adjacent spacings are in the distribution JSON. Scores below are full grades before text rounding. Bins: <40, 40–<50, 50–<60, 60–<70, 70–<80, 80–<90, >=90. No unit has <30 middle80 span.

| Unit | Min | Max | Mean | Median | SD | IQR | P10 | P25 | P75 | P90 | Bins |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| QB play | 17.25 | 92.88 | 52.27 | 53.40 | 23.67 | 45.22 | 21.16 | 27.62 | 72.85 | 83.03 | 12,2,5,3,4,5,1 |
| Receivers | 13.65 | 83.70 | 45.92 | 51.92 | 19.82 | 31.24 | 19.27 | 27.52 | 58.76 | 65.83 | 13,2,10,4,2,1,0 |
| Offensive line | 9.76 | 85.42 | 42.31 | 37.84 | 17.75 | 20.38 | 24.14 | 29.77 | 50.16 | 69.08 | 17,7,3,3,0,2,0 |
| RB | 12.72 | 85.43 | 49.58 | 49.61 | 18.61 | 32.55 | 27.32 | 34.51 | 67.06 | 74.21 | 12,4,5,6,4,1,0 |
| Coverage | 3.54 | 93.55 | 50.01 | 54.32 | 23.95 | 34.25 | 17.76 | 31.40 | 65.65 | 82.43 | 11,4,7,3,2,3,2 |
| Pass rush | 9.82 | 96.39 | 49.56 | 48.07 | 25.74 | 39.03 | 15.01 | 31.95 | 70.98 | 84.81 | 13,4,3,3,4,4,1 |
| Run defense | 10.06 | 90.53 | 49.90 | 47.05 | 24.90 | 41.33 | 15.61 | 30.96 | 72.29 | 85.42 | 12,5,1,5,4,4,1 |
| Scoring/drive | 7.17 | 95.03 | 50.01 | 49.12 | 25.88 | 35.85 | 18.07 | 31.15 | 67.00 | 85.07 | 14,3,2,5,3,2,3 |
| Pts/drive prevention | 10.00 | 90.00 | 49.99 | 50.00 | 23.69 | 40.65 | 18.00 | 30.00 | 70.65 | 81.81 | 13,3,4,3,5,3,1 |
| Overall offense | 11.65 | 92.40 | 47.88 | 44.15 | 23.75 | 42.85 | 21.65 | 26.72 | 69.58 | 81.95 | 15,3,5,1,1,6,1 |
| Overall defense | 13.02 | 93.69 | 49.34 | 46.48 | 21.00 | 31.76 | 25.68 | 31.99 | 63.76 | 78.93 | 12,7,3,4,3,1,2 |
| Team efficiency (diagnostic) | 5.92 | 94.46 | 49.98 | 47.69 | 26.03 | 40.65 | 15.10 | 30.25 | 70.91 | 84.80 | 12,5,4,2,3,3,3 |

| Unit | Full range | Middle80 | Top5 spread | Bottom5 spread | Top5 mean minus median | Median minus bottom 5 mean | Within median ±2/±5/±10 | Distinct full/integer/tenth | Class |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| QB play | 75.63 | 61.87 | 11.31 | 4.68 | 32.56 | 33.57 | 3/5/8 | 32/27/31 | VERY WIDE |
| Receivers | 70.05 | 46.57 | 18.78 | 8.37 | 22.50 | 34.42 | 2/3/12 | 32/26/32 | REASONABLY DISCRIMINATIVE |
| Offensive line | 75.67 | 44.94 | 21.46 | 14.93 | 36.64 | 17.72 | 3/7/16 | 32/27/31 | REASONABLY DISCRIMINATIVE |
| RB | 72.71 | 46.89 | 12.98 | 14.84 | 27.31 | 26.43 | 2/5/9 | 32/29/32 | REASONABLY DISCRIMINATIVE |
| Coverage | 90.00 | 64.67 | 13.04 | 18.97 | 32.93 | 40.53 | 4/6/9 | 32/27/30 | VERY WIDE |
| Pass rush | 86.56 | 69.80 | 14.85 | 5.86 | 39.28 | 35.52 | 2/4/8 | 32/28/32 | VERY WIDE |
| Run defense | 80.47 | 69.81 | 10.50 | 7.20 | 38.93 | 33.43 | 0/4/6 | 32/25/31 | VERY WIDE |
| Scoring/drive | 87.86 | 67.00 | 10.32 | 12.25 | 40.78 | 36.19 | 3/4/5 | 32/25/32 | VERY WIDE |
| Pts/drive prevention | 80.00 | 63.81 | 12.18 | 10.32 | 34.47 | 34.84 | 2/4/7 | 30/29/30 | VERY WIDE |
| Overall offense | 80.75 | 60.30 | 10.90 | 12.61 | 40.09 | 25.77 | 2/3/8 | 32/26/31 | VERY WIDE |
| Overall defense | 80.67 | 53.25 | 16.81 | 14.54 | 38.57 | 24.59 | 4/10/12 | 32/27/31 | REASONABLY DISCRIMINATIVE |
| Team efficiency (diagnostic) | 88.54 | 69.70 | 12.40 | 9.18 | 41.66 | 35.51 | 3/5/10 | 32/27/31 | VERY WIDE |

## Raw signal versus mapping

The architecture identifies exact raw keys; input retains unadjusted/residual/stabilized/calibrated WR/RB, QB components/stabilized signals/contexts/recency, pressure source, EPA/CPOE allowed, drive opportunities, live mapped scores and effective priors. Raw composite values are already-weighted normalized grades, not football production. Physical units across rows are not comparable.

| Unit | Raw SD | Raw IQR | Stabilized/raw IQR | Current/historical raw IQR | Compression-source classification | MD-08 concern |
|---|---:|---:|---:|---:|---|---|
| QB play | 0.184734 | 0.289146 | 0.489 | — | A. RAW-SIGNAL COMPRESSION | NONE |
| Receivers | 0.098022 | 0.132353 | 0.586 | 1.447 | D. NEITHER | NONE |
| Offensive line | 0.029216 | 0.033847 | — | — | D. NEITHER | NONE |
| RB | 0.102860 | 0.144417 | 0.549 | 1.326 | D. NEITHER | NONE |
| Coverage | 0.142104 | 0.142945 | — | — | D. NEITHER | NONE |
| Pass rush | 0.083118 | 0.118428 | — | — | D. NEITHER | NONE |
| Run defense | 0.084131 | 0.110870 | — | — | D. NEITHER | NONE |
| Scoring/drive | 0.587740 | 0.907556 | — | — | D. NEITHER | NONE |
| Pts/drive prevention | 0.440183 | 0.631783 | — | — | D. NEITHER | NONE |
| Overall offense | 16.863511 | 28.324692 | — | — | D. NEITHER | NONE |
| Overall defense | 16.533963 | 22.734907 | — | — | D. NEITHER | NONE |
| Team efficiency (diagnostic) | 0.113982 | 0.172849 | — | — | D. NEITHER | NONE |

QB A describes deliberate reliability attenuation of its EPA component, not complete-grade clustering: its middle80 span is 61.87. Other D flags mean no compression demonstrated under the available convention, not that every unmeasured dimension is clear. Every NONE is conditional current compression evidence, not MD-08 authorization or cross-unit comparability certification. Environment translation alone preserves IQR; opportunity-dependent stabilization and prior blending can change ranks. All mappings remain intact.

## Descriptive cross-unit matrix

Raw columns orient lower-is-better metrics as higher quality. QB uses all-play EPA, WR residual EPA, coverage attempt EPA allowed and rush a mixed-provider composite; proxies are not complete isolated skill. Partials control core Elo, current offensive/defensive EPA, or core plus corresponding points/drive. Controls share arithmetic with grades; they are not identified causal confounders. All pairs n=32, <=2 controls.

| Pair | Display Pearson | Display Spearman | Raw Pearson | Raw Spearman | Partial core | Partial outcome | Partial core + drive |
|---|---:|---:|---:|---:|---:|---:|---:|
| QB play / Receivers | 0.756 | 0.773 | 0.782 | 0.746 | 0.686 | 0.239 | 0.305 |
| QB play / Offensive line | 0.252 | 0.234 | 0.297 | 0.197 | 0.142 | -0.245 | 0.019 |
| QB play / RB | 0.273 | 0.256 | 0.298 | 0.257 | 0.075 | -0.511 | -0.230 |
| Receivers / Offensive line | 0.212 | 0.228 | 0.342 | 0.233 | 0.119 | -0.127 | -0.002 |
| Receivers / RB | 0.065 | 0.018 | 0.019 | -0.038 | -0.127 | -0.561 | -0.484 |
| RB / Offensive line | 0.393 | 0.415 | 0.301 | 0.355 | 0.332 | 0.254 | 0.301 |
| Scoring/drive / QB play | 0.850 | 0.842 | 0.852 | 0.879 | 0.781 | 0.116 | 0.205 |
| Scoring/drive / Receivers | 0.716 | 0.745 | 0.784 | 0.758 | 0.631 | 0.085 | -0.359 |
| Scoring/drive / Offensive line | 0.256 | 0.215 | 0.293 | 0.251 | 0.143 | -0.239 | -0.090 |
| Scoring/drive / RB | 0.449 | 0.404 | 0.406 | 0.319 | 0.298 | -0.023 | 0.114 |
| Coverage / Pass rush | 0.102 | 0.093 | 0.012 | 0.004 | -0.087 | -0.112 | -0.135 |
| Coverage / Run defense | 0.108 | 0.104 | 0.018 | 0.149 | 0.324 | -0.598 | -0.075 |
| Pass rush / Run defense | 0.041 | 0.050 | 0.096 | 0.036 | 0.108 | -0.079 | 0.121 |
| Pts/drive prevention / Coverage | 0.822 | 0.831 | 0.804 | 0.846 | 0.722 | 0.503 | 0.064 |
| Pts/drive prevention / Pass rush | 0.144 | 0.162 | 0.217 | 0.162 | -0.016 | -0.037 | -0.090 |
| Pts/drive prevention / Run defense | 0.238 | 0.230 | 0.239 | 0.223 | 0.465 | -0.334 | -0.096 |

## QB → receiver findings

Residualization lowers current raw Pearson with actual-pass QB EPA from **.950 to .790** (Spearman .930→.750); stabilization gives .776. Final displayed WR/QB Pearson **.756** (Spearman .773). WR score versus team passing EPA .752, pass success .655, scoring/drive .716. WR/QB top-five overlap3/5. Partial core .686; offensive EPA .239; core plus drive outcome .305. These are descriptive sensitivities, not causal contamination, acceptable independence or double-counting proof.

The historical ridge beta .588 intentionally subtracts partial context. Fitting is 2025, live 2026; residual covariance need not be zero. QB/WR grades share plays and legitimately good performances can co-occur. Replacement needs separate intended construct/acceptable dependence and incremental causal evaluation.

PHI WR 10/QB 26 is the largest stronger-WR/weaker-QB rank gap16; CHI WR 19/QB 9 goes the other way. MIN WR 15/QB 28 and NO WR 5/QB 16 also differ. **No WR top-quartile/QB bottom-quartile opposite-tail case exists.** The bank uses observed strongest discordance rather than manufacturing an elite-WR/bottom-QB archetype. Neither distribution nor outcome agreement proves isolated receiver talent.

## RB and verified Walker/KC case

RB/FB room:70% rushing EPA/carry,30% partially QB-residualized receiving EPA/target. Rush/display r=.857; receiving residual/display .369; RB/OL .393; RB/QB .273; RB/scoring .449. OL is pass protection, not run blocking. Receiving stabilization IQR ratio .365 is marked, rushing .620, combined .549; full room still separates. Workload improves reliability, not an explicit yardage reward. EPA captures situational success/scoring indirectly. YPC/first downs/20+ are comparison outcomes, not tuning targets.

**Walker is with Kansas City in 2026, not Seattle.** [Chiefs official splits](https://www.chiefs.com/team/players-roster/kenneth-walker-iii/splits/) show four games,87 carries,537 yards(6.17/carry),four rushing TDs and84 receiving yards. The [October1 September award article](https://www.chiefs.com/news/ken-walker-earns-afc-offensive-player-of-the-month-honors-for-september) establishes a360-yard league lead through three weeks, not a verified Week4 league/YPC lead. One player’s production does not define full-room quality.

| Field | KC | Seattle |
|---|---:|---:|
| RB display | 76.067202 | 24.783994 |
| OL display | 44.934854 | 37.130741 |
| QB display | 81.569381 | 80.223003 |
| Offense composite | 80.426443 | 58.930660 |
| Room rush EPA/carry | 0.092167 | -0.248530 |
| Room receiving EPA/target | 0.215823 | 0.013403 |
| Receiving residual | 0.143553 | -0.037837 |
| Raw room composite | 0.107583 | -0.185322 |
| Stabilized rush | 0.034264 | -0.195094 |
| Stabilized receiving residual | 0.028811 | -0.041053 |
| Stabilized composite | 0.032628 | -0.148882 |
| Calibrated composite | 0.075586 | -0.105924 |
| Live mapped RB grade | 90.011480 | 21.741912 |
| Effective RB prior | 16.638284 | 37.595274 |
| Effective prior games | 0.938552 | 0.949814 |

KC **76.07/rank 3**; Seattle **24.78/rank 30**. KC whole room 103 carries/5.757 YPC; Walker primary, Seattle primary Emanuel Wilson. KC rush .09217 plus receiving residual .14355 gives .10758; shrinkage gives .03263; environment translation adds .04296→.07559; live percentile90.01. Four live games with prior 16.64 at .93855 prior games gives 76.07. Prior is the older2025 Pacheco room, not a current Walker ranking. Seattle negative room EPA explains the ordering; no Seattle>KC tuning is warranted.

The **RB prior callback mismatch** is separate. All32 effective priors reproduced; an explicitly unary default-helper reference changes KC by -.1035 current points, so it does not explain90→76. Max prior difference9.7844; max frozen current prior-only1.6310. No beta/prior/frame is selected, no production correction and no MD-05 bridge ablation performed. [Exact source mechanics/control](ARCHITECTURE.md#receivers-and-rb-raw-stages-and-prior-mismatch).

## OL, defensive units and drive outcomes

OL **100% pass-protection input**, coherent with inverse disruption r=.975 and less with sacks .483; run YPC .396 is a scope contrast. Broad `Offensive line`/`OL` can imply run blocking, but no user study measures confusion. Label/scope is owner-gated. [SF official2026 stats](https://www.49ers.com/team/stats/2026/reg) report zero sacks/113 attempts: corroborates protection tail, not zero pressure/all-line excellence.

Coverage/rush display r=.102, mixed raw r=.012. Weak correlation is not causal independence. KC coverage4/rush29, DET coverage30/rush5 distinguish archetypes. Sack exclusion is accounting separation; pressure still affects actual-throw EPA. No explicit pressure residualization. Coverage inverse attempt EPA r=.933, success .808, yards/attempt .632, prevention/drive .822. Isolated defender skill remains unproved.

Rush sack r=.798 and weekly disruption .953 are ingredient/adjacent checks. Four charted teams are nonrandom; provider-stratified results cannot establish bias direction. [Vikings official2026 stats](https://www.vikings.com/team/stats/2026/reg) show16 defensive sacks, corroborating MIN disruption tail without certifying uniform true pressure.

Run defense inverse EPA r=.963 is ingredient alignment; inverse YPC .602, first-down rate .577 and20+ rate .359 are separate outcome diagnostics. First downs are not EPA-positive success. Prevention/drive r=.237; team rushing includes QB runs and opponent/OL context. TB strong inverse-rush-EPA/low YPC is coherent. Prior run-stop/current EPA construct difference remains a lead, not a replacement.

Drive scores each r=.979 with raw qualifying PPD; total scored/allowed PPG .937/.915. Strong component associations are broad outcome relationships. Offensive prior legacy EPA; defensive prior 50/one game; no opponent/field-position adjustment. [Vikings schedule](https://www.vikings.com/schedule/) shows51 points allowed/four games(12.75/game). Scoreboard and qualifying offensive points differ. Current drive-outcome coherence is not independent position-group measurement. No MD-10 work.

## Sanity bank

Five offensive examples(four systematic tails plus KC),four defensive tails,six systematic discordances: **15 cases;14 PASS,1 QUESTIONABLE,no certified CLEAR PATHOLOGY**. MIN rush is QUESTIONABLE because proxy/sack evidence cannot establish uniform true pressure. Official SF/BUF/KC/MIN corroborate selected cases; [Bills current stats](https://www.buffalobills.com/team/stats/2026/reg) show Cook 421 yards/70 carries. Other checks are non-formula same-feed outcomes, not independent providers. QB/WR strong opposite-quartile availability limit is explicit.

| Case | Reason | Raw | Display | Rank | Observable checks(values/ranks) | Result |
|---|---|---:|---:|---:|---|---|
| SF QB play | Highest displayed offense-unit tail | 0.515445 | 92.88 | 1 | qbEpaPerPlay=0.5154 (#1); qbAnyA=10.4602 (#1) | PASS |
| SF Receivers | Highest displayed offense-unit tail | 0.436913 | 83.70 | 1 | wrteYardsPerTarget=9.4051 (#4); wrteFirstDownRate=0.4937 (#1) | PASS |
| BUF RB | Highest displayed offense-unit tail | 0.139514 | 85.43 | 1 | rbYpc=5.8514 (#1); rbFirstDownRate=0.2973 (#2) | PASS |
| SF Offensive line | Highest displayed offense-unit tail | 0.098214 | 85.42 | 1 | sackAllowed=0.0000 (#1) | PASS |
| KC RB | Owner-supplied case corrected to Walker currently on KC | 0.107583 | 76.07 | 3 | rbYpc=5.7573 (#2); rbFirstDownRate=0.2718 (#4) | PASS |
| MIN Coverage | Highest displayed defense-unit tail | -0.002599 | 93.55 | 1 | coverageSuccessAllowed=0.3615 (#1); passYardsAllowedPerAttempt=6.7252 (#11) | PASS |
| MIN Pass rush | Highest displayed defense-unit tail | 0.500680 | 96.39 | 1 | frontSackRate=0.1088 (#1); frontPressureRate=0.3810 (#1) | QUESTIONABLE |
| TB Run defense | Highest displayed defense-unit tail | -0.191589 | 90.53 | 1 | rushYpcAllowed=3.2041 (#2); rushExplosive20Allowed=0.0204 (#18) | PASS |
| MIN Pts/drive prevention | Highest displayed defense-unit tail | 1.108696 | 90.00 | 1 | defensivePointsPerDrive=1.1087 (#1); pointsAgainstPerGame=12.7500 (#1) | PASS |
| PHI Receivers | Discordance receiverIndex__qbIndex: rank gap -16 | 0.227603 | 58.38 | 10 | wrteYardsPerTarget=7.5393 (#22); wrteFirstDownRate=0.3596 (#21) | PASS |
| CHI Receivers | Discordance receiverIndex__qbIndex: rank gap 10 | 0.191417 | 40.84 | 19 | wrteYardsPerTarget=8.1346 (#14); wrteFirstDownRate=0.3942 (#12) | PASS |
| JAX RB | Discordance rbIndex__olIndex: rank gap -20 | -0.081550 | 66.98 | 9 | rbYpc=4.4792 (#7); rbFirstDownRate=0.2708 (#5) | PASS |
| TEN RB | Discordance rbIndex__olIndex: rank gap 23 | -0.255405 | 27.29 | 29 | rbYpc=3.9211 (#18); rbFirstDownRate=0.1579 (#31) | PASS |
| KC Coverage | Discordance coverageIndex__passRushIndex: rank gap -25 | 0.019708 | 82.64 | 4 | coverageSuccessAllowed=0.4722 (#12); passYardsAllowedPerAttempt=6.2313 (#4) | PASS |
| DET Coverage | Discordance coverageIndex__passRushIndex: rank gap 25 | 0.452780 | 14.58 | 30 | coverageSuccessAllowed=0.5549 (#31); passYardsAllowedPerAttempt=7.9273 (#27) | PASS |

JSON retains ingredient/non-formula labels and official facts/URLs. Official pages can ultimately share NFL data with nflverse; official corroboration is not proof of an independent pipeline. No licensed separation/YPRR/YAC/contact/block responsibility/time-to-pressure data acquired. PASS is current directional coherence, not historical certification.

## Benchmark alignment

33 descriptive pairs, n=32 each. Quality-oriented Pearson/Spearman, top/bottom 5 overlap, >=10-rank outliers and leave-one-team-out extrema retained. Benchmark choice source-defined, not optimized. True isolated talent/full-league charted pressure/EPA rushing success remain unavailable. Ingredient/related correlations are not independent validation.

| Unit | Benchmark / boundary | Pearson | Spearman | Top5 | Bottom5 | Leave-one-team-out Pearson |
|---|---|---:|---:|---:|---:|---|
| QB play | qbEpaPerPlay — ingredient | 0.938 | 0.962 | 3/5 | 4/5 | 0.933..0.953 |
| QB play | qbAnyA — ingredient | 0.916 | 0.948 | 4/5 | 4/5 | 0.909..0.932 |
| QB play | qbPassSuccessRate — ingredient | 0.854 | 0.837 | 4/5 | 2/5 | 0.837..0.883 |
| QB play | qbCpoe — ingredient | 0.716 | 0.732 | 2/5 | 2/5 | 0.694..0.745 |
| Receivers | wrteYardsPerTarget — non-formula same-source outcome | 0.673 | 0.703 | 2/5 | 1/5 | 0.647..0.705 |
| Receivers | wrteFirstDownRate — non-formula same-source outcome | 0.851 | 0.857 | 4/5 | 2/5 | 0.830..0.871 |
| Receivers | recvEpa — pre-residual ingredient | 0.897 | 0.884 | 4/5 | 4/5 | 0.884..0.915 |
| Offensive line | sackAllowed — adjacent non-formula outcome | 0.483 | 0.367 | 2/5 | 0/5 | 0.354..0.534 |
| Offensive line | pbpPressureAllowedRate — ingredient | 0.975 | 0.951 | 4/5 | 4/5 | 0.969..0.977 |
| Offensive line | teamRushYpc — scope contrast, not pass-protection ground truth | 0.391 | 0.398 | 3/5 | 1/5 | 0.343..0.513 |
| RB | rbYpc — non-formula same-source outcome | 0.758 | 0.714 | 4/5 | 1/5 | 0.719..0.784 |
| RB | rbFirstDownRate — non-formula same-source outcome | 0.847 | 0.858 | 4/5 | 2/5 | 0.829..0.872 |
| RB | rbExplosive20Rate — non-formula same-source outcome | 0.491 | 0.436 | 3/5 | 0/5 | 0.402..0.596 |
| RB | rbRushEpa — ingredient | 0.857 | 0.837 | 3/5 | 3/5 | 0.835..0.879 |
| RB | rbReceivingYardsPerTarget — non-formula same-source outcome | 0.449 | 0.458 | 3/5 | 1/5 | 0.414..0.506 |
| Coverage | coverageSuccessAllowed — non-formula same-source outcome | 0.808 | 0.776 | 3/5 | 3/5 | 0.782..0.848 |
| Coverage | passYardsAllowedPerAttempt — non-formula same-source outcome | 0.680 | 0.642 | 3/5 | 3/5 | 0.632..0.736 |
| Coverage | oppPassEpa — ingredient | 0.933 | 0.963 | 5/5 | 4/5 | 0.923..0.944 |
| Pass rush | frontSackRate — ingredient/adjacent | 0.798 | 0.800 | 2/5 | 3/5 | 0.771..0.840 |
| Pass rush | frontPressureRate — provider-heterogeneous ingredient/proxy | 0.953 | 0.974 | 4/5 | 5/5 | 0.950..0.960 |
| Run defense | rushYpcAllowed — non-formula same-source outcome | 0.604 | 0.583 | 2/5 | 2/5 | 0.564..0.674 |
| Run defense | rushFirstDownRateAllowed — first-down proxy, not EPA success rate | 0.579 | 0.603 | 2/5 | 1/5 | 0.540..0.626 |
| Run defense | rushExplosive20Allowed — non-formula same-source outcome | 0.363 | 0.324 | 1/5 | 2/5 | 0.320..0.465 |
| Run defense | oppRushEpa — ingredient | 0.963 | 0.985 | 5/5 | 5/5 | 0.959..0.977 |
| Scoring/drive | offensivePointsPerDrive — ingredient | 0.979 | 0.989 | 5/5 | 5/5 | 0.977..0.983 |
| Scoring/drive | pointsForPerGame — related outcome, includes non-offensive scoring | 0.937 | 0.931 | 4/5 | 5/5 | 0.931..0.945 |
| Pts/drive prevention | defensivePointsPerDrive — ingredient | 0.979 | 1.000 | 5/5 | 5/5 | 0.977..0.986 |
| Pts/drive prevention | pointsAgainstPerGame — related outcome, includes non-offensive scoring | 0.915 | 0.922 | 4/5 | 4/5 | 0.906..0.934 |
| Overall offense | offEpa — related same-source outcome | 0.963 | 0.949 | 4/5 | 3/5 | 0.960..0.968 |
| Overall offense | offensivePointsPerDrive — component input | 0.927 | 0.912 | 4/5 | 2/5 | 0.917..0.934 |
| Overall defense | defEpa — related same-source outcome | 0.909 | 0.882 | 4/5 | 4/5 | 0.893..0.926 |
| Overall defense | defensivePointsPerDrive — component input | 0.863 | 0.861 | 3/5 | 4/5 | 0.838..0.880 |
| Team efficiency (diagnostic) | offEpa — ingredient | 0.975 | 0.992 | 4/5 | 5/5 | 0.972..0.980 |

Outliers are not dropped: JSON includes every >=10-rank discrepancy and its values. LOO is correlation sensitivity, not fitted predictive cross-validation. [EXTREMES.md](EXTREMES.md) lists all 120 top/bottom-five entries, scores, raw proxies and two available benchmark facts(one for legacy diagnostic); boundaries explicit. Tails are broadly plausible on available outcomes. KC old-prior drag, TEN weak RB/strong pass-protection OL and KC/DET opposite coverage/rush are explainable, not tuned. No certified false-positive/negative isolated-skill claim follows.

## Unit judgments / cross-unit summary

A current formula appears sound/no material defect; B directional measurement/context independence weak; C raw signal compressed; D material construct misalignment; E insufficient evidence. **A is narrow current-state coherence on the documented construct**, not predictive validity or permanent policy approval. B is not causal contamination. No C/D warranted from this snapshot; concrete RB prior mismatch is recorded separately despite limited current magnitude.

| Unit | Display SD/middle80 | Raw SD/IQR | Strongest listed adjacent r | Core r/outcome r | Bank | Predictive | MD07 | MD08 |
|---|---|---|---|---|---|---|---|---|
| QB play | 23.67/61.87 | 0.18473/0.28915 | Scoring/drive/QB play 0.850 | 0.551/0.910 | SF:PASS | UNAVAILABLE | A | NONE |
| Receivers | 19.82/46.57 | 0.09802/0.13235 | QB play/Receivers 0.756 | 0.438/0.760 | SF:PASS, PHI:PASS, CHI:PASS | UNAVAILABLE | B | NONE |
| Offensive line | 17.75/44.94 | 0.02922/0.03385 | RB/Offensive line 0.393 | 0.248/0.380 | SF:PASS | UNAVAILABLE | A | NONE |
| RB | 18.61/46.89 | 0.10286/0.14442 | Scoring/drive/RB 0.449 | 0.390/0.501 | BUF:PASS, KC:PASS, JAX:PASS, TEN:PASS | UNAVAILABLE | B | NONE |
| Coverage | 23.95/64.67 | 0.14210/0.14295 | Pts/drive prevention/Coverage 0.822 | 0.621/0.804 | MIN:PASS, KC:PASS, DET:PASS | UNAVAILABLE | A | NONE |
| Pass rush | 25.74/69.80 | 0.08312/0.11843 | Pts/drive prevention/Pass rush 0.144 | 0.270/0.208 | MIN:QUESTIONABLE | UNAVAILABLE | E | NONE |
| Run defense | 24.90/69.81 | 0.08413/0.11087 | Pts/drive prevention/Run defense 0.238 | -0.225/0.514 | TB:PASS | UNAVAILABLE | A | NONE |
| Scoring/drive | 25.88/67.00 | 0.58774/0.90756 | Scoring/drive/QB play 0.850 | 0.577/0.912 | tails only | UNAVAILABLE | A | NONE |
| Pts/drive prevention | 23.69/63.81 | 0.44018/0.63178 | Pts/drive prevention/Coverage 0.822 | 0.582/0.798 | MIN:PASS | UNAVAILABLE | A | NONE |
| Overall offense | 23.75/60.30 | 16.86351/28.32469 | — | 0.608/0.963 | tails only | UNAVAILABLE | A | NONE |
| Overall defense | 21.00/53.25 | 16.53396/22.73491 | — | 0.461/0.909 | tails only | UNAVAILABLE | A | NONE |
| Team efficiency (diagnostic) | 26.03/69.70 | 0.11398/0.17285 | — | 0.559/0.975 | tails only | UNAVAILABLE | A | NONE |

Strongest adjacent searches the 16 required pairs, not every possible pair. Core is pre-bridge Elo; outcome is current offensive/defensive EPA quality. The preceding alignment table supplies each unit’s benchmark evidence. No further MD-05 ablation is performed.

- **QB A:** broad mapped components/contexts/recency, ingredient agreement and official SF output. Reliability attenuation is not whole-grade clustering; individual skill/incremental prediction unproved.
- **WR B:** broad distribution, receiving outcomes coherent, residualization helps; strong QB association remains. Acceptable dependence/causal skill target unresolved.
- **OL A:** coherent pass protection; public label/run-block scope remains an owner question.
- **RB B:** full room directionally aligns with efficiency; no global material miscalibration established. Context, receiving shrinkage, prior drag and concrete prior callback mismatch require separate consideration. Do not claim all priors correct.
- **Coverage A:** coherent sack-free passing outcomes; no isolated defender-skill certification.
- **Pass rush E:** charting/proxy heterogeneity and missing independent uniform true-pressure benchmark prevent full validity judgment.
- **Run defense A:** coherent current rushing outcomes; prior run-stop/live EPA construct and opponent/run-block context are research leads.
- **Scoring/prevention A:** coherent documented drive outcomes, not independent position groups; prior asymmetry/possession policy unresolved.
- **Offense/defense composites A:** arithmetic/calibration coherent, no new independent information or predictive validation.
- **Legacy efficiency A:** coherent EPA diagnostic, not another bridge/public unit.

## Historical availability and predictive validity

**Predictive validation UNAVAILABLE for independently certified exact causal current-production unit reconstruction in this tranche. No predictive scores reported.** Historical football data exist; this does not assert reconstruction can never be done.

Available: free/pinned 2024/2025 weekly/PBP research inputs, bundled 2025 component priors, 2025 PBP calibration reference and current 2026 per-game/weekly summaries. [Cycle 7 proxy histories](../../cycle7/README.md) are research proxies, not exact production archives. Current API contains 63 completed-game summaries and 2025 sample-window references, not dated full provider/control-state snapshots. No restricted raw history is redistributed.

| Scope | Causal feasibility | Missing verification / boundary |
|---|---|---|
| QB / WR / RB | 2026 event/weekly prefix reconstruction is a plausible subset candidate, not certified exact | Date-valid prior/frame provenance and prefix-only opponent/pressure/recency/continuity reconstruction must be demonstrated. Historical as-of integrity/provider availability and feed revisions are not archived; today’s aggregates cannot be reused at earlier checkpoints. |
| OL / coverage / run defense | Physical PBP/weekly signals partly reconstructable by game | Exact causal checkpoint priors/calibration/freshness/control states still need reconstruction and future-row invariance tests; earlier proxies use different formulas. |
| Pass rush | Exact current-policy history unavailable | Complete dated charting/source-selection/manual-aggregate archive absent; cannot treat disruption as true pressure or reuse today’s aggregate in the past. |
| Drive outcomes | Per-game points/drive available, full historical grades not certified | Exact qualifying drives, as-of availability and offensive regime/defensive neutral priors must match; no invented defensive prior. |
| Composites | Inherit component feasibility | Any missing component/control state defeats exact full history. |
| 2024/2025 replay | Present priors/references cannot be applied causally to earlier years | Using full 2025 priors/calibration before their availability would leak future data; prior-year equivalents and earlier control states not established by current proxy fixtures. |

A 2026 subset replay is not proven impossible. It is **unvalidated**, with few early-season transitions and no historical as-of archive. No subset is falsely promoted as certified predictive validation. A separately authorized prefix study could first prove future-row invariance and dated input provenance. The manual design below establishes subsequent evidence. No historical future-leaking experiment or winner-Brier-only proxy is reported.

## Manual prospective format — design only

No scheduler, background task, automatic capture, endpoint change or deployment. Future capture/analysis needs separate owner authorization; this is a format design, not a running collector.

1. Pregame record `capturedAtUTC`, season/week/lastCompletedGame, builtAt/generation, deployed exact SHA/all ordered-source hashes, response checksum, schema and normalizer revision. Preserve original timestamp if later corrections arrive.
2. Validate live/integrity/freshness; explicitly exclude offline/prior-held units. Keep source availability/timestamps, charted/proxy labels, opportunity/game counts and provider selection. New generation alone is not independent football evidence.
3. Store raw/multistage values, full grades, effective prior grades/games, opportunity counts and legally permitted benchmark aggregates with source/date/definition/missingness/direction. No manual state, restricted payload redistribution or hidden pressure substitution.
4. Seal append-only records with SHA-256, 32-team completeness and explicit missingness. Private payloads outside Git. No overwrite with later data. Meaningful independence normally requires another completed week/substantial profile change.
5. After the next game, attach immutable team/game targets: QB EPA/ANYA/success; receiving per-target outcomes; RB rushing/receiving EPA/efficiency; protection disruption; coverage attempt EPA/success; true pressure or separate proxy strata; rush EPA/explosives allowed; qualifying PPD. Outcomes cannot revise the rating at T.
6. Predeclare targets, baselines(current raw metric, prior grade, cumulative benchmark), exclusions and scoring/association measures. Hold out later weeks; cluster uncertainty by team and account for shared game/opponent outcomes. Small early-season samples exploratory. No case-tuned replacement. Any promotion also needs [predictive policy](../../../PREDICTIVE_FEATURE_POLICY_V30.md) full-stack incremental validation and separate owner adoption.

## Owner questions answered

| Question | Bounded answer |
|---|---|
| Q1 WR genuinely clustered? | No under current convention: middle80 46.57, range70.05, SD19.82. Not historical/user-perception proof. |
| Q2 Raw or normalization? | No overall WR compression demonstrated; stabilization IQR ratio .586, raw/historical1.447. No scale fix justified by this capture. |
| Q3 Still too QB-dependent? | Strong descriptive association .756; residualization .950→.790. “Too” requires owner construct/acceptance target; no causal/double-counting conclusion. |
| Q4 RB materially miscalibrated? | No global material room-outcome defect established; specific prior callback mismatch, weak context independence and prior drag found. |
| Q5 Walker/KC? | Walker on KC. Live 90.01/prior 16.64 gives 76.07 rank 3; SEA 24.78 rank 30 with negative room EPA. Unary prior control changes KC only -.1035. |
| Q6 OL coherent/mislabeled? | Pass-protection construct coherent; broad label can overstate scope. Owner label/run-block choice open, no comprehension survey. |
| Q7 Coverage/rush separable? | Archetypes differ, r=.102; no causal independence proof, mixed providers prevent uniform pressure validity. |
| Q8 Clearest defects/leads? | Concrete RB prior call/reference mismatch; WR independence; pressure comparability. Run prior/live constructs and drive asymmetry additional source-traced leads. |
| Q9 Mainly MD-08 scale issue? | None triggered under current compression convention. NONE is conditional, not blanket normalization clearance. |
| Q10 Historical predictive possible? | Exact causal current-policy validation not certified; event data exist and 2026 prefix subset plausible. UNAVAILABLE, no invented results. |
| Q11 Prospective evidence? | Manual source-hashed pregame stages/grades/priors/provider/integrity records, sealed before later next-game targets, chronological/team-clustered evaluation. |
| Q12 Next redesign? | Owner could consider bounded RB prior-call correctness investigation, define WR independence and authorize provider-stratified pressure evidence. No redesign/MD-08 adoption selected. |

## Reproducibility and review surface

Run from repository root, Node v26.7.0 used here:

```text
node research/cycle8/md07_unit_calibration/check.mjs
node --check research/cycle8/md07_unit_calibration/architecture.mjs
node --check research/cycle8/md07_unit_calibration/capture.mjs
node --check research/cycle8/md07_unit_calibration/stats.mjs
node --check research/cycle8/md07_unit_calibration/analyze_current.mjs
node --check research/cycle8/md07_unit_calibration/prior_audit.mjs
node --check research/cycle8/md07_unit_calibration/check.mjs
```

Offline checker validates source/input/result pins, 32 teams, 12 grades, 16 pairs, 33 benchmark comparisons, 15 cases; physical identities, WR/RB residual/stabilizer/alignment/historical maps, QB stabilizers/component/context sums, current rank maps, all blends/composites and all 32 production RB priors. Two complete analysis runs must be byte-identical to each other and six recorded artifacts; the seventh prior-audit artifact is independently reproduced. Twelve negative controls reject omitted residualization, raw/display confusion, swapped keys, offline/stale/prior-held/missing data, NaN, wrong base/public hash. Statistical controls cover ties/sign/missing n/constants/quantiles/singular partials.

`capture.mjs` is an offline one-shot normalizer, not a network collector. Private bootstrap/provenance/published-hash arguments must match raw checksum and all 18 base sources. Observation injection in an isolated VM must leave entire profiles/current ratings equal to unmodified production VM. It refuses existing normalized destination. Frozen results reproduce without private files/network. Raw acquisition cannot be re-audited from redistributed payload because it is intentionally private; provenance/source-input normalization and recorded trace parity are available. New authorized capture would be a separate record.

[Hash manifest](hashes.json) covers scripts, inputs, results and docs. Research files are LF; authoritative offline checks can run in an LF-clean scratch copy of unchanged base plus package. Production tests/build/catalog are unchanged and not required for this research-only scope. Roadmap changes stay within MD-07; 56 unique authoritative IDs/local links/anchors/unrelated governance preserved.

## Validation record — 2026-10-05

PASS in this worktree and in an LF-clean export of the exact base plus package: all six syntax checks; offline source/formula/statistical checks; 12 negative mutations; 32 teams/12 grades/16 pairs/33 complete benchmark comparisons/15 cases; 19 checksum pins; two analysis runs match all six recorded artifacts and separate export processes produce identical validation output; all 32 prior values and the seventh prior-audit result reproduce. All 20 package files use LF. Roadmap/docs validation: 56 unique authoritative IDs, 213 local links and 9 anchors, unchanged roadmap text outside MD-07. Catalog inventory remains 258 entries (146 safe catalog entries, 112 exclusions); production suites not run or modified because the diff is research/documentation only. Staged diff whitespace check passed; production/runtime/model/provider/tests/generated changes zero.

## Remaining decisions and integration risks

Owner acceptance PENDING. Intended unit constructs, acceptable adjacent dependence, OL scope/label, RB prior frame/correction, provider-stratified pressure research/manual capture authorization and any redesign/normalization remain owner decisions. No choice is made here. Independent adversarial review precedes owner acceptance.

Only this research directory and MD-07 roadmap entry change. No runtime research import, formula/provider/test/public/generated/catalog or scheduler change. Parallel roadmap edits may need narrow documentation reconciliation; no production conflict introduced. Snapshot, same-feed comparisons, provider heterogeneity and unavailable certified history limit conclusions. Accepted MD-05 evidence preserved; no MD-06/08/UX-41 change or automatic follow-on authority.
