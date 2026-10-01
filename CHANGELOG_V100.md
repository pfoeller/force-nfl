# FORCE V100 - simple defensive points-per-drive outcome layer

V100 is intentionally narrow. It keeps V99's canonical-rating continuity, Week-2 baseline preservation, retrospective opponent-strength look-back, and pass-rush fallback intact, then adds one simple outcome check to Overall Defense before any opponent adjustment is attempted.

## Overall Defense

Overall Defense is now:

- **36% Coverage**
- **16% Pass Rush**
- **28% Run Defense**
- **20% defensive points allowed per opponent drive**

The first three weights are the V99 45/20/35 defense recipe scaled proportionally to 80% so their relative meaning is preserved.

The new points-per-drive component is deliberately simple and **not opponent-adjusted in V100**. V101 should add opponent quality only if V100's unadjusted directionality looks sensible across the league.

## Defensive points allowed per drive

The local server derives the metric from the same 2026 nflverse play-by-play already used by Game Flow and penalty context.

A qualifying opponent possession must contain a real offensive scrimmage snap or field-goal attempt. Kneel-only possessions are excluded. Overtime possessions are included.

Only points scored by the opponent's offense are charged to the defense:

- offensive touchdowns: 6
- made field goals: 3
- successful PATs: 1
- successful two-point tries: 2

Defensive/special-teams return touchdowns and safeties are not charged to a defense that was not on the field.

The live raw value is ranked cross-sectionally among current 2026 defenses, lower being better. Because V100 does not yet have a historical drive-level prior, the 0–100 outcome index uses an explicit neutral one-game stabilizer (50). After two games, the points-per-drive grade is therefore 2/3 live and 1/3 neutral.

## FORCE bridge

The unit-to-FORCE bridge still allocates 45% of its unit signal to defense. V100 gives 20% of that defensive block to points-per-drive prevention:

- Coverage: 0.162
- Pass Rush: 0.072
- Run Defense: 0.126
- Points/drive prevention: 0.090

The total bridge weights still sum to 1.00.

To preserve V99 continuity, the Week-2-entry anchor is reconstructed with the historical V99 bridge weights. The V100 outcome component is new evidence applied after that frozen baseline; it cannot retroactively rewrite the Week-2 starting point.

## Diagnostics

`FORCE_DEFENSE_DEBUG(team)` exposes the four weighted defense components, raw offensive points allowed, opponent drives, raw points/drive, and final outcome index.

`FORCE_UNIT_AUDIT(team)` now exposes:

- offensive points allowed
- opponent drives
- defensive points allowed per drive
- points-per-drive 0–100 index

The points-per-drive unit is also included in the rating ledger's unit-component comparison.

## Regression coverage

V100 adds:

- `scripts/test_v100_points_per_drive.py` - PBP possession/scoring derivation including offensive TD/PAT/FG, defensive return TD exclusion, kick-return TD exclusion, kneel-only possession exclusion, and drive counting.
- `scripts/test_v100_defense_ppd.js` - exact 36/16/28/20 Overall Defense math plus 9% unit-bridge share and normalized bridge weights.

Existing V99 all-team Week-2 unit coverage now also requires a finite points-per-drive prevention grade for all 32 teams (neutral fallback when PBP drive context is unavailable in synthetic fixtures).

## Deliberately deferred to V101

V100 does **not** opponent-adjust defensive points per drive. No schedule-strength multiplier, offensive-quality correction, or retrospective opponent adjustment is applied to this component yet. The purpose of V100 is to test whether a simple possession-based scoring outcome moves defenses in the expected direction before adding complexity.
