"""Offline PBP semantics and fixtures consumed by the browser model regression."""
import importlib.util
import json
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

def row(**values):
    result={'season_type':'REG','game_id':'2026_01_KC_BUF','week':'1',
            'home_team':'BUF','away_team':'KC','posteam':'BUF','defteam':'KC',
            'drive':'1','down':'1','epa':'0','passer_player_id':'QB1'}
    result.update({key:str(value) for key,value in values.items()})
    return result

base=[row(pass_attempt=1,epa=.2,play_id=i) for i in range(20)]
base += [row(posteam='KC',defteam='BUF',drive=2,passer_player_id='QB2',pass_attempt=1,epa=.1,play_id=20+i) for i in range(20)]
extra={
    'rushingTD':row(rush_attempt=1,rusher_player_id='QB1',epa=5,touchdown=1,td_team='BUF'),
    'passingTD':row(pass_attempt=1,epa=5,pass_touchdown=1,touchdown=1,td_team='BUF'),
    'sack':row(pass_attempt=1,sack=1,epa=-2),
    'sackOnly':row(sack=1,epa=-2),
    'kneel':row(rush_attempt=1,qb_kneel=1,rusher_player_id='QB1',epa=-10),
    'spike':row(pass_attempt=1,qb_spike=1,epa=-10),
    'scramble':row(rush_attempt=1,qb_scramble=1,rusher_player_id='QB1',epa=2),
    'designedRun':row(rush_attempt=1,rusher_player_id='QB1',epa=2),
    'scrambleBothFlags':row(pass_attempt=1,rush_attempt=1,qb_scramble=1,rusher_player_id='QB1',epa=2),
    'rbRun':row(rush_attempt=1,rusher_player_id='RB1',epa=10),
    'cancelled':row(pass_attempt=1,no_play=1,epa=10),
    'missingEPA':row(pass_attempt=1,epa=''),
}
fixtures={'base':server._defensive_points_per_drive_games(base)}
fixtures.update({name:server._defensive_points_per_drive_games(base+[play]) for name,play in extra.items()})
checks=0
def check(value,label):
    global checks
    assert value,label
    checks+=1

for name,expected_plays,expected_epa,expected_rush in [
    ('base',20,4,0),('rushingTD',21,9,5),('passingTD',21,9,0),
    ('sack',21,2,0),('sackOnly',21,2,0),('kneel',20,4,0),('spike',20,4,0),
    ('scramble',21,6,2),('designedRun',21,6,2),('scrambleBothFlags',21,6,2),
    ('rbRun',20,4,0),('cancelled',20,4,0),('missingEPA',20,4,0)]:
    game=fixtures[name][0]
    check(game['home_qb_plays']==expected_plays,f'{name}: play count')
    check(abs(game['home_qb_total_epa']-expected_epa)<1e-10,f'{name}: EPA sum')
    check(abs(game['home_qb_rush_epa']-expected_rush)<1e-10,f'{name}: separate rushing')
check(fixtures['sack'][0]['home_coverage_pass_attempts']==20,'sacks still excluded from Coverage')
windows=server._v104_reference_from_drive_games(fixtures['rushingTD'],1)['1']
check(any(abs(v-9/21)<1e-8 for v in windows['qb_epa_per_play']),'historical benchmark uses all-play definition')
check(any(abs(v-.2)<1e-8 for v in windows['qb_pass_epa']),'historical passing benchmark preserved')
qb_ids=server._qb_player_ids([{'position':'QB','player_id':'QB3'},{'position':'RB','player_id':'RB1'}])
check(qb_ids=={'QB3'},'positional IDs exclude non-QBs')
run_only=server._defensive_points_per_drive_games(base+[row(rush_attempt=1,rusher_player_id='QB3',epa=2)],qb_player_ids=qb_ids)[0]
check(run_only['home_qb_plays']==21 and abs(run_only['home_qb_total_epa']-6)<1e-10,'rushing-only QB enters total EPA without a passing appearance')
check(run_only['home_qb_rush_attempts']==1,'rushing-only QB also enters additional rushing component')
if '--json' in sys.argv:
    print(json.dumps({'fixtures':fixtures,'checks':checks}))
else:
    print(f'PASS: V149 QB PBP semantics ({checks} checks)')
