# MD-07 bounded RB prior-reference intent investigation

**Intent investigation OWNER ACCEPTED; owner-selected LIVE_FITTED correction COMPLETED, independent implementation/fixture reviews PASSED, owner ACCEPTED 2026-10-05; required corrections NONE; ACCEPTED — READY FOR INTEGRATION. MD-07 REVIEW / INVESTIGATE, Priority unset, NOT COMPLETE.** Other unit/model work remains unauthorized.

Owner accepted `1ecd4db3005fbce72fa88222476bcfafd312ca4c` + `98db3b323c928879d9ff7435d77a980744a66289` after Claude's first adversarial verdict C, bounded revision and targeted verdict **A. REVISIONS VERIFIED — MD-07 READY FOR OWNER DECISION**. [Accepted measurement evidence and governance](../README.md) remain separate from this intent investigation.

## Finding and fix eligibility

Historical research finding before the subsequent owner decision; retained without reinterpretation.

**D. SAME-FRAME INVARIANT UNAMBIGUOUS, FRAME CHOICE AMBIGUOUS**

**B. OWNER MODEL DECISION REQUIRED BEFORE FIX**

The inconsistency is a real production-live comparison/reference defect; this investigation does not reopen that diagnosis. Like-for-like reference/value transformation is required. However, the recovered local history begins with a V149 import that already includes V115 and conflicting effective-prior calls. No original V115 introducing diff, explicit effective-prior frame instruction or distinguishing effective-prior test was recovered. The fitted frame has meaningful design/WR-analogue support, while actual default individual calls support another reading. Neither is established strongly enough for decision-free restoration. No frame was selected by this investigation; the separate owner decision below now selects LIVE_FITTED.

[Historical extraction and excerpts](history.md), [source/diff pins](history.json), [call inventory](callsite_inventory.json) and [analyst intent matrix](intent_matrix.json) separate facts, inference and absence of evidence. Matrix strengths are analyst evidence judgments, not mechanically derived intent or model adoption.

## Separate the two historical-reference consumers

These call descriptions are pinned pre-fix history, not the current implementation. Current owner-selected construction is recorded separately in [implementation evidence](IMPLEMENTATION.md).

| Component | Explicit construction in recovered V115 source | Intent certainty |
|---|---|---|
| A. Live RB signal | 70% rushing +30% receiving after partial fitted QB-environment subtraction; stabilization/environment translation follow | Explicit fitted live design |
| B. Historical profile signal | Stored 2025 profiles retain rushing/receiving/QB inputs; live-CDF consumer transforms them with fitted beta/center; effective individual consumer invokes full default subtraction | Inputs unambiguous, effective-prior policy choice unresolved |
| C. Reference distribution | Live calibration reference uses fitted unary wrapper; separate effective-prior reference uses direct callback and accidentally unadjusted receiving | Fitted live reference explicit; effective reference violates invariant, not intentional unadjusted evidence |
| D. Individual effective prior | `priorRbOrthogonalComposite(prior)` supplies only profile, so beta1/center0 defaults apply | Current behavior explicit; whether intended V115 retention or incomplete adaptation is ambiguous |

Do not collapse the fitted live calibration reference and defective effective-preseason reference into one array. This is the key distinction in the intent evidence.

## Signature and fitted-parameter provenance

Optional `recvBeta=1` and `qbCenter=0` exist from the earliest recovered root and never change in later local history. They mean full QB receiving subtraction, not partial ridge subtraction. Older residual policies and the effective individual production path rely on them; V115's live-reference path explicitly overrides them. No comment establishes that these defaults are only compatibility/fallback or uniquely intended for V115 production priors. Mere defaults cannot prove intent.

The direct `Array.map(fn)` use is an ordinary callback-arity bug: index becomes beta, array becomes center, numeric center is NaN, and `partialResidual` returns receiving EPA unchanged. A consistent unary-default reference would restore one possible frame, but its small effect is not evidence that this is the intended model.

The fitted beta **.32652935756243806** is covariance/variance divided by `1+.50`, using 32 bundled 2025 historical profiles (QB `epaoe`, fallback `epa_per_play`, versus RB `adj_recv`). Centre **.0615** is their QB median. All 32 profiles have the needed rushing/receiving/QB fields. Both values reproduce the frozen capture. They are properties of the supplied reference-season population and model-version ridge rule, not a fit to current-season rankings or immutable constants for every possible prior population. Live and live-CDF historical values explicitly share them; the separate effective-prior calls do not explicitly do so.

## Invariant versus frame evidence

V104 like-for-like notes, V109 same-definition prior notes, percentile helpers and analogous WR/run-defense callers strongly establish the invariant. WR reference and individual prior both explicitly carry the policy-selected fitted beta/center. The adjacent construction supports an incomplete-RB-adaptation interpretation, but does not prove RB must copy WR. Older full-residual docs support the historical default context; V57 numeric prior anchors cover only the legacy raw-composite policy, not V115; raw-receiving fallback and the accidental callback outcome do not establish intentional V115 unadjusted priors.

## Intent evidence matrix summary

Full matrix has five columns (DEFAULT / LIVE_FITTED / UNADJUSTED / SAME_FRAME / AMBIGUOUS), each cell with strength, resolved historical source and explanation. The compact summary below highlights rather than replaces those cells.

| Evidence | Default | Fitted | Unadjusted | Same-frame invariant | Ambiguity |
|---|---|---|---|---|---|
| local-introduction | NONE | NONE | NONE | NONE | STRONG |
| signature-defaults | MODERATE | NONE | NONE | NONE | MODERATE |
| live-rb-signal | NONE | STRONG | NONE | MODERATE | NONE |
| live-historical-cdf | NONE | STRONG | NONE | STRONG | NONE |
| effective-individual | MODERATE | NONE | NONE | NONE | STRONG |
| effective-reference | NONE | NONE | WEAK | STRONG | MODERATE |
| wr-analogue | NONE | MODERATE | NONE | STRONG | NONE |
| version-labelled-docs | WEAK | MODERATE | NONE | STRONG | MODERATE |
| historical-tests | NONE | WEAK | WEAK | WEAK | STRONG |
| later-source-history | NONE | NONE | NONE | WEAK | STRONG |

## Accepted current-impact guard only

The unchanged accepted bracket reproduces maximum current-grade changes **1.630955871 /3.142796411 /5.108745422** for default/fitted/unadjusted matched frames. KC remains rank 3 in all frames, with current changes −.1035/+.3122/+.7280; it does not explain live 90→display 76. The already accepted bridge-channel effects are not total FORCE changes. Existing [prior audit](../results/rb_prior_call_audit.json) is referenced, not rewritten or re-ranked into a preference.

No better rankings, Walker appearance, box-score/benchmark correlation, smaller movement or forecast effect is used as design-intent evidence. No new performance evaluation, live capture, data acquisition or measurement re-analysis is performed. Frozen input hash remains `b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247`.

## Reproducibility and controls

Run from repository root with local Git history available:

```text
node research/cycle8/md07_unit_calibration/rb_prior_intent/extract.mjs
node research/cycle8/md07_unit_calibration/rb_prior_intent/check.mjs
node --check research/cycle8/md07_unit_calibration/rb_prior_intent/extract.mjs
node --check research/cycle8/md07_unit_calibration/rb_prior_intent/check.mjs
```

Extraction uses pinned Git objects, not branch names or Git working-file guesses. `history.json` and `callsite_inventory.json` regenerate deterministically; matrix is an authored assessment with pinned source references. Parent [hash manifest](../hashes.json) seals all new artifacts and updated acceptance text. Negative controls cover omitted production caller, direct-callback misclassification, historical SHA drift and swapped frame labels. Accepted original scripts, input/provenance/facts and all nine measurement result artifacts must equal the accepted commit. Only the already accepted RB bracket is recomputed as a guard.

## Validation record — 2026-10-05

PASS: ten research-script syntax checks; two separate-process LF-clean extractions reproduced generated JSON byte-for-byte; two checker processes returned identical output. Three ancestral model commits/four model snapshots, three production invocations per snapshot, 17 accepted-tree occurrences, six other historical file revisions and ten evidence-matrix rows are pinned. Four negative controls rejected omitted caller, callback misclassification, historical SHA drift and frame-label swap. All 22 immutable accepted package files, including all nine result artifacts and input/provenance/facts, matched `98db3b3`; thirty package checksum pins verified. Only accepted RB impact guard recomputed, with KC rank 3 in all frames. Existing V57/V114/V115 focused contracts passed 3/3 in the isolated runner, leaving worktree status/file hashes unchanged; their effective-prior frame limitations remain explicit. All 56 authoritative roadmap IDs unique; 227 local links/nine anchors resolved; roadmap text outside MD-07 unchanged. No production/runtime/model/provider/test/catalog/generated change, capture, merge, push or deployment.

## Owner boundary and next decision

Owner ACCEPTED intent research `207f4b58b57b96cd41657deb0f6eec42de3aacc2` on 2026-10-05 after Claude's **A. RB PRIOR-INTENT RESEARCH VERIFIED — READY FOR OWNER DECISION**. Historical classification remains **D. SAME-FRAME INVARIANT UNAMBIGUOUS, FRAME CHOICE AMBIGUOUS**. Owner then selected **LIVE_FITTED** as the canonical V115 effective-prior frame and separately AUTHORIZED ONLY its bounded correctness implementation. This is an explicit owner model decision based on design consistency and the same-frame invariant, not proven original author intent or nicer rankings, lower impact or Walker/KC aesthetics. Implementation COMPLETED; independent implementation/fixture reviews PASSED; owner ACCEPTED on 2026-10-05; required corrections NONE; ACCEPTED — READY FOR INTEGRATION.

[Implementation evidence](IMPLEMENTATION.md) records the same fitted live/reference/effective-prior frame without altering the historical matrix, extraction or classification. MD-07 stays REVIEW / INVESTIGATE, NOT COMPLETE; MD-08/UX-41 PLANNED / NOT AUTHORIZED, MD-05 REVIEW/BANKED, MD-06 REVIEW / NOT AUTHORIZED. No automatic follow-on work. Nothing merged, pushed or deployed.
