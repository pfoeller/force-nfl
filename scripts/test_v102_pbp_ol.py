import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server_v102',ROOT/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
def row(**kw):
    base={'season_type':'REG','game_id':'2026_02_BUF_DET','week':'2','home_team':'DET','away_team':'BUF','posteam':'DET','defteam':'BUF','drive':'1','down':'1','qb_kneel':'0','touchdown':'0','kickoff_attempt':'0','punt_attempt':'0','field_goal_attempt':'0','field_goal_result':'','extra_point_result':'','two_point_conv_result':'','td_team':'','pass_attempt':'0','sack':'0','qb_hit':'0','qb_spike':'0','epa':'0'}
    base.update({k:str(v) for k,v in kw.items()}); return base
rows=[
 row(down=1,pass_attempt=1,qb_hit=1,epa=1.0),
 # sack + qb_hit on same dropback must count ONCE for OL disruption
 row(down=2,pass_attempt=1,sack=1,qb_hit=1,epa=-5.0),
 row(down=3,pass_attempt=1,qb_hit=0,epa=2.0),
 row(posteam='BUF',defteam='DET',drive=2,down=1,pass_attempt=1,qb_hit=0,epa=0.0),
]
g=mod._defensive_points_per_drive_games(rows)[0]
assert g['home_pass_protection_dropbacks']==3,g
assert g['home_pass_protection_disruptions']==2,g
# Coverage still excludes the sack: only +1 and +2 actual throws.
assert g['home_coverage_pass_attempts']==2,g
assert abs(g['home_coverage_pass_epa']-3.0)<1e-12,g
print('PASS: V102 PBP OL disruptions de-duplicate sack+hit and preserve sack-free coverage')
