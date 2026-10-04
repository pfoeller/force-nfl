#!/usr/bin/env python3
"""Research-only explicit checks; no default-catalog addition and no network."""
import ast,csv,hashlib,json,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent.parent
commands=[['node','research/cycle7/roster.mjs'],[sys.executable,'-B','research/cycle7/units.py'],[sys.executable,'-B','research/cycle7/live_wp.py'],['node','research/cycle7/costs.mjs']]
paths=[HERE/'results'/n for n in ['roster_and_bridge.json','units.json','live_wp.json','costs.json']]
baseline={p.name:p.read_bytes().replace(b'\r\n',b'\n') for p in paths}
for repeat in range(2):
 for cmd in commands:
  r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,encoding='utf-8');assert r.returncode==0,r.stderr
 for p in paths:assert p.read_bytes().replace(b'\r\n',b'\n')==baseline[p.name],f'diagnostic changed: {p.name}, run {repeat}'
for item,digest in json.loads((HERE/'results/extraction.json').read_text(encoding='utf-8'))['derived_sha256'].items():assert hashlib.sha256((HERE/'fixtures'/item).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==digest,item
for p in HERE.glob('*.py'):ast.parse(p.read_text(encoding='utf-8-sig'),filename=str(p))
for p in HERE.glob('*.mjs'):subprocess.run(['node','--check',str(p)],check=True,cwd=ROOT)
a=ast.parse((HERE/'live_wp.py').read_text(encoding='utf-8-sig'));fn=next(x for x in a.body if isinstance(x,ast.FunctionDef) and x.name=='features')
fields={x.slice.value for x in ast.walk(fn) if isinstance(x,ast.Subscript) and isinstance(x.value,ast.Name) and x.value.id=='r' and isinstance(x.slice,ast.Constant)}
assert fields <= {'remaining','home_diff','pos_home','yardline','down','distance','home_to','away_to','game_id'},fields
r=json.loads(paths[0].read_text(encoding='utf-8'));assert r['sourceMutation']['signedRemovalDelta']==-8;assert r['checks']==60
u=json.loads(paths[1].read_text(encoding='utf-8'));assert len(u['prototypes'])==4;assert all(v['erased_shared_sd']>0 for v in u['prototypes'].values())
w=json.loads(paths[2].read_text(encoding='utf-8'));assert w['test_games']==271;assert w['models']['linear_decay']['delta_game_bootstrap_ci_95'][0]<0<w['models']['linear_decay']['delta_game_bootstrap_ci_95'][1]
c=json.loads(paths[3].read_text(encoding='utf-8'));assert c['worst']['peakCallsMinute']==352<600
print('PASS: twice LF-normalized byte-identical diagnostics; 2 pinned fixtures; Python/Node syntax; real-source sign mutation; 60 allocator checks; shared-interaction conservation; causal/neutral/label WP controls; cost stress')
