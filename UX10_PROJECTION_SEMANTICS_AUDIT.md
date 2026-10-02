# UX-10 projection semantics audit — Cycle 2

2026-10-01. Baseline: `main @ e7f08951d260a18a686171a22788760461245bae`.
Lane: `cycle2/codex-analysis`. Decision remains **INVESTIGATE**; execution is
**REVIEW**. This is internal source/evidence documentation. No public copy,
calculation, model, odds formatter, ordering, or owner contract was changed.

## Candidate assessment and bounded selection

The current roadmap was read before editing. These were the five candidates;
none was assumed open from an old audit alone.

| Item / status | Dependencies | Unresolved factual question / source paths | Eligible deliverable / evidence / overlap |
| --- | --- | --- | --- |
| UX-09 / INVESTIGATE, PLANNED | Shared snapshots; UX-08/10/19 boundaries | Does untouched Roster Lab match its claimed rating/forecast baseline? `lab`, `projected`, current rating state in `assets/app.js`. | Investigation only; same-input control matrix. Moderate overlap with public tool removal/content. |
| UX-10 / INVESTIGATE, PLANNED at selection | Shared feed/state evidence with UX-09 | Which sources, time horizons and statistics underlie projection labels? `projected`, `seasonProjection`, public renderers, `liveLuck`. | Semantic map, real-path diagnostic and behavioral regression. Low overlap while public sources stay untouched. **Selected.** |
| UX-11 / INVESTIGATE, PLANNED | UX-10 semantic map; UX-25 actual-state distinction | What controls seeds, Out, ordering, leader chips and probabilities? Season simulation and standings renderers. | Investigation only; representative versus marginal examples and options. Moderate public presentation overlap. |
| UX-12 / INVESTIGATE, PLANNED | UX-10; forecast source trace | Why can displayed scores tie beside a favored side? `exactScoreProjection`, possession simulation, score normalizer. | Investigation only; reproducible score cases. Low overlap. |
| UX-26 / CONFIRMED, PLANNED; strategy open | UX-12/10; V149 forecast | Which quarter-generation approaches preserve forecast/event consistency? Game Flow allocations and score simulation. | Approach investigation only; allocation/event comparisons. Low overlap, but prerequisite evidence is incomplete. |

UX-10 removes a factual prerequisite for UX-11, UX-25 and Phase 2 conventions.
This tranche maps existing sources and proposes labels for review. It does not
choose UX-11's primary view, implement UX-25, investigate score ties deeply under
UX-12, change the quarter strategy, or reopen UX-08's already documented contract.

## Reproduce and provenance

From the repository root:

```text
node scripts/audit_projection_semantics.mjs
node scripts/audit_projection_semantics.mjs --input offline-input.json
node scripts/run_tests.mjs --test test_projection_semantics_audit.mjs
```

The diagnostic writes JSON to stdout, uses no network and creates no repository
artifacts. The existing [VM harness](scripts/lib/force_app_harness.js) loads the
real ordered browser scripts from [index.html](index.html). Additional lexical
hooks exist only in the offline VM. Forecasts, analytic projections, the complete
5,000-run season simulation, representative selection and public HTML renderers
execute unchanged; the tool does not substitute a simplified season model.

Default cohorts are explicitly synthetic: 32 tracked team identities, three
synthetic completed weeks, and either one or fourteen synthetic future weeks.
The short cohort sets a manual KC correction of 50 Elo. The 17-game cohort uses
existing automatic correction controls. Future pairings repeat for controlled
comparison; neither cohort is a production snapshot or a realistic NFL schedule
distribution. One pair has deliberately extreme synthetic moneylines. The
historical priors, browser modules and V5 reference are tracked inputs; current
player/team rows and outcomes are fabricated and labeled as such.

Output includes Node version, exact byte SHA-256 hashes of every loaded browser
script, index, reference and diagnostic dependency, plus each serialized input's
SHA-256. `--input` additionally hashes the original input file bytes and marks
its provenance **unverified**. Required fields are `teamRows`, `playerRows`,
`schedule`, and `gameFlow`; optional fields are `priorProfiles`, positive integer
`scheduleVersion`, and `qbCarryover` controls. See the
[input fixture](scripts/lib/projection_semantics_fixture.js) for shape and the
[diagnostic implementation](scripts/lib/projection_semantics_audit.js) for output.
No bootstrap fetch, feed freshness certification or production measurement is
implied. Source hashes naturally differ between CRLF and LF copies.

Unknown teams and partial/nonfinite finals are rejected. Missing canonical QB
semantic readiness, nonfinite current ratings or invalid future forecast
probabilities produce explicit `unavailable` reports. Missing retrospective
values stay null. An actual clinch/elimination state or seed-probability source
is never fabricated from a seed, Out, rounding, or simulation extremes.

## Semantic map and all public occurrence families

Source of the application rows below: [assets/app.js](assets/app.js). Luck's
producer is [model/live_profiles.js](model/live_profiles.js), `liveLuck`.
Proposed labels are **options for owner review**, not selected public copy.

| Quantity / definition | Calculation source and inputs | Current public occurrence(s) / label | Proposed distinct public label |
| --- | --- | --- | --- |
| Actual current W-L-T | `records()` counts loaded completed schedule outcomes. | Team hero/schedule; Divisions and Playoff Picture `Record`. Luck rankings/panels use completed-game `luck.w/l/t`, with ranking fallback to base row. | Current record; identify season/time coverage where needed. |
| Analytic season-end expected win equivalents | `projected(t, ratings, delta)`: actual `w + 0.5*t` plus remaining team win probabilities from `forecastFor`. No future tie probability term. | Teams directory `projected wins`; team hero `projected record`; default team diagnostic `EXPECTED FINAL WINS`; Roster Lab `Expected wins`; QB-return panel `PROJECTED WINS` and delta in `expected wins`. | Expected season-end wins (ties count half); scenario expected season-end wins when applicable. |
| Decimal record-shaped display | Team hero formats `projected.ew` and **`17 - ew`**, each to one decimal. This is not an integer realized record or a separately estimated loss distribution. | Team hero `projected record`. | Expected season-end win equivalents, rather than implying an integer record. A record-shaped convention needs owner choice. |
| Base versus corrected analytic projection | `teamPage`: base uses `currentRatings`; displayed projection uses `ratingsWithQBCarryover(t, baseRatings)`. QB-return panel explicitly compares base versus team-corrected ratings. | Conditional team hero `base projection … wins`; QB-return panel before/after projection. | Expected wins before/after QB-return correction, naming which correction state applies. |
| Roster scenario expectation | `lab()` passes `currentRatings()` to `projected`; a player delta is applied to canonical forecast log-odds by `F.applyEloDelta`. Zero delta preserves that **input** baseline. | Roster Lab `Expected wins`, expected-win delta, and remaining-game probability changes. | Scenario expected season-end wins; explicitly disclose its rating baseline if different from the team page. UX-09 reviews that contract. |
| Monte Carlo mean final win equivalents | `seasonProjection().teams[t].expectedWins`: mean of actual-plus-sampled wins across 5,000 runs; same league-active forecast probability family as analytic expectation, finite sampling error. | Divisions and Playoff Picture `… exp. wins`. | Simulated mean season-end wins, or an owner-approved use of the analytic expectation with its source stated. |
| Representative integer W-L-T | `projectedPathRecord` / `projectedRecord`: **one common simulated season**, selected by minimum squared distance of the league win-equivalent vector to the Monte Carlo mean; ties in distance use smaller maximum team deviation, then first encountered run. | Divisions and Playoff Picture `Projected`; explanatory notes on both pages. | Representative simulated record. This is not each team's mode, an independently rounded expectation, or the joint most-probable season. |
| Representative division finish | Same selected season's `divisionFinish`; only absent entries fall back to a marginal finish mode. Normal 32-team path supplies every finish. | Divisions `Proj`; row ordering; first row's `leader odds` chip attaches that team's marginal title odds. Intro says `most likely to finish`. | Representative division finish; representative leader's division-title chance. “Most likely” is not established by the selector. |
| Representative playoff seed / Out | Same selected season's `seedByTeam`; absent team is `Out`. `projectedDivisionWinner` supplies `DIV`. | Playoff Picture `Proj seed`, `DIV`, Out, row class/dimming and primary seed ordering. | Representative simulated seed / outside this representative bracket. Out is not actual elimination. |
| Marginal playoff probability | `100 * playoffs / 5000`, all simulations. | Playoff Picture `Playoffs`; secondary ordering among Out rows. | Playoff chance. Keep separate from representative seed and actual state. |
| Marginal division-title probability | `100 * divTitle / 5000`, all simulations. | Divisions `Division` and leader chip; Playoff Picture `Division`. | Division-title chance. Same source across both pages. |
| Marginal bye probability | `100 * bye / 5000`, seed 1 in all simulations. | Playoff Picture `Bye`. | First-round-bye chance. |
| Displayed postseason percentage | `pct(v)` currently does only `Math.round(v) + '%'`. There is no actual-state argument or UX-25 floor/ceiling. | Every postseason odds cell and division leader chip above. | Same odds label with an explicitly authorized actual-state-aware formatter in future UX-25 work. |
| Seed probability | Simulation maintains internal `stats[t].seed` counts, but does not export a seed probability/distribution; `projectedSeed` is not that distribution. | No seed-probability column or public source found. `Proj seed` is the representative quantity above. | Seed chance only if a separately authorized implementation exposes the relevant marginal distribution. |
| Actual clinch/elimination state | No authoritative state field/calculator is consumed or returned by the traced projection paths. Binary future-outcome sampling and terminal tiebreak fallbacks are not an actual-state proof. | No actual-state gate found in postseason rendering. | Clinched / eliminated only from a separately established authoritative state contract. **Unavailable here.** |
| Retrospective completed-game expected wins | `liveLuck.exp_w`: sum of available postgame deserved-win probabilities, plus missing-game count times the team's completed-game aggregate Pythagorean win fraction. With no performance probabilities, all games use the latter. | Team Luck diagnostic `EXPECTED WINS`; matchup context cards `… expected wins`; Luck rankings `Expected record`; `FORCE_LUCK_DEBUG.expectedWins` is diagnostic, not another public forecast. | Performance-implied wins so far; performance-implied record so far. Do not merge with season-end forecast wins. |
| Rounded retrospective record | Luck ranking clamps rounded `exp_w` to completed-game count and displays rounded wins versus count minus rounded wins. It does not preserve a separate expected tie count. Luck KPI/context rounds `exp_w` to an integer. | Luck rankings `Expected record`; team Luck KPI and context cards. Sorting uses raw `exp_w`, not the rounded display. | Performance-implied wins so far, with a separately reviewed record/rounding convention. |
| Pregame / Pythagorean audit expectations | `liveLuck.pregame_exp_w` sums historical independent probabilities (missing history uses 0.5); `pythagorean_exp_w` uses aggregate PF/PA with exponent 2.37. Neither is `projected.ew`; partial performance coverage changes `exp_w`. | Diagnostic audit fields only; the public Luck description does not identify each branch explicitly. | Retrospective audit expectations with named method and coverage; retain internal unless separately authorized for public disclosure. |

There is no additional public numeric `expected record`, `most-likely record`
or `base projection` source outside these occurrence families in the canonical
app/index search. The narrative “most likely” and “most plausibly” on standings
pages are interpretations of the representative output, not computations of a
mode. Exported division/playoff layouts clone rendered rows; they inherit these
sources rather than calculating new projections. Public generated mirrors are
not independent authorities and were not edited.

Single-game outputs are a related boundary: Slate/Home/Games cards, matchup and
team schedules use `forecastFor` / `forecastAudit` for the home probability and
its away complement. The predicted line derives from that probability, while
`exactScoreProjection` chooses a possession-simulation representative score.
Neither is a season-end record or Luck expectation. Exact score/tie statistics
and quarter approaches remain UX-12/26 work; this tranche does not claim their
acceptance criteria are satisfied.

## Verified call chains and distinctions

`S.schedule` + current input rows → `seasonEngine` / live profiles →
`currentRatings` (core rating plus unit bridge) → eligible QB-return correction
→ `forecastFor(..., mode='smart')` → analytic `projected` or sampled
`seasonProjection` → page renderers → numeric formatting.

For future games, `forecastFor` calls the real
[forecast module](model/forecast_v2.js). Usable moneylines, otherwise spreads,
enter the week-weighted smart logit blend; absence falls back to independent
rating probability. Completed-game forecasts prefer replayed `gameHistory`
instead of today's ratings. Forecast market information is therefore part of
remaining-win projections where available, not evidence of an added market
term in the canonical team-strength rating.

The advanced diagnostic `MARKET EFFECT ON TEAM RATING` displays
`adaptiveTeamInfo().eloEquivalent`, an equivalent scale for the experimental
adaptive adjustment. `currentRatings` does not add it; `forecastFor` defaults
to smart, not adaptive. The regression changes **future** moneylines and
verifies canonical ratings stay identical while smart forecast probability
changes. This answers the UX-14 C3 label/source contradiction for these traced
paths; it does not resolve UX-18 disclosure placement or authorize copy changes.

Rating inputs are not globally identical: directory/season projection use
`ratingsWithActiveQBCarryover`, a team projection corrects only its own team's
entry, and Roster Lab uses `currentRatings` without that extra correction.
Opponent corrections can therefore also distinguish a directory expectation
from a team-specific expectation. These differences precede rounding or
Monte Carlo error. Do not “fix” them by forcing unlike quantities to match.

Season simulation fixes completed outcomes, samples only home/away wins for
future games, builds division/conference fields through the real tiebreak
functions, and preserves actual ties already present. The terminal fallback
uses FORCE and then team-code order when modeled tiebreak evidence is exhausted.
Representative selection minimizes distance in win space, not playoff odds.
The random seed depends on schedule version/length and team count; report input
hashes carry the actual content provenance. It is deterministic sampling, not
an exhaustive future-outcome calculation or official clinch/elimination feed.

## Reproduced examples (synthetic only)

Default diagnostic on the baseline browser paths gives:

| KC quantity | Four-game schedule, manual 50 Elo | Seventeen-game schedule, existing automatic correction |
| --- | --- | --- |
| Analytic Roster Lab/base expectation | 2.426747 | 7.974453 |
| Analytic corrected team expectation | 2.510868 | 8.192608 |
| Monte Carlo mean | 2.507800 | 8.169000 |
| Representative record / seed | 3-1 / 7 | 7-10 / Out |
| Marginal playoff odds / display | 50.78% / 51% | 17.30% / 17% |
| Marginal division odds / display | 0% / 0% | 0.36% / 0% |
| Marginal bye odds / display | 0% / 0% | 0.08% / 0% |
| Retrospective expected wins, 3 completed games | 1.572505 | 1.572505 |
| Actual clinch/elimination state | Unavailable | Unavailable |

Maximum absolute Monte Carlo-minus-analytic gap across 32 teams: **0.013891**
and **0.062151** respectively. Representative Out with nonzero playoff odds
occurs for 5 and 16 teams respectively. Those are fixture results, not production
prevalence estimates. The Monte Carlo discrepancy is an estimator distinction;
it does not establish a bug or a desired unified public source.

The short schedule additionally exposes the hard-coded 17-game complement:
the real team hero renders `2.5–14.5 projected record` despite only four loaded
games for that team. It is intentionally incomplete input evidence, not a
claim that production lacks its season schedule. A future display contract must
state how incomplete schedules and existing ties are represented.

## Regression scope and limitations

The behavioral regression checks analytic expectation against real per-game
forecasts; seven representative seeds and marginal playoff places per
conference; one marginal bye/division winner; retained actual ties; actual
rendered projection/odds/Luck/directory cells; zero-delta Roster input identity;
preserved correction-input differences; changed future-market probabilities
without rating mutation; and explicit unavailable/error paths. A supplied
coherent-snapshot comparison calls the real representative selector. Rendering
restores the diagnostic's control state and does not mutate supplied inputs.

Observed baseline rounding is tested to keep evidence faithful, **not** promoted
to a PRESERVE rule. UX-25 remains entitled to change presentation in a separately
authorized tranche. The diagnostic is not an exhaustive source parser, a browser
layout/accessibility test, a live feed freshness audit, or a clinch solver. It
maps current source occurrence families and probes their real rendered values;
future public-surface additions require renewed inventory.

## Verification

Lane verification: `npm test` **137/137**, `npm run test:model` **45/45** and
`npm run test:release` **16/16**, all in LF scratch for the known V77 source
line-ending assertion. The new focused regression also passed through the
isolated runner in the Windows worktree. All four new JavaScript entry/helper
files passed syntax checks. Catalog: 249 tests, 137 safe, 112 unchanged default
exclusions. Real worktree status/file hashes were unchanged by test execution;
owned validation scratch was removed. No deployment or live validation occurred.

## Owner options and remaining gates

1. Keep representative standings primary, with explicit representative labels
   beside separately labeled marginal odds. Preserve common-run record/seed
   coherence and Out dimming.
2. Make marginal odds primary; retain representative standings as a secondary
   coherent view. A most-likely-seed column would need an actual marginal seed
   distribution and would not itself form a coherent common bracket.
3. For season-end expected wins, retain the simulation mean with a distinct
   label or separately authorize using the analytic expectation consistently.
   Choose which correction baseline applies per surface before unifying labels.

These are options, not selected contracts. UX-11 owns presentation interpretation;
UX-09 owns retained-lab baseline honesty; UX-25 still needs an authoritative
actual clinch/elimination source and separately authorized formatting; UX-05
still owns rounding conventions. UX-08's Customize contract is unresolved;
UX-14 follow-on content gates and UX-18 placement remain intact. UX-12/26 score
and quarter questions, model changes, MD-01/02 and SEC-01 remain outside scope.

Recommend a separately authorized actual-state source/contract investigation
before UX-25 implementation, and owner review of the semantic-label/baseline
options. No follow-on execution is authorized by this evidence. STOP.
