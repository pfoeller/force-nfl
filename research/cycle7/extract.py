#!/usr/bin/env python3
"""Research only. Extract paired unit outcomes and game-clock-minute states.
No network. --raw-dir contains four files specified by inputs.json; verify hashes.
Derived nflverse data: CC BY 4.0; attribution and limitations in README.md.
"""
import argparse,csv,gzip,hashlib,json,math
from collections import defaultdict
from pathlib import Path
HERE=Path(__file__).resolve().parent
F=lambda r,k: float(r[k]) if r.get(k) not in ('',None,'NA','NaN') else float('nan')
T=lambda r,k: r.get(k,'').strip().lower() in ('1','1.0','true')
def extract(raw):
 manifest=json.loads((HERE/'inputs.json').read_text(encoding='utf-8'))
 for item in manifest:
  assert hashlib.sha256((raw/item['name']).read_bytes()).hexdigest()==item['sha256'],item['name']
 allunits=[];allstates=[];counts={}
 for year in (2024,2025):
  with (raw/f'players_{year}.csv').open(encoding='utf-8-sig',newline='') as f:
   positions={r['player_id']:r['position'] for r in csv.DictReader(f)}
  units={};states={};games={};rows=0;ot=0;excluded=0
  def unit(gid,team):
   return units.setdefault((gid,team),dict(year=year,game_id=gid,team=team,week=0,qb_n=0,qb_sum=0.,db=0,disrupt=0,sacks=0,pass_n=0,pass_sum=0.,recv_n=0,recv_sum=0.,rb_n=0,rb_sum=0.,stuff=0,off_n=0,off_sum=0.))
  with gzip.open(raw/f'pbp_{year}.csv.gz','rt',encoding='utf-8-sig',newline='') as f:
   for r in csv.DictReader(f):
    rows+=1
    if r['season_type']!='REG':continue
    gid=r['game_id'];h=r['home_team'];a=r['away_team'];week=int(float(r['week']));result=F(r,'result')
    games[gid]=dict(year=year,game_id=gid,home=h,away=a,week=week,result=result)
    q=F(r,'qtr');ot+=int(math.isfinite(q) and q>4)
    canceled=T(r,'no_play') or r.get('play_type','').strip().lower()=='no_play'
    team=r['posteam'];epa=F(r,'epa')
    if team in (h,a) and math.isfinite(epa) and not canceled and not T(r,'qb_kneel') and not T(r,'qb_spike'):
     u=unit(gid,team);u['week']=week
     normal_down=math.isfinite(F(r,'down')) and 1<=F(r,'down')<=4
     db=normal_down and (T(r,'pass_attempt') or T(r,'sack'))
     qb_run=normal_down and (T(r,'rush_attempt') or T(r,'qb_scramble')) and not T(r,'sack') and (T(r,'qb_scramble') or positions.get(r.get('rusher_player_id'))=='QB')
     if db or qb_run:u['qb_n']+=1;u['qb_sum']+=epa
     if db:u['db']+=1;u['disrupt']+=int(T(r,'sack') or T(r,'qb_hit'));u['sacks']+=int(T(r,'sack'))
     if normal_down and T(r,'pass_attempt') and not T(r,'sack'):
      u['pass_n']+=1;u['pass_sum']+=epa
      if positions.get(r.get('receiver_player_id')) in ('WR','TE'):u['recv_n']+=1;u['recv_sum']+=epa
     if T(r,'rush_attempt') and positions.get(r.get('rusher_player_id')) in ('RB','FB'):
      u['rb_n']+=1;u['rb_sum']+=epa;u['stuff']+=int(F(r,'yards_gained')<=0)
     if db or T(r,'rush_attempt'):u['off_n']+=1;u['off_sum']+=epa
    sec=F(r,'game_seconds_remaining');down=F(r,'down')
    if not (q in (1,2,3,4) and math.isfinite(sec) and 0<=sec<=3600 and down in (1,2,3,4) and team in (h,a) and not canceled and result!=0):excluded+=1;continue
    keys=['total_home_score','total_away_score','ydstogo','yardline_100','home_timeouts_remaining','away_timeouts_remaining']
    if not all(math.isfinite(F(r,k)) for k in keys):continue
    bucket=int(sec//60)
    # First observed eligible pre-play state in each game-clock minute; not wallclock polling.
    key=(gid,bucket)
    if key not in states:
     states[key]=dict(year=year,game_id=gid,week=week,home=h,away=a,remaining=sec,quarter=int(q),home_diff=F(r,'total_home_score')-F(r,'total_away_score'),pos_home=int(team==h),down=int(down),distance=F(r,'ydstogo'),yardline=F(r,'yardline_100'),home_to=F(r,'home_timeouts_remaining'),away_to=F(r,'away_timeouts_remaining'),label=int(result>0))
  for (gid,t),u in sorted(units.items()):
   g=games[gid];opp=g['away'] if t==g['home'] else g['home'];other=units[(gid,opp)]
   row={k:u[k] for k in ('year','game_id','team','week')};row['opponent']=opp;row['result']=g['result'] if t==g['home'] else -g['result']
   for name,num,den in [('qb_epa','qb_sum','qb_n'),('pass_epa','pass_sum','pass_n'),('receiver_epa','recv_sum','recv_n'),('rb_epa','rb_sum','rb_n'),('off_epa','off_sum','off_n')]:row[name]=u[num]/u[den] if u[den] else None
   row.update(protection=-u['disrupt']/u['db'],sack_rate=u['sacks']/u['db'],rush_block_proxy=1-u['stuff']/u['rb_n'] if u['rb_n'] else None,pass_rush=other['disrupt']/other['db'],coverage=-other['pass_sum']/other['pass_n'],run_defense=-other['rb_sum']/other['rb_n'] if other['rb_n'] else None,qb_n=u['qb_n'],receiver_n=u['recv_n'],rb_n=u['rb_n'])
   allunits.append(row)
  allstates.extend(states[k] for k in sorted(states))
  counts[str(year)]=dict(pbp_rows=rows,games=len(games),unit_rows=len(units),minute_states=len(states),ot_rows=ot,tied_games=sum(g['result']==0 for g in games.values()),excluded_state_rows=excluded)
 for name,data in [('unit_games.csv',allunits),('wp_states.csv',allstates)]:
  with (HERE/'fixtures'/name).open('w',encoding='utf-8',newline='') as f:
   writer=csv.DictWriter(f,fieldnames=list(data[0]),lineterminator='\n');writer.writeheader();writer.writerows(data)
 result=dict(counts=counts,derived_sha256={n:hashlib.sha256((HERE/'fixtures'/n).read_bytes()).hexdigest() for n in ('unit_games.csv','wp_states.csv')})
 (HERE/'results/extraction.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n',encoding='utf-8',newline='\n');print(json.dumps(result,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--raw-dir',type=Path,required=True);extract(p.parse_args().raw_dir)
