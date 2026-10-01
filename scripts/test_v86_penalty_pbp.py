import csv, io, importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fixture='''game_id,season_type,week,qtr,home_team,away_team,total_home_score,total_away_score,penalty,penalty_team,penalty_yards,penalty_type,posteam,defteam,first_down_penalty,play_type,desc,interception,fumble_lost,touchdown,incomplete_pass,sack,down,ydstogo,yardline_100,yards_gained,air_yards,return_yards,ep,epa,wpa
2026_02_DET_BUF,REG,2,1,BUF,DET,7,0,0,,0,,DET,BUF,0,run,ordinary state row,0,0,0,0,0,1,10,95,0,0,0,-0.10,0.00,0.000
2026_02_DET_BUF,REG,2,2,BUF,DET,14,0,1,DET,5,Defensive Holding,BUF,DET,1,no_play,J.Allen pass INTERCEPTED at DET 5. PENALTY on DET Defensive Holding 5 yards No Play,1,0,0,0,0,3,6,9,,4,0,4.00,0.50,0.020
2026_02_DET_BUF,REG,2,2,BUF,DET,14,0,1,BUF,10,Offensive Holding,BUF,DET,0,no_play,J.Cook right tackle for 19 yards. PENALTY on BUF Offensive Holding 10 yards No Play,0,0,0,0,0,1,10,60,19,0,0,1.00,-0.70,-0.015
2026_02_DET_BUF,REG,2,3,BUF,DET,21,7,1,BUF,5,Defensive Holding,DET,BUF,1,no_play,J.Goff pass incomplete. PENALTY on BUF Defensive Holding 5 yards automatic first down,0,0,0,1,0,4,8,45,,8,0,0.20,2.00,0.070
2026_02_DET_BUF,REG,2,4,BUF,DET,28,14,0,,0,,BUF,DET,0,run,ordinary close row,0,0,0,0,0,1,10,50,0,0,0,1.50,0.00,0.000
'''
rows=list(csv.DictReader(io.StringIO(fixture)))
games,profiles=m._penalty_context_from_rows(rows,include_postseason=False)
buf=profiles['BUF']; det=profiles['DET']
# The erased interception must produce a large positive BUF counterfactual swing,
# not merely the +0.50 whole-play EPA from the enforced holding row.
int_event=[e for e in games[0]['events'] if e['turnover_erased']][0]
assert int_event['beneficiary']=='BUF',int_event
assert int_event['causal_epa']>3.5,int_event
assert int_event['causal_epa']>abs(int_event['observed_play_epa'])*5,int_event
# Buffalo's offensive hold helps DET; Buffalo's fourth-down defensive hold helps DET.
assert buf['events']==3 and det['events']==3,(buf,det)
assert buf['turnovers_negated_benefit']==1 and det['turnovers_negated_harm']==1,(buf,det)
assert det['drive_saves_benefit']==1 and buf['drive_saves_harm']==1,(buf,det)
# Zero-sum orientation is mandatory at both game and season aggregation levels.
assert abs(buf['net_penalty_epa']+det['net_penalty_epa'])<1e-9,(buf,det)
assert abs(buf['net_penalty_wpa']+det['net_penalty_wpa'])<1e-9,(buf,det)
print('PASS: V86 causal penalty PBP counterfactual + erased-turnover/drive-save audit')
