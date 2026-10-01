# Adaptive v3 research plan - where a lower Brier score might actually come from

The current champion in the supplied Celo research is the closing market at
approximately **0.2095 Brier**. Beating that is much harder than beating an Elo
model, because a closing line already aggregates injuries, roster news,
matchups, weather, public/private information and professional price discovery.

The right question is therefore not “what football fact does Vegas forget?” It
is: **where does the mapping from market expectation to realized win
probability remain systematically imperfect, and can that imperfection be
estimated before kickoff without overfitting?**

## Candidate family 1 - team-conditioned market residuals

### General margin-vs-market residual

For each team after a completed game:

`team residual = actual team scoring margin - market expected team margin`

Positive means the team exceeded the line's expected margin; negative means it
fell short. Use an exponentially weighted history with strong shrinkage to zero.

Why it might help: a market can update team quality more slowly than a latent
regime change, especially early after a coordinator/QB/system change.

Why it might fail: ATS/margin residuals are famously noisy. Without shrinkage,
this becomes trend chasing.

### Favorite / underdog regime

Do not assume a team's error is the same in every price regime. Track separate
or smoothly interacted residuals for:

- large favorite (prototype threshold: 6+);
- small favorite;
- near pick'em;
- underdog.

The production form should probably use a continuous spline/interation with
spread rather than hard buckets if sufficient data exists. The 6-point bucket
is useful as a transparent first test of the user's example.

### Home / away regime

Some market residuals may be venue-specific. This should be partial-pooled, not
four independent tiny samples per team.

## Candidate family 2 - dynamic trust in Vegas vs the independent model

Adaptive v3 tracks prior Brier error for market probability and the independent
probability in games involving each team. The market weight starts at the
validated 98%-ish market-dominant baseline and can move only within a clipped
range.

Potential refinements:

- hierarchical shrinkage of team trust toward league-average trust;
- separate trust state after QB/coach regime changes;
- uncertainty-aware weight: less history = tighter shrinkage around baseline;
- decay selected by walk-forward likelihood rather than manually;
- use log-loss advantage as a secondary diagnostic so Brier improvement is not
  purchased with pathological tail probabilities.

## Candidate family 3 - market/model disagreement

The original Celo GBM already tested a simple market-vs-Elo delta and did not
beat the market benchmark. That does not completely eliminate the idea; it says
a generic static nonlinear model did not find durable value.

More defensible variants:

- team-specific disagreement reliability: when Vegas and the independent model
  disagree on *this team*, which source has historically been right?
- regime-specific disagreement after a starting-QB change;
- disagreement conditional on how fresh the market price is;
- disagreement conditional on line movement.

Every one needs pregame timestamps. Closing-line information cannot be used to
pretend an earlier Tuesday forecast knew Friday injury news.

## Candidate family 4 - division / familiarity effects

The independent model already carries divisional attenuation. The market line
also knows the game is divisional, so raw evidence that division games are
closer does **not** establish exploitable residual bias.

Tests worth running *after controlling for the market*:

1. Does favorite win probability implied by spread systematically overstate the
   favorite in division games?
2. Is any effect concentrated in second meetings of the season?
3. Does effect size depend on spread magnitude?
4. Does short rest amplify it?
5. Does coaching continuity / scheme familiarity matter more than the label
   “division” itself?

Adaptive v3's runtime division coefficient is zero until these tests pass.

## Candidate family 5 - spread-to-win mapping

When moneylines are absent, the prototype converts spread to win probability
with a simple logistic scale. That can be improved without claiming predictive
information beyond Vegas.

Candidate inputs:

- spread;
- game total (a 7-point spread in a 34-point total is not the same uncertainty
  environment as 7 points in a 60-point total);
- home/neutral field;
- overtime-era/rule era;
- weather/roof when timestamp-correct;
- favorite/underdog asymmetry.

Fit this conversion only on prior seasons. This may improve Brier even if the
market spread itself remains unbeatable as an information source.

## Candidate family 6 - opening-to-current line movement

Potentially high value if timestamped correctly:

- opening probability;
- current probability;
- magnitude/direction of move;
- whether independent model agrees with the move;
- whether move followed a known QB/injury status change.

A price that has moved 3 points contains a different information story from a
stable price. Do not collapse opening/current/closing into one `spread_line`
field.

## Candidate family 7 - team forecast variance

Brier is about win probability, not expected margin alone. Two teams with the
same expected margin can have different outcome variance.

Candidate lagged, pregame-safe features:

- variance of team scoring margin relative to expectation;
- explosive-play dependence;
- turnover sensitivity (using predictive/expected turnovers rather than raw
  lucky turnover margin where possible);
- QB volatility;
- pace / game total interaction.

High-variance teams should often have probabilities pulled modestly toward
50%, conditional on the same expected margin.

## Candidate family 8 - latent regime changes

A team-specific residual should not take half a season to acknowledge a truly
new team state. Candidate reset/change-point triggers:

- starting QB change;
- head coach / play-caller change;
- trade deadline acquisition/loss of a high-impact player;
- cluster of starter injuries;
- bye week with major roster change;
- season boundary.

Use an explicit reset or increased state variance rather than hand-waving a
larger recency weight for everyone.

## Candidate family 9 - schedule / situational context

Test only after confirming the market leaves residual signal:

- rest differential and short week;
- travel distance and time-zone shift;
- international / neutral-site games;
- altitude;
- consecutive road games;
- post-bye;
- late-season motivation only if it can be encoded without hindsight.

The existing independent ablations suggest many generic context features are
small. The market-conditioned residual is the standard that matters here.

## Candidate family 10 - opponent-pair familiarity

“Division” may be too coarse. An optional hierarchical pair state could test
whether repeated opponent pairs systematically compress margin relative to the
market. It must be strongly pooled because individual pair samples are tiny.

## Better statistical end-state: hierarchical dynamic model

If the simple v3 features show durable value, the production successor should
probably not be a pile of hand-tuned sliders. A better formulation is a
hierarchical state-space model:

- league-level market calibration parameters;
- team-level latent residual states with partial pooling;
- AR(1)/random-walk evolution over time;
- regime-change variance inflation;
- context interactions (favorite size, division, total) shrunk toward zero;
- independent model as an additional prior signal;
- market timestamp/stage explicit in every observation.

That gives the requested “sliding scale” mathematically: the posterior decides
how much to trust Vegas, independent football strength, and team-specific
history according to both estimated effect and uncertainty.

## Promotion sequence

Do not fit every idea simultaneously. Use an ablation ladder:

1. Static Smart v2 baseline.
2. + general lagged team residual.
3. + dynamic market/model trust.
4. + large-favorite interaction.
5. + division interaction.
6. + spread/total calibration.
7. + line movement.
8. + regime resets.

At every step record:

- Brier overall and by season;
- log loss;
- calibration error;
- sample coverage;
- performance by probability bucket;
- performance for division/non-division;
- performance by favorite-size bucket;
- coefficient/state stability across rolling windows.

A feature that wins only one season or one probability bucket should not be
promoted merely because aggregate Brier moved by a few ten-thousandths.

## Current conclusion

The user's intuition is **worth testing** and can be encoded without leakage.
The strongest near-term candidates are:

1. lagged team margin-vs-market residual with shrinkage;
2. dynamic team-conditioned market/model trust;
3. a large-favorite interaction;
4. better spread-to-win calibration using total when moneyline is missing;
5. line movement once timestamped odds are available.

Divisional compression is plausible but should be treated more skeptically,
because Vegas is already explicitly pricing the opponent and context. It earns
a non-zero market-layer coefficient only if the walk-forward data says so.
