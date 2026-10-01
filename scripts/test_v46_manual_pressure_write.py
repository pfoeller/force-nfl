#!/usr/bin/env python3
import json, tempfile, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import force_server as fs

checks=0
def ok(x,msg):
    global checks
    if not x: raise AssertionError(msg)
    checks+=1

old=fs.PRESSURE_OVERRIDE_PATH
old_cache=dict(fs.CACHE)
try:
    with tempfile.TemporaryDirectory() as td:
        fs.PRESSURE_OVERRIDE_PATH=Path(td)/'pressure-current.manual.json'
        fs.CACHE['/api/current-pressure']={'ts':0,'body':b'x'}
        row=fs.save_manual_pressure_override({
            'team':'KC','pressure_rate':45.5,'as_of':'2026-09-16','games':1,'through_week':1,
            'source':'test source','source_url':'https://example.com/kc','note':'test'
        })
        ok(abs(row['pressure_rate']-.455)<1e-9,'percent input normalized to fraction')
        ok('/api/current-pressure' not in fs.CACHE,'save invalidates current-pressure cache')
        doc=json.loads(fs.PRESSURE_OVERRIDE_PATH.read_text())
        ok(doc['teams']['KC']['games']==1,'games persisted')
        loaded=fs.load_manual_pressure_overrides()
        ok(loaded['teams']['KC']['mode']=='manual','loaded row carries manual provenance')
        ok(abs(loaded['teams']['KC']['pressure_rate']-.455)<1e-9,'saved value round-trips')
        try:
            fs.save_manual_pressure_override({'team':'KC','pressure_rate':145,'as_of':'2026-09-16'})
            raise AssertionError('invalid rate accepted')
        except ValueError:
            checks+=1
finally:
    fs.PRESSURE_OVERRIDE_PATH=old
    fs.CACHE.clear(); fs.CACHE.update(old_cache)
print(f'PASS: V46 manual pressure write ({checks} checks)')
