import importlib.util
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

html='''
<html><body><p>Pressure rate. Last updated 09/16/26</p><table>
<tr><th>Rank</th><th>Team</th><th>2026</th><th>Last 1</th><th>2025</th></tr>
<tr><td>1</td><td><a href="/nfl/team/kansas-city-chiefs"><img alt="Kansas City Chiefs"></a></td><td>45.5%</td><td>45.5%</td><td>23.6%</td></tr>
<tr><td>2</td><td><img aria-label="Indianapolis Colts"></td><td>31.2%</td><td>31.2%</td><td>29.4%</td></tr>
</table></body></html>
'''
r=mod.parse_statrankings_pressure_html(html)
assert r['as_of']=='2026-09-16',r
assert r['row_count']==2,r
assert abs(r['teams']['KC']['pressure_rate']-.455)<1e-12,r
assert abs(r['teams']['KC']['prior_pressure_rate']-.236)<1e-12,r
assert r['teams']['KC']['mode']=='automatic'
assert abs(r['teams']['IND']['pressure_rate']-.312)<1e-12

server=(root/'force_server.py').read_text()
assert '/api/current-pressure' in server
assert 'STAT_RANKINGS_URL' in server
assert 'pressure-current.manual.json' in server
assert 'merged.update(manual.get' in server
assert 'one calendar day after its latest completed game' in server
print('PASS: V44 automatic pressure parser + manual override server contract')
