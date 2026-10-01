# UX-14 public explanation inventory and owner disposition

Roadmap item: `UX-14` (public methodology depth). Decision status CONFIRMED; this document is the required inventory and classification step. Prepared 2026-10-01 on `claude/roadmap-lane` from `main @ 8fc1f87`.

**No approved UX-14 removal, relocation or simplification has been implemented.** The owner disposition below records approval of the R/D lists and the simplification direction. Implementing them still needs its own separately authorized content tranche. Technical/model documentation stays available internally. UX-16's separately reviewed prototype-positioning change is the only production edit in these lanes.

## Owner disposition (2026-10-01)

Recorded from the owner's message on 2026-10-01. It approves the list; it does not authorize the content tranche that implements it.

- **A. REMOVE FROM PUBLIC: R1–R9 approved.** For R3–R5, remove the internal wording only. Honest user-facing failure and staleness communication stays, as concise plain English such as “some inputs are delayed”, “FORCE did not load completely, please reload” and “last good data is being shown”.
- **B. RESERVE FOR DEEPER: D1–D9 approved. D10 approved with a condition:** move the detailed historical/correction rationale deeper, and keep a short public statement somewhere appropriate that automatic QB correction is applied only in verified cases. `UX-19` removes the public QB-return tool; it does not hide the limited verified automatic correction inside the model.
- **C. SIMPLIFY PUBLIC: overall direction approved** for the listed groups: concepts instead of formulas; human football language instead of provider/model jargon; plain-English continuity and staleness explanations; “thousands of simulations” rather than public-facing “Monte Carlo”; market transparency kept, without implementation dumps. This does not resolve `UX-18` placement or any other open design gate.
- **D. Other gates unchanged:** `UX-08`, `UX-12`/`UX-26`, `UX-15`, `UX-17`, `UX-18`, `UX-19`, `UX-31` and other existing gates stay under their own roadmap items.
- **Section E findings:** C1, C2, C4 and C5 are confirmed findings, reported in the lane handoff and not implemented by this lane. C3 remains INVESTIGATE under `UX-10`/`UX-18`.

## Scope and method

- Every public render path in `assets/app.js` was traced from `render()` (home, rankings, QB rankings, divisions, playoffs, slate, games, matchup, teams, team page, update, Roster Lab, Method, About), plus the shell (`layout()`), loader (`index.html`), integrity/runtime gates, PNG export overlays and visitor-reachable Worker messages (`src/index.js`).
- Included: paragraphs, notes, footnotes, tooltips (`title`), chips, empty/status/loader text, warnings, and labels that are themselves internal jargon. Plain column headers and numbers are omitted.
- Text gated by `USE_HASH_ROUTING` or a localhost check is listed separately as local-only; it is not public.
- Line numbers refer to `8fc1f87`. Key references were re-checked against source; template text is abbreviated with `…` and `${…}`.
- The prototype badge, footer wording and About "Prototype name" warning are not classified here. They were removed in this same tranche under the already-decided `UX-16`.

Classes (from the roadmap): `KEEP PUBLIC`, `SIMPLIFY PUBLIC`, `REMOVE FROM PUBLIC`, `RESERVE FOR DEEPER / FUTURE PAID LAYER`. Limitation and market-benchmark transparency is a `PRESERVE` constraint and is never proposed for removal; at most it is simplified.

## Owner-approved content disposition

The owner approved R1–R9, D1–D9, D10 with its public-disclosure condition, and the overall simplification direction on 2026-10-01. The conditions above govern the tables below. This list approval does not authorize implementation; a separately authorized content tranche is still required.

### A. Approved REMOVE FROM PUBLIC

| # | Surface | Source | What it is | Retained internal destination |
| --- | --- | --- | --- | --- |
| R1 | Team page, FLAG view, "DATA STATUS" sub-line | `teamDiagnosticPanel` app.js:3276 | Prints raw `pen.source`, e.g. "V97 canonical game-row aggregation + same-model nflfastR WPA … capped-z 40/25/20/15 scale" (strings from `model/live_profiles.js`) | Strings stay in `live_profiles.js` and debug payloads; show only LIVE/UNAVAILABLE |
| R2 | Update page team card, pass-rush source | `metricFreshness` app.js:2286 | Raw provider IDs such as `ftn-play-level`, `statrankings-current`, `pfr-advanced`, `nflverse-weekly-disruption` | Provider IDs stay in data/diagnostics; public shows "current" and games covered |
| R3 | Shell warning banner (public via snapshot warnings) | `src/index.js:206`, `:214` → app.js:550 → `layout` 3819 | "${feedKey} refresh failed; retained previous snapshot", "…QB input unavailable, old-schema fallback rejected" with internal feed keys | Worker warnings stay in snapshot metadata/logs; public gets a generic "some inputs are delayed" |
| R4 | Shell warning banner (stale-snapshot live fallback) | `refreshLiveMetrics` app.js:769-777 | "nflverse weekly disruption fallback will be used", "automatic current-pressure scrape failed; manual browser/Codex override is empty", Game Flow fallback text | Same generic public message; strings remain for local diagnostics |
| R5 | Runtime error gate | `runtimeModuleBlocked` app.js:5233 | "Required model modules are missing: forecast engine, score normalizer…" and "Reload the app from the complete V82 bundle" | Keep a plain "FORCE did not load completely, please reload"; module list stays in console/diag |
| R6 | Rankings units view, QB tooltip | `rawUnitCell` app.js:2491 | "…Use FORCE_QB_DEBUG(team) for both values." (points visitors to a console function) | Debug hook stays; also part of `UX-19` |
| R7 | Matchup duel note (defense) | `matchupPage` app.js:3905 | "36% coverage · 16% pass rush · 28% run defense · 20% pts/drive" repeated as a per-team note | Weights stay in Method deeper layer/`model/README.md` |
| R8 | About glossary, first "FORCEcast" entry | `names` app.js:4286 | Duplicate of the next entry (4287) | n/a (duplicate) |
| R9 | About "Brand principle" notice | `names` app.js:4291 | Internal brand guideline ("use FORCE where it adds meaning…") | `BRAND_FORCE.md` already holds it |

`UX-19` public QB-return surfaces (QB Return Lab panel, `quickQbButton`, "QB return" rankings column, scenario notes) would also leave public view, but that removal is decided separately under `UX-19`, not by this inventory. They are listed in section D.

### B. Approved RESERVE FOR DEEPER / FUTURE LAYER

| # | Surface | Source | Content | Internal destination today |
| --- | --- | --- | --- | --- |
| D1 | QB Rankings default note | `qbRankingsPage` app.js:4101 (second half) | Recency multipliers 2.00x/1.75x/1.50x/1.25x, 40%, ±4 cap, 75/25 pressure split | `CHANGELOG_V137/V139/V140/V148.md`, `model/live_profiles.js` |
| D2 | QB Rankings footnote (~330 words) | `qbRankingsPage` app.js:4103 | 1.20x expansion, leave-one-matchup-out, prior/continuity, pressure proxy rules (FTN) | Same changelogs; keep 1-2 plain column definitions public |
| D3 | Method: offense and defense weights | `model` app.js:4235-4236 | 45/25/15/15 and 36/28/20/16 | `model/README.md`, changelogs |
| D4 | Method: per-unit mechanics | `model` app.js:4240 | QB/receiver/RB construction details | Changelogs and source |
| D5 | Method: FORCE Adaptive research block | `model` app.js:4226, 4254-4266 | Adaptive research cards, formula strip, per-team "Adaptive team state" table | Research docs; flagged `UX-18` |
| D6 | About glossary "FORCE Adaptive" | `names` app.js:4288 | Research-only feature in the public glossary | Same; flagged `UX-18` |
| D7 | Team Advanced view "RAW ELO" sub | `teamDiagnosticPanel` app.js:3291 | "Base snapshot N · bridge ±N" | Source/diagnostics |
| D8 | Team Advanced view "MARKET EFFECT ON TEAM RATING" | `teamDiagnosticPanel` app.js:3296 | Adaptive market adjustment in Elo; see conflict note C3 | Research docs; flagged `UX-18` |
| D9 | Game card adaptive detail | `marketAdjustmentLabel` app.js:2998-3003 | "no adaptive line move" / "toward X by N pts" | Flagged `UX-18` |
| D10 | QB Return Lab cautious-correction rationale | `qbCarryoverPanel` app.js:1316 | Historical evidence for the automatic correction | Detailed rationale reserved for a deeper layer. Mandatory short public statement survives: automatic QB correction is applied only in verified cases. Placement and wording await the separately authorized content tranche; `UX-19` removes the public tool, not this disclosure. |

### C. Approved SIMPLIFY PUBLIC direction (keep the idea, cut formulas, providers or jargon)

The full list is in section F; the largest groups are:

1. **Luck weights** (60/20/15/5) in the rankings/team Luck notice (app.js:3252), matchup context card (3113) and Method (4246). Keep the definition and the "a great team can look unlucky" idea.
2. **Pass-rush provider cascade** (FTN, StatRankings, Pro Football Reference, nflverse) in units tooltips (2497, 2506, 2516) and matchup notes (`passRushRateLabel` 2257-2267). Keep the rate, as-of date and the "missing data is not treated as zero" limitation.
3. **Current-season vs preseason blend percentages** (`liveProfileStatus` via 3884-3887, 3292) and the Method blending fractions (4239). Keep "early games are steadied by the preseason baseline".
4. **Status/freshness vocabulary**: "canonical snapshot", "bootstrap", "live fallback", "last known good", "degraded", raw error strings (refreshText 795-807, `connectionLabel` 811-815, `layout` 3817-3819, `dataIntegrityBlocked` 2424-2426, Update page 2473-2478). Keep the honest stale/failed messaging (`PRESERVE`), in plain words.
5. **Simulation mechanics**: "Monte Carlo" and counts (Playoffs 3780, matchup 3933, Method 4232). Keep "thousands of simulations" and "the exact score is less certain than the line" (`UX-20` example wording).
6. **Market blend wording** across game card (3847), matchup (3895, 3932), team Advanced (3295) and Method (4232). Disclosure stays; **placement is `UX-18` and remains an owner decision**. This inventory proposes no placement.
7. **Unexplained internal labels**: raw Elo beside FORCE Score (home 3969, team hero 4143, schedule 4162, Roster Lab 4199), "Since base", "2025 record*" (asterisk with no footnote), "Vegas wt.", "Causal EPA / WPA", "Offense composite", "Pts/drive prevention", "FORCE ADAPTIVE" badge, "Game Flow · Research", "display-only", "presentation-only", "matchup mirror", "validated QB signal".

### D. Items owned by other gates (flag only, no proposal here)

| Gate | Inventory rows | Note |
| --- | --- | --- |
| `UX-19` public QB-return removal | `qbCarryoverPanel` 1274-1316; `quickQbButton` 1262-1267 on home (incl. hard-coded KC button at 3978), rankings, teams, team hero, matchup hero; rankings "QB return" column 3333; scenario notes 2228, 2491, 2526; team hero overlay chip 4141 and "base projection" 4144; matchup "returning-QB adjustment active" 3932; Method status card clause "manual what-if available on team pages" 4252; Teams intro "what-ifs" 4118 | Method 4247-4251 describes the underlying automatic correction, which stays. Whether QB Rankings Customize is part of the removal is unresolved; the roadmap says to distinguish it (`UX-08`). |
| `UX-18` market-blend visibility | Rows tagged UX-18 in section F | Owner chooses placement; transparency must not drop. |
| `UX-15` Update/status placement | Update page rows, shell status rows | Wording can be simplified independently of placement. |
| `UX-17` matchup graphics | Donut tooltip 2565, footnote 2602 | The "not a FORCEcast input" limitation stays whichever graphic is chosen. |
| `UX-12` / `UX-26` scores | Score notes 3933-3934, quarter table 2964-2968, rematch rows | No score-method change implied. |
| `UX-31` expanded name | index.html:17, home eyebrow 3974, About 4279, export alt 4346 | Inventory only; name unchanged. |
| `UX-20` voice | Em dashes in public text: QB Rankings unavailable rank/tooltip fallback (4102), export FLAG overlays (5064, 5075). Provider names: see C2, R2-R4, game card `Source: ${lineSource}` (3847). | Voice changes ride with the approved content tranche. |

### E. Conflicts found while inventorying (candidates, not fixes)

- **C1. Duplicate explanations on one screen.** The rankings FLAG view shows `flagIntroPanel` (3136), the FLAG `diagnosticNotice` (3253) and the sort hint (3144) at once, each restating "0 to 100, 50 neutral". Divisions (3771) and Playoffs (3780) carry near-identical simulation notes. The footer (3820) repeats the rankings note (4033).
- **C2. Raw implementation strings reach visitors** (R1-R5). These look accidental rather than deliberate disclosure.
- **C3. Possible semantic contradiction.** Matchup KPI (3896) and Method (4229) say betting lines "never change" the FORCE Score; the team Advanced view (3296) shows "MARKET EFFECT ON TEAM RATING" in Elo. It is likely a research-only Adaptive quantity, but the public labels conflict. This is `UX-10`/`UX-18` territory; no semantics were changed.
- **C4. "Live metrics refreshed; Stale data: …"** (app.js:550-554 → 3819) can show a "refreshed" prefix in front of a stale-data warning.
- **C5. Stale runtime text** "complete V82 bundle" in the public runtime gate (5233); the app identity is V149.

## F. Full inventory by surface

Columns: Element · Source · Text · Classification · Flags. The owner disposition above governs R/D classifications and simplification direction; other gates remain separate. `P` = PRESERVE (limitation/benchmark transparency), `DUP` = repeated elsewhere.

### Loader and shell (every page)

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Boot eyebrow | index.html:17 | "Football Objective Rating & Comparative Efficiency" | KEEP | UX-31, DUP |
| Boot status | index.html:19-21; boot 5506 | "Loading current ratings…", step chips, "Finishing live data sync…" | KEEP | |
| Header logo alt | `layout` 3811 | "FORCE - approved Vector-F mark" | SIMPLIFY | internal asset name |
| PNG button tooltip | `layout` 3812, 3817 | "Save this page as a PNG" | KEEP | |
| Refresh tooltip (public) | `layout` 3817 | "Check the latest published canonical snapshot" | SIMPLIFY | UX-15 |
| Status pill | `connectionLabel` 811-815 | "Live data" / "Stale data · last known good" / "Live data degraded" / "Offline" / "Live data unavailable" / "Connecting…" | KEEP (soften "degraded") | P, UX-15 |
| Refresh meta line | `refreshText` 795-807 | "Checking latest published snapshot…", "Initial load failed · ${raw error}", "${check} · checked ${age} · Data updated ${age} · stale/degraded" | SIMPLIFY | P, UX-15 |
| Snapshot check results | `refreshPublishedSnapshot` 663-670; `recoverMissingSnapshot` 629, 646 | "Snapshot unchanged · stale data", "Live fallback loaded", "Snapshot and live fallback unavailable · snapshot checks continue" | SIMPLIFY | P, UX-15 |
| Warning | `layout` 3819 | "Refresh failed. Kept the last good data." | KEEP | P |
| Warning | `layout` 3819 | "Live-data bootstrap failed: ${raw error}" | SIMPLIFY | P |
| Warning | `layout` 3819 | "Some live metrics could not refresh (${statsError}). Current values are suppressed unless a fresh or last-known-good live snapshot is available." | SIMPLIFY | P |
| Warning | `layout` 3819 via 550-554 | "Live metrics refreshed; ${statsWarning}" incl. stale-snapshot sentence | SIMPLIFY (keep stale sentence) | P, C4 |
| Warning content | src/index.js:206, 214 | Feed-key refresh/schema messages | REMOVE (R3) | UX-20 |
| Warning content | `refreshLiveMetrics` 769-777 | nflverse/scrape/Codex override/Game Flow fallback strings | REMOVE (R4) | UX-20 |
| Footer | `layout` 3820 | "FORCE \| Ratings and forecasts refresh with current data when available. FORCE Score measures team strength. Luck and FLAG add context but do not directly change the public forecast. See Method…" | SIMPLIFY ("public forecast" implies a private one) | P, DUP 4033 |
| Integrity gate | `dataIntegrityBlocked` 2424-2426 | "Current FORCE data unavailable"; "…Rather than quietly mixing in old 2025 numbers…"; "What to do: … last-known-good server snapshots are used automatically…"; "Open Update Center" | SIMPLIFY | P, DUP 2478 |
| Runtime gate | `runtimeModuleBlocked` 5233 | "Runtime integrity gate", module list, "V82 bundle" | REMOVE/SIMPLIFY (R5) | C5 |

### Home

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Eyebrow | `home` 3974 | Expanded name | KEEP | UX-31 |
| Hero copy | 3975 | "NFL strength, explained." / "Ratings, forecasts, matchup edges, and roster what-ifs." | KEEP | |
| Scale legend | 3976 | "FORCE Score: 50 is average \| 0 and 100 are theoretical limits \| red 0 to 40 \| yellow 41 to 70 \| green 71+" | KEEP | DUP 3251 |
| Card note | 3978 | "Views: Strength · Luck · FLAG · Units · Advanced" | KEEP | |
| Row label | 3969 | "${n} Elo" beside FORCE Score | SIMPLIFY | |
| Status/empty | 3979-3983 | LIVE/OFFLINE pill, "No games loaded.", "No finals yet.", "forecast vs final", "upcoming" | KEEP | |
| KPI | 3986 | "BIGGEST RISER … since the base snapshot." | SIMPLIFY | |
| KPI | 3987 | "FORCE PREDICTION ERROR 0.2170 … Historical test on games the model was not trained on. Lower is better." | KEEP | P |
| KPI | 3988 | "CLOSING-LINE PREDICTION ERROR 0.2095 … Historical benchmark from the betting market." | KEEP | P, UX-18 |
| QB quick button | 3978 via `quickQbButton` | Hard-coded KC QB fix button | (UX-19) | UX-19 |

### Game cards (Home and Games)

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Badges | `gameCard` 3830-3831; `sourceLabel` 3364-3369 | "FINAL", "THIS WEEK", "FORCE ADAPTIVE" / "FORCEcast" | SIMPLIFY ("FORCE ADAPTIVE") | UX-18 |
| Labels | 3842-3845 | "Pred line", "Pred score", "Final", "FORCE change", "Immediate rematch" | KEEP (rematch needs context) | UX-12 |
| Market note | 3847 | "The betting market gives the home team N%; FORCE Adaptive shifts that to N% and lets the market supply N%…; Source: ${lineSource}" | SIMPLIFY | UX-18, UX-20, P, DUP 3895/3932 |
| Adaptive fragment | `marketAdjustmentLabel` 2998-3003 | "no adaptive line move" / "toward X by N pts" | RESERVE (D9) | UX-18 |
| CTA / aria | 3832, 3848 | "Open matchup report →" | KEEP | |

### FORCE Rankings (all views)

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Heading copy | `rankings` 4026 | "All 32 teams" / "Start with strength. Open the other views for context." | KEEP | |
| Strength notice | `diagnosticNotice` 3251 | "FORCE Score runs from 0 to 100, with 50 representing an average NFL team…" | KEEP | DUP 3976 |
| Luck notice | 3252 | "…That accounts for 60% of the score. FLAG contributes 20%, fumble recoveries 15%… 5%…" | SIMPLIFY | DUP 3113, 4246 |
| FLAG intro | `flagIntroPanel` 3136 | "Flag Leverage & Advantage Gauge" / "What did the penalties actually called do…" / "…It measures impact, not whether a call was right" | KEEP | P |
| FLAG notice | 3253 | Repeats the intro, plus FLAG Swing definition | SIMPLIFY (keep Swing definition) | P, C1 |
| FLAG sort hint | `penaltyImpactSortControl` 3144 | "FLAG order — 50 is neutral…" | SIMPLIFY | C1, UX-20 |
| FLAG labels | 1607-1614, 1630 | "Strong net harm … Strong net benefit", gauge aria | KEEP | |
| FLAG columns | `rankingHeader` 3335; `rankingRow` 3355 | "Causal EPA / WPA", "WPA pp/g", "Net erased TDs" | SIMPLIFY | |
| Units notice | 3254 | "…Pass rush uses the freshest reliable pressure source available; if detailed pressure data are missing, FORCE can use current QB hits and sacks…" | SIMPLIFY | P |
| Units tooltip (pass rush unavailable) | `rawUnitCell` 2496-2497 | "Pass rush is unavailable: ${reason}. FORCE first looks for current pressure data, then…" | SIMPLIFY | P |
| Units tooltip (pass rush) | 2506, 2516 | "${n}% pressure rate \| ${provider} \| current through ${date} \| …% this season and …% from preseason…" | SIMPLIFY | UX-20 |
| Units tooltip (QB) | 2491 | "…returning-QB scenario overlay… Use FORCE_QB_DEBUG(team)…" | REMOVE (R6) | UX-19 |
| Units note | 4033 | "Changes in these unit ratings feed into the overall FORCE Score, but no single unit is allowed to swing the team rating without limit." | KEEP | |
| Advanced notice | 3255 | "…The market-comparison score stays hidden until a team has at least four games with usable closing lines." | KEEP | P, UX-18 |
| Advanced/Strength columns | 3336-3337, 3326 | "Elo", "Since base", "2025 record*", "Vegas wt." | SIMPLIFY | UX-18 |
| Column | 3333 | "QB return" | (UX-19) | UX-19 |
| Bottom note | 4033 | "FORCE Score is the main team-strength rating… Luck and FLAG are context and do not directly change the forecast." | KEEP | P, DUP 3820 |

### QB Rankings

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Intro | `qbRankingsPage` 4100 | "FORCE's standard quarterback rating… Main rankings require the listed QB to account for at least 60% of his team's QB dropbacks." | KEEP | P |
| Default weights line | 4101 | "Default: 30% EPA/play · 30% ANY/A · 20% Success Rate · 10% QB rushing value · 10% CPOE, then opponent-strength, pressure-context, and current-season recency adjustments." | SIMPLIFY (weights match the Customize sliders, so the ingredient list can stay) | |
| Customize note | 4101 | "Your weights change this ranking only. They do not alter FORCEcast, team FORCE ratings, or the canonical QB unit… canonical leave-one-matchup-out…" | SIMPLIFY (keep first sentence) | P, UX-08 |
| Default note | 4101 | Recency multipliers, ±4 cap, 75/25 pressure split | RESERVE (D1) | DUP 4103 |
| Column labels | 4102 | "Raw QB Rating", "Opponent/Pressure/Recency Adjustment", "EPA/play", "ANY/A", "CPOE" | SIMPLIFY (glossary or tooltips) | |
| Pressure tooltip | 4102 | "75% protection difficulty / 25% performance under pressure · …" | SIMPLIFY | UX-20 |
| Unavailable rows | 4102 | rank "—", "Unavailable" | KEEP | UX-20 (em dash) |
| Footnote | 4103 | ~330-word methodology incl. 1.20x expansion, proxy rules, FTN | RESERVE (D2) | P (proxy limitation), UX-20 |

### Divisions and Playoff Picture

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Headings | 3771, 3780 | "Where each division is most likely to finish from here." / "What the season most plausibly looks like from here…" | KEEP | |
| Chips | 3769-3780 | "${n} simulated seasons", "leader odds", "7 playoff spots", "Out" | KEEP | |
| Divisions note | 3771 | "…The displayed standings come from one simulated season that is closest to the average result… NFL tiebreakers are applied…" | KEEP | P, DUP 3780, UX-10/UX-11 |
| Playoffs note | 3780 | Same idea with "representative Monte Carlo season" | SIMPLIFY (unify with Divisions, drop "Monte Carlo") | P, UX-20, UX-11 |

### FORCEcast Slate and Games list

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Slate heading | `forcecastSlatePage` 3804 | "Weekly forecast board" / "Predicted final score and win probability for every game in the week." | KEEP | UX-12 |
| Slate labels/empty | 3797-3804 | "Pred final", "No games loaded for this week.", row aria | KEEP | |
| Games heading/filters | `matchups` 4111-4112 | "Forecasts and results" / "Open any game for the full matchup.", filter labels | KEEP | |

### Matchup / FORCEcast page

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Back button | 3888 | "← Matchups" (nav calls it Games) | KEEP (rename) | |
| Hero QB buttons | 3890/3892 via `quickQbButton` | "Use auto QB fix", "…carryover correction" | (UX-19) | UX-19 |
| KPI sub | 3895 | "N% of this prediction comes from the betting market" / "FORCE only because no usable market line is available" | KEEP | P, UX-18 |
| KPI sub | 3896 | "A negative number means that team is favored… The betting line can affect FORCEcast, but it never changes the team's FORCE Score." | KEEP | P, UX-18, C3 |
| Market line value | `marketLineLabel` 2990-2995 | "No current line in feed" | SIMPLIFY | UX-18 |
| KPI sub | 3897 | "No extra division adjustment is forced." | SIMPLIFY | |
| FLAG Swing banner | `flagSwingGameBanner` 3673-3676 | "Penalty impact was large enough to be plausibly result-relevant", numeric detail | SIMPLIFY | DUP 3253, 3685 |
| FLAG Swing limitation | 3677 | "…It does not judge whether calls were correct, and it does not say penalties caused the result." | KEEP | P |
| Edges sub (upcoming) | 3900 | Offense/defense composition prose | SIMPLIFY | DUP 3254, 2602 |
| Edges sub (final) | 3900 | "Pregame and current ratings are shown on the same 0 to 100 FORCE scale." | KEEP | |
| Duel notes | 3884-3887, `liveProfileStatus` 1827-1831 | "N expected points per play \| N games from 2026 \| N% current-season evidence and N% preseason baseline…" | SIMPLIFY | |
| Duel note | `scenarioMetricNote` 2228 | "QB-return scenario · was N" | (UX-19) | UX-19 |
| Duel note | 3905 | Defense weights per team | REMOVE (R7) | |
| Duel notes | 3907, 3909-3912 | "disruption-free dropback proxy", "rush EPA/play allowed", "composite EPA" | SIMPLIFY | |
| Pass-rush notes | `passRushRateLabel` 2257-2267 | Missing-data limitation; provider names (FTN, StatRankings, Pro Football Reference) | SIMPLIFY | P, UX-20 |
| Breakdown labels | `matchupBreakdown` 2591-2600 | "Overall edge", "QB vs coverage", "OL vs pass rush"… | KEEP | P (strengths/weaknesses) |
| Donut tooltip | `matchupEdgeDonut` 2565 | "Presentation-only matchup share; not a FORCEcast input" | SIMPLIFY (keep limitation) | P, UX-17 |
| Breakdown footnote | 2602 | "Overall edge = offense profile − defense profile… The donut is not added to FORCEcast." | SIMPLIFY | P, UX-17 |
| QB data note | 3917/3921 | "QB data: ${qb} \| N expected points per play \| N completion percentage points above expectation" | SIMPLIFY | DUP 3886 |
| Context: Luck | `contextCard` 3113 | "…60% EPA scoring realization + 20% FLAG + 15% fumble recovery + 5% outcome surprise" | SIMPLIFY | DUP 3252 |
| Context: FLAG | 3114 | "${label} · Flag Leverage & Advantage Gauge · 50 neutral" | KEEP | |
| Context: Recent vs spread | 3115, `confidenceLabel` 3379-3383 | "team history, not a matchup mirror", "Adaptive data unavailable", sample caveat | SIMPLIFY (keep sample caveat) | P, UX-18 |
| Strengths & weaknesses | 3927-3928, `profileStrengths` 3099-3100 | Unit lists | KEEP | P |
| Prediction note | 3932 | "Comes from the same win probability shown above \| N% from the market and N% from FORCE \| returning-QB adjustment active." | SIMPLIFY | P, UX-18, UX-19 fragment |
| Score note | 3933 | "…25,000 possession-level simulations… Treat the exact score as less certain than the line or win probability." | SIMPLIFY (keep the uncertainty sentence) | P, UX-12, UX-26 |
| Result note | 3934 | "Actual final … margin error N · total error N." | KEEP | P |
| Quarter table | `gameFlowPanel` 2964-2968 | "Game Flow · Research", "Projected scoring by quarter", chip "display-only" | SIMPLIFY | UX-26 |
| Postgame | 3938-3946 | "What changed", "FORCE change", "Predicted rematch line… same venue hypothetical." | KEEP | UX-12 |
| Unit update labels | `unitChangeRows` 3906-3907 | "Offense composite", "Team efficiency", "Pts/drive prevention" | SIMPLIFY | |
| Data footer | 3954 | "Data: scores, lines… refresh hourly when the source data are available. Early in the season, unit ratings still keep a small amount of the preseason baseline…" | KEEP | P (check "hourly" against the 30-minute snapshot cron) |

### Teams and team page

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Teams intro | `teams` 4118 | "Rating, context, schedule, and what-ifs." | SIMPLIFY | UX-19 |
| Teams row | 4122 | "FORCE ${score} · N projected wins"; QB quick button | KEEP / (UX-19) | UX-19 |
| Hero line | `teamPage` 4143 | "Elo N [base struck] · 2025 base N · FORCE Score N" | SIMPLIFY | |
| Hero chip/button | 4141, 4143; `quickQbButton` 1262-1267 | "QB manual/auto +N Elo", "No verified QB-return preset" | (UX-19) | UX-19 |
| Record line | 4144 | "projected record · current W-L · base projection N wins" | KEEP (drop base fragment with UX-19) | UX-19 |
| View notices | `diagnosticNotice` 3251-3255 | Same as rankings | as rankings | |
| Luck KPIs | `teamDiagnosticPanel` 3263-3265 | "2025 PRIOR RECORD", "diagnostic sample"; "EXPECTED WINS…"; "LUCK SCORE 50 is neutral…" | SIMPLIFY 3263; KEEP 3264-3265 | |
| FLAG KPIs | 3268-3275 | Plain definitions of penalty effects, first downs, erased TDs, sample, yards | KEEP | |
| FLAG data status | 3276 | Raw `pen.source` | REMOVE (R1) | UX-20 |
| FLAG Swing panel | `flagSwingTeamPanel` 3684-3690 | "Result-relevant penalty games"… | KEEP | DUP 3253 |
| Units rows | `unitBoardRow` 2526-2527 | "Pts/drive prevention"; "N base · QB-return scenario" | SIMPLIFY / (UX-19) | UX-19 |
| Advanced KPIs | 3291-3296 | "Base snapshot · bridge"; blend status; "raw decayed/shrunk residual… not a matchup mirror"; "HOW MUCH THE FORECAST USES VEGAS… experimental forecast"; "MARKET EFFECT ON TEAM RATING" | RESERVE 3291, 3296; SIMPLIFY 3292, 3294; KEEP 3295 (wording) | UX-18, C3 |
| Strength KPIs | 3300-3301 | "Actual wins + remaining win chances · N currently market-informed"; "Open Roster Lab →" | KEEP | UX-18 |
| QB Return Lab | `qbCarryoverPanel` 1274-1316 | Whole panel | (UX-19); rationale text 1316 RESERVE (D10) | UX-19, P |
| Schedule rows | 4157-4163 | "N% win", "Pred …", "Rating ±N Elo", "Rematch …", "Refresh to load the full schedule." | SIMPLIFY (Elo, rematch context) | UX-12 |

### Update page (public mode)

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Heading/intro | `updateCenter` 2475 | "Published team data" / "Fresh data are published every 30 minutes. Check for the latest snapshot and review team freshness below." | KEEP | UX-15 |
| Button | 2473 | "Check latest snapshot" | SIMPLIFY | UX-15 |
| Summary | 2476 | "${n} current/preseason", "${n} need attention", refresh text | KEEP | UX-15 |
| Stale-data policy | 2478 | "How FORCE handles stale data: …does not quietly substitute an older week or a 2025 value…" | KEEP | P, DUP 2426 |
| Status chips | `statusChip` 2429 | CURRENT / PARTIAL / PRESEASON / STALE | KEEP | |
| Team card | 2482 | "N completed game(s) · through Week W", "Last team update" | KEEP | |
| Team card | 2482 | "Unit effect on FORCE: ±x.x" | SIMPLIFY | |
| Metric notes | `metricFreshness` 2279-2290 | "preseason prior"; raw provider IDs; "Week W retained · Week N pending"; "feed through Week W" | SIMPLIFY; provider IDs REMOVE (R2) | UX-20 |

### Roster Lab

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Warning | `lab` 4189 | "QB effects use the validated QB signal. Other positions are experimental." | SIMPLIFY (keep limitation) | P |
| Per-player note | 4194 | "${pos} · experimental" / "validated QB signal" | SIMPLIFY | P, DUP 4189 |
| Empty | 4194 | "No player rows in base snapshot" | SIMPLIFY | |
| Delta | 4199 | "Raw rating delta" / "scenario Elo points" | SIMPLIFY | |
| Schedule | 4201-4210 | "Remaining schedule impact", "Full remaining schedule appears after live schedule load." | KEEP | |

### Method

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Intro | `model` 4221-4222 | "FORCE starts with a team-strength rating, turns that rating into a game prediction, and checks proposed changes against games the model did not get to learn from first." | KEEP | |
| Benchmark KPIs | 4224-4225 | FORCE 0.2170 and closing-line 0.2095 prediction error | KEEP | P, UX-18 |
| Adaptive KPI | 4226 | "FORCE ADAPTIVE RESEARCH…" | RESERVE (D5) | UX-18 |
| FORCE Score | 4229 | "…Betting lines never change this score." | KEEP | P, C3 |
| New season | 4230 | "…${n}% of the gap… is pulled back toward the middle." | SIMPLIFY | |
| FORCEcast | 4232 | Weekly market share schedule 75/50/25…5%, 25,000 simulations | SIMPLIFY (disclosure stays) | P, UX-18 |
| Score adjustment | 4233 | "The displayed score is adjusted toward point totals that actually occur…" | KEEP | P |
| Unit weights | 4235-4237 | Offense/defense weights; "not four extra adjustments" | RESERVE (D3); SIMPLIFY 4237 | |
| Early season | 4239 | Half / two-thirds / four-fifths blending | SIMPLIFY | MD-01 |
| Unit mechanics | 4240 | QB/receiver/RB details | RESERVE (D4) | |
| Pass rush | 4241 | "…It does not treat missing pressure data as zero." | SIMPLIFY | P |
| Unit movement | 4243 | "When a unit gets better or worse… The effect is limited…" | KEEP | |
| Matchup edges | 4244 | How to read matchup edges | KEEP | DUP 2602 |
| Luck | 4246 | Definition plus 60/20/15/5 | SIMPLIFY | |
| QB return correction | 4247-4251 | Underlying automatic correction plus evidence cards | SIMPLIFY (keep evidence) | P, UX-19 |
| Status card | 4252 | "Automatic only for verified cases; manual what-if available on team pages." | SIMPLIFY (clause goes with UX-19) | UX-19 |
| FORCE Adaptive section | 4254-4266 | Research explanation, live research KPIs, Adaptive team table | RESERVE (D5); keep FORCECAST ERROR 4260 public | P, UX-18 |
| Promotion rule | 4268-4270 | "A new stat or adjustment does not get into the forecast just because it looks interesting…" | KEEP | P |
| Forecast inputs | 4271 | "Right now the forecast can use the core team rating, validated betting-market information, and the limited returning-QB correction…" | KEEP | P, UX-18 |

### About FORCE

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Identity image alt | `names` 4278 | "FORCE - approved Vector-F identity board" | SIMPLIFY | |
| Expanded name | 4279 | "Football Objective Rating & Comparative Efficiency." | KEEP | UX-31 |
| Positioning | 4280 | "One name for ratings, forecasts, matchup analysis, and roster what-ifs." | KEEP | |
| Glossary | 4284-4285 | FORCE Score, FORCE Rankings | KEEP | DUP 4229 |
| Glossary | 4286 | First FORCEcast entry | REMOVE (R8) | DUP |
| Glossary | 4287 | "Single public win odds, line, and score; blends market by week when available." | KEEP | UX-18 |
| Glossary | 4288 | FORCE Adaptive | RESERVE (D6) | UX-18 |
| Glossary | 4289 | "Roster Lab — Player what-if tool. Kept plain on purpose." | SIMPLIFY | UX-20 |
| Notice | 4291 | Brand principle | REMOVE (R9) | |

### PNG export overlays

| Element | Source | Text | Class | Flags |
| --- | --- | --- | --- | --- |
| Page labels | `exportPageLabel` 4320-4340 | "FORCE Rankings · ${view}"…; Update falls back to "NFL ratings & forecasts" | KEEP | UX-15 |
| FLAG overlays | `simplifyFlagForExport` 5054-5080 | "0 HARM · 50 NEUTRAL · 100 BENEFIT", "FLAG ${score or —}", "FLAG SWING — …", penalty benefit line | KEEP / SIMPLIFY 5075-5080 | UX-20; export drops the 3677 limitation sentence |
| Progress | 5130-5220, 4969 | "Preparing…", "Rendering i/n…", "PNG export failed: ${detail}" | KEEP | |

## Local-only text (not public)

`USE_HASH_ROUTING` or localhost gating keeps these off forceratings.com: the local Refresh tooltip (3817); Update page local heading, bulk-update buttons, "Collect diagnostic report" card and its messages (2473-2482, 5377-5385); `manualPressureEditor` and save messages (2438-2461); `dataIntegrityBlocked` local action "Run FORCE through serve_local.bat…" (2423-2424); the local `refreshText` suffix (807). The `refreshLiveMetrics` warnings (761-777) are normally local but can reach the public during the stale-snapshot live fallback (599), so they are in the public table as R4. Console debug hooks (`FORCE_FLAG_SWING_DEBUG`, `FORCE_LUCK_DEBUG`, `passRushDebug`) are never visible.

## Remaining implementation gates

- R1–R9 and D1–D10 disposition and the simplification direction are owner-approved with the recorded conditions. No approved UX-14 content implementation has occurred; a separate prompt must authorize its bounded scope.
- Market-disclosure placement (`UX-18`), Update placement (`UX-15`), matchup graphics (`UX-17`), expanded name (`UX-31`), QB Customize contract (`UX-08`), projection labels (`UX-10`/`UX-11`).
- New public wording. `UX-20` voice examples apply when an approved content tranche rewrites copy.
- QB Rankings copy implementation under `UX-14` must wait until the owner selects the `UX-08` Customize product contract.
- No formula, weight, model or forecast change is implied anywhere above.
