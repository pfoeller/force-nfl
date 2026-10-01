# Predictive feature policy

FORCE distinguishes **descriptive ratings** from **predictive features**.

A descriptive rating may be useful for explaining how a team plays without improving game prediction. V30 therefore does not infer predictive value from face validity. The promotion test is empirical.

## Promotion rule

A candidate can receive nonzero predictive weight only if all of the following are true:

1. The historical inputs are available strictly before kickoff; no end-of-season or future information may leak backward.
2. Hyperparameters/weights are selected without evaluating on the same games used for the final score (future-season holdout, rolling-origin validation, or equivalent nested procedure).
3. Candidate Brier score is no worse than the incumbent forecast on the defined evaluation set.
4. The benchmark artifact records the baseline, candidate score, delta, population/window, and caveats.

If any condition is missing, the production predictive weight is 0. The rating may still be displayed.

## Current registry

The V30 registry deliberately keeps all live unit ratings at zero predictive weight. They were built as diagnostics and do not yet have a valid pregame historical replay. Using a static end-of-season profile to back-predict games from that same season would leak future information and is explicitly disallowed.

The QB carryover correction is treated separately because the existing 11-episode study uses prior-season ending ratings and next-season outcomes. Its aggregate Weeks 1–8 Brier improved by 0.009421. Because the sample is small and its bootstrap interval includes zero, it remains optional rather than default-on.

## Weight selection

Passing the gate means a feature is *eligible*, not that an arbitrary weight is justified. Production weight must come from the same leakage-safe validation process. Until such a fit exists, a newly eligible unit feature should remain at 0 rather than receive a hand-picked coefficient.

## V33 update - verified returning-QB regime cases

V33 narrows and promotes the carryover concept. It is no longer a blanket user-enabled prior. Automatic predictive weight is permitted only for mechanically verified registry cases that satisfy the returning-starter decline gate. The production rule uses 7.5 Elo per verified missed start before offseason reversion, a 60-Elo cap, and a four-team-game half-life. In the six-case decline-gated prior-isolation subset, Weeks 1–8 Brier improved from 0.231676039 to 0.221817174 (delta -0.009858864), with five of six episodes improving. Unverified teams remain at zero predictive weight from this feature. A manual lab override replaces the automatic correction instead of stacking on top of it.

This does not supersede the caveat that the event study is not a full-PBP replay; it changes only the promotion scope and production default for verified cases.
