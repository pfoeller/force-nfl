"""RB-eligibility leakage count for the Celo producer (MD-08 reassessment, correction 1).

Research only. Reads the pinned nflverse play-by-play files used in the scratch regeneration
test (SHA-256 checked against provenance.json); writes results/rb_leakage.json. Counts only;
it does not define or apply any cleaned RB eligibility rule.

Producer semantics reproduced (Celo/build_entropy.py compute_position_groups):
  pbp_reg    = plays with season_type == 'REG' over ALL loaded seasons 2008-2025
  known_qbs  = set(pbp_reg.passer_player_name)            (pooled over every season)
  rushes     = pbp_reg[play_type == 'run' & rusher_player_name notna & epa notna
                       & rusher_player_name not in known_qbs]
  RB row     = (rusher_player_name, posteam) per season with rush_att = count >= 30

Definition. An affected group is a (season s, posteam, rusher name) with >= 30 qualifying
REG rushes in s (same filter, before the known_qbs exclusion) whose name is in known_qbs
only because of REG passes in seasons AFTER s (no REG pass in any season <= s). An affected
player-season is a distinct (s, name) with at least one affected group.

Usage: python rb_leakage.py <dir with play_by_play_2008..2025.parquet> [--write]
"""
import hashlib, json, pathlib, sys
import polars as pl

HERE = pathlib.Path(__file__).parent
prov = json.loads((HERE / 'provenance.json').read_text(encoding='utf-8'))
pins = {e['url'].rsplit('/', 1)[1]: e['sha256'] for e in prov['regeneration']['downloadedUpstream']}
src = pathlib.Path(sys.argv[1])
frames = []
for s in range(2008, 2026):
    name = f'play_by_play_{s}.parquet'
    data = (src / name).read_bytes()
    assert hashlib.sha256(data).hexdigest() == pins[name], 'pin mismatch ' + name
    frames.append(pl.read_parquet(data, columns=['season', 'season_type', 'play_type', 'posteam', 'passer_player_name', 'rusher_player_name', 'epa']))
pbp = pl.concat(frames, how='diagonal_relaxed')
reg = pbp.filter(pl.col('season_type') == 'REG')

def pass_seasons(df):
    g = df.filter(pl.col('passer_player_name').is_not_null()).group_by('passer_player_name').agg(pl.col('season').unique())
    return {r[0]: sorted(r[1]) for r in g.iter_rows()}

def count(passer_seasons):
    rush = reg.filter((pl.col('play_type') == 'run') & pl.col('rusher_player_name').is_not_null() & pl.col('epa').is_not_null())
    groups = rush.group_by(['season', 'posteam', 'rusher_player_name']).len().filter(pl.col('len') >= 30)
    hit = []
    for s, team, name, n in groups.sort(['season', 'posteam', 'rusher_player_name']).iter_rows():
        ss = passer_seasons.get(name)
        if ss and min(ss) > s:
            hit.append({'season': s, 'team': team, 'player': name, 'rushes': n, 'firstPassSeason': min(ss)})
    return hit

reg_hits = count(pass_seasons(reg))
all_hits = count(pass_seasons(pbp))  # passer pool incl. postseason: NOT the producer's population
toml = [h for h in reg_hits if h['player'] == 'L.Tomlinson' and h['season'] == 2008]
out = {
    'definition': __doc__.split('Definition.')[1].split('Usage:')[0].strip().replace('\n', ' '),
    'producerFilter': 'season_type == REG for both passers (known_qbs) and rushes',
    'affectedGroups': len(reg_hits),
    'affectedPlayerSeasons': len({(h['season'], h['player']) for h in reg_hits}),
    'multiTeamPlayerSeasons': sorted({f"{h['season']} {h['player']}" for h in reg_hits if sum(1 for x in reg_hits if (x['season'], x['player']) == (h['season'], h['player'])) > 1}),
    'tomlinson2008': toml,
    'withPostseasonPasserPool': {'affectedGroups': len(all_hits), 'affectedPlayerSeasons': len({(h['season'], h['player']) for h in all_hits}),
        'note': 'Earlier a9bb0f4 figure (127): passer seasons taken from all plays (REG+POST), so a player whose first pass was a postseason pass in a season <= s was not counted. That population is not the producer\'s.'},
    'groups': reg_hits}
if '--write' in sys.argv:
    (HERE / 'results' / 'rb_leakage.json').write_text(json.dumps(out, indent=1) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: out[k] for k in ('affectedGroups', 'affectedPlayerSeasons', 'multiTeamPlayerSeasons', 'tomlinson2008', 'withPostseasonPasserPool')}, indent=1))
