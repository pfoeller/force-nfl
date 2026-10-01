import json, copy
import numpy as np
from config import EloConfig
from elo import EloModel
from qb import QBModel
import data as d
ALL=range(2012,2026); EVAL=range(2021,2026)
cfg0=EloConfig(); tuned=json.load(open('sample_data/tuned_config.json'))
for k,v in tuned.items():
    if hasattr(cfg0,k): setattr(cfg0,k,v)
for k in ['use_team_av_prior','use_designation_injury']:
    if hasattr(cfg0,k): setattr(cfg0,k,False)

class QBRate(QBModel):
    def __init__(self,cfg,baseline_rate): super().__init__(cfg); self.baseline_rate=baseline_rate
    def update(self,team,qb_id,qb_epa,result_margin_signal):
        if not self.cfg.use_qb_adjustment: return
        self._ensure_qb(qb_id); self._ensure_team(team)
        if qb_epa is not None and not (isinstance(qb_epa,float) and np.isnan(qb_epa)):
            target=float(qb_epa)*self.epa_scale
        else: target=self.qb_value[qb_id]+result_margin_signal
        n=self.qb_games[qb_id]; alpha=(self.cfg.qb_k/100.0)*(1.0+2.0/(n+1))
        alpha=min(alpha,0.55)
        self.qb_value[qb_id]+=alpha*(target-self.qb_value[qb_id]); self.qb_games[qb_id]+=1
        self.qb_baseline[team]+=self.baseline_rate*(self.qb_value[qb_id]-self.qb_baseline[team])
class Model(EloModel):
    def __init__(self,cfg,rate): super().__init__(cfg); self.qb=QBRate(cfg,rate)

def brier(res):
 r=res[res.season.isin(EVAL)]; return float(np.mean((r.p_home.astype(float)-r.result.astype(float))**2))
for injury in [0.045,0.10]:
 print('\nINJ',injury); rates=[0,0.025,0.05,0.075,0.10,0.15,0.20]; vals={r:[] for r in rates}
 for seed in [7,19,31]:
  games,_=d.make_synthetic(ALL,seed=seed,qb_injury_rate=injury)
  for r in rates:
   vals[r].append(brier(Model(copy.deepcopy(cfg0),r).run(games)))
 base=np.mean(vals[0.10])
 for r in rates:
  arr=np.array(vals[r]); print(f'rate {r:.3f}: mean={arr.mean():.6f} delta_vs_0.10={arr.mean()-base:+.6f} perseed={[round(x-y,6) for x,y in zip(vals[r],vals[0.10])]}')
