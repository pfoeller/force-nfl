#!/usr/bin/env python3
"""Research only: paired-outcome residual probes. These are NOT canonical units.
2024 fit; 2025 holdout; partial ridge subtraction deliberately preserves shared
interaction. Fits are associational, not causal football attribution.
"""
import csv,json,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
rows=list(csv.DictReader((HERE/'fixtures/unit_games.csv').open()))
def data(year):return [r for r in rows if int(r['year'])==year]
def arr(rs,key):return np.array([float(r[key]) if r[key] else np.nan for r in rs])
def corr(x,y):
 ok=np.isfinite(x)&np.isfinite(y);return float(np.corrcoef(x[ok],y[ok])[0,1]) if ok.sum()>2 and np.std(x[ok])*np.std(y[ok])>0 else None
def z(x):return (x-np.nanmean(x))/np.nanstd(x)
def aggregate(rs,values):
 return {t:float(np.mean([values[i] for i,r in enumerate(rs) if r['team']==t])) for t in sorted({r['team'] for r in rs})}
def ranks(v):return {t:i+1 for i,(t,_) in enumerate(sorted(v.items(),key=lambda x:(-x[1],x[0])))}
out={'boundary':'outcome proxies, not production grades or full-stack promotion evidence','n_train':len(data(2024)),'n_test':len(data(2025)),'overlaps':{},'prototypes':{}}
train,test=data(2024),data(2025)
for x,y in [('qb_epa','protection'),('pass_epa','receiver_epa'),('rush_block_proxy','rb_epa'),('pass_rush','coverage'),('qb_epa','off_epa'),('receiver_epa','off_epa'),('rb_epa','off_epa')]:
 a,b=arr(test,x),arr(test,y);aa,bb=aggregate(test,a),aggregate(test,b)
 out['overlaps'][f'{x}/{y}']={'game_corr':corr(a,b),'season_team_corr':corr(np.array(list(aa.values())),np.array(list(bb.values()))),'paired_games':int((np.isfinite(a)&np.isfinite(b)).sum())}
for name,xkey,ykey in [('qb_ol','protection','qb_epa'),('ol_rb','rush_block_proxy','rb_epa'),('rush_coverage','pass_rush','coverage'),('qb_receiver','pass_epa','receiver_epa')]:
 x,y=arr(train,xkey),arr(train,ykey);ok=np.isfinite(x)&np.isfinite(y);center=float(x[ok].mean());beta=float(np.mean((x[ok]-center)*(y[ok]-y[ok].mean()))/(np.var(x[ok])*1.5))
 xt,yt=arr(test,xkey),arr(test,ykey);shared=beta*(xt-center);residual=yt-shared
 assert np.nanmax(np.abs(residual+shared-yt))<1e-12,'interaction retained in ledger'
 # Centered strength outcome, not FORCE rating. This tests relabeling only.
 parent=arr(test,'off_epa') if name!='rush_coverage' else -arr(test,'off_epa')
 # Defense parent above is team's own offensive EPA; label explicitly, no false defense parent claim.
 team_raw=aggregate(test,yt);team_res=aggregate(test,residual);rawrank=ranks(team_raw);newrank=ranks(team_res)
 # Half-season stability is outcome-proxy correlation across team means.
 first=[i for i,r in enumerate(test) if int(r['week'])<=9];second=[i for i,r in enumerate(test) if int(r['week'])>9]
 def stability(v):
  a=aggregate([test[i] for i in first],v[first]);b=aggregate([test[i] for i in second],v[second]);return corr(np.array(list(a.values())),np.array(list(b.values())))
 # Small, predeclared one-lag next-game EPA proxy test: fit train to next same-team game's outcome.
 def next_design(rs,xx,yy,bb):
  pairs=[]
  for t in sorted({r['team'] for r in rs}):
   ix=sorted([i for i,r in enumerate(rs) if r['team']==t],key=lambda i:int(rs[i]['week']))
   for i,j in zip(ix,ix[1:]):
    target=float(rs[j][ykey]) if rs[j][ykey] else np.nan
    if np.isfinite([xx[i],yy[i],target]).all():pairs.append((xx[i],yy[i],yy[i]-bb*(xx[i]-center),target))
  return np.array(pairs)
 tr=next_design(train,x,y,beta);te=next_design(test,xt,yt,beta)
 def mse(cols):
  A=np.column_stack([np.ones(len(tr)),tr[:,cols]]);B=np.column_stack([np.ones(len(te)),te[:,cols]])
  coef=np.linalg.solve(A.T@A+np.diag([0]+[.1]*len(cols)),A.T@tr[:,-1]);return float(np.mean((B@coef-te[:,-1])**2))
 # Raw+shared and residual+shared span identical features. A dramatic gain is not attribution.
 raw_mse=mse([0,1]);partition_mse=mse([0,2]);assert abs(raw_mse-partition_mse)<.0002,'reparameterization has no material predictive magic'
 out['prototypes'][name]={'x':xkey,'y':ykey,'beta_ridge':beta,'center_train':center,'corr_before':corr(xt,yt),'corr_after':corr(xt,residual),'parent_offense_corr_before':corr(yt,parent) if name!='rush_coverage' else None,'parent_offense_corr_after':corr(residual,parent) if name!='rush_coverage' else None,'raw_half_stability':stability(yt),'residual_half_stability':stability(residual),'max_rank_movement':max(abs(rawrank[t]-newrank[t]) for t in rawrank),'rank_moves':{t:newrank[t]-rawrank[t] for t in rawrank if newrank[t]!=rawrank[t]},'next_game_rows':len(te),'next_game_raw_only_mse':mse([1]),'next_game_residual_only_mse':mse([2]),'next_game_raw_plus_shared_mse':raw_mse,'next_game_residual_plus_shared_mse':partition_mse}
 # Negative controls: centering/zero subtraction identity; preserve adverse pressure interaction.
 assert np.allclose(yt-0*(xt-center),yt,equal_nan=True)
 # Removing all x influence without a shared ledger discards measurable signal.
 out['prototypes'][name]['erased_shared_sd']=float(np.nanstd(shared))
for name,probe in out['prototypes'].items():
 xt,yt=arr(test,probe['x']),arr(test,probe['y']);res=yt-probe['beta_ridge']*(xt-probe['center_train']);vals=aggregate(test,res)
 parent_rows=json.loads((HERE/'results/roster_and_bridge.json').read_text(encoding='utf-8'))['profileRows'];by_team={r['team']:r['currentElo'] for r in parent_rows};teams=sorted(vals)
 rawvals=aggregate(test,yt)
 probe['season_raw_vs_bundled_current_elo_corr']=corr(np.array([rawvals[t] for t in teams]),np.array([by_team['LAR' if t=='LA' else t] for t in teams]))
 probe['season_residual_vs_bundled_current_elo_corr']=corr(np.array([vals[t] for t in teams]),np.array([by_team['LAR' if t=='LA' else t] for t in teams]))
# Real 2025 prior-profile grades and current/core parent correlations, distinct from proxies.
p=json.loads((HERE/'results/roster_and_bridge.json').read_text(encoding='utf-8'));profiles=p['profileRows'];out['bundled_prior_correlations']={}
for key in ['qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsScoredPerDriveIndex']:
 v=np.array([float(r[key]) if r[key]!=None else np.nan for r in profiles]);parent=np.array([r['currentElo'] for r in profiles]);out['bundled_prior_correlations'][key]={'parent_current_elo_corr':corr(v,parent),'available':int(np.isfinite(v).sum())}
for a,b in [('qbIndex','olIndex'),('qbIndex','receiverIndex'),('olIndex','rbIndex'),('passRushIndex','coverageIndex')]:out['bundled_prior_correlations'][f'{a}/{b}']=corr(np.array([r[a] for r in profiles],dtype=float),np.array([r[b] for r in profiles],dtype=float))
(HERE/'results/units.json').write_text(json.dumps(out,indent=2,sort_keys=True,allow_nan=False)+'\n',encoding='utf-8',newline='\n');print(json.dumps({k:v for k,v in out.items() if k not in ('bundled_prior_correlations',)},indent=2))
