# FORCE V19

## PNG export pagination
- Export PNG now slices long pages into multiple images instead of one ultra-tall file.
- Desktop exports target a 16:9 landscape frame (1200x675 layout, rendered at 2x).
- Mobile exports target a portrait frame close to 9:16 using the mobile layout.
- Splits happen at logical boundaries where possible:
  - matchup section titles stay attached to the block below them;
  - the large matchup duel board can split between rows;
  - rankings tables can split between rows;
  - games lists can split between cards;
  - large card grids can split by row.
- Multi-page exports are downloaded as sequential files like `...-1-of-3.png`, `...-2-of-3.png`.
