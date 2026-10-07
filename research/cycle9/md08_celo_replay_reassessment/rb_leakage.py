"""RB-eligibility leakage count for the Celo producer (MD-08 reassessment).

Research only. Reads the pinned nflverse play-by-play files used in the scratch regeneration
test (SHA-256 checked against provenance.json); writes results/rb_leakage.json. Counts only;
it does not define or apply any cleaned RB eligibility rule.

Producer semantics reproduced (Celo/build_entropy.py), in the producer's order:
  load_pbp (per season, lines ~115-139):
    pbp = pbp[season == s]
    pbp = pbp[play_type in ('pass', 'run')]
    pbp = pbp.dropna(subset=['down', 'ydstogo'])
  compute_position_groups (lines ~645-651, ~700, ~716-722):
    season_type = season_type.fillna('REG');  pbp_reg = pbp[season_type == 'REG']
    known_qbs  = set(pbp_reg.passer_player_name)             (pooled over every season)
    rushes     = pbp_reg[play_type == 'run' & rusher_player_name notna & epa notna
                         & rusher_player_name not in known_qbs]
    RB row     = (rusher_player_name, posteam) per season with rush_att = count >= 30
Rush counts and both passer populations are derived only after the initial load_pbp filter.

Definition. An affected group is a (season s, posteam, rusher name) with >= 30 producer-filtered
REG rushes in s (same filter, before the known_qbs exclusion) whose name is in known_qbs only
because of producer-filtered REG passes in seasons AFTER s (no REG pass in any season <= s).
An affected player-season is a distinct (s, name) with at least one affected group.

Usage: python rb_leakage.py <dir with play_by_play_2008..2025.parquet> [--write]
"""
import hashlib, json, pathlib, sys
import polars as pl

HERE = pathlib.Path(__file__).parent
prov = json.loads((HERE / 'provenance.json').read_text(encoding='utf-8'))
pins = {e['url'].rsplit('/', 1)[1]: e['sha256'] for e in prov['regeneration']['downloadedUpstream']}
src = pathlib.Path(sys.argv[1])
COLS = ['season', 'season_type', 'play_type', 'down', 'ydstogo', 'posteam', 'passer_player_name', 'rusher_player_name', 'epa']
raw_frames, celo_frames, steps = [], [], {'rows': 0, 'afterSeason': 0, 'afterPassRun': 0, 'afterDownYdstogo': 0, 'nullSeasonTypeFilledREG': 0}
for s in range(2008, 2026):
    name = f'play_by_play_{s}.parquet'
    data = (src / name).read_bytes()
    assert hashlib.sha256(data).hexdigest() == pins[name], 'pin mismatch ' + name
    raw = pl.read_parquet(data, columns=COLS)
    raw_frames.append(raw)
    steps['rows'] += raw.height
    # Celo load_pbp, in order.
    p = raw.filter(pl.col('season') == s); steps['afterSeason'] += p.height
    p = p.filter(pl.col('play_type').is_in(['pass', 'run'])); steps['afterPassRun'] += p.height
    p = p.filter(pl.col('down').is_not_null() & pl.col('ydstogo').is_not_null()); steps['afterDownYdstogo'] += p.height
    celo_frames.append(p)
celo = pl.concat(celo_frames, how='diagonal_relaxed')
# compute_position_groups: missing season_type is treated as REG.
steps['nullSeasonTypeFilledREG'] = celo.filter(pl.col('season_type').is_null()).height
celo = celo.with_columns(pl.col('season_type').fill_null('REG'))
celo_reg = celo.filter(pl.col('season_type') == 'REG')

def pass_seasons(df):
    g = df.filter(pl.col('passer_player_name').is_not_null()).group_by('passer_player_name').agg(pl.col('season').unique())
    return {r[0]: sorted(r[1]) for r in g.iter_rows()}

def count(reg_rows, passer_seasons):
    rush = reg_rows.filter((pl.col('play_type') == 'run') & pl.col('rusher_player_name').is_not_null() & pl.col('epa').is_not_null())
    groups = rush.group_by(['season', 'posteam', 'rusher_player_name']).len().filter(pl.col('len') >= 30)
    hit = []
    for s, team, name, n in groups.sort(['season', 'posteam', 'rusher_player_name']).iter_rows():
        ss = passer_seasons.get(name)
        if ss and min(ss) > s:
            hit.append({'season': s, 'team': team, 'player': name, 'rushes': n, 'firstPassSeason': min(ss)})
    return hit

summ = lambda hits: {'affectedGroups': len(hits), 'affectedPlayerSeasons': len({(h['season'], h['player']) for h in hits})}
reg_hits = count(celo_reg, pass_seasons(celo_reg))
all_hits = count(celo_reg, pass_seasons(celo))  # passer pool incl. postseason: NOT the producer's population

# Previous (791151c) reproducer, recomputed here for comparison only: same REG/population logic
# but without the initial load_pbp filter (no pass/run restriction, no down/ydstogo drop).
raw_all = pl.concat(raw_frames, how='diagonal_relaxed')
raw_reg = raw_all.filter(pl.col('season_type') == 'REG')
prev_hits = count(raw_reg, pass_seasons(raw_reg))
key = lambda h: (h['season'], h['team'], h['player'])
prev = {key(h): h['rushes'] for h in prev_hits}
changed = [{'season': h['season'], 'team': h['team'], 'player': h['player'], 'previousRushes': prev[key(h)], 'producerFilteredRushes': h['rushes']}
           for h in reg_hits if key(h) in prev and prev[key(h)] != h['rushes']]
pick = lambda hits, p, s, t: [h for h in hits if h['player'] == p and h['season'] == s and h['team'] == t]

out = {
    'definition': __doc__.split('Definition.')[1].split('Usage:')[0].strip().replace('\n', ' '),
    'producerFilter': "Celo load_pbp per season: season == s; play_type in ('pass','run'); dropna(down, ydstogo). Then season_type fillna('REG') and season_type == REG for both the passer pool (known_qbs) and rushes.",
    'filterSteps': steps,
    **summ(reg_hits),
    'multiTeamPlayerSeasons': sorted({f"{h['season']} {h['player']}" for h in reg_hits if sum(1 for x in reg_hits if (x['season'], x['player']) == (h['season'], h['player'])) > 1}),
    'tomlinson2008': pick(reg_hits, 'L.Tomlinson', 2008, 'LAC'),
    'washington2008': pick(reg_hits, 'L.Washington', 2008, 'NYJ'),
    'cook2020': pick(reg_hits, 'D.Cook', 2020, 'MIN'),
    'withPostseasonPasserPool': {**summ(all_hits),
        'note': 'Passer pool built from all producer-filtered plays (REG+POST). Not the producer\'s population; it reproduces the earlier a9bb0f4 figure of 127 player-seasons.'},
    'previousIncompleteReproducer': {**summ(prev_hits), 'sameAffectedGroupSet': sorted(map(key, prev_hits)) == sorted(map(key, reg_hits)),
        'groupsWithChangedRushCount': len(changed), 'changed': changed,
        'note': '791151c counted without the initial load_pbp filter; totals are unchanged, some carry counts differ.'},
    'groups': reg_hits}
if '--json' in sys.argv:
    print(json.dumps(out, indent=1)); sys.exit(0)
if '--write' in sys.argv:
    (HERE / 'results' / 'rb_leakage.json').write_text(json.dumps(out, indent=1) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: out[k] for k in ('filterSteps', 'affectedGroups', 'affectedPlayerSeasons', 'multiTeamPlayerSeasons', 'tomlinson2008', 'washington2008', 'cook2020', 'withPostseasonPasserPool')}
                 | {'previousIncompleteReproducer': {k: v for k, v in out['previousIncompleteReproducer'].items() if k != 'changed'}}, indent=1))
