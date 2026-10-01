import json, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import force_server as fs

# Synthetic payload deliberately contains a WRONG direct season profile. The
# canonical game rows are +3.01pp and +6.22pp for BUF. V93 debug/reaggregation
# must report +4.615pp/game and expose the mismatch rather than inherit -3.1pp/g.
payload = {
    'penalty_method':'synthetic-v93',
    'penalty_calibration':{},
    'penalty_profiles':{
        'BUF': {'games':2,'net_penalty_wpa':-0.062,'net_penalty_epa':1.0}
    },
    'penalty_games':[
        {'game_id':'2026_01_BUF_HOU','week':1,'home':'HOU','away':'BUF',
         'teams':{'BUF':{**fs._blank_penalty_team(),'net_penalty_wpa':0.0301,'net_penalty_epa':1.0},
                  'HOU':{**fs._blank_penalty_team(),'net_penalty_wpa':-0.0301,'net_penalty_epa':-1.0}},
         'events':[]},
        {'game_id':'2026_02_DET_BUF','week':2,'home':'BUF','away':'DET',
         'teams':{'BUF':{**fs._blank_penalty_team(),'net_penalty_wpa':0.0622,'net_penalty_epa':2.0},
                  'DET':{**fs._blank_penalty_team(),'net_penalty_wpa':-0.0622,'net_penalty_epa':-2.0}},
         'events':[]},
    ]
}
orig=fs.game_flow_2026_payload
try:
    fs.game_flow_2026_payload=lambda force=False:(json.dumps(payload).encode(),False)
    audit=fs.penalty_debug_payload('BUF')
finally:
    fs.game_flow_2026_payload=orig

assert audit['recomputed_from_games']['games']==2, audit
assert abs(audit['recomputed_from_games']['net_penalty_wpa']-0.0923)<1e-12, audit
assert abs(audit['recomputed_from_games']['net_penalty_wpa_per_game']-0.04615)<1e-12, audit
assert abs(audit['server_profile_minus_game_sum']['wpa'] - (-0.1543))<1e-12, audit
print('PASS: V93 canonical per-game penalty aggregation + mismatch audit')
