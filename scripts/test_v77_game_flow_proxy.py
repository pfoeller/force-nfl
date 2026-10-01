import json, importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fixture = '''game_id,season_type,week,qtr,home_team,away_team,total_home_score,total_away_score
2026_01_IND_BUF,REG,1,1,BUF,IND,7,3
2026_01_IND_BUF,REG,1,2,BUF,IND,28,6
2026_01_IND_BUF,REG,1,3,BUF,IND,28,13
2026_01_IND_BUF,REG,1,4,BUF,IND,36,16
'''
orig=m._fetch_text
try:
    m._fetch_text=lambda url,timeout=45: fixture
    m.CACHE.pop('/api/game-flow-2026',None)
    body,cached=m.game_flow_2026_payload(force=True)
finally:
    m._fetch_text=orig
obj=json.loads(body)
assert obj['game_count']==1
row=obj['games'][0]
assert row['home']=='BUF' and row['away']=='IND'
assert row['home_q']==[7,21,0,8], row
assert row['away_q']==[3,3,7,3], row
assert obj['profiles']['BUF']['for']==[7,21,0,8]
assert obj['profiles']['BUF']['against']==[3,3,7,3]
print('PASS: V77 game-flow proxy quarter aggregation')
