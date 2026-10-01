#!/usr/bin/env python3
from pathlib import Path
import importlib.util, math
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
cal={
 'epa_per_game_rms':1.0,'wpa_per_game_rms':1.0,'first_downs_per_game_rms':1.0,'erased_tds_per_game_rms':1.0,
 'epa_weight':.40,'wpa_weight':.25,'first_down_weight':.20,'erased_td_weight':.15,
 'softness':3.0,'component_z_cap':3.0,
}
# Neutral stays exactly neutral.
b=fs._penalty_score_breakdown_from_averages(0,0,0,0,cal)
assert abs(b['score']-50.0)<1e-12,b
# Raw z can be enormous, but every component is capped before weighting.
b=fs._penalty_score_breakdown_from_averages(100,100,100,100,cal)
assert all(abs(v-3.0)<1e-12 for v in b['capped_z'].values()),b
expected=50+50*math.tanh(1.0)
assert abs(b['score']-expected)<1e-12,(b['score'],expected)
assert b['score']<99.0,b
bn=fs._penalty_score_breakdown_from_averages(-100,-100,-100,-100,cal)
assert abs(bn['score']-(100-expected))<1e-12,bn
assert bn['score']>1.0,bn
# Approved weights remain unchanged and weighted arithmetic is explicit.
b=fs._penalty_score_breakdown_from_averages(2,1,-1,.5,cal)
calc=sum(b['weighted_contributions'].values())/sum(b['weights'].values())
assert abs(calc-b['combined_z'])<1e-12,b
assert b['weights']=={'epa':.40,'wpa':.25,'first_down':.20,'erased_td':.15},b['weights']
print('PASS: V96 penalty scale cap/softness/weights')
