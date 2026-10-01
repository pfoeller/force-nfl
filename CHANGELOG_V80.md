# FORCE V80 - richer Penalty Impact

V80 upgrades the live 2026 Penalty Impact diagnostic from a yard-only fallback to a three-component 0–100 context score. The live weights are exactly **40% net penalty-yard impact**, **35% net first downs via penalty**, and **25% net touchdowns erased by penalty**. Each component is normalized to an impact scale before blending; the result is mapped to the FORCE-style 0–100 scale with 50 neutral and shrunk toward 50 early in the season using `games / (games + 3)`.

The play-by-play source already used by Game Flow now also aggregates accepted penalty first downs and touchdown plays nullified by penalty. An erased own touchdown is a direct negative impact; an opponent touchdown erased by penalty is a direct positive impact. The Penalties view surfaces all three live components.

Historical/full-context Penalty Impact remains **70% net penalty EPA + 30% net penalty win-probability impact**, because the bundled historical profile does not carry equivalent first-down/negated-TD event counts.
