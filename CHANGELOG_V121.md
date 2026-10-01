# V121 - EPA/play-heavy Luck

- Re-centers FORCE Luck on scoring realization relative to underlying net EPA/play.
- Fits a league-wide 2025 OLS relationship between net scrimmage EPA/play and final scoring margin, retaining the historical home-field intercept and residual variance.
- Current teams compare actual point differential with EPA-implied point differential; under-realizing strong EPA is negative luck even when the team has a good record.
- Overall raw Luck blend is now 60% EPA scoring realization, 20% Penalty Impact, 15% event-adjusted fumble recovery, and 5% standardized outcome surprise.
- Existing Pythagorean, pregame, and deserved-win estimates remain available for audit but are no longer the primary Luck driver.
- Luck remains diagnostic-only and does not enter FORCE/Elo, Unit→FORCE, predicted spreads, or win probabilities.
