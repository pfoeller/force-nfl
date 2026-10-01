import csv, io, importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fixture="""game_id,season_type,week,qtr,home_team,away_team,total_home_score,total_away_score,penalty,penalty_team,penalty_yards,penalty_type,posteam,defteam,first_down_penalty,play_type,desc,interception,fumble_lost,touchdown,incomplete_pass,sack,down,ydstogo,yardline_100,yards_gained,air_yards,return_yards,ep,epa,wpa,home_wp,home_wp_post,away_wp,away_wp_post
2026_01_BUF_HOU,REG,1,1,HOU,BUF,0,3,1,BUF,5,Offensive Too Many Men on Field,BUF,HOU,0,no_play,PENALTY on BUF Offensive Too Many Men on Field 5 yards - No Play,0,0,0,0,0,4,1,23,0,0,0,3.00,-0.55,-0.010,0.42,0.43,0.58,0.57
2026_01_BUF_HOU,REG,1,3,HOU,BUF,21,27,1,BUF,10,Offensive Holding,BUF,HOU,0,no_play,J.Allen pass to K.Shakir for 10 yards. PENALTY on BUF Offensive Holding 10 yards - No Play,0,0,0,0,0,2,9,64,0,0,0,1.20,-1.10,-0.020,0.28,0.30,0.72,0.70
2026_02_DET_BUF,REG,2,2,BUF,DET,14,0,1,DET,5,Defensive Holding,BUF,DET,1,no_play,J.Allen pass INTERCEPTED at DET 5. PENALTY on DET Defensive Holding 5 yards No Play,1,0,0,0,0,3,6,9,0,4,0,4.00,0.50,0.020,0.82,0.85,0.18,0.15
2026_02_DET_BUF,REG,2,4,BUF,DET,34,17,1,BUF,5,Defensive Holding,DET,BUF,1,no_play,J.Goff pass incomplete. PENALTY on BUF Defensive Holding 5 yards automatic first down,0,0,0,1,0,4,8,17,0,8,0,0.20,2.00,0.070,0.965,0.945,0.035,0.055
"""
rows=list(csv.DictReader(io.StringIO(fixture)))
lookup,bydown=m._build_ep_lookup(rows)
cf,kind=m._counterfactual_no_penalty_epa(rows[0],lookup,bydown)
assert kind=='pre-snap-unchanged' and abs(cf)<1e-12,(cf,kind)
cf2,kind2=m._counterfactual_no_penalty_epa(rows[1],lookup,bydown)
assert kind2 in ('underlying-first-down','underlying-play'),(cf2,kind2)
assert abs(cf2)>1e-9,(cf2,kind2)

# Erased interception: fixed home-team frame must make the DET foul a positive
# Buffalo event, regardless of the counterfactual possession flip.
int_event=m._causal_penalty_event(rows[2],'BUF','DET',lookup,bydown)
assert int_event['beneficiary']=='BUF',int_event
assert int_event['causal_wpa']>0,int_event
assert int_event['causal_home_wpa']>0,int_event
assert abs(int_event['actual_home_wpa']-0.03)<1e-9,int_event

# Fourth-down drive rescue: BUF is the offending home team, so the same fixed
# home frame must be negative for Buffalo / positive for Detroit.
drive_event=m._causal_penalty_event(rows[3],'BUF','DET',lookup,bydown)
assert drive_event['beneficiary']=='DET',drive_event
assert drive_event['causal_home_wpa']<0,drive_event
assert drive_event['causal_wpa']>0,drive_event

# Team aggregation must be exactly zero-sum for both EPA and fixed-team WPA.
games,profiles=m._penalty_context_from_rows(rows,include_postseason=False)
for g in games:
    vals=list(g['teams'].values())
    assert abs(sum(v['net_penalty_epa'] for v in vals))<1e-9,g
    assert abs(sum(v['net_penalty_wpa'] for v in vals))<1e-9,g
print('PASS: V89 fixed-team WPA, possession-flip orientation, no-play counterfactual, and zero-sum aggregation')
