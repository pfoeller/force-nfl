// Offline research validation only. No provider parsing, state proof, network or adoption.
// Deliberate classification updates require reviewing both the fixture and this baseline.
const canonicalCoverage = {
  "nfl-standings": [
    "YES",
    "UNKNOWN",
    "YES",
    "INFERABLE:divisionOther",
    "INFERABLE:homefieldBye",
    "UNKNOWN",
    "UNKNOWN",
    "YES"
  ],
  "nfl-pro": [
    "YES",
    "YES",
    "YES",
    "INFERABLE:overallEliminated",
    "YES",
    "INFERABLE:overallEliminated",
    "INFERABLE:byeSeed1",
    "YES"
  ],
  "nfl-bulletins": [
    "YES",
    "UNKNOWN",
    "YES",
    "INFERABLE:divisionOther",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN"
  ],
  "nfl-public-api": [
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN"
  ],
  "nfldata": [
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO"
  ],
  "nflverse-pbp": [
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO"
  ],
  "nflseedr": [
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "YES"
  ],
  "espn": [
    "INFERABLE:qualifiedBerth",
    "YES",
    "YES",
    "INFERABLE:overallEliminated",
    "YES",
    "INFERABLE:overallEliminated",
    "INFERABLE:byeSeed1",
    "YES"
  ],
  "cbs": [
    "YES",
    "YES",
    "YES",
    "INFERABLE:overallEliminated",
    "YES",
    "INFERABLE:overallEliminated",
    "INFERABLE:byeSeed1",
    "UNKNOWN"
  ],
  "yahoo": [
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN",
    "UNKNOWN"
  ],
  "sportradar": [
    "YES",
    "YES",
    "YES",
    "INFERABLE:overallEliminated",
    "UNKNOWN",
    "INFERABLE:overallEliminated",
    "INFERABLE:byeSeed1",
    "YES"
  ],
  "sportsdataio": [
    "INFERABLE:qualifiedBerth",
    "YES",
    "YES",
    "INFERABLE:overallEliminated",
    "YES",
    "INFERABLE:overallEliminated",
    "INFERABLE:byeSeed1",
    "YES"
  ],
  "balldontlie": [
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "NO",
    "YES"
  ]
};
const canonicalPrices = {
  "nfl-standings": [
    "FREE",
    "unclear"
  ],
  "nfl-pro": [
    "FREE",
    "unclear"
  ],
  "nfl-bulletins": [
    "FREE",
    "unclear"
  ],
  "nfl-public-api": [
    "FREE",
    "unclear"
  ],
  "nfldata": [
    "FREE",
    "unclear"
  ],
  "nflverse-pbp": [
    "FREE",
    "free"
  ],
  "nflseedr": [
    "FREE",
    "free"
  ],
  "espn": [
    "FREE",
    "unclear"
  ],
  "cbs": [
    "FREE",
    "unclear"
  ],
  "yahoo": [
    "FREE",
    "unclear"
  ],
  "sportradar": [
    "PAID",
    "unclear"
  ],
  "sportsdataio": [
    "PAID",
    "unclear"
  ],
  "balldontlie": [
    "PAID",
    "low/modest"
  ]
};
const proofOutcomes = {
  divisionOther: ['divisionEliminated'], byeOther: ['byeEliminated'],
  byeSeed1: ['exactSeedLocked'], qualifiedBerth: ['playoffClinched'],
  homefieldBye: ['byeClinched'], overallEliminated: ['divisionEliminated','byeEliminated']
};
// No verified explicit seed-lock field contract is registered. Current rank cannot qualify.
const verifiedSeedLockContracts = new Set();
const publishedPrices = {balldontlie: {minimumMonthlyUsd:9.99, ref:'bdl', url:'https://nfl.balldontlie.io/'}};
export function validateSourceContracts(matrix) {
  const fail = message => { throw new Error(message); };
  if (matrix?.schema !== 1 || matrix.evidenceKind !== 'offline-documentary-research-not-provider-payloads'
      || matrix.strategySelected !== null || matrix.productionReady !== false) fail('Research must not adopt a source or certify production readiness');
  const outcomes = ['playoffClinched','playoffEliminated','divisionClinched','divisionEliminated','byeClinched','byeEliminated','exactSeedLocked','conferenceRank'];
  if (JSON.stringify(matrix.outcomes) !== JSON.stringify(outcomes)) fail('Outcome scopes must remain distinct');
  const knownRefs = keys => Array.isArray(keys) && keys.every(k => typeof matrix.refs?.[k] === 'string' && /^https:\/\//.test(matrix.refs[k]));
  if (JSON.stringify(Object.keys(matrix.proofs || {}).sort()) !== JSON.stringify(Object.keys(proofOutcomes).sort())) fail('Proof catalog needs deliberate baseline revision');
  for (const proof of Object.values(matrix.proofs)) {
    if (!knownRefs(proof.refs) || !proof.refs.length || !proof.conclusion?.trim()
        || !Array.isArray(proof.premises) || proof.premises.length < 5
        || !proof.premises.every(p => typeof p === 'string')
        || !proof.premises.some(p => /watermark/.test(p))
        || !proof.premises.some(p => /corrections/.test(p))
        || !proof.premises.some(p => /exceptional/.test(p))) fail('Inference needs explicit conditional proof and snapshot boundaries');
  }
  const ids = new Set(), counts = {YES:0, NO:0, INFERABLE:0, UNKNOWN:0};
  if (!Array.isArray(matrix.sources) || matrix.sources.length !== Object.keys(canonicalCoverage).length) fail('Canonical source inventory required');
  for (const source of matrix.sources) {
    if (!Object.hasOwn(canonicalCoverage,source.id) || ids.has(source.id)) fail('Unique canonical source identity required');
    ids.add(source.id);
    if (!knownRefs(source.refs) || !source.refs.length) fail('Source provenance required');
    for (const k of ['authentication','rateLimits','productionUse','currentCost','priceClass','freshness','correctionFinality','history','mapping','automation','confidence'])
      if (typeof source[k] !== 'string' || !source[k].trim()) fail('Missing source boundary: '+k);
    const [kind,priceClass] = canonicalPrices[source.id];
    if (source.kind !== kind || source.priceClass !== priceClass) fail('Free/paid and price classification need deliberate baseline revision');
    const cost = source.costEvidence, published = publishedPrices[source.id];
    if (!cost?.basis?.trim() || !knownRefs(cost.refs) || !cost.refs.length) fail('Cost evidence required');
    if (source.minimumMonthlyUsd != null) {
      if (!published || source.kind !== 'PAID' || cost.mode !== 'published'
          || source.minimumMonthlyUsd !== published.minimumMonthlyUsd || cost.minimumMonthlyUsd !== published.minimumMonthlyUsd
          || !cost.refs.includes(published.ref) || matrix.refs[published.ref] !== published.url) fail('Numeric cost requires curated published price and primary citation');
    } else if (published || cost.mode !== 'unknown' || Object.hasOwn(cost,'minimumMonthlyUsd')) fail('Unpublished production price must remain UNKNOWN');
    if (source.kind === 'PAID' && !published && !/^UNKNOWN/.test(source.currentCost)) fail('Quote-only price must remain UNKNOWN');
    if (JSON.stringify(Object.keys(source.outcomes || {}).sort()) !== JSON.stringify([...outcomes].sort())) fail('Missing or collapsed outcome');
    for (const [index,key] of outcomes.entries()) {
      const c = source.outcomes[key];
      if (!c || !Object.hasOwn(counts,c.status) || !c.basis?.trim() || !knownRefs(c.refs)) fail('Unsupported evidence classification');
      if (c.status !== 'UNKNOWN' && !c.refs.length) fail('Claim needs primary provenance');
      if (key === 'exactSeedLocked' && c.status === 'YES' && !verifiedSeedLockContracts.has(source.id)) fail('Seed-lock YES needs an explicit verified lock-field contract; current rank is insufficient');
      if (c.status === 'INFERABLE') {
        if (!proofOutcomes[c.proof]?.includes(key)) fail('Proof does not support this outcome/direction');
      } else if (Object.hasOwn(c,'proof')) fail('Non-inference must not smuggle a proof or convert UNKNOWN');
      if (c.status+(c.proof?':'+c.proof:'') !== canonicalCoverage[source.id][index]) fail('Coverage status/proof needs deliberate canonical baseline revision');
      counts[c.status]++;
    }
  }
  return {evidenceKind:matrix.evidenceKind, sources:ids.size, coverageClaims:counts, strategySelected:null, productionReady:false};
}
