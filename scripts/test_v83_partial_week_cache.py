from pathlib import Path
import importlib.util, csv, io
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
checks=0
def ok(v,m):
    global checks; checks+=1; assert v,m
header='season,week,season_type,game_id,team,opponent_team,attempts\n'
old=(header+'2026,1,REG,g1,ARI,ATL,30\n2026,1,REG,g2,ATL,ARI,25\n2026,1,REG,g3,BUF,HOU,29\n2026,1,REG,g4,HOU,BUF,31\n').encode()
partial=(header+'2026,2,REG,g5,BUF,DET,33\n2026,2,REG,g5,DET,BUF,28\n').encode()
merged=mod._merge_weekly_csv('/api/team-stats',old,partial)
rows=list(csv.DictReader(io.StringIO(merged.decode())))
ok(len(rows)==6,f'partial Week 2 refresh must retain 4 Week 1 rows and add 2 Week 2 rows, got {len(rows)}')
ok(sum(r['week']=='1' for r in rows)==4,'Week 1 rows were lost')
ok(sum(r['week']=='2' for r in rows)==2,'Week 2 rows missing')
# New official corrections replace the same stable key instead of duplicating it.
corrected=(header+'2026,1,REG,g3,BUF,HOU,35\n').encode()
merged2=mod._merge_weekly_csv('/api/team-stats',merged,corrected)
rows2=list(csv.DictReader(io.StringIO(merged2.decode())))
ok(len(rows2)==6,'correction should replace, not duplicate, stable weekly row')
ok(next(r for r in rows2 if r['game_id']=='g3' and r['team']=='BUF')['attempts']=='35','new correction did not win')
# Non-weekly routes are untouched.
ok(mod._merge_weekly_csv('/api/schedule',old,partial)==partial,'non-weekly upstream must not be merged')
print(f'PASS: V83 partial-week server merge ({checks} checks)')
