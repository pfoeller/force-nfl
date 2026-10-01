# FORCE V110 - Performance Deserved Wins + Fumble-Recovery Luck

## Luck model
- Replaces V109's aggregate Pythagorean expected wins as the primary Luck record signal with game-level postgame deserved-win probabilities.
- Each game combines final score margin with underlying EPA/play, success-rate, yards/play, offensive points/drive, and interception differential evidence.
- Interceptions remain a performance/decision signal. Fumble recovery is deliberately excluded from the turnover-skill term and scored separately as luck.
- Overall Luck is 55% deserved-win surplus, 25% Penalty Impact, and 20% stabilized fumble-recovery luck.
- Fumble recovery uses every identifiable live-ball recovery opportunity and shrinks observed recovery rate toward 50% with four neutral opportunities.
- Pythagorean and pregame FORCE expected wins remain in FORCE_LUCK_DEBUG as audit references.

## Existing model behavior retained
- V109 Receiver/RB current-season stabilization remains unchanged.
- V108 Offense/Defense soft-tail composite calibration remains unchanged.
- V106 current-season-first QB stabilization remains unchanged.
- Luck remains a contextual/display diagnostic and does not feed predictive FORCEcast.
