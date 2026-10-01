# FORCE V130 - QB Rankings

- Added a dedicated QB Rankings tab.
- Replaced the V106 live QB composite with the V130 FORCE QB Rating default:
  - 30% EPA/play
  - 30% ANY/A
  - 20% Success Rate
  - 10% QB rushing value
  - 10% CPOE
- ANY/A uses (passing yards + 20*TD - 45*INT - sack yards) / (attempts + sacks), with known nflverse field aliases supported.
- Preserved current EPA/success/CPOE stabilization, opponent adjustment, early-season continuity prior, and existing unit-to-team bridge behavior.
- Added FORCE Default and Customize modes. Custom weights automatically normalize and affect only the QB Rankings analytical view; they do not alter FORCEcast, team FORCE ratings, or the canonical QB unit.
- Added 0-100 component decomposition plus raw values where available.
- Added V130 regression contract covering navigation, weights, ANY/A formula, canonical integration, and custom isolation.

Validation: V130 QB contract, V129 XML-safe PNG export, V128 rankings export, V115 unit orthogonalization, and JS syntax checks pass. The legacy scripts/validate_bundle.py assertion also fails unchanged on the supplied V129 baseline and is therefore not treated as a V130 regression.
