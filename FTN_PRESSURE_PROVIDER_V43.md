# V43 FTN pressure-provider audit

## Decision

Use an **FTN-first, schema-gated provider** rather than infer pressure from the currently published FTN context fields.

## nflverse source audit - 2026-09-16

The live nflverse FTN charting release is available in-season and is described as play-level manual charting, generally charted within 48 hours of each game. Its published 29-field dictionary includes `n_blitzers`, `n_pass_rushers`, and `is_qb_fault_sack`, but no generic pressure outcome.

The nflverse participation dictionary contains `was_pressure`, but nflreadr documents 2023+ FTN participation as being provided after all postseason games are completed. That makes it useful historically but not a current-season live provider.

## FORCE contract

FTN can drive Pass Rush only if all of the following are true:

1. an explicit pressure result field is present;
2. the row can be assigned to a defense;
3. there is a positive dropback sample;
4. historical calibration remains available.

No combination of blitz count, pass-rusher count, QB movement, throw-away status, or QB-fault-sack status is allowed to manufacture a pressure event.

## Transition behavior

1. Try live FTN play-level true pressure.
2. If unavailable, try V42's team-verified PFR/Sportradar advanced pressure.
3. If that team row is incomplete, hold the 2025 charted-pressure prior.

This keeps the architecture ready for the desired source without lowering the evidentiary standard of the metric during the transition.
