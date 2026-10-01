# FORCE V124 - Representative Monte Carlo playoff projection

- Reverts V123's deterministic all-favorites projected-record path, which could display implausible 16-1/17-0 records.
- Keeps Monte Carlo expected wins unchanged.
- Selects one actual Monte Carlo season whose 32-team final-record vector is closest to the full simulation expected-win vector.
- Uses that same representative season for displayed projected records, division finishes, division winners, and playoff seeds, preserving logical record/seed coherence.
- Playoff/division/bye probabilities remain based on all 5,000 simulations.
- No FORCE/Elo, game probability, tiebreak, or predictive-model changes.
