import json, importlib.util, tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

header='game_id,season_type,week,qtr,home_team,away_team,total_home_score,total_away_score,penalty,penalty_team,penalty_yards,penalty_type,posteam,defteam,first_down_penalty,play_type,desc,interception,fumble_lost,touchdown,incomplete_pass,sack,down,ydstogo,yardline_100,yards_gained,air_yards,return_yards,ep,epa,wpa\n'
def season_fixture(season, week, penalty_team):
    gid=f'{season}_{week:02d}_DET_BUF'
    rows=[]
    for q,(hs,aws) in enumerate([(7,0),(14,7),(21,14),(28,21)],1):
        rows.append(f'{gid},REG,{week},{q},BUF,DET,{hs},{aws},0,,0,,BUF,DET,0,run,ordinary state,0,0,0,0,0,1,10,50,0,0,0,1.2,0,0')
    # A penalty with explicit causal value.
    if penalty_team=='DET':
        rows.append(f'{gid},REG,{week},2,BUF,DET,14,7,1,DET,5,Defensive Holding,BUF,DET,1,no_play,J.Allen pass INTERCEPTED at DET 5. PENALTY on DET Defensive Holding No Play,1,0,0,0,0,3,6,9,,4,0,4.0,0.5,0.02')
    else:
        rows.append(f'{gid},REG,{week},4,BUF,DET,28,21,1,BUF,5,Defensive Holding,DET,BUF,1,no_play,J.Goff pass incomplete. PENALTY on BUF Defensive Holding automatic first down,0,0,0,1,0,4,8,45,,8,0,0.2,2.0,0.07')
    return header+'\n'.join(rows)+'\n'

prior_text=season_fixture(2025,18,'DET')
current_text=season_fixture(2026,2,'BUF')
orig_fetch=m._fetch_text
orig_dir=m.LIVE_CACHE_DIR
with tempfile.TemporaryDirectory() as td:
    m.LIVE_CACHE_DIR=Path(td); m.CACHE.clear()
    def fake_fetch(url,timeout=45):
        if '2025' in str(url): return prior_text
        if '2026' in str(url): return current_text
        raise AssertionError(url)
    m._fetch_text=fake_fetch
    try:
        body,_=m.game_flow_2026_payload(force=True)
    finally:
        m._fetch_text=orig_fetch; m.LIVE_CACHE_DIR=orig_dir
obj=json.loads(body)
assert obj['penalty_method']==m.PENALTY_MODEL_VERSION
assert obj['penalty_calibration']['source_season']==2025
assert obj['penalty_calibration']['prior_equivalent_games']==3.0
assert obj['penalty_calibration']['epa_weight']==0.40
assert obj['penalty_calibration']['wpa_weight']==0.25
assert obj['penalty_calibration']['first_down_weight']==0.20
assert obj['penalty_calibration']['erased_td_weight']==0.15
assert 'BUF' in obj['penalty_prior_2025'] and obj['penalty_prior_2025']['BUF']['games']>=1
assert obj['penalty_prior_2025']['BUF']['net_penalty_epa']>0, obj['penalty_prior_2025']['BUF']
assert obj['penalty_profiles']['BUF']['net_penalty_epa']<0, obj['penalty_profiles']['BUF']
assert obj['penalty_prior_2025']['BUF']['penaltyImpactScore']>50
assert obj['penalty_profiles']['BUF']['penaltyImpactScore']<50
print('PASS: V88 2025 and 2026 penalty data use the same causal + approved-blend pipeline')
