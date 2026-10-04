# MD-04 Roster Lab marginal-value investigation

Cycle 7, 2026-10-04; exact base `cf391daa2d43a44fe9d742ea0b96cc537d1a7136`. Research REVIEW; implementation PLANNED / NOT AUTHORIZED. This package does not resolve depth, replacement or workload policy. See [shared architecture and sequencing](CYCLE7_MULTI_MD_SYNTHESIS.md) and [reproduction](research/cycle7/README.md).

## Current path and input meaning

The actual `lab()` in [application](assets/app.js) starts with `currentRatings()`, not the deleted public QB-return tool. `S.scenario` contains a Set of original-team removed names and one incoming name. Team changes reset it; add/remove handlers rerender immediately. It has no persistent transaction roster. Canonical current ratings, units, seasonProjection and ratingLedger are unchanged by lab edits.

The arithmetic is `-sum(removed.impact) + incoming.impact`, except a QB addition also subtracts the **original** highest-impact QB. That incumbent lookup ignores removals. The UI offers the top 100 other-team impacts, not every database row. No added player enters the removal checklist. There is one addition; claims about repeated additions in today's UI would be false.

The resulting delta is raw Elo. The lab displays `score(currentElo + delta)` and calls `projected(team, ratings, delta)`. Future schedule probabilities receive `F.applyEloDelta` on the already computed forecast logit. This is a single lab channel, not a unit recomputation followed by another team bridge. Because the underlying forecast can blend markets, this shift is not identical to rerunning that blend with a changed independent Elo. Preserve that boundary or separately authorize a change; do not reopen UX-10/UX-18 here.

Bundled `D.players` has 209 rows: QB 53, RB 60, WR 96. TE examples such as Waller and RB receiving rows are also in the WR-labelled bucket; TE/receiver roles cannot be cleanly inferred from that label. OL, EDGE/DL, LB, CB, S and special teams have **no supported add/remove impacts**. Their marginal value is unavailable, not zero. The player list is incomplete as a roster, and name identity is ambiguous: 13 names have two rows (11 same-team cross-position aliases and two cross-team abbreviations). It is not a durable player ID.

QB impacts are signed, tagged `validated-signal`, sourced as `QB predictive adjustment`; RB/WR are tagged experimental, sourced as a 2025 evaluative composite mapped heuristically to Elo. The bundled adjustment is neither the canonical 0–100 QB Rating nor a validated marginal value for an arbitrary transfer/depth slot. Its producer/calibration is not reproduced by current repository generation code. The inputs mix an existing QB predictive adjustment with experimental standalone non-QB evaluation. The labels are provenance, not proof of marginal transfer calibration.

## Actual rendered reproductions

[roster_and_bridge.json](research/cycle7/results/roster_and_bridge.json) uses the real ordered browser bundle and real rendered Raw rating delta. These are the bundled offline snapshot, not a fetched live production roster. Its expected-win changes are also snapshot-schedule-specific.

| Scenario | Actual Elo delta | FORCE change | Cause |
| --- | ---: | ---: | --- |
| MIA removes Tua (impact −8) | +8.0 | +1.376 | Signed subtraction assumes an empty/replacement value of zero; injury has no successor allocation |
| BAL adds Cousins (+9), keeps Lamar (+48) | −39.0 | −7.040 | Every incoming QB is treated as forced replacement, even when worse |
| MIA adds Lamar (+48), keeps Tua (−8) | +56.0 | +9.629 | Incoming minus signed incumbent |
| MIA removes Tua and adds Lamar | +64.0 | +11.004 | Incumbent is subtracted in removal and again in replacement; excess +8 here, not always a negative sign |
| MIA removes Gordon (RB −7.9) | +7.9 | +1.358 | Same zero-replacement/signed-removal issue, not QB replacement double subtraction |
| MIA removes Washington (WR −5.6) | +5.6 | +0.963 | Same signed-removal issue |
| ARI adds Waller (WR +9.8) | +9.8 | +1.685 | Standalone addition ignores existing McBride/Harrison/Wilson roles |
| MIA adds Ty.Johnson (RB +8) | +8.0 | +1.376 | Standalone addition ignores committee usage |

**Separate identity defect:** on DAL, the dropdown offers DET J.Williams as WR +5.9, but global `find(name)` resolves DAL J.Williams RB +5.6, producing a self-addition. Same-team RB/WR aliases (e.g. Ty.Johnson +8/+2.4) also share checkbox/selector values; removal uses the first same-team row once. The data cannot reliably distinguish a dual-role player from two people sharing an abbreviation. The evidence JSON lists every collision and the real rendered DAL case. A future role allocator must resolve identity/role components, or abstain on ambiguity, rather than infer unique players from names. No input row is deleted here.

All eight incoming/removal cases are reachable with the current controls. Canonical ratings remain identical after each. Public reset returns zero delta. A multi-add/remove transaction round trip is not a current UI capability; it is tested only in isolated candidate roster sets.

## Two isolated prototypes

Both compute `value(after roster) - value(before roster)` once and preserve the original ratings baseline. Their synthetic parameters are illustrative, **not fitted workload shares or new player-impact calibration**.

**A: role/depth allocation.** Healthy QB has one slot; RB has two equal slots; WR/TE bucket has three equal slots. Assign descending impacts to optional slots; unfilled slot value is a parameter, here zero. A weaker incoming player can remain unused. Both removal and addition occur before evaluating the new room.

**B: workload/share allocation.** Same before/after sets, descending value assignment, but QB shares `[1]`, RB `[.65,.25,.10]`, WR bucket `[.50,.30,.20]`. This models rotation rather than equal starters, with finite opportunity capacity and diminishing returns. Roles and shares need owner/model validation; it does not estimate prospective injury insurance.

| Real input scenario | A delta | B delta | Interpretation |
| --- | ---: | ---: | --- |
| BAL adds Cousins | 0 | 0 | No automatic replacement of healthy Lamar |
| MIA adds Lamar, with or without removing Tua | 48 | 48 | Same change once; zero optional-slot replacement benchmark dominates negative Tua |
| ARI adds Waller | 2.333 | 3.190 | Reallocates existing receiver roles instead of adding 9.8 |
| MIA adds Ty.Johnson | 4.000 | 5.200 | Capacity/share reduces the full +8 standalone value |
| MIA removes negative RB or WR | 0 | 0 | A consequence of the chosen zero optional-slot benchmark, not a validated injury model |

The [synthetic matrix](research/cycle7/results/roster_and_bridge.json) covers eight scenario families across all three supported buckets and both candidates: elite/weak room, weaker behind elite, upgrade/downgrade, multiple additions, remove+add and negative removal. Sixty checks cover reversibility, ordered diminishing returns, duplicate-identity rejection and weaker-behind-elite zero contribution. Ordered marginal gains need not decline when incoming talents increase; the invariant applies to the fixed descending sequence tested, not arbitrary player order.

## Falsification and owner choices

The zero replacement benchmark is a major sensitivity, not an engineering default. For Tua as the sole listed QB, a −20 forced fallback benchmark changes removal from 0 to −12 Elo. An unlisted competent backup changes it again. The prototype cannot repair incomplete roster/role data merely by clamping negative values. RB/WR slot weights also alter scaling: unchanged sum-of-player impact cannot be assumed to equal a validated room Elo.

Depth alternatives remain open: (1) healthy starter/rotation only; (2) explicit small availability-weighted insurance; (3) workload allocation; (4) user-designated replacement rather than an automatic talent-ranked starter. A synthetic 10% starter absence × 25 backup-value upgrade contributes 2.5, demonstrating why “all backups always zero” is not a universal football result. Actual absence probability, correlated injuries, game horizon and uncertainty are unmeasured. A forced trade replacing an incumbent may properly reduce strength even if a simple acquisition should not; the owner must distinguish these contracts.

Recommendation: **bounded local before/after role accounting first**, initially supported positions only with identity validation, preserving input impacts and current canonical units. Owner must choose acquisition versus forced replacement, replacement benchmark, depth/insurance policy and role scope. An initial correction may fix the demonstrable incumbent double subtraction without claiming calibrated new marginal predictions; broader RB/WR allocation should stay experimental until those choices and suitable data are supplied.

Support: exact real-path accounting defect and reversible prototypes. Counterevidence: incomplete roster and uncalibrated non-QB impacts; choice-sensitive signed removal. Uncertainty: transferability, injury replacement and scaling. Falsifier: a complete roster/usage holdout showing role allocation worsens scenario calibration or fails to reproduce the intended baseline. No predictive-policy gate was passed here.

## Integration boundary

MD-04 need not wait for MD-05: `lab()` consumes player impacts and applies one isolated Elo shift; canonical units do not read its state. A future local correction must prove no-scenario identity, canonical ratings/units/history/forecasts unchanged outside the lab, and exactly one lab forecast propagation. It must not both change unit grades and apply the same player delta directly. Any new unit, player-input calibration, insurance model, market transformation or persistent roster editor is a separately scoped decision. UX-09 baseline honesty and UX-34 simplification coordinate; neither is implemented by this investigation.
