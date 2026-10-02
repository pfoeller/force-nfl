# MD-03 QB event-detection investigation

Cycle 5 independent data/research lane, 2026-10-02. Shared base: `bd15a2c682c0dd8c836ecfd42e615a31741988c7`; branch: `cycle5/codex-md03-data`. Research evidence only; F1-F6 correction follow-up to reviewed `e32ee2be89de27b76e3518afed04cf6dd085da27`, pending re-review. No production correction, ratings, V33 formula, public UI, source adoption, purchase or deployment changes.

## Finding and boundary

A reproducible historical **candidate-event** cohort is feasible with free nflverse starter and injury files. An adequate unattended production route is **not established**: actual starter errors occur, injury rows can omit revised designations or IR continuity, current rows lack an injury modification timestamp, and permanent role/transaction changes need separate evidence. Missing/conflicting evidence must produce **NO AUTOMATIC CORRECTION**, with a reason. Participation patterns alone do not establish an injury return.

The current prototype is **WITHIN-SEASON ONLY** and does **not satisfy the complete MD-03 capability contract**. It cannot carry a prior-season incumbent into an offseason return, the KC/Mahomes-type case, or an early-season absence before current-season tenure is established. Mixed-season evidence explicitly yields `CROSS_SEASON_UNSUPPORTED` / UNKNOWN / ABSTAIN, with no automatic correction; no cross-season support is implemented here.

Evaluation now matches each named incumbent/onset/absence-window/return, never any episode somewhere in a crop. Cropped labeled-episode results remain six of eight documented injury returns; the strict Out hypothesis abstains on two Questionable-onset returns. The cause-free comparison finds all eight plus two non-injury false positives. Uncropped regular-season replay retains the same targets and all competing events: the strict route still finds six, while the cause-free route finds seven of eight and two non-injury false positives. The additional miss is Tua's 2020 thumb episode: full history retains the earlier Fitzpatrick anchor, so the target is not detected. These are purposive diagnostics, **not population accuracy, predictive benefit, production eligibility or a chosen policy**. Every diagnostic emits `productionCorrectionAllowed: false`; no magnitude estimation or fitting is performed.

`MD-03` remains CONFIRMED requirement / INVESTIGATE design / PLANNED implementation. [UX-19](UX19_QB_RETURN_REMOVAL_PLAN.md) removal remains PLANNED, unauthorized and blocked on implemented, independently validated, owner-accepted MD-03. The KC preset is current state only, not the accepted final architecture.

## 1. Current KC-only architecture

Fresh source trace, not a Cycle 4 summary:

| Field/path | Actual source and meaning | Kind / limitation |
| --- | --- | --- |
| Team and expected returning QB | [data/qb-carryover.js](data/qb-carryover.js): one `KC` preset, Patrick Mahomes, season 2025, returnSeason 2026 | Hand-authored historical/expected identity; name, not GSIS episode key |
| `missedStarts: 3`, replacement window | Same preset; historical event-study context | Hand-authored; no ingestion-derived window, game IDs or transaction check |
| `verifiedReplacementWindow`, `expectedStarterReturned`, `autoEligible` | All literal `true` in preset | Assertions, not running verifier results; no source timestamp per assertion |
| Damage facts | Raw backup-window damage 67.6151; post-reversion damage 47.3306; suggested manual restore 47.3 | Frozen research/preset values, not a league-wide causal estimator |
| Eligibility | [model/qb_regime.js](model/qb_regime.js): three flags exactly true, positive missed starts | No live starter, injury, roster, season or return detector |
| Initial automatic amount | `min(postReversionDamage, min(60, missedStarts * 7.5) * survival)` = 15.75 Elo here; current KC preset survival is 0.70 | Derived from authored inputs; not the 47.3 manual suggestion |
| Survival trace | `offseasonSurvivalFraction` is a per-preset field; finite preset value takes precedence, then finite `opts.offseasonSurvival`, then model default 0.70 | The current KC preset supplies 0.70. This is a current-state trace, not a generalized factor; the parallel model lane investigates that separately |
| Predictive gate | [predictive gates](data/predictive-feature-gates.js) accept verified-regime carryover; [app](assets/app.js) checks `PF.brierEligible` | V33 six-case decline-gated prior-isolation evidence; not new event-policy authorization |
| Activation | `automaticQbRegimeCorrection()` passes preset and `teamGamesPlayed()` to `QR.correction()` | Scored current-season schedule games count; no actual return event triggers it |
| Decay | `initialRestore * .5^(teamGames/4)`, cutoff below .05 Elo | Current-season team games, not returning-QB games since a midseason return |
| Historical consumers | `canonicalGameTeamState()` uses team games before/through game; preseason uses zero | Same registry; no historical episode discovery |
| Manual override | `effectiveQbCorrection()` uses positive enabled manual value instead of automatic amount | Scenario machinery unchanged; no stacking |
| Unit overlay | `qbCarryoverUnitEffect()` / `LP.applyQbCarryoverScenario()` convert positive FORCE delta into offense/QB display scenario; defense unchanged | Display overlay distinct from Elo correction |
| Suppression | `suppressQbUnitScenarioOverlay()` compares normalized preset/current-profile QB names and requires positive `playerStatGames` or QB games | Display-only suppression; automatic Elo can persist. Player-stat games can be team-level evidence |
| Profile identity | [live_profiles](model/live_profiles.js) chooses largest **season-cumulative attempts + sacks**, else prior QB name; metrics aggregate team QB room | Volume leader, not latest actual starter or episode-specific return evidence |

[Server](force_server.py) retrieves raw `games.csv` (300-second schedule cache); player/team/charting caches are separate. App bootstrap/refresh mapping drops starter IDs/names and `game_id`. That path ingests no injuries, depth charts, transactions or inactives. Disk-cache `saved_at` is cache persistence time, not official source-event time. Existing availability/no-play/historical/propagation tests protect metric availability and identity/suppression behavior; they do not certify absence causes or return events.

Read: [V33](QB_REGIME_RESEARCH_V33.md), [carryover](QB_CARRYOVER_RESEARCH.md), [V8](QB_CARRYOVER_RESEARCH_V8.md), [policy](PREDICTIVE_FEATURE_POLICY_V30.md), `research/qb_carryover_event_study.py`, `research/qb_carryover_decay.py`, `research/v33_research_audit.py`. Curated next-season studies do not establish automated discovery or midseason formula validity.

## 2. Minimum production event contract (proposal, unselected)

Separate **identity**, **absence cause**, **event verification**, **model eligibility**, and **amount**. Injury-associated return does not prove replacement-window rating damage or predictive benefit.

For every team require: stable player namespace; starter tenure/effective interval; onset/cause/status; ordered completed game IDs and complete calendar; replacement starters/participation; injury/IR/inactive evidence; intended-role and transaction changes; original starter's participation return and actual-start return separately; episode end/repeats; watermarks/revisions; unknown/disqualifier reasons. Byes are not games. Postponed, uncompleted or cancelled games are not absences; missing expected completed rows are UNKNOWN.

Starter establishment needs a policy for Week 1 injuries, preseason continuity, new rookies and split roles. Prototype **two observed starts** is a research anchor, not an owner-approved tenure threshold. First-game injury without history is a known limitation. Prior-season history needs explicit same-team/role continuity, not automatic carry-forward.

**Required future capability — CROSS-SEASON STARTER CONTINUITY (INVESTIGATE).** Establish the prior-season starter and expected role in the next season; connect an offseason medical absence to a Week-1 or later return; and handle a Week-1/2 injury before current-season tenure is re-established. Dated offseason trade/acquisition, rookie takeover, documented permanent change, retirement/release and conflicting evidence must be accounted for. Prior-team status cannot automatically establish a new-team anchor. Uncertain cross-season continuity → UNKNOWN / ABSTAIN → no automatic correction. The prototype lacks these capabilities, including all 44 offseason cases in Claude's reported 170-episode cohort; they are future requirements, not implemented logic.

Prototype meaningful absence is one or more **completed missed starts**; partial loss in the injury game is excluded. Whether limited/emergency participation, halftime removal, one-game absence or immediate returning-QB data should qualify remains unresolved.

## 3. Free-first sources and field mapping

Primary dictionaries: [schedules](https://nflreadr.nflverse.com/articles/dictionary_schedules.html), [injuries](https://nflreadr.nflverse.com/articles/dictionary_injuries.html), [depth charts](https://nflreadr.nflverse.com/articles/dictionary_depth_charts.html), [snaps](https://nflreadr.nflverse.com/articles/dictionary_snap_counts.html), [participation loader](https://github.com/nflverse/nflreadr/blob/main/R/load_participation.R), [PBP](https://nflreadr.nflverse.com/articles/dictionary_pbp.html), [rosters](https://nflreadr.nflverse.com/articles/dictionary_rosters.html). Actual files override assumed dictionary schemas.

| Source | Useful fields/join | Role and limits |
| --- | --- | --- |
| Existing nflverse/nfldata games | `game_id`, season/type, date/week/scores; home/away QB GSIS IDs and names | Efficient provisional actual-start history. Future fields are predictions, not actual starts. Scored rows are research completion observations, not certified finality |
| nflverse snaps / PFR | game/team, PFR player ID, position, offensive snaps/share; GSIS crosswalk | Participation/workload corroboration. Most snaps is not official starter. Require complete game coverage and verified crosswalk, not name joins |
| nflverse participation | nflverse game/play ID, offense-player IDs/positions | Person-on-play/first valid possession. Since 2023 FTN release is **postseason only**, no timely in-season activation; previous NGS source ceased during 2023 |
| nflverse PBP / weekly stats | game/posteam, passer/rusher IDs, attempts/sacks/scrambles, no-play/kneel/spike indicators | Dropback/workload coverage. Exclude cancelled plays; distinguish trick passers. Passer ID alone misses handoffs/wildcat snaps and cannot certify official start |
| nflverse injuries | season/type, team/week, GSIS, report/practice status and injury | Injury `Out` supports absence; Questionable/Doubtful/limited practice alone does not prove cause. IR can disappear from weekly reports; current `date_modified` absent |
| nflverse depth charts | 2025+ `dt`, team, GSIS/ESPN, formation position slot/rank | Dated intended role, not actual start/injury proof. Formation-specific rank; 2025+ timestamps replace earlier weekly schema; missing IDs require crosswalk |
| nflverse rosters/player IDs | team/week, roster status/description, GSIS/PFR/ESPN | Membership/IR/crosswalk. Weekly absence is not a release; no precise trade/release-time event log demonstrated |
| Official NFL/club gamebooks, inactives, injury reports, transactions, announcements | Starting lineup, inactive/IR/role/transaction effective date | Primary corroboration/adjudication; varying HTML/PDF and timing. No verified comprehensive supported free machine API or production permission established |
| ESPN public endpoints | Roster/depth/boxscore provider IDs | Plausible check; supported API, history, limits and FORCE rights unverified. Undocumented endpoint access is not adoption permission |
| Sleeper API | Player metadata; league transactions are fantasy transactions | Cannot establish authoritative NFL starts/transactions; non-commercial free use, commercial licensing discussion required |

### Fresh empirical source check

2026-10-02 direct probe. [Fixture](scripts/fixtures/md03_qb_episode_sample.json) records URLs/hashes/sizes/retrieval/update timestamps. Games pin: nfldata `5898b6279be0829925f7bbda165d319b474e1825`; SHA-256 `14fc5583f0a27ec9213964617c091d348a1d62fa33a5de985c2cc3243a45b642`. Release URLs are mutable: reproduce frozen hashes, not newer assets.

| Inspected 2026 file | Observed coverage | Gap |
| --- | --- | --- |
| Games | 49 scored REG games, 98 nonempty starter-ID slots | Nonempty is not correct; remaining scheduled games are future |
| Injuries | 1,025 rows, 32 teams, Weeks 1–4; release `2026-10-02T13:47:53Z` | No dictionary `date_modified`; missing report is not healthy status |
| Snaps | 4,579 rows, 32 teams, Weeks 1–4; release `2026-10-02T11:01:51Z` | Team presence does not prove full completed-game/player coverage |
| Rosters | 3,020 rows, 32 teams, Weeks 1–4; release `2026-10-02T13:50:59Z` | No precise transaction-time proof |
| Depth | 594,789 accumulated rows; latest `dt: 2026-10-02T13:49:21Z` covers 32 teams | 312 QB rows across snapshots lack GSIS; not 312 unique missing QBs |
| Participation | 2025 asset present; no 2026 asset observed | Postseason-only publication |

Direct injury release metadata includes **2025 and 2026**. A cached search description claiming no post-2024 injury feed was stale, not evidence of current absence. Historical scored-game starter slots were all nonempty: 256 games each in 2016/2017/2019/2020, 272 in 2021, 271 in 2022. The 2022 count does not invent a completed Buffalo–Cincinnati game. Coverage is not accuracy or rights clearance.

## 4. Starter contract and disagreements

Proposed precedence: corrected official game starting lineup plus verified stable-ID crosswalk; then accepted finalized schedule starter as provisional corroborated evidence. Require revision/evidence/observation IDs. If independent observations disagree, freeze **UNKNOWN / NO AUTOMATIC CORRECTION**, not majority vote. Missing crosswalk blocks; names are display context only.

The model ultimately needs the **established role-holder**, not merely an official-start label. Official start is the strongest available proxy, but role/workload continuity may matter. `games.csv` starter identity remains primary executable evidence here, with the CAR Week-11 disagreement still blocking.

**Possible future precedence, INVESTIGATE only:** if the schedule names QB A, A has zero offensive snaps and exactly one QB has complete offensive QB snaps, an override may be defensible only after complete coverage and a verified ID crosswalk are established. No such override is adopted by this prototype; usage never silently fills or replaces a starter.

First valid offensive snap can establish a **candidate** under a separately chosen definition, but cancelled plays, absent personnel, opening wildcat/rotation and partial possession prevent unconditional equivalence with official starter. Complete snaps/participation/PBP corroborate, never silently replace lineup identity. Most snaps, dominant dropbacks, season-cumulative leader and depth-chart order remain distinct measures; prototype never uses them to fill missing starts.

Frozen examples:

- **SF 2020 Week 5:** Garoppolo starts; Beathard 33 offensive snaps versus Garoppolo 31 after halftime removal. Most-snaps inference mislabels starter and misses return.
- **MIA 2021 Week 2:** Tagovailoa starts; Brissett 65 snaps versus Tagovailoa 9 after early injury. Dominant workload reflects replacement.
- **MIA 2021 Week 10:** Brissett starts (37 snaps); Tagovailoa participates (32). His actual starting return is Week 11, not Week 10. [Club game account](https://static.clubs.nfl.com/image/upload/ravens/xuq2ylclxmchvzqpmh8o), [Dolphins guide](https://static.www.nfl.com/league/apps/league-site/media-guides/2022/MIA.pdf).
- **CAR 2022 Week 11:** pinned schedule names Phillip Walker; snaps show Mayfield only (57); [Panthers account](https://www.panthers.com/news/panthers-release-baker-mayfield) identifies Mayfield starting at Baltimore. Fixture preserves raw value and separately human-adjudicated conflict evidence. Detector blocks; upstream unchanged.

## 5. Injury versus benching

| Situation | Participation-only risk | Injury-aware requirement/residual risk |
| --- | --- | --- |
| Injury then original return | Gap/return cannot explain cause | Injury/inactive/IR linkage plus continuing intended role and actual return |
| Benching/demotion | Reinstatement becomes false injury return | Role change disqualifies; incidental injury cannot override benching |
| Trade/release | Old-team absence and new-team starts bleed | Team-scoped episodes and effective dated transactions; no carried damage |
| Rest/suspension/personal absence | Same gap geometry | Separate cause/policy, no injury inference |
| Rookie takeover | Veteran spot start looks like return | Terminate old role; rookie can later establish own episode |
| Post-injury demotion | Healthy old QB fills in for injured replacement | Health, participation and intended-starter return differ; CAR stays ambiguous |
| Strategic/split rotation | Repeated apparent misses without stable role | Explicit split-role policy or unknown |
| IR/status revision | Correct missed starts but no cause | Weekly IR disappearance and Questionable emergency-active cases cause strict-Out false negatives |

Explicit absence-cause **and intended-role evidence** is needed to avoid known false positives. That need does not select a specific injury/vendor feed. Do not loosen thresholds to fit named cases; expanded policies need independent per-game evidence and held-out cases. Injury onset alone still cannot exclude later demotion.

## 6. Episode schema and state machine (proposal, unselected)

Durable record: `episodeId = team | season | originalStarterGsisId | firstMissedCompletedGameId`; optional `parentEpisodeId` for a replacement's own absence; establishment/role interval; onset cause/game; ordered missed-game IDs; replacement identity/role intervals; participation versus actual-start return; termination/effective time; watermarks/hashes/revisions; `supersedesRevision`; state/unknown reasons; event verification separate from model eligibility. Evidence revision/hash is not the logical event ID.

Prototype implements a small **WITHIN-SEASON retrospective hypothesis**, not full production machinery or the complete MD-03 contract. Two observed starts establish anchor. Different starter opens episode; exactly one matching injury `Out` row with nonempty injury supports onset. Carrying that hypothesis through sparse IR report rows is not proof of continuing injury/role. Original starter identity closes it as `RETURN_IDENTITY_ONLY` when untainted. That state says only that the same identity resumed the starting role; it verifies neither medical cause nor production eligibility. Injury-supported onset remains a separate flag. It does not verify complete calendar, official finality, qualifying workload, degradation or owner policy; every output denies production correction.

Optional `asOf` replay blocks missing/future observation envelopes. Historical rows lack those causal envelopes. A production adapter must validate every component's availability/revision before constructing an envelope; a provider modification time cannot stand in for observed availability. Scores are research completion observations only.

| Transition | Required evidence/timing | Disqualifiers, activation and reversal |
| --- | --- | --- |
| Unestablished → NORMAL | Chosen tenure/current-role contract; prototype two observed starts | Missing history remains unestablished; no correction. Replay can remove anchor |
| NORMAL → ABSENT_UNVERIFIED | Different actual starter in completed team game and complete calendar | Missing/conflicting start → UNKNOWN; bye/future game cannot trigger. No correction |
| ABSENT → REPLACEMENT_ACTIVE | Injury cause, actual replacement participation, continuing expected role | Prototype supports onset plus starts only. Role/rest/trade ambiguity blocks production. Corrected evidence can retract onset |
| REPLACEMENT → RETURN_CANDIDATE | Original QB participates or announced to start | Participation/announcement alone cannot activate; limited/emergency return may retract |
| CANDIDATE → RETURN_IDENTITY_ONLY | Prototype: same QB identity in a completed start. Future medical verification also needs adequate workload/role and joint watermark | Identity-only state grants no medical verification or eligibility. Tainted/conflicting events stay UNKNOWN; full policy unresolved |
| Separately medically verified event → CORRECTION_ACTIVE | Separately implemented eligibility: attributable degradation, similar/better replacement rejection, cap/decay/suppression, owner authorization | **Unimplemented/unauthorized here.** Event truth alone never activates; retraction revokes future effect and requires reproducible historical recomputation |
| Active → EXPIRED | Separately chosen return-game/evidence threshold | V33 current-season team-game clock is not adopted for midseason. Replay can revise expiry |
| Any episode → PERMANENT_CHANGE | Effective documented trade/release, benching, permanent replacement/rookie takeover | No return correction under proposed injury contract. Missing evidence IDs/unrecognized reason → UNKNOWN |
| Cross-season evidence → UNKNOWN | Prototype has no cross-season continuity state | `CROSS_SEASON_UNSUPPORTED`; abstain, no automatic correction |
| Any → UNKNOWN/CONFLICT | Missing source/game/person, conflicting starter/injury, multiple injured QB role ambiguity, stale evidence | **NO AUTOMATIC CORRECTION** with reason. Prototype requires full replay after stream gap; no silent resumption |

Production adapters/eligibility are not implemented; transition evidence above is a design proposal. The executable research flags `injurySupportedReturnCandidate`, not production eligibility.

## 7. Repeated episodes

Same QB injured/returns/injured again: new onset ID, no old missed-start/damage/decay carryover. Fixture contains two distinct 2021 MIA onsets and two 2020 SF onsets; synthetic continuous replay covers repeated returns.

Two QBs injured: maintain original/replacement identities and parent episode links. Prototype records replacements and **abstains** when an injured replacement is displaced; full nested-role resolution is a prerequisite, not a claimed feature. Separate sequential established-QB episodes are tested.

Original starter returns then benched: stop future correction at effective role change; don't retroactively erase a true earlier injury return unless revised evidence changes it. Later old-starter start cannot reopen terminated episode. Replacement made permanent: close original episode and independently establish new starter. Trade during/after absence: close old-team interval, never transfer rating damage to new team. Bye is absence of scheduled game; missing expected completed row is unknown. Changed onset IDs need supersession/retraction, not concurrent duplicates.

## 8. Historical sample, labeled targets and errors

Purposive **12 labeled episodes / eight teams / six seasons (2016, 2017, 2019–2022)**. This is not an unbiased cohort. Each fixture case records team/season, expected incumbent GSIS, onset game/week, exact missed-game window, documented return game/week (or no return), cause/class and expected detector results for cropped and full-season evidence. Labels and primary NFL/club truth links are evaluation evidence, never detector inputs. Cropping reasons/bounds are explicit in `crop`; selected rows and the nine uncropped regular-season team/season streams come from the same 14 hash-pinned inputs.

Carolina's human-adjudicated conflict annotation is preserved in both views, not presented as a supported machine API. Without it, raw schedule evidence misses Mayfield's real start; that does not validate the source. Open/ambiguous labels remain outside binary counts. An injury return is a documented starting-role return, not corrective eligibility.

| Labeled target | Incumbent | Onset week | Expected missed team-game weeks | Return week | Cropped injury-aware / cause-free |
| --- | --- | ---: | --- | ---: | --- |
| PIT 2016 knee | Roethlisberger | 7 | 7 (bye 8 excluded) | 9 | TP / TP |
| GB 2017 collarbone | Rodgers | 7 | 7, 9, 10, 11, 12, 13, 14 | 15 | TP / TP |
| NYG 2017 benching | Manning | 13 | 13 | 14 | TN / FP |
| KC 2019 knee | Mahomes | 8 | 8–9 | 10 | TP / TP |
| SF 2020 first ankle | Garoppolo | 3 | 3–4 | 5 | TP / TP |
| SF 2020 second ankle | Garoppolo | 9 | 9–10, 12–17 | none | Open/nested UNKNOWN / UNKNOWN |
| MIA 2020 rookie change | Fitzpatrick | 8 | 8–11 | 12 | TN / FP |
| MIA 2020 thumb | Tagovailoa | 12 | 12 | 13 | FN / TP |
| MIA 2021 ribs | Tagovailoa | 3 | 3–5 | 6 | TP / TP |
| MIA 2021 finger | Tagovailoa | 9 | 9–10 | 11 | FN / TP |
| SEA 2021 finger | Wilson | 6 | 6–8 (bye 9 excluded) | 10 | TP / TP |
| CAR 2022 role mix | Mayfield | 6 | 6–10; uncertified at conflict | 11 disputed by schedule | UNKNOWN / UNKNOWN |

The fixture's explicit missed game IDs/weeks are authoritative; a contiguous week range cannot substitute for team games.

| Evaluation / route | TP | FP | FN (including abstention) | TN | Open/ambiguous |
| --- | ---: | ---: | ---: | ---: | ---: |
| Previous any-episode-in-crop: injury-aware | 6 | 0 | 2 | 2 | 2 |
| Previous any-episode-in-crop: cause-free | 8 | 2 | 0 | 0 | 2 |
| Corrected named episode, cropped: injury-aware | 6 | 0 | 2 | 2 | 2 |
| Corrected named episode, cropped: cause-free | 8 | 2 | 0 | 0 | 2 |
| Corrected named episode, full season: injury-aware | 6 | 0 | 2 | 2 | 2 |
| Corrected named episode, full season: cause-free | 7 | 2 | 1 | 0 | 2 |

Cropped totals happen to remain unchanged; the scoring method is nevertheless corrected. A match must have the labeled incumbent and onset, exact missed game IDs and return identity/game. All competing detector episodes remain visible. Full-season MIA finger retains the earlier ribs candidate but cannot receive its credit; SF second ankle retains the first return but stays open/unknown; MIA thumb retains Fitzpatrick's return but receives no target credit. The thumb crop locally establishes Tua from Week 8; uncropped history exposes the prototype's unresolved role turnover and misses Tua's target. No crop is silently used as a tenure reset in the full-season diagnostic.

These selected, overlapping targets and repeated full-season streams are **not independent population sensitivity/specificity**. All outputs deny automatic correction. Cold starts, offseason continuity, intended-role transitions and nested causes remain unresolved.

### Population sensitivity and cross-lane boundary

Claude's independent cross-review reported **34 potential misses among 126 retrospectively VERIFIED midseason model episodes** under its strict-onset proxy: 23 with Doubtful status or Out appearing only later, and 11 supported through reserve-list evidence instead. This is reported historical cohort sensitivity, not an end-to-end run of a production detector or independently adjudicated injury ground truth. The broad medical classification itself is under model-lane review. Preserve the strict prototype; do not loosen it to fit these cases.

Potential future corroboration includes explicitly medical reserve status, later dated injury confirmation linked back to onset, established-role continuity, dated role-change evidence and confirmed return identity. Later evidence cannot be credited to an earlier forecast before it was observed. If qualifying cause cannot be safely established, abstain.

The model and detector populations are **not interchangeable**:

| Contract | Claude historical cohort at reviewed `0a6dcb8` | Current Codex prototype |
| --- | --- | --- |
| Incumbent | Roughly four of last five, with return-history floor | Two consecutive observed starts |
| Cause | Broader retrospective Out/Doubtful/reserve-window evidence | Unique injury-bearing Out row at onset; not prospectively certified |
| Timing | Same-season and 44 offseason returns | Within-season only; zero offseason representation |
| Role changes | Primarily inferred from historical return boundary | Explicit disqualifiers/conflicts abstain; full role turnover unresolved |
| Repeated/nested | Fresh model windows, evaluation ends on renewed absence | Distinct onset IDs; unresolved injured replacement taints |

The independent model cross-review found much smaller benefit on a detector-like qualifying-Out-at-onset subset: 109/170 across both timings, with the quality-gated research candidate's Brier delta about −0.000185 overall / −0.000471 held-out versus −0.001383 / −0.002124 on the broader cohort. That subset is a separate sensitivity definition from the reported 34/126 status proxy; it is not validated prototype recall. These model-lane figures are decision support only, not a candidate adoption or new fit in this lane.

**Model effect estimates cannot be transferred unchanged onto the current detector population.** A future implementation specification must reconcile DETECTOR ELIGIBILITY POPULATION with MODEL VALIDATION POPULATION, including cause/role, cross-season continuity, delayed activation and source finality, before production authorization.

### Reproduce offline

```text
node scripts/audit_md03_qb_events.mjs
node scripts/test_md03_qb_events.mjs
python -B research/md03_build_sample.py SOURCE_DIRECTORY OUTPUT.json
```

CLI output contains the cropped and uncropped evaluations of the same named targets. Builder validates all frozen source hashes/sizes and reproduces the labeled fixture/full-season streams from local files, without fetching. Preserve original bytes or verified mirrors; mutable assets must match. Selected committed rows remain enough for replay if upstream disappears. Present-day historical files/pages do not establish pregame historical availability.

## 9. Freshness/finality/retractions (production prerequisites)

[Publisher schedule](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html) describes five-minute schedule refresh; daily injury/roster/depth; repeated daily snaps; game-day/nightly PBP plus midweek corrections. These are not delivery SLAs. Direct release timestamps above were inspected. Current-era participation is postseason-only.

Proposed conservative barrier, not chosen implementation:

1. Complete game/calendar and reconciled actual starter plus required participation/workload. Future starter guesses/live scores are not finalized starts.
2. Immutable fetched bytes/hash, retrieval time, publisher update, row-modified/effective time if present, event/game time and coverage-through-game. **Never backdate retrieval to row modification.** Current injury file needs prospective snapshots because row modification is absent.
3. Joint watermark covers all required calendar/start/cause/role/transaction evidence. New depth data cannot rescue old injury/roster data. Unknown lag, crosswalk, coverage or role continuity blocks.
4. **Return confirmation / activation constraint (unselected):** reliable current confirmation follows a completed start. Pregame “expected to start” is not a verified return. Conservative activation may be no earlier than the following game, after all required evidence is finalized. The model-lane delayed-activation sensitivity retained most measured signal; that supports investigating delay, not an adopted policy or a production forecast claim. Future validation must use actual observation times and the selected activation contract.
5. Prefer reconciled delayed postgame/midweek evidence over immediate activation. Wednesday/Thursday PBP corrections help but aren't absolute finality. Short turnarounds/daily feeds may mean delayed/no correction.
6. Causal evaluation uses snapshots available before forecasts. Retrospective news, final starter fields, later injury revisions and season-aggregate leaders cannot be credited at onset.
7. Source correction creates new evidence revision. Replay, supersede/retract old event, revoke unsupported future eligibility and preserve audit trail. Historical rating correction policy requires separate model/owner direction. No production cache/history hook implemented.

## 10. Rights/access/economics

Public access is not clearance. [nflverse terms](https://nflverse.nflverse.com/#terms-of-use) distinguish MIT software from owner-governed NFL data. [nflverse-data license](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md) is CC BY 4.0; upstream scope still needs review. Inspected nfldata root had no separate LICENSE; another repository's file is not an express grant for everything. This is a provenance inventory, not a legal determination.

| Route | Cost/auth/limits | Timing/history | Rights/redistribution/FORCE status |
| --- | --- | --- | --- |
| nfldata schedule | Free public raw download, no auth used; hosting limits, no contractual polling SLA established | Historical 2016–2022/current 2026 inspected | Factual research feasible; express nfldata/upstream production permission **UNKNOWN** |
| nflverse injury/roster/depth/PBP | Free public assets, no account/subscription; GitHub API metadata quotas differ from downloads; no event-feed contractual rate limit verified | Injury historical assets inspected 2016–2022 and 2026; 2025 metadata present; PBP library documents 1999+; depth historical schemas differ | Repository CC BY 4.0 attribution; upstream/public-product scope needs review. **Not cleared/adopted**; minimize raw redistribution |
| nflverse snaps/PFR | Free release, no direct PFR scrape; no auth used, no SLA verified | 2020/2021/2022/2026 snapshots inspected | PFR upstream automation/redistribution permission **UNKNOWN for FORCE**; crosswalk/completeness needed |
| nflverse participation | Free cached release/no auth; hosting limits/no SLA | Loader 2016+; NGS pre-2023, FTN current-era postseason only | Explicit **CC BY-SA 4.0**, attribution to FTN Data via nflverse or NFL NextGenStats via nflverse. Redistribution/adaptation share-alike implications need review; not live |
| Official NFL/club pages/PDFs | Free public reading; machine auth/rate/SLA unknown | Dated reports/transactions; historical machine coverage/retention inconsistent or unverified | Sample [2016 gamebook](https://static.www.nfl.com/image/upload/v1677630400/gamecenter/10012016-1106-013b-30ec-6b0227774ca7.pdf) limits use to assisting media coverage absent written permission. Commercial automation/redistribution **not cleared** |
| ESPN public machine endpoints | Public availability plausible; auth/rate/SLA/price contract unknown | Supported historical/event coverage not established | Production/redistribution rights **UNKNOWN**; undocumented access is not authorization |
| [Sleeper](https://docs.sleeper.com/) | No token; docs non-commercial free, guidance under 1,000 requests/min; commercial licensing discussion required | Player-cache guidance daily; no authoritative historical NFL event contract shown | FORCE commercial/public use **UNKNOWN/not cleared**; fantasy league transactions are not NFL transactions. No contact made |
| [SportsDataIO NFL API](https://sportsdata.io/nfl-api), conditional paid fallback | Commercial offering exists; applicable price/auth/quota/retention and required starter/cause/transaction coverage **unestablished** | Exact finality/history need verification | Price **UNKNOWN**; affordability **not established**. No trial/key/subscription/sales contact/purchase |

Paid fallback was inspected only because a complete adequate unattended free route was not established across reconciliation, cause/role/transactions/finality and rights. This does not prove payment necessary. Free-route proof comes first; only if inadequate should an owner-approved modest-budget paid evaluation proceed. Generic vendor NFL coverage is not proof of exact semantics; unknown-price data is not called affordable.

## 11. Owner choices and prerequisites

Open: qualifying cause set (injury/illness/other); starter tenure and meaningful-absence threshold; official-start versus material participation return; split roles/limited returns; required sources and rights clearance; delayed activation/freshness policy; free-route adequacy criteria and numeric modest budget if needed; offseason/nested episodes and transaction/role termination.

Separate model work must establish attributable replacement degradation, no similar/better-replacement correction, causal held-out magnitude/cap/decay and suppression. V33 is not assumed valid midseason. Independent validation and owner acceptance precede separately authorized UX-19 removal.

Recommended **separate owner-directed** next step: independent review, then a bounded prospective free-source adapter proof that archives watermarks and verifies all-team starts/cause/role changes on held-out injury/benching/transaction cases. Resolve rights/completeness before source selection. Unknown cases stay no correction. No second tranche starts here.

## 12. Validation and integration boundary

Only research artifact, local-file builder, frozen research fixture, pure diagnostic, offline CLI/test, sorted catalog entry, testing note and MD-03 evidence note. No model, production data, assets, server, Worker, public/generated or UI changes. No runtime hooks/dependencies; research code is not loaded by index or public build.

Focused regression covers 32-team symmetry/no name branches, byes, missing/conflicting evidence, repeated and sequential two-QB episodes, nested-role abstention, explicit permanent/benching/rookie/trade/release/rest/suspension/rotation changes, timestamp gaps, retractions, labeled target matching, uncropped diagnostics and determinism. The one-start-establishment and tainted-candidate mutants are now killed, as are identity-name overclaim, hidden cross-season reason and any-episode scoring probes. A duplicate-onset-support mutant remains candidate-equivalent: the independent duplicate guard taints the episode and prevents a qualifying return even if onset support is broadened. No artificial behavior was added to kill it; the onset-support diagnostic flag can differ while candidate/abstention behavior remains the same. Local-file rebuild matches fixture and rejects mismatched hashes. Authoritative LF results are in [testing](scripts/TESTING.md). No fully validated production eligibility, selected source, finalized design or implemented correction is claimed.
