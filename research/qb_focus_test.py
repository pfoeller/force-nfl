import sys, json, copy, numpy as np
sys.path.insert(0,'/mnt/data/qb_carryover_test/celo/Celo')
from config import EloConfig
from elo import EloModel
from qb import QBModel
import data as d
ALL=range(2014,2026); EVAL=range(2021,2026)
cfg0=EloConfig(); tuned=json.load(open('/mnt/data/qb_carryover_test/celo/Celo/sample_data/tuned_config.json'))
for k,v in tuned.items():
    if hasattr(cfg0,k): setattr(cfg0,k,v)
for k in ['use_team_av_prior','use_designation_injury']:
    if hasattr(cfg0,k): setattr(cfg0,k,False)

class ReanchorElo(EloModel):
    def __init__(self,cfg, expected_starter, alpha=1.0):
        super().__init__(cfg); self.expected=expected_starter; self.alpha=alpha
    def _revert_season(self):
        ended=self._cur_season; next_s=(ended+1) if ended is not None else None
        if next_s is not None and self.alpha:
            for team in list(self.team_elo):
                q=self.expected.get((next_s,team))
                if not q: continue
                self.qb._ensure_qb(q); self.qb._ensure_team(team)
                v=self.qb.qb_value[q]; b=self.qb.qb_baseline[team]
                adj=float(np.clip(self.cfg.qb_weight*(v-b),-self.cfg.qb_cap,self.cfg.qb_cap))
                self.team_elo[team]+=self.alpha*adj
                self.qb.qb_baseline[team]=b+self.alpha*(v-b)
        return super()._revert_season()

class QBRate(QBModel):
    def __init__(self,cfg,rate): super().__init__(cfg); self.rate=rate
    def update(self,team,qb_id,qb_epa,result_margin_signal):
        if not self.cfg.use_qb_adjustment: return
        self._ensure_qb(qb_id); self._ensure_team(team)
        if qb_epa is not None and not (isinstance(qb_epa,float) and np.isnan(qb_epa)): target=float(qb_epa)*self.epa_scale
        else: target=self.qb_value[qb_id]+result_margin_signal
        n=self.qb_games[qb_id]; a=(self.cfg.qb_k/100.0)*(1.0+2.0/(n+1)); a=min(a,0.85)
        self.qb_value[qb_id]+=a*(target-self.qb_value[qb_id]); self.qb_games[qb_id]+=1
        self.qb_baseline[team]+=self.rate*(self.qb_value[qb_id]-self.qb_baseline[team])
class RateModel(EloModel):
    def __init__(self,cfg,rate): super().__init__(cfg); self.qb=QBRate(cfg,rate)

def score(res,early=False):
    x=res[res.season.isin(EVAL)]
    if early: x=x[x.week<=4]
    return float(np.mean((x.p_home.astype(float)-x.result.astype(float))**2))

seeds=[7,19,31]
for inj in [0.045,0.10]:
    rows=[]
    for seed in seeds:
        games,truth=d.make_synthetic(ALL,seed=seed,qb_injury_rate=inj)
        exp={(s,t): info['qb_id'][t] for s,info in truth['by_season'].items() for t in d.TEAMS}
        models={
          'base':EloModel(copy.deepcopy(cfg0)),
          'reanchor75':ReanchorElo(copy.deepcopy(cfg0),exp,.75),
          'reanchor100':ReanchorElo(copy.deepcopy(cfg0),exp,1.0),
          'rate025':RateModel(copy.deepcopy(cfg0),.025),
          'rate050':RateModel(copy.deepcopy(cfg0),.05),
        }
        vals={k:m.run(games) for k,m in models.items()}
        rows.append({k:(score(v,False),score(v,True)) for k,v in vals.items()})
    print('inj',inj)
    for k in rows[0]:
        allm=np.mean([r[k][0] for r in rows]); early=np.mean([r[k][1] for r in rows])
        baseall=np.mean([r['base'][0] for r in rows]); baseearly=np.mean([r['base'][1] for r in rows])
        print(k,'all',round(allm,6),'d',round(allm-baseall,6),'early',round(early,6),'d',round(early-baseearly,6))
