#!/usr/bin/env python3
"""Research only. Predeclared state logistic models, 2024 fit / 2025 test.
Pregame addition is a causal neutral-start Elo PROXY, NOT canonical FORCE.
Missing exact causal historical unit/retro snapshots prevents FORCE promotion.
Regulation only, decisive games, game-clock-minute pre-play sampling, equal game
weight. No sportsbook/provider WP, EPA, result or post-play score in features.
"""
import csv,json,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
rows=list(csv.DictReader((HERE/'fixtures/wp_states.csv').open()))
units=list(csv.DictReader((HERE/'fixtures/unit_games.csv').open()))
def priors(us):
 games={}
 for r in us:
  gid=r['game_id'];parts=gid.split('_');away,home=parts[-2:]
  result=float(r['result'])*(1 if r['team']==home else -1)
  games[gid]=(int(r['year']),int(r['week']),home,away,result)
 elo={};out={}
 for year in sorted({g[0] for g in games.values()}):
  elo={t:1500+.7*(v-1500) for t,v in elo.items()}
  for week in sorted({g[1] for g in games.values() if g[0]==year}):
   batch=[(gid,g) for gid,g in sorted(games.items()) if g[:2]==(year,week)];updates={}
   for gid,(_,_,h,a,result) in batch:
    for t in (h,a):elo.setdefault(t,1500.)
    logit=math.log(10)*(elo[h]-elo[a]+50)/400;out[gid]=logit
    p=1/(1+math.exp(-logit));d=20*((1 if result>0 else 0 if result<0 else .5)-p)
    updates[h]=updates.get(h,0)+d;updates[a]=updates.get(a,0)-d
   for t,v in updates.items():elo[t]+=v
 return out
prior=priors(units)
mut=[dict(r) for r in units]
for r in mut:
 if int(r['year'])==2025 and int(r['week'])==18:r['result']=str(-float(r['result']))
pm=priors(mut)
assert all(pm[k]==v for k,v in prior.items() if k.startswith('2025_') and int(k.split('_')[1])<=18),'future finals cannot affect pregame prior'
def features(r,mode='state',drop=None):
 rem=float(r['remaining'])/3600;diff=float(r['home_diff'])/7;pos=2*float(r['pos_home'])-1;field=(50-float(r['yardline']))/50;down=int(r['down'])
 # Score/clock interaction increases leverage as remaining time declines.
 d=0 if drop=='score' else diff;time=1 if drop=='clock' else rem
 vals=[d,d/(.15+math.sqrt(time)),time,d*time,pos,pos*field,pos*float(r['distance'])/10,pos*(down==3),pos*(down==4),(float(r['home_to'])-float(r['away_to']))/3]
 if drop=='field':vals[5]=0
 if drop=='down_distance':vals[6:9]=[0,0,0]
 if mode=='constant':vals.append(prior[r['game_id']])
 if mode=='linear_decay':vals.append(prior[r['game_id']]*rem)
 if mode=='piecewise':vals.extend([prior[r['game_id']]*(rem>.75),prior[r['game_id']]*(.25<rem<=.75),prior[r['game_id']]*(rem<=.25)])
 return vals
train=[r for r in rows if r['year']=='2024'];test=[r for r in rows if r['year']=='2025']
def game_weights(rs):
 counts={}
 for r in rs:counts[r['game_id']]=counts.get(r['game_id'],0)+1
 return np.array([1/counts[r['game_id']] for r in rs])
w=game_weights(train);wt=game_weights(test);yt=np.array([int(r['label']) for r in test])
def fit(mode,drop=None):
 x=np.array([features(r,mode,drop) for r in train]);tx=np.array([features(r,mode,drop) for r in test]);mu=x.mean(0);sd=x.std(0);sd[sd<1e-12]=1
 x=np.column_stack([np.ones(len(x)),(x-mu)/sd]);tx=np.column_stack([np.ones(len(tx)),(tx-mu)/sd]);y=np.array([int(r['label']) for r in train]);coef=np.zeros(x.shape[1]);pen=np.eye(len(coef))*.25;pen[0,0]=0
 for _ in range(30):
  p=1/(1+np.exp(-np.clip(x@coef,-40,40)));grad=x.T@(w*(y-p))-pen@coef;h=x.T@((w*p*(1-p))[:,None]*x)+pen
  step=np.linalg.solve(h+np.eye(len(coef))*1e-9,grad);coef+=step
  if np.max(np.abs(step))<1e-9:break
 pred=1/(1+np.exp(-np.clip(tx@coef,-40,40)));return pred,coef,mu,sd
preds={};out={'domain':'regulation decisive games; causal generic Elo proxy, not canonical FORCE','train_games':len({r['game_id'] for r in train}),'test_games':len({r['game_id'] for r in test}),'train_states':len(train),'test_states':len(test),'models':{}}
def metrics(p,ix=None):
 mask=np.ones(len(test),dtype=bool) if ix is None else ix;pw=p[mask];yy=yt[mask];ww=wt[mask];bins=[];ece=0
 for lo in np.arange(0,1,.1):
  ok=(pw>=lo)&(pw<lo+.1)
  if ok.any():
   pp=float(np.average(pw[ok],weights=ww[ok]));obs=float(np.average(yy[ok],weights=ww[ok]));share=ww[ok].sum()/ww.sum();ece+=share*abs(pp-obs);bins.append({'lower':round(float(lo),1),'predicted':pp,'observed':obs,'states':int(ok.sum())})
 return {'brier':float(np.average((pw-yy)**2,weights=ww)),'ece_10_bins':float(ece),'bins':bins}
remaining=np.array([float(r['remaining']) for r in test]);early=remaining>=2700;late=remaining<=900;middle=~(early|late)
for mode in ('state','constant','linear_decay','piecewise'):
 p,c,mu,sd=fit(mode);preds[mode]=p;out['models'][mode]={'all':metrics(p),'early':metrics(p,early),'middle':metrics(p,middle),'late':metrics(p,late),'coefficients_standardized':c.tolist(),'feature_means':mu.tolist(),'feature_sd':sd.tolist()}
 # Predictor survives without any test labels; flipping test labels leaves predictions identical.
 for r in test:r['label']=str(1-int(r['label']))
 p2,_,_,_=fit(mode);assert np.array_equal(p,p2),'test labels cannot affect model predictions'
 for r in test:r['label']=str(1-int(r['label']))
out['feature_ablations']={}
for drop in ('score','clock','field','down_distance'):
 p,_,_,_=fit('state',drop);out['feature_ablations'][drop]=metrics(p)['brier']
# Negative control: neutral prior adds no information; don't manufacture an improvement.
saved=dict(prior)
for gid in prior:prior[gid]=0
neutral,_,_,_=fit('linear_decay');assert np.max(np.abs(neutral-preds['state']))<1e-10
prior.clear();prior.update(saved)
ids=sorted({r['game_id'] for r in test});rng=np.random.default_rng(71006)
for mode in ('constant','linear_decay','piecewise'):
 diffs=np.array([np.mean((preds[mode][np.array([r['game_id']==gid for r in test])]-yt[np.array([r['game_id']==gid for r in test])])**2-(preds['state'][np.array([r['game_id']==gid for r in test])]-yt[np.array([r['game_id']==gid for r in test])])**2) for gid in ids]);boot=np.mean(diffs[rng.integers(0,len(ids),size=(1000,len(ids)))],axis=1)
 out['models'][mode]['delta_game_bootstrap_ci_95']=np.quantile(boot,[.025,.975]).tolist()
out['checks']=['future-result prior mutation','neutral-prior identity','deterministic fitted predictions','no forbidden feature fields','regulation/tie abstention']
(HERE/'results/live_wp.json').write_text(json.dumps(out,indent=2,sort_keys=True,allow_nan=False)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'domain':out['domain'],'games':[out['train_games'],out['test_games']],'models':{k:{band:v[band]['brier'] for band in ['all','early','middle','late']}|({'ci':v['delta_game_bootstrap_ci_95']} if 'delta_game_bootstrap_ci_95' in v else {}) for k,v in out['models'].items()},'ablations':out['feature_ablations']},indent=2))
