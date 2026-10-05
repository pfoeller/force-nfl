# MD-04 Roster Lab marginal-value investigation

Cycle 7, 2026-10-04; exact base `cf391daa2d43a44fe9d742ea0b96cc537d1a7136`. Research REVIEW; implementation PLANNED / NOT AUTHORIZED. This package does not resolve depth, replacement or workload policy. See [shared architecture and sequencing](CYCLE7_MULTI_MD_SYNTHESIS.md) and [reproduction](research/cycle7/README.md).

## Current path and input meaning

The actual `lab()` in [application](assets/app.js) starts with `currentRatings()`, not the deleted public QB-return tool. `S.scenario` contains a Set of original-team removed names and one incoming name. Team changes reset it; add/remove handlers rerender immediately. It has no persistent transaction roster. Canonical current ratings, units, seasonProjection and ratingLedger are unchanged by lab edits.

The arithmetic is `-sum(removed.impact) + incoming.impact`, except a QB addition also subtracts the **original** highest-impact QB. That incumbent lookup ignores removals. The UI offers the top 100 other-team impacts, not every database row. No added player enters the removal checklist. There is one addition; claims about repeated additions in today's UI would be false.

The resulting delta is raw Elo. The lab displays `score(currentElo + delta)` and calls `projected(team, ratings, delta)`. Future schedule probabilities receive `F.applyEloDelta` on the already computed forecast logit. This is a single lab channel, not a unit recomputation followed by another team bridge. Because the underlying forecast can blend markets, this shift is not identical to rerunning that blend with a changed independent Elo. Preserve that boundary or separately authorize a change; do not reopen UX-10/UX-18 here.

Bundled `D.players` has 209 rows: QB 53, RB 60, WR 96. TE examples such as Waller and RB receiving rows are also in the WR-labelled bucket; TE/receiver roles cannot be cleanly inferred from that label. OL, EDGE/DL, LB, CB, S and special teams have **no supported add/remove impacts**. Their marginal value is unavailable, not zero. The player list is incomplete as a roster, and name identity is ambiguous: 13 names have two rows (11 same-team cross-position aliases and two cross-team abbreviations). It is not a durable player ID.

QB impacts are signed, tagged `validated-signal`, sourced as `QB predictive adjustment`; RB/WR are tagged experimental, sourced as a 2025 evaluative composite mapped heuristically to Elo. The bundled adjustment is neither the canonical 0–100 QB Rating nor a validated marginal value for an arbitrary transfer/depth slot. Its producer/calibration is not reproduced by current repository generation code. The inputs mix an existing QB predictive adjustment with experimental standalone non-QB evaluation. The labels are provenance, not proof of marginal transfer calibration.

## Actual rendered reproductions

[roster_and_bridge.json](research/cycle7/results/roster_and_bridge.json) uses the real ordered browser bundle and real rendered Raw rating delta. These are the bundled offline snapshot, not a fetched live production roster. **Its expected-win deltas are not decision-useful:** the fallback snapshot has only one remaining MIA game (and one for each reproduced team), not a full remaining season. They are retained as path diagnostics, not evidence of season-win value.

| Scenario | Actual Elo delta | FORCE change | Cause |
| --- | ---: | ---: | --- |
| MIA removes Tua (impact −8) | +8.0 | +1.376 | Depth-agnostic subtraction of an average-referenced signed impact; injury has no successor allocation |
| BAL adds Cousins (+9), keeps Lamar (+48) | −39.0 | −7.040 | Every incoming QB is treated as forced replacement, even when worse |
| MIA adds Lamar (+48), keeps Tua (−8) | +56.0 | +9.629 | Incoming minus signed incumbent |
| MIA removes Tua and adds Lamar | +64.0 | +11.004 | Incumbent is subtracted in removal and again in replacement; excess +8 here, not always a negative sign |
| MIA removes Gordon (RB −7.9) | +7.9 | +1.358 | Same depth-agnostic signed-removal issue, not QB replacement double subtraction |
| MIA removes Washington (WR −5.6) | +5.6 | +0.963 | Same signed-removal issue |
| ARI adds Waller (WR +9.8) | +9.8 | +1.685 | Standalone addition ignores existing McBride/Harrison/Wilson roles |
| MIA adds Ty.Johnson (RB +8) | +8.0 | +1.376 | Standalone addition ignores committee usage |
| NYJ removes non-starting Tyrod Taylor (−119) | +119.0 | +20.581 | Depth-agnostic removal of a signed QB impact |
| BAL removes non-starting Cooper Rush (−67) | +67.0 | +12.094 | Same depth-agnostic removal; not a starter replacement |
| BUF removes Ty.Johnson | −8.0 | −1.444 | Two checked rows share a name; first-match RB row alone is subtracted |

**Separate identity defect:** all UI-offered rows were enumerated. Three offered options misresolve across **93 team × option combinations** (31 each): DET J.Williams WR → DAL J.Williams RB; SF B.Robinson RB → ATL B.Robinson WR; BUF Ty.Johnson WR → BUF Ty.Johnson RB. The rendered DAL self-add is +5.6 instead of offered DET WR +5.9. BUF removal checks both Ty.Johnson rows through the same checkbox value but subtracts only the first RB +8 row; the WR +2.4 row is ignored. The JSON records all 93 combinations and 13 collision groups. A row key must distinguish (team,pos,name) or a stable row ID; abstain on unresolved collisions. Resolving football identity/combined role value is a separate issue. No input row is deleted here.

**Signed-removal root cause:** depth-agnostic removal of an average-referenced signed player impact, not merely a sign bug. A negative listed backup can produce a larger gain than removing the starter. The reference point is inferred from signed predictive adjustments, not a reproduced calibrated replacement-level generator. Flipping the sign would merely reverse the error for positive players. Separately, **UX-09 baseline honesty** matters: `currentRatings()` may already reflect an absent starter via played games/current units, so the Lab can subtract that already-absent player again. The player list is not an availability-aware baseline roster. This correction records the interaction; it does not invent an availability model.

All eleven cases are reachable with current controls; canonical ratings remain identical after each. Public reset returns zero delta. An in-memory source mutation excluding removed names from incumbent selection changes remove-Tua/add-Lamar from +64 to +56 and leaves the other ten cases unchanged, including signed-removal gains and forced Cousins replacement. This proves the narrow accounting fix without choosing an acquisition or replacement-level policy. A multi-add/remove transaction round trip is not a current UI capability; it is tested only in isolated candidate roster sets.

## Two isolated prototypes

Both compute `value(after roster) - value(before roster)` once and preserve the original ratings baseline. Their synthetic parameters are illustrative, **not fitted workload shares or new player-impact calibration**.

**A: role/depth allocation.** Healthy QB has one slot; RB has two equal slots; WR/TE bucket has three equal slots. Assign descending impacts to optional slots; unfilled slot value is a parameter, here zero. A weaker incoming player can remain unused. Both removal and addition occur before evaluating the new room.

**B: workload/share allocation.** Same before/after sets, descending value assignment, but QB shares `[1]`, RB `[.65,.25,.10]`, WR bucket `[.50,.30,.20]`. This illustrates a synthetic allocation rather than establishing real rotation: finite opportunity capacity and diminishing returns follow from chosen weights. Roles and shares need owner/model validation; it does not estimate prospective injury insurance.

| Real input scenario | A delta | B delta | Interpretation |
| --- | ---: | ---: | --- |
| BAL adds Cousins | 0 | 0 | No automatic replacement of healthy Lamar |
| MIA adds Lamar, with or without removing Tua | 48 | 48 | Same change once; zero optional-slot replacement benchmark dominates negative Tua |
| ARI adds Waller | 2.333 | 3.190 | Reallocates existing receiver roles instead of adding 9.8 |
| MIA adds Ty.Johnson | 4.000 | 5.200 | Capacity/share reduces the full +8 standalone value |
| MIA removes negative RB or WR | 0 | 0 | A consequence of the chosen zero optional-slot benchmark, not a validated injury model |

The [synthetic matrix](research/cycle7/results/roster_and_bridge.json) covers eight scenario families across all three supported buckets and both candidates: elite/weak room, weaker behind elite, upgrade/downgrade, multiple additions, remove+add and negative removal. **The 60 checks are mostly construction/invariant checks, not evidence of football validity.** Reversibility follows from subtracting the same value function; diminishing returns follow from chosen ordered talents/weights. They also check duplicate-identity rejection and weaker-behind-elite zero contribution. Ordered marginal gains need not decline when incoming talents increase; the invariant applies to the fixed descending sequence tested, not arbitrary player order.

Both pre- and post-change states use `Math.max(replacement, ...)`, clamping negative players to the replacement benchmark. `replacement=0` is a benchmark choice, not validated football truth. The mixed WR bucket is football-unrealistic: TEs and RB receiving alias rows share slots; Waller → ARI can displace Michael Wilson (Mi. Wilson) instead of competing with TE McBride. The prototypes also inherit name-based role ambiguity. Their safety properties are illustrative; the numerical outputs do not show that Candidate A or B is football-correct.

## Falsification and owner choices

The zero replacement benchmark is a major sensitivity, not an engineering default. For Tua as the sole listed QB, a −20 forced fallback benchmark changes removal from 0 to −12 Elo. An unlisted competent backup changes it again. The prototype cannot repair incomplete roster/role data merely by clamping negative values. RB/WR slot weights also alter scaling: unchanged sum-of-player impact cannot be assumed to equal a validated room Elo.

Depth alternatives remain open: (1) healthy starter/rotation only; (2) explicit small availability-weighted insurance; (3) workload allocation; (4) user-designated replacement rather than an automatic talent-ranked starter. A synthetic 10% starter absence × 25 backup-value upgrade contributes 2.5, demonstrating why “all backups always zero” is not a universal football result. Actual absence probability, correlated injuries, game horizon and uncertainty are unmeasured. A forced trade replacing an incumbent may properly reduce strength even if a simple acquisition should not; the owner must distinguish these contracts.

## Recommended first tranche: decision-free accounting and identity

**A. Decision-free implementation candidate (separate authorization required):**

1. Use (team,pos,name) or a stable row ID consistently in options, checkboxes and lookups; disambiguate or abstain on collisions. Preserve the input rows and impacts.
2. Exclude removed players from incumbent selection; do not subtract an already-removed incumbent twice.
3. Apply removals before selecting the retained incumbent, then evaluate the **one supported addition** as one before/after transaction. Preserve existing forced-replacement and signed-impact semantics in this bounded correction.
4. Protect no-scenario identity, canonical ratings unchanged, unit ratings unchanged, forecasts unchanged outside the scenario, exactly one Lab forecast propagation, and Reset returning to baseline.

These accounting/identity fixes require **no unresolved owner choice**. They do not fix Cousins-style forced replacement or Tua/Tyrod/Rush signed-removal behavior, and do not promise calibrated marginal football value.

**B. Optional owner-decision items:** acquisition versus forced replacement is needed only to change Cousins-style behavior; a removal/replacement benchmark and non-starter treatment are needed only to change the signed-removal behavior. Neither decision is made here; neither blocks A.

**C. Later calibrated work:** depth/injury-insurance value, role/workload capacity, calibrated replacement level and broader positional valuation remain deferred. They require data, policy and validation beyond the decision-free correction.

Support: exact real-path accounting defect and reversible prototypes. Counterevidence: incomplete roster and uncalibrated non-QB impacts; choice-sensitive signed removal. Uncertainty: transferability, injury replacement and scaling. Falsifier: a complete roster/usage holdout showing role allocation worsens scenario calibration or fails to reproduce the intended baseline. No predictive-policy gate was passed here.

## Integration boundary

MD-04 need not wait for MD-05: `lab()` consumes player impacts and applies one isolated Elo shift; canonical units do not read its state. A future local correction must prove no-scenario identity, canonical ratings/units/history/forecasts unchanged outside the lab, and exactly one lab forecast propagation. It must not both change unit grades and apply the same player delta directly. Any new unit, player-input calibration, insurance model, market transformation or persistent roster editor is a separately scoped decision. UX-09 baseline honesty and UX-34 simplification coordinate; neither is implemented by this investigation.
