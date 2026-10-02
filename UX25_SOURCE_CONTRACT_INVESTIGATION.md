# UX-25 — Cycle 4 source-contract investigation

Research date: **2026-10-02**. Branch: `cycle4/codex-analysis`. Exact shared base: `a5f5557502f1465a2949b4ccc059939645eac521`; local main, tracking ref and a fresh direct remote query agreed before work began. Cycle 3 is closed and synchronized by owner direction. Its [feasibility findings](UX25_POSTSEASON_STATE_SOURCING.md) and the [projection semantic map](UX10_PROJECTION_SEMANTICS_AUDIT.md) remain the starting evidence.

**Execution: REVIEW — bounded documentary investigation. Display implementation: PLANNED. No source strategy selected.** This artifact is decision support, not permission to integrate a provider or change presentation. UX-11 remains unresolved. The confirmed UX-25 1%/99% display rule, all owner gates and simulation behavior remain unchanged.

## Question and owner policy

What inexpensive, reliable contract could establish actual berth, elimination, division, bye and seed states? The owner prefers an adequate free route over paid convenience. A paid route is eligible only if no adequate free route exists and its price is relatively affordable. No owner budget threshold was supplied. Published dollars are evidence; `low/modest` is a qualitative description of the one published minimum, not a spending authorization. Quote-only prices stay UNKNOWN. No option is adopted or ranked as the obvious choice.

The investigation reviewed free sources before commercial candidates. **An adequate free automated production route has not yet been established; this does not prove that none exists.** Public markers make further free-source verification material. A paid provider's cleaner schema does not resolve the free-first gate.

## Evidence boundaries

The [offline matrix](scripts/fixtures/ux25_source_contracts.json) records 13 source scopes, 8 outcome scopes, provenance URLs and named conditional proofs. It is manually researched metadata, **not captured provider payloads**. Its classifications mean:

- **YES:** the reviewed documentation or page legend describes the field/meaning. It does not certify complete current coverage, production permission, provider correctness or an observed terminal state.
- **NO:** the reviewed product/schema/function lacks that state contract. This is bounded absence, never a team's elimination and never an assertion about every other endpoint a provider might offer.
- **INFERABLE:** a sufficient conditional deduction has explicit premises. It may cover only a subset of states; it is not a promise of exhaustive coverage.
- **UNKNOWN:** public evidence did not establish the contract. Failed retrieval or discovery does not establish NO; absence/null does not establish an undecided outcome or its opposite.

Current conference position is separate from exact seed lock. In the seed-lock column, INFERABLE means **seed 1 only under the bye proof**, not seeds 2–7. No source reviewed establishes a comprehensive explicit seed-lock service. Displayed percentages, representative Out and a current rank establish no actual terminal state.

Pages were read through public web documentation/indexed material; no authenticated provider request, account, API key, signup, sales contact, subscription or billing trial occurred. NFL Pro's direct page returned `API Refresh Failed`; the initial ESPN web-tool attempt and Yahoo's direct page were inaccessible. Independent review subsequently verified the unauthenticated `site.api.espn.com` endpoint; correction research reproduced 32-entry responses for 2026 and 2025 season queries. This observes field presence/current position, not verified terminal semantics or production permission. Some NFL Operations/SportsDataIO facts were available through indexed primary documentation when direct opening failed. Such evidence supports documentary classifications only. No current 2026 terminal payload, measured latency, complete historical flag replay or end-to-end production transport was validated.

## Outcome and access matrix

All columns apply to the **reviewed source scope**, with qualifications above. Correction/finality is deliberately independent of retrieval freshness. Details below add quotas, identity, history and automation boundaries. FREE labels a public-research/input/code candidate category, not a promise of free production API access or rights. The JSON contains each cell's precise basis and any proof key; this table renders those same classifications.

| Source | Playoff clinched | Playoff eliminated | Division clinched | Division eliminated | Bye clinched | Bye eliminated | Exact seed locked | Current conference rank | Correction/finality | Freshness | Authentication | Production use | Current cost | Free/paid | Interpretation confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFL.com conference standings | YES | UNKNOWN | YES | INFERABLE | INFERABLE | UNKNOWN | UNKNOWN | YES | UNKNOWN; no terminal-flag revision contract verified | 2025 historical page inspected, not a current 2026 final-state snapshot | No login for retrieved/indexed public text; undocumented backend access UNKNOWN | UNKNOWN; free viewing is not automated production permission | $0 public viewing; production data rights/cost UNKNOWN | FREE | Documentary only; current terminal payload not validated |
| NFL Pro standings surface | YES | YES | YES | INFERABLE | YES | INFERABLE | INFERABLE | YES | UNKNOWN; no terminal-flag revision contract verified | Indexed 2026 shell; direct retrieval returned API Refresh Failed | Indexed standings legend public; current retrieval failed; backend/subscription access UNKNOWN | UNKNOWN; free viewing is not automated production permission | $0 public viewing; production data rights/cost UNKNOWN | FREE | LOW: indexed legend only, no complete current response |
| NFL Operations clinching publications | YES | UNKNOWN | YES | INFERABLE | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; no terminal-flag revision contract verified | Dated historical 2025 Week 18 bulletin; not 2026 live state | No login for retrieved/indexed public text; undocumented backend access UNKNOWN | UNKNOWN; free viewing is not automated production permission | $0 public viewing; production data rights/cost UNKNOWN | FREE | High publication authority, low complete-feed confidence |
| NFL-owned public machine API discovery | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; no terminal-flag revision contract verified | No contractual source watermark or latency verified | UNKNOWN; old documentation redirects to gated NFL developer portal | UNKNOWN; no production rights or automated-use grant verified | UNKNOWN; developer access/production cost unverified | FREE | Indexed legacy lead, not an adequate or verified production source |
| nflverse/nfldata games CSV | NO | NO | NO | NO | NO | NO | NO | NO | UNKNOWN; no terminal-flag revision contract verified | Documented game/schedule update cadence 5 minutes in season; not a guaranteed finality SLA | None for public raw CSV | UNKNOWN for this exact CSV: no license in retrieved root; nflverse-data CC BY cannot be transferred to another repository | $0 downloads; exact dataset rights need confirmation | FREE | High input-schema confidence; no explicit state flags |
| nflverse-data play-by-play input route | NO | NO | NO | NO | NO | NO | NO | NO | UNKNOWN; no terminal-flag revision contract verified | Nightly after game days plus intraday updates; not real-time terminal flags | None for public release downloads | CC BY 4.0 within licensor rights; attribution/modification notices; no NFL endorsement | $0 data access | FREE | Licensed input candidate, not a state feed |
| nflseedR open-source standings evaluator | NO | NO | NO | NO | NO | NO | NO | YES | UNKNOWN; no terminal-flag revision contract verified | Caller supplies snapshot; no external freshness guarantee | None for open-source code | MIT code license; underlying input rights separate | $0 software license; engineering/runtime not free | FREE | Documented finite-depth evaluator, not universal solver |
| ESPN public standings / undocumented API candidate | INFERABLE | YES | YES | INFERABLE | YES | INFERABLE | INFERABLE | YES | UNKNOWN; no terminal-flag revision contract verified | 2026 and 2025 season queries returned during correction research; no covered-through watermark or latency/finality guarantee verified | Unauthenticated site.api.espn.com current/historical standings requests returned 32 entries each; access is not a production grant | No production grant verified; Disney terms restrict commercial and automated extraction without authorization | $0 public viewing; production data rights/cost UNKNOWN | FREE | Observed machine field presence and current-position data; terminal mappings remain surface-specific documentary evidence |
| CBS public standings | YES | YES | YES | INFERABLE | YES | INFERABLE | INFERABLE | UNKNOWN | UNKNOWN; no terminal-flag revision contract verified | 2026 public table/legend retrieved; no source watermark or update SLA | No login for retrieved/indexed public text; undocumented backend access UNKNOWN | UNKNOWN for FORCE; CBSI terms prohibit unauthorized automated collection; confirm applicable service terms and permission | $0 public viewing; production data rights/cost UNKNOWN | FREE | Documentary only; current terminal payload not validated |
| Yahoo public standings | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; no terminal-flag revision contract verified | 2026 indexed table available; direct retrieval failed | No login for retrieved/indexed public text; undocumented backend access UNKNOWN | No production extraction grant; Yahoo terms require prior permission for automated collection | $0 public viewing; production data rights/cost UNKNOWN | FREE | LOW: table inputs visible, no terminal legend/schema verified |
| Sportradar NFL v7 Postgame Standings | YES | YES | YES | INFERABLE | UNKNOWN | INFERABLE | INFERABLE | YES | Daily Change Log/refetch guidance; clinched revision/invalidation guarantees UNKNOWN | 10-minute cache; updates within 2 minutes of game complete; observed latency not tested | x-api-key; trial/production access levels | Commercial customer agreement required; FORCE rights UNKNOWN | UNKNOWN: no public minimum production fee established; not assumed affordable | PAID | Documented fields; enum precedence/complete mapping and live rights still unverified |
| SportsDataIO NFL Standings | INFERABLE | YES | YES | INFERABLE | YES | INFERABLE | INFERABLE | YES | Official stat-correction workflow documented; standings-flag retraction/version guarantee UNKNOWN | Booleans update on clinch/elimination; no terminal-state latency SLA verified | Production API key; documented NFL Standings season endpoint | Public-facing FORCE needs commercial license; Discovery Lab personal-only; free trial/replay not current production access | UNKNOWN quote/minimum fee; no affordable commercial tier verified | PAID | Four documented nullable flags; no exhaustive overall-berth boolean verified |
| BALLDONTLIE NFL Standings | NO | NO | NO | NO | NO | NO | NO | YES | No terminal-state revision/finality contract documented in reviewed standings schema | No standings-specific update SLA/watermark verified | Authorization API key | Commercial data uses allowed subject to terms, including competition/resale restrictions; FORCE applicability must be checked | Minimum published standings tier ALL-STAR USD 9.99/month; GOAT 39.99/month unnecessary for this endpoint | PAID | Published price/schema; zero verified terminal-state coverage |

### What the free markers establish

NFL.com standings and NFL Pro use different legend meanings: markers must be interpreted per surface. NFL Pro, ESPN and CBS document useful terminal primitives, but the evidence does not certify a stable, authorized automated feed. NFL Operations' already-clinched lists are authoritative publication evidence; conditional future scenarios are not current facts. Yahoo's terminal contract remains unverified. References: [nflStandings](https://www.nfl.com/standings/conference/2025/reg), [nflPro](https://pro.nfl.com/fantasy/stats), [nflScenarios](https://operations.nfl.com/updates/the-game/nfl-week-18-playoff-scenarios-multi-team-contests-for-no-1-seeds-and-division-titles/), [espn](https://www.espn.com/nfl/standings/_/playoff), [cbs](https://www.cbssports.com/nfl/standings/), [yahoo](https://sports.yahoo.com/nfl/standings/).

A page can expose most useful primitives while still lack early division/bye elimination and seeds 2–7 locks. A missing marker may mean stale publication, an omitted route or a different legend; it cannot safely become a negative state. In particular, a division/wildcard/bye clinch implies a berth, but their union can miss a team that has secured a berth while its division-versus-wildcard route remains unsettled. ESPN's reviewed legend and SportsDataIO's reviewed flags need that distinction.

Free viewing is not a production extraction license. NFL and Disney terms do not establish FORCE's automated commercial grant; Yahoo requires permission for automated collection, and CBSI restricts unauthorized automated collection. Applicable endpoint/service scope and permission remain unverified. These are documented access boundaries, not a legal determination about FORCE. References: [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions), [disney](https://disneytermsofuse.com/english/), [yahooTerms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html), [cbsTerms](https://www.viacomcbs.legal/us/en/cbsi/terms-of-use).

The exact `nflverse/nfldata` games CSV already used by FORCE has no license in the retrieved repository root. Do not transfer a different repository's license to it. The separately reviewed `nflverse-data` release license provides CC BY 4.0 rights within the licensor's authority; attribution and third-party rights remain relevant. Both routes provide inputs rather than actual terminal states. References: [nfldataRoot](https://api.github.com/repos/nflverse/nfldata/contents), [dataLicense](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md), [schedules](https://nflreadr.nflverse.com/articles/dictionary_schedules.html), [updates](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).

nflseedR is MIT-licensed code, with input rights separate. Its ranking function defaults through strength of schedule; its deepest mode reaches net points, omits net touchdowns and then randomizes remaining ties. That is neither an authoritative complete evaluator nor an all-futures clinch proof. No package was installed or ported. References: [seedCode](https://github.com/nflverse/nflseedR), [seedContract](https://nflseedr.com/reference/nfl_standings.html).

### Corrected schema and inventory leads (independent-review F1–F3)

**NFL-owned API:** the independent review reported indexed legacy Standings fields `clinchDivision`, `clinchDivisionAndHomefield`, `clinchWildcard`, `clinchingScenarios` and `playoffStatus`. Reported indexed values include `CLINCH_PLAYOFF` (possible positive qualification, mapping required), `NOT_CLINCH_PLAYOFF` / “In the hunt” (not elimination), and `NOT_IN_PLAYOFF` / “Outside Looking In” (current-position/status, never mathematical elimination without verified semantics). This is a reported indexed-schema lead, not a reproduced complete enum/schema. Correction research found the [old documentation](https://api.nfl.com/docs/league/standings) leads to the gated [developer portal](https://developer.nfl.com/get-started/overview). Access, production rights and cost remain UNKNOWN; actual payload/schema availability is unverified. All eight matrix coverage cells remain UNKNOWN. It is not an adequate source yet.

**ESPN:** correction research reproduced unauthenticated [2026](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2026) and [2025](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025) responses. `playoffSeed` is current conference position (matrix YES), not a locked seed. `lockedDivRank` exists but its semantics are UNKNOWN. Historical `clincher` display codes `*`, `e`, `y`, `z` were observed; the 2026 entries had no `clincher` in this observation. Each code needs an independently verified semantic mapping/precedence before machine actual-state use. Existing terminal coverage refers to the public legend, not a certified API code translation. Neither HTTP success nor absence of a code establishes authority, finality or production usability; [Disney terms](https://disneytermsofuse.com/english/) leave commercial/automated use restricted or unresolved.

**Additional leads (not adopted; no new coverage row):** [nfldata standings.csv](https://github.com/nflverse/nfldata/blob/master/data/standings.csv) and its [dictionary](https://github.com/nflverse/nfldata/blob/master/DATASETS.md) offer a free historical final-season validation oracle with records, division rank and postseason seed/outcome. It is not live actual state, and the exact dataset license/finality must still be verified. MediaWiki/Wikipedia content is automatable under applicable open licenses and attribution/share-alike conditions ([reuse](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse), [API access policy](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy)); community editing makes it non-authoritative for NFL terminal certification. [MySportsFeeds commercial pricing](https://www.mysportsfeeds.com/feed-pricing/) publishes an NFL starting point around USD 39/month for CORE feeds and non-live access; required terminal-clinch fields, useful tier/latency and FORCE rights are unverified. A published starting price does not establish affordable adequate coverage or owner approval.

### Commercial findings after free assessment

**Sportradar:** `rank.clinched` is one enum, with documented berth/wildcard, division, division-plus-bye and overall-eliminated values. `conference` meaning and enum precedence need confirmation; do not silently reinterpret it. The enum name `division_first_round_bye` alone does not verify its terminal mapping/precedence: `byeClinched` is now UNKNOWN. Separate division/bye elimination and seed-lock fields were not established. Its change-log/refetch workflow does not itself prove terminal-flag retraction semantics. Production price and FORCE licensing are UNKNOWN. Its custom commercial agreement is an enterprise-contract practical concern, not evidence of a known fee. References: [sr](https://developer.sportradar.com/football/reference/nfl-postgame-standings), [srGuide](https://developer.sportradar.com/football/docs/nfl-ig-standings-retrieval), [srTerms](https://developer.sportradar.com/sportradar-updates/page/terms-and-conditions).

**SportsDataIO:** the reviewed nullable booleans are `ClinchedDivision`, `ClinchedWildCard`, `ClinchedBye` and `EliminatedFromPlayoffContention`; `ConferenceRank` is current position. No exhaustive overall-berth flag was established. Public/revenue use needs a commercial license; personal Discovery Lab access is not FORCE production rights. Scrambled trial data is unsuitable as actual state; free historical Replay access is not a current-production grant. Commercial minimum/price is UNKNOWN and not assumed affordable. References: [sd](https://sportsdata.io/developers/data-dictionary/nfl), [sdGuide](https://sportsdata.io/developers/workflow-guide/nfl), [sdLicense](https://sportsdata.io/help/data-rights-and-licensing-questions), [sdAccess](https://sportsdata.io/developers), [sdReplay](https://sportsdata.io/developers/replay).

**BALLDONTLIE:** the published minimum standings tier is ALL-STAR, **USD 9.99/month**, 60 requests/minute. Free excludes standings. Reviewed regular-season standings provide current `playoff_seed`, not terminal flags. The 48-hour GOAT trial requires payment and converts; none was started. Commercial terms impose competition/resale boundaries needing FORCE-specific assessment. A modest input price does not establish a cheap actual-state solution. References: [bdl](https://nfl.balldontlie.io/), [bdlTerms](https://www.balldontlie.io/terms.html).

## Source-specific operational details

UNKNOWN rate limits are not unlimited permission. All current/historical claims below are documentary, not authenticated availability tests. No source's cache TTL is an upstream finality guarantee.

### NFL.com conference standings

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Year/season routes; archive finality UNKNOWN
- Identity: Names/slugs require pinned aliases; not adopted
- Automation: HTML/indexed text is fragile; no stable approved API verified
- Price classification: unclear
- Primary references: [nflStandings](https://www.nfl.com/standings/conference/2025/reg), [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions).

### NFL Pro standings surface

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Historical pages/publications exist; point-in-time revisions UNKNOWN
- Identity: Names/slugs require pinned aliases; not adopted
- Automation: HTML/indexed text is fragile; no stable approved API verified
- Price classification: unclear
- Primary references: [nflPro](https://pro.nfl.com/fantasy/stats), [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions).

### NFL Operations clinching publications

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Historical pages/publications exist; point-in-time revisions UNKNOWN
- Identity: Explicit team names, conference, season and publication date; manual provenance needed
- Automation: Editorial scenario grammar; no stable complete feed or update SLA
- Price classification: unclear
- Primary references: [nflScenarios](https://operations.nfl.com/updates/the-game/nfl-week-18-playoff-scenarios-multi-team-contests-for-no-1-seeds-and-division-titles/), [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions).

### NFL-owned public machine API discovery

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Indexed legacy schema reported by independent review; current/historical payload availability unverified
- Identity: Names/slugs require pinned aliases; not adopted
- Automation: Indexed schema lead only; gated documentation and actual payload/schema availability unverified
- Price classification: unclear
- Primary references: [nflApiDocs](https://api.nfl.com/docs/league/standings), [nflDeveloper](https://developer.nfl.com/get-started/overview), [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions).

### nflverse/nfldata games CSV

- Rates: Hosting limits apply; no feed-specific contractual quota verified
- Historical coverage: Multi-season schedule/results; corrected files overwrite current view; revision ledger not verified
- Identity: game_id + season/game_type + source team codes; preserve alias map and original IDs
- Automation: Already fetched by FORCE; extra provenance/finality inputs needed
- Price classification: unclear
- Primary references: [nfldata](https://github.com/nflverse/nfldata), [nfldataRoot](https://api.github.com/repos/nflverse/nfldata/contents), [schedules](https://nflreadr.nflverse.com/articles/dictionary_schedules.html), [updates](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).

### nflverse-data play-by-play input route

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Historical releases; current files may be corrected; no clinch revision log
- Identity: Game/team identifiers need reconciliation with schedule
- Automation: Existing derived game-flow path; new authoritative input audit still required
- Price classification: free
- Primary references: [dataLicense](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md), [updates](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).

### nflseedR open-source standings evaluator

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Caller supplies historical games; no historical terminal-state service
- Identity: nflverse codes plus division metadata; version-pin required
- Automation: R dependency or reviewed port; nothing installed/adopted
- Price classification: free
- Primary references: [seedCode](https://github.com/nflverse/nflseedR), [seedContract](https://nflseedr.com/reference/nfl_standings.html).

### ESPN public standings / undocumented API candidate

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: 2025 response observed with clincher codes *, e, y, z; historical code meanings/revisions require verification
- Identity: HTML team names/slugs; machine ID mapping unverified; clincher field observed; code mapping/precedence not verified
- Automation: Machine endpoint responds without credentials; undocumented schema/code mapping and Disney automated/commercial-use rights remain unresolved
- Price classification: unclear
- Primary references: [espn](https://www.espn.com/nfl/standings/_/playoff), [espnApi](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025), [espnApiCurrent](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2026), [disney](https://disneytermsofuse.com/english/).

### CBS public standings

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Historical pages/publications exist; point-in-time revisions UNKNOWN
- Identity: Names/slugs require pinned aliases; not adopted
- Automation: HTML/indexed text is fragile; no stable approved API verified
- Price classification: unclear
- Primary references: [cbs](https://www.cbssports.com/nfl/standings/), [cbsTerms](https://www.viacomcbs.legal/us/en/cbsi/terms-of-use).

### Yahoo public standings

- Rates: UNKNOWN; no published API quota verified
- Historical coverage: Historical pages/publications exist; point-in-time revisions UNKNOWN
- Identity: Names/slugs require pinned aliases; not adopted
- Automation: HTML/indexed text is fragile; no stable approved API verified
- Price classification: unclear
- Primary references: [yahoo](https://sports.yahoo.com/nfl/standings/), [yahooTerms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html).

### Sportradar NFL v7 Postgame Standings

- Rates: Trial 30 days, 1000 calls/rolling 30 days, 1 QPS; production quota per agreement
- Historical coverage: Season-year enum documented in Cycle 3 as 2014-2026; retention/revision rights UNKNOWN
- Identity: Team GUID, sr_id, alias; pin alias bridge to FORCE codes
- Automation: Server-side credentialed fetch/cache feasible; no current source integration
- Price classification: unclear
- Primary references: [sr](https://developer.sportradar.com/football/reference/nfl-postgame-standings), [srGuide](https://developer.sportradar.com/football/docs/nfl-ig-standings-retrieval), [srAccount](https://developer.sportradar.com/getting-started/docs/your-account), [srTerms](https://developer.sportradar.com/sportradar-updates/page/terms-and-conditions).

### SportsDataIO NFL Standings

- Rates: Commercial Leagues offering advertises unlimited calls; final quota/limits contractual
- Historical coverage: Season endpoint; archive access per license; point-in-time flag history UNKNOWN
- Identity: Team/TeamID/GlobalTeamID, conference/division; alias bridge required
- Automation: Server-side fetch/cache feasible; never consume scrambled trial as actual facts
- Price classification: unclear
- Primary references: [sd](https://sportsdata.io/developers/data-dictionary/nfl), [sdGuide](https://sportsdata.io/developers/workflow-guide/nfl), [sdLicense](https://sportsdata.io/help/data-rights-and-licensing-questions), [sdAccess](https://sportsdata.io/developers), [sdReplay](https://sportsdata.io/developers/replay).

### BALLDONTLIE NFL Standings

- Rates: ALL-STAR 60 requests/min; Free 5/min (no standings); GOAT 600/min
- Historical coverage: Provider advertises 2002-current NFL data; standings season examples 2023/2024; endpoint-specific availability untested
- Identity: Numeric team.id, abbreviation/conference/division; WSH needs FORCE WAS mapping
- Automation: Simple server-side fetch/cache feasible, but no state flags to consume
- Price classification: low/modest
- Primary references: [bdl](https://nfl.balldontlie.io/), [bdlTerms](https://www.balldontlie.io/terms.html).

## Hybrid contracts and remaining local proof

These are proposed proof obligations, **not implemented state derivations**. Every deduction requires verified source semantics, a positive terminal claim, season and normalized group identities, a covered-through-results watermark, fresh nonconflicting evidence, correction invalidation, and a versioned applicable format with exceptional rulings excluded. The [format reference](https://static.www.nfl.com/image/upload/league/apps/league-site/media-guides/2024/2024_Record_and_Fact_Book_incl_Supplemental.pdf) establishes the standard one-bye arrangement; it must be reverified for the adopted season. A page's home-field wording must not be assumed to mean the same thing across exceptional postseason arrangements.

| Conditional certificate | Valid conclusion | Boundary / missing coverage |
| --- | --- | --- |
| One verified division champion | Every other member of that division is division-title eliminated | Says nothing about earlier elimination before a champion exists, playoff elimination or bye state |
| One verified conference bye winner; exactly one bye | Every other conference member is bye eliminated | Earlier bye elimination still missing |
| Verified bye; only conference seed 1 receives it | Seed 1 locked | No seeds 2–7 lock proof |
| Verified division, wildcard or bye clinch under normal qualification | Playoff berth clinched for that team | Positive sufficient proof only; not exhaustive berth detection |
| Verified full-conference home-field clinch; normal format maps it to the sole bye | Bye clinched for that team | Verify exact marker meaning; exceptions invalidate the mapping |
| Authoritative/final overall playoff elimination; standard qualification and no exception | Division-title and bye elimination for that team | Sufficient only; no exact-seed conclusion |

The common premises and conclusions are recorded as `divisionOther`, `byeOther`, `byeSeed1`, `qualifiedBerth` and `homefieldBye`. The named `overallEliminated` proof adds: standard format applies; an authoritative/final overall-eliminated marker refers to this team and snapshot; no exceptional league ruling defeats qualification; watermark, freshness and correction invalidation are verified. Because division champions and first-round-bye teams necessarily qualify, overall elimination implies that team’s division-title and bye elimination. It never infers exact seed. Five source rows use this sufficient proof where their documentary scope supports overall elimination; it is conditional, not a verified live marker or exhaustive early-elimination feed. Other-champion/bye-winner certificates remain separate alternatives. No provider field is invented.

| Route under investigation | What external evidence supplies | What local proof or additional publication is still required |
| --- | --- | --- |
| Permission-backed free NFL/ESPN/CBS terminal markers | The verified primitives actually published; overall berth depends on the view | Early division/bye elimination, missing route-independent berth, locks 2–7, exceptional cases; provenance and transport gaps first |
| Sportradar flags + bounded certificates | Enum-mapped primitives after precedence/meaning verification | Missing early outcome-specific elimination and seeds 2–7; exclusive enum must not discard previously secured berth knowledge |
| SportsDataIO flags + bounded certificates | Three positive route flags and overall elimination | Route-independent berth clinch, early division/bye elimination, seeds 2–7; false/null cannot fill gaps |
| Free schedule/results + local proof | Records and completed-game inputs | Every terminal outcome not independently published, with full official evaluator and universal proof as needed |
| Modest paid standings inputs + local proof | Inputs/current rank only | Nearly the same solver burden as free inputs; does not buy terminal-state coverage |

Unknown/missing/late actual-state markers preserve the already approved 99%/1% probability bounds. A false negative or missing marker is comparatively benign for this certainty-display contract; a false positive terminal marker is dangerous because it can incorrectly permit/force 100%/0%. Source evaluation therefore prioritizes precision and authority of positive terminal markers over exhaustive marker availability. This is decision support for the existing display rule; production display is unchanged. Unknown/stale-state labeling and source handling still require owner direction. It does not authorize the display now. No route may treat sampling absence, zero/100% odds, historical final standings or a representative seed as a certificate.

## Minimum authoritative local-solver contract

The current FORCE evaluator fails this boundary, as Cycle 3 demonstrated. A future solver would need:

1. **Versioned rules and complete inputs.** Stable original game/team IDs, season type, conference/division membership, full remaining schedule and cancellations/rescheduling, completed-game status/finality and revisions. Preserve final scores, points for/against, touchdowns for/against and scoring provenance. Team aliases, relocated teams and cross-season mappings are explicit. Game counts alone certify neither schedule completeness nor official validity.
2. **Records and ties.** Correct W/L/T and winning percentages with a tie counted as half a win and half a loss, including unequal completed-game counts. Enumerate every remaining win/loss/tie possibility. Never reuse the current two-branch sampler as exhaustive evidence.
3. **Complete official tiebreak evaluator.** Division: head-to-head, division percentage, common games, conference percentage, strength of victory, strength of schedule, combined points-scored/allowed ranks within conference and league, net points in common games, net points in all games, net touchdowns, then official coin toss. Cross-division wildcard: head-to-head where applicable, conference percentage, common games with the four-game minimum, strength of victory/schedule, conference/league combined points ranks, conference/all-game net points, net touchdowns, then coin toss. Implement multi-team head-to-head sweeps, division reduction before wildcard comparisons, official one-club-advances/restart behavior after each tiebreak resolution, and the official reapplication procedure for division-winner seeding and successive wildcard berths/seeds. Division winners use wildcard comparisons; wildcard seeding preserves division order and reapplies eligible comparisons. Points-ranking ties share positions. Criteria are ordered, with each context's eligibility rules; no rating/code-order substitute. References: [rules](https://www.nfl.com/standings/tie-breaking-procedures), [seedRules](https://nflseedr.com/articles/tiebreaker.html).
4. **Future score/TD and cross-conference dependencies.** W/L/T assignments alone do not settle later points/TD rules. Strength of victory/schedule and league-wide rank criteria depend on other teams' outcomes. Future scores/TD totals require sound bounds or symbolic treatment, not arbitrarily picked scores. A proof may stop at an earlier decisive criterion only when all later criteria are provably irrelevant.
5. **Official unresolved/exceptions contract.** Before an official coin toss, prove claims across every permitted resolution or return unknown; never randomize certainty. Unequal schedules, suspended/cancelled games, special league rulings and exceptional home-field arrangements need an authoritative rules version and explicit handling. The 2022 season is an important exceptional fixture, not a template silently applied to 2026.
6. **Universal certificate.** Clinched means the outcome holds in every admissible completion and official tiebreak/exception resolution; eliminated means it holds in none. Exact seed lock requires the same seed in all such completions. A negative flag or failure to prove is neither certificate. A witness can refute clinching but cannot prove elimination. Timeout, missing data or unverifiable finality returns unknown with a reason. Sufficient bounds may certify a subset without exhaustive enumeration, provided their proof is sound.
7. **Independent testing.** A tiny exhaustive oracle over synthetic schedules; two-/multi-team restart, sweep, common-game minimum, ties, net points/TD and coin branches; season-rule changes and unequal games; correction replay that retracts dependent facts; published historical scenarios/results as a separately verified oracle; metamorphic alias/order tests; completeness and monotonicity only within one unchanged snapshot/rule set. Synthetic data is visibly labeled and never production prevalence.

Engineering complexity is **high** for comprehensive state, substantially beyond ranking one fixed snapshot. Cycle 3's structural `3^R` count illustrates growth for R remaining games, not a runtime estimate or a full tiebreak/score proof. A small conditional certificate is lower complexity but limited coverage. No person-day estimate, full solver or production algorithm is supplied.

## FORCE transport/finality boundary

The server's `UPSTREAMS` whitelist already fetches the nfldata schedule CSV through `/api/schedule` with a 300-second TTL. `fetch_upstream` uses memory/disk last-good fallback; a successful cache timestamp is not a source's corrected-through or finality timestamp. The Worker has fixed snapshot feeds, private cache namespace and freshness windows; it has no terminal-state source. References: [server](force_server.py), [Worker](src/index.js).

Browser-normalized rows omit original game identity/type, and projection outcome maps drop score evidence. That prevents treating the browser's current projection inputs as a complete authoritative solver contract. References: [Cycle 3 diagnostic](scripts/lib/postseason_state_audit.js), [projection application](assets/app.js).

A separately authorized source adapter would need approved transport/rights, server-only keys where applicable, explicit team/season mapping, source identity/schema/rules version, received-at **and covered-through** timestamps, positive/negative/unknown semantics per outcome, correction revision/retraction, collision/conflict checks and stale/fallback invalidation. Last-good data can support continuity but not newly certified current state. This investigation adds none of that production consumption.

## Cost / engineering comparison

| Route | Direct cost established | Maintenance / complexity | Fragility and authority | Coverage / unresolved facts |
| --- | --- | --- | --- | --- |
| Free published terminal state + limited proof | Public reading $0; automated rights/cost UNKNOWN | Medium/high verification and ingestion work; limited proofs lower than full solver | NFL publications strongest provenance; HTML/grammar fragile; no adopted API | Useful partial primitives; current transport/rights/finality and early-state/seed gaps |
| Free licensed inputs + full local proof | $0 licensed-input access where proven; exact nfldata license UNKNOWN | High evaluator/proof/exception maintenance and independent oracle burden | No external terminal-feed dependency; authority depends on inputs, rules and verified proof | Potential full scope; current machinery is insufficient |
| Sportradar or SportsDataIO + bounded local proof | UNKNOWN production quote; do not classify as affordable | Provider adapter plus gap proofs and correction replay | Documented schemas; production terms and semantic guarantees unverified | Broader primitives than input-only route; not exhaustive outcome-specific state |
| BALLDONTLIE standings + local proof | Published minimum $9.99/month | Still high solver burden; another input adapter | Documented API; terms/SLA and actual access not tested | No documented terminal flags in reviewed endpoint |

This comparison leaves strategy open. The published modest tier cannot be preferred over adequate free inputs merely for convenience. Quote-only providers fail the affordability evidence test at present; their enterprise sales/licensing process is a practical negative under the owner's constraint. That does not prove their actual eventual price is high. No source has cleared all adoption gates.

## Remaining owner/provider questions and next bounded investigation

- **Free route:** Can an NFL-owned or otherwise permission-backed public machine source expose current berth/overall elimination/division/bye primitives with documented correction watermarks? Which exact service permits FORCE's automated public use, at what quota, and can historical revisions be replayed? Free adequacy remains unproven; absence of discovered API is not absence of one.
- **Inputs:** What production license applies to the exact nfldata schedule CSV? Can score/net-TD and official finality inputs be reconciled across licensed releases with stable game IDs and revisions? Do not change the current feed in this tranche.
- **Sportradar:** Exact `conference` meaning, enum precedence and preservation of route-independent berth; false/absent semantics, every outcome's correction/retraction and latency, current-season/point-in-time rights, FORCE production redistribution scope, minimum price/quota. Contact-sales pricing is UNKNOWN.
- **SportsDataIO:** Route-independent berth before division outcome resolves; nullable/false semantics; flag-specific update/retraction and revision history; postseason freeze implications; stable IDs through postponed/suspended/rescheduled games; commercial minimum and FORCE rights. Public pricing descriptions differ on volume considerations; obtain a scoped contract rather than assume unlimited rights.
- **BALLDONTLIE:** Whether another documented product adds terminal fields (not established here), endpoint-specific history/finality/corrections, and FORCE's compatibility with competition/resale terms. The published standings tier alone does not answer UX-25.
- **Owner:** Required outcome completeness versus an explicitly unknown partial contract; acceptable source authority, freshness and stale/conflict treatment; unknown-state presentation coordinated with UX-11; any paid budget only after adequate-free investigation and actual licensing/cost evidence. These remain choices, not defaults selected by this document.

**Recommended next investigation:** a separately authorized, bounded verification of free-source automated-use permission, stable payload schema and corrected-through watermark, including historical/correction evidence. If that cannot establish adequate free coverage, return the exact gaps before requesting a scoped paid quote or authorizing a proof prototype. This is a sequence of evidence gates under the owner's policy, not a source adoption or authorization for new work.

## Offline checks and reproducibility

`scripts/lib/postseason_source_contract.js` pins all 13×8 canonical status/proof pairs and the source free/paid and price classifications. Any classification revision requires a deliberate fixture **and validator baseline** review. It checks citation-key/HTTPS structure, distinct outcome scopes, proof-to-outcome allowlists and explicit snapshot premises; it rejects explicit seed-lock YES absent a separately reviewed verified lock-field contract (none registered). Published numeric cost requires the curated published-price evidence, matching citation URL and amount; quote-only production prices remain UNKNOWN. These are offline structural/curated contract guarantees, not semantic verification of citations, provider truth, proof execution, legal rights or live completeness. URLs are provenance, not archived response hashes. All Cycle 3 evidence and byte-determinism checks remain; 24 named attacks, all 104 cell reclassifications and six incompatible proof/outcome pairings are rejected. Named mutation cases exercise unsupported promotion/demotion, seed/rank confusion, wrong-direction proofs, invented price and paid-to-free relabeling. No production imports or network calls were added.

Run `node scripts/run_tests.mjs --test test_postseason_state_audit.mjs` for the focused regression. The following verification records the standalone Codex lane before integration; Cycle 4 candidate `681a961` passed final independent review and was merged to local main; it is not pushed or deployed. Current post-merge results are in the [testing guide](scripts/TESTING.md). Authoritative LF export passed catalog/inventory (253 entries; 141 safe, 112 exclusions), safe 141/141, model 46/46, release 17/17, focused UX-25 plus UX-10 2/2, and canonical public build/parity. Native focused UX-25 passed 1/1; both changed JS/MJS syntax checks passed. The existing CLI remains byte-deterministic. Final diff checks passed after correcting mixed line endings in the roadmap edit; all 34 lane-local authoritative IDs remained unique before Claude’s MD-03 addition (the combined Cycle 4 roadmap has 35), local roadmap links resolve and non-UX-25 roadmap content is unchanged. At that lane-local check, main, generated/public, model and runtime sources were unchanged.

## Primary references

References checked publicly on 2026-10-02; some historical/indexed evidence is qualified above. These URLs support research, not an adopted live endpoint contract.

- [nflStandings](https://www.nfl.com/standings/conference/2025/reg)
- [nflPro](https://pro.nfl.com/fantasy/stats)
- [nflTerms](https://www.nfl.com/_amp/2024-nfl-com-terms-and-conditions)
- [nflScenarios](https://operations.nfl.com/updates/the-game/nfl-week-18-playoff-scenarios-multi-team-contests-for-no-1-seeds-and-division-titles/)
- [rules](https://www.nfl.com/standings/tie-breaking-procedures)
- [format](https://static.www.nfl.com/image/upload/league/apps/league-site/media-guides/2024/2024_Record_and_Fact_Book_incl_Supplemental.pdf)
- [nfldata](https://github.com/nflverse/nfldata)
- [nfldataRoot](https://api.github.com/repos/nflverse/nfldata/contents)
- [schedules](https://nflreadr.nflverse.com/articles/dictionary_schedules.html)
- [updates](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html)
- [dataLicense](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md)
- [seedCode](https://github.com/nflverse/nflseedR)
- [seedContract](https://nflseedr.com/reference/nfl_standings.html)
- [seedRules](https://nflseedr.com/articles/tiebreaker.html)
- [espn](https://www.espn.com/nfl/standings/_/playoff)
- [espnApi](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025)
- [disney](https://disneytermsofuse.com/english/)
- [cbs](https://www.cbssports.com/nfl/standings/)
- [cbsTerms](https://www.viacomcbs.legal/us/en/cbsi/terms-of-use)
- [yahoo](https://sports.yahoo.com/nfl/standings/)
- [yahooTerms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html)
- [sr](https://developer.sportradar.com/football/reference/nfl-postgame-standings)
- [srGuide](https://developer.sportradar.com/football/docs/nfl-ig-standings-retrieval)
- [srAccount](https://developer.sportradar.com/getting-started/docs/your-account)
- [srTerms](https://developer.sportradar.com/sportradar-updates/page/terms-and-conditions)
- [sd](https://sportsdata.io/developers/data-dictionary/nfl)
- [sdGuide](https://sportsdata.io/developers/workflow-guide/nfl)
- [sdLicense](https://sportsdata.io/help/data-rights-and-licensing-questions)
- [sdAccess](https://sportsdata.io/developers)
- [sdReplay](https://sportsdata.io/developers/replay)
- [bdl](https://nfl.balldontlie.io/)
- [bdlTerms](https://www.balldontlie.io/terms.html)
- [nflApiDocs](https://api.nfl.com/docs/league/standings)
- [nflDeveloper](https://developer.nfl.com/get-started/overview)
- [espnApiCurrent](https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2026)
- [nfldataStandings](https://github.com/nflverse/nfldata/blob/master/data/standings.csv)
- [nfldataDictionary](https://github.com/nflverse/nfldata/blob/master/DATASETS.md)
- [wikimediaReuse](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse)
- [wikimediaAccess](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy)
- [mysportsfeedsPrice](https://www.mysportsfeeds.com/feed-pricing/)
