import math, pathlib, sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
import force_server as fs

H,A='KC','DEN'

def row(**kw):
    base={'home_team':H,'away_team':A,'posteam':'KC','desc':'','play_type':'pass','fumble_lost':'0','play_id':'100','pass_attempt':'0','rush_attempt':'0','sack':'0','punt_attempt':'0','kickoff_attempt':'0','field_goal_attempt':'0','extra_point_attempt':'0'}
    base.update(kw); return base

# V113 role-aware exchange: center/other offensive player -> known QB recovery is botched
# even when the feed omits an explicit 'bad snap' phrase.
e=fs._fumble_recovery_events(row(fumbled_1_team='KC',fumble_recovery_1_team='KC',fumbled_1_player_id='center',fumble_recovery_1_player_id='qb',passer_player_id='qb',pass_attempt='1'),H,A,{'qb'})
assert len(e)==1 and e[0]['kind']=='botched_snap' and abs(e[0]['weight']-.30)<1e-12
assert e[0]['play_id']=='100'

# Replay-reversed fumble never reaches the luck ledger.
e=fs._fumble_recovery_events(row(posteam='DEN',desc='Nix FUMBLES recovered by KC. Replay Official reviewed the fumble ruling and the play was REVERSED.',fumbled_1_team='DEN',fumble_recovery_1_team='KC'),H,A,{'qb'})
assert e==[]

# Synthetic league-wide calibration: enough games, no team identity, sensible monotonic fit.
g=[]
for i in range(260):
    x=(i-130)/65
    # Stronger performance features systematically correspond to more wins.
    win=1 if x + (0.25 if i%7 else -0.15) > 0 else 0
    g.append({
        'home_score':24 if win else 17,'away_score':17 if win else 24,
        'epa_diff_home':0.12*x,'success_diff_home':0.035*x,'ypp_diff_home':0.65*x,
        'yards_diff_home':55*x,'ppd_diff_home':0.45*x,'interception_diff_home':0.35*x,
    })
cal=fs._fit_performance_luck_calibration(g)
assert cal['valid'] and cal['sample_count']==260
assert cal['version']=='V121-EPA-MARGIN-LUCK-2025-1'
assert cal['epa_margin']['residual_sd']>0 and math.isfinite(cal['epa_margin']['slope'])
assert set(cal['features'])=={'epa_diff','success_diff','ypp_diff','yards_diff','ppd_diff','interception_diff'}
# All performance-direction coefficients should be non-negative in this construction.
assert sum(cal['coefficients'].values()) > 0
print('PASS: V113 role-aware fumbles + V121 historical Luck calibration')
