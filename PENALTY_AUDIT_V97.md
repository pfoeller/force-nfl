# V97 Penalty Impact audit findings

This audit targeted the V96 outliers/surprises: CAR, NE, MIN, KC and HOU.

## Carolina

V96 showed CAR around +24.6 EPA despite two Carolina offensive-pass-interference penalties nullifying Carolina touchdowns. The root cause was future-EP-only causal EPA: the no-penalty post-touchdown branch moved to opponent possession, whose future EP can be positive, but the seven points already scored in that branch were omitted. Under the V97 score-aware state value, each erased Carolina TD moves roughly seven EPA back against Carolina relative to V96, before any other event differences. The two plays therefore remove roughly 14 EPA from the V96 Carolina total by construction.

## Kansas City

V96's +EPA / -WPA split was partly a real leverage pattern, but it also contained the same scoring-state EPA bug. A Kansas City offensive hold erased a Mahomes rushing touchdown. The V97 score-aware correction removes roughly seven EPA of artificial credit to KC from that event, which should make the EPA/WPA story much more coherent.

## New England

NE's extreme benefit is directionally supported by multiple high-leverage Seattle penalties, including an illegal shift that erased a Seattle touchdown. The V96 future-EP-only bug actually understated the opponent benefit of an erased Seattle TD on EPA; V97 adds the realized score change. NE can therefore remain a genuine early-season tail result even after the bug fix. The capped V96/V97 score transform prevents that raw tail from turning into 100.

## Minnesota

MIN's large benefit is supported by several high-leverage Green Bay penalties, including penalties that extended a fourth-quarter touchdown drive and defensive holding that erased an end-zone interception. The audit also found a separate reconstruction bug: a made Green Bay field goal nullified by Minnesota defensive offside was not being represented as a +3 no-penalty scoring branch. V97 explicitly reconstructs made field goals before generic fourth-down logic.

## Houston

HOU's V96 score above 50 despite negative EPA and WPA was not an arithmetic bug; its +3 net first downs by penalty was strong enough to overwhelm modestly negative direct-value components under the approved 40/25/20/15 blend. V97 adds a coherence guard: if EPA and WPA both agree on harm, the structural components may pull the final score toward 50 but cannot push it above 50 (and vice versa for two positive direct measures). Mixed-sign EPA/WPA cases remain decided by all four components.

## Other fixes surfaced by the audit

- Turnover-erased bookkeeping now checks whether actual and counterfactual states actually disagree on possession.
- Scoring counterfactuals are evaluated before generic turnover logic, so a nullified pick-six is treated as a score, not merely an interception spot.
- Rankings PNG export removes controls-only material and does not max-height clip forced 16-row pages; the intended output is two complete pages, ranks 1-16 and 17-32.

## Formula unchanged

The scoring weights remain 40% EPA / 25% WPA / 20% first downs / 15% erased TDs. V97 changes correctness/guardrails, not those approved weights.
