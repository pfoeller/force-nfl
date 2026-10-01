# FORCE V62

## Unified 0–100 context diagnostics

- Luck, Penalty Impact, and Recent vs spread now use the same 0–100 presentation language as FORCE, with **50 = neutral**.
- Luck maps record surplus relative to pregame FORCE win probabilities onto a centered 0–100 scale and shrinks volatile early-season samples toward 50.
- Recent vs spread maps the existing decayed/shrunk market residual onto 0–100 while preserving the V61 four-market-game display gate.
- Historical/full-context Penalty Impact is 70% standardized net penalty EPA/game + 30% standardized net penalty win-probability impact/game, mapped to 0–100.
- Current 2026 team feeds do not contain play-level penalty EPA/WPA, so live Penalty Impact uses net penalty-yard differential/game as an explicitly labeled fallback, with strong early-season shrinkage toward 50.
- Raw underlying values remain visible in the detailed diagnostic tabs for transparency.
- These context scores are explanatory diagnostics only; they do not alter predictive FORCE/Elo.
