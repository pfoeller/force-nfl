import pathlib, sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
import force_server as fs

H,A='KC','DEN'

def row(**kw):
    base={'home_team':H,'away_team':A,'posteam':A,'desc':'','play_type':'run','fumble_lost':'0'}
    base.update(kw); return base

# Ordinary fumble.
e=fs._fumble_recovery_events(row(fumbled_1_team='DEN',fumble_recovery_1_team='KC',fumbled_1_player_id='nix',fumble_recovery_1_player_id='jones'),H,A)
assert len(e)==1 and e[0]['kind']=='ordinary' and e[0]['weight']==1.0 and e[0]['fumble_team_expected_recovery']==0.5

# Exact duplicate indexed markers are one loose ball, not two.
e=fs._fumble_recovery_events(row(fumbled_1_team='DEN',fumble_recovery_1_team='KC',fumbled_2_team='DEN',fumble_recovery_2_team='KC',fumbled_1_player_id='nix',fumbled_2_player_id='nix',fumble_recovery_1_player_id='jones',fumble_recovery_2_player_id='jones'),H,A)
assert len(e)==1

# Genuine second fumble with a different fumbler/recoverer remains separate.
e=fs._fumble_recovery_events(row(fumbled_1_team='DEN',fumble_recovery_1_team='KC',fumbled_2_team='KC',fumble_recovery_2_team='DEN',fumbled_1_player_id='nix',fumbled_2_player_id='returner',fumble_recovery_1_player_id='jones',fumble_recovery_2_player_id='den2'),H,A)
assert len(e)==2

# Botched snap: offense recovery is expected and only 30% weight.
e=fs._fumble_recovery_events(row(posteam='KC',aborted_play='1',desc='Aborted. Bad snap. P.Mahomes FUMBLES, recovered by KC.',fumbled_1_team='KC',fumble_recovery_1_team='KC'),H,A)
assert len(e)==1 and e[0]['kind']=='botched_snap' and abs(e[0]['weight']-.30)<1e-12 and abs(e[0]['fumble_team_expected_recovery']-.80)<1e-12

# A defense stealing the same botched snap remains a meaningful low-probability event.
e=fs._fumble_recovery_events(row(posteam='KC',aborted_play='1',desc='Aborted. Bad snap. P.Mahomes FUMBLES, recovered by DEN.',fumbled_1_team='KC',fumble_recovery_1_team='DEN'),H,A)
assert len(e)==1 and e[0]['kind']=='botched_snap' and e[0]['recovery_team']=='DEN'

# Overturned/non-fumble and no-play markers cannot become luck events.
assert fs._fumble_recovery_events(row(desc='Replay: runner was DOWN BY CONTACT. No fumble.',fumbled_1_team='DEN',fumble_recovery_1_team='KC'),H,A)==[]
assert fs._fumble_recovery_events(row(play_type='no_play',desc='FUMBLE recovered by KC',fumbled_1_team='DEN',fumble_recovery_1_team='KC'),H,A)==[]

# No identifiable recovery (e.g. out of bounds) is not a recovery-rate opportunity.
assert fs._fumble_recovery_events(row(desc='DEN runner FUMBLES out of bounds.'),H,A)==[]

print('PASS: V111 true-fumble parser + botched-snap weighting')
