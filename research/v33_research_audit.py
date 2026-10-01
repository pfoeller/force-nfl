#!/usr/bin/env python3
"""Reproduce the FORCE V33 evidence audit from the compact bundled snapshot.

This does NOT claim a new whole-model 2008-2025 backtest. The original Celo
archive preserves aggregate metrics plus 2025 recent-game rows, while the QB
regime event study is separately reproducible from season_end_elo.json.
"""
from __future__ import annotations
import contextlib, io, json, math
from pathlib import Path

ROOT=Path(__file__).resolve().parent
BROOT=ROOT.parent
snap=json.loads((ROOT/'v33_source_snapshot.json').read_text())
metrics=snap['metrics']
recent=snap['recent_games_2025']

# Importing the decay study prints its exploratory tables; suppress that here.
buf=io.StringIO()
with contextlib.redirect_stdout(buf):
    import qb_carryover_decay as q

subset=['2017_HOU_Watson','2019_PIT_Roethlisberger','2020_DAL_Prescott',
        '2020_SF_Garoppolo','2021_BAL_Jackson','2023_LAC_Herbert']
base=sum(q.run_decay(q.cases[k],0,4,n=8) for k in subset)/len(subset)
cand=sum(q.run_decay(q.cases[k],7.5,4,n=8) for k in subset)/len(subset)
wins=sum(q.run_decay(q.cases[k],7.5,4,n=8)<q.run_decay(q.cases[k],0,4,n=8) for k in subset)

def raw_brier(hfa,scale):
    e=[]
    for r in recent:
        p=1/(1+10**(-((r['home_elo_pre']+hfa-r['away_elo_pre'])/scale)))
        e.append((p-r['result'])**2)
    return sum(e)/len(e)

raw_base=raw_brier(15,340)
best=(float('inf'),None,None)
for h in range(-5,41,5):
    for s in range(280,501,10):
        b=raw_brier(h,s)
        if b<best[0]: best=(b,h,s)

m_all=metrics['all']; m3=metrics['recent3']; m25=metrics['last']
combined_2324=(m3['brier']*m3['n_games']-m25['brier']*m25['n_games'])/(m3['n_games']-m25['n_games'])
out={
  'version':'V33','generated':'2026-09-16',
  'canonical_independent_baselines':{
    '2008_2025':{'games':m_all['n_games'],'brier':m_all['brier']},
    '2023_2025':{'games':m3['n_games'],'brier':m3['brier']},
    '2025':{'games':m25['n_games'],'brier':m25['brier']},
    '2023_2024_combined_derived':{'games':m3['n_games']-m25['n_games'],'brier':combined_2324,'derivation':'subtract preserved 2025 SSE from preserved 2023-2025 SSE'},
    '2023_individual':None,'2024_individual':None},
  'qb_regime_candidate':{
    'study':'six-case decline-gated returning-starter prior-isolation subset',
    'window':'next-season Weeks 1-8','baseline_brier':base,'candidate_brier':cand,
    'delta_brier':cand-base,'episodes_improved':wins,'episodes':len(subset),
    'rule':{'elo_per_verified_missed_start_pre_reversion':7.5,'pre_reversion_cap':60,'offseason_survival':0.70,'half_life_team_games':4},
    'promotion_scope':'automatic only for mechanically verified registry cases; zero for unverified teams',
    'caveat':'prior-isolation event study, not a full-PBP replay'},
  'probability_mapping_stress_test':{
    'data':'preserved 2025 recent_games only; raw home/away pregame Elo reconstruction, not the full QB/effective-margin probability path',
    'n_games':len(recent),'current_hfa_scale_reconstruction_brier':raw_base,
    'best_same_sample_grid':{'hfa':best[1],'scale':best[2],'brier':best[0],'delta':best[0]-raw_base},
    'decision':'reject for V33: same-sample one-season gain is too small and not walk-forward evidence'},
  'market_policy':{'decision':'unchanged from V32','reason':'the bundle still lacks joint historical FORCE pregame probability + market line rows needed to replay and refit the week-decay schedule without fabrication'},
  'limitations':[
    'The supplied archive preserves aggregate 2023-2025 and 2025 Brier but not separate 2023 and 2024 game-level predictions, so individual 2023/2024 Brier cannot be recovered exactly.',
    'Raw historical full-PBP replay inputs are not bundled, so V33 does not claim a new whole-model 2008-2025 or 2023-2025 Brier after the regime correction.',
    'The automatic regime correction is intentionally registry-gated rather than inferred from missed starts alone.'
  ]}
path=BROOT/'benchmarks/v33_research_audit.json'
path.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
