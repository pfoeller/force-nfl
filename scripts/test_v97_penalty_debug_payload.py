#!/usr/bin/env python3
from pathlib import Path
import importlib.util, json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
cal={'epa_per_game_rms':1,'wpa_per_game_rms':1,'first_downs_per_game_rms':1,'erased_tds_per_game_rms':1,'epa_weight':.4,'wpa_weight':.25,'first_down_weight':.2,'erased_td_weight':.15,'softness':3,'component_z_cap':3}
bd=fs._penalty_score_breakdown_from_averages(-.2,-.2,3,0,cal)
event={'penalty_team':'HOU','beneficiary':'BUF','causal_epa':.5,'causal_wpa':.02,'actual_team_ep':-.2,'counterfactual_team_ep':.3,'actual_team_score_delta':0,'counterfactual_team_score_delta':-7,'actual_team_state_value':-.2,'counterfactual_team_state_value':-6.7,'score_erased_points':7,'desc':'x'}
flow={'penalty_method':'test','penalty_calibration':cal,'penalty_profiles':{'HOU':{'games':1,'net_penalty_epa':-.2,'net_penalty_wpa':-.2,'penaltyImpactScore':bd['score'],'penaltyImpactBreakdown':bd}},'penalty_games':[{'game_id':'g','week':1,'home':'HOU','away':'BUF','teams':{'HOU':{'games':1,'net_penalty_epa':-.2,'net_penalty_wpa':-.2}},'events':[event]}]}
orig=fs.game_flow_2026_payload
fs.game_flow_2026_payload=lambda force=False:(json.dumps(flow).encode(),False)
try:
    obj=fs.penalty_scale_debug_payload(limit=10)
    row=obj['teams'][0]
    assert row['score_breakdown']['direction_guard_applied'] is True,row
    assert row['score']==50,row
    team=fs.penalty_debug_payload('HOU')
    ev=team['games'][0]['events'][0]
    for k in ('actual_team_score_delta','counterfactual_team_score_delta','actual_team_state_value','counterfactual_team_state_value','score_erased_points'):
        assert k in ev,(k,ev)
finally:
    fs.game_flow_2026_payload=orig
print('PASS: V97 penalty debug payload')
