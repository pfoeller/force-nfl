# FORCE V41

## Pass Rush is now charted pressure first

V41 replaces the live Pass Rush unit's QB-hit+sack proxy with true charted pressure from nflverse's weekly PFR advanced-passing feed (PFR/Sportradar charting).

The scoring hierarchy is deliberately simple and transparent:

- hurry-only pressure = **1.00** pressure unit
- quarterback hit = **1.20** pressure units
- sack = **1.60** pressure units

Equivalently, the raw composite is:

`pressure rate + 0.20 × hit rate + 0.60 × sack rate`

Because PFR defines pressure as hurries + non-sack hits + sack plays, the hit and sack terms are finishing bonuses layered on top of the base pressure signal rather than substitutes for it.

## Better early-season calibration

The old V40 path compared a one-game hit+sack rate with the 32 full-season 2025 pressure-rate values. A strong single game could therefore exceed nearly every season-long observation and immediately map to 100.

V41 instead benchmarks the live composite against **same-sized rolling 2025 samples**:

- after 1 game: compare with all 2025 one-game team-defense samples;
- after 2 games: compare with rolling two-game 2025 samples;
- and so on.

The empirical percentile is linearly interpolated rather than hard-ranked against only 32 season values. That keeps meaningful separation among elite performances and makes Week 1 volatility comparable with Week 1-style historical volatility.

## Incomplete-charting guard

PFR can expose basic sacks before its advanced Sportradar charting has populated hurries/hits. V41 detects a sacks-only placeholder feed. When the charting is not ready, FORCE **holds the 2025 Pass Rush prior** rather than silently substituting the old hit+sack proxy.

The Units hover state tells the user whether Pass Rush is using charted live data or holding the prior while charting is pending.

## Data pipeline

`force_server.py` now proxies two additional nflverse release assets:

- `/api/pfr-pass` → `advstats_week_pass_2026.csv`
- `/api/pfr-pass-prior` → `advstats_week_pass_2025.csv`

The browser still accesses only same-origin local endpoints.

## Preserved from V40

All V40 work remains intact, including:

- team logos throughout team references;
- Option 3 / Field FORCE identity;
- two-page FORCE Rankings PNG exports (16 teams per image);
- explicit Pass Rush / Run Defense / Run Offense labels.

## Regression coverage

`scripts/test_v41_pass_rush_pressure.js` adds 17 checks covering:

- the 1.00 / 1.20 / 1.60 weighting hierarchy;
- true pressure-rate ingestion;
- same-sized rolling 2025 benchmark construction;
- rejection of sacks-only placeholder data;
- a synthetic Dallas/Kansas City contrast in which 20% pressure and 50% pressure remain materially separated;
- removal of the old Dallas-96 pathology on the charted-pressure path;
- prior holding when current pressure charting is not ready.
