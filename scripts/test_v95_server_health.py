import json, threading, urllib.request
from pathlib import Path
import importlib.util
from http.server import ThreadingHTTPServer
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
server=ThreadingHTTPServer(('127.0.0.1',0),mod.ForceHandler); port=server.server_address[1]
thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
try:
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=3) as r:
        body=json.loads(r.read().decode())
        assert r.status==200
        assert body.get('product')=='FORCE'
        assert body.get('app_version')=='V95',body
        assert body.get('diagnostic_version')=='V95-DIAG-1',body
finally:
    server.shutdown(); server.server_close()
print('PASS: V95 server health endpoint')
