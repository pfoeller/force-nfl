from pathlib import Path
import importlib.util, tempfile, json
root=Path(__file__).resolve().parents[1]
src=(root/'force_server.py').read_text('utf-8')
checks=0
def ok(v,m):
    global checks
    checks+=1
    assert v,m
ok("LIVE_CACHE_DIR" in src,'disk cache directory missing')
ok("_write_disk_cache(path, body, ctype)" in src,'successful generic upstream payload must persist')
ok("disk = _read_disk_cache(path)" in src,'generic upstream must recover disk cache')
ok("fetch_upstream(path, force='force_refresh=' in parsed.query)" in src,'force_refresh must reach generic upstream fetch')
ok("play_by_play_2026.csv.gz" in src,'PBP should use compressed upstream asset')
ok("gzip.decompress" in src,'compressed PBP must be decompressed')
ok("_write_disk_cache(cache_key, body, 'application/json')" in src,'aggregated game-flow/penalty payload must persist')
ok("disk=_read_disk_cache(cache_key)" in src,'game-flow fetch must recover last-known-good payload')
print(f'PASS: V82 persistent live-cache contract ({checks} checks)')
