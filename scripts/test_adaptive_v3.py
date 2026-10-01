#!/usr/bin/env python3
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'model'))

from adaptive_v3 import TeamState, DEFAULTS, snapshot, forecast_probability, update_after_game


def game(home='A',away='B',spread=7.0,hs=None,aws=None,div=False):
    return dict(home=home,away=away,spreadLine=spread,homeScore=hs,awayScore=aws,
                homeMoneyline=None,awayMoneyline=None,divisional=div)

# Neutral states: adaptive should be very close to static market/model mix.
states={}
g=game()
f0=forecast_probability(g,1600,1500,states)
assert 0.5 < f0['probability'] < 1
assert abs(f0['context']['correction_points']) < 1e-12

# A 7-point favorite that wins by only 3 underperforms the market by 4 points.
completed=game(hs=24,aws=21)
update_after_game(completed,1600,1500,states)
sa=snapshot(states['A'])
assert sa['residual'] < 0
assert sa['favorite_residual'] < 0

# That history must temper A's next large-favorite forecast, not amplify it.
f1=forecast_probability(g,1600,1500,states)
assert f1['context']['correction_points'] < 0
assert f1['probability'] < f0['probability']

# Division compression is deliberately zero by default: merely toggling DIV
# cannot change a neutral matchup before a fitted coefficient earns promotion.
neutral={}
nd=forecast_probability(game(div=True),1600,1500,neutral)
nn=forecast_probability(game(div=False),1600,1500,neutral)
assert abs(nd['probability']-nn['probability']) < 1e-12

print('adaptive_v3 tests passed')

# The lagged market history also becomes a forecast-only rating overlay when a
# far-future game has no line. Power Score itself remains untouched.
no_line = game(spread=None)
f_hist = forecast_probability(no_line,1600,1500,states)
neutral_hist = forecast_probability(no_line,1600,1500,{})
assert f_hist['adaptive'] is True and f_hist['source'] == 'adaptive-history'
assert f_hist['probability'] < neutral_hist['probability']
print('adaptive-history fallback test passed')
