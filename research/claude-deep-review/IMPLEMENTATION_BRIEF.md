# Deep-review economics follow-up handoff

This bounded planner/policy pass starts at `fd99a005fb56ad4a707f671857d056b948119e09` on `codex/claude-api-deep-review-harness`. Production main remains `39bc08e41fe3c1c8d57de385faa568733c52efc2`; targeted-review base remains `24bb3b0738f4177b1289becccec9450e7d11c7d9`. It performs no FORCE product/model audit and no paid API request.

See [exact economics and five-cycle evidence](ECONOMICS.md) and [operating contracts](README.md).

## Changes and limitations

Policy v3 adds deterministic task/evidence output budgets, sparse complete maps, explicit BASELINE/ROUTINE classification, a private five-cycle simulator, cost reporting, historical-test routine closure distinction, immediate risk promotions, and separately scoped escalation provenance/estimates. Default total guard stays $10; $200 is only an absolute supported maximum. Archived v1/v2 planners reproduce earlier previews and are blocked for paid execution/completion. Targeted client, transport, reviewer, pricing and credential interfaces are unchanged.

The optimized first preview retains 409/623 direct files and all 48 critical files, with 7 calls / $17.348788. Map savings are real; literal-source duplication was already zero. Increasing appropriate output reserves offsets part of the reduction. Routine 7–8 calls are demonstrated, but $5–$8 is not: periodicity alone implies $14.065573 average original-input ceiling. Do not call this a one-time baseline cost or imply real billing savings are proven.

## Infrastructure review

Review the complete cumulative implementation from targeted base through the final committed tooling HEAD. Focus on tier/changed/deadline selection, current versus historical test closure, complete map versus literal source, output-cap rationale, exact cost arithmetic, simulation isolation, completion-only ledger ages, immutable v1/v2/v3 reproduction, budget/override/key ordering, one-request idempotence, truncation and separately authorized escalation. Preserve the existing targeted mode. Do not audit FORCE model/product behavior, redownload data or send the first deep audit.

A new ignored $0 targeted infrastructure packet and guarded one-request owner command are prepared after the final commit. The local review batch label is separate from the canonical bank ledger; no bank entry/authority is fabricated. Infrastructure review has not been sent or accepted.

## Validation and artifacts

Original tests are retained, with output/cost/map/default/mode/simulation/deadline/promotion/new-file/escalation/backward-reconstruction regressions added. Disposable synthetic keys and injected mock responses only. The real tracked ledger stays zero completed audits. New immutable preview `FORCE-DEEP-2026-10-08-004` and ignored five-cycle data coexist with 001/002/003. Final task report records exact tests, committed SHA, normal tooling-only push and future commands. No production/model/public/workflow change, PR, merge, deployment, owner key access or API spend.
