# Forecast v2

`forecast_v2.js` is the browser implementation. `forecast_v2.py` is a readable
reference implementation for server/model integration.

## Why this is the Brier improvement

The supplied Celo research already found a hard distinction between two useful
products:

1. **Independent team-strength model** - approximately **0.2170 Brier** on the
   2023–2025 holdout in the latest shipped model card.
2. **Pregame closing-market forecast** - approximately **0.2095 Brier**. A
   logistic Elo+spread blend also scored 0.2095 and fitted almost no incremental
   Elo weight.

So v2 does not make the misleading claim that Elo itself improved to 0.2095.
Instead, it separates **rating** from **forecast**:

- FORCE Score / Elo stays independent of the betting market.
- Smart game forecasts incorporate pregame market information when available.
- Long-range games with no line fall back to the independent model.
- Users can switch the UI to `Independent` and ignore market information.

That is an absolute Brier reduction of 0.0075 (about 3.46% relative) at the
closing-line benchmark.

## Runtime hierarchy

For a future game:

1. Compute independent Elo probability.
2. If both moneylines are present, convert them to implied probabilities and
   de-vig by normalizing the two sides.
3. Otherwise, if a spread exists, translate the spread to a home-win
   probability.
4. Blend a small 2% independent-model logit contribution into the market
   probability. This mirrors the research finding that Elo adds very little
   after the market is known.
5. If no market information exists, use the independent model unchanged.

## Critical caveat

The measured **0.2095** benchmark is for **closing** lines. The nflverse feed can
contain whatever pregame line is currently available for a future game. An
opening/current line is useful information, but its exact Brier score is not
claimed to equal the closing-line benchmark.

## Roster Lab

Roster scenarios do not overwrite a market baseline. The scenario Elo delta is
converted to a log-odds shift and applied around whichever baseline Smart v2 is
using. QB impact is the only player signal already connected to the predictive
model. Non-QB impacts remain visibly experimental.

---

# Adaptive v3 research layer

`adaptive_v3.js` and `adaptive_v3.py` implement an experimental second-stage
forecast layer on top of Smart v2.

## Hypothesis

A market can be excellent in aggregate while still carrying persistent,
team-specific residual error for periods of time. Examples include a team that
is repeatedly priced as an elite favorite but wins by materially less than the
expected margin, or a roster/scheme change that the independent model and
market absorb at different speeds.

Adaptive v3 therefore maintains a small state per team:

- `residual`: actual team margin minus market-expected margin, exponentially
  decayed and shrunk toward zero;
- `favorite_residual`: the same statistic restricted to games in which the team
  was favored by at least six points;
- `avg_brier_advantage`: prior independent-model Brier minus prior market Brier;
- `market_weight`: a clipped function of that lagged Brier advantage.

A positive Brier advantage means Vegas has recently beaten the independent
model for that team's games and therefore retains/increases its weight. A
negative value lets the independent model receive somewhat more weight. When a
future game has no line yet, the lagged general residual is translated into a
small forecast-only Elo-equivalent overlay; it still does not alter public Power
Score.

## Why margin residual is lagged

The final margin from game G is never allowed to affect the forecast for G.
It enters the state only after the game is complete. In the browser and the
research harness, adaptive state is frozen for the full week, so Week N
forecasts use information through Week N-1 only.

## Large-favorite specialization

The user hypothesis “favored by 6+, but repeatedly winning by fewer than three”
is modeled with a separate large-favorite residual. It does not fire after one
game at full strength: the state is decayed, shrunk by a prior, multiplied by a
small coefficient, and the total market-point correction is capped.

## Divisional games

Division status is exposed as a candidate context but the runtime coefficient is
zero. The static football model already has a divisional adjustment, and the
sportsbook line itself should price divisional context. The historical trainer
may select a non-zero market-line compression only if it improves future-season
Brier.

## Promotion criterion

Adaptive v3 has **no claimed Brier score yet**. The champion remains the
0.2095 closing-market benchmark. `fit_adaptive_market.py` is the gatekeeper:
it tunes only on pre-holdout seasons and marks a configuration promotable only
when it beats the static market-aware baseline overall, wins a majority of
held-out seasons, and avoids a large single-season regression.
