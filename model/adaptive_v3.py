"""Sunday Signal Adaptive Forecast v3 reference implementation.

Research candidate only. Every state used for game G is computed from games
completed before G. The result of G is observed only after G's forecast is
scored, preventing outcome leakage.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from math import exp, log, log10
from typing import Dict, Optional

from forecast_v2 import (
    independent_probability,
    devig_moneyline, spread_to_probability,
    blend_logits,
    logit,
    sigmoid,
)

DEFAULTS = dict(
    decay=0.85,
    prior_games=6.0,
    base_market_weight=0.98,
    min_market_weight=0.82,
    max_market_weight=0.995,
    trust_sensitivity=1.50,
    residual_gamma=0.30,
    favorite_gamma=0.20,
    favorite_threshold=6.0,
    max_point_correction=2.5,
    spread_logit_scale=6.5,
    division_compression=0.0,
)

@dataclass
class TeamState:
    residual_sum: float = 0.0
    residual_weight: float = 0.0
    favorite_residual_sum: float = 0.0
    favorite_residual_weight: float = 0.0
    brier_advantage_sum: float = 0.0
    brier_weight: float = 0.0
    games: int = 0
    market_games: int = 0
    big_favorite_games: int = 0


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def market_probability(game: dict) -> dict:
    p = devig_moneyline(game.get("homeMoneyline"), game.get("awayMoneyline"))
    if p is not None:
        return {"probability": p, "source": "moneyline"}
    p = spread_to_probability(game.get("spreadLine"))
    if p is not None:
        return {"probability": p, "source": "spread"}
    return {"probability": None, "source": "none"}


def _decay(s: TeamState, decay: float) -> None:
    s.residual_sum *= decay
    s.residual_weight *= decay
    s.favorite_residual_sum *= decay
    s.favorite_residual_weight *= decay
    s.brier_advantage_sum *= decay
    s.brier_weight *= decay


def snapshot(s: TeamState, cfg: dict = DEFAULTS) -> dict:
    prior = cfg["prior_games"]
    residual = s.residual_sum / (s.residual_weight + prior)
    fav = s.favorite_residual_sum / (s.favorite_residual_weight + prior)
    adv = s.brier_advantage_sum / (s.brier_weight + prior)
    market_weight = _clamp(
        cfg["base_market_weight"] + cfg["trust_sensitivity"] * adv,
        cfg["min_market_weight"], cfg["max_market_weight"])
    return dict(residual=residual, favorite_residual=fav,
                avg_brier_advantage=adv, market_weight=market_weight,
                effective_games=s.residual_weight, games=s.games,
                market_games=s.market_games,
                big_favorite_games=s.big_favorite_games)


def matchup_context(game: dict, states: Dict[str, TeamState],
                    cfg: dict = DEFAULTS) -> dict:
    hs = snapshot(states.setdefault(game["home"], TeamState()), cfg)
    aws = snapshot(states.setdefault(game["away"], TeamState()), cfg)
    spread = game.get("spreadLine")
    corr = cfg["residual_gamma"] * (hs["residual"] - aws["residual"])
    favorite_term = 0.0
    if spread is not None and abs(float(spread)) >= cfg["favorite_threshold"]:
        if float(spread) > 0:
            favorite_term = cfg["favorite_gamma"] * hs["favorite_residual"]
        else:
            favorite_term = -cfg["favorite_gamma"] * aws["favorite_residual"]
        corr += favorite_term
    division_term = 0.0
    if game.get("divisional") and spread is not None and cfg["division_compression"]:
        division_term = -float(spread) * cfg["division_compression"]
        corr += division_term
    corr = _clamp(corr, -cfg["max_point_correction"], cfg["max_point_correction"])
    return dict(home=hs, away=aws,
                market_weight=(hs["market_weight"] + aws["market_weight"]) / 2,
                correction_points=corr, favorite_term=favorite_term,
                division_term=division_term, divisional=bool(game.get("divisional")))


def forecast_probability(game: dict, home_elo: float, away_elo: float,
                         states: Dict[str, TeamState], *, hfa=15, scale=340,
                         cfg: dict = DEFAULTS) -> dict:
    independent = independent_probability(home_elo, away_elo, hfa, scale)
    m = market_probability(game)
    ctx = matchup_context(game, states, cfg)
    ctx["home_elo_equivalent"] = team_elo_equivalent(ctx["home"], scale, cfg)
    ctx["away_elo_equivalent"] = team_elo_equivalent(ctx["away"], scale, cfg)
    if m["probability"] is None:
        adaptive_independent = independent_probability(
            home_elo + ctx["home_elo_equivalent"],
            away_elo + ctx["away_elo_equivalent"], hfa, scale)
        return dict(probability=adaptive_independent, independent=independent,
                    market=None, adjusted_market=None, source="adaptive-history",
                    market_available=False, adaptive=True, context=ctx)
    adjusted = sigmoid(logit(m["probability"]) +
                       ctx["correction_points"] / cfg["spread_logit_scale"])
    p = blend_logits(independent, adjusted, 1 - ctx["market_weight"])
    return dict(probability=p, independent=independent, market=m["probability"],
                adjusted_market=adjusted, source=f"adaptive-{m['source']}",
                market_available=True, adaptive=True, context=ctx)


def update_after_game(game: dict, home_elo: float, away_elo: float,
                      states: Dict[str, TeamState], *, hfa=15, scale=340,
                      cfg: dict = DEFAULTS) -> None:
    hs = states.setdefault(game["home"], TeamState())
    aws = states.setdefault(game["away"], TeamState())
    _decay(hs, cfg["decay"]); _decay(aws, cfg["decay"])
    hs.games += 1; aws.games += 1
    if game.get("homeScore") is None or game.get("awayScore") is None:
        return
    m = market_probability(game)
    if m["probability"] is None:
        return
    y = 0.5 if game["homeScore"] == game["awayScore"] else (1.0 if game["homeScore"] > game["awayScore"] else 0.0)
    pi = independent_probability(home_elo, away_elo, hfa, scale)
    advantage = (pi - y) ** 2 - (m["probability"] - y) ** 2
    for s in (hs, aws):
        s.brier_advantage_sum += advantage
        s.brier_weight += 1
        s.market_games += 1
    spread = game.get("spreadLine")
    if spread is None:
        return
    spread = float(spread)
    home_resid = float(game["homeScore"]) - float(game["awayScore"]) - spread
    hs.residual_sum += home_resid; hs.residual_weight += 1
    aws.residual_sum -= home_resid; aws.residual_weight += 1
    if spread >= cfg["favorite_threshold"]:
        hs.favorite_residual_sum += home_resid; hs.favorite_residual_weight += 1; hs.big_favorite_games += 1
    elif spread <= -cfg["favorite_threshold"]:
        aws.favorite_residual_sum -= home_resid; aws.favorite_residual_weight += 1; aws.big_favorite_games += 1


def team_elo_equivalent(snap: dict, scale=340, cfg: dict = DEFAULTS) -> float:
    points = cfg["residual_gamma"] * snap["residual"]
    return points / cfg["spread_logit_scale"] * scale / log(10)
