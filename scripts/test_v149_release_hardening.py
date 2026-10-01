"""Offline seed/provenance/schema and threaded game-flow release regressions."""
import copy
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
from unittest.mock import patch

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server._server_diag=lambda *args, **kwargs: None
checks=0


def ok(value, label):
    global checks
    assert value, label
    checks+=1


reference=json.loads(server._disk_cache_paths(server.V104_REFERENCE_2025_CACHE_KEY)[0].read_bytes())
ok(server._v106_reference_valid(reference),'committed-ready positional all-play seed validates')
ok(reference['game_count']==272 and reference['qb_id_count']==81,'full regular season and positional QB coverage')
ok(reference['pbp_input']['rows']==48771 and reference['player_stats_input']['rows']==19422,'full input provenance retained')
old=json.loads((root/'data/live-cache/bdaac89c27e7bd1dd454.bin').read_bytes())
ok(not server._v106_reference_valid(old),'old v3 reference rejected')
for metric in ('qb_pass_epa','qb_pass_success_rate','ol_disruption_rate'):
    ok(all(old['sample_windows'][key][metric]==reference['sample_windows'][key][metric] for key in old['sample_windows']), 'legacy historical scale remains identical: '+metric)
for key in ('version','qb_id_source','qb_player_ids','qb_id_count','qb_ids_sha256'):
    broken=copy.deepcopy(reference);broken.pop(key)
    ok(not server._v106_reference_valid(broken),'reference rejects missing '+key)
broken=copy.deepcopy(reference);broken['sample_windows']['17'].pop('qb_epa_per_play')
ok(not server._v106_reference_valid(broken),'all-play benchmark windows required')
broken=copy.deepcopy(reference);broken['qb_id_source']='pbp-passers-only'
ok(not server._v106_reference_valid(broken),'passer-only attribution rejected')

with tempfile.TemporaryDirectory(prefix='force-seed-test-') as directory:
    with patch.object(server,'LIVE_CACHE_DIR',Path(directory)), patch.object(server,'CACHE',{}), patch.object(server,'PUBLIC_MODE',True), patch.object(server,'_fetch_text',side_effect=AssertionError('expensive regeneration')):
        for force in (False,True):
            try:
                server.v104_reference_2025_payload(force=force)
                raise AssertionError('missing public seed accepted')
            except ValueError as error:
                ok('public regeneration disabled' in str(error),'public missing seed never regenerates, including force')
        data_path,meta_path=server._disk_cache_paths(server.V104_REFERENCE_2025_CACHE_KEY)
        data_path.write_text(json.dumps(old),encoding='utf-8')
        try:
            server.v104_reference_2025_payload()
            raise AssertionError('invalid public seed accepted')
        except ValueError:
            checks+=1
        data_path.write_text(json.dumps(reference),encoding='utf-8')
        ok(server.v104_reference_2025_payload(force=True)==reference,'public trusted force still consumes valid historical seed')
    # Exercise the actual local builder without a network or persistent test dirt.
    ids=reference['qb_player_ids']
    players='position,player_id\n'+'\n'.join('QB,'+pid for pid in ids)
    game={'game_id':'2025_01_KC_BUF','week':1,'home':'BUF','away':'KC',
          'home_qb_total_epa':2,'home_qb_plays':20,'away_qb_total_epa':1,'away_qb_plays':20}
    with patch.object(server,'LIVE_CACHE_DIR',Path(directory)), patch.object(server,'CACHE',{}), patch.object(server,'PUBLIC_MODE',False), patch.object(server,'_fetch_text',side_effect=['season_type\nREG',players]) as fetch, patch.object(server,'_defensive_points_per_drive_games',return_value=[game]*272) as games, patch.object(server,'_v104_reference_from_drive_games',return_value=reference['sample_windows']):
        regenerated=server.v104_reference_2025_payload(force=True)
        ok(fetch.call_count==2 and server._v106_reference_valid(regenerated),'explicit local regeneration obtains both input feeds')
        ok(games.call_args.kwargs['qb_player_ids']==set(ids),'local generation passes positional IDs to all-play aggregator')
        ok(data_path.exists() and meta_path.exists(),'local generation writes established bin/json pair')

flow={'qb_epa_definition':'v149-all-play','v104_reference':reference,'defensive_drive_games':[
    {'home_qb_total_epa':2,'home_qb_plays':20,'away_qb_total_epa':1,'away_qb_plays':20}]}
ok(server._game_flow_qb_valid(flow),'new game-flow schema validates')
for marker in (None,'v149-pass-only'):
    broken=copy.deepcopy(flow);broken['qb_epa_definition']=marker
    ok(not server._game_flow_qb_valid(broken),'missing/wrong definition rejected')
broken=copy.deepcopy(flow);broken['defensive_drive_games'][0].pop('home_qb_plays')
ok(not server._game_flow_qb_valid(broken),'marker cannot bless missing all-play fields')

# Exercise the real producer with only unrelated heavy computations stubbed.
with patch.object(server,'CACHE',{}), patch.object(server,'PUBLIC_MODE',True), patch.object(server,'_fetch_text',return_value='season_type,game_id\nREG,g1'), patch.object(server,'fetch_upstream',return_value=(b'position,player_id\nQB,00-0000001','text/csv',False)), patch.object(server,'_v143_pressure_context',return_value=({},{})), patch.object(server,'_defensive_points_per_drive_games',return_value=flow['defensive_drive_games']), patch.object(server,'performance_luck_calibration_2025_payload',return_value={}), patch.object(server,'_performance_luck_games',return_value=[]), patch.object(server,'penalty_reference_2025_payload',return_value={}), patch.object(server,'_get_ep_surface_2025',return_value={}), patch.object(server,'_penalty_context_from_rows',return_value=([],{})), patch.object(server,'_attach_penalty_scores'), patch.object(server,'_write_disk_cache'):
    body,cached=server.game_flow_2026_payload(force=True)
    produced=json.loads(body)
    ok(not cached and server._game_flow_qb_valid(produced),'fresh endpoint producer emits validated all-play marker/reference')
    with patch.object(server,'v104_reference_2025_payload',side_effect=ValueError('seed unavailable')):
        unavailable=json.loads(server.game_flow_2026_payload(force=True)[0])
        ok(unavailable['qb_epa_definition']=='unavailable' and not unavailable['v106_reference_status']['valid'] and unavailable['warnings']==['seed unavailable'],'missing historical seed produces explicit unavailable warning without pass-EPA substitution')

# All eight forced callers overlap a single leader; capture waiters explicitly.
entered=threading.Event();release=threading.Event();followers=threading.Event()
wait_count=[0];build_count=[0]
original_wait=server.GAME_FLOW_BUILD_CONDITION.wait


def observed_wait(*args,**kwargs):
    wait_count[0]+=1
    if wait_count[0]==7: followers.set()
    return original_wait(*args,**kwargs)


def build(force=False):
    build_count[0]+=1;entered.set()
    assert release.wait(5),'leader release timeout'
    return json.dumps(flow).encode(),False


with patch.object(server,'CACHE',{}), patch.object(server,'_build_game_flow_2026_payload',side_effect=build), patch.object(server.GAME_FLOW_BUILD_CONDITION,'wait',side_effect=observed_wait), ThreadPoolExecutor(max_workers=8) as pool:
    leader=pool.submit(server.game_flow_2026_payload,True)
    assert entered.wait(2)
    others=[pool.submit(server.game_flow_2026_payload,True) for _ in range(7)]
    try:
        ok(followers.wait(2),'seven followers wait on active game-flow build')
        # An unrelated warm-cache endpoint proceeds while the leader is blocked.
        with patch.object(server,'CACHE',{'/api/team-stats':{'ts':server.time.time(),'body':b'cached','ctype':'text/csv'}}):
            ok(server.fetch_upstream('/api/team-stats')[0]==b'cached','game-flow lock does not serialize lightweight feeds')
    finally:
        release.set()
    results=[leader.result(2),*[future.result(2) for future in others]]
    ok(build_count[0]==1 and sum(not cached for _,cached in results)==1,'one forced leader build, followers reuse result')
    ok(all(body==results[0][0] for body,_ in results),'followers receive leader body')
    server.game_flow_2026_payload(force=True)
    ok(build_count[0]==2,'later trusted force starts a genuinely new build')

entered.clear();release.clear();waiter=threading.Event()


def fail(force=False):
    entered.set();assert release.wait(5);raise ValueError('build failed')


def waiting(*args,**kwargs):
    waiter.set();return original_wait(*args,**kwargs)


with patch.object(server,'CACHE',{}), patch.object(server,'_build_game_flow_2026_payload',side_effect=fail), patch.object(server.GAME_FLOW_BUILD_CONDITION,'wait',side_effect=waiting), ThreadPoolExecutor(max_workers=2) as pool:
    first=pool.submit(server.game_flow_2026_payload,True);assert entered.wait(2)
    second=pool.submit(server.game_flow_2026_payload,True)
    try:ok(waiter.wait(2),'failure follower is waiting')
    finally:release.set()
    for future in (first,second):
        try:future.result(2);raise AssertionError('failed build accepted')
        except ValueError as error:ok(str(error)=='build failed','leader/follower failure propagated')
with patch.object(server,'_build_game_flow_2026_payload',return_value=(b'retry worked',False)) as retry:
    ok(server.game_flow_2026_payload(True)[0]==b'retry worked' and retry.call_count==1,'failure releases flight for later retry')

with patch.object(server,'CACHE',{server.GAME_FLOW_CACHE_KEY:{'ts':server.time.time(),'body':json.dumps(flow).encode()}}), patch.object(server,'_build_game_flow_2026_payload',return_value=(b'fresh forced',False)) as rebuild:
    ok(server.game_flow_2026_payload()[1] and rebuild.call_count==0,'public TTL cache hit remains lightweight')
    ok(server.game_flow_2026_payload(True)==(b'fresh forced',False) and rebuild.call_count==1,'cache-only public read cannot capture forced builder')

print(f'PASS: V149 release hardening backend ({checks} checks)')
