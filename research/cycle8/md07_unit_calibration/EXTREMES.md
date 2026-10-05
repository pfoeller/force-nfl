# MD-07 frozen current extremes

12 grades/32 teams, generation `1791223317385-dfe3e0cd-b518-4dc4-97e6-1d81b11f1c76`. [Criteria/provenance/limits](README.md); [raw proxy/formula definitions](ARCHITECTURE.md). Ingredient/same-feed benchmark facts are not independent-provider or predictive certification. Legacy diagnostic has one available benchmark.

## QB play

Raw scope: QB all-play EPA proxy; complete vector also includes ANY/A, success, rushing and CPOE.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | SF | 1 | 92.88 | 0.515445 | qbEpaPerPlay=0.5154 (ingredient); qbAnyA=10.4602 (ingredient) |
| top5 | BAL | 2 | 87.17 | 0.360889 | qbEpaPerPlay=0.3609 (ingredient); qbAnyA=9.2946 (ingredient) |
| top5 | JAX | 3 | 84.98 | 0.296784 | qbEpaPerPlay=0.2968 (ingredient); qbAnyA=7.7411 (ingredient) |
| top5 | DET | 4 | 83.20 | 0.222379 | qbEpaPerPlay=0.2224 (ingredient); qbAnyA=7.8639 (ingredient) |
| top5 | KC | 5 | 81.57 | 0.213318 | qbEpaPerPlay=0.2133 (ingredient); qbAnyA=8.1269 (ingredient) |
| bottom5 | MIN | 28 | 21.93 | -0.079642 | qbEpaPerPlay=-0.0796 (ingredient); qbAnyA=4.9919 (ingredient) |
| bottom5 | ATL | 29 | 21.08 | -0.376265 | qbEpaPerPlay=-0.3763 (ingredient); qbAnyA=3.1744 (ingredient) |
| bottom5 | IND | 30 | 21.06 | -0.160818 | qbEpaPerPlay=-0.1608 (ingredient); qbAnyA=4.1357 (ingredient) |
| bottom5 | LAC | 31 | 17.83 | -0.163187 | qbEpaPerPlay=-0.1632 (ingredient); qbAnyA=4.2061 (ingredient) |
| bottom5 | TB | 32 | 17.25 | -0.205158 | qbEpaPerPlay=-0.2052 (ingredient); qbAnyA=3.6901 (ingredient) |

## Receivers

Raw scope: WR/TE EPA/target after partial QB-environment subtraction.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | SF | 1 | 83.70 | 0.436913 | wrteYardsPerTarget=9.4051 (non-formula same-source outcome); wrteFirstDownRate=0.4937 (non-formula same-source outcome) |
| top5 | DAL | 2 | 79.59 | 0.320965 | wrteYardsPerTarget=7.9919 (non-formula same-source outcome); wrteFirstDownRate=0.4435 (non-formula same-source outcome) |
| top5 | JAX | 3 | 77.95 | 0.348557 | wrteYardsPerTarget=9.0588 (non-formula same-source outcome); wrteFirstDownRate=0.4706 (non-formula same-source outcome) |
| top5 | BAL | 4 | 65.94 | 0.310083 | wrteYardsPerTarget=10.5843 (non-formula same-source outcome); wrteFirstDownRate=0.4607 (non-formula same-source outcome) |
| top5 | NO | 5 | 64.92 | 0.313025 | wrteYardsPerTarget=8.5960 (non-formula same-source outcome); wrteFirstDownRate=0.4545 (non-formula same-source outcome) |
| bottom5 | NYG | 28 | 22.02 | 0.102202 | wrteYardsPerTarget=6.7979 (non-formula same-source outcome); wrteFirstDownRate=0.3617 (non-formula same-source outcome) |
| bottom5 | TB | 29 | 18.96 | 0.089495 | wrteYardsPerTarget=7.0000 (non-formula same-source outcome); wrteFirstDownRate=0.3298 (non-formula same-source outcome) |
| bottom5 | ATL | 30 | 16.72 | 0.026813 | wrteYardsPerTarget=7.4545 (non-formula same-source outcome); wrteFirstDownRate=0.3273 (non-formula same-source outcome) |
| bottom5 | MIA | 31 | 16.12 | 0.046227 | wrteYardsPerTarget=7.6951 (non-formula same-source outcome); wrteFirstDownRate=0.2805 (non-formula same-source outcome) |
| bottom5 | LAC | 32 | 13.65 | -0.025290 | wrteYardsPerTarget=7.6154 (non-formula same-source outcome); wrteFirstDownRate=0.3297 (non-formula same-source outcome) |

## Offensive line

Raw scope: PBP de-duplicated hit-or-sack disruption allowed/dropback; pass protection only.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | SF | 1 | 85.42 | 0.098214 | sackAllowed=0.0000 (adjacent non-formula outcome); pbpPressureAllowedRate=0.0982 (ingredient) |
| top5 | DEN | 2 | 83.69 | 0.107143 | sackAllowed=0.0357 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1071 (ingredient) |
| top5 | BAL | 3 | 69.67 | 0.118182 | sackAllowed=0.0625 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1182 (ingredient) |
| top5 | CHI | 4 | 69.65 | 0.130435 | sackAllowed=0.0504 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1304 (ingredient) |
| top5 | ATL | 5 | 63.96 | 0.139535 | sackAllowed=0.0814 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1395 (ingredient) |
| bottom5 | CLE | 28 | 24.68 | 0.188976 | sackAllowed=0.0866 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1890 (ingredient) |
| bottom5 | JAX | 29 | 24.08 | 0.198198 | sackAllowed=0.0714 (adjacent non-formula outcome); pbpPressureAllowedRate=0.1982 (ingredient) |
| bottom5 | GB | 30 | 23.30 | 0.203704 | sackAllowed=0.0494 (adjacent non-formula outcome); pbpPressureAllowedRate=0.2037 (ingredient) |
| bottom5 | NYG | 31 | 18.78 | 0.203252 | sackAllowed=0.0894 (adjacent non-formula outcome); pbpPressureAllowedRate=0.2033 (ingredient) |
| bottom5 | LAC | 32 | 9.76 | 0.234848 | sackAllowed=0.0909 (adjacent non-formula outcome); pbpPressureAllowedRate=0.2348 (ingredient) |

## RB

Raw scope: RB/FB 70% rushing EPA/carry + 30% partially residualized receiving EPA/target.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | BUF | 1 | 85.43 | 0.139514 | rbYpc=5.8514 (non-formula same-source outcome); rbFirstDownRate=0.2973 (non-formula same-source outcome) |
| top5 | DET | 2 | 76.26 | 0.052679 | rbYpc=4.4157 (non-formula same-source outcome); rbFirstDownRate=0.3146 (non-formula same-source outcome) |
| top5 | KC | 3 | 76.07 | 0.107583 | rbYpc=5.7573 (non-formula same-source outcome); rbFirstDownRate=0.2718 (non-formula same-source outcome) |
| top5 | ATL | 4 | 74.40 | 0.015272 | rbYpc=5.0104 (non-formula same-source outcome); rbFirstDownRate=0.2917 (non-formula same-source outcome) |
| top5 | CHI | 5 | 72.45 | 0.098174 | rbYpc=4.8947 (non-formula same-source outcome); rbFirstDownRate=0.2180 (non-formula same-source outcome) |
| bottom5 | HOU | 28 | 27.56 | -0.155792 | rbYpc=2.8533 (non-formula same-source outcome); rbFirstDownRate=0.1733 (non-formula same-source outcome) |
| bottom5 | TEN | 29 | 27.29 | -0.255405 | rbYpc=3.9211 (non-formula same-source outcome); rbFirstDownRate=0.1579 (non-formula same-source outcome) |
| bottom5 | SEA | 30 | 24.78 | -0.185322 | rbYpc=3.6796 (non-formula same-source outcome); rbFirstDownRate=0.1650 (non-formula same-source outcome) |
| bottom5 | LV | 31 | 23.55 | -0.183151 | rbYpc=3.6038 (non-formula same-source outcome); rbFirstDownRate=0.1887 (non-formula same-source outcome) |
| bottom5 | GB | 32 | 12.72 | -0.237440 | rbYpc=3.5538 (non-formula same-source outcome); rbFirstDownRate=0.1692 (non-formula same-source outcome) |

## Coverage

Raw scope: Sack-free pass-attempt EPA allowed proxy; complete grade also uses CPOE allowed.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | MIN | 1 | 93.55 | -0.002599 | coverageSuccessAllowed=0.3615 (non-formula same-source outcome); passYardsAllowedPerAttempt=6.7252 (non-formula same-source outcome) |
| top5 | LAR | 2 | 93.51 | -0.137925 | coverageSuccessAllowed=0.4094 (non-formula same-source outcome); passYardsAllowedPerAttempt=4.8425 (non-formula same-source outcome) |
| top5 | SEA | 3 | 86.04 | 0.010554 | coverageSuccessAllowed=0.4355 (non-formula same-source outcome); passYardsAllowedPerAttempt=5.2016 (non-formula same-source outcome) |
| top5 | KC | 4 | 82.64 | 0.019708 | coverageSuccessAllowed=0.4722 (non-formula same-source outcome); passYardsAllowedPerAttempt=6.2313 (non-formula same-source outcome) |
| top5 | CHI | 5 | 80.50 | 0.020353 | coverageSuccessAllowed=0.4141 (non-formula same-source outcome); passYardsAllowedPerAttempt=7.8384 (non-formula same-source outcome) |
| bottom5 | ARI | 28 | 22.52 | 0.449711 | coverageSuccessAllowed=0.5138 (non-formula same-source outcome); passYardsAllowedPerAttempt=9.0917 (non-formula same-source outcome) |
| bottom5 | TEN | 29 | 17.23 | 0.316027 | coverageSuccessAllowed=0.5000 (non-formula same-source outcome); passYardsAllowedPerAttempt=7.8750 (non-formula same-source outcome) |
| bottom5 | DET | 30 | 14.58 | 0.452780 | coverageSuccessAllowed=0.5549 (non-formula same-source outcome); passYardsAllowedPerAttempt=7.9273 (non-formula same-source outcome) |
| bottom5 | MIA | 31 | 11.09 | 0.389971 | coverageSuccessAllowed=0.5398 (non-formula same-source outcome); passYardsAllowedPerAttempt=8.3186 (non-formula same-source outcome) |
| bottom5 | DAL | 32 | 3.54 | 0.487265 | coverageSuccessAllowed=0.6283 (non-formula same-source outcome); passYardsAllowedPerAttempt=8.4348 (non-formula same-source outcome) |

## Pass rush

Raw scope: Selected provider pressure + .20 hit-rate + .60 sack-rate.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | MIN | 1 | 96.39 | 0.500680 | frontSackRate=0.1088 (ingredient/adjacent); frontPressureRate=0.3810 (provider-heterogeneous ingredient/proxy) |
| top5 | SEA | 2 | 86.99 | 0.405926 | frontSackRate=0.0815 (ingredient/adjacent); frontPressureRate=0.3111 (provider-heterogeneous ingredient/proxy) |
| top5 | LAC | 3 | 86.65 | 0.438710 | frontSackRate=0.0806 (ingredient/adjacent); frontPressureRate=0.3387 (provider-heterogeneous ingredient/proxy) |
| top5 | LV | 4 | 85.17 | 0.452174 | frontSackRate=0.0870 (ingredient/adjacent); frontPressureRate=0.3478 (provider-heterogeneous ingredient/proxy) |
| top5 | DET | 5 | 81.53 | 0.366667 | frontSackRate=0.0833 (ingredient/adjacent); frontPressureRate=0.2778 (provider-heterogeneous ingredient/proxy) |
| bottom5 | TB | 28 | 15.69 | 0.221538 | frontSackRate=0.0462 (ingredient/adjacent); frontPressureRate=0.1692 (provider-heterogeneous ingredient/proxy) |
| bottom5 | KC | 29 | 14.94 | 0.190728 | frontSackRate=0.0199 (ingredient/adjacent); frontPressureRate=0.1523 (provider-heterogeneous ingredient/proxy) |
| bottom5 | CAR | 30 | 11.30 | 0.207895 | frontSackRate=0.0461 (ingredient/adjacent); frontPressureRate=0.1579 (provider-heterogeneous ingredient/proxy) |
| bottom5 | NYG | 31 | 11.02 | 0.146763 | frontSackRate=0.0216 (ingredient/adjacent); frontPressureRate=0.1151 (provider-heterogeneous ingredient/proxy) |
| bottom5 | PHI | 32 | 9.82 | 0.153846 | frontSackRate=0.0280 (ingredient/adjacent); frontPressureRate=0.1189 (provider-heterogeneous ingredient/proxy) |

## Run defense

Raw scope: Opponent rushing EPA/carry; includes QB runs in team outcomes.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | TB | 1 | 90.53 | -0.191589 | rushYpcAllowed=3.2041 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2143 (first-down proxy, not EPA success rate) |
| top5 | SEA | 2 | 86.69 | -0.157210 | rushYpcAllowed=3.6429 (non-formula same-source outcome); rushFirstDownRateAllowed=0.1964 (first-down proxy, not EPA success rate) |
| top5 | ARI | 3 | 86.64 | -0.208570 | rushYpcAllowed=4.1964 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2232 (first-down proxy, not EPA success rate) |
| top5 | ATL | 4 | 86.02 | -0.264606 | rushYpcAllowed=2.7500 (non-formula same-source outcome); rushFirstDownRateAllowed=0.1731 (first-down proxy, not EPA success rate) |
| top5 | MIA | 5 | 80.03 | -0.175936 | rushYpcAllowed=3.6333 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2167 (first-down proxy, not EPA success rate) |
| bottom5 | CAR | 28 | 17.26 | 0.036343 | rushYpcAllowed=5.3966 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2414 (first-down proxy, not EPA success rate) |
| bottom5 | BUF | 29 | 15.42 | 0.033925 | rushYpcAllowed=4.0348 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2435 (first-down proxy, not EPA success rate) |
| bottom5 | DEN | 30 | 14.86 | 0.096963 | rushYpcAllowed=4.7583 (non-formula same-source outcome); rushFirstDownRateAllowed=0.3083 (first-down proxy, not EPA success rate) |
| bottom5 | CHI | 31 | 10.46 | 0.036553 | rushYpcAllowed=4.9398 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2289 (first-down proxy, not EPA success rate) |
| bottom5 | NE | 32 | 10.06 | 0.058659 | rushYpcAllowed=4.3789 (non-formula same-source outcome); rushFirstDownRateAllowed=0.2526 (first-down proxy, not EPA success rate) |

## Scoring/drive

Raw scope: Qualifying offensive points/drive.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | DAL | 1 | 95.03 | 3.388889 | offensivePointsPerDrive=3.3889 (ingredient); pointsForPerGame=30.5000 (related outcome, includes non-offensive scoring) |
| top5 | SF | 2 | 93.12 | 3.388889 | offensivePointsPerDrive=3.3889 (ingredient); pointsForPerGame=30.5000 (related outcome, includes non-offensive scoring) |
| top5 | BUF | 3 | 91.52 | 3.023810 | offensivePointsPerDrive=3.0238 (ingredient); pointsForPerGame=31.7500 (related outcome, includes non-offensive scoring) |
| top5 | JAX | 4 | 85.11 | 2.971429 | offensivePointsPerDrive=2.9714 (ingredient); pointsForPerGame=26.0000 (related outcome, includes non-offensive scoring) |
| top5 | DET | 5 | 84.71 | 2.902439 | offensivePointsPerDrive=2.9024 (ingredient); pointsForPerGame=29.7500 (related outcome, includes non-offensive scoring) |
| bottom5 | NE | 28 | 19.42 | 1.439024 | offensivePointsPerDrive=1.4390 (ingredient); pointsForPerGame=16.2500 (related outcome, includes non-offensive scoring) |
| bottom5 | ATL | 29 | 17.92 | 1.457143 | offensivePointsPerDrive=1.4571 (ingredient); pointsForPerGame=17.0000 (related outcome, includes non-offensive scoring) |
| bottom5 | TEN | 30 | 11.59 | 1.447368 | offensivePointsPerDrive=1.4474 (ingredient); pointsForPerGame=13.7500 (related outcome, includes non-offensive scoring) |
| bottom5 | LAC | 31 | 8.53 | 1.425532 | offensivePointsPerDrive=1.4255 (ingredient); pointsForPerGame=16.7500 (related outcome, includes non-offensive scoring) |
| bottom5 | MIA | 32 | 7.17 | 1.243243 | offensivePointsPerDrive=1.2432 (ingredient); pointsForPerGame=11.5000 (related outcome, includes non-offensive scoring) |

## Pts/drive prevention

Raw scope: Opponent offensive points/drive allowed.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | MIN | 1 | 90.00 | 1.108696 | defensivePointsPerDrive=1.1087 (ingredient); pointsAgainstPerGame=12.7500 (related outcome, includes non-offensive scoring) |
| top5 | JAX | 2 | 87.42 | 1.432432 | defensivePointsPerDrive=1.4324 (ingredient); pointsAgainstPerGame=13.2500 (related outcome, includes non-offensive scoring) |
| top5 | SEA | 3 | 84.84 | 1.488889 | defensivePointsPerDrive=1.4889 (ingredient); pointsAgainstPerGame=18.2500 (related outcome, includes non-offensive scoring) |
| top5 | CHI | 4 | 82.26 | 1.666667 | defensivePointsPerDrive=1.6667 (ingredient); pointsAgainstPerGame=16.2500 (related outcome, includes non-offensive scoring) |
| top5 | ATL | 5 | 77.82 | 1.696970 | defensivePointsPerDrive=1.6970 (ingredient); pointsAgainstPerGame=22.6667 (related outcome, includes non-offensive scoring) |
| bottom5 | ARI | 28 | 20.32 | 2.707317 | defensivePointsPerDrive=2.7073 (ingredient); pointsAgainstPerGame=29.2500 (related outcome, includes non-offensive scoring) |
| bottom5 | WAS | 29 | 17.74 | 2.711111 | defensivePointsPerDrive=2.7111 (ingredient); pointsAgainstPerGame=30.5000 (related outcome, includes non-offensive scoring) |
| bottom5 | MIA | 30 | 15.16 | 2.729730 | defensivePointsPerDrive=2.7297 (ingredient); pointsAgainstPerGame=25.2500 (related outcome, includes non-offensive scoring) |
| bottom5 | DAL | 31 | 12.58 | 2.871795 | defensivePointsPerDrive=2.8718 (ingredient); pointsAgainstPerGame=28.0000 (related outcome, includes non-offensive scoring) |
| bottom5 | DET | 32 | 10.00 | 3.097561 | defensivePointsPerDrive=3.0976 (ingredient); pointsAgainstPerGame=31.7500 (related outcome, includes non-offensive scoring) |

## Overall offense

Raw scope: Weighted already-normalized unit grades, not a physical raw signal.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | SF | 1 | 92.40 | 84.532205 | offEpa=0.2785 (related same-source outcome); offensivePointsPerDrive=3.3889 (component input) |
| top5 | BUF | 2 | 82.70 | 73.343225 | offEpa=0.1933 (related same-source outcome); offensivePointsPerDrive=3.0238 (component input) |
| top5 | DET | 3 | 82.61 | 73.259771 | offEpa=0.1566 (related same-source outcome); offensivePointsPerDrive=2.9024 (component input) |
| top5 | DAL | 4 | 82.00 | 72.692239 | offEpa=0.1863 (related same-source outcome); offensivePointsPerDrive=3.3889 (component input) |
| top5 | BAL | 5 | 81.50 | 72.226517 | offEpa=0.1650 (related same-source outcome); offensivePointsPerDrive=2.6364 (component input) |
| bottom5 | PIT | 28 | 24.26 | 32.645215 | offEpa=-0.0995 (related same-source outcome); offensivePointsPerDrive=1.5435 (component input) |
| bottom5 | GB | 29 | 21.36 | 30.276149 | offEpa=-0.0889 (related same-source outcome); offensivePointsPerDrive=1.6591 (component input) |
| bottom5 | TB | 30 | 17.82 | 27.141683 | offEpa=-0.1424 (related same-source outcome); offensivePointsPerDrive=1.6279 (component input) |
| bottom5 | MIA | 31 | 16.81 | 26.190906 | offEpa=-0.1228 (related same-source outcome); offensivePointsPerDrive=1.2432 (component input) |
| bottom5 | LAC | 32 | 11.65 | 20.744259 | offEpa=-0.1592 (related same-source outcome); offensivePointsPerDrive=1.4255 (component input) |

## Overall defense

Raw scope: Weighted already-normalized unit grades, not a physical raw signal.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | MIN | 1 | 93.69 | 88.644625 | defEpa=0.1842 (related same-source outcome); defensivePointsPerDrive=1.1087 (component input) |
| top5 | SEA | 2 | 91.92 | 86.136720 | defEpa=0.1420 (related same-source outcome); defensivePointsPerDrive=1.4889 (component input) |
| top5 | ATL | 3 | 83.60 | 76.471848 | defEpa=0.0471 (related same-source outcome); defensivePointsPerDrive=1.6970 (component input) |
| top5 | LV | 4 | 79.16 | 72.207189 | defEpa=0.0739 (related same-source outcome); defensivePointsPerDrive=1.8261 (component input) |
| top5 | LAR | 5 | 76.89 | 70.185259 | defEpa=0.1234 (related same-source outcome); defensivePointsPerDrive=1.8333 (component input) |
| bottom5 | MIA | 28 | 27.56 | 33.551306 | defEpa=-0.0627 (related same-source outcome); defensivePointsPerDrive=2.7297 (component input) |
| bottom5 | BUF | 29 | 25.47 | 31.823710 | defEpa=-0.1053 (related same-source outcome); defensivePointsPerDrive=2.5476 (component input) |
| bottom5 | DET | 30 | 22.33 | 29.126239 | defEpa=-0.1578 (related same-source outcome); defensivePointsPerDrive=3.0976 (component input) |
| bottom5 | WAS | 31 | 21.07 | 28.002676 | defEpa=-0.0312 (related same-source outcome); defensivePointsPerDrive=2.7111 (component input) |
| bottom5 | DAL | 32 | 13.02 | 19.931539 | defEpa=-0.2056 (related same-source outcome); defensivePointsPerDrive=2.8718 (component input) |

## Team efficiency (diagnostic)

Raw scope: Team EPA/play; compatibility/debug grade, not current offense-composite outcome key.

| Tail | Team | Rank | Display | Raw proxy | Benchmark facts / boundaries |
|---|---|---:|---:|---:|---|
| top5 | SF | 1 | 94.46 | 0.278453 | offEpa=0.2785 (ingredient) |
| top5 | BUF | 2 | 94.13 | 0.193253 | offEpa=0.1933 (ingredient) |
| top5 | DAL | 3 | 91.00 | 0.186325 | offEpa=0.1863 (ingredient) |
| top5 | JAX | 4 | 85.11 | 0.173820 | offEpa=0.1738 (ingredient) |
| top5 | DET | 5 | 82.06 | 0.156629 | offEpa=0.1566 (ingredient) |
| bottom5 | MIA | 28 | 15.10 | -0.122755 | offEpa=-0.1228 (ingredient) |
| bottom5 | MIN | 29 | 15.10 | -0.119607 | offEpa=-0.1196 (ingredient) |
| bottom5 | TB | 30 | 14.37 | -0.142418 | offEpa=-0.1424 (ingredient) |
| bottom5 | ATL | 31 | 10.41 | -0.149749 | offEpa=-0.1497 (ingredient) |
| bottom5 | LAC | 32 | 5.92 | -0.159168 | offEpa=-0.1592 (ingredient) |
