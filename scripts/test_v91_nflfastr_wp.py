#!/usr/bin/env python3
from pathlib import Path
import importlib.util, math, sys
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
checks=0
def ok(cond,msg):
    global checks
    checks+=1
    if not cond: raise AssertionError(msg)
# Reference outputs generated directly by fastrmodels::wp_model exported through xgboost.
fixtures=[
    ([0,1,1800,3600,0,0,1,10,75,3,3],0.5462617874145508),
    ([0,1,39,39,-5/math.exp(-4*(3600-39)/3600),-5,1,10,34,3,3],0.32782942056655884),
    ([0,1,39,39,-5/math.exp(-4*(3600-39)/3600),-5,1,15,39,3,3],0.297952800989151),
]
for x,expected in fixtures:
    got=fs._xgb_binary_logistic_predict(x)
    ok(abs(got-expected)<1e-6,f'model parity: {got} != {expected}')
# Week-1 Houston false-start state from the Bills audit: same score/clock/possession,
# but no penalty is 1&10 at BUF34 instead of 1&15 at BUF39. nflfastR says roughly
# +3.0 percentage points for Buffalo from the penalty, not negative.
row={
 'game_id':'2026_01_BUF_HOU','season_type':'REG','week':'1','qtr':'4',
 'home_team':'HOU','away_team':'BUF','posteam':'HOU','defteam':'BUF',
 'posteam_score':'31','defteam_score':'36','score_differential':'-5',
 'game_seconds_remaining':'39','half_seconds_remaining':'39',
 'down':'1','ydstogo':'10','yardline_100':'34','posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3',
 'receive_2h_ko':'0','penalty':'1','penalty_team':'HOU','penalty_type':'False Start','penalty_yards':'5',
 'play_type':'no_play','desc':'(:39) PENALTY on HOU, False Start, 5 yards, enforced at BUF 34 - No Play.',
 'epa':'-0.46','wpa':'-0.03','home_wp':'0.32782942056655884','home_wp_post':'0.297952800989151',
 'first_down_penalty':'0','touchdown':'0','interception':'0','fumble_lost':'0','incomplete_pass':'0','sack':'0'
}
e=fs._causal_penalty_event(row,'HOU','BUF',{}, {}, None, None)
ok(e is not None,'event missing')
ok(e['beneficiary']=='BUF','wrong beneficiary')
ok(e['counterfactual_kind']=='pre-snap-unchanged','wrong counterfactual type')
ok(0.028 < e['causal_wpa'] < 0.032,f'expected ~+3pp BUF WPA, got {e["causal_wpa"]*100:.3f}')
ok(e['counterfactual_home_wp']>e['actual_home_wp_post'],'no-penalty Houston state must dominate penalized state')
print(f'PASS: V91 nflfastR WP model parity + BUF/HOU false-start benchmark ({checks} checks)')
