#!/usr/bin/env python3
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)

# Week 1 BUF @ HOU punt-return penalty shape from the live audit.
row={
 'season':'2026','season_type':'REG','game_id':'2026_01_BUF_HOU','week':'1','qtr':'3',
 'home_team':'HOU','away_team':'BUF','posteam':'HOU','defteam':'BUF',
 'posteam_score':'17','defteam_score':'23','score_differential':'-6',
 'game_seconds_remaining':'1600','half_seconds_remaining':'1600','down':'4','ydstogo':'10','yardline_100':'52',
 'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0',
 'penalty':'1','penalty_team':'BUF','penalty_type':'Illegal Blindside Block','penalty_yards':'14',
 'play_type':'punt','punt_attempt':'1','desc':'(13:19) 38-K.Kroeger punts 48 yards to BUF 28, Center-40-A.Brinkman. 19-G.Dortch pushed ob at BUF 36 for 8 yards (8-C.Stover; 30-W.Woodaz). PENALTY on BUF-28-S.Franklin, Illegal Blindside Block, 14 yards, enforced at BUF 28.'
}
next_row={
 'season':'2026','season_type':'REG','game_id':'2026_01_BUF_HOU','week':'1','qtr':'3',
 'home_team':'HOU','away_team':'BUF','posteam':'BUF','defteam':'HOU',
 'posteam_score':'23','defteam_score':'17','score_differential':'6',
 'game_seconds_remaining':'1593','half_seconds_remaining':'1593','down':'1','ydstogo':'10','yardline_100':'86',
 'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0'
}
st,kind=fs._counterfactual_no_penalty_state(row,next_row)
assert kind=='special-teams-return',(kind,st)
assert st['possession_home'] is False,st
assert st['down']==1 and abs(st['ydstogo']-10)<1e-9,st
assert abs(st['yardline_100']-64)<1e-9,st # BUF 36 => 64 yards from HOU goal
assert kind!='underlying-turnover-on-downs'

# Week 2 DET @ BUF opening kickoff hold: no-penalty state is BUF ball at BUF 26,
# not a fictional DET scrimmage state.
row2={
 'season':'2026','season_type':'REG','game_id':'2026_02_DET_BUF','week':'2','qtr':'1',
 'home_team':'BUF','away_team':'DET','posteam':'DET','defteam':'BUF',
 'posteam_score':'0','defteam_score':'0','score_differential':'0',
 'game_seconds_remaining':'3595','half_seconds_remaining':'1795','down':'1','ydstogo':'10','yardline_100':'65',
 'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0',
 'penalty':'1','penalty_team':'BUF','penalty_type':'Offensive Holding','penalty_yards':'10',
 'play_type':'kickoff','kickoff_attempt':'1',
 'desc':'39-J.Bates kicks 66 yards from DET 35 to BUF -1. 19-G.Dortch to BUF 26 for 27 yards (66-E.O\'Neill). PENALTY on BUF-28-S.Franklin, Offensive Holding, 10 yards, enforced at BUF 25.'
}
next2={
 'season':'2026','season_type':'REG','game_id':'2026_02_DET_BUF','week':'2','qtr':'1',
 'home_team':'BUF','away_team':'DET','posteam':'BUF','defteam':'DET',
 'posteam_score':'0','defteam_score':'0','score_differential':'0',
 'game_seconds_remaining':'3590','half_seconds_remaining':'1790','down':'1','ydstogo':'10','yardline_100':'85',
 'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0'
}
st2,kind2=fs._counterfactual_no_penalty_state(row2,next2)
assert kind2=='special-teams-return',(kind2,st2)
assert st2['possession_home'] is True,st2
assert abs(st2['yardline_100']-74)<1e-9,st2 # BUF 26 => 74 yards from DET goal

# Ensure audit event exposes both states and identifies special teams.
e=fs._causal_penalty_event(row2,'BUF','DET',{}, {},None,next2)
assert e['special_teams'] is True,e
assert e['counterfactual_kind']=='special-teams-return',e
assert e['counterfactual_epa_kind']=='special-teams-return',e
assert e['actual_state']['home_receive_2h']==e['counterfactual_state']['home_receive_2h'],e
# Opening kickoff holding should be about a one-point WP penalty, not V93's ~8 points.
assert 0.007 < e['causal_wpa'] < 0.013,e['causal_wpa']
assert e['actual_state']['possession_home'] is True,e
assert e['counterfactual_state']['possession_home'] is True,e
print('PASS: V94 dedicated kickoff/punt counterfactual reconstruction')
