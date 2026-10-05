# RB prior-reference intent history

Read-only local Git investigation from shared base `fd585891214db483112f52d4746106c606afeb43` and accepted research tip `98db3b323c928879d9ff7435d77a980744a66289`. [Intent finding](README.md); [exact source extraction](history.json); [all call sites](callsite_inventory.json).

## Available history and its limit

The repository is **not shallow**. Its sole recovered root is the V149 import below; no V115-named introducing commit occurs among local refs. The helper signature, optional beta/center, direct-map reference, V115 fitted construction, legacy policies, release notes and tests were all present together at that root. Their original introduction/edit sequence is **UNAVAILABLE**. A root import is not the original V115 implementation commit. The mismatch existed at the earliest available snapshot; no later local semantic change introduced it.

| SHA | Author date | Message | Relevant change |
|---|---|---|---|
| `43d2c7169534cb76cd13c72166b111d0d91d6c06` | 2026-10-01T07:12:32-05:00 | Initial FORCE V149 web repository | Root added entire V149 source; exact relevant added lines retained in root evidence blocks. Not an original V115 introducing diff. |
| `c44e59ef67e501d09ac9ec83d7b2c48b421089a1` | 2026-10-01T11:17:00-05:00 | Harden FORCE V149 QB model and production snapshot | Only export-list occurrence changed for this helper; RB signatures, calls and fitted construction unchanged. |
| `8d72a03f857f07549c33bbe8ce0835da95159201` | 2026-10-01T14:26:35-05:00 | Fix FORCE QB correctness and migrate V5 reference | Only export-list occurrence changed for this helper; RB signatures, calls and fitted construction unchanged. |

The two later model commits are QB-focused. Relevant RB helpers and fitted/reference/individual expressions are unchanged; only helper-containing export lists gain QB utilities. JSON retains whole model/diff hashes, exact root added snippets, exact later helper-containing export diffs and source line ranges. `git log -S priorRbOrthogonalComposite` identifies only the import; `git log -G` also sees the later export-list hunks. These are distinct from RB semantics changes.

Reproduce from repository root (full SHAs pinned in JSON):

```text
git log fd585891214db483112f52d4746106c606afeb43 -- model/live_profiles.js
git log --all -S priorRbOrthogonalComposite -- model/live_profiles.js
git log --all -G 'priorRbOrthogonal|rbRecvPassBeta|orthogonalQbCenter' -- model/live_profiles.js
git blame fd585891214db483112f52d4746106c606afeb43 -L 269,300 -- model/live_profiles.js
git show 43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js
node research/cycle8/md07_unit_calibration/rb_prior_intent/extract.mjs
```

## Exact imported source excerpts

All following excerpts are from the root import, not a hypothetical earlier V115 diff. Added-line evidence is also retained in JSON. Current line ranges are recorded separately under `base.*`; line movement is not a semantic change.

### priorRbOrthogonalComposite

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:280–288`

```js
  function priorRbOrthogonalComposite(profile, recvBeta=1, qbCenter=0) {
    const rb=profile?.rb||{};
    const rush=Number.isFinite(Number(rb.rush_epa))?Number(rb.rush_epa):Number(rb.adj_rush);
    const recv=Number(rb.adj_recv);
    const residual=partialResidual(recv,priorQbPassEpa(profile),recvBeta,qbCenter);
    if (!Number.isFinite(rush) && !Number.isFinite(residual)) return null;
    if (Number.isFinite(rush)&&Number.isFinite(residual)) return .70*rush+.30*residual;
    return Number.isFinite(rush)?rush:residual;
  }
```

### fit

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1190–1193`

```js
    const priorQbPassValues=Object.values(priorProfiles||{}).map(priorQbPassEpa).filter(Number.isFinite);
    const orthogonalQbCenter=medianValue(priorQbPassValues);
    const receiverPassBeta=receiverPolicy==='v115-partial-orthogonal' ? ridgeOrthogonalSlope(Object.values(priorProfiles||{}).map((p)=>({x:priorQbPassEpa(p),y:priorReceiverWrteEpa(p)})),UNIT_V115.orthogonalRidgeFraction) : 1;
    const rbRecvPassBeta=rbPolicy==='v115-partial-orthogonal' ? ridgeOrthogonalSlope(Object.values(priorProfiles||{}).map((p)=>({x:priorQbPassEpa(p),y:Number(p?.rb?.adj_recv)})),UNIT_V115.orthogonalRidgeFraction) : 1;
```

### live-rb

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1202–1202`

```js
      const rbRecvResidual=rbResidualPolicyActive(rbPolicy) ? partialResidual(r.rbRecvEpa,r.qbAttemptEpa,rbPolicy==='v115-partial-orthogonal'?rbRecvPassBeta:1,rbPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0) : r.rbRecvEpa;
```

### live-cdf-reference

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1220–1220`

```js
    const priorRbOrthogonalValuesV109=Object.values(priorProfiles||{}).map((p)=>priorRbOrthogonalComposite(p,rbPolicy==='v115-partial-orthogonal'?rbRecvPassBeta:1,rbPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0)).filter(Number.isFinite);
```

### effective-reference

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1369–1369`

```js
    const priorRbOrthogonalValues=Object.values(priorProfiles||{}).map(priorRbOrthogonalComposite).filter(Number.isFinite);
```

### effective-individual

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1391–1399`

```js
    const priorRbByTeam = Object.fromEntries(ids.map((t)=>{
      const prior=priorProfiles[t]||{};
      if (rbPolicy==='v109-stabilized-residual'||rbPolicy==='v114-centered-stabilized-residual'||rbPolicy==='v115-partial-orthogonal') {
        const value=priorRbOrthogonalComposite(prior);
        return [t, Number.isFinite(value)&&priorRbOrthogonalValues.length>=20 ? continuousPercentileValue(priorRbOrthogonalValues,value,true) : null];
      }
      const value=prior?.rb?.composite;
      return [t, priorPercentile(priorProfiles,(p)=>p?.rb?.composite,value,true)];
    }));
```

### wr-reference

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1217–1219`

```js
    const priorReceiverResidualValues=Object.values(priorProfiles||{}).map((p)=>priorReceiverResidual(p,receiverPolicy==='v115-partial-orthogonal'?receiverPassBeta:1,receiverPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0)).filter(Number.isFinite);
    const priorReceiverResidualMedian=medianValue(priorReceiverResidualValues);
    const priorReceiverByTeam=Object.fromEntries(ids.map((t)=>{ const v=priorReceiverResidual(priorProfiles[t]||{},receiverPolicy==='v115-partial-orthogonal'?receiverPassBeta:1,receiverPolicy==='v115-partial-orthogonal'?orthogonalQbCenter:0); return [t,Number.isFinite(v)&&priorReceiverResidualValues.length>=20?continuousPercentileValue(priorReceiverResidualValues,v,true):null]; }));
```

### run-prior-analogue

`43d2c7169534cb76cd13c72166b111d0d91d6c06:model/live_profiles.js:1386–1391`

```js
    const priorRunDefenseByTeam = Object.fromEntries(ids.map((t)=>{
      const prior=priorProfiles[t]||{};
      const value=prior?.dl?.run_stop_rate;
      return [t, priorPercentile(priorProfiles,(p)=>p?.dl?.run_stop_rate,value,true)];
    }));
    const priorRbByTeam = Object.fromEntries(ids.map((t)=>{
```

## Version-labelled documentation and contracts

The V102/V104/V109/V114/V115 notes and inspected tests were imported at the root and have no later edits on shared-base ancestry. Treat them as preserved release-version documentation, with original authored chronology unavailable. They carry more direct design evidence than MD-07's later retrospective research.

- V104 running-back section explicitly calls for like-for-like historical/live residual composites; at that older design, subtraction is full.
- V109 explicitly says the RB preseason prior is rebuilt on the same orthogonal residual definition used live. This strongly supports consistency, but does not name V115's later effective-prior parameters.
- V114 fixes raw-receiving policy fallthrough and retains matching historical centering; this argues against accidental unadjusted receiving as intended V115 behavior.
- V115 applies fitted partial QB-environment subtraction to RB receiving and retains matching historical quality mapping. Extending it to the effective prior is supported **inferentially**, not by an explicit effective-prior choice or an available introducing diff.
- V104 calibration test directly repeats the problematic callback but asserts only at least20 finite values. It would not distinguish default/fitted/unadjusted reference semantics.
- V114 tests policy dispatch, residual-path presence and median/center mapping. V115 tests generic ridge/partial arithmetic, relaxed stabilizers and exposed fitted parameters. Neither pins the effective-prior frame, its expected values/ranks or callback arity.
- V57 pins RB prior grades85/15/50 using stored `rb.composite` and default legacy rbPolicy. Those expected values concern the older unadjusted branch, not V115 or its effective-prior helper; they do not resolve this choice.
- V102's receiving-ownership mutation is about ownership, not which prior residual frame is intended. No frame-discriminating effective-prior contract was found in the inspected history. Later preservation of a passing broad contract is not implicit owner acceptance of this defect.

The root/shared-base keyword search inventory (including later shared-base retrospective matches) is in `history.json`. Exact release notes/tests and file-history SHAs are retained there, not replaced with later paraphrases.

## Call-site coverage

Every production model snapshot has three invocations: fitted unary-wrapper live-CDF reference; bare direct-map effective-prior reference; default unary effective individual prior. Declaration and public export are not invocations. Public mirror duplicates the source path and supplies no independent intent evidence. The V102 live fallback also consumes the same effective reference directly; its consumer is recorded as source evidence rather than a new helper invocation. The raw legacy `prior.rb.composite` branch remains a separate older-policy fallback, not evidence that V115 intends unadjusted receiving.

The inventory covers every helper occurrence in accepted tracked JS/MJS/Python files, plus all model-changing ancestral snapshots and historical test/research file revisions. Accepted MD-07 reconstruction/bracket callers are retrospective research controls, not design-intent evidence. Old tests include a second direct-map callback. No hidden production call site or later default/call-site semantic change was found.
