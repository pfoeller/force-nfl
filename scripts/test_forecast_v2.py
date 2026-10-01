#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("forecast_v2", ROOT / "model" / "forecast_v2.py")
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)

p = m.independent_probability(1505, 1505)
assert 0.52 < p < 0.53, p

market = m.devig_moneyline(-150, 130)
assert market is not None and 0.55 < market < 0.60, market

smart = m.forecast_probability(1600, 1500, home_moneyline=-150, away_moneyline=130, week=1)
assert smart["source"] == "moneyline"
assert abs(smart["probability"] - smart["market"]) < abs(smart["independent"] - smart["market"])
assert abs(smart["marketWeight"] - 0.75) < 1e-12
assert [m.market_weight_for_week(w) for w in (1,2,3,4,5,6,12)] == [0.75,0.50,0.25,0.15,0.10,0.05,0.05]

base = 0.60
assert m.apply_elo_delta(base, 20, True) > base
assert m.apply_elo_delta(base, -20, True) < base
assert m.apply_elo_delta(base, 20, False) < base

fallback = m.forecast_probability(1600, 1500)
assert fallback["source"] == "independent"
assert abs(fallback["probability"] - fallback["independent"]) < 1e-12

for internal_home_margin in (-14, -7, -3, 0, 3, 7, 14):
    pp = m.spread_to_probability(internal_home_margin)
    sportsbook_home_line = m.probability_to_spread(pp)
    assert abs(sportsbook_home_line + internal_home_margin) < 1e-10, (internal_home_margin, sportsbook_home_line)

print("forecast_v2 reference tests: PASS")
