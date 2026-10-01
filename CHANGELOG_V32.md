# FORCE V32

## Week-decaying market prior

V31 used the historical market-blend default of 98% market / 2% FORCE whenever market data existed. V32 makes that weight explicitly depend on season week:

- Week 1: 75% market / 25% FORCE
- Week 2: 50% market / 50% FORCE
- Week 3: 25% market / 75% FORCE
- Week 4: 15% market / 85% FORCE
- Week 5: 10% market / 90% FORCE
- Week 6+: 5% market / 95% FORCE

The intent is to use the market as a strong early-season prior without letting the public FORCE forecast remain a near-copy of Vegas after the model has accumulated current-season information. The schedule is monotone and transparent, and the runtime forecast now exposes its actual `marketWeight` and `modelWeight`.

### Current Brier comparison

Using the same 15 completed Week 1 games contained in the bundle's embedded 2026 fallback schedule and the same embedded opening lines:

- V31 runtime (98% market): **0.227073**
- V32 runtime (75% market): **0.224591**
- Change: **-0.002481 Brier** (about **1.09% lower**, therefore better)
- FORCE only: 0.225430
- Market only: 0.227368

This is a current-season diagnostic, not a replacement for the existing 2023-2025 closing-line benchmark. Because no completed Week 2+ games are yet present in the bundled 2026 sample, the Week 2+ schedule has not yet earned an empirical current-season score. Raw historical replay inputs for refitting the 2023-2025 benchmark are not bundled, so V32 does **not** claim that the full decay schedule has beaten 0.2095 historically.

## Display rounding

- FORCE predicted spreads are displayed to the nearest **0.5 point**.
- Exact-score projections are displayed as **whole points**.
- All Elo, probability, expected margin, and score calculations retain full precision internally. Rounding occurs only at the presentation boundary.
- Half-point rounding is symmetric for favorites on either side of zero.

## Regression protection

`test_v32_market_decay_rounding.js` verifies the market-weight schedule, the current-sample Brier calculation, non-regression versus V31 on that sample, and half-point/whole-score presentation contracts.
