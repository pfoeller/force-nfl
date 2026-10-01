# FORCE V103 - stable QB passing core + additive rushing creation

## Why this release exists

V102 correctly separated sacks from QB passing and opponent-adjusted actual-pass EPA, but its live QB grade still ranked EPA/CPOE/rushing against the tiny current-season cross-section. That could make an objectively strong two-game passing sample grade below a strong preseason prior simply because unrelated quarterbacks also started hot or because a small rushing sample landed poorly.

V103 keeps the V102 opponent-adjusted, sack-free QB concept and fixes the calibration around it. Patrick Mahomes/Kansas City remains a diagnostic example only; there are no team-specific constants or rating targets.

## QB passing is the core

Current QB passing is now:

- **75% stable opponent-adjusted sack-free pass-EPA score**
- **25% CPOE score**

The EPA score is no longer a raw 2026 percentile. FORCE preserves the shape of the prior-season QB EPA-over-expected distribution and translates its center to the current sack-free/opponent-adjusted metric level. A single unrelated hot/cold quarterback therefore cannot materially re-rank everybody else, while the league-center translation accounts for the deliberate change in metric definition.

CPOE is mapped on a fixed neutral-centered curve: 0 CPOE = 50. Positive CPOE raises the core and negative CPOE lowers it.

The existing 30%-regressed preseason QB prior and regime-aware prior-game confidence remain intact.

## QB rushing is additive, not a required 15% share

QB rushing no longer consumes 15% of the core QB grade. Instead it can earn a **positive-only creation bonus**:

- range: **0 to +12 QB-index points**;
- driven by total positive QB rushing EPA, not merely a tiny-sample EPA/attempt rank;
- shrunk by rushing-attempt volume so one or two plays cannot immediately earn a full-season bonus;
- negative or neutral rushing EPA contributes **0** and cannot drag down the passing grade.

The first-pass formula is:

`bonus = 12 × tanh(max(0, rush EPA total) / 15) × attempts / (attempts + 12)`

This allows genuinely transformative runners such as Lamar Jackson/Josh Allen archetypes to earn well beyond +4 without allowing rushing to overwhelm passing.

## Kneels are excluded when PBP is available

V103 derives QB rushing from the same nflverse play-by-play payload already used for offensive/defensive drive context. Actual passer IDs are established across the game; rushes by those QBs are counted, while kneels and non-QB runs are excluded. Weekly player aggregates remain a fallback when PBP QB-rush context is unavailable.

## Double-counting guard

Canonical offense still uses the V102 orthogonal structure: scoring per drive + QB + WR/TE + OL + RB/FB. The RB unit remains RB/FB-only, so the V103 QB rushing bonus is not also counted in the canonical RB input. The broad scoring-per-drive layer remains an intentional outcome check rather than another rushing-efficiency unit.

## Diagnostics

`FORCE_QB_DEBUG(team)` now exposes:

- stable pass-EPA score,
- CPOE score,
- passing-core score,
- QB rushing EPA total and attempts,
- QB rushing source,
- additive rushing bonus,
- live QB evidence score,
- preseason QB anchor and final QB index.

## Validation

V103 adds regression tests proving that:

- negative rushing EPA cannot lower an otherwise identical QB grade;
- positive rushing adds to the passing core;
- elite rushing can earn more than +8 while remaining capped at +12;
- a single unrelated extreme QB result does not move another QB's stable EPA score;
- PBP designed runs/scrambles are counted and kneels/non-QB rushes are excluded;
- a synthetic strong Mahomes-like two-game passing sample moves upward from the 64.7 regressed preseason anchor rather than collapsing below it.
