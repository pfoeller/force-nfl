import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server_v100',ROOT/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

def row(**kw):
    base={
        'season_type':'REG','game_id':'2026_02_DEN_KC','week':'2','home_team':'KC','away_team':'DEN',
        'posteam':'DEN','defteam':'KC','drive':'1','down':'1','qb_kneel':'0','touchdown':'0',
        'kickoff_attempt':'0','punt_attempt':'0','field_goal_attempt':'0','field_goal_result':'',
        'extra_point_result':'','two_point_conv_result':'','td_team':''
    }
    base.update({k:str(v) for k,v in kw.items()})
    return base

rows=[]
# DEN offensive drive 1: TD + PAT = 7, one qualifying drive.
rows += [row(drive=1,down=1), row(drive=1,down=2,touchdown=1,td_team='DEN'), row(drive=1,down='',extra_point_result='good')]
# DEN drive 2: made FG = 3, one qualifying drive.
rows += [row(drive=2,down=1), row(drive=2,down=4,field_goal_attempt=1,field_goal_result='made')]
# DEN kneel-only possession must not count as a drive.
rows += [row(drive=3,down=1,qb_kneel=1)]
# DEN turnover returned by KC for a TD: must not count as points allowed by KC defense.
rows += [row(drive=4,down=2,touchdown=1,td_team='KC')]
# KC has one offensive drive with a TD; DEN defense should be charged 7.
rows += [row(posteam='KC',defteam='DEN',drive=5,down=1), row(posteam='KC',defteam='DEN',drive=5,down=2,touchdown=1,td_team='KC'), row(posteam='KC',defteam='DEN',drive=5,down='',extra_point_result='good')]
# Kick return TD by DEN is special teams and must not be charged to KC defense.
rows += [row(posteam='DEN',defteam='KC',drive='',down='',touchdown=1,td_team='DEN',kickoff_attempt=1)]

out=mod._defensive_points_per_drive_games(rows)
assert len(out)==1,out
g=out[0]
assert g['away']=='DEN' and g['home']=='KC',g
assert g['away_offensive_points']==10,g
assert g['away_offensive_drives']==3,g  # drives 1,2,4; turnover drive still a real offensive possession
assert g['home_offensive_points']==7,g
assert g['home_offensive_drives']==1,g
# KC defensive outcome = 10 offensive points / 3 DEN offensive possessions.
assert abs(g['away_offensive_points']/g['away_offensive_drives']-(10/3))<1e-12,g
print('PASS: V100 offensive-points-per-drive PBP derivation')
