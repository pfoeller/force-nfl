"""Explicit local maintenance: generate only the V149 2025 QB reference cache pair."""
import argparse
import importlib.util
import json
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pbp', type=Path, help='Optional full uncompressed 2025 PBP CSV')
parser.add_argument('--players', type=Path, help='Optional full 2025 weekly player-stat CSV')
args=parser.parse_args()
if bool(args.pbp) != bool(args.players):
    parser.error('--pbp and --players must be supplied together')
spec=importlib.util.spec_from_file_location('force_server',Path(__file__).resolve().parents[1]/'force_server.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server.PUBLIC_MODE=False  # This command is an explicit local generation workflow.
if args.pbp:
    inputs={server.PBP_2025_URL:args.pbp,server.UPSTREAMS['/api/player-stats'].replace('2026','2025'):args.players}
    server._fetch_text=lambda url,timeout=90: inputs[url].read_text(encoding='utf-8')
reference=server.v104_reference_2025_payload(force=True)
assert server._v106_reference_valid(reference)
print(json.dumps({'cache_key':server.V104_REFERENCE_2025_CACHE_KEY,
    'files':[str(p) for p in server._disk_cache_paths(server.V104_REFERENCE_2025_CACHE_KEY)],
    'qb_id_source':reference['qb_id_source'],'qb_id_count':reference['qb_id_count'],
    'game_count':reference['game_count'],'pbp_input':reference['pbp_input'],
    'player_stats_input':reference['player_stats_input'],
    'window_counts':{key:len(value['qb_epa_per_play']) for key,value in reference['sample_windows'].items()}},indent=2))
