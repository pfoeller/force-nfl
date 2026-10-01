"""Reference implementation for Sunday Signal Forecast v2.

This module mirrors model/forecast_v2.js. It intentionally keeps team ratings
independent from market information. Pregame market data is used only in the
forecast layer when available.

Benchmarks recorded by the supplied Celo research bundle:
- Independent model, 2023-2025 holdout: Brier 0.2170
- Vegas closing spread alone:           Brier 0.2095
- Logistic Elo + closing spread blend:  Brier 0.2095

The 0.2095 figure is a closing-line benchmark, not a guarantee for opening or
live/current market prices.
"""
from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Optional


@dataclass(frozen=True)
class ForecastMeta:
    name: str = "Sunday Signal Forecast v2"
    version: str = "2.0.0"
    benchmark_window: str = "2023-2025"
    independent_brier: float = 0.2170
    closing_market_brier: float = 0.2095
    model_weight_when_market_available: float = 0.02


META = ForecastMeta()


def clamp(p: float, lo: float = 1e-6, hi: float = 1 - 1e-6) -> float:
    return max(lo, min(hi, float(p)))


def logit(p: float) -> float:
    p = clamp(p)
    return math.log(p / (1 - p))


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def independent_probability(home_elo: float, away_elo: float, hfa: float = 15, scale: float = 340) -> float:
    return 1 / (1 + 10 ** (-((home_elo + hfa - away_elo) / scale)))


def american_odds_to_implied(odds: Optional[float]) -> Optional[float]:
    if odds is None or odds == 0:
        return None
    o = float(odds)
    return (-o) / ((-o) + 100) if o < 0 else 100 / (o + 100)


def devig_moneyline(home_odds: Optional[float], away_odds: Optional[float]) -> Optional[float]:
    h = american_odds_to_implied(home_odds)
    a = american_odds_to_implied(away_odds)
    if h is None or a is None or h + a <= 0:
        return None
    return h / (h + a)


def spread_to_probability(spread_line: Optional[float]) -> Optional[float]:
    """Simple live fallback when moneylines are unavailable.

    nflverse spread_line is home-team oriented; positive values indicate the
    home team is favored. This approximation is monotonic and is not presented
    as the exact historical fit behind the 0.2095 closing-line benchmark.
    """
    if spread_line is None:
        return None
    return sigmoid(float(spread_line) / 6.5)



def probability_to_spread(probability: float) -> float:
    """Sportsbook-facing home line implied by home-win probability.

    Exact inverse of spread_to_probability: negative means home favored.
    """
    p = min(1 - 1e-9, max(1e-9, float(probability)))
    return -6.5 * logit(p)



def market_weight_for_week(week: Optional[int]) -> float:
    """Transparent V32 market prior: strong early, then rapidly decays."""
    try:
        w = max(1, int(week or 1))
    except (TypeError, ValueError):
        w = 1
    if w <= 1:
        return 0.75
    if w == 2:
        return 0.50
    if w == 3:
        return 0.25
    if w == 4:
        return 0.15
    if w == 5:
        return 0.10
    return 0.05

def blend_logits(model_p: float, market_p: Optional[float], model_weight: float = META.model_weight_when_market_available) -> float:
    if market_p is None:
        return clamp(model_p)
    w = max(0.0, min(1.0, float(model_weight)))
    return sigmoid(w * logit(model_p) + (1 - w) * logit(market_p))


def forecast_probability(
    home_elo: float,
    away_elo: float,
    *,
    home_moneyline: Optional[float] = None,
    away_moneyline: Optional[float] = None,
    spread_line: Optional[float] = None,
    hfa: float = 15,
    scale: float = 340,
    mode: str = "smart",
    week: Optional[int] = 1,
    model_weight: Optional[float] = None,
) -> dict:
    independent = independent_probability(home_elo, away_elo, hfa, scale)
    if mode == "independent":
        return {"probability": independent, "independent": independent, "market": None, "source": "independent"}

    market = devig_moneyline(home_moneyline, away_moneyline)
    source = "moneyline"
    if market is None:
        market = spread_to_probability(spread_line)
        source = "spread"
    if market is None:
        return {"probability": independent, "independent": independent, "market": None, "source": "independent"}

    market_weight = market_weight_for_week(week) if model_weight is None else 1 - max(0.0, min(1.0, float(model_weight)))
    effective_model_weight = 1 - market_weight
    return {
        "probability": blend_logits(independent, market, effective_model_weight),
        "independent": independent,
        "market": market,
        "source": source,
        "modelWeight": effective_model_weight,
        "marketWeight": market_weight,
    }


def apply_elo_delta(probability: float, delta_elo: float, team_is_home: bool = True, scale: float = 340) -> float:
    sign = 1 if team_is_home else -1
    shift = sign * float(delta_elo) * math.log(10) / float(scale)
    return sigmoid(logit(probability) + shift)
