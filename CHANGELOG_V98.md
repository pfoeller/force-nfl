# FORCE V98 - retrospective opponent-strength look-behind

V98 adds a bounded **look-behind** to current FORCE ratings so the credit or debit from an old result can change as the opponent reveals its true strength later in the season.

## Why

Ordinary Elo freezes a game's rating transfer at the moment the game is played. If Kansas City beats Denver when Denver is rated like an elite team, KC permanently receives credit for beating that version of Denver even if Denver subsequently collapses and finishes as a materially weaker team. V98 allows later evidence to revise that old game's value.

## Production rule

For every completed game, V98 separately asks what each team's opponent did **after that game**:

1. Start from the opponent's causal postgame Elo after the target game.
2. Compare it with the opponent's current causal Elo.
3. Shrink that movement according to how many later games the opponent has played: `later_games / (later_games + 3)`.
4. Cap the inferred opponent revision at ±160 Elo.
5. Recalculate the target team's game Elo delta as if the opponent's pregame rating had included that shrunk later information.
6. Apply 75% of the resulting delta difference, capped at ±5 Elo for one old game and ±24 Elo across a team's season.
7. Re-center corrections across all 32 rated teams so the league average does not drift. This is a common offset, so it does not change any matchup rating difference.

This means:

- beating an opponent that later proves weaker gives progressively less credit;
- beating an opponent that later proves stronger gives progressively more credit;
- losing to an opponent that later proves stronger becomes less damaging;
- losing to an opponent that later proves weaker becomes more damaging.

## No hindsight leakage

V98 does **not** rewrite the pregame rating or stored forecast for a historical game. Historical Brier/error evaluation remains causal. The look-behind is added only after the ordinary chronological replay has finished and therefore affects current ratings/forecasts, not what FORCE claims it knew at the time.

The target game itself is excluded from the opponent-strength evidence by measuring opponent movement from that opponent's **postgame** rating to its current causal rating. Immediately after a game there is therefore zero retrospective adjustment.

## Diagnostics

Chrome console:

```js
FORCE_RATING_LOOKBACK()
```

returns the V98 configuration, per-team corrections, and per-game audit rows including later-game counts, opponent movement, evidence weight, inferred opponent revision, original Elo delta, revised Elo delta, and final bounded correction.

The same payload is included in the standard FORCE diagnostic report as `client.ratingLookbehind`.

## Unchanged

V97 Penalty Impact math, score-aware EPA, same-model WPA, direct-value coherence guard, unit ratings, offseason regression, V34 early-regime logic, and forecast-market blending are unchanged.
