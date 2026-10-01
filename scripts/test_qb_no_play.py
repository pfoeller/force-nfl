"""Feed-shaped canceled opportunities must not enter actual QB performance."""
import importlib.util
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('force_server',root/'force_server.py')
server=importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
checks=0
def check(value,label):
    global checks
    assert value,label
    checks+=1
def row(**values):
    r={'season_type':'REG','game_id':'2026_01_KC_BUF','week':'1','home_team':'BUF',
       'away_team':'KC','posteam':'BUF','defteam':'KC','drive':'1','down':'1',
       'epa':'2','success':'1','passer_player_id':'QB1','play_id':'1'}
    r.update({k:str(v) for k,v in values.items()})
    return r
base=[row(pass_attempt=1,passing_yards=10),row(posteam='KC',defteam='BUF',pass_attempt=1,passer_player_id='QB2')]
def aggregate(rows):
    return server._defensive_points_per_drive_games(rows,qb_player_ids={'QB1'})[0]
original=aggregate(base)
categories={
    'scramble':row(qb_scramble=1,rush_attempt=1), # live pattern has no rusher ID
    'designedRun':row(rush_attempt=1,rusher_player_id='QB1'),
    'pass':row(pass_attempt=1,passing_yards=80,pass_touchdown=1,cpoe=30),
    'sack':row(pass_attempt=1,sack=1,qb_hit=1,yards_gained=-8),
}
fields=['qb_total_epa','qb_plays','qb_rush_epa','qb_rush_attempts','coverage_pass_epa',
        'coverage_pass_attempts','coverage_pass_successes','pass_yards','pass_tds',
        'sacks','sack_yards','cpoe','pass_protection_dropbacks','pass_protection_disruptions']
for label,play in categories.items():
    for indicator in ({'play_type':' No_Play '},{'no_play':'true'}):
        canceled={**play,**indicator}
        if 'play_type' in indicator:check('no_play' not in canceled,'live fixture lacks no_play flag')
        g=aggregate(base+[canceled])
        for field in fields:
            check(g.get('home_'+field)==original.get('home_'+field),f'{label}/{indicator}: excludes {field}')
        canceled['play_id']='2'
        charting=[{'nflverse_game_id':canceled['game_id'],'nflverse_play_id':'2','n_pass_rushers':'4','was_pressure':'1'}]
        pressure,meta=server._v143_pressure_context(base+[canceled],charting)
        check(meta['classified_dropbacks']==2,f'{label}: no canceled pressure opportunity')
        check(meta['joined_dropbacks']==0,f'{label}: canceled charted pressure does not join')
        check(pressure[(base[0]['game_id'],'BUF')]['standard_dropbacks']==0,f'{label}: canceled standard-rush opportunity excluded')
        check(pressure[(base[0]['game_id'],'BUF')]['clean_plays']==1,f'{label}: clean numerator/denominator unchanged')
for label,play in categories.items():
    g=aggregate(base+[play])
    check(g['home_qb_plays']==2,f'ordinary {label} counted once')
    check(g['home_qb_total_epa']==4,f'ordinary {label} numerator consistent')
for label,play in [('kneel',row(rush_attempt=1,rusher_player_id='QB1',qb_kneel=1)),('spike',row(pass_attempt=1,qb_spike=1))]:
    g=aggregate(base+[play])
    check(g['home_qb_plays']==1 and g['home_qb_total_epa']==2,label+' excluded')
both=aggregate(base+[row(pass_attempt=1,rush_attempt=1,qb_scramble=1,rusher_player_id='QB1')])
check(both['home_qb_plays']==2 and both['home_qb_rush_attempts']==1,'scramble union counted once')
penalty=aggregate(base+[row(pass_attempt=1,penalty=1,play_type='pass')])
check(penalty['home_qb_plays']==2,'accepted/declined penalty flag alone does not cancel actual play')
ghost=aggregate(base+[row(pass_attempt=1,passer_player_id='RB1',play_type='no_play'),row(rush_attempt=1,rusher_player_id='RB1')])
check(ghost['home_qb_plays']==1,'canceled passer cannot establish a QB rushing identity')
for value in ['1','1.0','true','t','yes']:
    check(server._pbp_no_play({'no_play':value,'play_type':'pass'}),'supported truthy flag '+value)
check(not server._pbp_no_play({'no_play':'0','play_type':'pass'}),'ordinary play predicate')
print(f'PASS: QB canceled/no-play correctness ({checks} behavioral checks)')
