#!/usr/bin/env python3
"""Leak-safe trainer for the Signal v2 market-aware forecast layer.

Expected CSV columns
--------------------
predictions.csv:
  game_id, season, p_home, result

lines.csv:
  game_id, spread_line

`spread_line` follows the nflverse convention used by the original Celo
backtest: positive means the HOME team is favored.

Example
-------
python model/fit_market_blend.py \
  --predictions predictions.csv \
  --lines lines.csv \
  --eval-start 2023 --eval-end 2025 \
  --output benchmarks/fitted_market_blend.json

The coefficients are fit ONLY on seasons before eval-start, then scored on the
held-out evaluation seasons. This mirrors the supplied project's backtest
methodology and prevents evaluation leakage.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize, minimize_scalar

SPREAD_SCALE = 10.0


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def brier(p, y):
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))


def fit_blend(p_elo, spread, y):
    x_spread = np.nan_to_num(np.asarray(spread, dtype=float), nan=0.0) / SPREAD_SCALE
    x_elo = logit(p_elo)
    y = np.asarray(y, dtype=float)

    def objective(params):
        b0, b1, b2 = params
        p = np.clip(sigmoid(b0 + b1 * x_elo + b2 * x_spread), 1e-6, 1 - 1e-6)
        return -float(np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))

    res = minimize(objective, x0=[0.0, 1.0, 0.0], method="L-BFGS-B")
    if not res.success:
        raise RuntimeError(res.message)
    return tuple(float(x) for x in res.x)


def fit_spread_only(spread, y):
    x = np.nan_to_num(np.asarray(spread, dtype=float), nan=0.0) / SPREAD_SCALE
    y = np.asarray(y, dtype=float)

    def objective(beta):
        p = np.clip(sigmoid(float(beta) * x), 1e-6, 1 - 1e-6)
        return -float(np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))

    return float(minimize_scalar(objective, bounds=(-3.0, 3.0), method="bounded").x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--predictions", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--eval-start", type=int, required=True)
    ap.add_argument("--eval-end", type=int, required=True)
    ap.add_argument("--output", default="benchmarks/fitted_market_blend.json")
    args = ap.parse_args()

    pred = pd.read_csv(args.predictions)
    lines = pd.read_csv(args.lines)[["game_id", "spread_line"]]
    df = pred.merge(lines, on="game_id", how="left")
    train = df[df.season < args.eval_start].copy()
    test = df[(df.season >= args.eval_start) & (df.season <= args.eval_end)].copy()

    if len(train) < 50:
        raise SystemExit("Need at least 50 pre-evaluation training games")
    if test.empty:
        raise SystemExit("No evaluation games found")

    b0, b1, b2 = fit_blend(train.p_home, train.spread_line, train.result)
    te_spread = np.nan_to_num(test.spread_line.to_numpy(float), nan=0.0) / SPREAD_SCALE
    p_blend = sigmoid(b0 + b1 * logit(test.p_home) + b2 * te_spread)

    beta_spread = fit_spread_only(train.spread_line, train.result)
    p_spread = sigmoid(beta_spread * te_spread)

    out = {
        "train_seasons": [int(train.season.min()), int(train.season.max())],
        "eval_seasons": [args.eval_start, args.eval_end],
        "n_train": int(len(train)),
        "n_eval": int(len(test)),
        "pct_eval_with_spread": float(test.spread_line.notna().mean()),
        "coefficients": {"intercept": b0, "elo_logit": b1, "spread_scaled": b2, "spread_scale": SPREAD_SCALE},
        "spread_only_beta": beta_spread,
        "brier": {
            "independent": brier(test.p_home, test.result),
            "blend": brier(p_blend, test.result),
            "spread_only": brier(p_spread, test.result),
        },
        "note": "Fit on seasons strictly before evaluation window. Missing spreads use x_spread=0, matching the original research backtest."
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
