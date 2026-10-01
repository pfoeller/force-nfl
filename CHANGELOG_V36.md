# FORCE V36

## Rematch forecast coherence
V35 correctly unified the public upcoming-game forecast, but the completed-game "immediate rematch" still had a weighting defect: it took the already market-blended pregame logit and shifted the entire quantity by the postgame Elo change. That implicitly made the market-owned portion react to the Elo/regime update too, and could produce implausibly large rematch spreads.

V36 recomputes the postgame independent probability from the postgame predictive ratings, reuses only the frozen pregame market probability as the hypothetical rematch market anchor, then blends those two at the approved **next-week** market weight. A Week-1 rematch therefore uses the Week-2 50% market / 50% model rule. No new market data are invented.

## Rankings > Units
The Units board is now deliberately stripped down to the requested raw unit scores only:
- Offense
- Defense
- QB
- O-Line
- Rush (pass rush)
- Run D
- Coverage
- Run
- Receiver

The Units table no longer shows FORCE Score, QB-return controls, scenario/base notes, or explanatory notes. Team and metric-rank columns remain for identification/sorting.

## Units PNG export
Rankings > Units exports in exactly four 8-team table pages. Every page repeats the full column header so each PNG is independently readable.
