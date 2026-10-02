# MD-03 QB-return correction: model investigation

Roadmap item: `MD-03` (league-wide automatic QB-return correction). Prerequisite for `UX-19` public removal.
Lane: Cycle 5 model-generalization investigation, branch `cycle5/claude-md03-model` from exact `main = origin/main = bd15a2c682c0dd8c836ecfd42e615a31741988c7`. Prepared 2026-10-02.

**Research only.** No production model, rating, data feed, source ingestion, public tool or generated file changed. No candidate is selected for production. Event detection and source architecture belong to the parallel Codex lane; this document uses free historical data only to build model evidence and does not recommend a production source.

Reproduction: [research/md03/README.md](research/md03/README.md). Machine-readable results: [md03_results.json](research/md03/results/md03_results.json), [v33_original_evidence_audit.json](research/md03/results/v33_original_evidence_audit.json), [celo_prior_harness.json](research/md03/results/celo_prior_harness.json). Episode ledger: [episode_ledger.json](research/md03/data/episode_ledger.json).

## 1. Summary

- The V33 rule's headline evidence (Weeks 1-8 Brier −0.0099, 5 of 6 episodes) reproduces exactly, but it rests on 48 games, two episodes supply 93% of the gain, the best setting sits on the grid edge, and an exact sign-flip test gives p = 0.16. The "measured surviving damage" bound that production uses was never part of that test.
- On a larger, rule-built cohort (170 injury-verified absences, 2009-2025, all 32 franchises, 74 quarterbacks, 782 post-return games), a damage-bounded correction still helps, but about **5-10 times less** than V33 claimed: roughly **−0.001 to −0.002 Brier on post-return games** and **about −0.0002 to −0.0004 on all league games**. Every season split improves slightly; the episode-bootstrap interval for the held-out seasons includes zero.
- The benefit is concentrated where it should be: offseason returns, 4+ missed games, replacements who were clearly worse, and windows where the team actually lost rating. It is about zero for one-game absences, for similar-or-better replacements and for absences with no measured damage.
- A no-absence placebo (2,374 windows) shows essentially no effect, so the result is tied to the replacement-QB regime, not a generic reversal of losing streaks. Possible benchings (no injury evidence) benefit just as much, so the predictive signal is not injury-specific.
- Structure that generalizes: damage-bounded magnitude, zero when no damage, a slower decay than V33 (8 team games beat 4), replace (not stack) on repeated absences. Structure that does not: the 7.5-per-start term without the damage bound, a separate midseason fit, immediate suppression of the Elo correction once the starter plays, and a 70% factor treated as a separate parameter.
- **No automatic correction remains a valid outcome.** The evidence supports a small, conservative league-wide rule if the owner wants to keep the feature; it does not show a large forecast gain, and the historical replay cannot reproduce three production layers that may already capture part of the effect (section 14).

## 2. Baseline

| Check | Result |
| --- | --- |
| `main`, `origin/main` | both `bd15a2c682c0dd8c836ecfd42e615a31741988c7` after `git fetch origin main` |
| Worktree | `C:\Projects\force-nfl-claude-cycle5`, branch `cycle5/claude-md03-model` created from that exact SHA |
| Main checkout | untouched; Codex's `cycle5/codex-md03-data` worktree untouched |
| Read in full | `FORCE_ROADMAP.md` (MD-03, UX-19), `UX19_QB_RETURN_REMOVAL_PLAN.md`, `QB_REGIME_RESEARCH_V33.md`, `QB_CARRYOVER_RESEARCH.md`, `QB_CARRYOVER_RESEARCH_V8.md`, `PREDICTIVE_FEATURE_POLICY_V30.md`, `model/qb_regime.js`, the QB-return parts of `model/live_profiles.js` and `assets/app.js`, `data/qb-carryover.js`, `data/predictive-feature-gates.js`, `model/unit_force_bridge.js`, `model/early_regime.js`, every script under `research/`, and the V33/V45/V69/V149 test assertions listed in the UX-19 plan |

## 3. Current V33 calculation, reconstructed

Source: `model/qb_regime.js`, `data/qb-carryover.js`, `assets/app.js:1221-1288`, `1922-1938`, `1973-2031`.

| Element | Exact current behaviour | Origin |
| --- | --- | --- |
| A. Eligibility | `preset.autoEligible && verifiedReplacementWindow && expectedStarterReturned && missedStarts > 0`, and the `qbCarryover` predictive gate. Presets are hand-authored; KC/Mahomes is the only one. No data-driven detection exists. | Hand-selected |
| B. Measured surviving damage | `postReversionCarryoverDamage` = raw Elo lost in the replacement window × offseason survival. KC: 67.6151 × 0.70 = 47.3306, computed once from the Celo update equations and stored in the preset. Only an upper bound in the formula. | Measured for KC only; **never part of the evidence study** |
| C. 7.5 Elo per missed start | `min(60, 7.5 × missedStarts)` | Chosen from the 11-episode / 6-case decay grid (`research/qb_carryover_decay.py`), as a conservative point below the in-sample best |
| D. 70% offseason survival | `× preset.offseasonSurvivalFraction ?? 0.70`; equals 1 − the 30% production offseason reversion | Structural (mirrors the reversion), applied to the starts term too |
| E. 60 Elo cap | applied to `7.5 × missed` before survival | Safety bound; first proposed in V8 as a grid value (40/60/80), never tested as binding |
| F. 4-team-game half-life | `initial × 0.5^(gamesPlayed/4)`; `gamesPlayed` = the team's completed games this season (current paths) or before the target week (historical paths) | From the same small grid; an 8- and 16-game half-life did better in-sample |
| G. Overlay and suppression | The Elo correction is added to current/future ratings (`ratingsWithActiveQBCarryover`), team pages (`ratingsWithQBCarryover`, own team only) and historical states (`canonicalGameTeamState`, calling `QR.correction` directly). It is never fed back into core Elo updates. Separately, `LP.applyQbCarryoverScenario` raises the displayed offense outcome and QB unit to match the FORCE-score change, but `suppressQbUnitScenarioOverlay` turns that display overlay off once the preset QB has current-season player stats. The Elo correction continues regardless. | V14 display rule, V105 suppression |
| Manual override | A QB Return Lab value replaces, not adds to, the automatic value (`effectiveQbCorrection`) | Product rule |

Formula: `initial = max(0, min(surviving damage, min(60, 7.5 × missed) × survival))`; `overlay(g) = initial × 0.5^(g/4)`, dropped below 0.05 Elo. KC 2026: `min(47.33, 22.5 × 0.70) = 15.75` Elo, so the starts term binds and the measured-damage bound does not.

## 4. Original evidence audit

[research/md03/v33_original_evidence_audit.py](research/md03/v33_original_evidence_audit.py) re-runs the bundled study unchanged.

| Question | Finding |
| --- | --- |
| Episode count | 11 curated episodes (2008-2024), all offseason returns, 4-15 missed starts. No midseason episode and no one-game absence exists in the original evidence. |
| Gated subset | 6 episodes: HOU 2017, PIT 2019, DAL 2020, SF 2020, BAL 2021, LAC 2023. The "clear decline" gate is not defined in code; membership is a hand list. |
| Metric and baseline | Weeks 1-8 Brier of the injured team's next-season games; baseline is the same harness with no restore. Celo season-end Elo prior, opponents frozen at their own reverted priors. 8 games × 6 episodes = 48 games. |
| 5-of-6 claim | Reproduced exactly: 0.2316760387 → 0.2218171743 (−0.0098588644), 5 of 6 improved. |
| Concentration | PIT 2019 supplies 57% and DAL 2020 36% of the net gain. Dropping PIT leaves −0.0051. |
| Significance | Episode bootstrap 95% interval −0.0212 to −0.0001; exact sign-flip test on the six episode deltas p = 0.156. |
| Parameter selection | In-sample best is 10 Elo / 16-game half-life, the corner of the grid; leave-one-episode-out also always picks that corner. 7.5 / 4 is a hand-chosen interior point, not a fitted value. |
| Production pieces never tested | The measured-damage bound, the 60 cap (never binds in the study), midseason use (survival = 1), repeated episodes. |
| Leakage / hindsight | The six were chosen after seeing that they "declined", from the same small set used to score them; parameters were tuned on the same 48 games. Not leakage of future data into a pregame forecast, but selection on the evaluation sample. |
| KC influence | KC/Mahomes is not in the evidence; it is only the application. Its preset damage was computed after the fact from Celo equations. |

The V33 harness applied unchanged to all 44 injury-verified offseason returns in the new cohort ([celo_prior_harness.py](research/md03/celo_prior_harness.py)) gives −0.0006 for the production rule (21 better, 13 worse; 2009-2019 +0.0004, 2020-2025 −0.0017) and +0.0008 for the starts-only rule. The original −0.0099 does not reproduce outside the hand-picked six. The original episodes still mostly improve in the new replay (PIT, DAL, HOU, BAL, LAC), so the problem is selection, not arithmetic.

## 5. Expanded historical cohort

Built by [build_cohort.py](research/md03/build_cohort.py) from free nflverse files (per-game starting QB IDs in `games.csv`, weekly QB stats, weekly injury reports 2009+, weekly roster status 2009+). All 34 input files are SHA-256 pinned in [input_manifest.json](research/md03/data/input_manifest.json). These files are used as historical evidence only; nothing here selects them as a production source.

**Rating engine.** A replay of the live FORCE core engine (`seasonEngine`): result-only Elo, K 20, HFA 15, scale 340, the production margin multiplier, week-batched updates, 1/3 offseason reversion before 2021 and 30% from 2021, 1999 burn-in, 7,276 games. Its 2009-2025 Brier is 0.2211 (Celo archive 2008-2025: 0.2198). Its KC 2025 Weeks 16-18 damage is 75.8 Elo raw versus Celo's 67.6, as expected for an engine without a backup-QB pregame adjustment.

**Inclusion rules (fixed before scoring).**
1. Incumbent: a QB who started at least 4 of the team's last 5 games, counting only starts since the incumbent's last return.
2. Absence: the incumbent does not start. Return: the incumbent starts again for the same team, in the same season (midseason) or in the next season's opener (offseason). If another QB opens the next season, the change is a permanent change, not a return.
3. Missed starts = team games in the window, so byes never count.
4. Evaluation games: the return game plus up to 7 more in the same season, stopping when the returned starter stops starting (the next absence is its own episode).
5. Return seasons 2009-2025; 2026 (the KC application season) is excluded.
6. Availability class from the absent starter's own records in the window weeks: **VERIFIED** = Out/Doubtful on the injury report or on a reserve list (IR and similar); **PROBABLE** = listed on the report or practice report only, or on the COVID list; **AMBIGUOUS** = no injury evidence, a non-injury reason ("not injury related", personal) or a suspension.
7. Primary cohort: VERIFIED, 1-17 missed starts. PROBABLE and AMBIGUOUS are sensitivity and negative-control cohorts.

No episode was included or excluded based on whether a correction helped.

| Cohort | Episodes | Teams | QBs | Eval games | Midseason / offseason | Missed 1 / 2-3 / 4-8 / 9-17 |
| --- | --- | --- | --- | --- | --- | --- |
| VERIFIED (primary) | 170 | 32 | 74 | 782 | 126 / 44 | 49 / 60 / 49 / 12 |
| VERIFIED + PROBABLE | 250 | 32 | 94 | 1,092 | 196 / 54 | 103 / 78 / 56 / 13 |
| All detected | 318 | 32 | 105 | 1,262 | 259 / 59 | 139 / 90 / 73 / 16 |
| AMBIGUOUS only | 68 | 30 | 47 | 200 | 63 / 5 | 36 / 12 / 17 / 3 |

The verified cohort includes 30 repeat absences within 3 games of a previous return, 49 absences with no measured damage, and replacements across the range (quality gap in EPA per play, starter's previous 16 games versus replacement window: 39 similar or better, 37 slightly worse, 93 much worse). There were 206 permanent-change events (no return) in 2009-2025.

**Detection sensitivity (recorded, not hidden).** A first version of the detector kept a window open when a new starter took over and the previous starter later "returned" (for example SF 2017-2020). Fixing it with rule 2 recovered missed true episodes and removed false ones, and moved the 2016-2019 result for the production rule from +0.0028 (harm) to −0.0004. Model conclusions are therefore sensitive to detection quality, which matters for the Codex lane.

## 6. Held-out study design

- **Splits by return season:** discovery 2009-2015 (59 episodes), validation 2016-2019 (33), held-out 2020-2025 (78). Parameters are chosen on discovery, checked on validation, then re-chosen on 2009-2019 and scored once on 2020-2025. Leave-one-season-out is reported for the main family.
- **Outcome:** Brier score of the pregame win probability on post-return games, each game scored once with all active corrections; log loss alongside. League-wide dilution, expected-win shift and per-episode distribution (median, worst, top-3 share) are reported.
- **Semantics:** the correction is a forecast overlay on the replayed core Elo, exactly as production adds it; it never feeds Elo updates.
- **Predeclared candidates:** NULL; V33 literal (production rule, survival 1 midseason); V33 starts-only (no damage bound); DAMAGE `min(60·s, f · surviving damage)` with f ∈ {0.25, 0.5, 0.75, 1.0} and half-life ∈ {return game only, 2, 4, 8}; DAMAGE with a replacement-quality gate (zero unless the replacement's EPA/play was below the starter's previous level); DAMAGE with a returning-QB dropback half-life ∈ {70, 140, 280}. Fixed probes for cap, survival, minimum missed starts and repeated-episode handling.
- Deterministic (seed 20261002 for bootstraps), offline from committed ledgers.

## 7. Magnitude (question A)

| Candidate | 2009-15 | 2016-19 | 2020-25 held-out | All 2009-25 | All-years 95% CI |
| --- | --- | --- | --- | --- | --- |
| V33 literal (damage-bounded) | −0.0002 | −0.0004 | −0.0018 | −0.0010 | −0.0025 to +0.0001 |
| V33 starts-only | −0.0007 | +0.0001 | −0.0032 | −0.0016 | −0.0037 to −0.0001 |
| DAMAGE, chosen on 2009-19 (f 0.5, h 8) | −0.0006 (train) | | −0.0019 | −0.0012 | held-out −0.0037 to −0.0001 |
| DAMAGE + quality gate, chosen on 2009-19 (f 0.75, h 8) | −0.0009 | −0.0006 | −0.0021 | −0.0014 | −0.0032 to −0.0001 |

Brier deltas on post-return games; negative is better.

- **Scale with damage, not starts alone.** Starts-only scores similarly in aggregate, but it pays out when nothing was lost and when there was no absence (section 13), and it is worse for slightly-worse replacements (+0.0028). The damage bound is what makes the rule safe; it should stay.
- **Fraction.** 0.5-0.75 of measured surviving damage is best on 2009-2019 and held-out; 1.0 is no better and riskier.
- **Quality difference.** Gains come from replacements who were much worse (gap > 0.1 EPA/play: −0.0023); slightly worse +0.0004, similar or better +0.0004. The quality gate adds a little on the training seasons (−0.0008 versus −0.0006).
- **Cap.** At these fractions the 60 Elo cap rarely binds: 30 is slightly worse, 60/90/none are equal. Keep 60 as a safety bound, not as a fitted value.

## 8. Offseason versus midseason (question B)

- Offseason returns carry most of the benefit (44 episodes: −0.0030; held-out −0.0035). Midseason returns are close to zero (126 episodes: −0.0002; held-out −0.0009).
- Fitting midseason separately chose "return game only, f 1.0" and **hurt** on held-out (+0.0010 versus −0.0009 unified). Offseason separate and unified are similar.
- The 70% survival factor is not a separate effect. With the same fraction, survival 1.0 beats 0.7 and 0.5 on both training and held-out seasons, which is equivalent to restoring about half of the raw pre-reversion damage either way.
- **Answer:** one rule with timing handled only through the damage measurement: measure the replacement-window damage the forecast still carries (after the offseason reversion for offseason returns, as is), apply the same fraction. Do not force a separate 70% factor into midseason, and do not create a separate midseason contract. Midseason evidence is weak; the owner requirement to support midseason cases is met by the same rule, but its expected benefit there is small.

## 9. Decay and transition (question C)

| Half-life (DAMAGE f 0.5) | 2009-19 | 2020-25 |
| --- | --- | --- |
| Return game only (immediate suppression) | −0.0001 | −0.0003 |
| 2 team games | −0.0000 | −0.0014 |
| 4 (current) | −0.0003 | −0.0018 |
| 8 | −0.0006 | −0.0019 |
| 280 returning-QB dropbacks | −0.0006 | −0.0019 |

- Slower is better in every family and both eras; the current 4 games is inside the helpful region but 8 is consistently better.
- Dropback-driven decay performs the same as team-game decay (280 dropbacks is about 8 games). Team games are simpler and need no extra data.
- Turning the Elo correction off once the starter plays (the display-suppression rule applied to Elo) loses most of the benefit. The forecast still needs the prior after the starter has data.
- Eligible decay drivers: team games (recommended), QB dropbacks (equivalent). Not supported: immediate removal on first measured data.

## 10. Overlay and suppression (question D)

Distinguish three things:

1. **Team Elo correction:** a forecast prior about team strength that core Elo has not yet relearned. Section 9 shows it should persist and decay after the starter has played.
2. **Displayed QB unit overlay:** a display translation of that Elo correction into offense and QB unit values. It has zero predictive weight (V30/V45 registry), so it cannot be validated by Brier.
3. **Measured current QB data:** the starter's own current-season stats.

The current V105 behaviour (unit overlay off as soon as the starter has current stats, Elo correction continuing) matches these semantics for the **unit display**: once measured QB data exist, the QB unit should show measurement, not a back-solved prior. A blended overlay would mix a team-level prior into a player measurement. What is incoherent today is the **disclosure**: the matchup note follows the overlay, so a correction can be active with no disclosure (already recorded in the UX-19 plan, section 7). Recommendation: keep "no overlay after measured evidence" for the unit display, and make every disclosure follow the Elo correction itself. Label the overlay QB from the detected episode, not from `S.qbCarryover.qb`. No UI change made.

## 11. Replacement performance

| Replacement versus starter (EPA/play gap) | Episodes | DAMAGE f 0.5 h 8 | V33 literal | Starts-only |
| --- | --- | --- | --- | --- |
| Similar or better (≤ 0) | 39 | +0.0004 | +0.0000 | −0.0031 |
| Slightly worse (0-0.1) | 37 | +0.0004 | +0.0011 | +0.0028 |
| Much worse (> 0.1) | 93 | −0.0023 | −0.0021 | −0.0027 |
| No measured damage | 49 | 0 (inactive) | 0 (inactive) | −0.0018 |

The damage bound already drives the correction to zero when the team lost nothing, so an absence alone is not rewarded. A quality gate is reasonable on safety grounds (it zeroes similar-or-better replacements) and is mildly supported on training seasons. Starts-only results for no-damage episodes are positive, but a rule that pays out with no measured loss cannot pass the placebo or the owner's "no reward merely because an absence occurred" standard.

## 12. One-game absences

- 49 verified one-game absences: DAMAGE +0.0003 (slight harm), V33 −0.0002; on held-out seasons both are slightly harmful (+0.0003, +0.0002). No evidence of benefit.
- Minimum-missed-starts rule (DAMAGE f 0.5 h 8): requiring 2 is slightly better than 1 on training and held-out seasons (−0.0007 versus −0.0006; −0.0020 versus −0.0019); requiring 3 is worse.
- **Answer:** a one-game absence should produce zero correction (minimum 2 missed starts). The damage bound alone already keeps it small, but there is no evidence for any one-game correction.

## 13. Repeated episodes and negative controls

**Repeated episodes.** In 72 verified episodes the returned starter left again inside the 8-game window. Continuing the old correction through the new absence hurt (+0.0014 V33, +0.0020 DAMAGE). Episodes that begin within 3 games of a previous return show roughly zero effect either way.
- An active correction should **end when the starter leaves again** (replace, not stack).
- The next return gets a **fresh correction computed from the newest replacement window only**.
- A one-game return followed by a new absence: the first correction ends after that game; the second episode is evaluated on its own window (and is zero if it is a one-game absence).

**Negative controls.**
- **Placebo, no absence:** 2,374 windows where the incumbent started every game (1, 3 or 6 games, midseason and offseason). Damage-bounded rules move Brier by −0.0001 (essentially zero); starts-only is +0.0003, worst with 6-game windows (+0.0009). The effect in real episodes is about ten times the placebo, so it is attached to the regime change.
- **AMBIGUOUS episodes (possible benching, rest, suspension, non-injury):** V33 −0.0036, DAMAGE −0.0027. The predictive signal is not injury-specific. The safe model outcome is still zero for these cases, because the owner contract is an injury/medical return, detection cannot tell a benching that reverses from one that sticks, and a wrongly detected return has no "return" to correct.
- **Permanent changes, trades, new starters, rookies:** with no return there is nothing to correct; the rule is structurally zero. A rookie or new starter is not an incumbent until four starts, so a later absence is not an episode. Expected safe behavior when detection is wrong is zero; the damage bound and quality gate limit the cost of a false positive but do not remove it.

## 14. Double counting and propagation

The historical replay contains only core Elo, so it measures the correction against a baseline with none of the following. In production, each is a possible second channel for the same information:

| Channel | Overlap risk | Evidence |
| --- | --- | --- |
| Core Elo after return | Core Elo learns from post-return results while the overlay decays. Partial overlap is intended and is what the half-life tests measure. | Tested (section 9) |
| Unit-to-FORCE bridge (`model/unit_force_bridge.js`): QB 12%, scoring per drive 20% of a ±7.5-point bridge | The bridge compares live units against a preseason prior built from the team's 2025 QB room (earlier audit), not the current QB. Once the returning starter has current stats, the bridge can lift the team for the same QB quality the Elo correction is restoring. | Not replayable historically; structural risk |
| V34 early-regime correction (Weeks 2-6) | Residuals are measured against the core baseline without the QB correction, so a returning team that outperforms core gets both corrections in Weeks 2-6. Affects offseason returns. | Not replayable; structural risk |
| Celo QB layer in the season-end prior | The offseason starting prior (`D.rankings`) came from Celo, which already lowered expectations during backup starts, so its damage is smaller (KC 67.6 versus 75.8 here). | Explains part of the gap between harnesses |
| ANY/A rank in the QB composite (about 39% of spread, unstabilized) | Only affects the displayed QB unit and the bridge; a weak replacement can depress the team QB room prior for next season. | Display/bridge only |
| Opponent-adjusted performance (V98 look-behind) | Adjusts current core Elo from later opponent results; small overlap. | Not replayable |

Propagation paths today: current and future ratings meet in `effectiveQbCorrection`; historical states call `QR.correction` directly; team pages forecast with only the viewed team's correction; Roster Lab omits the correction. A generalized rule must feed one shared function used by all of these, and must be validated jointly with the bridge and early-regime layers before any forecast claim. The measured gains here are an upper bound for production.

## 15. Forecast impact

| Candidate | Active episodes | Mean / median / max initial Elo | Mean return-game win-prob shift | Mean expected-win shift over window | Post-return Brier | League-wide Brier |
| --- | --- | --- | --- | --- | --- | --- |
| V33 literal, all 2009-25 | 121 of 170 | 18.6 / 15.0 / 60 | 2.6 pts | 0.06 wins | −0.0010 | −0.00017 |
| V33 literal, held-out | 57 of 78 | 19.4 / 15.0 / 60 | 2.7 pts | 0.07 | −0.0018 | −0.00038 |
| DAMAGE + gate, all | 99 of 170 | 25.3 / 24.0 / 60 | 3.6 pts | 0.08 (max 0.49) | −0.0014 | −0.00023 |
| DAMAGE + gate, held-out | 47 of 78 | 26.8 / 27.5 / 60 | 3.7 pts | 0.09 | −0.0021 | −0.00045 |

- Median episode change is zero for every candidate; improved/worsened episodes run about 55/45.
- The top three episodes supply 49-57% of the net gain in the full sample.
- Worst cases are midseason returns where the starter played one game and the team lost: TEN 2014 (+0.10), GB 2017 (+0.07), TEN 2023 (+0.05), GB 2025 playoff (+0.09 for the gated rule).
- KC 2026 application: V33 gives +15.75; damage f 0.5 on the replay's surviving damage gives +26.5 with an 8-game half-life. These numbers depend on the damage source (Celo versus replay) and are shown only for scale.

## 16. Candidate generalized contracts (none selected)

All three apply to every team through the same logic, with no team or QB names, and require an independently detected injury/medical absence and return (Codex lane). Inputs are measured at the return game from data available before kickoff.

| | Null | A: V33-generalized | B: damage-scaled, quality-gated |
| --- | --- | --- | --- |
| Magnitude | 0 | `min(surviving damage, 7.5 × missed × s)` | `0.75 × surviving damage` |
| Cap | none | 60 × s (pre-survival 60) | 60 × s |
| Survival/timing | n/a | s = 1 midseason, production reversion survival offseason (0.70) | same; no separate timing parameter |
| Decay | n/a | 4 team games since return | 8 team games since return (280 returning-QB dropbacks equivalent) |
| Zero conditions | always | no measured damage; no verified return; benching/permanent change | no measured damage; replacement not worse than starter's previous EPA/play; fewer than 2 missed starts (recommended, mild evidence); no verified return; benching/permanent change; insufficient data |
| Repeated episodes | n/a | ends when starter leaves again; fresh from newest window | same |
| Overlay transition | n/a | unit overlay off after measured data; Elo continues | same; disclosures follow Elo correction |
| Evidence (post-return Brier, all / held-out) | 0 / 0 | −0.0010 / −0.0018 (fixed beforehand on overlapping episodes) | −0.0014 / −0.0021 (chosen on 2009-2019 only) |

B was chosen inside its predeclared family on 2009-2019 only. A's numbers are not a clean held-out result, because V33's parameters were picked using episodes from 2008-2024. The minimum-2-starts condition in B was probed after the family choice; it is supported but small.

## 17. Null-model comparison

- Against NULL, both A and B improve every split, by about 0.001-0.002 Brier on post-return games. The held-out bootstrap intervals include zero (A −0.0037 to +0.0002; B −0.0041 to +0.0003). Over 2009-2025, B's interval excludes zero (−0.0032 to −0.0001), but that sample includes its training seasons.
- League-wide, the gain is 0.0002-0.0004 Brier, about one twenty-fifth of the market-blend gain (−0.0075) recorded in the gate registry.
- Under the predictive-feature policy, B technically passes (pregame-safe inputs, selection without the held-out seasons, no worse than the incumbent on the held-out set). Passing makes it eligible, not required.
- **Assessment:** the feature is real but small. Null is defensible on simplicity and on the untested production overlaps in section 14. B is the best-supported option if the owner retains the feature.

## 18. Limitations

- The replay is the FORCE core engine only. It omits the unit bridge, V34 early regime, V98 look-behind, market blend and the Celo QB layer, so production gains could be smaller (section 14).
- Damage is measured with result-only Elo; production offseason priors come from Celo, which records less damage.
- Availability classes depend on nflverse injury reports and roster status; IR placements without a report entry are caught only through roster status; COVID-list absences are PROBABLE. Pre-2009 episodes are excluded for lack of injury data.
- Detection is participation-based; section 5 shows results move with detection quality. A production detector will differ.
- 170 episodes and 782 games remain a small sample for a 0.001-Brier effect; the per-episode distribution is wide and has a median of zero.
- Evaluation windows end at season end or a new absence, so offseason windows are longer than midseason ones; this partly explains why offseason gains look larger.
- The quality gap uses nflverse EPA for passing and rushing; it is a coarse measure of QB quality and is not opponent-adjusted.
- The committed ledgers contain facts derived from nflverse data; nflverse-data release files are published under CC-BY 4.0 and `nflverse/nfldata` has no license file. Attribution is in the research README. Whether to keep derived ledgers in the repository is an owner call.

## 19. Owner decisions needed

1. **Keep or drop the automatic correction.** Retain a league-wide rule (A or B) or adopt Null. If Null, the KC preset would be retired by a separately authorized model change, and UX-19's prerequisite would then be met by removal rather than generalization.
2. **If retained, A or B.** B is better supported; A stays closer to current V33 behaviour.
3. **Injury-only scope.** The signal also appears in possible benchings. Confirm that only verified injury/medical returns qualify (recommended for safety).
4. **Joint validation.** Whether the implementation must be validated together with the unit bridge and V34 early regime before acceptance (recommended), and whether early-regime residuals should be measured against the corrected baseline.
5. **Ledger storage.** Keep derived nflverse ledgers in the repository with attribution, or keep only hashes and scripts.

## 20. Recommended next step

The owner chooses between Null and B (or A). If a correction is kept, combine this contract with Codex's detection/source findings into one implementation specification. That specification should define the damage measurement in the live engine, the replace semantics, zero conditions with recorded reasons and the shared propagation function. It should then be separately authorized, and validated independently on the UX-19 section 14.5 cases plus a joint production-layer replay. UX-19 stays blocked until then.
