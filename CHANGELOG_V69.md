# FORCE V69 - canonical historical state consistency

- Completed-game Pregame FORCE now uses the same canonical FORCE definition as Rankings, frozen before kickoff.
- Postgame FORCE now uses result/regime state plus timestamp-correct unit bridge and automatic QB regime through that game.
- Immediate-rematch forecasts now start from the complete canonical postgame state rather than a raw-Elo-only snapshot.
- Postgame unit rows stop at the completed game instead of leaking current/future unit data.
- Forecast audit strips now report FORCE movement rather than raw Elo movement.
