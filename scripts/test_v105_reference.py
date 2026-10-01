import importlib.util, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
empty={'version':'V106-QB-CURRENT-SEASON-REFERENCE-3','game_count':0,'sample_windows':{}}
assert not m._v106_reference_valid(empty)
windows={}
for n in range(1,5):
    windows[str(n)]={'qb_pass_epa':[0.1]*400,'qb_pass_success_rate':[0.5]*400,'ol_disruption_rate':[0.2]*400}
windows['17']={'qb_pass_epa':[0.1]*32,'qb_pass_success_rate':[0.5]*32,'ol_disruption_rate':[0.2]*32}
good={'version':'V106-QB-CURRENT-SEASON-REFERENCE-3','game_count':272,'sample_windows':windows}
assert m._v106_reference_valid(good)
# Synthetic builder still produces correct rolling windows.
games=[]
for week in range(1,18):
    games.append({'game_id':f'g{week}','week':week,'home':'KC','away':'BUF',
        'home_coverage_pass_epa':3.0,'home_coverage_pass_attempts':30,
        'away_coverage_pass_epa':2.5,'away_coverage_pass_attempts':25,
        'home_pass_protection_disruptions':3,'home_pass_protection_dropbacks':30,
        'away_pass_protection_disruptions':5,'away_pass_protection_dropbacks':25})
w=m._v104_reference_from_drive_games(games,17)
assert len(w['1']['qb_pass_epa'])==34
assert len(w['2']['qb_pass_epa'])==32
assert len(w['4']['qb_pass_epa'])==28
print('PASS: V106 historical reference validation')
