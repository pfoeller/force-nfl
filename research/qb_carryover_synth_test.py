import json, copy
import numpy as np
from config import EloConfig
from elo import EloModel
import data as d

ALL=range(2012,2026)
EVAL=range(2021,2026)
cfgbase=EloConfig()
tuned=json.load(open('sample_data/tuned_config.json'))
for k,v in tuned.items():
    if hasattr(cfgbase,k): setattr(cfgbase,k,v)
for k in ['use_team_av_prior','use_designation_injury']:
    if hasattr(cfgbase,k): setattr(cfgbase,k,False)

class ReanchorElo(EloModel):
    def __init__(self,cfg, expected_starter, alpha=1.0):
        super().__init__(cfg); self._expected_starter=expected_starter; self._reanchor_alpha=alpha
    def _revert_season(self):
        ended=self._cur_season; next_s=(ended+1) if ended is not None else None
        if next_s is not None and self._reanchor_alpha:
            for team in list(self.team_elo):
                q=self._expected_starter.get((next_s,team))
                if not q: continue
                self.qb._ensure_qb(q); self.qb._ensure_team(team)
                v=self.qb.qb_value[q]; b=self.qb.qb_baseline[team]
                adj=float(np.clip(self.cfg.qb_weight*(v-b), -self.cfg.qb_cap, self.cfg.qb_cap))
                a=self._reanchor_alpha
                self.team_elo[team]+=a*adj
                self.qb.qb_baseline[team]=b+a*(v-b)
        return super()._revert_season()

def brier(res):
    r=res[res.season.isin(EVAL)]
    return float(np.mean((r.p_home.astype(float)-r.result.astype(float))**2))

def run_model(games,expected,a):
    cfg=copy.deepcopy(cfgbase)
    m=EloModel(cfg) if a==0 else ReanchorElo(cfg,expected,a)
    return brier(m.run(games))

for injury_rate in [0.045,0.10]:
    print('\nINJ',injury_rate)
    alphas=[0,0.25,0.5,0.75,1.0]
    vals={a:[] for a in alphas}
    for seed in [7,19,31]:
        games, truth=d.make_synthetic(ALL,seed=seed,qb_injury_rate=injury_rate)
        expected={(s,t): info['qb_id'][t] for s,info in truth['by_season'].items() for t in d.TEAMS}
        for a in alphas:
            vals[a].append(run_model(games,expected,a))
    base=np.mean(vals[0])
    for a in alphas:
        arr=np.array(vals[a]); dif=arr-np.array(vals[0])
        print(f'alpha {a:>4}: mean={arr.mean():.6f} delta={arr.mean()-base:+.6f} perseed={[round(x,6) for x in dif]}')
