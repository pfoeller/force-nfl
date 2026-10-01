import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server_v103',ROOT/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
def row(**kw):
    base={'season_type':'REG','game_id':'2026_01_DEN_KC','week':'1','home_team':'KC','away_team':'DEN','posteam':'KC','defteam':'DEN','drive':'1','down':'1','qb_kneel':'0','touchdown':'0','kickoff_attempt':'0','punt_attempt':'0','field_goal_attempt':'0','field_goal_result':'','extra_point_result':'','two_point_conv_result':'','td_team':'','pass_attempt':'0','sack':'0','qb_hit':'0','qb_spike':'0','rush_attempt':'0','passer_player_id':'','rusher_player_id':'','epa':'0'}
    base.update({k:str(v) for k,v in kw.items()}); return base
rows=[
    # Establish QB identity for the full game.
    row(down=1,pass_attempt=1,passer_player_id='QB1',epa=.2),
    # Designed QB run and scramble both belong to QB rushing bonus.
    row(down=2,rush_attempt=1,rusher_player_id='QB1',epa=2.4),
    row(down=3,rush_attempt=1,rusher_player_id='QB1',epa=.6),
    # Kneel must not count even though the rusher is the QB.
    row(down=1,rush_attempt=1,qb_kneel=1,rusher_player_id='QB1',epa=-1.5),
    # RB run must not count.
    row(down=2,rush_attempt=1,rusher_player_id='RB1',epa=1.0),
    # Give Denver a drive so game shell is normal.
    row(posteam='DEN',defteam='KC',drive=2,down=1,pass_attempt=1,passer_player_id='QB2',epa=0),
]
g=mod._defensive_points_per_drive_games(rows)[0]
assert g['home_qb_rush_attempts']==2,g
assert abs(g['home_qb_rush_epa']-3.0)<1e-12,g
assert g['away_qb_rush_attempts']==0,g
print('PASS: V103 PBP QB rushing captures designed runs/scrambles and excludes kneels/non-QBs')
