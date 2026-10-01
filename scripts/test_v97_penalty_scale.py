#!/usr/bin/env python3
from pathlib import Path
import importlib.util, math
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
cal={'epa_per_game_rms':1.0,'wpa_per_game_rms':1.0,'first_downs_per_game_rms':1.0,'erased_tds_per_game_rms':1.0,'epa_weight':.40,'wpa_weight':.25,'first_down_weight':.20,'erased_td_weight':.15,'softness':3.0,'component_z_cap':3.0}
# Approved weights unchanged.
b=fs._penalty_score_breakdown_from_averages(1,1,1,1,cal)
assert b['weights']=={'epa':.40,'wpa':.25,'first_down':.20,'erased_td':.15},b
# HOU-style contradiction: both direct values negative, structural first downs
# strongly positive. Structural context may pull toward neutral but not flip >50.
h=fs._penalty_score_breakdown_from_averages(-.2,-.2,3,0,cal)
assert h['pre_guard_combined_z']>0,h
assert h['direction_guard_applied'] and h['direct_value_agreement']=='negative',h
assert abs(h['combined_z'])<1e-12 and abs(h['score']-50)<1e-12,h
# Exact sign symmetry remains intact for the opponent.
o=fs._penalty_score_breakdown_from_averages(.2,.2,-3,0,cal)
assert o['direction_guard_applied'] and o['direct_value_agreement']=='positive',o
assert abs(o['score']-50)<1e-12,o
# Mixed direct values retain the original four-component decision rule.
m=fs._penalty_score_breakdown_from_averages(1,-1,2,0,cal)
assert m['direct_value_agreement']=='mixed' and not m['direction_guard_applied'],m
assert abs(m['combined_z']-m['pre_guard_combined_z'])<1e-12,m
# Tail caps and softness remain V96-calibrated.
x=fs._penalty_score_breakdown_from_averages(100,100,100,100,cal)
assert all(abs(v-3)<1e-12 for v in x['capped_z'].values()),x
assert x['score']<90,x
print('PASS: V97 penalty scale directional coherence guard')
