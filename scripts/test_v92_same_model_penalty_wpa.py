#!/usr/bin/env python3
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)

def base():
    return {'season_type':'REG','game_id':'2026_01_BUF_HOU','week':'1','home_team':'HOU','away_team':'BUF',
            'home_timeouts_remaining':'3','away_timeouts_remaining':'3','receive_2h_ko':'0','ep':'0','epa':'0','wpa':'0'}
# Houston false start: actual enforced state 1&15 at BUF39, no-penalty 1&10 at BUF34.
r={**base(),'posteam':'HOU','defteam':'BUF','penalty':'1','penalty_team':'HOU','penalty_type':'False Start',
   'play_type':'no_play','desc':'(:39) PENALTY on HOU-77-T.Brown, False Start, 5 yards, enforced at BUF 34 - No Play.',
   'qtr':'4','game_seconds_remaining':'39','half_seconds_remaining':'39','posteam_score':'31','defteam_score':'36',
   'down':'1','ydstogo':'10','yardline_100':'34','home_wp_post':'0.289'}
n={**base(),'posteam':'HOU','defteam':'BUF','qtr':'4','game_seconds_remaining':'39','half_seconds_remaining':'39',
   'posteam_score':'31','defteam_score':'36','down':'1','ydstogo':'15','yardline_100':'39'}
e=fs._causal_penalty_event(r,'HOU','BUF',{}, {},None,n)
assert e['actual_wp_source']=='nflfastR-next-state',e
assert 0.028 < e['causal_wpa'] < 0.032,e['causal_wpa']
assert abs(e['actual_home_wp_post']-0.29795283)<1e-5,e['actual_home_wp_post']
assert abs(e['counterfactual_home_wp']-0.32782942)<1e-5,e['counterfactual_home_wp']
# Buffalo defensive hold at 0:44: actual HOU 1&10 BUF34 vs no-penalty HOU 1&10 BUF39.
r2={**base(),'posteam':'HOU','defteam':'BUF','penalty':'1','penalty_team':'BUF','penalty_type':'Defensive Holding',
    'play_type':'run','desc':'(:44) W.Marks up the middle to BUF 39 for 6 yards. PENALTY on BUF-96-D.Walker Defensive Holding 5 yards enforced at BUF 39.',
    'qtr':'4','game_seconds_remaining':'44','half_seconds_remaining':'44','posteam_score':'31','defteam_score':'36',
    'down':'3','ydstogo':'2','yardline_100':'45','yards_gained':'6','first_down_penalty':'1','home_wp_post':'0.318'}
n2={**base(),'posteam':'HOU','defteam':'BUF','qtr':'4','game_seconds_remaining':'39','half_seconds_remaining':'39',
    'posteam_score':'31','defteam_score':'36','down':'1','ydstogo':'10','yardline_100':'34'}
e2=fs._causal_penalty_event(r2,'HOU','BUF',{}, {},None,n2)
assert e2['actual_wp_source']=='nflfastR-next-state',e2
# event beneficiary is Houston; Buffalo gets the exact negative of this value in aggregation
assert 0.014 < e2['causal_wpa'] < 0.017,e2['causal_wpa']
# Source/model mismatch must not affect the result.
r2b=dict(r2); r2b['home_wp_post']='0.05'
e2b=fs._causal_penalty_event(r2b,'HOU','BUF',{}, {},None,n2)
assert abs(e2b['causal_wpa']-e2['causal_wpa'])<1e-12,(e2b['causal_wpa'],e2['causal_wpa'])
print('PASS: V92 same-model actual/counterfactual penalty WPA')
