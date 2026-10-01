# FORCE V106 - Current-Season QB Stabilization

## Goal
Make QB ratings primarily a statement about 2026 while preventing 1–2 game efficiency spikes from masquerading as stable near-perfect quarterback quality.

## Changes
- QB core is now 65% stabilized opponent-adjusted sack-free pass EPA, 20% stabilized pass success rate, and 15% stabilized CPOE.
- Each 2026 metric is shrunk toward the current 2026 league environment by pass-attempt volume before being translated to a 0–100 score.
- First-pass reliability constants: EPA K=150 attempts, success K=100, CPOE K=60. These are explicitly diagnostic/tunable and do not represent extra 2025 player weight.
- Stabilized EPA and success are scored against full-season 2025 league distributions to give the 0–100 scale long-run quality semantics. 2025 team/player performance is not blended into those current metrics.
- Removed V104/V105's special one-game QB prior floor for the V106 policy. The existing regime-aware continuity prior remains, but sample-size control now lives mainly inside the 2026 evidence.
- Added pass success rate from the same sack-free actual-pass PBP used for QB EPA.
- Positive-only kneel-free QB rushing bonus is retained unchanged.
- RB/OL like-for-like benchmark fixes from V105 are retained.
- Expanded QB diagnostics with raw/stabilized EPA, CPOE, success rate, 2026 league centers, and reliability weights.

## Intentionally unchanged
- Opponent Coverage adjustment logic (still a separate follow-up).
- Defense weighting.
- Offense/Defense display rescaling.
- Unit→FORCE bridge cap.
