(function (root) {
  'use strict';
  const G = root.PREDICTIVE_FEATURE_GATES || { features: {} };
  function feature(name) { return G.features?.[name] || { status: 'display-only', predictiveWeight: 0, deltaBrier: null }; }
  function brierEligible(name) {
    const f = feature(name);
    return Number(f.predictiveWeight || 0) > 0 && Number.isFinite(Number(f.deltaBrier)) && Number(f.deltaBrier) <= 0;
  }
  function predictiveWeight(name) { return brierEligible(name) ? Number(feature(name).predictiveWeight || 0) : 0; }
  function acceptedFeatures() { return Object.keys(G.features || {}).filter(brierEligible); }
  function displayOnlyFeatures() { return Object.keys(G.features || {}).filter((k) => predictiveWeight(k) === 0); }
  root.FORCE_PREDICTIVE_FEATURES = { meta: G.meta || {}, feature, brierEligible, predictiveWeight, acceptedFeatures, displayOnlyFeatures };
})(window);
