# FORCE v6

## Completed-game learning audit

Completed games now show not only the frozen pregame forecast and actual result, but also the exact Elo movement assigned to both teams by the live bridge engine.

Each completed game also generates an **immediate exact-rematch forecast**. It uses the postgame ratings, the same home/away site, and a scoring-form baseline that now includes the completed game. The original Vegas line is deliberately removed from the rematch so the output isolates what the result changed in the rating model.

The matchup detail page shows pregame-to-postgame Elo and FORCE Score changes, rematch home-win probability, predicted line, and exact-score point estimate. Home-screen cards, Matchup Center cards, and team schedule rows surface compact versions of the same information.

## QB injury carryover research

The interrupted QB-injury/offseason-baseline experiment was completed far enough to make a promotion decision. Synthetic tests suggest a small possible Brier improvement from either re-anchoring to a returning starter or slowing the per-start QB-baseline drift, especially under high injury rates. The gain is too small and inconsistent at realistic injury rates to ship without a real historical injury-episode backtest. The production model is therefore unchanged; full results and the next recommended test are in `QB_CARRYOVER_RESEARCH.md`.
