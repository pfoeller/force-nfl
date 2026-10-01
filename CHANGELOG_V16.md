# V16 - market spread sign audit

- Fixed the matchup-page market line display. nflverse `spread_line` is a home-oriented expected margin, not sportsbook notation.
- A raw `+2.5` for home KC now renders correctly as **KC -2.5 · DEN +2.5**.
- Added plain-English helper copy: **negative = favorite**.
- Adaptive market movement now says which team the adjustment moves toward instead of showing an ambiguous signed number.
- Audited every `spread_line` / `spreadLine` use in the JS and Python forecast, adaptive, and fitting code. The predictive math already used the sign correctly; no model probabilities or Brier benchmarks were changed.
- Added `SPREAD_SIGN_AUDIT.md` and `scripts/test_v16_spread_sign.js`.
