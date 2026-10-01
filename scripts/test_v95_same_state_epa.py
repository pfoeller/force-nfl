#!/usr/bin/env python3
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)

# Build a tiny deterministic EP surface with exact cells so we can prove both
# actual and counterfactual sides use the same estimator and fixed-team frame.
def cell(state, mean, count=20):
    return (*fs._ep_surface_cell_key(state), float(mean), int(count))

actual={'possession_home':True,'down':1,'ydstogo':10,'yardline_100':85,'half_seconds_remaining':1790,'game_seconds_remaining':3590,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False}
cf={'possession_home':True,'down':1,'ydstogo':10,'yardline_100':74,'half_seconds_remaining':1790,'game_seconds_remaining':3590,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False}
ca=cell(actual,0.65); cc=cell(cf,1.25)
surf={'version':'test','cells':[ca,cc],'by_down':{1:[ca,cc],2:[],3:[],4:[]}}
# Penalty is on BUF, so DET is beneficiary. BUF has the ball in both states;
# from DET's perspective actual EP=-0.65 vs counterfactual=-1.25 => +0.60.
row={'posteam':'DET','ep':'0','epa':'999'}
delta,a,c,source,*_=fs._same_state_causal_epa(row,'BUF','DET',actual,cf,surf)
assert abs(delta-0.60)<1e-9,(delta,a,c,source)
assert source=='nflfastR-derived-score-aware-same-state-surface',source
# Deliberately absurd stored EPA must not affect the state-to-state result.
row['epa']='-999'
delta2,*_=fs._same_state_causal_epa(row,'BUF','DET',actual,cf,surf)
assert abs(delta2-delta)<1e-12,(delta,delta2)

# Possession flip: actual BUF ball with +2 EP for BUF; counterfactual DET ball
# with +1 EP for DET (= -1 from BUF view). A DET penalty therefore benefits BUF
# by +3 EP. This verifies fixed-team orientation across a turnover flip.
actual2={'possession_home':True,'down':1,'ydstogo':5,'yardline_100':10,'half_seconds_remaining':700,'game_seconds_remaining':2500,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False}
cf2={'possession_home':False,'down':1,'ydstogo':10,'yardline_100':95,'half_seconds_remaining':700,'game_seconds_remaining':2500,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False}
a2=cell(actual2,2.0); c2=cell(cf2,1.0)
surf2={'version':'test','cells':[a2,c2],'by_down':{1:[a2,c2],2:[],3:[],4:[]}}
delta3,ae,ce,_,*_=fs._same_state_causal_epa({'posteam':'BUF','home_team':'BUF','away_team':'DET','posteam_score':'0','defteam_score':'0','score_differential':'0','ep':'0','epa':'0'},'BUF','BUF',actual2,cf2,surf2)
assert abs(ae-2.0)<1e-9 and abs(ce-(-1.0))<1e-9,(ae,ce)
assert abs(delta3-3.0)<1e-9,delta3
print('PASS: V95 same-state fixed-team causal EPA')

# End-to-end special-teams event: a BUF kickoff-return hold should benefit DET
# by the difference between BUF's enforced own-15 state and unpenalized own-26.
kick={
 'season':'2026','season_type':'REG','game_id':'2026_02_DET_BUF','week':'2','qtr':'1',
 'home_team':'BUF','away_team':'DET','posteam':'DET','defteam':'BUF','posteam_score':'0','defteam_score':'0','score_differential':'0',
 'game_seconds_remaining':'3595','half_seconds_remaining':'1795','down':'1','ydstogo':'10','yardline_100':'65',
 'posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0','ep':'0','epa':'777',
 'penalty':'1','penalty_team':'BUF','penalty_type':'Offensive Holding','penalty_yards':'10','play_type':'kickoff','kickoff_attempt':'1',
 'desc':"39-J.Bates kicks 66 yards from DET 35 to BUF -1. 19-G.Dortch to BUF 26 for 27 yards. PENALTY on BUF-28-S.Franklin, Offensive Holding, 10 yards, enforced at BUF 25."
}
knext={
 'season':'2026','season_type':'REG','game_id':'2026_02_DET_BUF','week':'2','qtr':'1','home_team':'BUF','away_team':'DET','posteam':'BUF','defteam':'DET',
 'posteam_score':'0','defteam_score':'0','score_differential':'0','game_seconds_remaining':'3590','half_seconds_remaining':'1790',
 'down':'1','ydstogo':'10','yardline_100':'85','posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0'
}
ast=fs._model_state_from_preplay_row(knext); cst,kind=fs._counterfactual_no_penalty_state(kick,knext)
ca=cell(ast,0.65); cc=cell(cst,1.25); ksurf={'version':'test','cells':[ca,cc],'by_down':{1:[ca,cc],2:[],3:[],4:[]}}
ev=fs._causal_penalty_event(kick,'BUF','DET',{}, {},None,knext,ep_surface=ksurf)
assert ev['special_teams'] and ev['counterfactual_epa_kind']=='special-teams-return',ev
assert ev['actual_ep_source']=='nflfastR-derived-score-aware-same-state-surface',ev
assert abs(ev['causal_epa']-0.60)<1e-9,ev['causal_epa']
kick2=dict(kick); kick2['epa']='-777'
ev2=fs._causal_penalty_event(kick2,'BUF','DET',{}, {},None,knext,ep_surface=ksurf)
assert abs(ev2['causal_epa']-ev['causal_epa'])<1e-12,(ev['causal_epa'],ev2['causal_epa'])
print('PASS: V95 special-teams EPA ignores whole-play EPA and uses same states')
