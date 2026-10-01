import importlib.util, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
games=[]
for week in range(1,4):
    games.append({'game_id':f'g{week}','week':week,'home':'KC','away':'BUF',
        'home_coverage_pass_epa':3.0*week,'home_coverage_pass_attempts':30,
        'away_coverage_pass_epa':2.0*week,'away_coverage_pass_attempts':25,
        'home_pass_protection_disruptions':3,'home_pass_protection_dropbacks':30,
        'away_pass_protection_disruptions':5,'away_pass_protection_dropbacks':25})
w=m._v104_reference_from_drive_games(games,3)
assert len(w['1']['qb_pass_epa'])==6
assert len(w['2']['qb_pass_epa'])==4
assert len(w['3']['qb_pass_epa'])==2
assert abs(w['1']['ol_disruption_rate'][0]-.1)<1e-9
assert w['1']['ol_disruption_rate'].count(.1)==3 and w['1']['ol_disruption_rate'].count(.2)==3
print('PASS: V104 historical reference windows')
