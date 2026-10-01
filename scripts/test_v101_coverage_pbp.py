import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server_v101',ROOT/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

def row(**kw):
    base={
        'season_type':'REG','game_id':'2026_02_BUF_DET','week':'2','home_team':'DET','away_team':'BUF',
        'posteam':'DET','defteam':'BUF','drive':'1','down':'1','qb_kneel':'0','touchdown':'0',
        'kickoff_attempt':'0','punt_attempt':'0','field_goal_attempt':'0','field_goal_result':'',
        'extra_point_result':'','two_point_conv_result':'','td_team':'','pass_attempt':'0','sack':'0','qb_spike':'0','epa':'0'
    }
    base.update({k:str(v) for k,v in kw.items()})
    return base

rows=[
    # Two actual throws: coverage EPA = (+1 + +2) / 2 = +1.5 allowed.
    row(drive=1,down=1,pass_attempt=1,epa=1.0),
    row(drive=1,down=2,pass_attempt=1,epa=2.0),
    # Huge negative sack EPA belongs to Pass Rush and MUST NOT help Coverage.
    row(drive=1,down=3,pass_attempt=1,sack=1,epa=-6.0),
    # Spike is an official-looking pass flag but not a coverage rep.
    row(drive=1,down=1,pass_attempt=1,qb_spike=1,epa=-1.0),
    # Two-point pass is outside downs 1-4 and must not enter coverage EPA.
    row(drive=1,down='',pass_attempt=1,epa=5.0),
    # Give BUF offense one real drive so both sides appear normally.
    row(posteam='BUF',defteam='DET',drive=2,down=1,pass_attempt=1,epa=-0.5),
]
out=mod._defensive_points_per_drive_games(rows)
assert len(out)==1,out
g=out[0]
assert g['home']=='DET' and g['away']=='BUF',g
assert g['home_coverage_pass_attempts']==2,g
assert abs(g['home_coverage_pass_epa']-3.0)<1e-12,g
assert abs(g['home_coverage_pass_epa']/g['home_coverage_pass_attempts']-1.5)<1e-12,g
assert g['away_coverage_pass_attempts']==1,g
assert abs(g['away_coverage_pass_epa']+0.5)<1e-12,g
print('PASS: V101 PBP coverage EPA excludes sacks/spikes/non-scrimmage attempts')
