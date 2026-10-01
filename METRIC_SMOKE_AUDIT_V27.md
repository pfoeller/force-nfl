# FORCE V27 - Metric transformation smoke audit

## Why this audit exists

Several postgame values could move in unintuitive or plainly wrong directions because the live layer combined different proxies and scales. V27 therefore tests the entire metric transform rather than only the fields reported by hand.

## Synthetic stress case

The regression constructs a complete 32-team Week 1. Kansas City receives an intentionally elite game across passing, rushing, receiving, pass protection, pass rush, run defense, coverage, penalties, and final score; Denver receives the inverse. The purpose is not to model a real game. It is to make the expected direction of every transform unambiguous.

The test starts from the real bundled 2025 priors. That matters because Kansas City's prior defensive-front rating is already very high (87.1), while its prior OL and run ratings are low. A correct transform must therefore be able to move an already-elite prior upward after an extreme positive performance while also pulling weak priors sharply upward when the current evidence warrants it.

## Representative Kansas City transform

| Metric | Before | After synthetic elite Week 1 |
|---|---:|---:|
| Offense index | 67.7 | 83.9 |
| OL | 19.4 | 59.7 |
| Defensive front | 87.1 | 93.6 |
| Coverage | 54.8 | 77.4 |
| QB | 71.0 | 85.5 |
| Receivers | 67.7 | 83.9 |
| Run | 9.7 | 54.9 |
| Defense | 69.3 | 84.7 |
| Offense composite | 61.3 | 80.6 |
| Base FORCE | 45.5 | 52.9 |
| QB-adjusted FORCE (+47.3 Elo) | 53.8 | 61.5 |
| QB-adjusted offense | 77.9 | 91.5 |

Raw synthetic postgame checks also include:

- front disruption proxy: 51.2% of opponent dropbacks
- OL disruption allowed: 2.9% of own dropbacks
- QB CPOE: +8.0 (true CPOE scale)
- favorable coverage EPA allowed
- positive receiving EPA/target
- positive RB rushing EPA
- current-season luck and penalty context

## Bugs the audit found

### 1. Sack-only pass-rush signal

The previous live defensive-front transform inferred pressure from sacks suffered by the opponent. That means a game with heavy pressure but few sacks could look ordinary. V27 uses defensive QB hits plus sacks per opponent dropback as the in-season disruption proxy.

### 2. OL pressure label was not pressure

The previous `pressure_rate_allowed` field was populated with sack rate. V27 computes opponent QB hits plus sacks allowed per dropback for pass protection and keeps sack rate as a separate value.

### 3. CPOE scale mismatch

The historical snapshot's `qb.cpoe` values are approximately 60–68 and therefore are not on the same scale as current nflverse `passing_cpoe`. V27 does not blend those fields. Live CPOE is used directly once current-season data exist; the historical value is preserved separately as provenance.

### 4. QB-return transform drift risk

The QB-return offense transform previously lived only inside the UI module. V27 moves the pure transform into the shared live-profile model and has the UI call that exact function. The smoke test therefore exercises the production transform, not a reimplementation of it.

### 5. Prior-weight copy drift

Some UI/docs still said four-game prior although the production code had been changed to a one-game stabilizing prior. V27 corrects the current UI/README copy.

## Coverage

The V27 smoke test executes **2,127 assertions**. For every team it verifies the finite/range state of every live metric consumed by the current UI, plus the raw live fields that feed those metrics. It also verifies the exact offense and defense composite equations, result-only Elo direction, FORCE direction, QB-adjusted FORCE direction, QB-return unit invariants, and rematch directionality.

The full legacy regression suite is run after this test as part of `scripts/validate_bundle.py`.
