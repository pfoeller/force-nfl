#!/usr/bin/env python3
"""MD-03 stage 1: historical QB absence/return cohort and FORCE-core Elo replay.

Research only. Nothing here is production code or a production source decision.

Inputs (62 free nflverse files, downloaded once into a local cache directory that
is NOT committed; SHA-256 of every file is pinned in data/input_manifest.json):
  games.csv                       nflverse/nfldata  (scores, per-game starting QB ids)
  stats_player_week_<yr>.csv      nflverse-data release stats_player (QB plays / EPA)
  injuries_<yr>.csv               nflverse-data release injuries (2009+)
  roster_weekly_<yr>.csv          nflverse-data release weekly_rosters (reserve status)

Outputs (committed, deterministic):
  data/input_manifest.json        file hashes, sizes and URLs (rewritten only in refresh mode)
  data/episode_ledger.json        every detected absence/return episode with features
                                  and its post-return evaluation games
  data/placebo_ledger.json        no-absence placebo windows (negative control)
  data/detector_like_ledger.json  returns found by an emulation of the Codex prototype
                                  rules (cycle5/codex-md03-data @ e32ee2be), same fields
  data/replay_check.json          replay sanity statistics

Usage:
  python -B research/md03/build_cohort.py --cache <dir>
      PINNED REPRODUCTION (default): every raw file must exist and match the
      committed manifest hash and size; any mismatch aborts before anything is
      written. The manifest is never rewritten in this mode.
  python -B research/md03/build_cohort.py --cache <dir> --refresh-sources [--download]
      SOURCE REFRESH: accepts whatever the cache holds (downloading missing files
      with --download) and rewrites the manifest. Results built this way are a new
      evidence version, not a reproduction.

The rating engine mirrors the live FORCE *core* season engine in assets/app.js
(seasonEngine): result-only Elo, K=20, HFA=15, scale=340, the production
margin multiplier, week-batched updates, 30% offseason reversion for 2021+
seasons and 33.3% before. It does NOT reproduce the V99 continuity/early-regime
layer, the V98 look-behind, the unit-to-FORCE bridge, the market blend or the
Celo QB-aware prior, none of which can be replayed historically from free data.
"""
from __future__ import annotations

import argparse, csv, hashlib, json, math, sys, urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'data'

FIRST_SEASON = 1999          # replay burn-in start
FIRST_EPISODE_SEASON = 2009  # injury reports exist from 2009
LAST_SEASON = 2025           # last complete season; 2026 is the live application season
MEAN = 1505.0
K = 20.0
HFA = 15.0
SCALE = 340.0
ESTABLISH_WINDOW = 5         # incumbent = started >= 4 of the team's last 5 games
ESTABLISH_MIN = 4
EVAL_GAMES = 8               # post-return evaluation window (team games)
PRIOR_QB_GAMES = 16          # starter's pre-absence EPA/play lookback
MIN_PRIOR_PLAYS = 100
FRANCHISE = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA', 'LAR': 'LA', 'JAC': 'JAX', 'WSH': 'WAS'}
URLS = {
    # pinned commit; byte-identical to the file both Cycle 5 lanes used
    'games.csv': 'https://raw.githubusercontent.com/nflverse/nfldata/5898b6279be0829925f7bbda165d319b474e1825/data/games.csv',
    'stats': 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv',
    'injuries': 'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{y}.csv',
    'roster': 'https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_{y}.csv',
}
NON_INJURY = ('not injury related', 'personal', 'rest', 'coach', 'suspension')
# Reserve codes treated as documented medical reserve lists. Everything else on
# RES (blank, A01, I01, I02, R04, R05, R40, ...) is a generic reserve status whose
# cause is not established by the code alone. R59 is the 2021 COVID-19 list.
MEDICAL_RESERVE = {'R01', 'R48'}
COVID_RESERVE = {'R59'}
CAUSE_CLASSES = ('VERIFIED_MEDICAL', 'PROBABLE_MEDICAL', 'AMBIGUOUS_CAUSE', 'NONMEDICAL', 'ROLE_CHANGE')


def fr(t):
    return FRANCHISE.get(t, t)


def reversion_for(season):
    return 0.30 if season >= 2021 else 0.333


def wp(home, away):
    return 1.0 / (1.0 + 10 ** (-((home + HFA) - away) / SCALE))


def mov_mult(margin, home, away):
    return math.log(max(margin, 1) + 1) * 2.2 / (2.2 + 0.001 * abs((home + HFA) - away))


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def files_needed():
    names = ['games.csv']
    names += [f'stats_player_week_{y}.csv' for y in range(FIRST_SEASON, LAST_SEASON + 1)]
    names += [f'injuries_{y}.csv' for y in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1)]
    names += [f'roster_weekly_{y}.csv' for y in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1)]
    return names


def url_for(name):
    if name == 'games.csv':
        return URLS['games.csv']
    y = int(name.rsplit('_', 1)[1][:4])
    if name.startswith('stats'):
        return URLS['stats'].format(y=y)
    if name.startswith('injuries'):
        return URLS['injuries'].format(y=y)
    return URLS['roster'].format(y=y)


def read_csv(p):
    with open(p, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def num(v, default=0.0):
    try:
        x = float(v)
        return x if math.isfinite(x) else default
    except (TypeError, ValueError):
        return default


def present(v):
    try:
        return math.isfinite(float(v))
    except (TypeError, ValueError):
        return False


def verify_inputs(cache, manifest):
    """Pinned reproduction: every listed raw file must match its committed hash/size."""
    bad = []
    for name, info in sorted(manifest.items()):
        f = Path(cache) / name
        if not f.exists():
            bad.append(f'{name}: missing')
        elif f.stat().st_size != info['bytes'] or sha256(f) != info['sha256']:
            bad.append(f'{name}: hash/size mismatch')
    if bad:
        raise ValueError('Pinned inputs do not match data/input_manifest.json; use --refresh-sources '
                         'only for a deliberate new evidence version: ' + '; '.join(bad))


# ---------------------------------------------------------------- loading

def load_games(cache):
    rows = []
    for r in read_csv(cache / 'games.csv'):
        s = int(r['season'])
        if s < FIRST_SEASON or s > LAST_SEASON or r['home_score'] == '' or r['away_score'] == '':
            continue
        rows.append({
            'gid': r['game_id'], 'season': s, 'week': int(r['week']), 'type': r['game_type'],
            'date': r['gameday'], 'time': r['gametime'] or '',
            'home': fr(r['home_team']), 'away': fr(r['away_team']),
            'hs': int(r['home_score']), 'as': int(r['away_score']),
            'hqb': r['home_qb_id'], 'aqb': r['away_qb_id'],
            'hqbn': r['home_qb_name'], 'aqbn': r['away_qb_name'],
        })
    rows.sort(key=lambda g: (g['season'], g['week'], g['date'], g['time'], g['gid']))
    return rows


def load_qb_stats(cache):
    """(game_id, player_id) -> plays/dropbacks/epa for QB-position rows."""
    out = {}
    for y in range(FIRST_SEASON, LAST_SEASON + 1):
        for r in read_csv(cache / f'stats_player_week_{y}.csv'):
            if r['position'] != 'QB':
                continue
            att, sk, car = num(r['attempts']), num(r['sacks_suffered']), num(r['carries'])
            plays = att + sk + car
            if plays <= 0:
                continue
            # completeness: an EPA field that is blank while its plays exist is
            # recorded as missing rather than silently scored as zero
            missing = (att + sk > 0 and not present(r['passing_epa'])) or (car > 0 and not present(r['rushing_epa']))
            out[(r['game_id'], r['player_id'])] = {
                'team': fr(r['team']), 'dropbacks': att + sk, 'plays': plays,
                'epa': num(r['passing_epa']) + num(r['rushing_epa']), 'epa_missing': missing}
    return out


def load_availability(cache):
    inj, ros = {}, {}
    for y in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1):
        for r in read_csv(cache / f'injuries_{y}.csv'):
            if r['position'] != 'QB':
                continue
            inj.setdefault((int(r['season']), int(r['week']), fr(r['team']), r['gsis_id']), []).append({
                'status': r['report_status'], 'injury': r['report_primary_injury'] or r['practice_primary_injury'],
                'practice': r['practice_status']})
        for r in read_csv(cache / f'roster_weekly_{y}.csv'):
            if r['position'] != 'QB' or not r['gsis_id']:
                continue
            ros[(int(r['season']), int(r['week']), fr(r['team']), r['gsis_id'])] = {
                'status': r['status'], 'abbr': r.get('status_description_abbr', '')}
    return inj, ros


# ---------------------------------------------------------------- replay

def replay(games):
    """FORCE core Elo, week-batched; returns per-game pre/post ratings."""
    ratings = defaultdict(lambda: MEAN)
    cur = None
    by_week = defaultdict(list)
    for i, g in enumerate(games):
        by_week[(g['season'], g['week'])].append(i)
    for key in sorted(by_week):
        season = key[0]
        if season != cur:
            if cur is not None:
                rev = reversion_for(season)
                for t in list(ratings):
                    ratings[t] = MEAN + (ratings[t] - MEAN) * (1 - rev)
            cur = season
        staged = []
        for i in by_week[key]:
            g = games[i]
            g['pre_h'], g['pre_a'] = ratings[g['home']], ratings[g['away']]
            g['p_home'] = wp(g['pre_h'], g['pre_a'])
            staged.append(g)
        for g in staged:
            res = 0.5 if g['hs'] == g['as'] else (1.0 if g['hs'] > g['as'] else 0.0)
            d = K * mov_mult(abs(g['hs'] - g['as']), g['pre_h'], g['pre_a']) * (res - g['p_home'])
            g['delta_h'] = d
            ratings[g['home']] = g['pre_h'] + d
            ratings[g['away']] = g['pre_a'] - d
    return games


def team_sequences(games):
    seq = defaultdict(list)
    for i, g in enumerate(games):
        for side in ('h', 'a'):
            t = g['home'] if side == 'h' else g['away']
            seq[t].append({
                'i': i, 'gid': g['gid'], 'season': g['season'], 'week': g['week'], 'type': g['type'],
                'home': side == 'h', 'opp': g['away'] if side == 'h' else g['home'],
                'qb': g['hqb'] if side == 'h' else g['aqb'], 'qbn': g['hqbn'] if side == 'h' else g['aqbn'],
                'pre': g['pre_h'] if side == 'h' else g['pre_a'],
                'opp_pre': g['pre_a'] if side == 'h' else g['pre_h'],
                'delta': g['delta_h'] if side == 'h' else -g['delta_h'],
                'y': (0.5 if g['hs'] == g['as'] else float((g['hs'] > g['as']) == (side == 'h'))),
                'margin': (g['hs'] - g['as']) if side == 'h' else (g['as'] - g['hs']),
                'p': g['p_home'] if side == 'h' else 1 - g['p_home'],
            })
    return seq


# ---------------------------------------------------------------- episodes

def qb_window_epa(qb_games, qb, before_index):
    rows = [r for (i, r) in qb_games.get(qb, []) if i < before_index][-PRIOR_QB_GAMES:]
    plays = sum(r['plays'] for r in rows)
    missing = sum(1 for r in rows if r.get('epa_missing'))
    epa = sum(r['epa'] for r in rows) / plays if plays >= MIN_PRIOR_PLAYS else None
    return epa, plays, missing


def qb_prior_epa(qb_games, qb, before_index):
    epa, plays, _ = qb_window_epa(qb_games, qb, before_index)
    return epa, plays


def week_evidence(r, team, qb, inj, ros, qb_stats):
    """Cause evidence for the absent starter in one window game week."""
    k = (r['season'], r['week'], team, qb)
    rows, b = inj.get(k, []), ros.get(k)
    st = qb_stats.get((r['gid'], qb))
    medical_rows = [a for a in rows if (a['injury'] or '').strip() and not any(x in (a['injury'] or '').lower() for x in NON_INJURY)]
    nonmed_rows = [a for a in rows if any(x in (a['injury'] or '').lower() for x in NON_INJURY)]
    out = {
        'week': r['week'],
        'listed': bool(rows),
        'duplicate_rows': len(rows) > 1,
        'medical_out': any(a['status'] in ('Out', 'Doubtful') for a in medical_rows),
        'onset_out_only': any(a['status'] == 'Out' for a in medical_rows),
        'medical_listed': bool(medical_rows),
        'nonmedical_listed': bool(nonmed_rows) and not medical_rows,
        'reserve_medical': bool(b and b['status'] == 'RES' and b['abbr'] in MEDICAL_RESERVE),
        'reserve_generic': bool(b and b['status'] == 'RES' and b['abbr'] not in MEDICAL_RESERVE | COVID_RESERVE),
        'covid': bool(b and b['status'] == 'RES' and b['abbr'] in COVID_RESERVE),
        'suspended': bool(b and b['status'] == 'SUS'),
        'roster': (b['status'] + ':' + (b['abbr'] or '-')) if b else None,
        'participated': bool(st),
    }
    # healthy-but-not-starting: active on the roster or playing in the game with
    # no injury listing at all that week
    out['healthy_not_starting'] = (not rows) and (bool(b and b['status'] == 'ACT') or out['participated'])
    return out


def classify(window, team, qb, inj, ros, qb_stats, season_opener_onset):
    """Cause class for an absence window (retrospective research labelling).

    VERIFIED_MEDICAL  Out/Doubtful with a medical injury, a documented medical
                      reserve list (IR / IR-designated-to-return codes), or a
                      generic reserve status corroborated by a medical injury
                      listing in the same window; and no healthy week.
    PROBABLE_MEDICAL  medical listing only (Questionable, practice report) or the
                      COVID list, and no healthy week.
    AMBIGUOUS_CAUSE   no cause evidence, or a generic reserve status with no
                      medical listing (unknown code is not medical evidence).
    NONMEDICAL        non-injury reason or suspension, no medical evidence.
    ROLE_CHANGE       the starter was healthy-but-not-starting in a window week,
                      or the absence began at a season opener (new-season
                      starter). Takes precedence over medical evidence; the
                      overlap is reported as a conflict.
    """
    weeks = [week_evidence(r, team, qb, inj, ros, qb_stats) for r in window]
    anyk = lambda key: any(w[key] for w in weeks)
    # a generic reserve status counts as medical only when the same window also
    # carries a medical injury listing for that player (cause documented)
    medical = anyk('medical_out') or anyk('reserve_medical') or (anyk('reserve_generic') and anyk('medical_listed'))
    probable = anyk('medical_listed') or anyk('covid')
    healthy = anyk('healthy_not_starting')
    nonmed = anyk('nonmedical_listed') or anyk('suspended')
    conflicts = []
    if healthy and (medical or probable):
        conflicts.append('medical_evidence_and_healthy_not_starting_week')
    if season_opener_onset and (medical or probable):
        conflicts.append('medical_evidence_and_season_opener_onset')
    if nonmed and (medical or probable):
        conflicts.append('medical_and_nonmedical_reasons')
    if anyk('duplicate_rows'):
        conflicts.append('duplicate_injury_rows')
    if healthy or season_opener_onset:
        cls = 'ROLE_CHANGE'
    elif nonmed and not (medical or probable):
        cls = 'NONMEDICAL'
    elif medical:
        cls = 'VERIFIED_MEDICAL'
    elif probable:
        cls = 'PROBABLE_MEDICAL'
    else:
        cls = 'AMBIGUOUS_CAUSE'
    ev = []
    for w in weeks:
        bits = []
        if w['medical_out']:
            bits.append('medical_out')
        elif w['medical_listed']:
            bits.append('medical_listed')
        if w['nonmedical_listed']:
            bits.append('nonmedical_listed')
        if w['roster'] and not w['roster'].startswith('ACT'):
            bits.append('roster=' + w['roster'])
        if w['healthy_not_starting']:
            bits.append('healthy_not_starting')
        if bits:
            ev.append(f"w{w['week']}:" + ','.join(bits))
    flags = {'medical': medical, 'probable_medical': probable, 'healthy_not_starting': healthy,
             'nonmedical': nonmed, 'season_opener_onset': season_opener_onset,
             'generic_reserve_only': anyk('reserve_generic') and not (medical or probable),
             'covid_list': anyk('covid'), 'onset_week_out': bool(weeks and weeks[0]['onset_out_only']),
             'onset_week_listed': bool(weeks and weeks[0]['listed'])}
    return cls, flags, ev, conflicts


def eval_rows(seq, start, season_bound, qb, qb_stats):
    """Post-return evaluation games: from the return game, up to EVAL_GAMES,
    stopping at the end of the return season."""
    rows, dropbacks = [], 0.0
    for r in seq[start:start + EVAL_GAMES]:
        if r['season'] != season_bound:
            break
        rows.append([r['gid'], int(r['home']), r['opp'], round(r['pre'], 4), round(r['opp_pre'], 4),
                     r['y'], round(dropbacks, 1), int(r['qb'] == qb), r['margin'], r['season'], r['week']])
        st = qb_stats.get((r['gid'], qb))
        dropbacks += st['dropbacks'] if st else 0.0
    return rows


def qb_game_index(games, qb_stats):
    qb_games = defaultdict(list)
    for i, g in enumerate(games):
        for q in (g['hqb'], g['aqb']):
            st = qb_stats.get((g['gid'], q))
            if st:
                qb_games[q].append((i, st))
    return qb_games


def episode_record(s, team, incumbent, pos, j, qb_games, qb_stats, inj, ros, prev_return):
    """Common episode fields for an absence window s[pos:j] and return game s[j]."""
    r, window, ret = s[pos], s[pos:j], s[j]
    seasons = sorted({x['season'] for x in window})
    if ret['season'] == r['season']:
        timing = 'MID'
    elif seasons == [r['season']] and (j == 0 or s[j - 1]['season'] != ret['season']):
        timing = 'OFF'
    else:
        timing = 'SPAN'
    damage_by_season = defaultdict(float)
    for x in window:
        damage_by_season[x['season']] -= x['delta']   # positive = rating lost
    raw_damage = sum(damage_by_season.values())
    if timing == 'MID':
        surviving, survival = raw_damage, 1.0
    else:
        # prior-season part passes through the production offseason reversion
        rev = reversion_for(ret['season'])
        surviving = sum(v * ((1 - rev) if sea < ret['season'] else 1.0) for sea, v in damage_by_season.items())
        survival = 1 - rev
    opener = pos == 0 or s[pos - 1]['season'] != r['season']
    cls, flags, ev, conflicts = classify(window, team, incumbent, inj, ros, qb_stats, opener)
    prior_epa, prior_plays, prior_missing = qb_window_epa(qb_games, incumbent, r['i'])
    rp = re_ = 0.0
    repl_missing = 0
    for x in window:
        st = qb_stats.get((x['gid'], x['qb']))
        if st:
            rp += st['plays']
            re_ += st['epa']
            repl_missing += int(st['epa_missing'])
    repl_epa = re_ / rp if rp >= 1 else None
    gap = (prior_epa - repl_epa) if (prior_epa is not None and repl_epa is not None) else None
    return {
        'kind': 'episode',
        'id': f"{team}_{r['season']}w{r['week']:02d}_{incumbent}",
        'team': team, 'qb': incumbent, 'qb_name': ret['qbn'],
        'start_season': r['season'], 'start_week': r['week'], 'start_type': r['type'],
        'return_season': ret['season'], 'return_week': ret['week'], 'return_gid': ret['gid'],
        'missed': len(window), 'timing': timing,
        'replacements': sorted({x['qbn'] for x in window}),
        'cause_class': cls, 'cause_flags': flags, 'cause_conflicts': conflicts, 'cause_evidence': ev[:12],
        'pre_window_elo': round(window[0]['pre'], 4),
        'raw_damage': round(raw_damage, 4), 'surviving_damage': round(surviving, 4),
        'survival': survival,
        'window_results': [x['y'] for x in window],
        'window_mean_p': round(sum(x['p'] for x in window) / len(window), 4),
        'starter_prior_epa_play': None if prior_epa is None else round(prior_epa, 4),
        'starter_prior_plays': prior_plays, 'starter_prior_epa_missing_rows': prior_missing,
        'replacement_epa_play': None if repl_epa is None else round(repl_epa, 4),
        'replacement_plays': rp, 'replacement_epa_missing_rows': repl_missing,
        'quality_gap': None if gap is None else round(gap, 4),
        'games_since_previous_return': (pos - prev_return) if prev_return is not None else None,
        'eval': eval_rows(s, j, ret['season'], incumbent, qb_stats),
    }


def detect(games, seq, qb_stats, inj, ros):
    qb_games = qb_game_index(games, qb_stats)
    episodes = []
    for team in sorted(seq):
        s = seq[team]
        incumbent = None
        last_return_pos = None
        floor = 0
        pos = 0
        while pos < len(s):
            r = s[pos]
            # establish / refresh the incumbent from the last 5 starts; only starts
            # since the incumbent's last return (or a takeover) count, so replacement
            # starts inside a finished window cannot displace the returned starter
            recent = [x['qb'] for x in s[max(0, pos - ESTABLISH_WINDOW, floor):pos]]
            for q in set(recent):
                if recent.count(q) >= ESTABLISH_MIN:
                    incumbent = q
            if incumbent is None or r['qb'] == incumbent:
                pos += 1
                continue
            opener = pos == 0 or s[pos - 1]['season'] != r['season']
            # scan the absence. The window may cross one offseason only if the
            # incumbent starts the next season's opener; if another QB opens the
            # new season the change is treated as permanent, not a return.
            j = pos
            takeover = None
            healthy_seen = opener
            while j < len(s) and s[j]['qb'] != incumbent and s[j]['season'] == r['season']:
                if week_evidence(s[j], team, incumbent, inj, ros, qb_stats)['healthy_not_starting']:
                    healthy_seen = True
                last4 = [x['qb'] for x in s[max(pos, j - ESTABLISH_MIN + 1):j + 1]]
                # role takeover: the starter was healthy-but-not-starting (or the
                # absence began at a season opener) and one replacement has now
                # started ESTABLISH_MIN consecutive window games
                if healthy_seen and len(last4) == ESTABLISH_MIN and len(set(last4)) == 1:
                    takeover = j
                    break
                j += 1
            if takeover is not None:
                episodes.append({'kind': 'role_takeover', 'team': team, 'qb': incumbent, 'new_starter': s[takeover]['qb'],
                                 'start_gid': r['gid'], 'season': r['season'], 'week': r['week'],
                                 'takeover_gid': s[takeover]['gid']})
                incumbent = s[takeover]['qb']
                floor = takeover - ESTABLISH_MIN + 1
                last_return_pos = None
                pos = takeover + 1
                continue
            if j >= len(s) or s[j]['qb'] != incumbent:
                # no return within the bound: permanent change, trade, release, benching kept
                episodes.append({'kind': 'no_return', 'team': team, 'qb': incumbent,
                                 'start_gid': r['gid'], 'season': r['season'], 'week': r['week']})
                incumbent = None
                floor = pos + 1  # a new incumbent needs four fresh starts
                last_return_pos = None
                pos += 1
                continue
            episodes.append(episode_record(s, team, incumbent, pos, j, qb_games, qb_stats, inj, ros, last_return_pos))
            last_return_pos = j
            floor = j
            pos = j  # incumbent resumes at the return game
    return episodes


def detector_like(games, seq, qb_stats, inj, ros):
    """Emulation of the Codex prototype rules (scripts/lib/md03_qb_events.js at
    cycle5/codex-md03-data e32ee2be) over the same data: one team-season at a
    time, REG games only, starter established by two consecutive starts, onset
    injury support = exactly one starter row in the first missed week with status
    Out and a nonempty injury, an injured earlier replacement taints the episode,
    return = same QB starts again in the same season. No documented role/
    transaction evidence or official-starter conflicts are available here, so
    those disqualifiers cannot fire. Research emulation only."""
    qb_games = qb_game_index(games, qb_stats)
    out = []
    for team in sorted(seq):
        s = seq[team]
        for season in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1):
            idx = [k for k, r in enumerate(s) if r['season'] == season and r['type'] == 'REG']
            starter = last = None
            streak = 0
            active = None
            for k in idx:
                r = s[k]
                cur = r['qb']
                if not starter:
                    streak = streak + 1 if cur == last else 1
                    last = cur
                    if streak >= 2:
                        starter = cur
                    continue
                if cur == starter:
                    if active:
                        rec = episode_record(s, team, starter, active['start'], k, qb_games, qb_stats, inj, ros, None)
                        rec['detector_injury_supported'] = active['sup']
                        rec['detector_tainted'] = active['tainted']
                        rec['id'] = 'DL_' + rec['id']
                        out.append(rec)
                        active = None
                    continue
                if not active:
                    rows = inj.get((season, r['week'], team, starter), [])
                    sup = len(rows) == 1 and rows[0]['status'] == 'Out' and bool((rows[0]['injury'] or '').strip())
                    active = {'start': k, 'sup': sup, 'tainted': len(rows) > 1, 'repl': []}
                prior = active['repl'][-1] if active['repl'] else None
                if prior and prior != cur and any(a['status'] == 'Out' and (a['injury'] or '').strip()
                                                  for a in inj.get((season, r['week'], team, prior), [])):
                    active['tainted'] = True
                if cur not in active['repl']:
                    active['repl'].append(cur)
    return out


def placebos(seq, qb_stats):
    """Negative-control windows: the incumbent started every game, so there is no
    absence. The 'window' is m consecutive own-starter games and the 'return' is
    the next game with the same starter. MID: inside one season; OFF: the last m
    games of a season with the same starter opening the next season."""
    out = []
    for team in sorted(seq):
        s = seq[team]
        by_season = defaultdict(list)
        for k, r in enumerate(s):
            by_season[r['season']].append(k)
        for season in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1):
            idx = by_season.get(season, [])
            if len(idx) < 12:
                continue
            for m in (1, 3, 6):
                for start_off in (3, 9):  # two fixed in-season positions per team-season
                    a = idx[start_off]
                    win = s[a:a + m]
                    j = a + m
                    if j >= len(s) or s[j]['season'] != season:
                        continue
                    q = s[a - 1]['qb']
                    if any(x['qb'] != q for x in s[a - ESTABLISH_WINDOW:j + 1]):
                        continue
                    dmg = -sum(x['delta'] for x in win)
                    out.append({'id': f'P_MID_{team}_{season}_{start_off}_{m}', 'team': team, 'season': season,
                                'timing': 'MID', 'missed': m, 'raw_damage': round(dmg, 4),
                                'surviving_damage': round(dmg, 4), 'survival': 1.0,
                                'eval': eval_rows(s, j, season, q, qb_stats)})
                # offseason placebo
                nxt = by_season.get(season + 1, [])
                if not nxt:
                    continue
                last = idx[-1]
                a = last - m + 1
                win = s[a:last + 1]
                q = s[last]['qb']
                if any(x['qb'] != q for x in s[a - ESTABLISH_WINDOW:last + 1]) or s[nxt[0]]['qb'] != q:
                    continue
                rev = reversion_for(season + 1)
                dmg = -sum(x['delta'] for x in win)
                out.append({'id': f'P_OFF_{team}_{season}_{m}', 'team': team, 'season': season + 1,
                            'timing': 'OFF', 'missed': m, 'raw_damage': round(dmg, 4),
                            'surviving_damage': round(dmg * (1 - rev), 4), 'survival': 1 - rev,
                            'eval': eval_rows(s, nxt[0], season + 1, q, qb_stats)})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    ap.add_argument('--refresh-sources', action='store_true',
                    help='SOURCE REFRESH mode: accept current cache contents and rewrite the manifest')
    ap.add_argument('--download', action='store_true', help='with --refresh-sources: fetch missing files')
    a = ap.parse_args()
    cache = Path(a.cache)
    names = files_needed()
    manifest_path = OUT / 'input_manifest.json'
    if a.refresh_sources:
        cache.mkdir(parents=True, exist_ok=True)
        for n in names:
            if not (cache / n).exists():
                if not a.download:
                    sys.exit(f'missing {n}; rerun with --download')
                urllib.request.urlretrieve(url_for(n), cache / n)
        manifest = {n: {'sha256': sha256(cache / n), 'bytes': (cache / n).stat().st_size, 'url': url_for(n)} for n in names}
    else:
        if a.download:
            sys.exit('--download is only valid with --refresh-sources')
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if sorted(manifest) != sorted(names):
            sys.exit('manifest does not list exactly the required inputs')
        try:
            verify_inputs(cache, manifest)
        except ValueError as exc:
            sys.exit(str(exc))
    games = replay(load_games(cache))
    qb_stats = load_qb_stats(cache)
    inj, ros = load_availability(cache)
    seq = team_sequences(games)
    eps = detect(games, seq, qb_stats, inj, ros)
    dl = [e for e in detector_like(games, seq, qb_stats, inj, ros) if e['return_season'] <= LAST_SEASON]
    pl = placebos(seq, qb_stats)
    episodes = [e for e in eps if e['kind'] == 'episode' and e['start_season'] >= FIRST_EPISODE_SEASON
                and e['return_season'] <= LAST_SEASON]
    no_return = [e for e in eps if e['kind'] == 'no_return' and e['season'] >= FIRST_EPISODE_SEASON]
    takeovers = [e for e in eps if e['kind'] == 'role_takeover' and e['season'] >= FIRST_EPISODE_SEASON]
    # replay sanity: league Brier of the core replay by season
    by = defaultdict(list)
    for g in games:
        y = 0.5 if g['hs'] == g['as'] else float(g['hs'] > g['as'])
        by[g['season']].append((g['p_home'] - y) ** 2)
    check = {'games': len(games), 'games_by_season': {s: len(v) for s, v in sorted(by.items())}, 'brier_by_season': {s: round(sum(v) / len(v), 6) for s, v in sorted(by.items())},
             'kc_2025_weeks16_18_raw_elo_change': round(sum(x['delta'] for x in seq['KC'] if x['season'] == 2025 and 16 <= x['week'] <= 18 and x['type'] == 'REG'), 4),
             'brier_2009_2025': round(sum(sum(by[s]) for s in range(2009, 2026)) / sum(len(by[s]) for s in range(2009, 2026)), 6)}
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'engine': 'FORCE core result-only Elo replay (assets/app.js seasonEngine semantics)',
            'params': {'mean': MEAN, 'k': K, 'hfa': HFA, 'scale': SCALE,
                       'reversion': '0.30 for 2021+ seasons, 0.333 before'},
            'established_rule': (f'started >= {ESTABLISH_MIN} of last {ESTABLISH_WINDOW} team games since the last return or '
                                 f'takeover; incumbent resumes at return; a replacement who starts {ESTABLISH_MIN} '
                                 'consecutive window games after a healthy-not-starting week or a season-opener '
                                 'onset takes over the role'),
            'cause_classes': list(CAUSE_CLASSES),
            'medical_reserve_codes': sorted(MEDICAL_RESERVE), 'covid_reserve_codes': sorted(COVID_RESERVE),
            'eval_window': f'return game + following games, max {EVAL_GAMES}, truncated at end of return season',
            'eval_row_fields': ['game_id', 'team_is_home', 'opponent', 'team_pre_core_elo', 'opp_pre_core_elo',
                                'result', 'returning_qb_dropbacks_before_game', 'returning_qb_started',
                                'team_margin', 'season', 'week'],
            'episode_seasons': [FIRST_EPISODE_SEASON, LAST_SEASON]}

    def dump(name, obj):
        (OUT / name).write_text(json.dumps(obj, indent=1, sort_keys=True) + '\n', encoding='utf-8', newline='\n')

    if a.refresh_sources:
        dump('input_manifest.json', manifest)
    dump('episode_ledger.json', {'meta': meta, 'episodes': episodes,
                                 'no_return': [{k: v for k, v in e.items() if k != 'kind'} for e in no_return],
                                 'role_takeovers': [{k: v for k, v in e.items() if k != 'kind'} for e in takeovers]})
    dump('detector_like_ledger.json', {'meta': meta | {'rule': detector_like.__doc__.strip()}, 'episodes': dl})
    (OUT / 'placebo_ledger.json').write_text(json.dumps({'meta': meta, 'placebos': pl}, sort_keys=True, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    dump('replay_check.json', check)
    print(json.dumps({'episodes': len(episodes), 'no_return': len(no_return), 'role_takeovers': len(takeovers),
                      'detector_like': len(dl), 'placebos': len(pl),
                      'replay_brier_2009_2025': check['brier_2009_2025']}))


if __name__ == '__main__':
    main()
