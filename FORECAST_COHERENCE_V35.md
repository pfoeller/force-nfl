# V35 forecast coherence audit

## Problem

V34 intentionally separated the public predicted line from the blended outcome probability so rating/QB changes would remain visible. Once the early-season market blend became a substantial part of the public forecast, that design produced contradictory-looking outputs. A game could show roughly 85% FORCE win probability and an 11-point exact-score margin while also showing a 17-point "FORCE" line generated from the independent model.

## V35 contract

For every public matchup, there is exactly one forecast probability `p`.

- If market data exist, `p` is the approved week-specific logit blend.
- If no market data exist, `p` falls back to the independent rating model.
- `probabilityToSpread(p)` produces the displayed predicted line.
- The same `p` supplies the margin used by exact-score projection.
- Score normalization may move the arithmetic total a few points to a football-natural score pair, but it preserves the rounded implied margin before considering total/plausibility.

The independent model remains a research component, not a second public forecast.

## Score normalizer

The normalizer searches integer NFL scores and minimizes a strongly margin-dominant objective. A scoring-event prior mildly prefers totals reachable through ordinary touchdowns + PATs and field goals over combinations requiring less-common conversions, missed PATs, or safeties.

Example:

- continuous/raw target: total 47, margin +11
- arithmetic rounding: 29-18
- V35 normalized point estimate: 28-17
- displayed margin remains +11

This normalization is presentation/point-estimate logic. It does not change Brier probability calculations.
