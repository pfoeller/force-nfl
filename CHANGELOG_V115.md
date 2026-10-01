# FORCE V115 - Partial Orthogonalization for Receiver/RB

- Replaces one-for-one Receiver subtraction of team/QB pass EPA with a league-wide 2025 fitted coefficient, ridge-shrunk toward zero so the Receiver room is not charged for all of the passing efficiency it helped create.
- Reconstructs the 2025 Receiver benchmark closer to WR/TE-only by removing RB receiving EPA weighted by RB targets when the historical snapshot provides both.
- Applies the same partial QB-environment residual concept to RB receiving.
- Keeps RB rushing directly credited to the RB/FB room rather than inventing an OL subtraction from a pass-protection metric.
- Moderately relaxes opportunity stabilizers (Receiver targets 120→80; RB carries 80→50; RB receiving targets 60→40) so exceptional current evidence can reach the upper tail while remaining sample-stabilized.
- Retains V114 environment centering and matching historical quality mapping.
- Leaves QB, OL, Offense/Defense composite calibration, Luck, Unit→FORCE bridge weights, Elo/forecast logic, and predictive-feature gates unchanged.
