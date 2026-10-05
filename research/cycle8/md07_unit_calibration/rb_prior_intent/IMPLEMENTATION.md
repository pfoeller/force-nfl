# MD-07 bounded V115 RB prior-frame implementation — 2026-10-05

Implementation parent: `207f4b58b57b96cd41657deb0f6eec42de3aacc2`.
Branch: `cycle8/codex-md07-unit-calibration-audit`.
Owner ACCEPTED that intent investigation after Claude's
**A. RB PRIOR-INTENT RESEARCH VERIFIED — READY FOR OWNER DECISION**.
First research tranche (`1ecd4db` + `98db3b3`) remains OWNER ACCEPTED.

## Owner decision and scope

Owner selected **LIVE_FITTED** and AUTHORIZED ONLY V115 effective-prior
reference/value consistency. This is an explicit owner model choice based
on design evidence and the same-frame invariant, not historically proven
original V115 author intent. The accepted historical classification remains
**D. SAME-FRAME INVARIANT UNAMBIGUOUS, FRAME CHOICE AMBIGUOUS**.

Rationale: V109 same-definition prior principle; V115 partial receiving
residualization and receiver analogy; fitted WR prior handling; existing fitted
RB historical live-CDF reference. DEFAULT support is mainly ambiguous surviving
profile-only calls; UNADJUSTED mainly reflects callback leakage. Ranking
aesthetics, smaller movement, Walker/KC appearance and benchmark fit did not
select this frame.

**Owner acceptance / integration readiness — 2026-10-05:** Owner ACCEPTED implementation/source `cdcfa8de4eed10f26be0c28b05583c4240586537` and UX-19 fixture transition `e35145aac5a66bb141d6dc8593b2902d0fc52503` after independent implementation and fixture reviews PASSED. Claude's targeted fixture verdict was **A. FIXTURE TRANSITION VERIFIED — READY FOR OWNER ACCEPTANCE**; required corrections NONE. Execution at acceptance: **REVIEW / INVESTIGATE; ACCEPTED — READY FOR INTEGRATION** onto local main; Priority unset; MD-07 NOT COMPLETE. Merged/integrated NO; pushed NO; deployed NO. Superseded by local integration onto `main` on 2026-10-05 (fast-forward to `e840fad`, not pushed or deployed); MD-07 execution is now COMPLETE for the authorized bounded tranches only. Acceptance introduces no follow-on research, implementation, integration or deployment authority.

At implementation/source `cdcfa8de4eed10f26be0c28b05583c4240586537`,
acceptance was pending independent review and the normal safe gate was **146/147**:
the existing UX-19 golden pinned pre-correction grades. No fixture recapture,
weakened test or exclusion occurred in that implementation commit. This was
a historical validation blocker, subsequently resolved by the separately
authorized and independently verified fixture-only transition below.

## Accepted UX-19 fixture transition — 2026-10-05

Transition `e35145aac5a66bb141d6dc8593b2902d0fc52503` has exact parent/source
`cdcfa8de4eed10f26be0c28b05583c4240586537`. Independent implementation/fixture
reviews PASSED; owner acceptance ACCEPTED; required corrections NONE.
The repository-hygiene blocker was cleared before capture; all seven supplied
attachments present at that step were preserved. Two clean LF exports produced
byte-identical captures. Only four of 2,248 leaves changed; 2,244 are unchanged:

| Bundled field | Previous | Accepted |
| --- | ---: | ---: |
| DEN rbIndex | 27.36350417032484 | 31.40625 |
| KC rbIndex | 16.638284326313986 | 18.281250000000004 |
| DEN offenseComposite | 51.227465379671074 | 52.521792294828295 |
| KC offenseComposite | 47.03958027579622 | 47.56498243187875 |

The offense changes are purely derived from RB under unchanged weights/calibration.
Played state and every other golden field are unchanged; fixture-commit
production/model/test-logic diff is zero. [Full provenance](../../../../scripts/TESTING.md#golden-fixture-scriptsfixturesux19_goldenjson)
records the old SHA-256
`dccab41d90066edbcff92710ee3ec76af7c0f91d715e82a8c967719f4cf63379`,
accepted SHA-256
`c8b1390dcd1033ad40d40b464ed60a5d097e0da578abc5768d556d4fd41eb24a`
and Git blob `d8de578f498cf33c249346b33695ae593eb50ad7`.

Verified post-transition LF validation: catalog 259; safe 147/147; model 50/50;
release 17/17; QB 28/28; snapshot 6/6; server 30/30; default exclusions 112;
focused V115 RB 1,060 checks PASS; golden-fixture governance PASS.
No pending implementation/fixture review or owner acceptance remains.
No fixture recapture occurs in this documentation closeout.

## Production construction

Authoritative source: [model/live_profiles.js](../../../../model/live_profiles.js).
Tracked mirror: [public/model/live_profiles.js](../../../../public/model/live_profiles.js).
Canonical `scripts/build_public.py` copies source to the browser mirror;
the mirror was regenerated, never independently edited.

One per-build unary `v115RbPriorComposite` closes over the already-computed
`rbRecvPassBeta` and `orthogonalQbCenter`. V115 live-CDF historical population
uses it; effective-prior reference reuses that same finite population; each
individual prior invokes the same helper. Live RB receiving continues to use
the identical fitted variables. No independent recomputation or hard-coded
frozen beta/center. Helper definition/fallbacks and defaults remain unchanged.

The non-V115 reference and individual branches retain their exact previous
behavior, including legacy callback behavior; this authorization does not fix
other policies. Rushing/receiving inputs, 70/30 weights, ridge formula/fraction,
median, stabilization, mapping, prior reversion/blend, bridge/share/cap,
normalization and other units are unchanged. No production research import.

## Regression and frozen parity

[Focused regression](../../../../scripts/test_v115_rb_prior_frame.mjs):
1,060 checks; five behavioral mutations reject bare callbacks, default
individual, wrong live-CDF frame, default-both and unadjusted-both.
Synthetic profiles distinguish all three frames and exercise QB/rushing field
fallbacks. Two reference populations exercise dynamic fits/centers. The real
build is observed in an isolated VM without adding production exports.
Independent composite/prior arithmetic checks supplied fit parameters and
reference/individual semantics, not merely finiteness or frozen final scores.

Full-profile parity covers six non-V115 policies (omitted/default, explicit
legacy, V102, V109, V114, unknown compatibility) in preseason and live states.
V115 synthetic outputs differ only in RB display/effective prior; all other
profile fields, including live grades, are unchanged. Test comparison code
mechanically reverses the bounded prior-call edits. A separate scratch run
against exact accepted buggy production rejects its 96 calls against the
64 shared fitted calls; this is a behavioral negative control.

Frozen normalized input/result artifacts remain immutable. Corrected
production prior-only build is compared with every accepted LIVE_FITTED prior;
accepted live grades/games then supply the current blend. This checks prior-path
implementation parity without pretending to replay private provider rows.

| Frozen guard | Reproduced |
|---|---:|
| Maximum current RB delta | 3.1427964110876587 |
| Teams moving >0.5 | 26 |
| Rank changes / maximum movement | 15 / 3 |
| KC current RB delta / rank | +0.3122389463818962 / 3 |
| Maximum current-minus-prior channel change | 14.700984790807071 |
| RB-weighted channel change | 1.029068935356495 |
| Pre-cap half-share contribution | 0.5145344676782475 |

Channel changes are not total FORCE or forecast deltas. KC's strong live grade
and primarily prior/stabilization display drag remain the accepted explanation;
the defect was not the main explanation. No player-specific tuning.

## Authoritative validation

Historical implementation/source `cdcfa8de4eed10f26be0c28b05583c4240586537` validation, before the fixture transition above:
LF-clean export, normal isolated runner, no external network:
catalog/inventory **259**, safe **146/147**, model **50/50**, release **17/17**,
QB **28/28**, snapshot **6/6**, server **30/30**, default exclusions **112**.
All runner invocations preserved source status/hashes. Three changed JS/MJS
syntax checks passed. Canonical public build/parity and diff checks passed.

At that source, safe's sole failure was `test_ux19_qb_return_removal.mjs`,
**A5/A13: bundled teams unchanged**. It passes on exact parent `207f4b5`:
this is newly exposed by the authorized model change, not a pre-existing failure.
Its committed test and `scripts/fixtures/ux19_golden.json` were unchanged at that source.
A scratch-only bounded comparison inspects the remaining golden contracts
without modifying the committed gate: **992 checks PASS**. Exactly four bundled
values differ (RB and derived offense grades for two teams); played state has
zero differences. Canonical/active ratings, forecasts/simulations, projections,
historical states, Roster Lab, QB Rankings and all remaining golden fields
match exactly. At that point, this supplemental probe did not turn the committed safe gate
green or authorize fixture recapture.

Existing focused tests: V104 QB/OL/RB calibration, V109 units/reliability,
V114 centering, V115 orthogonalization, V57 RB regression and V45 bridge
passed **6/6** at both base and candidate. V104/V109/V114 version contracts
failed identically at both trees (obsolete server identity assertions);
those three default-excluded failures are pre-existing, not repaired.

## Review boundary

MD-07 execution COMPLETE for the authorized bounded tranches only; Decision
INVESTIGATE; Priority unset; both research tranches OWNER ACCEPTED; owner frame
LIVE_FITTED; correction completed, independent implementation/fixture reviews
PASSED; owner ACCEPTED 2026-10-05; required corrections NONE; integrated onto
local main 2026-10-05 by fast-forward, not pushed or deployed. MD-05 REVIEW/BANKED, MD-06 REVIEW /
NOT AUTHORIZED, MD-08 and UX-41 PLANNED / NOT AUTHORIZED preserved.
Historical research matrix, inputs and all measurement results are retained.
No merge, push, deployment, new capture or unrelated work.

Historical implementation validation: 56 unique authoritative IDs; roadmap outside MD-07 unchanged;
228 local links/nine anchors across touched docs resolve; all 33 generated files
match authoritative sources. Accepted research parity checker passes 22 immutable
files, four negative controls and 31 checksum pins. All nine numeric result
artifacts and frozen input/provenance/facts remain unchanged.
