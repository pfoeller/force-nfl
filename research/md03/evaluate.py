#!/usr/bin/env python3
"""MD-03 stage 2: held-out evaluation of QB-return correction candidates.

Offline and deterministic: reads only the committed ledgers written by
build_cohort.py and writes results/md03_results.json. Research only; nothing here
is a production model.

Design (declared before results were inspected; see the investigation report):
  * cohort: VERIFIED availability class, 1-17 missed team games, return seasons
    2009-2025; sensitivity cohorts add PROBABLE and AMBIGUOUS episodes
  * splits by return season: discovery 2009-2015, validation 2016-2019,
    held-out 2020-2025 (scored once with parameters chosen on 2009-2019)
  * outcome: Brier score of the pregame win probability on the post-return
    evaluation games (return game + up to 7 more, same season); log loss
    reported alongside; every game is scored once with all active overlays
  * the correction is a forecast overlay on top of the replayed FORCE core Elo,
    exactly as production adds it in ratingsWithActiveQBCarryover; it never
    feeds the core Elo update
  * candidate family is small and fixed: NULL, V33 literal, V33 starts-only,
    damage-fraction (f, decay), damage-fraction with replacement-quality gate,
    damage-fraction with returning-QB dropback decay

Run: python -B research/md03/evaluate.py [--write]
"""
from __future__ import annotations

import json, math, random, statistics, sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / 'data'
RES = HERE / 'results'
HFA, SCALE = 15.0, 340.0
SEED = 20261002
SPLITS = {'discovery': (2009, 2015), 'validation': (2016, 2019), 'heldout': (2020, 2025)}
CAP = 60.0
F_GRID = (0.25, 0.5, 0.75, 1.0)
H_GRID = ('first', 2, 4, 8)        # team-game half-life; 'first' = return game only
DB_GRID = (70, 140, 280)            # returning-QB dropback half-life
MAX_MISSED = 17


def wp(h, a):
    return 1.0 / (1.0 + 10 ** (-((h + HFA) - a) / SCALE))


def decay(h, k):
    if h == 'first':
        return 1.0 if k == 0 else 0.0
    if h is None:
        return 1.0
    return 0.5 ** (k / h)


# ---------------------------------------------------------------- candidates

def mk(name, initial, dec, **params):
    return {'name': name, 'initial': initial, 'decay': dec, 'params': params}


def damage(ep):
    return max(0.0, float(ep['surviving_damage']))


def starts_cap(ep):
    return min(CAP, 7.5 * ep['missed']) * ep['survival']


def v33_literal():
    # min(measured surviving damage, min(60, 7.5 x missed) x survival), 4-game half-life
    return mk('V33_literal', lambda ep: min(damage(ep), starts_cap(ep)), lambda ep, k, db: decay(4, k))


def v33_starts_only():
    return mk('V33_starts_only', starts_cap, lambda ep, k, db: decay(4, k))


def dmg(f, h):
    return mk(f'DAMAGE_f{f}_h{h}', lambda ep: min(CAP * ep['survival'], f * damage(ep)),
              lambda ep, k, db: decay(h, k), f=f, h=h)


def dmg_q(f, h):
    def init(ep):
        g = ep.get('quality_gap')
        if g is None or g <= 0:
            return 0.0
        return min(CAP * ep['survival'], f * damage(ep))
    return mk(f'DAMAGE_QGATE_f{f}_h{h}', init, lambda ep, k, db: decay(h, k), f=f, h=h)


def dmg_db(f, H):
    return mk(f'DAMAGE_DROPBACK_f{f}_H{H}', lambda ep: min(CAP * ep['survival'], f * damage(ep)),
              lambda ep, k, db: 0.5 ** (db / H), f=f, H=H)


NULL = mk('NULL', lambda ep: 0.0, lambda ep, k, db: 0.0)


def family(name):
    if name == 'DAMAGE':
        return [dmg(f, h) for f in F_GRID for h in H_GRID]
    if name == 'DAMAGE_QGATE':
        return [dmg_q(f, h) for f in F_GRID for h in H_GRID]
    if name == 'DAMAGE_DROPBACK':
        return [dmg_db(f, H) for f in F_GRID for H in DB_GRID]
    raise KeyError(name)


# ---------------------------------------------------------------- scoring

def overlays(eps, cand):
    """game_id -> {team: overlay Elo} for the included episodes."""
    out = defaultdict(dict)
    for ep in eps:
        r0 = cand['initial'](ep)
        for k, row in enumerate(ep['eval']):
            gid, _home, _opp, _pre, _opp_pre, _y, db, _started = row[:8]
            v = r0 * cand['decay'](ep, k, db) if r0 > 0 else 0.0
            out[gid][ep['team']] = out[gid].get(ep['team'], 0.0) + v
    return out


def game_table(eps):
    games = {}
    for ep in eps:
        for row in ep['eval']:
            gid, home, opp, pre, opp_pre, y, _db, _s = row[:8]
            if home:
                games[gid] = (ep['team'], opp, pre, opp_pre, y)
            else:
                games[gid] = (opp, ep['team'], opp_pre, pre, 1.0 - y if y != 0.5 else 0.5)
    return games


def score(eps, cand, base=None):
    """Brier/log loss over the union of evaluation games (each scored once)."""
    games = game_table(eps)
    ov = overlays(eps, cand)
    out = {}
    for gid, (h, a, hp, ap, y) in games.items():
        o = ov.get(gid, {})
        p = wp(hp + o.get(h, 0.0), ap + o.get(a, 0.0))
        pc = min(max(p, 1e-9), 1 - 1e-9)
        ll = -(y * math.log(pc) + (1 - y) * math.log(1 - pc))
        out[gid] = ((p - y) ** 2, ll, p)
    return out


def summarize(eps, cand):
    b = score(eps, NULL)
    c = score(eps, cand)
    n = len(b)
    if not n:
        return {'games': 0, 'episodes': len(eps)}
    bb = sum(v[0] for v in b.values()) / n
    cb = sum(v[0] for v in c.values()) / n
    bl = sum(v[1] for v in b.values()) / n
    cl = sum(v[1] for v in c.values()) / n
    per = []
    for ep in eps:
        gids = [r[0] for r in ep['eval']]
        if not gids:
            continue
        d = sum(c[g][0] - b[g][0] for g in gids) / len(gids)
        # team-perspective expected-win shift over the window
        xw = 0.0
        for r in ep['eval']:
            g = r[0]
            sign = 1 if r[1] else -1
            xw += sign * (c[g][2] - b[g][2])
        per.append((ep['id'], d, xw, sum(c[g][0] - b[g][0] for g in gids)))
    deltas = sorted(x[1] for x in per)
    total_gain = sum(x[3] for x in per)
    top3 = sorted(per, key=lambda x: x[3])[:3]
    active = [x for x in per if abs(x[2]) > 1e-12]
    return {
        'episodes': len(eps), 'games': n,
        'baseline_brier': round(bb, 6), 'candidate_brier': round(cb, 6), 'delta_brier': round(cb - bb, 6),
        'baseline_logloss': round(bl, 6), 'candidate_logloss': round(cl, 6), 'delta_logloss': round(cl - bl, 6),
        'active_episodes': len(active),
        'episodes_improved': sum(1 for x in per if x[1] < -1e-12),
        'episodes_worsened': sum(1 for x in per if x[1] > 1e-12),
        'median_episode_delta': round(statistics.median(deltas), 6) if deltas else None,
        'worst_episode': max(per, key=lambda x: x[1])[0] if per else None,
        'worst_episode_delta': round(max(deltas), 6) if deltas else None,
        'best_episode_delta': round(min(deltas), 6) if deltas else None,
        'top3_share_of_net_gain': (round(sum(x[3] for x in top3) / total_gain, 3)
                                   if total_gain < -1e-12 else None),
        'mean_abs_expected_win_shift': round(sum(abs(x[2]) for x in per) / len(per), 4) if per else None,
        'max_expected_win_shift': round(max((x[2] for x in per), default=0.0), 4),
    }


def summarize_isolated(units, cand):
    """Each unit scored on its own rows with only its own overlay (placebos overlap)."""
    tb = tc = 0.0
    n = 0
    per = []
    for u in units:
        r0 = cand['initial'](u)
        db = dc = 0.0
        for k, row in enumerate(u['eval']):
            _gid, home, _opp, pre, opp_pre, y, dbk, _s = row[:8]
            ov = r0 * cand['decay'](u, k, dbk) if r0 > 0 else 0.0
            pb = wp(pre, opp_pre) if home else 1 - wp(opp_pre, pre)
            pc = wp(pre + ov, opp_pre) if home else 1 - wp(opp_pre, pre + ov)
            db += (pb - y) ** 2
            dc += (pc - y) ** 2
        m = len(u['eval'])
        if m:
            tb += db; tc += dc; n += m
            per.append((dc - db) / m)
    if not n:
        return {'units': len(units), 'games': 0}
    return {'units': len(units), 'unit_games': n, 'baseline_brier': round(tb / n, 6),
            'candidate_brier': round(tc / n, 6), 'delta_brier': round((tc - tb) / n, 6),
            'units_improved': sum(1 for d in per if d < -1e-12), 'units_worsened': sum(1 for d in per if d > 1e-12),
            'median_unit_delta': round(statistics.median(per), 6)}


def bootstrap(eps, cand, reps=2000):
    """Episode-cluster bootstrap of the game-weighted Brier delta."""
    b = score(eps, NULL)
    c = score(eps, cand)
    rows = []
    for ep in eps:
        gids = [r[0] for r in ep['eval']]
        rows.append((sum(c[g][0] - b[g][0] for g in gids), len(gids)))
    rng = random.Random(SEED)
    vals = []
    for _ in range(reps):
        s = [rows[rng.randrange(len(rows))] for _ in rows]
        n = sum(x[1] for x in s)
        vals.append(sum(x[0] for x in s) / n if n else 0.0)
    vals.sort()
    return [round(vals[int(0.025 * reps)], 6), round(vals[int(0.975 * reps) - 1], 6),
            round(sum(v > 0 for v in vals) / reps, 4)]


def select(eps, cands):
    best = None
    for c in cands:
        s = summarize(eps, c)
        key = (s['delta_brier'], c['name'])
        if best is None or key < best[0]:
            best = (key, c)
    return best[1]


# ---------------------------------------------------------------- cohort

def in_split(ep, split):
    lo, hi = SPLITS[split]
    return lo <= ep['return_season'] <= hi


def cohort(episodes, classes=('VERIFIED',)):
    return [e for e in episodes if e['availability_class'] in classes and 1 <= e['missed'] <= MAX_MISSED and e['eval']]


def main():
    led = json.loads((DATA / 'episode_ledger.json').read_text(encoding='utf-8'))
    pled = json.loads((DATA / 'placebo_ledger.json').read_text(encoding='utf-8'))
    E = led['episodes']
    P = pled['placebos']
    # Replace semantics: an episode's evaluation (and correction) ends when the
    # returned starter stops starting; a new absence is then its own episode.
    for e in E:
        e['eval_full'] = e['eval']
        cut = next((i for i, r in enumerate(e['eval']) if not r[7]), len(e['eval']))
        e['eval'] = e['eval'][:cut]
    V = cohort(E)
    VP = cohort(E, ('VERIFIED', 'PROBABLE'))
    VPA = cohort(E, ('VERIFIED', 'PROBABLE', 'AMBIGUOUS'))
    AMB = cohort(E, ('AMBIGUOUS',))
    train = [e for e in V if not in_split(e, 'heldout')]
    disc = [e for e in V if in_split(e, 'discovery')]
    val = [e for e in V if in_split(e, 'validation')]
    held = [e for e in V if in_split(e, 'heldout')]
    out = {'design': {
        'splits': SPLITS, 'cap': CAP, 'f_grid': F_GRID, 'h_grid': H_GRID, 'dropback_grid': DB_GRID,
        'max_missed': MAX_MISSED, 'seed': SEED,
        'outcome': 'game-level Brier (log loss alongside) on post-return evaluation games',
        'selection': 'parameters chosen by minimum Brier on the named training set; held-out scored once'}}

    def cohort_stats(eps):
        return {'episodes': len(eps), 'teams': len({e['team'] for e in eps}), 'qbs': len({e['qb'] for e in eps}),
                'eval_games': len(game_table(eps)),
                'timing': dict(sorted(_count(e['timing'] for e in eps).items())),
                'missed': dict(sorted(_count(_mbucket(e['missed']) for e in eps).items())),
                'gap': dict(sorted(_count(_gbucket(e.get('quality_gap')) for e in eps).items())),
                'damage': dict(sorted(_count(_dbucket(e['surviving_damage']) for e in eps).items())),
                'repeat_within_3_games': sum(1 for e in eps if e['games_since_previous_return'] is not None and e['games_since_previous_return'] <= 3)}

    out['cohort'] = {'verified': cohort_stats(V), 'verified_probable': cohort_stats(VP),
                     'all_detected': cohort_stats(VPA), 'ambiguous': cohort_stats(AMB),
                     'by_split_verified': {k: cohort_stats([e for e in V if in_split(e, k)]) for k in SPLITS},
                     'excluded_long_windows': sum(1 for e in E if e['missed'] > MAX_MISSED),
                     'no_return_events_2009_2025': len(led['no_return']),
                     'availability_classes_all': dict(_count(e['availability_class'] for e in E))}

    # ------------------------------------------------ fixed candidates (no fitting)
    fixed = [v33_literal(), v33_starts_only()]
    out['fixed'] = {c['name']: {s: summarize([e for e in V if in_split(e, s)], c) for s in SPLITS} |
                    {'all_2009_2025': summarize(V, c)} for c in fixed}
    for c in fixed:
        out['fixed'][c['name']]['heldout_bootstrap'] = bootstrap(held, c)
        out['fixed'][c['name']]['all_bootstrap'] = bootstrap(V, c)

    # ------------------------------------------------ fitted families
    fams = {}
    for fname in ('DAMAGE', 'DAMAGE_QGATE', 'DAMAGE_DROPBACK'):
        cands = family(fname)
        d_best = select(disc, cands)
        t_best = select(train, cands)
        fams[fname] = {
            'discovery_choice': d_best['params'],
            'discovery_in_sample': summarize(disc, d_best),
            'validation_of_discovery_choice': summarize(val, d_best),
            'train_choice_2009_2019': t_best['params'],
            'train_in_sample': summarize(train, t_best),
            'heldout': summarize(held, t_best),
            'heldout_bootstrap': bootstrap(held, t_best),
            'grid_train_delta': {c['name']: summarize(train, c)['delta_brier'] for c in cands},
            'grid_heldout_delta': {c['name']: summarize(held, c)['delta_brier'] for c in cands},
        }
    out['families'] = fams

    # ------------------------------------------------ leave-one-season-out (DAMAGE family)
    loso = []
    cands = family('DAMAGE')
    for s in range(2009, 2026):
        tr = [e for e in V if e['return_season'] != s]
        te = [e for e in V if e['return_season'] == s]
        if not te:
            continue
        ch = select(tr, cands)
        r = summarize(te, ch)
        loso.append({'season': s, 'choice': ch['params'], 'games': r['games'], 'delta': r['delta_brier']})
    tot = sum(x['delta'] * x['games'] for x in loso) / sum(x['games'] for x in loso)
    out['loso_damage'] = {'rows': loso, 'game_weighted_delta': round(tot, 6),
                          'seasons_improved': sum(x['delta'] < 0 for x in loso), 'seasons': len(loso)}

    # ------------------------------------------------ magnitude / timing / decay probes on train, confirmed on held-out
    ref_f = fams['DAMAGE']['train_choice_2009_2019']
    ref = dmg(ref_f['f'], ref_f['h'])
    probes = {}
    for label, sub in {
        'MID': lambda e: e['timing'] == 'MID',
        'OFF': lambda e: e['timing'] != 'MID',
        'missed_1': lambda e: e['missed'] == 1,
        'missed_2_3': lambda e: 2 <= e['missed'] <= 3,
        'missed_4_8': lambda e: 4 <= e['missed'] <= 8,
        'missed_9_17': lambda e: e['missed'] >= 9,
        'gap_le_0_similar_or_better': lambda e: e.get('quality_gap') is not None and e['quality_gap'] <= 0,
        'gap_0_0p1_slightly_worse': lambda e: e.get('quality_gap') is not None and 0 < e['quality_gap'] <= 0.1,
        'gap_gt_0p1_much_worse': lambda e: e.get('quality_gap') is not None and e['quality_gap'] > 0.1,
        'gap_unknown': lambda e: e.get('quality_gap') is None,
        'damage_le_0': lambda e: e['surviving_damage'] <= 0,
        'damage_0_25': lambda e: 0 < e['surviving_damage'] <= 25,
        'damage_gt_25': lambda e: e['surviving_damage'] > 25,
        'repeat_within_3_games': lambda e: e['games_since_previous_return'] is not None and e['games_since_previous_return'] <= 3,
        'not_repeat': lambda e: not (e['games_since_previous_return'] is not None and e['games_since_previous_return'] <= 3),
    }.items():
        probes[label] = {
            'all_2009_2025': {'reference_damage': summarize([e for e in V if sub(e)], ref),
                              'V33_literal': summarize([e for e in V if sub(e)], v33_literal()),
                              'V33_starts_only': summarize([e for e in V if sub(e)], v33_starts_only())},
            'heldout': {'reference_damage': summarize([e for e in held if sub(e)], ref),
                        'V33_literal': summarize([e for e in held if sub(e)], v33_literal())}}
    out['reference_candidate'] = ref['params']
    out['probes'] = probes

    # timing: separate f for MID and OFF versus unified
    tim = {}
    for label, sub in (('MID', lambda e: e['timing'] == 'MID'), ('OFF', lambda e: e['timing'] != 'MID')):
        ch = select([e for e in train if sub(e)], family('DAMAGE'))
        tim[label] = {'train_choice': ch['params'],
                      'heldout_separate': summarize([e for e in held if sub(e)], ch),
                      'heldout_unified': summarize([e for e in held if sub(e)], ref)}
    out['timing_separate_vs_unified'] = tim
    # offseason survival sensitivity on the reference magnitude
    surv = {}
    for s_off in (0.5, 0.7, 1.0):
        def init(ep, s_off=s_off, f=ref_f['f']):
            raw = max(0.0, ep['raw_damage'])
            if ep['timing'] == 'MID':
                return min(CAP, f * raw)
            return min(CAP * s_off, f * raw * s_off)
        c = mk(f'survival_{s_off}', init, lambda ep, k, db, h=ref_f['h']: decay(h, k))
        offs = lambda eps: [e for e in eps if e['timing'] != 'MID']
        surv[str(s_off)] = {'train': summarize(offs(train), c), 'heldout': summarize(offs(held), c),
                            'all': summarize(offs(V), c)}
    out['offseason_survival_sensitivity'] = surv
    # one-game rule options
    one = {}
    for mmin in (1, 2, 3):
        def init(ep, mmin=mmin, f=ref_f['f']):
            return 0.0 if ep['missed'] < mmin else min(CAP * ep['survival'], f * damage(ep))
        c = mk(f'min_missed_{mmin}', init, lambda ep, k, db, h=ref_f['h']: decay(h, k))
        one[str(mmin)] = {'train': summarize(train, c), 'heldout': summarize(held, c)}
    out['minimum_missed_rule'] = one
    # cap sensitivity
    caps = {}
    for cap in (30.0, 60.0, 90.0, 1e9):
        def init(ep, cap=cap, f=ref_f['f']):
            return min(cap * ep['survival'], f * damage(ep))
        c = mk(f'cap_{cap}', init, lambda ep, k, db, h=ref_f['h']: decay(h, k))
        caps['none' if cap > 1e6 else str(int(cap))] = {'train': summarize(train, c), 'heldout': summarize(held, c)}
    out['cap_sensitivity'] = caps

    # ------------------------------------------------ final candidate contracts, every split
    qf = fams['DAMAGE_QGATE']['train_choice_2009_2019']
    final = {'NULL': NULL, 'A_V33_generalized': v33_literal(), 'B_damage_quality_gated': dmg_q(qf['f'], qf['h'])}
    out['candidate_contracts'] = {
        k: {s: summarize([e for e in V if in_split(e, s)], c) for s in SPLITS} |
           {'all_2009_2025': summarize(V, c), 'all_bootstrap': bootstrap(V, c),
            'heldout_bootstrap': bootstrap(held, c), 'params': c['params']}
        for k, c in final.items() if k != 'NULL'}

    # ------------------------------------------------ forecast impact and league-wide dilution
    rc = json.loads((DATA / 'replay_check.json').read_text(encoding='utf-8'))
    gps = {int(k): v for k, v in rc['games_by_season'].items()}
    impact = {}
    for c in (v33_literal(), ref, final['B_damage_quality_gated']):
        rows = {}
        for split, eps in (('all_2009_2025', V), ('heldout', held)):
            init = [c['initial'](e) for e in eps]
            act = [x for x in init if x > 0]
            b0, c0 = score(eps, NULL), score(eps, c)
            ret_shift = [abs(c0[e['eval'][0][0]][2] - b0[e['eval'][0][0]][2]) for e, x in zip(eps, init) if x > 0]
            s = summarize(eps, c)
            lo, hi = (2009, 2025) if split == 'all_2009_2025' else SPLITS['heldout']
            league_games = sum(gps[y] for y in range(lo, hi + 1))
            rows[split] = {
                'active_episodes': len(act), 'episodes': len(eps),
                'initial_elo_mean': round(sum(act) / len(act), 2) if act else 0.0,
                'initial_elo_median': round(statistics.median(act), 2) if act else 0.0,
                'initial_elo_max': round(max(act), 2) if act else 0.0,
                'return_game_mean_abs_prob_shift': round(sum(ret_shift) / len(ret_shift), 4) if ret_shift else 0.0,
                'mean_abs_expected_win_shift': s['mean_abs_expected_win_shift'],
                'max_expected_win_shift': s['max_expected_win_shift'],
                'window_delta_brier': s['delta_brier'], 'window_games': s['games'],
                'league_games': league_games,
                'league_wide_delta_brier': round(s['delta_brier'] * s['games'] / league_games, 7)}
        impact[c['name']] = rows
    out['forecast_impact'] = impact
    # KC 2026 application check (offseason, 3 missed starts) from the same replay
    kc_raw = -rc['kc_2025_weeks16_18_raw_elo_change']
    kc_surv = kc_raw * 0.70
    out['kc_application_check'] = {
        'replay_raw_damage': round(kc_raw, 2), 'replay_surviving_damage': round(kc_surv, 2),
        'celo_recorded_raw_damage': 67.6151, 'celo_recorded_surviving_damage': 47.3306,
        'V33_literal_initial': round(min(kc_surv, min(CAP, 7.5 * 3) * 0.70), 2),
        'reference_damage_initial': round(min(CAP * 0.70, ref_f['f'] * kc_surv), 2),
        'reference_half_life_games': ref_f['h']}

    # ------------------------------------------------ repeated episodes: replace versus continue
    rep = [e for e in V if len(e['eval_full']) > len(e['eval'])]
    cont = []
    for e in rep:
        tail = e['eval_full'][len(e['eval']):]
        cont.append({'id': e['id'], 'eval': tail, 'survival': e['survival'], 'missed': e['missed'],
                     'surviving_damage': e['surviving_damage'], 'quality_gap': e['quality_gap'],
                     '_offset': len(e['eval'])})
    def shifted(c):
        return mk(c['name'] + '_continued', c['initial'], lambda ep, k, db, c=c: c['decay'](ep, k + ep['_offset'], db))
    out['repeated_episode_continue_probe'] = {
        'episodes_with_new_absence_inside_window': len(rep),
        'note': 'games after the returned starter left again; continuing the old correction there versus replacing it (zero)',
        'V33_literal_continued': summarize_isolated(cont, shifted(v33_literal())),
        'reference_damage_continued': summarize_isolated(cont, shifted(ref))}

    # ------------------------------------------------ sensitivity cohorts
    out['sensitivity_cohorts'] = {
        'verified_probable': {'V33_literal': summarize(VP, v33_literal()), 'reference_damage': summarize(VP, ref),
                              'heldout_reference_damage': summarize([e for e in VP if in_split(e, 'heldout')], ref)},
        'all_detected': {'V33_literal': summarize(VPA, v33_literal()), 'reference_damage': summarize(VPA, ref)},
        'ambiguous_only_negative_control': {'V33_literal': summarize(AMB, v33_literal()),
                                            'V33_starts_only': summarize(AMB, v33_starts_only()),
                                            'reference_damage': summarize(AMB, ref)},
    }

    # ------------------------------------------------ placebo negative control
    pl = {}
    for timing in ('MID', 'OFF'):
        for m in (1, 3, 6):
            sub = [p | {'quality_gap': None, 'games_since_previous_return': None}
                   for p in P if p['timing'] == timing and p['missed'] == m and p['eval']]
            pl[f'{timing}_m{m}'] = {'V33_literal': summarize_isolated(sub, v33_literal()),
                                    'V33_starts_only': summarize_isolated(sub, v33_starts_only()),
                                    'reference_damage': summarize_isolated(sub, ref)}
    allp = [p | {'quality_gap': None, 'games_since_previous_return': None} for p in P if p['eval']]
    pl['all'] = {'V33_literal': summarize_isolated(allp, v33_literal()), 'V33_starts_only': summarize_isolated(allp, v33_starts_only()),
                 'reference_damage': summarize_isolated(allp, ref)}
    pl['heldout_seasons'] = {'reference_damage': summarize_isolated([p for p in allp if p['season'] >= 2020], ref),
                             'V33_literal': summarize_isolated([p for p in allp if p['season'] >= 2020], v33_literal())}
    # the same isolated scoring on the real verified episodes, for a like-for-like comparison
    pl['verified_episodes_isolated'] = {'reference_damage': summarize_isolated(V, ref),
                                        'V33_literal': summarize_isolated(V, v33_literal()),
                                        'V33_starts_only': summarize_isolated(V, v33_starts_only())}
    out['placebo'] = pl

    # ------------------------------------------------ episode table for the report (verified cohort)
    l33 = score(V, v33_literal())
    lr = score(V, ref)
    l0 = score(V, NULL)
    rows = []
    for e in V:
        g = [r[0] for r in e['eval']]
        rows.append({'id': e['id'], 'qb': e['qb_name'], 'team': e['team'], 'timing': e['timing'], 'missed': e['missed'],
                     'return': f"{e['return_season']}w{e['return_week']}", 'split': next(k for k in SPLITS if in_split(e, k)),
                     'surviving_damage': e['surviving_damage'], 'quality_gap': e['quality_gap'],
                     'v33_initial': round(v33_literal()['initial'](e), 2), 'ref_initial': round(ref['initial'](e), 2),
                     'eval_games': len(g),
                     'v33_delta': round(sum(l33[x][0] - l0[x][0] for x in g) / len(g), 5),
                     'ref_delta': round(sum(lr[x][0] - l0[x][0] for x in g) / len(g), 5)})
    out['verified_episode_table'] = sorted(rows, key=lambda r: (r['return'], r['team']))
    return out


def _count(it):
    d = defaultdict(int)
    for x in it:
        d[x] += 1
    return dict(d)


def _mbucket(m):
    return '1' if m == 1 else '2-3' if m <= 3 else '4-8' if m <= 8 else '9-17'


def _gbucket(g):
    if g is None:
        return 'unknown'
    return '<=0' if g <= 0 else '0-0.1' if g <= 0.1 else '>0.1'


def _dbucket(d):
    return '<=0' if d <= 0 else '0-25' if d <= 25 else '>25'


if __name__ == '__main__':
    res = main()
    txt = json.dumps(res, indent=1, sort_keys=True, default=str)
    if '--write' in sys.argv:
        RES.mkdir(exist_ok=True)
        (RES / 'md03_results.json').write_text(txt + '\n', encoding='utf-8', newline='\n')
    print(txt)
