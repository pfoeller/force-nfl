#!/usr/bin/env python3
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
# Actual play scored a TD: pre-play is 0-0, post-play totals are 7-0.
row={'game_id':'x','home_team':'BUF','away_team':'DET','posteam':'BUF','defteam':'DET',
     'posteam_score':'0','defteam_score':'0','score_differential':'0','total_home_score':'7','total_away_score':'0',
     'game_seconds_remaining':'2500','half_seconds_remaining':'700','qtr':'2','down':'1','ydstogo':'10','yardline_100':'5',
     'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'1',
     'play_type':'no_play','touchdown':'1','desc':'J.Allen pass TOUCHDOWN NULLIFIED by penalty'}
h,a=m._pre_home_away_scores(row)
assert (h,a)==(0.0,0.0),(h,a)
st,kind=m._counterfactual_no_penalty_state(row,None)
assert kind=='erased-touchdown',kind
assert st['home_score_diff']==7.0,st  # would have been 7-0, not 14-0
print('PASS: V92 aligns pre-play score with reconstructed counterfactual scoreboard')
