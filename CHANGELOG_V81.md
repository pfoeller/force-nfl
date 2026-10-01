# FORCE V81 - penalty impact: EPA/WPA + first downs + erased TDs

V81 removes penalty yards from the live Penalty Impact score. Penalty yards remain visible as a descriptive statistic only.

Live 2026 Penalty Impact now uses exactly:

- **40% net observed penalty-play EPA**
- **25% net observed penalty-play WPA**
- **20% net first downs via penalty**
- **15% net touchdowns erased by penalty**

Each component is normalized to its established per-game impact scale, blended, mapped to the FORCE 0–100 context scale with 50 neutral, and then shrunk toward 50 early in the season using `games / (games + 3)`.

The EPA/WPA component is the observed game-state change on accepted penalty plays, oriented to the team. Declined and offsetting-only calls are excluded. First downs and erased touchdowns remain explicit components because they are tangible high-impact penalty outcomes. Historical bundled profiles still use the available 70% EPA / 30% WPA fallback because equivalent historical first-down and erased-TD event counts are not bundled.
