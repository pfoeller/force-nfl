"""Offline V149.1 historical-seed and last-known-good cache regressions."""
import copy
from contextlib import ExitStack
import importlib.util
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
checks=0


def ok(value, label):
    global checks
    assert value, label
    checks+=1


seeds={key:json.loads(server._disk_cache_paths(key)[0].read_bytes()) for key in server.HISTORICAL_SEED_FINGERPRINTS}
cases=[(server.PENALTY_REFERENCE_2025_CACHE_KEY,server._penalty_reference_seed_valid,server.penalty_reference_2025_payload),
       (server.EP_SURFACE_2025_CACHE_KEY,server._ep_surface_seed_valid,server._get_ep_surface_2025),
       (server.PERFORMANCE_LUCK_2025_CACHE_KEY,server._performance_luck_seed_valid,server.performance_luck_calibration_2025_payload)]

for key,validator,load in cases:
    seeded=seeds[key]
    ok(validator(seeded),key+' existing seed contract valid')
    with tempfile.TemporaryDirectory(prefix='force-historical-') as directory, ExitStack() as stack:
        diagnostics=[]
        for name,value in [('LIVE_CACHE_DIR',Path(directory)),('CACHE',{}),('PUBLIC_MODE',True),('_EP_SURFACE_2025',None),('_server_diag',lambda event,**data:diagnostics.append((event,data)))]:
            stack.enter_context(patch.object(server,name,value))
        fetch=stack.enter_context(patch.object(server,'_fetch_text',side_effect=AssertionError('2025 download attempted')))
        parse=stack.enter_context(patch.object(server.csv,'DictReader',side_effect=AssertionError('2025 parsing attempted')))
        for force in (False,True):
            try:load(force=force);raise AssertionError('missing seed accepted')
            except ValueError as error:ok('public regeneration disabled' in str(error),'missing public seed fails visibly, force='+str(force))
        ok(diagnostics and diagnostics[-1][1]['key']==key,'missing seed emits identified diagnostic')
        path,meta=server._disk_cache_paths(key)
        for bad in [b'not-json-but-long-enough'*10,json.dumps({'version':'old','valid':True,'sample_count':272}).encode()]:
            path.write_bytes(bad)
            try:load(force=True);raise AssertionError('invalid seed accepted')
            except ValueError:checks+=1
        changed=copy.deepcopy(seeded)
        if key==server.EP_SURFACE_2025_CACHE_KEY:changed['cells'][0][7]+=.01
        elif key==server.PENALTY_REFERENCE_2025_CACHE_KEY:changed['calibration']['epa_per_game_rms']+=.01
        else:changed['intercept']+=.01
        ok(validator(changed),'structurally plausible changed seed fixture')
        path.write_text(json.dumps(changed),encoding='utf-8')
        try:load();raise AssertionError('unreviewed calibration accepted')
        except ValueError:checks+=1
        # Invalid memory must not hide a valid reviewed disk seed.
        server.CACHE[key]={'body':json.dumps(changed).encode()}
        path.write_text(json.dumps(seeded,indent=2),encoding='utf-8')
        loaded=load(force=True)
        actual=server._serialize_ep_surface(loaded) if key==server.EP_SURFACE_2025_CACHE_KEY else loaded
        ok(actual==seeded,'public force consumes unchanged seed despite JSON formatting')
        ok(fetch.call_count==0 and parse.call_count==0,'public missing/invalid/forced seed never downloads or parses 2025')

# Supplied PBP rows must not bypass the public EP guard either.
with patch.object(server,'CACHE',{}), patch.object(server,'_EP_SURFACE_2025',None), patch.object(server,'PUBLIC_MODE',True), patch.object(server,'_read_disk_cache',return_value=None), patch.object(server,'_build_ep_state_surface',side_effect=AssertionError('public PBP parse/build')), patch.object(server,'_server_diag'):
    try:server._get_ep_surface_2025(rows=[{'ep':'1'}],force=True);raise AssertionError('public supplied-row rebuild accepted')
    except ValueError:checks+=1

bad=copy.deepcopy(seeds[server.PENALTY_REFERENCE_2025_CACHE_KEY]);bad['calibration']['epa_per_game_rms']=0
ok(not server._penalty_reference_seed_valid(bad),'penalty rejects unusable normalization')
bad=copy.deepcopy(seeds[server.EP_SURFACE_2025_CACHE_KEY]);bad['cells'][0][7]=float('nan')
ok(not server._ep_surface_seed_valid(bad),'EP surface rejects nonfinite cells')
bad=copy.deepcopy(seeds[server.PERFORMANCE_LUCK_2025_CACHE_KEY]);bad['epa_margin'].pop('slope')
ok(not server._performance_luck_seed_valid(bad),'Luck requires actual EPA-margin calibration')

# Exercise each actual local regeneration path, stubbing only expensive math.
with tempfile.TemporaryDirectory(prefix='force-local-seeds-') as directory, ExitStack() as stack:
    for name,value in [('LIVE_CACHE_DIR',Path(directory)),('CACHE',{}),('PUBLIC_MODE',False),('_EP_SURFACE_2025',None)]:stack.enter_context(patch.object(server,name,value))
    with patch.object(server,'_fetch_text',return_value='season_type\nREG') as fetch, patch.object(server,'_build_ep_state_surface',return_value=server._deserialize_ep_surface(seeds[server.EP_SURFACE_2025_CACHE_KEY])):
        server._get_ep_surface_2025(force=True)
        ok(fetch.call_count==1,'explicit local EP generation obtains 2025 PBP')
    penalty=seeds[server.PENALTY_REFERENCE_2025_CACHE_KEY]
    with patch.object(server,'_fetch_text',return_value='season_type\nREG') as fetch, patch.object(server,'_penalty_context_from_rows',return_value=([{}],{})), patch.object(server,'_penalty_calibration_from_profiles',return_value=copy.deepcopy(penalty['calibration'])), patch.object(server,'_load_nflfastr_wp_model',return_value={**penalty['wp_reference'],'trees':[{}]*65}):
        ok(server._penalty_reference_seed_valid(server.penalty_reference_2025_payload(force=True)) and fetch.call_count==1,'explicit local penalty regeneration remains available')
    with patch.object(server,'_fetch_text',return_value='season_type\nREG') as fetch, patch.object(server,'_defensive_points_per_drive_games',return_value=[]), patch.object(server,'_performance_luck_games',return_value=[]), patch.object(server,'_fit_performance_luck_calibration',return_value=seeds[server.PERFORMANCE_LUCK_2025_CACHE_KEY]):
        ok(server.performance_luck_calibration_2025_payload(force=True)==seeds[server.PERFORMANCE_LUCK_2025_CACHE_KEY] and fetch.call_count==1,'explicit local Luck regeneration remains available')
    ok(len(list(Path(directory).glob('*.bin')))==3 and len(list(Path(directory).glob('*.json')))==3,'local workflows write established cache pairs only in temporary directory')

reference=json.loads(server._disk_cache_paths(server.V104_REFERENCE_2025_CACHE_KEY)[0].read_bytes())
game={'week':1,'game_id':'2026_01_KC_BUF','home':'BUF','away':'KC','home_qb_total_epa':2,'home_qb_plays':20,'away_qb_total_epa':1,'away_qb_plays':20}
with tempfile.TemporaryDirectory(prefix='force-flow-cache-') as directory, ExitStack() as stack:
    for name,value in [('LIVE_CACHE_DIR',Path(directory)),('CACHE',{}),('PUBLIC_MODE',True),('_server_diag',lambda *args,**kwargs:None)]:stack.enter_context(patch.object(server,name,value))
    fetch=stack.enter_context(patch.object(server,'_fetch_text',return_value='season_type,game_id\nREG,g1'))
    stack.enter_context(patch.object(server,'fetch_upstream',return_value=(b'position,player_id\nQB,00-0000001','text/csv',False)))
    for name,value in [('_v143_pressure_context',({},{})),('_defensive_points_per_drive_games',[game]),('performance_luck_calibration_2025_payload',seeds[server.PERFORMANCE_LUCK_2025_CACHE_KEY]),('_performance_luck_games',[]),('penalty_reference_2025_payload',seeds[server.PENALTY_REFERENCE_2025_CACHE_KEY]),('_get_ep_surface_2025',{}),('_penalty_context_from_rows',([],{})),('_attach_penalty_scores',None),('v104_reference_2025_payload',reference)]:stack.enter_context(patch.object(server,name,return_value=value))
    key=server.GAME_FLOW_CACHE_KEY;path,meta=server._disk_cache_paths(key)
    first,cached=server.game_flow_2026_payload(force=True)
    ok(not cached and server._game_flow_qb_valid(first),'actual valid producer satisfies cache contract')
    ok(path.read_bytes()==first and server.CACHE[key]['body']==first,'valid producer writes memory and disk')
    saved_meta=meta.read_bytes();saved_memory=server.CACHE[key]
    with patch.object(server,'v104_reference_2025_payload',side_effect=ValueError('QB seed unavailable')):
        invalid,cached=server.game_flow_2026_payload(force=True)
        ok(json.loads(invalid)['qb_epa_definition']=='unavailable' and not cached,'invalid producer can return explicit diagnostic result')
    ok(path.read_bytes()==first and meta.read_bytes()==saved_meta and server.CACHE[key] is saved_memory,'invalid build preserves exact valid memory, body, metadata and timestamp')
    for name in ('performance_luck_calibration_2025_payload','penalty_reference_2025_payload','_get_ep_surface_2025'):
        with patch.object(server,name,side_effect=ValueError('historical seed missing')):
            try:server.game_flow_2026_payload(force=True);raise AssertionError('historical failure substituted calibration')
            except ValueError:checks+=1
        ok(path.read_bytes()==first and server.CACHE[key] is saved_memory,'failed historical build preserves last valid cache')
    ok(server.game_flow_2026_payload()[0]==first,'ordinary TTL read still uses valid memory after invalid forced build')
    game['home_qb_total_epa']=7
    second,_=server.game_flow_2026_payload(force=True)
    ok(second!=first and path.read_bytes()==second and server.CACHE[key]['body']==second,'later valid build replaces prior valid cache normally')
    server.CACHE.clear();fetch.side_effect=OSError('upstream down after process restart')
    recovered,cached=server.game_flow_2026_payload()
    ok(cached and recovered==second and server.CACHE[key]['body']==second,'restart recovers valid disk after upstream failure')
    server.CACHE[key]['ts']=0
    ok(server.game_flow_2026_payload(True)[0]==second,'expired valid memory remains available on forced upstream failure')

ok(not server._game_flow_qb_valid(b'{broken') and not server._game_flow_qb_valid({'defensive_drive_games':[None]}),'corrupt cache validation cannot raise')
print(f'PASS: V149.1 operational backend ({checks} checks)')
