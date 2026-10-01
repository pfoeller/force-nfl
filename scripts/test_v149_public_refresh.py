"""Offline HTTP regressions for public/local refresh privileges and security gates."""
import functools
import importlib.util
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location('force_server', Path(__file__).resolve().parents[1] / 'force_server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server._server_diag = lambda *args, **kwargs: None
checks = 0


def ok(value, label):
    global checks
    assert value, label
    checks += 1


class QuietHandler(server.ForceHandler):
    def log_message(self, *args):
        pass


with tempfile.TemporaryDirectory(prefix='force-http-test-') as directory:
    Path(directory, 'private.txt').write_text('private source', encoding='utf-8')
    httpd = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=directory))
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    def request(path, method='GET', headers=None, body=None):
        conn = HTTPConnection('127.0.0.1', httpd.server_port, timeout=5)
        try:
            conn.request(method, path, body=body, headers=headers or {})
            response = conn.getresponse()
            return response.status, response.read()
        finally:
            conn.close()

    try:
        calls = []

        def upstream(path, force=False):
            calls.append((path, force))
            return b'season,team\n2026,BUF', 'text/csv', not force

        def derived(path):
            def payload(force=False):
                calls.append((path, force))
                return b'{}', not force
            return payload

        with patch.object(server, 'fetch_upstream', upstream), patch.object(server, 'game_flow_2026_payload', derived('/api/game-flow-2026')), patch.object(server, 'current_pressure_payload', derived('/api/current-pressure')):
            for public in (True, False):
                with patch.object(server, 'PUBLIC_MODE', public):
                    for path in sorted(server.INTERNAL_BOOTSTRAP_PATHS - {'/api/health'}):
                        for query in ('force_refresh=123', 'force_refresh=', '%66orce_refresh=123', 'x=force_refresh=123&refresh=1&force=1'):
                            status, _ = request(path + '?' + query, headers={'X-FORCE-BOOTSTRAP': '1', 'X-Original-URL': server.INTERNAL_BOOTSTRAP_PREFIX + path})
                            expected = not public and not query.startswith('x=')
                            ok(status == 200 and calls[-1] == (path, expected), f'{public=} {path} {query} force policy')
                        status, _ = request(server.INTERNAL_BOOTSTRAP_PREFIX + path)
                        ok(status == 200 and calls[-1] == (path, True), f'internal builder forces {path}')
                    ok(request(server.INTERNAL_BOOTSTRAP_PREFIX + '/api/diagnostics')[0] == 404, 'internal route cannot elevate diagnostics')
                    ok(request(server.INTERNAL_BOOTSTRAP_PREFIX + '/private.txt')[0] == 404, 'internal route cannot expose files')

        with patch.object(server, 'PUBLIC_MODE', True):
            # Exercise the actual upstream TTL hit: an anonymous forced query
            # must not reach urlopen or write any disk cache.
            cache = {'/api/team-stats': {'ts': server.time.time(), 'body': b'cached data', 'ctype': 'text/csv'}}
            with patch.object(server, 'CACHE', cache), patch.object(server, 'urlopen', side_effect=AssertionError('TTL bypass')):
                ok(request('/api/team-stats?force_refresh=123') == (200, b'cached data'), 'public force query uses real TTL cache')
            # In contrast, the private builder route actually retrieves a new
            # source body even while an unexpired memory entry exists.
            fresh = b'season,game_type,home_team,away_team\n' + b'2026,REG,BUF,KC\n' * 20
            cached = {'/api/schedule': {'ts': server.time.time(), 'body': b'old snapshot', 'ctype': 'text/csv'}}
            upstream_response = MagicMock()
            upstream_response.__enter__.return_value = upstream_response
            upstream_response.read.return_value = fresh
            upstream_response.headers.get_content_type.return_value = 'text/csv'
            with patch.object(server, 'CACHE', cached), patch.object(server, 'urlopen', return_value=upstream_response) as retrieve, patch.object(server, '_write_disk_cache') as persist:
                ok(request(server.INTERNAL_BOOTSTRAP_PREFIX + '/api/schedule') == (200, fresh), 'trusted builder bypasses real memory TTL')
                ok(retrieve.call_count == 1 and persist.call_count == 1, 'trusted builder retrieves and publishes a fresh upstream body')
            for path in ('/api/diagnostics', '/api/penalty-debug', '/api/penalty-scale-debug', '/private.txt', '/force_server.py', '/research/report.md', '/__force_internal/bootstrap/api/diagnostics'):
                ok(request(path + '?force_refresh=123')[0] == 404, f'public gate {path}')
            for path in ('/api/current-pressure/manual', '/api/team-stats', server.INTERNAL_BOOTSTRAP_PREFIX + '/api/team-stats'):
                ok(request(path, 'POST', {'Content-Type': 'application/json'}, '{}')[0] == 403, f'public POST gate {path}')

        with patch.object(server, 'PUBLIC_MODE', False), patch.object(server, 'penalty_debug_payload', lambda team, force: {'team': team, 'force': force}), patch.object(server, 'penalty_scale_debug_payload', lambda force, limit: {'force': force, 'limit': limit}), patch.object(server, 'save_manual_pressure_override', lambda payload: payload):
            for path in ('/api/diagnostics', '/api/penalty-debug?force_refresh=1', '/api/penalty-scale-debug?force_refresh=1', '/private.txt'):
                ok(request(path)[0] == 200, f'local maintenance {path}')
            ok(request('/api/current-pressure/manual', 'POST', {'Content-Type': 'application/json'}, '{"team":"BUF"}')[0] == 200, 'local manual pressure POST remains available')
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)

print(f'PASS: V149 public refresh backend ({checks} checks)')
