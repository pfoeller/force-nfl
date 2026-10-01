#!/usr/bin/env python3
from pathlib import Path
import importlib.util, json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
cal={'epa_per_game_rms':1,'wpa_per_game_rms':1,'first_downs_per_game_rms':1,'erased_tds_per_game_rms':1,'epa_weight':.4,'wpa_weight':.25,'first_down_weight':.2,'erased_td_weight':.15,'softness':3,'component_z_cap':3}
bd=fs._penalty_score_breakdown_from_averages(2,.5,1,0,cal)
flow={'penalty_method':'test','penalty_calibration':cal,'penalty_profiles':{'BUF':{'games':1,'net_penalty_epa':2,'net_penalty_wpa':.5,'penaltyImpactScore':bd['score'],'penaltyImpactBreakdown':bd}},'penalty_games':[{'game_id':'g','week':1,'home':'BUF','away':'DET','teams':{'BUF':{'net_penalty_epa':2,'net_penalty_wpa':.5}},'events':[{'penalty_team':'DET','beneficiary':'BUF','causal_epa':2,'causal_wpa':.5,'desc':'x'}]}]}
orig=fs.game_flow_2026_payload
fs.game_flow_2026_payload=lambda force=False:(json.dumps(flow).encode(),False)
try:
    obj=fs.penalty_scale_debug_payload(limit=10)
    assert obj['team_count']==1,obj
    assert obj['score_range']['exact_100']==[] and obj['score_range']['exact_0']==[],obj['score_range']
    assert obj['teams'][0]['score_breakdown']['capped_z']['epa']==2,obj
    assert obj['outliers']['largest_abs_epa'][0]['game_id']=='g',obj
finally:
    fs.game_flow_2026_payload=orig
print('PASS: V96 league penalty debug payload')
