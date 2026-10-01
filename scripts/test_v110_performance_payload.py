import sys, pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
import force_server as fs
rows=[]
def add(posteam,defteam,epa,yards,success,scoreh,scorea,interception=0,drive=1,**extra):
    row={'game_id':'g1','season_type':'REG','week':'1','home_team':'KC','away_team':'DEN','posteam':posteam,'defteam':defteam,'down':'1','pass_attempt':'1','rush_attempt':'0','sack':'0','qb_kneel':'0','qb_spike':'0','two_point_attempt':'0','epa':str(epa),'yards_gained':str(yards),'success':str(success),'interception':str(interception),'total_home_score':str(scoreh),'total_away_score':str(scorea),'drive':str(drive)}
    row.update(extra); rows.append(row)
add('KC','DEN',.5,10,1,7,0,drive=1)
add('DEN','KC',-.2,2,0,7,0,interception=1,drive=2)
add('KC','DEN',.3,8,1,14,0,drive=3)
add('DEN','KC',-.1,3,0,14,0,drive=4,fumbled_1_team='DEN',fumble_recovery_1_team='KC')
dg=fs._defensive_points_per_drive_games(rows)
pg=fs._performance_luck_games(rows,dg)
assert len(pg)==1
r=pg[0]
assert r['home']=='KC' and r['away']=='DEN'
assert r['home_deserved_win_prob']>.9
assert r['fumble_opportunities']==1 and r['home_fumble_recoveries']==1
assert r['interception_diff_home']==1
assert 'EPA/play' in r['method']
print('PASS: V110 server performance/fumble payload')
