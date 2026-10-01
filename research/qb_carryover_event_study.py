#!/usr/bin/env python3
"""
QB carryover prior-isolation event study.

This is deliberately NOT labeled a full Celo backtest. It uses real Celo
season-end Elo snapshots plus real following-season outcomes for 11 curated
returning-starter injury episodes, then isolates the effect of changing only
the next-season initial prior. Opponent priors are held fixed to make the
question identifiable.

Run: python research/qb_carryover_event_study.py
"""
import json, math, pathlib
ROOT=pathlib.Path(__file__).resolve().parent
D=json.loads((ROOT/'season_end_elo.json').read_text())
M=1505.0; HFA=15.0; SCALE=340.0; K=20.0

def endelo(year, team):
    rows=D[str(year)]
    candidates=[team]
    if team=='LAR': candidates += ['LA','STL']
    if team=='LAC': candidates += ['SD']
    if team=='LV': candidates += ['OAK']
    if team=='WAS': candidates += ['WSH']
    if team=='JAX': candidates += ['JAC']
    for c in candidates:
        if c in rows: return float(rows[c])
    raise KeyError((year,team,candidates))

def pre_rating(year, team, restore=0.0):
    # restore is applied to prior-season end rating before normal offseason regression.
    nextyr=year+1
    rev=0.300 if nextyr>=2021 else 0.333
    e=endelo(year,team)+restore
    return (1-rev)*e+rev*M

def wp(home_r, away_r):
    return 1/(1+10**(-((home_r+HFA)-away_r)/SCALE))

def mov_mult(margin, winner_adv):
    return math.log(max(abs(margin),1.0)+1.0)*(2.2/(winner_adv*0.001+2.2))

def predict(team_r, opp_r, home):
    ph=wp(team_r if home else opp_r, opp_r if home else team_r)
    return ph if home else 1-ph

def update(team_r, opp_r, home, result, margin):
    # Update only affected team; opponent's preseason rating is held fixed to isolate carryover prior.
    ph=wp(team_r if home else opp_r, opp_r if home else team_r)
    p=ph if home else 1-ph
    # winner Elo advantage in home-perspective space
    diff=(team_r+HFA-opp_r) if home else (opp_r+HFA-team_r)
    if result==0.5: wa=0
    elif (result==1 and home) or (result==0 and not home): wa=diff
    else: wa=-diff
    mult=mov_mult(margin,wa)
    delta=result-p
    return team_r + K*mult*delta

# team result is 1 win, 0 loss, .5 tie. margin is team points - opponent points.
cases={
'2008_NE_Brady': dict(year=2008,team='NE',missed=15,starter='Tom Brady', games=[
 ('BUF',1,1,1),('NYJ',0,0,-7),('ATL',1,1,16),('BAL',1,1,6),('DEN',0,0,-3),('TEN',1,1,59),('TB',0,1,28),('MIA',1,1,10)]),
'2017_HOU_Watson': dict(year=2017,team='HOU',missed=10,starter='Deshaun Watson',games=[
 ('NE',0,0,-7),('TEN',0,0,-3),('NYG',1,0,-5),('IND',0,1,3),('DAL',1,1,3),('BUF',1,1,7),('JAX',0,1,13),('MIA',1,1,19)]),
'2019_PIT_Roethlisberger': dict(year=2019,team='PIT',missed=14,starter='Ben Roethlisberger',games=[
 ('NYG',0,1,10),('DEN',1,1,5),('HOU',1,1,7),('PHI',1,1,9),('CLE',1,1,31),('TEN',0,1,3),('BAL',0,1,4),('DAL',0,1,5)]),
'2020_DAL_Prescott': dict(year=2020,team='DAL',missed=11,starter='Dak Prescott',games=[
 ('TB',0,0,-2),('LAC',0,1,3),('PHI',1,1,20),('CAR',1,1,8),('NYG',1,1,24),('NE',0,1,6),('MIN',0,1,4),('DEN',1,0,-14)]),
'2020_SF_Garoppolo': dict(year=2020,team='SF',missed=10,starter='Jimmy Garoppolo',games=[
 ('DET',0,1,8),('PHI',0,1,6),('GB',1,0,-2),('SEA',1,0,-7),('ARI',0,0,-7),('IND',1,0,-12),('CHI',0,1,11),('ARI',1,0,-14)]),
'2021_BAL_Jackson': dict(year=2021,team='BAL',missed=5,starter='Lamar Jackson',games=[
 ('NYJ',0,1,15),('MIA',1,0,-4),('NE',0,1,11),('BUF',1,0,-3),('CIN',1,1,2),('NYG',0,0,-4),('CLE',1,1,3),('TB',0,1,5)]),
'2022_LAR_Stafford': dict(year=2022,team='LAR',missed=8,starter='Matthew Stafford',games=[
 ('SEA',0,1,17),('SF',1,0,-7),('CIN',0,0,-3),('IND',0,1,6),('PHI',1,0,-9),('ARI',1,1,17),('PIT',1,0,-7),('DAL',0,0,-23)]),
'2023_CIN_Burrow': dict(year=2023,team='CIN',missed=7,starter='Joe Burrow',games=[
 ('NE',1,0,-6),('KC',0,0,-1),('WAS',1,0,-5),('CAR',0,1,10),('BAL',1,0,-3),('NYG',0,1,10),('CLE',0,1,7),('PHI',1,0,-20)]),
'2023_LAC_Herbert': dict(year=2023,team='LAC',missed=4,starter='Justin Herbert',games=[
 ('LV',1,1,12),('CAR',0,1,23),('PIT',0,0,-10),('KC',1,0,-7),('DEN',0,1,7),('ARI',0,0,-2),('NO',1,1,18),('CLE',0,1,17)]),
'2024_DAL_Prescott': dict(year=2024,team='DAL',missed=9,starter='Dak Prescott',games=[
 ('PHI',0,0,-4),('NYG',1,1,3),('CHI',0,0,-17),('GB',1,.5,0),('NYJ',0,1,15),('CAR',0,0,-3),('WAS',1,1,22),('DEN',0,0,-20)]),
'2024_JAX_Lawrence': dict(year=2024,team='JAX',missed=7,starter='Trevor Lawrence',games=[
 ('CAR',1,1,16),('CIN',0,0,-4),('HOU',1,1,7),('SF',0,1,5),('KC',1,1,3),('SEA',1,0,-8),('LAR',1,0,-28),('LV',0,1,1)]),
}

def run_case(c, restore_per_missed=0.0, cap=100, n=8):
    restore=min(cap,c['missed']*restore_per_missed)
    tr=pre_rating(c['year'],c['team'],restore)
    b=[]
    preds=[]
    for i,(opp,home,res,margin) in enumerate(c['games'][:n],1):
        orat=pre_rating(c['year'],opp,0)
        p=predict(tr,orat,home)
        b.append((p-res)**2)
        preds.append((i,p,res,tr,orat))
        tr=update(tr,orat,home,res,margin)
    return sum(b)/len(b), preds

grid=[0,1.25,2.5,3.75,5,7.5,10]
print('cases',len(cases))
for n in (4,8):
    print('\nN',n)
    for r in grid:
        vals=[]
        for c in cases.values(): vals.append(run_case(c,r,n=n)[0])
        print(r, round(sum(vals)/len(vals),6), 'delta', round(sum(vals)/len(vals)-sum(run_case(cases[k],0,n=n)[0] for k in cases)/len(cases),6))
# leave-one-out select restore per missed on other episodes, score held-out
for n in (4,8):
    base=[]; cv=[]; chosen=[]
    keys=list(cases)
    for hold in keys:
        train=[k for k in keys if k!=hold]
        scores={r:sum(run_case(cases[k],r,n=n)[0] for k in train)/len(train) for r in grid}
        best=min(scores,key=scores.get)
        b=run_case(cases[hold],0,n=n)[0]; v=run_case(cases[hold],best,n=n)[0]
        base.append(b);cv.append(v);chosen.append(best)
    print('\nLOO n',n,'base',sum(base)/len(base),'cv',sum(cv)/len(cv),'delta',sum(cv)/len(cv)-sum(base)/len(base),'wins',sum(v<b for v,b in zip(cv,base)),'of',len(base),'chosen',chosen)
    for k,b,v,r in zip(keys,base,cv,chosen): print(k,'r',r,'delta',round(v-b,6))

# Per-case fixed 5 points/missed
print('\nFixed 5 per missed, n=4 / n=8')
for k,c in cases.items():
 print(k, c['missed'], round(run_case(c,5,n=4)[0]-run_case(c,0,n=4)[0],6), round(run_case(c,5,n=8)[0]-run_case(c,0,n=8)[0],6))
