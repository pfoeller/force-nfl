import csv, io, importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fixture="""game_id,season_type,week,qtr,game_seconds_remaining,home_team,away_team,total_home_score,total_away_score,penalty,penalty_team,penalty_yards,penalty_type,posteam,defteam,first_down_penalty,play_type,desc,interception,fumble_lost,touchdown,incomplete_pass,sack,down,ydstogo,yardline_100,yards_gained,air_yards,return_yards,ep,epa,wpa,home_wp,home_wp_post
2026_02_DET_BUF,REG,2,2,2578,BUF,DET,14,0,1,DET,5,Defensive Holding,BUF,DET,1,no_play,J.Allen pass INTERCEPTED at DET 5. PENALTY on DET Defensive Holding 5 yards No Play,1,0,0,0,0,3,6,9,0,4,0,4.00,0.50,0.020,0.82,0.88
2026_02_DET_BUF,REG,2,4,744,BUF,DET,34,17,1,BUF,5,Defensive Holding,DET,BUF,1,no_play,J.Goff pass incomplete. PENALTY on BUF Defensive Holding 5 yards automatic first down,0,0,0,1,0,4,8,17,0,8,0,0.20,2.00,0.070,0.965,0.950
"""
rows=list(csv.DictReader(io.StringIO(fixture)))
lookup,bydown=m._build_ep_lookup(rows)
# Exact state buckets for the two no-penalty possession-flip outcomes.
# Erased INT -> DET ball at own 5, BUF home +14, mid-Q2: BUF WP ~.76.
# Failed 4th down -> BUF ball at own 17, BUF home +17, Q4: BUF WP ~.99.
wp_model={'groups':{
    '0:1':[[21,6,5,19,3,3,3,-1,0.760,40]],
    '1:1':[[6,6,6,17,3,3,3,-1,0.990,40]],
}}
int_event=m._causal_penalty_event(rows[0],'BUF','DET',lookup,bydown,wp_model,None)
assert int_event['beneficiary']=='BUF',int_event
assert abs(int_event['counterfactual_home_wp']-.760)<1e-9,int_event
assert abs(int_event['causal_wpa']-.120)<1e-9,int_event
assert int_event['causal_wpa']>0,int_event

drive_event=m._causal_penalty_event(rows[1],'BUF','DET',lookup,bydown,wp_model,None)
assert drive_event['beneficiary']=='DET',drive_event
assert abs(drive_event['counterfactual_home_wp']-.990)<1e-9,drive_event
assert abs(drive_event['causal_home_wpa']+.040)<1e-9,drive_event
assert abs(drive_event['causal_wpa']-.040)<1e-9,drive_event

# V90 must compare post-state WP directly; no EPA-leverage fields remain.
for event in (int_event,drive_event):
    assert 'counterfactual_home_wp' in event and 'actual_home_wp_post' in event,event
    assert 'counterfactual_home_wpa' not in event,event

# Aggregation stays zero-sum when the same state model is used.
games,profiles=m._penalty_context_from_rows(rows,include_postseason=False,wp_model=wp_model)
for g in games:
    vals=list(g['teams'].values())
    assert abs(sum(v['net_penalty_epa'] for v in vals))<1e-9,g
    assert abs(sum(v['net_penalty_wpa'] for v in vals))<1e-9,g
print('PASS: V90 direct game-state counterfactual WPA + possession-flip zero-sum regression')
