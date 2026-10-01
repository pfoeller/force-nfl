# FORCE V123 - Coherent Playoff Seed / Record Display

- Fixes an apparent playoff-seeding contradiction where a displayed 13-4 division winner could appear above a displayed 14-3 division winner.
- Root cause: projected seeds were generated from one coherent most-likely remaining-game path, while the displayed projected record was independently rounded from Monte Carlo mean expected wins.
- Projected records now come from the exact same coherent path used to generate projected division finish and projected seeds.
- Monte Carlo expected wins remain visible as the smaller probabilistic context below the coherent projected record.
- Tiebreak logic remains unchanged: record/winning percentage is resolved before NFL tiebreak criteria, so a true 14-3 division winner always ranks above a true 13-4 division winner in the same conference.
- No FORCE/Elo, forecast, simulation probability, playoff-odds, or tiebreak-model changes.
