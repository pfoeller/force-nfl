#!/usr/bin/env python3
"""MD-03 stage 1: historical QB absence/return cohort and FORCE-core Elo replay.

Research only. Nothing here is production code or a production source decision.

Inputs (free nflverse files, downloaded once into a local cache directory that is
NOT committed; SHA-256 of every file is pinned in data/input_manifest.json):
  games.csv                       nflverse/nfldata  (scores, per-game starting QB ids)
  stats_player_week_<yr>.csv      nflverse-data release stats_player (QB plays / EPA)
  injuries_<yr>.csv               nflverse-data release injuries (2009+)
  roster_weekly_<yr>.csv          nflverse-data release weekly_rosters (reserve status)

Outputs (committed, deterministic):
  data/input_manifest.json        file hashes and row counts
  data/episode_ledger.json        every detected absence/return episode with features
                                  and its post-return evaluation games
  data/placebo_ledger.json        no-absence placebo windows (negative control)
  data/replay_check.json          replay sanity statistics

Usage:
  python -B research/md03/build_cohort.py --cache <dir> [--download]

The rating engine mirrors the live FORCE *core* season engine in assets/app.js
(seasonEngine): result-only Elo, K=20, HFA=15, scale=340, the production
margin multiplier, week-batched updates, 30% offseason reversion for 2021+
seasons and 33.3% before. It does NOT reproduce the V34 early-regime overlay,
the V98 look-behind, the unit-to-FORCE bridge or the original Celo QB layer,
none of which can be replayed historically from free data.
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
    'games.csv': 'https://github.com/nflverse/nfldata/raw/master/data/games.csv',
    'stats': 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv',
    'injuries': 'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{y}.csv',
    'roster': 'https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_{y}.csv',
}
NON_INJURY = ('not injury related', 'personal', 'rest', 'coach', 'suspension')


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
            out[(r['game_id'], r['player_id'])] = {
                'team': fr(r['team']), 'dropbacks': att + sk, 'plays': plays,
                'epa': num(r['passing_epa']) + num(r['rushing_epa'])}
    return out


def load_availability(cache):
    inj, ros = {}, {}
    for y in range(FIRST_EPISODE_SEASON, LAST_SEASON + 1):
        for r in read_csv(cache / f'injuries_{y}.csv'):
            if r['position'] != 'QB':
                continue
            inj[(int(r['season']), int(r['week']), fr(r['team']), r['gsis_id'])] = {
                'status': r['report_status'], 'injury': r['report_primary_injury'] or r['practice_primary_injury'],
                'practice': r['practice_status']}
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

def qb_prior_epa(qb_games, qb, before_index):
    rows = [r for (i, r) in qb_games.get(qb, []) if i < before_index][-PRIOR_QB_GAMES:]
    plays = sum(r['plays'] for r in rows)
    if plays < MIN_PRIOR_PLAYS:
        return None, plays
    return sum(r['epa'] for r in rows) / plays, plays


def classify(seq_rows, team, qb, inj, ros):
    """Availability evidence for the absent starter across the window weeks."""
    ev = []
    out_like = res_like = listed = non_injury = covid = suspended = False
    for r in seq_rows:
        k = (r['season'], r['week'], team, qb)
        a, b = inj.get(k), ros.get(k)
        if a:
            listed = True
            reason = (a['injury'] or '').lower()
            if any(x in reason for x in NON_INJURY):
                non_injury = True
            if a['status'] in ('Out', 'Doubtful'):
                out_like = True
            ev.append(f"w{r['week']}:{a['status'] or 'practice'}:{a['injury'] or '-'}")
        if b and b['status'] not in ('ACT', ''):
            ev.append(f"w{r['week']}:roster:{b['status']}:{b['abbr'] or '-'}")
            if b['status'] == 'RES':
                if b['abbr'] == 'R59':
                    covid = True
                else:
                    res_like = True
            if b['status'] == 'SUS':
                suspended = True
    if suspended or (non_injury and not res_like):
        cls = 'AMBIGUOUS'
    elif (out_like or res_like) and not covid:
        cls = 'VERIFIED'
    elif listed or covid:
        cls = 'PROBABLE'
    else:
        cls = 'AMBIGUOUS'
    flags = {'out_or_doubtful': out_like, 'reserve_list': res_like, 'listed': listed,
             'non_injury_reason': non_injury, 'covid_list': covid, 'suspended': suspended}
    return cls, flags, ev


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


def detect(games, seq, qb_stats, inj, ros):
    # QB game history (any team) for the causal pre-absence lookback
    qb_games = defaultdict(list)
    for i, g in enumerate(games):
        for q in (g['hqb'], g['aqb']):
            st = qb_stats.get((g['gid'], q))
            if st:
                qb_games[q].append((i, st))
    episodes = []
    for team in sorted(seq):
        s = seq[team]
        incumbent = None
        last_return_pos = None
        pos = 0
        while pos < len(s):
            r = s[pos]
            # establish / refresh the incumbent from the last 5 starts
            # only starts since the incumbent's last return count, so replacement
            # starts inside a finished window cannot displace the returned starter
            floor = last_return_pos if last_return_pos is not None else 0
            recent = [x['qb'] for x in s[max(0, pos - ESTABLISH_WINDOW, floor):pos]]
            for q in set(recent):
                if recent.count(q) >= ESTABLISH_MIN:
                    incumbent = q
            if incumbent is None or r['qb'] == incumbent:
                pos += 1
                continue
            # absence begins at pos; find the return of the incumbent
            j = pos
            # The window may cross one offseason only if the incumbent starts the
            # next season's opener; if another QB opens the new season the change
            # is treated as permanent (benching, trade or new starter), not a return.
            while j < len(s) and s[j]['qb'] != incumbent and s[j]['season'] == r['season']:
                j += 1
            if j >= len(s) or s[j]['qb'] != incumbent:
                # no return within the bound: permanent change, trade, release, benching kept
                episodes.append({'kind': 'no_return', 'team': team, 'qb': incumbent,
                                 'start_gid': r['gid'], 'season': r['season'], 'week': r['week']})
                incumbent = None
                last_return_pos = pos + 1  # a new incumbent needs four fresh starts
                pos += 1
                continue
            window = s[pos:j]
            ret = s[j]
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
                surviving = raw_damage
                survival = 1.0
            else:
                # prior-season part passes through the production offseason reversion
                rev = reversion_for(ret['season'])
                surviving = sum(v * ((1 - rev) if sea < ret['season'] else 1.0)
                                for sea, v in damage_by_season.items())
                survival = 1 - rev
            cls, flags, ev = classify(window, team, incumbent, inj, ros)
            start_i = r['i']
            prior_epa, prior_plays = qb_prior_epa(qb_games, incumbent, start_i)
            rp = re_ = 0.0
            for x in window:
                st = qb_stats.get((x['gid'], x['qb']))
                if st:
                    rp += st['plays']; re_ += st['epa']
            repl_epa = re_ / rp if rp >= 1 else None
            gap = (prior_epa - repl_epa) if (prior_epa is not None and repl_epa is not None) else None
            ev_rows = eval_rows(s, j, ret['season'], incumbent, qb_stats)
            episodes.append({
                'kind': 'episode',
                'id': f"{team}_{r['season']}w{r['week']:02d}_{incumbent}",
                'team': team, 'qb': incumbent, 'qb_name': ret['qbn'],
                'start_season': r['season'], 'start_week': r['week'], 'start_type': r['type'],
                'return_season': ret['season'], 'return_week': ret['week'], 'return_gid': ret['gid'],
                'missed': len(window), 'timing': timing,
                'replacements': sorted({x['qbn'] for x in window}),
                'availability_class': cls, 'availability_flags': flags, 'availability_evidence': ev[:12],
                'pre_window_elo': round(window[0]['pre'], 4),
                'raw_damage': round(raw_damage, 4), 'surviving_damage': round(surviving, 4),
                'survival': survival,
                'window_results': [x['y'] for x in window],
                'window_mean_p': round(sum(x['p'] for x in window) / len(window), 4),
                'starter_prior_epa_play': None if prior_epa is None else round(prior_epa, 4),
                'starter_prior_plays': prior_plays,
                'replacement_epa_play': None if repl_epa is None else round(repl_epa, 4),
                'replacement_plays': rp,
                'quality_gap': None if gap is None else round(gap, 4),
                'games_since_previous_return': (pos - last_return_pos) if last_return_pos is not None else None,
                'eval': ev_rows,
            })
            last_return_pos = j
            pos = j  # incumbent resumes at the return game
    return episodes


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
    ap.add_argument('--download', action='store_true')
    a = ap.parse_args()
    cache = Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)
    names = files_needed()
    for n in names:
        if not (cache / n).exists():
            if not a.download:
                sys.exit(f'missing {n}; rerun with --download')
            urllib.request.urlretrieve(url_for(n), cache / n)
    manifest = {n: {'sha256': sha256(cache / n), 'bytes': (cache / n).stat().st_size, 'url': url_for(n)} for n in names}
    games = replay(load_games(cache))
    qb_stats = load_qb_stats(cache)
    inj, ros = load_availability(cache)
    seq = team_sequences(games)
    eps = detect(games, seq, qb_stats, inj, ros)
    pl = placebos(seq, qb_stats)
    episodes = [e for e in eps if e['kind'] == 'episode' and e['start_season'] >= FIRST_EPISODE_SEASON
                and e['return_season'] <= LAST_SEASON]
    no_return = [e for e in eps if e['kind'] == 'no_return' and e['season'] >= FIRST_EPISODE_SEASON]
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
            'established_rule': f'started >= {ESTABLISH_MIN} of last {ESTABLISH_WINDOW} team games; incumbent resumes at return',
            'eval_window': f'return game + following games, max {EVAL_GAMES}, truncated at end of return season',
            'eval_row_fields': ['game_id', 'team_is_home', 'opponent', 'team_pre_core_elo', 'opp_pre_core_elo',
                                'result', 'returning_qb_dropbacks_before_game', 'returning_qb_started',
                                'team_margin', 'season', 'week'],
            'episode_seasons': [FIRST_EPISODE_SEASON, LAST_SEASON]}

    def dump(name, obj):
        (OUT / name).write_text(json.dumps(obj, indent=1, sort_keys=True) + '\n', encoding='utf-8', newline='\n')

    dump('input_manifest.json', manifest)
    dump('episode_ledger.json', {'meta': meta, 'episodes': episodes,
                                 'no_return': [{k: v for k, v in e.items() if k != 'kind'} for e in no_return]})
    (OUT / 'placebo_ledger.json').write_text(json.dumps({'meta': meta, 'placebos': pl}, sort_keys=True, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    dump('replay_check.json', check)
    print(json.dumps({'episodes': len(episodes), 'no_return': len(no_return), 'placebos': len(pl),
                      'replay_brier_2009_2025': check['brier_2009_2025']}))


if __name__ == '__main__':
    main()
