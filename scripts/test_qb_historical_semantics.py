"""Offline historical builder, seed provenance, and semantic/cache compatibility."""
import copy
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import statistics
import tempfile
import time
from unittest.mock import patch

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server._server_diag=lambda *args,**kwargs:None
checks=0
def check(value,label):
    global checks
    assert value,label
    checks+=1

version='V149-QB-ALL-PLAY-REFERENCE-5'
marker='v149-all-play-v2'
key='/derived/v149-qb-all-play-reference-2025-v5'
data_path,meta_path=server._disk_cache_paths(key)
seed=json.loads(data_path.read_bytes())
v4_path=root/'data/live-cache/e0914b8c5a086741a555.bin'
v4=json.loads(v4_path.read_bytes())
check(hashlib.sha256(v4_path.read_bytes()).hexdigest()=='ad85605c71a0088cb2dc0e07d85268ee8d117c2a7495529d34970fd2259a059d','archived V4 preserved byte-for-byte')
check(server.QB_REFERENCE_VERSION==version and server.QB_EPA_DEFINITION==marker,'version/semantics pair')
check(server.V104_REFERENCE_2025_CACHE_KEY==key and data_path.name=='c6cb7af1f41f107e7e3f.bin','normal hashed V5 cache identity')
meta=json.loads(meta_path.read_bytes())
check(meta['key']==key and meta['bytes']==len(data_path.read_bytes()),'V5 cache metadata')
check(server._v106_reference_valid(seed),'committed V5 accepted')
check(seed['version']==version and seed['qb_epa_definition']==marker,'seed advertises paired identity')
check(seed['game_count']==272 and len(seed['sample_windows']['17']['qb_epa_per_play'])==32,'full 2025 season')
check(abs(statistics.median(seed['sample_windows']['17']['qb_epa_per_play'])-.048590405)<1e-10,'corrected full-season median')
check(seed['pbp_input']==v4['pbp_input'] and seed['pbp_input']['sha256']=='8ce0001826f0f7b895b7a1068e4db7f43696c699db7064ccb1201855768fd06c','pinned PBP provenance')
check(seed['player_stats_input']==v4['player_stats_input'] and seed['player_stats_input']['sha256']=='e5e0615b3d96a3eaebfaee91e55afb4a4e7fe0caf057454177bcd7d6ad4bcfc2','pinned player provenance')
check(seed['qb_id_count']==81 and seed['qb_player_ids']==v4['qb_player_ids'] and seed['qb_ids_sha256']=='5038bb324b113bb5f66718948b8b6f27d7b1aa7dc8837559e5b0c589293ce0e1','same 81 positional QB IDs')
for window,changed in [('1',69),('2',118),('3',153),('4',179),('17',28)]:
    before=v4['sample_windows'][window];after=seed['sample_windows'][window]
    check(len(before['qb_epa_per_play'])==len(after['qb_epa_per_play'])==544-32*(int(window)-1),'window construction/count unchanged')
    check(sum(a!=b for a,b in zip(before['qb_epa_per_play'],after['qb_epa_per_play']))==changed,'corrected all-play historical values')
    # A single canceled pass also changes the separate pass/Success/OL inputs.
    for metric in ('qb_pass_epa','qb_pass_success_rate','ol_disruption_rate'):
        check(sum(a!=b for a,b in zip(before[metric],after[metric]))==(1 if window in ('1','17') else 2),'canceled pass correction: '+metric)

def flow(reference=seed,definition=marker):
    return {'qb_epa_definition':definition,'v104_reference':reference,'defensive_drive_games':[
        {'home_qb_total_epa':2,'home_qb_plays':1,'away_qb_total_epa':2,'away_qb_plays':1}]}
for reference,definition,accepted in [(v4,'v149-all-play',False),(v4,marker,False),(seed,'v149-all-play',False),(seed,marker,True)]:
    check(server._game_flow_qb_valid(flow(reference,definition))==accepted,'reference/flow marker compatibility matrix')
for definition in (None,'v149-all-play'):
    broken=copy.deepcopy(seed);broken['qb_epa_definition']=definition
    check(not server._v106_reference_valid(broken) and not server._game_flow_qb_valid(flow(broken)),'V5 version alone cannot bless old reference semantics')

# Feed-shaped synthetic full season through the actual v104_reference builder.
# The canceled scramble has neither no_play nor a set rush_attempt (the live shape).
teams=list(server.TEAM_NAMES);ids=seed['qb_player_ids'];rows=[]
for week in range(1,18):
    for i in range(0,32,2):
        home,away=teams[i:i+2];gid=f'2025_{week:02}_{away}_{home}'
        for team,opponent,index in [(home,away,i),(away,home,i+1)]:
            rows.append({'season_type':'REG','game_id':gid,'week':week,'home_team':home,'away_team':away,
                         'posteam':team,'defteam':opponent,'drive':1,'down':1,'epa':2,'success':1,
                         'play_type':'pass','pass_attempt':1,'passer_player_id':ids[index]})
canceled={**rows[0],'play_type':' No_Play ','pass_attempt':0,'qb_scramble':1,'rush_attempt':'',
          'passer_player_id':'','epa':-100}
check('no_play' not in canceled and not canceled['rush_attempt'],'exact canceled-scramble feed shape')
g=server._defensive_points_per_drive_games(rows+[canceled],qb_player_ids=set(ids))[0]
baseline=server._defensive_points_per_drive_games(rows,qb_player_ids=set(ids))[0]
check(g==baseline,'canceled scramble cannot affect any actual-play aggregate')
first=server._defensive_points_per_drive_games([rows[0],canceled],qb_player_ids=set(ids))[0]
check(first['home_qb_plays']==1 and first['home_qb_total_epa']==2,'historical QB numerator/denominator')
check(first['home_qb_rush_attempts']==0 and first['home_qb_rush_epa']==0,'historical QB rushing exclusion')
absent=dict(canceled);absent.pop('rush_attempt')
check(server._defensive_points_per_drive_games([rows[0],absent],qb_player_ids=set(ids))==[first],'absent rush_attempt also excluded')
columns=sorted({k for row in rows+[canceled] for k in row});csv_text=io.StringIO()
writer=csv.DictWriter(csv_text,fieldnames=columns);writer.writeheader();writer.writerows(rows+[canceled])
players='position,player_id\n'+'\n'.join('QB,'+pid for pid in ids)
inputs={server.PBP_2025_URL:csv_text.getvalue(),server.UPSTREAMS['/api/player-stats'].replace('2026','2025'):players}
with tempfile.TemporaryDirectory(prefix='force-v5-reference-test-') as directory:
    with patch.object(server,'LIVE_CACHE_DIR',Path(directory)),patch.object(server,'CACHE',{}),patch.object(server,'PUBLIC_MODE',False),patch.object(server,'_fetch_text',side_effect=lambda url,timeout=90:inputs[url]):
        generated=server.v104_reference_2025_payload(force=True)
        check(server._v106_reference_valid(generated),'actual full reference-building path validates')
        check(all(all(v==2 for v in values['qb_epa_per_play']) for values in generated['sample_windows'].values()),'builder excludes canceled EPA from every rolling window')
        check(server._disk_cache_paths(key)[0].exists(),'builder writes new cache identity')

old_key='/api/game-flow-2026-v149-qb-all-play'
new_key='/api/game-flow-2026-v149-qb-all-play-v2'
check(server.GAME_FLOW_CACHE_KEY==new_key,'new game-flow cache identity')
old_body=json.dumps(flow(v4,'v149-all-play')).encode()
for cache in ({old_key:{'ts':time.time(),'body':old_body}}, {new_key:{'ts':time.time(),'body':old_body}}):
    with patch.object(server,'CACHE',cache),patch.object(server,'GAME_FLOW_FLIGHT',None),patch.object(server,'_fetch_text',side_effect=OSError('offline upstream')),patch.object(server,'_read_disk_cache',return_value={'body':old_body}) as read:
        try:server.game_flow_2026_payload()
        except OSError:pass
        else:raise AssertionError('old cached game flow accepted')
        check(read.call_args.args==(new_key,),'cache lookup never reads old identity and rejects old schema directly')
new_body=json.dumps(flow()).encode()
with patch.object(server,'CACHE',{new_key:{'ts':time.time(),'body':new_body}}),patch.object(server,'_fetch_text',side_effect=AssertionError('fresh cache must not fetch')):
    check(server.game_flow_2026_payload()==(new_body,True),'new marker/V5 cache accepted')
print(f'PASS: QB historical semantics and cache identity ({checks} behavioral checks)')
