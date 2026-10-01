# FORCE V114 - Centered Receiver / RB Quality Scales

- Fix a V109 policy-dispatch bug: the active stabilized Receiver path now actually uses the intended WR/TE-only receiving EPA/target residual versus team sack-free passing EPA. RB/FB targets are no longer allowed to leak into the Receiver room.
- Fix the matching RB policy-dispatch bug: the active stabilized RB path now uses RB receiving EPA/target residual versus team sack-free passing EPA instead of silently falling back to raw receiving EPA.
- Keep V109 sample-size stabilization, but environment-align stabilized 2026 Receiver and RB signals before full-season historical quality mapping. The current league center is translated to the historical median (quality 50), preserving current-season relative differences while removing league-environment drift.
- Receiver and RB are calibrated independently; no forced 16/16 split and no shared stretch is used.
- Add calibrated/raw centers to unit diagnostics: Receiver exposes current league residual, stabilized residual, calibrated residual, and historical residual median. RB exposes current league component center, stabilized composite, calibrated composite, and historical composite median.
- Predictive bridge weights are unchanged. This is a measurement/calibration correction to the existing first-class Receiver/RB units, not a new additive forecast feature.
