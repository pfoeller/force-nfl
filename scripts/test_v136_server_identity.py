from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/'assets/app.js').read_text()
assert "health?.app_version!=='V136'" in app
assert 'expected FORCE V136' in app
assert "FORCE_DIAG_VERSION = 'V136-DIAG-1'" in app
for name in ('force_server.py','force_server_8091.py'):
 s=(root/name).read_text()
 assert "APP_VERSION = 'V136'" in s
 assert "SERVER_DIAG_VERSION = 'V136-DIAG-1'" in s
 assert 'starting V129' not in s
 assert 'FORCE V129 local server' not in s
print('V136 server identity checks passed')
