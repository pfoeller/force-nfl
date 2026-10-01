import json,re,pathlib,subprocess,sys,os
root=pathlib.Path(__file__).resolve().parents[1]
os.chdir(root)

def parse_window(path, name):
    s=path.read_text()
    m=re.search(rf"window\.{re.escape(name)} = (.*);\s*$",s,re.S)
    assert m, f'{path.name} does not parse'
    return json.loads(m.group(1))

d=parse_window(root/'data/model-data.js','MODEL_DATA')
assert len(d['rankings'])==32, len(d['rankings'])
assert len({r['team'] for r in d['rankings']})==32
assert not ({'STL','SD','OAK','LA','JAC'} & {r['team'] for r in d['rankings']})

m=parse_window(root/'data/matchup-data.js','MATCHUP_DATA')
qbc=parse_window(root/'data/qb-carryover.js','QB_CARRYOVER')
assert qbc['meta']['defaultEnabled'] is True
assert qbc['meta']['promotionDecision']=='verified-regime-auto'
assert abs(qbc['presets']['KC']['suggestedRestoreElo']-47.3)<0.01
assert abs(qbc['presets']['KC']['automaticInitialRestoreElo']-15.75)<1e-9
assert qbc['presets']['KC']['autoEligible'] is True
assert qbc['study']['week1to8']['episodesImproved']==7
assert set(m['profiles'])==set(d['teams']), (set(d['teams'])-set(m['profiles']),set(m['profiles'])-set(d['teams']))
for t,p in m['profiles'].items():
    for k in ['offenseIndex','offenseComposite','defenseIndex','olIndex','frontIndex','coverageIndex','qbIndex','receiverIndex','rushIndex']:
        assert 0 <= float(p[k]) <= 100, (t,k,p[k])
    assert 'luck' in p and 'penalty' in p and 'scoring' in p, (t,p.keys())

app=(root/'assets/app.js').read_text()
styles=(root/'assets/styles.css').read_text()
html=(root/'index.html').read_text()
assert 'refreshSchedule' in app and 'REFRESH_MS = 60 * 60 * 1000' in app
assert "setInterval(() => refreshSchedule('hourly'), REFRESH_MS)" in app
assert 'FORCEcast' in app
assert 'function matchupPage(g)' in app and 'data-game=' in app
assert 'gameHistory' in app and 'g.week < beforeWeek' in app
assert 'Predicted final score' in app and 'Predicted line' in app and 'forecastAudit' in app
assert 'postgameAudit' in app and 'Predicted rematch line' in app and 'What changed' in app
assert 'divisionCompression: 0.0' in (root/'model/adaptive_v3.js').read_text()
assert 'band-low' in styles and 'band-mid' in styles and 'band-high' in styles
assert 'prediction-finale' in styles and 'matchup-hero' in styles
assert 'diagnostic-viewer' in styles and 'unit-board' in styles
assert 'forceRatingView' in app and 'data-ratingview' in app
assert all(x in app for x in ['Luck', 'Penalties', 'Units', 'Advanced'])
assert 'model/unit_force_bridge.js' in html and 'model/adaptive_v3.js' in html and 'model/score_normalizer.js' in html and 'model/live_profiles.js' in html and 'data/opening-lines.js' in html and 'data/matchup-data.js' in html and 'data/qb-carryover.js' in html and 'data/predictive-feature-gates.js' in html and 'model/predictive_features.js' in html and 'model/qb_regime.js' in html and 'model/early_regime.js' in html and 'model/retrospective_strength.js' in html and 'model/unit_prior_controller.js' in html
assert 'QB Return Lab' in app and 'ratingsWithQBCarryover' in app
assert 'refreshLiveMetrics' in app and '/api/team-stats' in app and '/api/player-stats' in app and '/api/ftn-charting' in app and '/api/pfr-pass' in app and '/api/pfr-pass-prior' in app and '/api/current-pressure' in app and '/api/schedule' in app
server=(root/'force_server.py').read_text()
assert 'stats_team_week_2026.csv' in server and 'stats_player_week_2026.csv' in server and 'ftn_charting_2026.csv' in server and 'advstats_week_pass_2026.csv' in server and 'advstats_week_pass_2025.csv' in server and 'games.csv' in server and 'STAT_RANKINGS_URL' in server and 'pressure-current.manual.json' in server
assert 'force_server.py' in (root/'serve_local.sh').read_text() and 'force_server.py' in (root/'serve_local.bat').read_text()
assert 'LP.buildProfiles' in app and '2025 unit snapshot' not in app
assert all(x in app for x in ['passRushIndex','runDefenseIndex','36% coverage, 16% pass rush, 28% run defense, and 20% points allowed per opponent drive'])
live=(root/'model/live_profiles.js').read_text()
assert 'DEFENSE_WEIGHTS = { coverageIndex: 0.36, passRushIndex: 0.16, runDefenseIndex: 0.28, pointsAllowedPerDriveIndex: 0.20 }' in live
assert 'defenseCompositeFrom({coverageIndex,passRushIndex,runDefenseIndex,pointsAllowedPerDriveIndex})' in live
assert 'Legacy compatibility only' in live
assert (root/'CHANGELOG_V115.md').exists() and (root/'CHANGELOG_V114.md').exists() and (root/'CHANGELOG_V113.md').exists() and (root/'CHANGELOG_V112.md').exists() and (root/'CHANGELOG_V111.md').exists() and (root/'CHANGELOG_V110.md').exists() and (root/'CHANGELOG_V109.md').exists() and (root/'CHANGELOG_V108.md').exists() and (root/'CHANGELOG_V104.md').exists() and (root/'CHANGELOG_V103.md').exists() and (root/'CHANGELOG_V102.md').exists() and (root/'CHANGELOG_V101.md').exists() and (root/'CHANGELOG_V100.md').exists() and (root/'CHANGELOG_V47.md').exists() and (root/'CHANGELOG_V46.md').exists() and (root/'CHANGELOG_V45.md').exists() and (root/'UPDATE_CENTER_V45.md').exists() and (root/'CHANGELOG_V44.md').exists() and (root/'PRESSURE_FRESHNESS_V44.md').exists() and (root/'data/pressure-current.manual.json').exists() and (root/'CHANGELOG_V43.md').exists() and (root/'FTN_PRESSURE_PROVIDER_V43.md').exists() and (root/'CHANGELOG_V42.md').exists() and (root/'CHANGELOG_V41.md').exists() and (root/'CHANGELOG_V35.md').exists() and (root/'FORECAST_COHERENCE_V35.md').exists() and (root/'CHANGELOG_V37.md').exists() and (root/'CHANGELOG_V38.md').exists() and (root/'CHANGELOG_V29.md').exists() and (root/'DEFENSE_COMPONENT_AUDIT_V29.md').exists()
assert (root/'CHANGELOG_V30.md').exists() and (root/'PREDICTIVE_FEATURE_POLICY_V30.md').exists() and (root/'CHANGELOG_V31.md').exists() and (root/'CHANGELOG_V32.md').exists() and (root/'CHANGELOG_V33.md').exists() and (root/'QB_REGIME_RESEARCH_V33.md').exists() and (root/'CHANGELOG_V34.md').exists() and (root/'EARLY_REGIME_RESEARCH_V34.md').exists()
assert (root/'data/predictive-feature-gates.js').exists() and (root/'model/predictive_features.js').exists()
assert (root/'scripts/test_v29_defense_components.js').exists() and (root/'scripts/test_v29_week1_replay.js').exists()
assert 'Unit, luck, and penalty data use the bundled' not in app
assert all(x in app for x in ['FORCE Score','FORCE Rankings','FORCEcast','About FORCE'])
assert 'Weaknesses' in app and 'Watch-outs' not in app
assert 'data-ranksort' in app and 'quickQbButton' in app and 'data-qbquick' in app
assert 'matchup-pair' in app and 'teamAccentStyle' in app
status=json.loads((root/'benchmarks/adaptive_v3_status.json').read_text())
assert status['validated_adaptive_brier'] is None
assert status['champion_baseline']['brier']==0.2095
subprocess.run([sys.executable,str(root/'scripts/test_forecast_v2.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_adaptive_v3.py')],check=True)
subprocess.run(['node','--check',str(root/'assets/app.js')],check=True)
subprocess.run(['node','--check',str(root/'model/forecast_v2.js')],check=True)
subprocess.run(['node','--check',str(root/'model/score_normalizer.js')],check=True)
subprocess.run(['node','--check',str(root/'model/adaptive_v3.js')],check=True)
subprocess.run(['node','--check',str(root/'model/live_profiles.js')],check=True)
subprocess.run(['node','--check',str(root/'model/predictive_features.js')],check=True)
subprocess.run(['node','--check',str(root/'model/qb_regime.js')],check=True)
subprocess.run(['node','--check',str(root/'model/early_regime.js')],check=True)
subprocess.run(['node','--check',str(root/'model/retrospective_strength.js')],check=True)
subprocess.run(['node','--check',str(root/'model/unit_prior_controller.js')],check=True)
subprocess.run(['node','--check',str(root/'model/unit_force_bridge.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v24_live_metrics.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v24_refresh_integration.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v25_proxy.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v26_postgame_consistency.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v27_metric_transform_smoke.js')],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node',str(root/'scripts/test_v28_metric_transform_smoke.js')],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node',str(root/'scripts/test_v28_current_state_consistency.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v29_defense_components.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v30_predictive_gates.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v31_force_line_calibration.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v32_market_decay_rounding.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v33_qb_regime.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v34_early_regime.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v35_forecast_coherence.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v36_rematch_units_export.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v37_unit_prior.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v38_units_force.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v39_units_force_color.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v40_team_logos.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v40_rankings_export.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v40_unit_clarity.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v41_pass_rush_pressure.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v42_pass_rush_readiness_and_matchup_logos.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v43_ftn_pressure_provider.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v44_pressure_freshness.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v44_pressure_freshness.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v45_update_center.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v45_all_metric_freshness.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v45_unit_force_bridge.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v46_scale_logos_pressure_rescue.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v46_manual_pressure_write.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v47_score_prior_and_forecast_logos.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v48_vector_brand.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v49_brand_scale.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v50_brand_gloss_and_name.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v51_offseason_reversion.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v52_approved_png_brand.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v57_unit_regression_rb.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v57_forecast_cleanup.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v58_export_copy_minimal.js')],check=True)
subprocess.run([sys.executable,'-m','py_compile',str(root/'force_server.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_matchup_ui.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_forecast_audit_ui.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_diagnostic_views.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_qb_carryover_ui.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v10_ui.js')],check=True)
subprocess.run([sys.executable,str(root/'research/qb_carryover_event_study.py')],check=True,stdout=subprocess.DEVNULL)
subprocess.run([sys.executable,str(root/'research/v33_research_audit.py')],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node',str(root/'scripts/test_v59_logo_provider_aliases.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v60_lines_penalties_spread_context.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v61_spread_history_gate.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v62_context_scores.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v63_forcecast_brand.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v64_context_gate_and_bands.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v65_matchup_semantic_colors.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v66_divisions_playoffs.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v67_logo_only_team_marks.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v68_customer_rematch_export.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v69_canonical_historical_state.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v70_matchup_export_packing.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v71_game_flow_research.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v72_game_flow_scoring.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v73_matchup_donuts.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v74_matchup_donut_layout.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v75_playoff_structure.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v76_matchup_donut_export.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v77_game_flow_blend.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v77_game_flow_proxy.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v78_game_flow_output_only.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v79_forcecast_slate.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v81_penalty_impact.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v92_same_model_penalty_wpa.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v94_special_teams_penalty.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v97_score_aware_penalty.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v97_penalty_scale.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v97_penalty_debug_payload.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v82_integrity_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v82_server_cache.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v83_partial_week_freshness.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v98_retrospective_strength.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v99_rating_continuity.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v99_pass_rush_fallback.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v99_all_team_week2_units.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v99_32_team_ledger_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v100_points_per_drive.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v100_defense_ppd.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v100_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v101_coverage_pbp.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v101_coverage_separation.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v101_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v102_pbp_ol.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v102_offense_orthogonalization.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v102_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v103_qb_rush_pbp.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v103_qb_calibration.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v103_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v104_reference.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v104_qb_calibration.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v104_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v105_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v106_qb_stabilization.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v106_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v107_composite_scale.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v107_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v108_composite_scale.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v108_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v109_units_luck.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v109_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v110_luck.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v110_performance_payload.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v110_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v111_fumble_parser.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v111_luck.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v111_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v112_luck.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v112_contract.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v113_fumble_and_calibration.py')],check=True)
subprocess.run(['node',str(root/'scripts/test_v113_luck_isolation.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v113_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v114_unit_centering.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v114_contract.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v115_unit_orthogonalization.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v116_game_flow_valid_scores.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v117_luck_table.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v127_luck_rank.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v128_export_rankings.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v118_playoffs.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v119_playoff_export.js')],check=True)
subprocess.run(['node',str(root/'scripts/test_v123_playoff_record_seed_coherence.js')],check=True)
subprocess.run([sys.executable,str(root/'scripts/test_v83_partial_week_cache.py')],check=True)
print('OK: 32 canonical teams; same-origin nflverse proxy + 2026 team/player metric refresh present; live unit/EPA/luck/penalty profile tests pass; v2/v3 tests pass; completed-game audits include frozen forecast, final, rating movement, and next-week-weighted immediate rematch; rich matchup reports remain leak-safe; optional Strength/Luck/Penalties/Units/Advanced views pass UI smoke tests; v10 FORCE identity + balanced team-color matchup cards + sortable unit rankings + one-click verified QB carryover + returning-QB carryover lab, V27/V28 transform regressions, V28 canonical current-state contract, and V29 explicit pass-rush/run-defense split with mixed-evidence defense regression, V30 Brier-gated predictive-feature/QB-adjusted FORCE-line contracts, V31 coherent FORCE-line calibration, V32 week-decaying market blend/rounding/current-Brier regression, and V33 verified returning-QB regime correction/audit, V34 transient early-season regime acceleration/replay regressions, and V35 single-stream forecast/football-score normalization regressions, V36 rematch/Units/export regressions, V37 regime-aware unit-prior regressions, V38 Units/FORCE presentation, V39 Units FORCE semantic-color regressions, V40 ubiquitous team-logo, two-page rankings export, and unit-label/explainability regressions, V41 charted-pressure pass-rush regressions, V42 team-level pressure-readiness/matchup-logo regressions, V43 FTN-first pressure-provider regressions, V44 hard current-pressure freshness/automatic+manual provider regressions, V45 Update Center/all-metric freshness/Unit-to-FORCE regressions, and V46 asymptotic-scale/logo/manual-pressure-rescue regressions, V48–V50 branding regressions, V51 current-era offseason-reversion regression, V52 approved-PNG brand regression, V57 regressed-unit/RB/forecast-cleanup regressions, V60 display/penalty/spread-context regressions, and V61 early-season spread-history display gate, V62 unified 0–100 context-score regressions, V66 division/playoff regressions, V67 logo-only team-mark regressions, V69 canonical historical-state regressions, V70 matchup-export pagination regressions, V71 Game Flow research/presentation regressions, and V78 output-only Game Flow regressions and V81 four-component penalty-impact regressions, and V82 live-data integrity/last-known-good cache regressions, and V83 team-specific partial-week freshness/cache-merge regressions, V98 retrospective look-behind, and V99 rating-continuity/pass-rush-fallback contracts plus V100 defensive points-per-drive outcome/diagnostic contracts and V101 sack-free Coverage separation plus V102 orthogonal offense/opponent-adjusted-QB, V103 stable-QB/rushing-bonus, and V104 historical-QB/like-for-like RB+OL calibration contracts pass.')
subprocess.run(['node',str(root/'scripts/test_v124_representative_playoff_projection.js')],check=True)
