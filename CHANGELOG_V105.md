# FORCE V105

## Historical QB benchmark activation
- Fixes the V104 production failure where the bundled 2025 QB/OL reference cache had `game_count: 0`, causing every QB to silently fall back to V103 percentile scoring.
- Moves the derived reference to a new cache key/version and rejects any cached reference with fewer than 250 games or fewer than 400 observations in any 1-4 game QB/OL window.
- A failed historical reference can no longer silently reactivate V103 scoring. QB pass EPA uses a conservative absolute emergency mapping and exposes `passEpaBenchmarkSource` in `FORCE_QB_DEBUG`.
- The game-flow payload exposes historical-reference validity/error status.

## QB-return display correction
- Keeps the V33 returning-QB Elo correction as a team-prior correction when eligible.
- Stops adding that correction to the displayed/measured QB unit once the returning starter is already the current-season QB with live player data.
- `FORCE_QB_DEBUG` now exposes the team-level regime correction separately from any unit scenario overlay.

## Intentionally unchanged
- CPOE attempt shrinkage, one-game QB prior floor through four games, and positive-only QB rushing bonus.
- RB and OL like-for-like benchmark changes from V104.
- Offense/Defense display scaling and the ±7.5 Unit→FORCE bridge cap.
