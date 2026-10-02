"""MD-03 QB-return model research artifacts are reproducible and internally coherent.

Research-only regression: re-derives every committed MD-03 result file from the
committed ledgers (offline, deterministic), checks that pinned reproduction
rejects raw-input hash mismatches, and checks the study-design and cause-class
invariants the investigation report relies on. It touches no production code.
"""
import contextlib, hashlib, importlib.util, io, json, sys, tempfile
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


def dumped(obj):
    return json.dumps(obj, sort_keys=True, default=str)


def committed(name):
    return json.loads((md / 'results' / name).read_text(encoding='utf-8'))


# 1. pinned inputs: all 62 raw files hashed; pinned reproduction rejects mismatches
manifest = json.loads((md / 'data' / 'input_manifest.json').read_text(encoding='utf-8'))
bc = load('build_cohort')
check(sorted(manifest) == sorted(bc.files_needed()), 'manifest lists exactly the required inputs')
check(len(manifest) == 62, '62 raw input files pinned')
check(all(len(v['sha256']) == 64 and v['bytes'] > 0 for v in manifest.values()), 'every input has a hash and size')
check('5898b6279be0829925f7bbda165d319b474e1825' in manifest['games.csv']['url'], 'games.csv URL pinned to a commit')
with tempfile.TemporaryDirectory() as tmp:
    good = Path(tmp) / 'a.csv'
    good.write_bytes(b'x,y\n1,2\n')
    entry = {'sha256': hashlib.sha256(good.read_bytes()).hexdigest(), 'bytes': good.stat().st_size, 'url': 'local'}
    bc.verify_inputs(tmp, {'a.csv': entry})  # matching file passes
    for bad, label in (({'a.csv': entry | {'sha256': '0' * 64}}, 'hash mismatch rejected'),
                       ({'a.csv': entry | {'bytes': entry['bytes'] + 1}}, 'size mismatch rejected'),
                       ({'missing.csv': entry}, 'missing file rejected')):
        try:
            bc.verify_inputs(tmp, bad)
            check(False, label)
        except ValueError:
            check(True, label)

# 2. stage-2 evaluation reproduces the committed results exactly and deterministically
ev = load('evaluate')
fresh = json.loads(dumped(ev.main()))
res = committed('md03_results.json')
check(dumped(fresh) == dumped(res), 'md03_results.json reproduces from the ledgers')
check(dumped(json.loads(dumped(ev.main()))) == dumped(fresh), 'evaluation is deterministic across runs')

# 3. original-evidence audit and V33-harness replication reproduce
audit = load('v33_original_evidence_audit')
a = audit.audit()
check(dumped(a) == dumped(committed('v33_original_evidence_audit.json')), 'V33 original-evidence audit reproduces')
check(abs(a['gated_subset']['delta'] - (-0.0098588644)) < 1e-9 and a['gated_subset']['improved'] == 5,
      'V33 recorded 6-case figures reproduced')
harness = load('celo_prior_harness')
check(dumped(harness.run()) == dumped(committed('celo_prior_harness.json')), 'V33 harness replication reproduces')

# 4. corrected cause classification
led = json.loads((md / 'data' / 'episode_ledger.json').read_text(encoding='utf-8'))
E = led['episodes']
ids = {e['id'] for e in E}
check(len(ids) == len(E), 'episode ids unique')
check(all(e['cause_class'] in bc.CAUSE_CLASSES for e in E), 'every episode carries a corrected cause class')
check(all(e['return_season'] <= 2025 for e in E), 'no 2026 application-season episode in the evidence')
vm = [e for e in E if e['cause_class'] == 'VERIFIED_MEDICAL']
check(all(e['cause_flags']['medical'] and not e['cause_flags']['healthy_not_starting']
          and not e['cause_flags']['season_opener_onset'] for e in vm), 'VERIFIED_MEDICAL needs medical evidence and no role signal')
check(not any(e['cause_flags']['generic_reserve_only'] for e in vm), 'a generic reserve code alone is never medical')
byid = {e['id']: e for e in E}
check(byid['CAR_2010w03_00-0025708']['cause_class'] == 'ROLE_CHANGE', 'CAR 2010 Moore benching is not medical')
check(not any(e['team'] == 'CAR' and e['qb'] == '00-0034869' and e['start_season'] == 2022 for e in E),
      'CAR 2022 Darnold role takeover is not a return episode')
check('MIA_2020w12_00-0036212' in ids, 'MIA 2020 Tua thumb absence is detected')
mig = committed('classification_migration.json')
elig = [e for e in vm if 1 <= e['missed'] <= 17 and e['eval']]
check(mig['new_primary_verified_medical'] == len(elig) == res['cohort']['verified_medical']['episodes'],
      'migration audit, ledger and results agree on the primary cohort size')
check(mig['kept_in_primary'] + mig['joined_primary'] == len(elig), 'migration counts reconcile')

# 5. design invariants the report relies on
d = res['design']
check(d['splits'] == {'discovery': [2009, 2015], 'validation': [2016, 2019], 'heldout': [2020, 2025]}, 'season splits fixed')
check('NOT the production FORCE forecast' in d['comparator'], 'comparator is labelled core-only')
cs = res['cohort']['by_split_verified_medical']
check(sum(cs[k]['episodes'] for k in cs) == res['cohort']['verified_medical']['episodes'], 'splits partition the primary cohort')
cc = res['candidate_contracts']
check(cc['B0_quality_gated_damage']['params'] == res['families']['DAMAGE_QGATE']['train_choice_2009_2019'],
      'B0 is exactly the 2009-2019 selection as scored')
check('min_missed' not in cc['B0_quality_gated_damage']['params'], 'B0 has no minimum-missed rule')
check(cc['B2_B0_plus_min2_POSTHOC']['params'].get('min_missed') == 2 and 'POST-HOC' in cc['B2_B0_plus_min2_POSTHOC']['status'],
      'B2 is B0 plus minimum two and labelled post-hoc')
for k in ('detector_like_injury_aware', 'verified_medical_onset_week_out', 'verified_medical_MID', 'verified_medical_OFF'):
    check(k in res['population_sensitivity'], f'population sensitivity reported: {k}')
u = res['uncertainty']['B0_quality_gated_damage']['all_2009_2025']
check(all(abs(u[c]['point'] - cc['B0_quality_gated_damage']['all_2009_2025']['delta_brier']) < 1e-6 for c in u),
      'cluster bootstrap point estimates equal the headline unique-game Brier')
p = cc['B0_quality_gated_damage']['subgroups_all_2009_2025']['damage_le_0']
check(p['active_episodes'] == 0, 'no measured damage -> zero correction')
check(res['kc_application_check']['V33_literal_initial'] == 15.75, 'KC application reproduces the V33 +15.75 Elo start')

print(f'MD-03 research artifact checks passed: {checks}')
