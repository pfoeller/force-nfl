# MD-08 final-grade history build

**Research/data infrastructure only.** Corrected after Codex review C of `25155a5`.

Owner decisions of 2026-10-07:
- The public historical-standing rating derives from the final canonical grade.
- A deeper historical-reference build is authorized.
- History must use current model semantics.
- Dynamic records are selected in principle.
- Candidate A is provisional.
- Same-length references are required.

Production transform implementation and UX-41 remain NOT AUTHORIZED. MD-08 stays Decision INVESTIGATE, Execution REVIEW, Priority unset, NOT COMPLETE.

- **Branch:** `cycle9/claude-md08-final-grade-history`, from the accepted prototype tip `a1a78101` (base main `6cf05419`).
- **Unchanged:** production code, formulas, priors, stabilizers, weights, grades, the identity seam and `public/`.
- **No data downloads:** no large historical data were downloaded, and none were in the first pass either. Only a read-only release listing was retrieved.

Results:
- [contracts, blockers, stale-assumption log, validator history](results/contracts.json)
- [B1/B2/B3/B4 evidence](results/prior_reproducibility.json)
- [coverage matrix](results/coverage_matrix.json)
- [current reproduction gate](results/current_reproduction.json)
- [dynamic-record mathematics](results/dynamic_record.json)
- [decision package](results/decision_package.json)
- [source listing](results/source_listing.json)
- [contracts and validator](contracts.mjs)

## Headline

No historical population of final canonical grades can be reconstructed under current semantics today. The decisive blocker is **B1**: the season Y−1 legacy source fields behind every unit prior. Nothing found removes the need to recover the legacy profile producer. The other blockers are now stated precisely:

| Blocker | Kind | Exactly what remains |
|---|---|---|
| **B1** Legacy prior source fields | Hard | See **B1 fields** below. |
| **B2** Historical receiver/RB reference populations | Hard, earlier seasons only | **Reproducible for the current reference:** the 2025 ridge betas (WR .5880, RB .3265), the QB centre (.0615) and the 32-team CDFs reproduce all 32 receiver and RB live grades with residual 0. What is missing is the equivalent **season Y−1 populations for earlier Y**, because they need the B1 fields. |
| **B3** Active continuity k | Blocks weeks 2–11 only | See **B3 detail** below. |
| **B4** Pass-rush provider | Hard blocker as-run, policy decision retrospectively | See §3. |
| **B5** Literals | Engineering | `buildProfiles` filters seasons 2026/2025; `qbReferenceValid` requires reference season 2025 and the "2025-player-stats-positional" id label. |
| **B6** 17-game reference | Semantic, span-limiting | The QB EPA/success CDF needs ≥30 17-game windows from season Y−1. The app (`qbReferenceValid`) and server (`_v106_reference_valid`) reject a reference without them. A 16-game season (1999–2020) therefore makes QB unavailable and sends OL to the bundle fallback (B1), so QB and OL need display season ≥ 2022. |

**B1 fields.** These are the season Y−1 fields of the bundle:
- `qb.epaoe`/`epa_per_play` and `qbIndex`
- `ol.rating` (built from `pressure_rate_allowed`, `stuff_rate_allowed` and `avg_opp_dl`)
- `cov.rating`
- `off_epa`
- `receivers.adj_epa`/`targets`
- the RB rush and adjusted fields
- `dl.run_stop_rate`
- `dl.pressure_rate` (pass-rush fallback)

Downstream rank definitions are largely recoverable: coverage/front/receiver/rush indices are midrank percentiles of their source fields within 0.05, and OL/offense within one tie (1.63). `qbIndex` is not a rank of `epaoe` (gap 9.68). The source fields themselves are not recoverable. No producer exists in the repository or its history: Git begins at the V149 import, and the "supplied Celo research bundle" the old research cites is external. No tested field reproduces from public 2025 data (0/32 exact; r .68–.95).

**B3 detail.** k = 1 exactly in week 1 and from week 12 on, so Elo state is not needed there. In weeks 2–11, k is continuous and needs an exact current-semantics Elo chain ending at Y−1. The required state is the end-(Y−1) preseason Elo (regressed 30%), completed results, opponent Elo and config HFA/scale; there is no market input. Substituting the repository Elo history changes week-2 k for **24 teams (max 0.0197653235) with no regime-class change**.

## 1. Source-first contract audit (Phase 1) and stale assumptions

All five unit chains were re-audited against current source; code anchors are in `contracts.json`. These earlier assumptions were stale and have been corrected:

1. **"k comes from V34/V37 and fades to zero by week 7."**
   - Actual: production prefers the V99 rating-continuity layer (`FORCE_RATING_CONTINUITY`).
   - Its fade is 1.0 in weeks 2–3, then .85/.70/.55/.40/.28/.18/.10/.05 through week 11, and 0 from week 12. Week 1 is 0.
   - V37 then maps this to k in [0.25, 1].
2. **"B3 blocks every observation."** Actual: weeks 2–11 only.
3. **"QB prior games floored at 1.00 through four games."** Actual: that floor applies only under the `v104-historical-calibrated` policy. Production runs `v106-current-season-stabilized`, so QB uses the team k.
4. **"Receiver/RB betas and CDFs are not reproducible."** Actual: they are reproducible for the current 2025 reference.
5. **"RB receiving residual is one mixed current+prior component."** Actual: it has two parts, current receiving inputs and a season Y−1 ridge beta. The contract now splits them.
6. **"QB and OL need only season Y−1 play-by-play (QB 2007+, OL 2000+)."** Actual: both need a valid 17-game reference (B6).
7. **"FTN is the first-choice pass-rush provider from 2022."** Actual: FTN is ready only if the feed has a pressure-outcome field (`was_pressure`/`is_qb_pressure`/`is_pressure`/`pressure`). The public 2026 FTN schema has none.
8. **"B4 is a single hard blocker."** Actual: it is split into as-run and retrospective semantics (§3).
9. **"Season literals are confined to `buildProfiles`."** Actual: `qbReferenceValid` also hard-codes the 2025 reference season and id label.

## 2. k behaviour (B3), exact

| As-of week | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V99 fade | 0 | 1 | 1 | .85 | .70 | .55 | .40 | .28 | .18 | .10 | .05 | 0 |
| k | **1 (fixed)** | continuous | … | … | … | … | … | … | … | … | continuous | **1 (fixed)** |
| Needs Elo state | no | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | no |

In the active window, k is 1 only if every recent residual (up to 3 observations, recency 0.6) is within 3 points.

Production-engine experiment (repository Elo substituted for the `data/model-data.js` rankings, embedded completed Week-1 slate):

| As-of week | Teams whose k changes | Max change | Regime-class changes |
|---|---|---|---|
| 2 | 24 | 0.0197653235 | 0 |
| 3 | 24 | 0.0197653235 | 0 |
| 6 | 26 | 0.0109 | 0 |
| 11 | 26 | 0.0010 | 0 |
| 1, 12, 13 | 0 | 0 | 0 |

Classification alone is therefore not enough, because k is continuous. No historical k rule is proposed.

## 3. Pass-rush provider (B4): two replay semantics

**Current cascade** (source):
1. Explicit manual override.
2. FTN play-level. The contract needs a pressure-outcome field and defensive identity, and the team's FTN games must be ≥ its games.
3. StatRankings. The scrape must be fresh and team stats fresh.
4. PFR. Feed readiness needs ≥16 rows and ≥max(8, 20%) advanced rows. A team qualifies only if its weekly QB hits do not exceed its charted pressures, the placeholder pattern is rejected, and its charted games are ≥ its games.
5. nflverse weekly hit+sack disruption, when team stats are usable and dropbacks > 0.
6. Otherwise the prior is held.

How each provider is graded and where the prior comes from:
- **Weekly provider:** current rank among 32.
- **PFR provider:** same-length season Y−1 charted-window CDF.
- **Prior:** season Y−1 PFR composite percentile when ≥20 teams have one, otherwise the B1 bundle field.

The two replay semantics:
- **Historical-as-run** ("what FORCE would have selected then"): **not reconstructible.** Readiness, placeholder states, StatRankings freshness and overrides were never archived. In 2026 Week 4 the selection was 28 weekly and 4 PFR, because live PFR rows were partial.
- **Retrospective current-policy** ("today's cascade on today's files"): **possibly executable; an owner policy decision.**
  - Manual and StatRankings are absent historically.
  - FTN is never ready with the public schema, unless older schemas differ (not verified).
  - PFR readiness would be judged on today's completed rows, so most teams would likely use PFR, unlike live 2026.
  - Per-season component coverage is **not verified**, so no span is claimed.

## 4. Conditional replay spans (corrected)

The earlier span table (OL 2000+, QB 2007+, receivers/RB 2000+, defense 2019+/2023+, common 2019+/2023+) is **withdrawn**. It was inferred from release dates and missed B6, the FTN contract and unverified component coverage.

| Unit | Earliest raw source year | Necessary lower bound for display | Still unresolved | Status |
|---|---|---|---|---|
| QB | 1999 | 2022 (Y−1 must be a 17-game season; B6) | B1 prior; B3 (weeks 2–11); `passing_cpoe` coverage unverified; B5 id literal | **NOT ASSERTABLE** |
| OL | 1999 | 2022 (B6; otherwise bundle fallback) | B1; B3 (weeks 2–11); pbp coverage unverified outside 2024–25 | **NOT ASSERTABLE** |
| Receivers | 1999 | none (needs a season Y−1 reference; B2) | B1, B2, B3 | **NOT ASSERTABLE** |
| RB | 1999 | none | B1, B2, B3 | **NOT ASSERTABLE** |
| Defense | 1999 | none | B1 (coverage, run priors); B4 policy; B3; `passing_cpoe` coverage. The PFR prior branch would need Y−1 ≥ 2018 plus verified coverage | **NOT ASSERTABLE** |
| Common | — | 2022 (necessary only) | B1 for every unit | **NOT ASSERTABLE** |

Every display year needs season Y−1 as burn-in, which is not display-eligible. Weeks 2–11 also need the Elo chain.

## 5. Source coverage wording

The coverage matrix now separates three things for every input:
- **source available:** a release file exists for that season.
- **component coverage verified / not yet verified:** every field the current definition needs is present.
- **semantic compatibility verified / not verified.**

The only coverage verified is:
- the 2024–2025 play-by-play disruption/EPA fields (Cycle 7 fixture)
- the 2025 V149 windows, where the disruption definition matches V149 for 544/544 team-games
- the 2026 weekly, PFR and FTN caches

The FTN cache verifies the *absence* of a pressure field. No span is inferred from release dates.

## 6. Validator (fails before any replay attempt)

Probes that passed the 25155a5 validator at the input layer and were stopped only by the unit's BLOCKED status:

- **Mixed-role probe:** an RB component declared `current+priorSeason` matched neither role branch, so no season, week or prior-year rule ran.
- **Null-week probe:** `throughWeek: null` passed the leakage test, because `null <= asOfWeek` is true in JavaScript.
- **Identity and chronology:** a missing observation team, a null as-of week, or a game count above the as-of week were not checked.

The new `validateShape` rejects all of these before `validatePlan`'s blocker checks, and `replayFinalGrade` throws `MALFORMED PLAN` first. It checks:
- unit and team identity
- season, as-of week and game count, including game count ≤ as-of week
- that each input's role exists and matches the component's role
- an integer week where a week is required
- future leakage
- wrong season or wrong prior year
- the game-count window
- substitutes, duplicates and missing components
- blocked components supplied from a non-authorized source

`validatePlan` also flags B3 for as-of weeks 2–11.

## 7. Current-state reproduction gate (unchanged)

- **qb/OL/receivers:** stored prior + live → production blend (QB: recency and clamp) → identity seam, residual 0 against the snapshot.
- **RB:** post-correction LIVE_FITTED frame, ≤4.9e-7 against the frozen 6-decimal CSV.
- **Defense:** composite recomputed from stored constituents, residual 0.
- **Receiver/RB references:** the 2025 betas, centre and CDFs reproduce all 32 live grades with residual 0.

## 8. Dynamic-record mathematics (Candidate A, previously displayed values)

**Distinct references** (old reference and additions all distinct):
- One new record moves any previous value by at most **100/n**.
- m additions move any previous value by at most **100·m/(n+m−1)**.
- Zero violations in all 178 exhaustive distinct cases.

**Tied references:** those bounds are **false.**
- **Counterexample:** reference [0, 1, 2, 3, 3] plus a new best of 4. The tied best block was forced to 100. In the new reference it becomes an interior midrank block at **70**, a shift of 30, while 100/n = 20.
- Across 50,099 exhaustive small cases (n = 3–6, values 0–4, m = 1–3 additions in −1…5), the old bounds fail 770 times for one record and 5,647 times for batches.

**Tie-aware statement:** shift ≤ **100·(2m+t−1)/(2(n+m−1))**, where t is the size of the larger extreme tied block of the old reference.
- It is derived from the extreme-block mechanism: a forced-endpoint block becomes an interior midrank block.
- It holds with **zero violations** on every exhaustive case and is tight (for example, [0, 0, 1] plus −1: 50 = bound).
- It is **not proven for all n**.

**Contract recommendation:** treat the closed forms as expectations and **measure** the actual movement of published values whenever the reference version changes.

**Synthetic distinct populations** (mechanics only): a single record hits 100/n exactly. A season of 32 moves values by at most 11.5 at n = 64 and 1.7 at n = 320.

**Metadata schema** (unchanged): `transformVersion`, `referenceVersion` (SHA-256 of the canonical population), `unit`, `design`, `gameCount`, `asOf`, `population`, `sourceHistorySpan` and model source hashes.

## 9. Bounded local questions now completed

The first analysis rightly avoided large downloads but stopped early on six local questions. Each is now answered:
- k thresholds and continuous sensitivity (§2)
- tied Candidate A bounds (§8)
- current beta/CDF reproducibility (B2)
- the QB prior-season reference requirement (B6)
- retrospective B4 (§3)
- validator malformed-input probes (§6)

## 10. Revised owner decision package

1. **What remains of B1?** The season Y−1 legacy source fields listed under **B1 fields**. Their downstream rank definitions are largely recoverable; the fields are not.
2. **What remains of B2?** Only historical receiver/RB reference populations for seasons before the committed 2025 reference. The current reference reproduces exactly.
3. **When does B3 matter?** As-of weeks 2–11. k = 1 in week 1 and week 12+.
4. **Is B4 a blocker, a policy decision, or both?** Both: a hard blocker for historical-as-run selection, and an owner policy decision for retrospective current-policy reconstruction (coverage unverified).
5. **Is any span assertable?** No. QB and OL cannot start before 2022 (necessary lower bound only). No unit is assertable while B1 remains.
6. **Valid dynamic-record statements under ties:** the distinct-value bounds hold for distinct references only. The tie-aware form holds on all exhaustive small cases but is not proven generally, so movement should be measured per reference version.
7. **Is the registry complete enough?** Yes, for deciding the next step. It is not a replay engine.
8. **Does anything remove the need for the legacy producer?** No.
9. **Smallest next owner decision:** determine whether the original legacy profile producer and its exact definitions can be supplied or recovered from outside this repository. This is unchanged.

## Reproducibility and checks

```text
node research/cycle9/md08_final_grade_history/check.mjs
node research/cycle9/md08_final_grade_history/analyze.mjs <scratch dir>
```

The checker uses no network: the release listing is committed. It verifies:
- 12 input pins and the accepted prototype's checksums
- that the seam is the identity
- the reproduction gate and the current receiver/RB references
- the bundle non-reproducibility
- the k experiment (24 teams / 0.0197653235 / no class change, and no change in weeks 1, 12 and 13)
- the B4 split and the FTN schema evidence
- the tied-bound counterexample and the exhaustive bound checks
- 17 malformed-plan rejections, including the mixed-role and null-week probes
- the reference-version controls and an altered-pin control
- byte-equal regeneration of six results
- `hashes.json`

The frozen Cycle 9, follow-up and prototype packages and the Cycle 7 fixture are untouched.
