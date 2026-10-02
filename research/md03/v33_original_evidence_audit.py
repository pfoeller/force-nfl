#!/usr/bin/env python3
"""MD-03: audit of the original V33 returning-QB evidence.

Re-runs the bundled 11-episode prior-isolation study (research/qb_carryover_decay.py)
without modification and reports what the V33 production numbers rest on:
per-episode deltas, the gated six-case subset, influence (drop-one), in-sample vs
leave-one-episode-out selection, and grid-edge behaviour. Deterministic; no network.

Run: python -B research/md03/v33_original_evidence_audit.py  (writes nothing unless --write)
"""
from __future__ import annotations
import contextlib, io, json, sys, random
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
with contextlib.redirect_stdout(io.StringIO()):
    import qb_carryover_decay as q  # prints exploratory tables on import

SUBSET = ['2017_HOU_Watson', '2019_PIT_Roethlisberger', '2020_DAL_Prescott',
          '2020_SF_Garoppolo', '2021_BAL_Jackson', '2023_LAC_Herbert']
ALL = list(q.cases)
PPM = [0, 2.5, 5, 7.5, 10]
HALF = [2, 4, 8, 16]


def b(k, ppm, half, n=8):
    return q.run_decay(q.cases[k], ppm, half, n=n)


def delta(k, ppm=7.5, half=4, n=8):
    return b(k, ppm, half, n) - b(k, 0, 4, n)


def mean(xs):
    xs = list(xs)
    return sum(xs) / len(xs)


def audit():
    out = {}
    per = {k: round(delta(k), 6) for k in ALL}
    out['per_episode_delta_7p5_h4_w1_8'] = per
    base6 = mean(b(k, 0, 4) for k in SUBSET)
    cand6 = mean(b(k, 7.5, 4) for k in SUBSET)
    out['gated_subset'] = {
        'episodes': SUBSET, 'baseline_brier': round(base6, 10), 'candidate_brier': round(cand6, 10),
        'delta': round(cand6 - base6, 10),
        'improved': sum(delta(k) < 0 for k in SUBSET),
        'games_per_episode': 8, 'total_games': 8 * len(SUBSET)}
    # drop-one influence on the gated subset
    infl = {}
    for k in SUBSET:
        rest = [x for x in SUBSET if x != k]
        infl[k] = round(mean(delta(x) for x in rest), 6)
    out['gated_drop_one_mean_delta'] = infl
    # contribution share of the best episode
    d6 = {k: delta(k) for k in SUBSET}
    tot = sum(d6.values())
    out['gated_share_of_total_improvement'] = {k: round(v / tot, 3) for k, v in d6.items()}
    # all 11 at the production setting
    out['all11_7p5_h4'] = {'delta': round(mean(delta(k) for k in ALL), 6),
                           'improved': sum(delta(k) < 0 for k in ALL)}
    # the 5 episodes excluded by the gate, at the production setting
    excl = [k for k in ALL if k not in SUBSET]
    out['excluded_by_gate_7p5_h4'] = {'episodes': excl,
                                      'delta': round(mean(delta(k) for k in excl), 6),
                                      'improved': sum(delta(k) < 0 for k in excl)}
    # in-sample best on the subset and grid edge
    grid = {(p, h): mean(b(k, p, h) for k in SUBSET) - base6 for p in PPM[1:] for h in HALF}
    best = min(grid, key=grid.get)
    out['gated_in_sample_best'] = {'ppm': best[0], 'half': best[1], 'delta': round(grid[best], 6),
                                   'on_grid_edge': best[0] == max(PPM) or best[1] in (min(HALF), max(HALF))}
    # leave-one-episode-out selection within the gated subset (nested)
    loo = []
    for hold in SUBSET:
        train = [k for k in SUBSET if k != hold]
        sc = {(p, h): mean(b(k, p, h) for k in train) for p in PPM for h in HALF}
        ch = min(sc, key=sc.get)
        loo.append({'held_out': hold, 'chosen': list(ch), 'delta': round(b(hold, *ch) - b(hold, 0, 4), 6)})
    out['gated_loo'] = {'rows': loo, 'mean_delta': round(mean(r['delta'] for r in loo), 6),
                        'improved': sum(r['delta'] < 0 for r in loo)}
    # episode bootstrap for the production setting on the subset (seeded)
    rng = random.Random(20261002)
    vals = [delta(k) for k in SUBSET]
    boots = sorted(mean(rng.choice(vals) for _ in vals) for _ in range(20000))
    out['gated_bootstrap_95'] = [round(boots[499], 6), round(boots[19499], 6)]
    # sign-flip exact test on the 6 per-episode deltas (two-sided)
    import itertools
    obs = abs(sum(vals))
    flips = [abs(sum(s * v for s, v in zip(signs, vals))) for signs in itertools.product([1, -1], repeat=len(vals))]
    out['gated_sign_flip_p_two_sided'] = round(sum(f >= obs - 1e-12 for f in flips) / len(flips), 4)
    # missed starts recorded in the study
    out['missed_starts_recorded'] = {k: q.cases[k]['missed'] for k in ALL}
    return out


if __name__ == '__main__':
    res = audit()
    txt = json.dumps(res, indent=2, sort_keys=True)
    print(txt)
    if '--write' in sys.argv:
        (HERE / 'results' / 'v33_original_evidence_audit.json').write_text(txt + '\n', encoding='utf-8', newline='\n')
