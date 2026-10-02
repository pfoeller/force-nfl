// Offline research validation only. No provider parsing, actual-state mapping,
// network, selection or production consumption.
export function validateSourceContracts(matrix) {
  const fail = message => { throw new Error(message); };
  if (matrix?.schema !== 1 || matrix.evidenceKind !== 'offline-documentary-research-not-provider-payloads'
      || matrix.strategySelected !== null || matrix.productionReady !== false) fail('Research must not adopt a source or certify production readiness');
  const outcomes = ['playoffClinched','playoffEliminated','divisionClinched','divisionEliminated','byeClinched','byeEliminated','exactSeedLocked','conferenceRank'];
  if (JSON.stringify(matrix.outcomes) !== JSON.stringify(outcomes)) fail('Outcome scopes must remain distinct');
  const knownRefs = keys => Array.isArray(keys) && keys.every(k => typeof matrix.refs?.[k] === 'string' && /^https:\/\//.test(matrix.refs[k]));
  const ids = new Set(), counts = {YES:0, NO:0, INFERABLE:0, UNKNOWN:0};
  if (!Array.isArray(matrix.sources) || !matrix.sources.length) fail('Source inventory required');
  for (const source of matrix.sources) {
    if (!source.id || ids.has(source.id)) fail('Unique source identity required');
    ids.add(source.id);
    if (!['FREE','PAID'].includes(source.kind) || !knownRefs(source.refs) || !source.refs.length) fail('Source provenance/access classification required');
    for (const k of ['authentication','rateLimits','productionUse','currentCost','priceClass','freshness','correctionFinality','history','mapping','automation','confidence'])
      if (typeof source[k] !== 'string' || !source[k].trim()) fail('Missing source boundary: '+k);
    if (source.minimumMonthlyUsd != null && (!Number.isFinite(source.minimumMonthlyUsd) || source.minimumMonthlyUsd <= 0 || source.kind !== 'PAID')) fail('Paid production price must not become free or guessed');
    if (source.priceClass === 'low/modest' && source.minimumMonthlyUsd == null) fail('Affordability needs a published numeric price');
    if (JSON.stringify(Object.keys(source.outcomes || {}).sort()) !== JSON.stringify([...outcomes].sort())) fail('Missing or collapsed outcome');
    for (const key of outcomes) {
      const c = source.outcomes[key];
      if (!c || !Object.hasOwn(counts,c.status) || !c.basis?.trim() || !knownRefs(c.refs)) fail('Unsupported evidence classification');
      if (c.status !== 'UNKNOWN' && !c.refs.length) fail('Claim needs primary provenance');
      if (c.status === 'INFERABLE') {
        const proof = matrix.proofs?.[c.proof];
        if (!proof || !knownRefs(proof.refs) || !proof.refs.length || !proof.conclusion?.trim()
            || !Array.isArray(proof.premises) || proof.premises.length < 5
            || !proof.premises.some(p => /watermark/.test(p))
            || !proof.premises.some(p => /corrections/.test(p))
            || !proof.premises.some(p => /exceptional/.test(p))) fail('Inference needs explicit conditional proof and snapshot boundaries');
      } else if (Object.hasOwn(c,'proof')) fail('Non-inference must not smuggle a proof or convert UNKNOWN');
      counts[c.status]++;
    }
  }
  return {evidenceKind:matrix.evidenceKind, sources:ids.size, coverageClaims:counts, strategySelected:null, productionReady:false};
}
