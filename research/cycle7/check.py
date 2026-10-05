#!/usr/bin/env python3
"""Research-only explicit checks; no default-catalog addition and no network."""
import ast,csv,hashlib,importlib.util,json,subprocess,sys
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
# Verify the actual extraction boundary, not only the downstream CSV schema.
ea=ast.parse((HERE/'extract.py').read_text(encoding='utf-8-sig'))
statefn=next(x for x in ea.body if isinstance(x,ast.FunctionDef) and x.name=='wp_state')
allowed={'season','game_id','week','home_team','away_team','posteam','game_seconds_remaining','qtr','score_differential','down','ydstogo','yardline_100','home_timeouts_remaining','away_timeouts_remaining','result'}
def score_contract(fn):
 fields=set()
 for x in ast.walk(fn):
  if isinstance(x,ast.Subscript) and isinstance(x.value,ast.Name) and x.value.id=='r':
   assert isinstance(x.slice,ast.Constant),'dynamic state-field access forbidden'
   fields.add(x.slice.value)
  if isinstance(x,ast.Call) and isinstance(x.func,ast.Name):
   assert x.func.id in {'dict','int','float','F'},'unreviewed state helper'
   if x.func.id=='F':
    assert len(x.args)==2 and isinstance(x.args[0],ast.Name) and x.args[0].id=='r' and isinstance(x.args[1],ast.Constant)
    fields.add(x.args[1].value)
 assert fields<=allowed and 'score_differential' in fields,fields
 assert not any(k.startswith('total_') and k.endswith('_score') or k.endswith('_post') for k in fields)
score_contract(statefn)
# Guard the assignment too: helper checks are ineffective if extraction bypasses it.
writes=[x for x in ast.walk(ea) if isinstance(x,ast.Assign) and any(isinstance(t,ast.Subscript) and isinstance(t.value,ast.Name) and t.value.id=='states' for t in x.targets)]
assert len(writes)==1 and ast.unparse(writes[0].value)=='wp_state(r)'
for field in ('total_home_score','total_away_score','posteam_score_post'):
 bad=ast.parse(ast.unparse(statefn).replace("F(r, 'score_differential')",f"F(r, '{field}')")).body[0]
 try:score_contract(bad)
 except AssertionError:pass
 else:raise AssertionError('score-source mutation escaped guard')
spec=importlib.util.spec_from_file_location('cycle7_extract',HERE/'extract.py');extract=importlib.util.module_from_spec(spec);spec.loader.exec_module(extract)
sample={k:'1' for k in allowed};sample.update(home_team='HOME',away_team='AWAY',posteam='HOME',score_differential='7',result='3')
original=extract.wp_state(sample)
for field in ('total_home_score','total_away_score','posteam_score_post'):sample[field]='999'
assert extract.wp_state(sample)==original,'post-play score poisoning must not change any state'
sample['posteam']='AWAY';assert extract.wp_state(sample)['home_diff']==-7
sample['score_differential']='-7';assert extract.wp_state(sample)['home_diff']==7
r=json.loads(paths[0].read_text(encoding='utf-8'));assert r['sourceMutation']['signedRemovalDelta']==-8;assert r['checks']==60
assert r['identityReach']['teamOptionCombinations']==93 and len(r['identityReach']['offeredRows'])==3
assert r['current'][8]['delta']==119 and r['current'][9]['delta']==67 and r['duplicateCheckbox']['delta']==-8
assert r['sourceMutation']['incumbentExclusion'][3]['before']==64 and r['sourceMutation']['incumbentExclusion'][3]['after']==56
assert all(c['before']==c['after'] for i,c in enumerate(r['sourceMutation']['incumbentExclusion']) if i!=3)
assert r['offlineBridgeMateriality']['zeroBridgeTeams']==32 and r['offlineBridgeMateriality']['maxAbsElo']==0
assert r['current'][0]['remainingSnapshotGames']==1 and not r['current'][0]['expectedWinsDecisionUseful']
u=json.loads(paths[1].read_text(encoding='utf-8'));assert len(u['prototypes'])==4;assert all(v['erased_shared_sd']>0 for v in u['prototypes'].values())
d=u['disjoint_shared_play_diagnostics'];assert len(d)==5
assert abs(d['receiver_vs_non_wrte']['game_corr'])<.25 and d['part_whole_shuffle_null']['mean_game_corr']>.85
assert d['nonstuff_rb_vs_notstuffed']['game_corr']<0
assert 0<d['clean_qb_vs_protection']['game_corr']<u['overlaps']['qb_epa/protection']['game_corr']
assert 0<d['clean_coverage_vs_disruption']['game_corr']<u['overlaps']['pass_rush/coverage']['game_corr']
w=json.loads(paths[2].read_text(encoding='utf-8'));assert w['test_games']==271;assert w['models']['linear_decay']['delta_game_bootstrap_ci_95'][0]<0<w['models']['linear_decay']['delta_game_bootstrap_ci_95'][1]
c=json.loads(paths[3].read_text(encoding='utf-8'));assert c['worst']['peakCallsMinute']==352<600
assert c['envelopes']['low']['calls']==8883 and c['envelopes']['expected']['calls']==92820
print('PASS: extraction AST/poisoned-score source guard; 93 identity misresolutions; incumbent exclusion mutation; 32 zero offline bridges; disjoint and part-whole null diagnostics; twice LF-normalized byte-identical diagnostics; 2 pinned fixtures; Python/Node syntax; real-source sign mutation; 60 allocator checks; shared-interaction conservation; causal/neutral/label WP controls; cost stress')
