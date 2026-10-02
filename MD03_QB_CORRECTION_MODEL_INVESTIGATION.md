# MD-03 QB-return correction: model investigation

Roadmap item: `MD-03` (league-wide automatic QB-return correction), prerequisite for `UX-19` public removal.
Lane: Cycle 5 model investigation, branch `cycle5/claude-md03-model`, base `bd15a2c682c0dd8c836ecfd42e615a31741988c7`. First version `0a6dcb8` (2026-10-02). **This version corrects it after Codex's independent cross-review (verdict C, findings F1-F9) and Claude's cross-review of the Codex detection lane.**

**Research only.** No production model, rating, data feed, source ingestion, public tool or generated file changed. No candidate is selected and the predictive-feature policy is **not** passed. Event detection and source architecture belong to the Codex lane; free historical files are used here only as research evidence.

Reproduction: [research/md03/README.md](research/md03/README.md). Results: [md03_results.json](research/md03/results/md03_results.json), [classification_migration.json](research/md03/results/classification_migration.json), [v33_original_evidence_audit.json](research/md03/results/v33_original_evidence_audit.json), [celo_prior_harness.json](research/md03/results/celo_prior_harness.json).

## 1. Summary

- **Original V33 evidence:** it reproduces exactly but is thin. It rests on six hand-picked cases (48 games), two cases supply 93% of the gain, and a sign-flip test gives p = 0.16. The measured-damage bound used in production was never part of it.
- **Corrected primary cohort:** 160 medically verified absences (2009-2025, all 32 franchises, 72 QBs, 737 post-return games). On the core-only replay, a damage-bounded correction shows a **suggestive historical signal** of about −0.001 to −0.0015 Brier on post-return games. League-wide that is about −0.0001 to −0.0004.
- **That signal is conditional on the retrospective cohort definition and is population-sensitive:**
  - It is concentrated in offseason returns (B0 −0.0025).
  - It is smaller midseason (B0 −0.0008).
  - On the medically verified episodes whose first missed week carried an Out designation it shrinks to −0.0007 (B0) and about zero (A).
  - On a population built with the Codex prototype's detection rules it is **about zero**: A +0.0005, B0 −0.0002.
- **The 160-episode result must not be read as the effect the eventual production detector would deliver.**
- **No incremental production effect is established.** Every number here compares a corrected and an uncorrected core-only Elo replay. The production FORCE forecast adds the V99 continuity layer (through Week 11), the unit-to-FORCE bridge, the V98 look-behind, a Celo/QB-aware season prior and a week-dependent market blend. The marginal production effect is **UNTESTED**: those layers may attenuate, reinforce or reverse the core-only effect.
- **Candidate B0** (quality-gated damage, training-selected) is a research candidate eligible for further investigation. Production eligibility is not established. B2 (B0 plus a minimum of two missed starts) is post-hoc.
- **No automatic correction remains a valid outcome.** If the owner chooses it, the existing governance path still applies (section 19).

## 2. Baseline

| Check | Result |
| --- | --- |
| Base | `main` = `origin/main` = `bd15a2c`; lane branch `cycle5/claude-md03-model` in worktree `C:\Projects\force-nfl-claude-cycle5` |
| Reviewed first version | `0a6dcb8` (not amended; this correction is a follow-up commit) |
| Inputs read | `FORCE_ROADMAP.md` (MD-03, UX-19), `UX19_QB_RETURN_REMOVAL_PLAN.md`, the V33/carryover research documents, `PREDICTIVE_FEATURE_POLICY_V30.md`, `model/qb_regime.js`, `model/rating_continuity.js`, `model/early_regime.js`, `model/retrospective_strength.js`, `model/unit_force_bridge.js`, `model/forecast_v2.js`, the QB-return parts of `assets/app.js` and `model/live_profiles.js`, `data/qb-carryover.js`, `data/predictive-feature-gates.js`, every script under `research/`, and Codex's `MD03_QB_EVENT_DETECTION_INVESTIGATION.md` at `e32ee2b` |

## 3. Current V33 calculation, reconstructed

| Element | Exact current behaviour | Origin |
| --- | --- | --- |
| A. Eligibility | `preset.autoEligible && verifiedReplacementWindow && expectedStarterReturned && missedStarts > 0`, plus the `qbCarryover` predictive gate. KC/Mahomes is the only preset. | Hand-authored |
| B. Measured surviving damage | `postReversionCarryoverDamage`. KC: 67.6151 × 0.70 = 47.3306, from the Celo equations. Acts only as an upper bound. | Measured once for KC; never part of the evidence study |
| C. 7.5 Elo per missed start | `min(60, 7.5 × missedStarts)` | Picked from the 11-episode / 6-case grid as a point below the in-sample best |
| D. 70% survival | `preset.offseasonSurvivalFraction` (KC 0.7), code default 0.70; mirrors the 30% reversion | Hand-authored per preset, with a structural default |
| E. 60 Elo cap | applied to `7.5 × missed` before survival | Safety bound, never binding in the study |
| F. 4-team-game half-life | `initial × 0.5^(gamesPlayed/4)`, counted on current-season team games | From the same small grid |
| G. Overlay and suppression | Elo correction added to current/future ratings, team pages (own team only) and historical states (`canonicalGameTeamState` calls `QR.correction` directly). Display overlay (`LP.applyQbCarryoverScenario`) is suppressed once the preset QB name matches the profile QB with `playerStatGames`/QB games > 0; the Elo correction continues | V14 display rule, V105 suppression |

Formula: `initial = max(0, min(surviving damage, min(60, 7.5 × missed) × survival))`, `overlay(g) = initial × 0.5^(g/4)`. KC 2026 = +15.75 Elo.

## 4. Original evidence audit

From [v33_original_evidence_audit.py](research/md03/v33_original_evidence_audit.py), which runs the bundled study unchanged.

- **Population:** 11 curated offseason episodes; the gated subset is a hand list of six. No midseason or one-game episodes.
- **Metric:** Weeks 1-8 Brier with a Celo prior and opponents frozen; 48 games.
- **Headline:** reproduced exactly at −0.0098588644, 5 of 6 improved.
- **Concentration:** PIT 2019 supplies 57% of the gain and DAL 2020 36%. Dropping PIT leaves −0.0051.
- **Uncertainty:** episode bootstrap −0.0212 to −0.0001; exact sign-flip p = 0.156.
- **Parameters:** the in-sample best is the grid corner (10 Elo / 16 games); 7.5 / 4 was hand-picked.
- **Selection:** the gate was chosen after seeing declines, on the same 48 games used for scoring. KC is not in the evidence.
- **V33 harness on the corrected cohort:** applied to all 39 medically verified offseason returns, the production rule gives −0.0002 (2009-2019 +0.0010, 2020-2025 −0.0012). The starts-only rule gives +0.0005.

## 5. Corrected cohort and classification (F1)

### 5.1 Rules

[build_cohort.py](research/md03/build_cohort.py) replays FORCE core Elo (K 20, HFA 15, scale 340, production margin multiplier, week-batched, 1/3 reversion before 2021 and 30% after), from 1999 burn-in through 7,276 games (2009-2025 replay Brier 0.2211). Episode rules:

1. **Incumbent:** started ≥4 of the team's last 5 games, counting only starts since the last return or takeover.
2. **Absence:** another QB starts.
3. **Return:**
   - the incumbent starts again in the same season, or opens the next season;
   - if another QB opens the new season, the change is permanent;
   - **new:** if the incumbent had a healthy-but-not-starting week (active on the roster or playing, with no injury listing), or the absence began at a season opener, and one replacement then starts 4 consecutive window games, the replacement **takes over the role** and no return episode exists.
4. **Cause class** (from the absent starter's own records in the window weeks):

| Class | Rule |
| --- | --- |
| VERIFIED_MEDICAL | Out/Doubtful with a medical injury, a documented medical reserve code (`R01` IR, `R48` IR-designated-to-return), or a generic reserve status corroborated by a medical injury listing in the same window; no healthy week |
| PROBABLE_MEDICAL | Medical listing only (Questionable, practice report) or the COVID list (`R59`); no healthy week |
| AMBIGUOUS_CAUSE | No cause evidence, or a generic reserve status (blank, `A01`, `I01`, `I02`, `R04`, `R05`, `R40`, other codes) with no medical listing. An unknown code is not medical evidence |
| NONMEDICAL | Non-injury reason or suspension, with no medical evidence |
| ROLE_CHANGE | A healthy-but-not-starting week, or onset at a season opener. Takes precedence over medical evidence; overlaps are listed as conflicts |

### 5.2 What moved and why

From [classification_migration.json](research/md03/results/classification_migration.json), comparing `0a6dcb8` with this version:

| Movement | Episodes |
| --- | ---: |
| Old VERIFIED kept as VERIFIED_MEDICAL | 152 |
| Old VERIFIED left the primary cohort | 18 |
| … episode no longer exists (role takeover or detector correction) | 9 |
| … generic reserve code only | 5 |
| … healthy-not-starting week | 3 |
| … season-opener onset | 1 |
| Joined the primary cohort | 8 (1 old PROBABLE, 7 newly detected) |
| Old AMBIGUOUS reclassified | 33 → ROLE_CHANGE, 8 → NONMEDICAL, 12 → AMBIGUOUS_CAUSE, 15 no longer exist |
| Old PROBABLE reclassified | 68 → PROBABLE_MEDICAL, 4 → ROLE_CHANGE, 1 → VERIFIED_MEDICAL, 7 no longer exist |

Named cases:
- **CAR 2010 Matt Moore:** ROLE_CHANGE (generic `RES:A01` rows plus a healthy week).
- **CAR 2022 Darnold:** the role was taken over at Week 1, so no Darnold episode exists.
- **MIA 2020 Tua thumb:** now detected (Week 12 to 13, PROBABLE_MEDICAL, Questionable listing).
- **NYG 2017 Manning:** ROLE_CHANGE.
- **TEN 2014 Locker and TEN 2023 Tannehill:** these were the two worst-harm one-game returns, and they are now role takeovers. The rule was written on role evidence, not outcomes, but it does remove harmful cases.

Strictness has a cost. Known injury returns whose only reserve evidence is a generic pre-2020 code with no injury-report line (PIT 2019 Roethlisberger, SF 2018 Garoppolo, GB 2017 Week 16 Rodgers, CIN 2018 Dalton) moved to AMBIGUOUS_CAUSE. There are 9 recorded cause conflicts: 6 medical evidence plus a healthy week, 3 medical evidence plus season-opener onset. All are classed ROLE_CHANGE.

### 5.3 Corrected cohorts

| Cohort | Episodes | Teams | QBs | Eval games | Midseason / offseason | Missed 1 / 2-3 / 4-8 / 9-17 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| VERIFIED_MEDICAL (primary) | 160 | 32 | 72 | 737 | 121 / 39 | 50 / 60 / 42 / 8 |
| + PROBABLE_MEDICAL | 233 | | | 1,024 | | |
| + AMBIGUOUS_CAUSE (broad returns) | 250 | | | 1,098 | | |
| ROLE_CHANGE (control) | 48 | | | | | |
| NONMEDICAL (control) | 8 | | | | | |

The cohort also records 155 role takeovers and 80 no-return events (2009-2025). Splits for the primary cohort: discovery 57 episodes, validation 29, held-out 74.

## 6. Study design

- **Splits:** by return season, discovery 2009-2015, validation 2016-2019, held-out 2020-2025. Parameters are chosen on 2009-2019 and scored once on the held-out seasons. Leave-one-season-out is reported.
- **Outcome:** unique-game Brier on post-return games (return game plus up to 7, same season, ending if the starter leaves again), every game scored once with all overlays. Log loss is reported alongside.
- **Comparator:** the replayed core Elo without correction. **This is not the production FORCE forecast.**
- **Predeclared family:** NULL, V33 literal, V33 starts-only, DAMAGE (f ∈ {0.25, 0.5, 0.75, 1}, half-life ∈ {return game only, 2, 4, 8}), DAMAGE with a replacement-quality gate, DAMAGE with a dropback half-life.
- **Post-hoc probes, labelled as such:** B2, the completeness gate, the 16-game half-life and activation after the return start.
- **Held-out caveat:** the held-out seasons were seen in the first version. This correction changes cohort definitions for validity reasons, but it is not a pristine untouched evaluation.

## 7. Candidates A, B0 and B2 (F3)

| Candidate | Definition | Status |
| --- | --- | --- |
| A, V33-generalized | `min(surviving damage, min(60, 7.5 × missed) × s)`; s = 1 midseason, reversion survival offseason; 4-game half-life | Fixed V33 parameters, chosen on overlapping 2008-2024 episodes |
| **B0**, quality-gated damage | `min(60 × s, 0.5 × surviving damage)` if the replacement's EPA/play was below the starter's previous level, else 0; 8-game half-life | **As scored.** Selected on 2009-2019 inside the predeclared family (first version chose 0.75; the corrected cohort chooses 0.5) |
| **B2**, B0 + minimum two missed starts | B0, zero for one-game absences | **POST-HOC / exploratory.** No untouched validation path |

Post-return Brier change (negative is better):

| | 2009-15 | 2016-19 | 2020-25 held-out | All 2009-25 | Improved / worsened (all) |
| --- | --- | --- | --- | --- | --- |
| A | −0.0008 | +0.0003 | −0.0015 | −0.0009 | 68 / 56 |
| B0 | −0.0015 | −0.0001 | −0.0018 | −0.0014 | 61 / 47 |
| B2 (post-hoc) | −0.0013 | −0.0007 | −0.0019 | −0.0015 | 46 / 29 |
| V33 starts-only | −0.0016 | +0.0011 | −0.0022 | −0.0013 | |

Subgroups (all years, then held-out):

| Subgroup | A | B0 | B2 (post-hoc) |
| --- | --- | --- | --- |
| Midseason (121) | −0.0005 / −0.0010 | −0.0008 / −0.0011 | −0.0010 / −0.0013 |
| Offseason (39) | −0.0017 / −0.0023 | −0.0025 / −0.0029 | −0.0024 / −0.0028 |
| One missed start (50) | −0.0001 / +0.0002 | +0.0003 / +0.0003 | 0 / 0 |
| 4-8 missed (42) | −0.0017 / −0.0040 | −0.0027 / −0.0044 | same as B0 |
| Replacement much worse (83) | −0.0020 / −0.0028 | −0.0023 / −0.0032 | −0.0025 / −0.0033 |
| Replacement similar or better (40) | +0.0005 / +0.0003 | 0 (gated) | 0 |
| No measured damage (47) | 0 | 0 | 0 |

Medians are zero for every candidate. The top three episodes supply 47% (A), 38% (B0) and 34% (B2) of the net gain. The worst single episodes are GB 2017 (A, +0.070) and the GB 2025 playoff return (B0 and B2, +0.057).

## 8. Uncertainty (F5)

The headline estimand is unique-game Brier. The bootstrap now matches it: each unique game is owned by the first episode (by id) whose window holds it, and owners are resampled by episode, team, QB or return season. The resampled statistic is the unique-game mean, so the point estimate equals the headline. The first version's episode-weighted bootstrap counted overlapping games twice; it is kept only as a labelled legacy estimand.

95% intervals and share of resamples above zero:

| | Episode clusters | Team | QB | Season (few clusters) |
| --- | --- | --- | --- | --- |
| A, all | −0.0020 to +0.0003 (6.6%) | −0.0019 to +0.0002 | −0.0019 to +0.0002 | −0.0019 to −0.0000 |
| A, held-out | −0.0035 to +0.0004 (5.4%) | −0.0031 to +0.0002 | −0.0032 to +0.0002 | 6 clusters |
| B0, all | −0.0026 to −0.0002 (1.2%) | −0.0025 to −0.0003 | −0.0024 to −0.0003 | −0.0026 to −0.0003 |
| B0, held-out | −0.0038 to −0.0001 (2.2%) | −0.0036 to −0.0001 | −0.0036 to +0.00003 | 6 clusters |
| B2, all (post-hoc) | −0.0026 to −0.0004 | −0.0026 to −0.0003 | −0.0026 to −0.0003 | |

What these intervals do **not** include:
- **Episode dependence:** windows overlap and teams recur.
- **Team/QB dependence:** only partly captured by clustering.
- **Season dependence:** six held-out seasons are too few for a reliable season-cluster interval.
- **Candidate-selection uncertainty:** the top five quality-gated grid points sit within 0.00027 of the training optimum, and leave-one-season-out picks f 0.5 or 0.75 with h 8 in roughly equal measure.
- **The cohort-definition revision made in this correction.**

**No conventional statistical significance is claimed.** B0's intervals are mostly below zero; A's are not.

## 9. Magnitude, cap, survival and timing

- **Magnitude:** a damage fraction of 0.5-0.75 sits at the training optimum in all three DAMAGE families. Starts-only scores similarly in aggregate but fires without measured damage and hurts in the 2016-2019 split (+0.0011) and on no-absence placebo windows of six games (+0.0009). The damage bound is what keeps no-damage windows at zero.
- **Cap:** 60 and 90 (or none) are equivalent; 30 is weaker. 60 is a safety bound, not a fitted value.
- **Survival:** with the same fraction, offseason survival 1.0 scores better than 0.7 and 0.5 (training −0.0029 versus −0.0022). The 70% factor is not supported as a separate parameter.
- **Offseason versus midseason:**
  - Offseason returns carry more signal (B0 −0.0025, 39 episodes).
  - Midseason is weaker (−0.0008, 121 episodes).
  - A separately fitted midseason rule hurt on the held-out seasons (+0.0002 versus −0.0008 unified).
  - No separate midseason rule is supported.
  - If a correction is retained, MD-03 must still be able to detect and support midseason cases, but the corrected detector and eligibility rules may well give zero for many of them.

## 10. Decay (corrected interpretation)

Paired unique-game differences on the training-selected magnitude (f 0.5); negative favours the slower decay:

| Comparison | All 2009-25 (episode clusters) | Held-out (episode clusters) |
| --- | --- | --- |
| Return game only vs 4 games | −0.0005 (−0.0014 to +0.0003) | −0.0011 (−0.0026 to +0.0002) |
| 2 vs 4 | −0.0002 (−0.0005 to +0.0001) | −0.0002 (−0.0007 to +0.0003) |
| 4 vs 8 | −0.0002 (−0.0004 to +0.0001) | −0.0001 (−0.0004 to +0.0003) |
| 8 vs 16 (16 is exploratory) | −0.0001 (−0.0003 to +0.0001) | −0.0000 (−0.0003 to +0.0003) |

- Immediate or very fast decay is weaker.
- Half-lives of 4, 8 and 16 games lie in a broad slower-decay region whose differences are not distinguishable.
- **Eight is not established**, and the final decay choice stays unresolved.
- Dropback decay (280) performs like an 8-game half-life.

## 11. Overlay, bridge and disclosure semantics (F8)

| Component | What it is | Forecast effect today |
| --- | --- | --- |
| A. Elo/team correction | `effectiveQbCorrection` added to the team rating | Direct, through the Elo-to-probability map |
| B. Canonical measured QB unit | The live QB profile for the season-volume leader | Indirect: QB 12% and scoring-per-drive 20% of the unit-to-FORCE bridge (±7.5 FORCE-point cap) |
| C. Display-only scenario overlay | `LP.applyQbCarryoverScenario` back-solves offense/QB unit values from A | **No direct additive registry weight**; display only |
| D. Bridge forecast influence | Live units minus the preseason prior, built from the team's 2025 QB room | Changes forecasts whenever B differs from the prior |
| E. Disclosure | Team chip, matchup note, unit notes | None |

- **Suppression does not remove overlap.** Turning off C hides the display overlay only; A and D can both still lift the team for the same returning QB.
- **"Current-season QB data exist" can mean pre-injury games.** `suppressQbUnitScenarioOverlay` checks for any games or `playerStatGames` for the named QB, so it can fire before any post-return measurement exists.
- **Recommended semantics, not implemented:**
  - Keep C off when B reflects post-return measurement.
  - Treat the A/D overlap as a modelling question for full-stack validation.
  - Make every disclosure (E) follow A.

No UI change was made.

## 12. Production stack and full-stack requirement (F4)

The replay omits these production layers:

| Layer | Current behaviour | Possible interaction with a return correction |
| --- | --- | --- |
| V99 continuity (`model/rating_continuity.js`, used through `regimeCorrectionElo`) | Week-2 entry signal, then continuous updates; fade 1.0 in Weeks 2-3, 0.85, 0.70, 0.55, 0.40, 0.28, 0.18, 0.10, 0.05 through **Week 11**, zero from Week 12; cap 7 points (about 159 Elo) | Residuals are measured against the core baseline without the QB correction, so a returning team that beats core gets both adjustments; or V99 may already restore much of it |
| Unit-to-FORCE bridge | Live units minus the 2025-room prior | See section 11 (D) |
| Celo/QB-aware season prior | The offseason starting rating comes from Celo, which priced backup starts | Recorded damage is smaller (KC 67.6 versus 75.8 in the replay) |
| V98 look-behind | Revisits credit from completed games using opponents' later results (≤5 Elo per game, ≤24 per team) | Partly offsets damage that came from strong opponents |
| Market blend (`model/forecast_v2.js`, smart mode) | Market weight 0.75 in Week 1, then 0.50, 0.25, 0.15, 0.10, and 0.05 from Week 6 | Offseason returns, where the signal concentrates, start in the weeks where the market dominates |

Historical stored forecasts (`gameHistory`) include core plus V99, not the QB correction; `canonicalGameTeamState` adds it for display.

**The marginal production effect is UNTESTED.** These layers may attenuate, reinforce or reverse the core-only effect. Nothing here is an upper bound.

**Full-stack validation is a technical evidence requirement, not an owner vote.** Before any candidate can be accepted for production, it must be evaluated with all of the following against the real incumbent FORCE forecast:
- the eventual production detector;
- actual activation timing;
- the exact selected contract;
- the canonical unit bridge;
- the V99 continuity layer;
- the production prior;
- the market blend;
- opponent/look-behind behaviour.

This does not authorize implementation.

## 13. Detector-restricted population sensitivity

Post-return Brier change for each candidate, then with activation delayed until after the completed return start:

| Population | Episodes | A | B0 | B2 (post-hoc) | A, after return start | B0, after return start |
| --- | ---: | --- | --- | --- | --- | --- |
| Corrected VERIFIED_MEDICAL | 160 | −0.0009 | −0.0014 | −0.0015 | −0.0004 | −0.0008 |
| … onset week Out (stricter) | 108 | −0.0000 | −0.0007 | −0.0010 | +0.0003 | −0.0002 |
| … midseason only | 121 | −0.0005 | −0.0008 | −0.0010 | +0.0000 | −0.0003 |
| … offseason only | 39 | −0.0017 | −0.0025 | −0.0024 | −0.0013 | −0.0019 |
| VERIFIED or PROBABLE | 233 | −0.0007 | −0.0011 | −0.0011 | −0.0003 | −0.0006 |
| Broad (+ AMBIGUOUS_CAUSE) | 250 | −0.0010 | −0.0013 | −0.0013 | −0.0005 | −0.0007 |
| **Detector-like, injury-aware** | 79 | **+0.0005** | **−0.0002** | −0.0004 | +0.0007 | +0.0001 |
| Detector-like, injury-aware, 2020-25 | 34 | +0.0008 | −0.0003 | −0.0006 | +0.0005 | −0.0005 |
| Detector-like, participation-only | 212 | −0.0002 | −0.0003 | −0.0004 | −0.0000 | −0.0002 |

**The detector-like population** emulates the Codex prototype rules at `e32ee2b`: season-scoped, REG games only, two-start tenure, a single Out row in the onset week, and same-season return. Of its 79 episodes, 64 are VERIFIED_MEDICAL in the primary ledger, 1 is ROLE_CHANGE and 14 are outside it. It cannot represent the 39 offseason returns, and 96 primary episodes are not detector injury-aware.

**On the stricter, production-like populations the benefit is near zero.** It also shrinks when activation waits for a completed return start, which is the earliest point the Codex lane considers verifiable.

## 14. Replacement performance, one-game absences and the quality gate

- **Replacement performance:** see the subgroups in section 7. Benefit comes from clearly worse replacements; similar or better replacements give about zero (A) or are gated out (B0).
- **One-game absences:** about zero or slight harm. The post-hoc minimum-two rule gives B0 −0.0011 versus −0.0010 on training seasons and −0.0019 versus −0.0018 held-out. Requiring three is worse. Treat it as exploratory.
- **The quality gate is an unresolved contract parameter.** Its weak edges:
  - the returning starter's previous 16 games, with only 100 plays minimum (8 episodes have fewer than 200);
  - effectively one replacement play minimum (52 episodes have fewer than 50);
  - no opponent adjustment;
  - missing EPA values were previously read as zero. They are now recorded; there are none in this cohort.
- **Completeness rule:** an explicit rule (no missing rows, ≥200 starter plays, ≥50 replacement plays; insufficient evidence means zero) gives B0 −0.0011 on training and −0.0018 held-out. It is labelled **EXPLORATORY**. Any future thresholds need leakage-safe validation.

## 15. Injury scope (unresolved)

| Population | Episodes | A | B0 |
| --- | ---: | --- | --- |
| VERIFIED_MEDICAL | 160 | −0.0009 | −0.0014 |
| PROBABLE_MEDICAL only | 73 | −0.0001 | −0.0004 |
| AMBIGUOUS_CAUSE only | 17 | −0.0055 | −0.0043 |
| ROLE_CHANGE only | 48 | +0.0003 | +0.0008 |
| NONMEDICAL only | 8 | −0.0002 | −0.0007 |

- Corrections hurt on role changes.
- Ambiguous-cause returns show signal, but only 17 episodes.
- The detector-like false positives in Codex's sample are benchings.
- The first version's cohort carried medical-classification contamination.

**SCOPE UNRESOLVED.** Strict medical, probable medical and broader established-starter-return scopes are all presented for a later owner decision.

## 16. Repeated episodes and negative controls

**Repeated episodes.** In 66 primary episodes the starter left again inside the window. Continuing the old correction over those games hurt (A +0.0010, B0 +0.0016). Supported conclusions:
- the old correction ends when the starter leaves again;
- the next return starts a fresh episode and window;
- there is no stacking.

This is supported by the tested continue-the-old-overlay comparison only, not by every possible stacking policy.

**Negative controls.**
- **No-absence placebo** (2,374 windows): damage-bounded rules −0.0001, starts-only +0.0003. The primary episodes scored the same way give −0.0012. This is consistent with the signal being tied to the replacement period, but the placebo does not prove or exclude generic rating regression.
- **ROLE_CHANGE and NONMEDICAL:** see section 15.
- **Permanent changes:** structurally zero, because there is no return.

## 17. Forecast impact

| Candidate | Active / total | Mean / median initial Elo | Return-game win-prob shift | Mean / max expected-win shift | Post-return Brier | League-wide Brier |
| --- | --- | --- | --- | --- | --- | --- |
| A, all | 113 / 160 | 16.8 / 15.0 | 2.3 pts | 0.05 / 0.32 | −0.0009 | −0.00015 |
| A, held-out | 53 / 74 | 17.5 / 15.0 | 2.4 pts | 0.06 / 0.32 | −0.0015 | −0.00030 |
| B0, all | 91 / 160 | 17.3 / 15.2 | 2.4 pts | 0.06 / 0.37 | −0.0014 | −0.00022 |
| B0, held-out | 43 / 74 | 18.4 / 17.9 | 2.5 pts | 0.06 / 0.37 | −0.0018 | −0.00036 |
| B2, all (post-hoc) | 63 / 160 | 20.7 / 19.3 | 2.8 pts | 0.05 / 0.37 | −0.0015 | −0.00023 |

KC scale check: V33 +15.75. B0 would give +26.5 on the replay's damage if its gate opened; this depends on the damage source.

## 18. Predictive-feature policy (F2)

Candidate B0 has **not** passed the policy. It is a research candidate eligible for further investigation.

| Gate ([policy](PREDICTIVE_FEATURE_POLICY_V30.md)) | A | B0 | B2 |
| --- | --- | --- | --- |
| 1. Inputs strictly pregame | UNCERTAIN: research labels use whole-window and retrospective roster evidence; prospective detector/source timing unresolved | UNCERTAIN (same) | UNCERTAIN (same) |
| 2. Selection without the scored games | FAIL: V33 parameters were chosen on overlapping episodes | UNCERTAIN: selected on 2009-2019 within the family, but the held-out seasons were seen before this cohort correction | FAIL: post-hoc |
| 3. No worse than the incumbent | UNCERTAIN: the incumbent is the production FORCE forecast; only the core-only replay was compared | UNCERTAIN | UNCERTAIN |
| 4. Benchmark artifact records baseline, candidate, delta, window and caveats | PASS for the research artifact; no production benchmark exists | PASS (research) | PASS (research) |

Production eligibility is not established. Still missing:
- the incumbent full-stack comparison;
- prospective detector and source timing;
- the B0 contract's own unvalidated pieces (quality-gate thresholds, decay choice, minimum absence, cause scope).

## 19. Candidate contracts (none selected) and the null option

| | Null | A | B0 | B2 (post-hoc) |
| --- | --- | --- | --- | --- |
| Magnitude | 0 | `min(dmg, 7.5·missed·s)` | `0.5 × surviving damage` | as B0 |
| Cap | none | 60·s | 60·s | 60·s |
| Timing | n/a | s = 1 midseason / reversion survival offseason | same | same |
| Decay | n/a | 4 team games | 8 team games (broad 4-16 region; unresolved) | as B0 |
| Zero conditions | always | no damage; no verified return; role change | plus replacement not worse; insufficient evidence (rule unresolved) | plus one-game absence |
| Repeated | n/a | ends when the starter leaves; fresh window | same | same |
| Overlay | n/a | display off after post-return measurement; disclosures follow Elo | same | same |

**Null and UX-19 governance (F7).** Choosing Null would **not** automatically satisfy UX-19's existing MD-03 prerequisite. It would need:
- an explicit owner revision or acceptance of the prerequisite path;
- removing or disabling the current automatic correction, which is itself a separately authorized model change requiring validation;
- separate authorization for UX-19 public removal.

This document does not rewrite Cycle 4 governance.

## 20. Limitations

- **Core-only replay:** the production layers in section 12 are absent, so the production effect is untested.
- **Retrospective labels:** cause classes and role takeovers use window-wide and roster evidence. Roster codes before 2020 are often blank or generic, so strict rules exclude some real injuries.
- **Detection:** results depend on the detector. The detector-like emulation cannot use Codex's documented role/transaction evidence or official-starter adjudication.
- **Sample size:** 160 episodes and 737 games for an effect of about 0.001 Brier. Median episode effects are zero, and intervals omit selection and definition uncertainty.
- **Quality gap:** coarse, not opponent-adjusted, with thin replacement samples.
- **Held-out reuse:** the held-out seasons were inspected before this correction.
- **Data rights:** the committed ledgers hold derived nflverse facts (nflverse-data CC BY 4.0; `nflverse/nfldata` has no license file).

## 21. Owner decisions needed (later, on corrected evidence)

1. Keep a correction, or Null (with the section 19 governance path).
2. If kept, A, B0 or a successor, after full-stack validation.
3. Injury scope: strict medical, probable or broader.
4. Minimum absence, return verification, activation delay and decay range.
5. Whether cross-season starter continuity is a required detector capability. Offseason returns carry the signal and are outside the Codex prototype.
6. Ledger storage and attribution.

## 22. Recommended next step

Combine this corrected evidence with the Codex detection lane into one cross-lane question set for the owner. Then define a full-stack historical evaluation harness that replays production FORCE layers with candidate overlays, as a separately authorized research step. UX-19 stays blocked.
