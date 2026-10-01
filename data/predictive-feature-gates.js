window.PREDICTIVE_FEATURE_GATES = {
  meta: {
    version: 'v45',
    policy: 'Separate additive forecast features still require a pregame-safe non-harmful Brier test. In V45, first-class unit ratings instead feed the canonical FORCE rating through the bounded Unit-to-FORCE bridge; their registry predictiveWeight remains zero so they are not double-counted as additive forecast features.',
    benchmarkWindow: '2023-2025 unless a feature-specific study says otherwise'
  },
  features: {
    elo: { status: 'accepted', predictiveWeight: 1.0, baselineBrier: 0.2170, candidateBrier: 0.2170, deltaBrier: 0.0, note: 'Core independent FORCE rating.' },
    market: { status: 'accepted', predictiveWeight: 0.98, baselineBrier: 0.2170, candidateBrier: 0.2095, deltaBrier: -0.0075, note: 'Validated closing-line benchmark; live/opening lines may differ.' },
    earlyRegime: { status: 'accepted-provisional-early-window', predictiveWeight: 1.0, baselineBrier: 0.23406731168831169, candidateBrier: 0.22645485008034283, deltaBrier: -0.00761246160796886, note: 'V34 transient Weeks 2-6 prior-failure detector. On the preserved 2025 rounded-probability replay, early-window Brier improved by 0.007612; Weeks 7+ are exactly unchanged. The local 288-config robustness neighborhood improved both Weeks 2-3 and Weeks 4-6 in every tested configuration. Multi-season row-level replay is not preserved in the supplied archive, so this remains explicitly provisional.' },
    qbCarryover: { status: 'accepted-verified-regime', predictiveWeight: 1.0, baselineBrier: 0.2316760387, candidateBrier: 0.2218171743, deltaBrier: -0.0098588644, note: 'V33 automatic rule is restricted to verified returning-starter decline cases. In the six-case gated prior-isolation subset, 7.5 Elo per missed start with a 4-game half-life improved 5/6 episodes and about 0.009859 Brier over Weeks 1-8. Unverified teams receive zero.' },
    offenseComposite: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    offenseIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    qbIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    receiverIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    olIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    defenseIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    coverageIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    passRushIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    runDefenseIndex: { status: 'rating-input-v45', predictiveWeight: 0, deltaBrier: null, note: 'Feeds canonical FORCE through the V45 Unit-to-FORCE bridge where applicable; no separate additive forecast feature weight.' },
    rushIndex: { status: 'diagnostic-v57', predictiveWeight: 0, deltaBrier: null, note: 'Team rushing EPA remains a diagnostic; V57 uses RB-specific efficiency for the first-class positional unit.' },
    rbIndex: { status: 'rating-input-v57', predictiveWeight: 0, deltaBrier: null, note: 'First-class RB/FB efficiency unit feeding canonical FORCE through the Unit-to-FORCE bridge; no separate additive forecast feature weight.' },
    luck: { status: 'display-only', predictiveWeight: 0, deltaBrier: null },
    penalties: { status: 'display-only', predictiveWeight: 0, deltaBrier: null }
  }
};
