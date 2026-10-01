import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import force_server as fs

checks=0
def ok(v,msg):
    global checks
    checks += 1
    if not v:
        raise AssertionError(msg)

fs.SERVER_DIAG_EVENTS.clear()
fs._server_diag('test:event', marker='v86')
snap=fs._server_diagnostic_snapshot()
ok(snap['version']=='V86-DIAG-1','diagnostic version missing')
ok(any(e.get('event')=='test:event' and e.get('marker')=='v86' for e in snap['events']),'server event ring missing')
body=b'season,week,team\n2026,1,KC\n2026,1,DEN\n'
summary=fs._csv_body_summary(body)
ok(summary['rows']==2,'csv row summary wrong')
ok(summary['team_count']==2,'csv team coverage wrong')
ok(summary['weeks']==['1'],'csv week coverage wrong')
print(f'PASS: V84 server diagnostics ({checks} checks)')
