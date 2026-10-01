# FORCE V30 - predictive gates + QB-adjusted model line

V30 fixes two model-contract issues.

## 1. QB adjustment now changes the FORCE predicted line

The previous UI derived the displayed predicted line from the active forecast probability. In `FORCE + Market` mode that probability is intentionally market-dominated (98% market / 2% independent FORCE logit when market data exist), so even a meaningful QB Elo correction could be rounded away in the displayed line.

V30 separates the concepts:

- **FORCE predicted line** is now always the model-implied line from the independent, predictive FORCE ratings.
- **Outcome probability** may still use the empirically validated market blend.
- An enabled, Brier-eligible QB carryover correction therefore moves the FORCE line directly and also moves the FORCE-only win probability.
- In `FORCE + Market`, the final outcome probability can move much less because the market retains its validated dominant weight.

This is deliberate: the line answers “what does FORCE itself make this game?”, while the blended probability answers “what is the best validated outcome forecast?”.

## 2. Hard Brier gate for predictive ratings/features

V30 adds `data/predictive-feature-gates.js` and `model/predictive_features.js`.

Policy:

> A rating/feature may affect the line or outcome engine only when a pregame-safe out-of-sample Brier comparison is non-harmful versus the incumbent forecast (`delta Brier <= 0`). Unvalidated or harmful features have predictive weight exactly 0.

Current status:

- Elo: accepted core predictive rating.
- Market: accepted; closing-line benchmark improves Brier from 0.2170 to 0.2095.
- QB carryover: optional/eligible when explicitly enabled; the bundled 11-episode Weeks 1–8 study improved aggregate Brier from 0.230324 to 0.220903 (delta -0.009421), but remains non-default because the sample is small and the confidence interval crosses zero.
- Offense, QB unit, receivers, OL, defense, coverage, pass rush, run defense, rushing, luck, and penalties: **display-only, predictive weight 0** until a leakage-safe historical replay earns promotion.

No heuristic football metric is given a predictive weight simply because it seems intuitively useful.

## Regression coverage

`test_v30_predictive_gates.js` enforces:

- every positive predictive weight has a finite measured Brier delta <= 0;
- all currently unvalidated unit/context ratings remain at weight 0;
- QB carryover remains eligible only because its bundled aggregate study improved Brier;
- a +47.3 Elo QB correction materially moves the independent FORCE line;
- game cards and matchup pages use the dedicated FORCE-line path rather than the market-heavy active forecast;
- QB predictive application goes through the feature gate.
