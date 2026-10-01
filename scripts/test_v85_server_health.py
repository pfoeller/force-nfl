import json, threading, urllib.request
from pathlib import Path
import importlib.util
from http.server import ThreadingHTTPServer
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
checks=0
def ok(v,m):
    global checks; checks+=1; assert v,m
server=ThreadingHTTPServer(('127.0.0.1',0),mod.ForceHandler)
port=server.server_address[1]
thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
try:
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=3) as r:
        body=json.loads(r.read().decode())
        ok(r.status==200,'health status not 200')
        ok(body.get('product')=='FORCE','health product identity wrong')
        ok(body.get('app_version')=='V109','health app version wrong')
        ok(body.get('diagnostic_version')=='V109-DIAG-1','health diagnostic version wrong')
finally:
    server.shutdown(); server.server_close()
print(f'PASS: V86 server health endpoint ({checks} checks)')
