#!/usr/bin/env python3
"""MD-03: the original V33 prior-isolation harness applied to the expanded cohort.

Uses the unmodified V33 harness functions (research/qb_carryover_event_study.py and
qb_carryover_decay.run_decay: Celo season-end Elo prior, opponents fixed at their
own reverted priors, first games of the return season) on every VERIFIED_MEDICAL
offseason-return episode from the MD-03 ledger. This answers whether the V33
evidence method itself reproduces its result outside the hand-picked cases.

Offline and deterministic. Run: python -B research/md03/celo_prior_harness.py [--write]
"""
from __future__ import annotations
import contextlib, io, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
with contextlib.redirect_stdout(io.StringIO()):
    import qb_carryover_event_study as es
    import qb_carryover_decay as dec

_ORIGINAL_ENDELO = es.endelo
LEGACY = {'LA': ['LA', 'LAR', 'STL']}


def endelo(year, team):
    """The harness's own resolver first; the FORCE 'LA' code is the only gap."""
    try:
        return _ORIGINAL_ENDELO(year, team)
    except KeyError:
        rows = es.D[str(year)]
        for c in LEGACY.get(team, []):
            if c in rows:
                return float(rows[c])
        raise


es.endelo = endelo  # adds only the 'LA' fallback; the harness math is untouched


def cases(classes=('VERIFIED_MEDICAL',)):
    led = json.loads((HERE / 'data' / 'episode_ledger.json').read_text(encoding='utf-8'))
    out = {}
    for e in led['episodes']:
        if e['timing'] != 'OFF' or e['cause_class'] not in classes or not (1 <= e['missed'] <= 17):
            continue
        rows = []
        for r in e['eval']:
            if not r[7]:
                break
            rows.append((r[2], r[1], r[5], r[8]))
        if not rows or e['return_season'] - 1 < 2008:
            continue
        out[e['id']] = {'year': e['return_season'] - 1, 'team': e['team'], 'missed': e['missed'], 'games': rows,
                        'return_season': e['return_season'], 'surviving_damage': e['surviving_damage'],
                        'raw_damage': e['raw_damage']}
    return out


def literal_brier(c, n=8, half=4):
    """V33 production rule inside the same harness: damage-bounded start."""
    rev = 0.300 if c['year'] + 1 >= 2021 else .333
    corr = min(max(0.0, c['surviving_damage']), min(60, 7.5 * c['missed']) * (1 - rev))
    # run_decay derives corr from ppm; reproduce with an equivalent ppm
    ppm = corr / ((1 - rev) * c['missed']) if c['missed'] else 0
    return dec.run_decay(c, ppm, half, cap=1e9, n=n)


def run():
    C = cases()
    res = {'episodes': len(C)}
    for label, keep in (('all', lambda c: True), ('train_2009_2019', lambda c: c['return_season'] <= 2019),
                        ('heldout_2020_2025', lambda c: c['return_season'] >= 2020)):
        ks = [k for k in C if keep(C[k])]
        if not ks:
            continue
        base = {k: dec.run_decay(C[k], 0, 4, n=8) for k in ks}
        so = {k: dec.run_decay(C[k], 7.5, 4, cap=60, n=8) for k in ks}
        lit = {k: literal_brier(C[k]) for k in ks}
        n = len(ks)
        res[label] = {
            'episodes': n,
            'baseline_brier': round(sum(base.values()) / n, 6),
            'starts_rule_delta': round(sum(so[k] - base[k] for k in ks) / n, 6),
            'starts_rule_improved': sum(so[k] < base[k] for k in ks),
            'literal_rule_delta': round(sum(lit[k] - base[k] for k in ks) / n, 6),
            'literal_rule_improved': sum(lit[k] < base[k] for k in ks),
            'literal_rule_worsened': sum(lit[k] > base[k] + 1e-12 for k in ks),
        }
    res['per_episode'] = {k: {'missed': C[k]['missed'], 'surviving_damage': C[k]['surviving_damage'],
                              'starts_rule_delta': round(dec.run_decay(C[k], 7.5, 4, cap=60, n=8) - dec.run_decay(C[k], 0, 4, n=8), 5),
                              'literal_rule_delta': round(literal_brier(C[k]) - dec.run_decay(C[k], 0, 4, n=8), 5)}
                          for k in sorted(C)}
    return res


if __name__ == '__main__':
    r = run()
    txt = json.dumps(r, indent=1, sort_keys=True)
    if '--write' in sys.argv:
        (HERE / 'results' / 'celo_prior_harness.json').write_text(txt + '\n', encoding='utf-8', newline='\n')
    print(txt)
