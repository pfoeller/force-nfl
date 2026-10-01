#!/usr/bin/env python3
"""Leak-safe research harness for Sunday Signal Adaptive v3.

Usage:
  python model/fit_adaptive_market.py \
      --games games.csv \
      --predictions independent_predictions.csv \
      --eval-seasons 2023 2024 2025 \
      --out benchmarks/adaptive_v3_fit.json

`games.csv` should be nflverse schedule/game data. `independent_predictions.csv`
must contain `game_id,p_home` generated BEFORE each game's result by the
independent model. This separation prevents the adaptive layer from quietly
reconstructing a weaker substitute for the validated Elo/QB model.

The search is nested in time:
  * hyperparameters are selected only on seasons before the holdout;
  * the final candidate is then run forward across the holdout;
  * state for game G contains outcomes only from games earlier than G.

A candidate is not marked promotable unless it beats the static market-aware
baseline overall, improves in a majority of holdout seasons, and avoids a
large single-season regression.
"""
from __future__ import annotations

import argparse
import itertools
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

ALIASES = {"STL":"LAR","LA":"LAR","LAR":"LAR","SD":"LAC","LAC":"LAC",
           "OAK":"LV","LV":"LV","JAC":"JAX","JAX":"JAX"}

def canon(x): return ALIASES.get(str(x), str(x))
def clip(p): return min(1-1e-6,max(1e-6,float(p)))
def logit(p):
    p=clip(p); return math.log(p/(1-p))
def sigmoid(x): return 1/(1+math.exp(-x))
def brier(ps, ys): return float(np.mean((np.asarray(ps)-np.asarray(ys))**2))

def implied(o):
    if pd.isna(o) or float(o)==0: return None
    o=float(o); return (-o)/((-o)+100) if o<0 else 100/(o+100)

def market_p(row):
    h,a=implied(row.home_moneyline),implied(row.away_moneyline)
    if h is not None and a is not None and h+a>0: return h/(h+a),"moneyline"
    if not pd.isna(row.spread_line): return sigmoid(float(row.spread_line)/6.5),"spread"
    return None,"none"

def static_p(p_model,p_market,market_weight=.98):
    if p_market is None: return clip(p_model)
    return sigmoid((1-market_weight)*logit(p_model)+market_weight*logit(p_market))

def blank():
    return dict(rs=0.,rw=0.,fs=0.,fw=0.,bs=0.,bw=0.,games=0,mg=0,bfg=0)

def decay(s,d):
    for k in ("rs","rw","fs","fw","bs","bw"): s[k]*=d

def snap(s,c):
    prior=c["prior"]
    resid=s["rs"]/(s["rw"]+prior)
    fav=s["fs"]/(s["fw"]+prior)
    adv=s["bs"]/(s["bw"]+prior)
    mw=np.clip(c["base_mw"]+c["trust"]*adv,c["min_mw"],c["max_mw"])
    return resid,fav,adv,float(mw)

def run(df,cfg,score_seasons):
    states={}
    probs=[]; ys=[]; seasons=[]; static=[]
    # Freeze adaptive state for an entire NFL week. Results from an early game
    # in a slate therefore cannot influence a later game in the same slate.
    for (_, _), batch in df.groupby(["season","week"], sort=False):
        staged=[]
        for r in batch.itertuples(index=False):
            h,a=canon(r.home_team),canon(r.away_team)
            hs=states.setdefault(h,blank()); aws=states.setdefault(a,blank())
            hres,hfav,hadv,hmw=snap(hs,cfg); ares,afav,aadv,amw=snap(aws,cfg)
            p_model=clip(r.p_home)
            pm,_=market_p(r)
            p_static=static_p(p_model,pm,cfg["base_mw"])
            if pm is None:
                p_ad=p_model
            else:
                corr=cfg["resid_gamma"]*(hres-ares)
                sp=None if pd.isna(r.spread_line) else float(r.spread_line)
                if sp is not None and abs(sp)>=cfg["fav_threshold"]:
                    if sp>0: corr += cfg["fav_gamma"]*hfav
                    elif sp<0: corr -= cfg["fav_gamma"]*afav
                if bool(r.div_game) and sp is not None:
                    corr += -sp*cfg["division_compression"]
                corr=float(np.clip(corr,-cfg["max_corr"],cfg["max_corr"]))
                adjm=sigmoid(logit(pm)+corr/cfg["spread_logit_scale"])
                mw=(hmw+amw)/2
                p_ad=sigmoid((1-mw)*logit(p_model)+mw*logit(adjm))
            y=.5 if r.home_score==r.away_score else (1. if r.home_score>r.away_score else 0.)
            if int(r.season) in score_seasons:
                probs.append(p_ad); static.append(p_static); ys.append(y); seasons.append(int(r.season))
            staged.append((r,h,a,p_model,pm,y))

        # Outcome enters state only AFTER every forecast in the weekly batch.
        for r,h,a,p_model,pm,y in staged:
            hs=states[h]; aws=states[a]
            decay(hs,cfg["decay"]); decay(aws,cfg["decay"])
            hs["games"]+=1; aws["games"]+=1
            if pm is not None:
                adv=(p_model-y)**2-(pm-y)**2
                for st in (hs,aws): st["bs"]+=adv; st["bw"]+=1; st["mg"]+=1
                if not pd.isna(r.spread_line):
                    sp=float(r.spread_line); resid=float(r.home_score-r.away_score)-sp
                    hs["rs"]+=resid; hs["rw"]+=1; aws["rs"]-=resid; aws["rw"]+=1
                    if sp>=cfg["fav_threshold"]: hs["fs"]+=resid; hs["fw"]+=1; hs["bfg"]+=1
                    elif sp<=-cfg["fav_threshold"]: aws["fs"]-=resid; aws["fw"]+=1; aws["bfg"]+=1
    if not probs: return None
    out={"brier":brier(probs,ys),"static_brier":brier(static,ys),"n":len(probs),"per_season":{}}
    for s in sorted(set(seasons)):
        idx=[i for i,x in enumerate(seasons) if x==s]
        out["per_season"][str(s)]={"adaptive":brier([probs[i] for i in idx],[ys[i] for i in idx]),
                                   "static":brier([static[i] for i in idx],[ys[i] for i in idx]),"n":len(idx)}
    return out

def cfgs(quick=False):
    if quick:
        grid=dict(decay=[.82,.90],prior=[4.,8.],resid_gamma=[0.,.25,.4],fav_gamma=[0.,.2],
                  min_mw=[.85,.93],trust=[0.,1.5],division_compression=[0.,.04])
    else:
        grid=dict(decay=[.75,.85,.92],prior=[4.,8.,12.],resid_gamma=[0.,.15,.30,.45],
                  fav_gamma=[0.,.15,.30],min_mw=[.82,.90,.95],trust=[0.,1.,2.],
                  division_compression=[0.,.03,.06])
    keys=list(grid)
    for vals in itertools.product(*(grid[k] for k in keys)):
        c=dict(zip(keys,vals)); c.update(base_mw=.98,max_mw=.995,fav_threshold=6.,max_corr=2.5,spread_logit_scale=6.5)
        yield c

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--games",required=True)
    ap.add_argument("--predictions",required=True)
    ap.add_argument("--eval-seasons",nargs="+",type=int,default=[2023,2024,2025])
    ap.add_argument("--quick",action="store_true")
    ap.add_argument("--min-gain",type=float,default=.0005)
    ap.add_argument("--out",default="benchmarks/adaptive_v3_fit.json")
    args=ap.parse_args()

    games=pd.read_csv(args.games,low_memory=False)
    pred=pd.read_csv(args.predictions)
    need={"game_id","p_home"}
    if not need.issubset(pred.columns): raise SystemExit(f"predictions needs {sorted(need)}")
    keep=["game_id","season","week","gameday","home_team","away_team","home_score","away_score",
          "home_moneyline","away_moneyline","spread_line","div_game"]
    missing=[c for c in keep if c not in games.columns]
    if missing: raise SystemExit(f"games missing {missing}")
    df=games[keep].merge(pred[["game_id","p_home"]],on="game_id",how="inner")
    df=df[(df.home_score.notna())&(df.away_score.notna())].copy()
    df=df.sort_values(["gameday","game_id"]).reset_index(drop=True)
    df["div_game"]=pd.to_numeric(df.div_game,errors="coerce").fillna(0).astype(bool)

    eval_set=set(args.eval_seasons); eval_min=min(eval_set)
    pre=sorted(int(x) for x in df.season.unique() if int(x)<eval_min)
    if len(pre)<3: raise SystemExit("Need at least three pre-holdout seasons for nested tuning")
    tune=set(pre[-3:])

    best=None
    for c in cfgs(args.quick):
        r=run(df,c,tune)
        if r is None: continue
        if best is None or r["brier"]<best[0]: best=(r["brier"],c,r)
    if best is None: raise SystemExit("No candidate could be scored")
    _,chosen,tune_result=best
    hold=run(df,chosen,eval_set)
    per=list(hold["per_season"].values())
    wins=sum(x["adaptive"]<x["static"] for x in per)
    worst=max((x["adaptive"]-x["static"] for x in per),default=0)
    gain=hold["static_brier"]-hold["brier"]
    promotable=(gain>=args.min_gain and wins>=math.ceil(len(per)/2) and worst<=.002)
    report={
        "status":"promotable" if promotable else "research-only",
        "method":"nested chronological tuning; pregame-only state; no same-game outcome features",
        "tune_seasons":sorted(tune),"eval_seasons":sorted(eval_set),"chosen":chosen,
        "tune":tune_result,"holdout":hold,
        "absolute_brier_gain":gain,"seasons_improved":wins,"seasons_evaluated":len(per),
        "promotion_guard":{"min_gain":args.min_gain,"majority_seasons_must_improve":True,"max_single_season_regression":.002},
        "promotable":promotable,
    }
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    Path(args.out).write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__=="__main__": main()
