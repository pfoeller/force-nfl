#!/usr/bin/env python3
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)

def cell(state, mean, count=50):
    return (*fs._ep_surface_cell_key(state), float(mean), int(count))

# 1) Score-aware EPA: a CAR offensive penalty erases CAR's own TD. From CHI's
# perspective, actual enforcement leaves CAR threatening (-4 future EP), while
# no penalty is CAR +7 and CHI ball with +1 future EP => -6 total. The penalty
# therefore BENEFITS CHI by +2 EPA, not CAR by +5 as future-EP-only math did.
row={'home_team':'CAR','away_team':'CHI','posteam':'CAR','defteam':'CHI','posteam_score':'0','defteam_score':'0','score_differential':'0','ep':'4','epa':'999'}
actual={'possession_home':True,'down':1,'ydstogo':10,'yardline_100':10,'half_seconds_remaining':700,'game_seconds_remaining':2500,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False,'home_score_diff':0}
cf={'possession_home':False,'down':1,'ydstogo':10,'yardline_100':65,'half_seconds_remaining':700,'game_seconds_remaining':2500,'home_timeouts':3,'away_timeouts':3,'home_receive_2h':False,'home_score_diff':7}
a=cell(actual,4.0); c=cell(cf,1.0); surf={'version':'test','cells':[a,c],'by_down':{1:[a,c],2:[],3:[],4:[]}}
res=fs._same_state_causal_epa(row,'CAR','CHI',actual,cf,surf)
delta,af,cfep,source,asd,csd,av,cv=res
assert abs(af-(-4.0))<1e-9,(af,res)
assert abs(cfep-1.0)<1e-9,(cfep,res)
assert abs(asd-0.0)<1e-9,(asd,res)
assert abs(csd-(-7.0))<1e-9,(csd,res)
assert abs(av-(-4.0))<1e-9 and abs(cv-(-6.0))<1e-9,(av,cv,res)
assert abs(delta-2.0)<1e-9,res
assert source=='nflfastR-derived-score-aware-same-state-surface',source
# Stored whole-play EPA cannot affect the score-aware state comparison.
row['epa']='-999'
assert abs(fs._same_state_causal_epa(row,'CAR','CHI',actual,cf,surf)[0]-delta)<1e-12

# 2) Nullified made FG must be a scoring counterfactual, not a fictional
# fourth-down scrimmage result. This mirrors GB-MIN's 40-yard FG erased by MIN
# defensive offside before GB faced 4th-and-1.
fg={
 'season':'2026','game_id':'2026_01_GB_MIN','home_team':'MIN','away_team':'GB','posteam':'GB','defteam':'MIN',
 'posteam_score':'22','defteam_score':'17','score_differential':'5','qtr':'4','game_seconds_remaining':'801','half_seconds_remaining':'801',
 'down':'4','ydstogo':'6','yardline_100':'22','posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0',
 'play_type':'field_goal','field_goal_result':'made','field_goal_attempt':'1','penalty':'1','penalty_team':'MIN','penalty_type':'Defensive Offside',
 'desc':'28-T.Smack 40 yard field goal is GOOD NULLIFIED by Penalty. PENALTY on MIN-15-D.Turner Defensive Offside 5 yards enforced at MIN 22 - No Play.'
}
fg_next={
 'season':'2026','game_id':'2026_01_GB_MIN','home_team':'MIN','away_team':'GB','posteam':'GB','defteam':'MIN',
 'posteam_score':'22','defteam_score':'17','score_differential':'5','qtr':'4','game_seconds_remaining':'797','half_seconds_remaining':'797',
 'down':'4','ydstogo':'1','yardline_100':'17','posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0'
}
fgcf,kind=fs._counterfactual_no_penalty_state(fg,fg_next)
assert kind=='erased-field-goal',kind
# Home MIN led/trails? pre row gives posteam GB 22, defteam MIN 17 => home MIN -5.
# No penalty FG makes GB 25, so home diff is -8 and MIN receives after score.
assert abs(fgcf['home_score_diff']-(-8.0))<1e-9,fgcf
assert fgcf['possession_home'] is True,fgcf
assert abs(fgcf['yardline_100']-65.0)<1e-9,fgcf

# 3) Turnover returned for TD must prefer the scoring branch over generic
# erased-turnover logic.
pick6=dict(fg)
pick6.update({'home_team':'BUF','away_team':'DET','posteam':'BUF','defteam':'DET','posteam_score':'14','defteam_score':'10','score_differential':'4','play_type':'no_play','field_goal_result':'','field_goal_attempt':'0','touchdown':'1','td_team':'DET','interception':'1','penalty_team':'DET','penalty_type':'Defensive Holding','desc':'INTERCEPTED by DET-1 at BUF 20. DET-1 for 80 yards TOUCHDOWN NULLIFIED by Penalty. PENALTY on DET Defensive Holding - No Play.'})
pick_next={'season':'2026','game_id':pick6['game_id'],'home_team':'BUF','away_team':'DET','posteam':'BUF','defteam':'DET','posteam_score':'14','defteam_score':'10','score_differential':'4','qtr':'2','game_seconds_remaining':'1000','half_seconds_remaining':'1000','down':'1','ydstogo':'10','yardline_100':'25','posteam_timeouts_remaining':'3','defteam_timeouts_remaining':'3','receive_2h_ko':'0'}
pcf,pkind=fs._counterfactual_no_penalty_state(pick6,pick_next)
assert pkind=='erased-touchdown',pkind
# DET would score 7, so BUF home diff moves from +4 to -3, then BUF receives.
assert abs(pcf['home_score_diff']-(-3.0))<1e-9,pcf
assert pcf['possession_home'] is True,pcf
print('PASS: V97 score-aware EPA and scoring counterfactual reconstruction')
