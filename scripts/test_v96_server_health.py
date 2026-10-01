#!/usr/bin/env python3
from pathlib import Path
import importlib.util, json, threading, urllib.request
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',ROOT/'force_server.py')
fs=importlib.util.module_from_spec(spec); spec.loader.exec_module(fs)
server=fs.ThreadingHTTPServer(('127.0.0.1',0),fs.ForceHandler)
port=server.server_address[1]
th=threading.Thread(target=server.serve_forever,daemon=True); th.start()
try:
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=2) as r:
        body=json.loads(r.read().decode())
    assert body.get('app_version')=='V96',body
    assert body.get('diagnostic_version')=='V96-DIAG-1',body
    print('PASS: V96 server health endpoint')
finally:
    server.shutdown(); server.server_close(); th.join(timeout=2)
