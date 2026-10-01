#!/usr/bin/env python3
"""Decaying-overlay companion to qb_carryover_event_study.py."""
from qb_carryover_event_study import *

def run_decay(c, ppm=5, half=4, cap=100,n=8):
    base=pre_rating(c['year'],c['team'],0)
    # post-reversion initial correction
    rev=0.300 if c['year']+1>=2021 else .333
    corr=min(cap,c['missed']*ppm)*(1-rev)
    state=base
    b=[]
    for i,(opp,home,res,margin) in enumerate(c['games'][:n],1):
        orat=pre_rating(c['year'],opp,0)
        overlay=corr*(0.5**((i-1)/half)) if half>0 else 0
        eff=state+overlay
        p=predict(eff,orat,home)
        b.append((p-res)**2)
        # update persistent state using forecast with overlay, but strip overlay after update
        # delta applied to raw state based on adjusted expectation
        ph=wp(eff if home else orat, orat if home else eff)
        pt=ph if home else 1-ph
        diff=(eff+HFA-orat) if home else (orat+HFA-eff)
        if res==.5: wa=0
        elif (res==1 and home) or (res==0 and not home): wa=diff
        else: wa=-diff
        mult=mov_mult(margin,wa)
        state += K*mult*(res-pt)
    return sum(b)/len(b)

grid_ppm=[0,2.5,5,7.5,10]
halfs=[2,4,8,16]
for n in (4,8):
 base=sum(run_decay(c,0,4,n=n) for c in cases.values())/len(cases)
 print('\nN',n,'base',base)
 best=None
 for half in halfs:
  for ppm in grid_ppm[1:]:
   v=sum(run_decay(c,ppm,half,n=n) for c in cases.values())/len(cases)
   rec=(v-base,ppm,half,v)
   if best is None or rec<best: best=rec
 print('best',best)
 # LOO choose combo
 keys=list(cases); basevals=[]; vals=[]; choices=[]
 combos=[(p,h) for p in grid_ppm for h in halfs]
 for hold in keys:
  train=[cases[k] for k in keys if k!=hold]
  sc={(p,h):sum(run_decay(c,p,h,n=n) for c in train)/len(train) for p,h in combos}
  choice=min(sc,key=sc.get)
  basev=run_decay(cases[hold],0,4,n=n); vv=run_decay(cases[hold],*choice,n=n)
  basevals.append(basev); vals.append(vv);choices.append(choice)
 print('LOO delta',sum(vals)/len(vals)-sum(basevals)/len(basevals),'wins',sum(v<b for v,b in zip(vals,basevals)),'choices',choices)
 for k,b,v,ch in zip(keys,basevals,vals,choices): print(k,ch,round(v-b,6))

# clean gate subset: starter absence clearly associated with team decline and returning starter early next year
subset=['2017_HOU_Watson','2019_PIT_Roethlisberger','2020_DAL_Prescott','2020_SF_Garoppolo','2021_BAL_Jackson','2023_LAC_Herbert']
for n in (4,8):
 base=sum(run_decay(cases[k],0,4,n=n) for k in subset)/len(subset)
 print('\nsubset N',n,'base',base)
 for half in [2,4,8]:
  for ppm in [2.5,5,7.5,10]:
   v=sum(run_decay(cases[k],ppm,half,n=n) for k in subset)/len(subset)
   if v<base: print(' improve',ppm,half,round(v-base,6),'wins',sum(run_decay(cases[k],ppm,half,n=n)<run_decay(cases[k],0,4,n=n) for k in subset))
