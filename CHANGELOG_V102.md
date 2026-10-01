# FORCE V102 - Orthogonal offense + opponent-adjusted QB

## Why this release exists

V101 fixed defensive double-counting by removing sacks from Coverage. A follow-up unit audit found analogous offensive overlap: team EPA, QB EPA, receiving EPA, OL rushing EPA and RB receiving EPA could all reward or punish the same underlying plays multiple times. Patrick Mahomes/Kansas City was used as a diagnostic case, but V102 is league-wide and contains no team-specific rating target.

## Canonical offense is now outcome + distinct units

The canonical 20% broad offensive bridge input is **points scored per qualifying offensive drive**, not team EPA. Team EPA remains visible as a diagnostic but no longer directly duplicates QB/receiver/RB play value in the bridge. The remaining offensive bridge weights are unchanged: QB 12%, receivers 8%, OL 8%, RB 7%.

Displayed Overall Offense is now 20% scoring/drive + 30% QB + 15% WR/TE receiving + 15% OL + 20% RB/FB.

## QB owns QB performance, not sacks

Live QB is now:

- 65% opponent-adjusted EPA on **actual pass attempts only**; sacks/spikes excluded,
- 20% CPOE,
- 15% QB rushing EPA/attempt.

Opponent adjustment is data-calibrated rather than hard-coded: V102 fits the 2025 relationship between Coverage index and raw pass EPA allowed, then adjusts each 2026 QB's sack-free pass EPA by the attempt-weighted current Coverage quality of the defenses faced. Because current Coverage incorporates later games, this is a retrospective opponent-quality update consistent with FORCE's team look-behind philosophy.

The QB index still begins from the 30%-regressed 2025 preseason prior. Good live play therefore moves the unit upward from that anchor; it is not rebuilt from a separate baseline.

## Receivers and RBs no longer claim the same targets

- Receivers = **WR/TE only**. RB/FB targets are excluded.
- WR/TE receiving EPA is graded as a residual versus the team's sack-free actual-pass EPA baseline.
- RB = RB/FB only: 70% rushing EPA/attempt + 30% receiving EPA residual versus the same sack-free pass baseline.
- QB rushing remains in QB and never enters RB.

## OL owns pass protection only

The old 30% team-rushing-EPA contribution is removed from OL. V102 derives OL disruption from play-by-play dropbacks and counts a dropback as disrupted when **QB hit OR sack** occurs. A sack/hit on the same play therefore counts once, eliminating provider-definition ambiguity.

## Defense preserved

V101 Coverage remains sack-free. V100 Defense remains 36% Coverage + 16% Pass Rush + 28% Run Defense + 20% defensive points allowed per opponent drive.

## Continuity

The frozen Week-2 entry baseline retains V101 offensive semantics. V102's new unit definitions apply to current/new evidence and do not retroactively rewrite the baseline.

## Diagnostics

- `FORCE_QB_DEBUG(team)`
- `FORCE_UNIT_OVERLAP_AUDIT(team?)`
- existing `FORCE_UNIT_AUDIT`, `FORCE_DEFENSE_DEBUG`, `FORCE_PASS_RUSH_DEBUG`, and `FORCE_RATING_LEDGER` remain available.

## Validation

V102 adds regression coverage for sack-free/opponent-adjusted QB, receiver/RB separation, de-duplicated OL disruption, the scoring-per-drive offensive bridge, and Week-2 baseline compatibility.
