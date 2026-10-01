# FORCE V33

## Verified returning-QB regime correction

V33 promotes one narrowly scoped forecasting change: a conservative early-season correction for **mechanically verified** cases where an established starting quarterback missed games for injury/medical reasons, the team declined during that replacement-QB window, and the same established starter is expected back the following season.

The production rule is intentionally smaller than the strongest research setting:

- 7.5 Elo per verified missed start before offseason reversion
- 60 Elo pre-reversion cap
- 70% current-era offseason survival
- 4-team-game half-life
- never exceeds the measured post-reversion rating damage
- applies only to registry cases explicitly marked `autoEligible`
- a manual QB Return Lab value **replaces**, rather than stacks with, the automatic correction

For the currently verified Kansas City / Patrick Mahomes case, the automatic starting overlay is **+15.75 Elo** before game decay. The existing +47.3 Elo lab value remains available as the full case-specific counterfactual; it is no longer the default prediction adjustment.

## Why this one was promoted

The six-case decline-gated returning-starter subset in the bundled prior-isolation event study scored:

- Baseline Weeks 1–8 Brier: **0.231676039**
- V33 rule (7.5 Elo/start, 4-game half-life): **0.221817174**
- Delta: **-0.009858864**
- Episodes improved: **5 of 6**

The broader 11-case leave-one-out study also favored a carryover correction, but remained heterogeneous. V33 therefore does **not** infer the adjustment from missed starts alone. Unverified teams receive exactly zero.

This remains a **prior-isolation event study**, not a full historical PBP replay. V33 is explicit about that limitation and does not claim that the whole FORCE model's 2008–2025 or 2023–2025 Brier fell by 0.0099.

## Probability mapping and market blend: tested, not changed

The supplied Celo archive preserves exact aggregate independent-model Brier:

- 2008–2025: **0.2198055101** (4,661 games)
- 2023–2025: **0.2169648028** (855 games)
- 2025: **0.2139875778** (285 games)
- derived 2023–2024 combined: **0.2184534154** (570 games)

It does not preserve separate 2023 and 2024 game-level prediction rows, so those individual season scores cannot be recovered exactly from this bundle.

A 2025-only HFA/scale stress test on the preserved raw pregame Elo rows found a tiny same-sample improvement at HFA 25 / scale 360 versus the current 15 / 340 reconstruction (-0.000247 Brier). That is not walk-forward evidence and is rejected for production.

The V32 market-decay schedule is also unchanged. The archive still lacks the historical joint rows needed to replay FORCE probability + market line + outcome week-by-week without fabricating data.

See `QB_REGIME_RESEARCH_V33.md` and `benchmarks/v33_research_audit.json`.
