# FORCE V108 - Soft-tail Offense/Defense composite calibration

V108 replaces V107's fixed 1.45x linear display stretch for overall Offense and Defense.

## Why
Weighted averages of multiple 0–100 unit grades are mechanically less dispersed than their component scales, but a linear 1.45x stretch overcorrected the upper tail. A raw defense near 80 displayed around 93.5 even when one component was merely good rather than dominant.

## Changes
- Raw Offense and Defense weighted means are unchanged and remain available for audit.
- Displayed Offense uses an endpoint-preserving tanh soft-tail curve with softness 35.
- Displayed Defense uses a more conservative endpoint-preserving tanh soft-tail curve with softness 42.
- 0, 50, and 100 map exactly to 0, 50, and 100.
- The middle of the scale is expanded while the upper/lower tails flatten progressively.
- A raw ~74.88 offense now displays ~84.29 rather than ~86.08.
- A raw ~79.98 defense now displays ~86.90 rather than ~93.47.
- QB-return scenario adjustments now invert the nonlinear display calibration back into raw-composite space before modifying the underlying units.
- `FORCE_COMPOSITE_DEBUG()` reports the separate Offense and Defense calibration objects.
- Predictive Unit → FORCE remains unchanged and continues to use underlying unit grades, not the displayed composites.

## Explicit non-changes
- V106 QB architecture is unchanged.
- Offense/Defense component weights are unchanged.
- Pass Rush, Run Defense, Coverage, and points-per-drive component ratings are unchanged in this pass.
- Unit → FORCE predictive weights/caps are unchanged.
