# FORCE V105 - activated historical QB calibration + measured-QB display

**Current bundle: V105** - NFL Ratings & **FORCEcast**

## V105 - activated historical QB calibration + measured-QB display

V105 retains V104's intended calibration but repairs the shipped empty historical-reference cache so the empirical windows actually activate. It also suppresses the QB-unit scenario overlay once the returning starter has current-season QB data, while retaining the V33 team-level Elo prior correction. V104 replaced V103's saturating 32-team QB pass-EPA percentile with same-sized rolling 2025 PBP windows, shrinks early CPOE by pass attempts, and floors the QB preseason prior at one equivalent game through four games. It also calibrates OL disruption against the same de-duplicated PBP definition used live and scores the RB receiving-residual composite against a like-for-like 2025 residual benchmark. Positive-only QB rushing remains separate and capped at +12. See `CHANGELOG_V104.md`.

## V103 - stable QB passing core + additive rushing creation

V103 preserves V102's opponent-adjusted sack-free passing and orthogonal offensive unit ownership, but recalibrates the QB grade. Passing is now a 75% stable-benchmarked opponent-adjusted pass-EPA score + 25% CPOE core. QB rushing is a separate positive-only, volume-shrunk bonus capped at +12, with kneels removed from the PBP path. The V102 offense separation, V101/V100 defense model, and V99 continuity baseline remain intact. See `CHANGELOG_V103.md`.

## V102 - orthogonal offense + opponent-adjusted QB

V102 removes the offensive-side overlap exposed by the V101 defense audit. Canonical offense now uses scoring per qualifying drive as its broad outcome check; QB uses sack-free actual-pass EPA, CPOE, and QB rushing with a data-calibrated opponent-Coverage adjustment; Receivers are WR/TE only and residualized versus the team passing baseline; RB/FB receiving is residualized separately; and OL uses de-duplicated PBP disruptions with sacks/hits counted once. The V101/V100 defense model and V99 continuity baseline remain intact. See `CHANGELOG_V102.md`.

V101 keeps V100's stateful continuity and simple 20% defensive points-per-drive outcome layer, but removes sacks from the Coverage EPA signal. Coverage now measures opponent EPA on actual pass attempts only (plus CPOE); sacks and spikes are excluded. Sacks remain fully represented in Pass Rush, eliminating the previous double count that could make a strong rush artificially improve the Coverage grade.

The Overall Defense weights remain unchanged at **36% Coverage + 16% Pass Rush + 28% Run Defense + 20% defensive points allowed per opponent drive**. Opponent adjustment remains intentionally deferred until this simpler separation is validated directionally.

The frozen Week-2-entry baseline preserves V100's historical Coverage semantics, so V101 does not rewrite the ratings FORCE had already established entering Week 2. Current/post-Week-2 evidence uses the new sack-free Coverage metric.

See `CHANGELOG_V101.md` for the exact PBP filter, diagnostics, and regression coverage.

## V98 retrospective opponent-strength look-behind

V98 added a bounded retrospective opponent-strength layer to the current rating. Completed games remain forecast and graded causally, while the credit assigned to an old result can move as later games reveal that the opponent was stronger or weaker than FORCE believed at the time. V99 retains this mechanism and exposes it separately in the rating ledger.

## V97 Penalty Impact foundation

V97 keeps the V94 same-model WPA repair, V95 same-state EPA architecture, V96 capped/widened 0–100 scale, and the approved **40% EPA / 25% WPA / 20% first downs / 15% erased TDs** blend.

The key V97 correction is that causal EPA is now **score-aware**. Each actual/no-penalty branch is valued as the realized fixed-team score-margin change plus future expected points from the same nflfastR-derived EP surface. This fixes the class of errors exposed by Carolina and Kansas City, where a team's own penalty erased its touchdown but future-EP-only math could still credit the offender with positive EPA.

V97 also explicitly reconstructs nullified made field goals, extra points and two-point tries; treats scoring turnovers before generic turnover logic; and adds a direct-value coherence guard so the 20% first-down / 15% erased-TD context terms cannot reverse the side of neutral when both causal EPA and WPA agree.

Penalty Impact is still descriptive of **2026 only**. No 2025 team penalty result carries into 2026. Historical 2025 data is used only to build league normalization/state references.

## Debugging

Open Chrome DevTools and run:

- `FORCE_PENALTY_DEBUG('KC')`
- `FORCE_PENALTY_SCALE_AUDIT()`
- `FORCE_PENALTY_OUTLIERS(30)`

The server-side equivalents are `/api/penalty-debug?team=KC` and `/api/penalty-scale-debug?limit=30`.

See `CHANGELOG_V98.md` for the rating look-behind and `CHANGELOG_V97.md` / `CLAUDE_CHROME_DIAGNOSTIC_STEPS.md` for the Penalty Impact audit contract.
