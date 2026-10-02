"""MD-03 QB-return model research artifacts are reproducible and internally coherent.

Research-only regression: re-derives every committed MD-03 result file from the
committed ledgers (offline, deterministic) and checks the study design invariants
the investigation report relies on. It does not touch production model code.
"""
import contextlib, importlib.util, io, json, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
md = root / 'research' / 'md03'
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1


def load(name):
    spec = importlib.util.spec_from_file_location(name, md / f'{name}.py')
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(md))
    sys.path.insert(0, str(root / 'research'))
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    return mod


def dumped(obj, **kw):
    return json.dumps(obj, sort_keys=True, **kw)


# 1. pinned inputs: every raw file the ledger was built from is hashed
manifest = json.loads((md / 'data' / 'input_manifest.json').read_text(encoding='utf-8'))
check('games.csv' in manifest, 'games.csv pinned')
for y in range(2009, 2026):
    for n in (f'injuries_{y}.csv', f'roster_weekly_{y}.csv', f'stats_player_week_{y}.csv'):
        check(n in manifest and len(manifest[n]['sha256']) == 64, f'{n} pinned')

# 2. stage-2 evaluation reproduces the committed results exactly
ev = load('evaluate')
fresh = json.loads(json.dumps(ev.main(), sort_keys=True, default=str))
committed = json.loads((md / 'results' / 'md03_results.json').read_text(encoding='utf-8'))
check(dumped(fresh) == dumped(committed), 'md03_results.json reproduces from the ledgers')
again = json.loads(json.dumps(ev.main(), sort_keys=True, default=str))
check(dumped(again) == dumped(fresh), 'evaluation is deterministic across runs')

# 3. the original-evidence audit and the V33-harness replication reproduce
audit = load('v33_original_evidence_audit')
check(dumped(audit.audit()) == dumped(json.loads((md / 'results' / 'v33_original_evidence_audit.json').read_text(encoding='utf-8'))),
      'V33 original-evidence audit reproduces')
harness = load('celo_prior_harness')
check(dumped(harness.run()) == dumped(json.loads((md / 'results' / 'celo_prior_harness.json').read_text(encoding='utf-8'))),
      'V33 harness replication reproduces')
a = audit.audit()
check(abs(a['gated_subset']['delta'] - (-0.0098588644)) < 1e-9, 'V33 recorded gated delta reproduced')
check(a['gated_subset']['improved'] == 5, 'V33 recorded 5 of 6 reproduced')

# 4. design invariants the report relies on
d = committed['design']
check(d['splits'] == {'discovery': [2009, 2015], 'validation': [2016, 2019], 'heldout': [2020, 2025]}, 'season splits fixed')
cs = committed['cohort']['by_split_verified']
check(sum(cs[k]['episodes'] for k in cs) == committed['cohort']['verified']['episodes'], 'splits partition the verified cohort')
check(committed['cohort']['verified']['teams'] == 32, 'verified cohort spans all 32 franchises')
led = json.loads((md / 'data' / 'episode_ledger.json').read_text(encoding='utf-8'))
ids = [e['id'] for e in led['episodes']]
check(len(ids) == len(set(ids)), 'episode ids unique')
check(all(e['availability_class'] in ('VERIFIED', 'PROBABLE', 'AMBIGUOUS') for e in led['episodes']), 'every episode classified')
check(all(e['return_season'] <= 2025 for e in led['episodes']), 'no 2026 application-season episode in the evidence')
for fam in committed['families'].values():
    check(set(fam['train_choice_2009_2019']) <= {'f', 'h', 'H'}, 'train choice is a declared grid point')
cc = committed['candidate_contracts']
check(cc['B_damage_quality_gated']['params'] == committed['families']['DAMAGE_QGATE']['train_choice_2009_2019'],
      'candidate B parameters come from the 2009-2019 selection, not the held-out seasons')
# zero conditions: no damage means no correction for every damage-bounded candidate
p = committed['probes']['damage_le_0']['all_2009_2025']
check(p['V33_literal']['active_episodes'] == 0 and p['reference_damage']['active_episodes'] == 0, 'no damage -> zero correction')
check(committed['kc_application_check']['V33_literal_initial'] == 15.75, 'KC application reproduces the V33 +15.75 Elo start')

print(f'MD-03 research artifact checks passed: {checks}')
