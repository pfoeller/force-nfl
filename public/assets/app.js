(() => {
  'use strict';

  const D = window.MODEL_DATA;
  const F = window.SIGNAL_FORECAST_V2; // legacy module name; public product name is FORCE
  const SN = window.FORCE_SCORE_NORMALIZER || null;
  const A = window.SIGNAL_ADAPTIVE_V3; // legacy module name; public label is FORCE Adaptive
  const LP = window.FORCE_LIVE_PROFILE || null;
  const ALLOW_DEGRADED_TEST_DATA = Boolean(window.__FORCE_ALLOW_DEGRADED_TEST_DATA__) || (typeof process !== 'undefined' && process?.versions?.node);
  const M = window.MATCHUP_DATA || { meta: {}, profiles: {} };
  const QBC = window.QB_CARRYOVER || { meta: {}, presets: {}, study: {} };
  const PF = window.FORCE_PREDICTIVE_FEATURES || null;
  const QR = window.FORCE_QB_REGIME || null;
  const ER = window.FORCE_EARLY_REGIME || null;
  const RC = window.FORCE_RATING_CONTINUITY || null;
  const RS = window.FORCE_RETROSPECTIVE_STRENGTH || null;
  const UP = window.FORCE_UNIT_PRIOR || null;
  const OPENING = window.OPENING_LINES_2026 || {};
  const GF = window.FORCE_GAME_FLOW_PRIORS_2025 || null;
  const app = document.getElementById('app');
  const REFRESH_MS = 60 * 60 * 1000;
  const FORCE_BOOT_MIN_MS = 3000;
  const PUBLIC_SNAPSHOT_POLL_MS = 10 * 60 * 1000;
  const FORCE_BOOT_STARTED_AT = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

  // V85 diagnostic instrumentation. Keep a bounded in-browser event log so a
  // browser-only debugging session can capture the entire startup/refresh path
  // without needing to reproduce it from screenshots.
  const FORCE_DIAG_VERSION = 'V149-DIAG-1';
  const FORCE_DIAG_MAX_EVENTS = 600;
  const FORCE_DIAG_EVENTS = [];
  function diag(event, detail = {}) {
    const entry = { at: new Date().toISOString(), event, ...detail };
    FORCE_DIAG_EVENTS.push(entry);
    if (FORCE_DIAG_EVENTS.length > FORCE_DIAG_MAX_EVENTS) FORCE_DIAG_EVENTS.splice(0, FORCE_DIAG_EVENTS.length - FORCE_DIAG_MAX_EVENTS);
    try { console.log(`[FORCE-DIAG] ${event}`, detail); } catch (_) {}
    return entry;
  }
  const diagnosticNow = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
  function diagnosticError(error) {
    return {
      name: error?.name || null,
      message: error?.message || String(error || 'unknown error'),
      stack: error?.stack ? String(error.stack).split('\n').slice(0, 8).join('\n') : null
    };
  }
  function regimeCorrectionElo(team, week, state, scale = D.config?.scale) {
    if (RC?.correctionElo) return RC.correctionElo(team, week, state, scale);
    return ER?.correctionElo ? ER.correctionElo(team, week, state, scale) : 0;
  }
  function regimeRawCorrectionPoints(team, week, state) {
    if (RC?.rawCorrectionPoints) return RC.rawCorrectionPoints(team, week, state);
    return ER?.rawCorrectionPoints ? ER.rawCorrectionPoints(team, week, state) : 0;
  }

  function summarizeCsvObjects(rows, kind = 'rows') {
    const arr = Array.isArray(rows) ? rows : [];
    const byWeek = {}, teamSet = new Set(), seasons = new Set();
    let latestWeek = 0;
    for (const r of arr) {
      const season = String(r?.season || '');
      if (season) seasons.add(season);
      const week = Number(r?.week) || 0;
      if (week) { latestWeek = Math.max(latestWeek, week); byWeek[week] = (byWeek[week] || 0) + 1; }
      const t = canon(r?.team || r?.recent_team || '');
      if (t) teamSet.add(t);
    }
    return {
      kind,
      rows: arr.length,
      columns: arr[0] ? Object.keys(arr[0]) : [],
      seasons: [...seasons].sort(),
      latestWeek,
      rowsByWeek: byWeek,
      teamCount: teamSet.size,
      teams: [...teamSet].sort()
    };
  }
  async function diagnosticFetch(label, url, options = {}, parseAs = 'text') {
    const started = diagnosticNow();
    diag('fetch:start', { label, url, navigatorOnline: (typeof navigator !== 'undefined' ? navigator.onLine : null), protocol: location.protocol, origin: location.origin });
    try {
      const response = await fetch(url, options);
      const bodyText = await response.text();
      const headerGet = response?.headers && typeof response.headers.get === 'function' ? (name) => response.headers.get(name) : () => null;
      const meta = {
        label, url, ok: response.ok, status: response.status, statusText: response.statusText,
        elapsedMs: Math.round(diagnosticNow() - started), bytes: bodyText.length,
        contentType: headerGet('content-type'),
        forceCache: headerGet('x-force-cache'),
        forceUpstream: headerGet('x-force-upstream')
      };
      diag('fetch:response', meta);
      if (!response.ok) {
        diag('fetch:body-error', { label, preview: bodyText.slice(0, 500) });
        throw new Error(`${label} ${response.status}${bodyText ? `: ${bodyText.slice(0, 220)}` : ''}`);
      }
      if (parseAs === 'csv') {
        const value = csvObjects(bodyText);
        diag('fetch:parsed', { label, ...summarizeCsvObjects(value, label) });
        return value;
      }
      if (parseAs === 'json') {
        let value;
        try { value = JSON.parse(bodyText); }
        catch (error) {
          diag('fetch:json-error', { label, preview: bodyText.slice(0, 500), error: diagnosticError(error) });
          throw error;
        }
        diag('fetch:parsed', { label, jsonKeys: value && typeof value === 'object' ? Object.keys(value).slice(0, 40) : [], rowCount: Number(value?.row_count ?? value?.game_count ?? NaN) || null });
        return value;
      }
      return bodyText;
    } catch (error) {
      diag('fetch:error', { label, url, elapsedMs: Math.round(diagnosticNow() - started), error: diagnosticError(error) });
      throw error;
    }
  }

  const ALIASES = {
    STL: 'LAR', LA: 'LAR', LAR: 'LAR',
    SD: 'LAC', LAC: 'LAC',
    OAK: 'LV', LV: 'LV',
    JAC: 'JAX', JAX: 'JAX'
  };
  const canon = (t) => ALIASES[t] || t;
  const team = (t) => D.teams[canon(t)] || { name: t, division: '' };
  const base = (t) => D.rankings.find((r) => r.team === canon(t));
  const fmt = (n, d = 1) => Number(n).toFixed(d);
  const roundHalf = (n) => Math.sign(Number(n) || 0) * Math.round(Math.abs(Number(n) || 0) * 2) / 2;
  const numOrNull = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  const isDivisionGame = (home, away) => !!(D.teams[home] && D.teams[away] && D.teams[home].division === D.teams[away].division);

  // V120: nflverse `gametime` is an Eastern-time wall clock. Convert that
  // canonical kickoff instant into the viewer's browser timezone and render a
  // human 12-hour clock instead of leaking raw 24-hour strings such as 20:20.
  const NFL_SCHEDULE_TIME_ZONE = 'America/New_York';
  function browserTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || NFL_SCHEDULE_TIME_ZONE; }
    catch (_) { return NFL_SCHEDULE_TIME_ZONE; }
  }
  function zonedPartsOffsetMs(date, timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
      }).formatToParts(date);
      const v = Object.fromEntries(parts.filter((x)=>x.type!=='literal').map((x)=>[x.type,x.value]));
      const asUtc = Date.UTC(+v.year, +v.month-1, +v.day, +v.hour, +v.minute, +v.second);
      return asUtc - date.getTime();
    } catch (_) { return 0; }
  }
  function scheduleKickoffInstant(dateText, timeText) {
    const dm = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const tm = String(timeText || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!dm || !tm) return null;
    const naiveUtc = Date.UTC(+dm[1], +dm[2]-1, +dm[3], +tm[1], +tm[2], +(tm[3]||0));
    // Two passes handle DST boundaries without hard-coding EST/EDT dates.
    let instant = new Date(naiveUtc);
    let offset = zonedPartsOffsetMs(instant, NFL_SCHEDULE_TIME_ZONE);
    instant = new Date(naiveUtc - offset);
    const correctedOffset = zonedPartsOffsetMs(instant, NFL_SCHEDULE_TIME_ZONE);
    if (correctedOffset !== offset) instant = new Date(naiveUtc - correctedOffset);
    return Number.isFinite(instant.getTime()) ? instant : null;
  }
  function kickoffZoneLabel(instant, timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName:'shortGeneric' }).formatToParts(instant);
      return parts.find((x)=>x.type==='timeZoneName')?.value || '';
    } catch (_) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName:'short' }).formatToParts(instant);
        return parts.find((x)=>x.type==='timeZoneName')?.value || '';
      } catch (_) { return ''; }
    }
  }
  function formatKickoffTime(dateText, timeText, displayTimeZone = browserTimeZone()) {
    if (!timeText) return '';
    const instant = scheduleKickoffInstant(dateText, timeText);
    if (!instant) {
      // Defensive fallback for unexpected schedule formats: at minimum convert
      // HH:mm to a readable 12-hour clock instead of exposing military time.
      const m = String(timeText).match(/^(\d{1,2}):(\d{2})/);
      if (!m) return String(timeText);
      const hour = +m[1], minute = m[2], suffix = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${minute} ${suffix}`;
    }
    const clock = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimeZone, hour:'numeric', minute:'2-digit', hour12:true
    }).format(instant);
    const zone = kickoffZoneLabel(instant, displayTimeZone);
    return `${clock}${zone ? ` ${zone}` : ''}`;
  }
  window.FORCE_FORMAT_KICKOFF_TIME = formatKickoffTime;


  const TEAM_COLORS = {
    ARI:'#97233F', ATL:'#A71930', BAL:'#6A54B5', BUF:'#00338D', CAR:'#0085CA', CHI:'#C83803', CIN:'#FB4F14', CLE:'#FF3C00',
    DAL:'#003594', DEN:'#FB4F14', DET:'#0076B6', GB:'#FFB612', HOU:'#A71930', IND:'#005EB8', JAX:'#00A5B5', KC:'#E31837',
    LV:'#A5ACAF', LAC:'#0080C6', LAR:'#003594', MIA:'#008E97', MIN:'#4F2683', NE:'#C60C30', NO:'#D3BC8D', NYG:'#0B2265',
    NYJ:'#2A8A63', PHI:'#00A0A8', PIT:'#FFB612', SEA:'#69BE28', SF:'#AA0000', TB:'#D50A0A', TEN:'#4B92DB', WAS:'#B89B5E'
  };
  const TEAM_SECONDARY = {
    ARI:'#FFFFFF', ATL:'#FFFFFF', BAL:'#F2C75C', BUF:'#C60C30', CAR:'#FFFFFF', CHI:'#0B162A', CIN:'#000000', CLE:'#311D00',
    DAL:'#B0B7BC', DEN:'#002244', DET:'#B0B7BC', GB:'#203731', HOU:'#FFFFFF', IND:'#FFFFFF', JAX:'#D7A22A', KC:'#FFB81C',
    LV:'#000000', LAC:'#FFC20E', LAR:'#FFD100', MIA:'#FC4C02', MIN:'#FFC62F', NE:'#0C2340', NO:'#101820', NYG:'#A71930',
    NYJ:'#FFFFFF', PHI:'#A5ACAF', PIT:'#101820', SEA:'#002244', SF:'#B3995D', TB:'#FF7900', TEN:'#C8102E', WAS:'#FFB612'
  };
  const teamAccent = (t) => TEAM_COLORS[canon(t)] || '#8dd7ff';
  const teamSecondary = (t) => TEAM_SECONDARY[canon(t)] || '#ffffff';
  const teamAccentStyle = (t) => `--team-accent:${teamAccent(t)};--team-secondary:${teamSecondary(t)}`;

  const TEAM_LOGO_BASE = 'https://raw.githubusercontent.com/shoenot/NFL-Team-Logos-Transparent-Squared/main/logos';
  // V59: keep FORCE's canonical model IDs separate from the external logo
  // provider's filenames. The Rams are LAR internally, but this provider uses LA.png.
  const TEAM_LOGO_CODES = { LAR: 'LA' };
  function teamLogoCode(t) {
    const c = canon(t);
    return TEAM_LOGO_CODES[c] || c;
  }
  function teamLogoUrl(t) {
    return `${TEAM_LOGO_BASE}/${teamLogoCode(t)}.png`;
  }
  // V67: team marks are logo-only. A failed image hides the mark rather than
  // surfacing a redundant abbreviation badge beside another logo/name.
  function teamMark(t, size = 'md', side = 'right', extra = '') {
    const c = canon(t);
    return `<span class="team-mark team-mark-${size} ${extra}" style="${teamAccentStyle(c)}" role="img" aria-label="${team(c).name} logo">
      <img class="team-mark-img" crossorigin="anonymous" src="${teamLogoUrl(c)}" alt="" aria-hidden="true" onerror="this.parentElement.style.display='none'">
    </span>`;
  }

  function teamIdentity(t, { size = 'xs', label = null, sub = '', extra = '' } = {}) {
    const c = canon(t);
    const text = label == null ? team(c).name : label;
    return `<span class="team-identity ${extra}" style="${teamAccentStyle(c)}">${teamMark(c, size)}<span class="team-identity-copy"><span class="team-identity-name">${text}</span>${sub}</span></span>`;
  }

  function teamToken(t, size = 'xxs', label = null, extra = '') {
    const c = canon(t);
    // No explicit label means the logo itself is the token. If a caller asks
    // for a real text label (for example a full team name), keep that label.
    return label == null
      ? teamMark(c, size, 'right', `team-token ${extra}`.trim())
      : teamIdentity(c, { size, label, extra: `team-token ${extra}`.trim() });
  }

  const TEAM_CODE_PATTERN = new RegExp(String.raw`\b(${Object.keys(D.teams).sort((a,b) => b.length-a.length).join('|')})\b`, 'g');
  // V46 visual rule: when a plain team code is being upgraded inside a line or
  // score string, the logo replaces the abbreviation instead of sitting beside
  // a duplicate abbreviation. V67 extends that logo-only rule to default teamToken().
  function logoizeTeamCodes(value, size = 'xxs') {
    return String(value ?? '').replace(TEAM_CODE_PATTERN, (code) => teamMark(code, size, 'right', 'team-code-logo'));
  }

  // V47: the large bottom forecast boxes are deliberately logo-only.  Do not
  // include teamMark()'s abbreviation fallback here; if a remote logo fails,
  // hide the mark rather than rendering a second team-code badge under it.
  function forecastLogoOnlyMark(t, size = 'xs') {
    const c = canon(t);
    return `<span class="team-mark team-mark-${size} team-code-logo forecast-logo-only" style="${teamAccentStyle(c)}" role="img" aria-label="${team(c).name} logo"><img class="team-mark-img" crossorigin="anonymous" src="${teamLogoUrl(c)}" alt="" aria-hidden="true" onerror="this.parentElement.style.display='none'"></span>`;
  }
  function logoizeForecastTeamCodes(value, size = 'xs') {
    return String(value ?? '').replace(TEAM_CODE_PATTERN, (code) => forecastLogoOnlyMark(code, size));
  }

  const S = {
    schedule: D.fallbackSchedule.map((x) => {
      const away = canon(x[2]), home = canon(x[3]);
      const opening = OPENING[`${home}_${away}`] || null;
      return {
        date: x[0], week: x[1], away, home,
        awayScore: x[4], homeScore: x[5], status: x[6], time: null,
        homeMoneyline: null, awayMoneyline: null,
        spreadLine: opening ? opening.spreadLine : null,
        totalLine: null,
        divisional: isDivisionGame(home, away),
        lineSource: opening ? 'embedded opening line' : null
      };
    }),
    live: false,
    connectionState: 'connecting',
    serverIdentity: null,
    queuedRefresh: null,
    initialVerificationAttempted: false,
    team: 'BUF',
    forecastMode: 'smart',
    ratingView: localStorage.getItem('forceRatingView') || localStorage.getItem('signalRatingView') || 'power',
    scenario: { removed: new Set(), add: null },
    qbCarryover: { enabled: false, team: 'KC', qb: 'Patrick Mahomes', restoreElo: 47.3 },
    refreshing: false,
    lastRefreshAt: null,
    nextRefreshAt: null,
    refreshError: null,
    scheduleVersion: 0,
    engineCache: null,
    rankSort: { key: 'force', dir: 'desc' },
    liveTeamStats: [],
    livePlayerStats: [],
    liveFtnCharting: [],
    livePfrPassStats: [],
    priorPfrPassStats: [],
    currentPressure: null,
    liveGameFlow2026: null,
    initialRefreshDone: false,
    statsLastRefreshAt: null,
    statsError: null,
    statsWarning: null,
    statsVersion: 0,
    liveProfilesCache: null,
    updateLog: {},
    lastUpdateScope: null,
    slateWeek: null,
    qbRankingMode: 'default',
    qbWeights: { epa:30, anya:30, success:20, rushing:10, cpoe:10 }
  };
  // V35 exposes one canonical user-facing forecast. Model-only/adaptive paths
  // remain callable internally for diagnostics and research, never as competing UI answers.
  S.forecastMode = 'smart';
  if (!['power', 'luck', 'penalties', 'units', 'advanced'].includes(S.ratingView)) S.ratingView = 'power';
  // V87: Penalty Impact is a rankings-first view. When it is the restored startup tab,
  // default to the teams receiving the greatest net benefit from penalties.
  if (S.ratingView === 'penalties') S.rankSort = { key: 'penEPA', dir: 'desc' };

  let exportCssCache = null;

  // V46: the public 0-100 FORCE scale has soft/asymptotic tails. The
  // strongest/weakest historical end-season anchors map to 95/5, 50 remains
  // average, and no finite Elo can display as a literal perfect 100.
  function score(elo) {
    const bridge=window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
    if (bridge?.scoreFromElo) return bridge.scoreFromElo(elo,D.meta);
    const m=D.meta.meanElo, lo=D.meta.anchorMin, hi=D.meta.anchorMax, e=Number(elo);
    const raw=e>=m ? 50+50*(e-m)/(hi-m) : 50-50*(m-e)/(m-lo);
    const tau=10/Math.log(2);
    const out=raw>90 ? 90+10*(1-Math.exp(-(raw-90)/tau)) : raw<10 ? 10-10*(1-Math.exp(-(10-raw)/tau)) : raw;
    return Math.max(.1,Math.min(99.9,out));
  }


  function eloFromScore(forceScore) {
    const bridge=window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
    if (bridge?.eloFromScore) return bridge.eloFromScore(forceScore,D.meta);
    const s=Math.max(.1,Math.min(99.9,Number(forceScore)||50));
    const tau=10/Math.log(2);
    const raw=s>90 ? 90-tau*Math.log(1-(s-90)/10) : s<10 ? 10+tau*Math.log(1-(10-s)/10) : s;
    const m=D.meta.meanElo, lo=D.meta.anchorMin, hi=D.meta.anchorMax;
    return raw>=50 ? m+((raw-50)/50)*(hi-m) : m-((50-raw)/50)*(m-lo);
  }

  // V45/V46: every first-class unit can move the canonical FORCE rating. The
  // bridge is centralized in model/unit_force_bridge.js so Rankings, Teams,
  // Matchups and forecasts all consume the same rating construction rule.
  const UFB = window.FORCE_UNIT_FORCE_BRIDGE_MODEL || null;
  const UNIT_FORCE_WEIGHTS = UFB?.WEIGHTS || {
    pointsScoredPerDriveIndex:0.20, qbIndex:0.12, receiverIndex:0.08, olIndex:0.08, rbIndex:0.07,
    coverageIndex:0.162, passRushIndex:0.072, runDefenseIndex:0.126, pointsAllowedPerDriveIndex:0.090
  };
  // V100 preserves the V99 Week-2-entry bridge exactly as the historical baseline.
  // The new scoring-outcome unit affects only subsequent/current evidence.
  const V99_UNIT_FORCE_WEIGHTS = Object.freeze({
    offenseIndex:0.20, qbIndex:0.12, receiverIndex:0.08, olIndex:0.08, rbIndex:0.07,
    coverageIndex:0.20, passRushIndex:0.10, runDefenseIndex:0.15
  });
  const UNIT_FORCE_SHARE = UFB?.SHARE ?? 0.50;
  const UNIT_FORCE_CAP = UFB?.CAP ?? 7.50;

  // Requested visual bands. Decimal values inherit their containing integer band:
  // [0,41) red, [41,71) yellow, [71,100] green.
  function bandClass(powerScore) {
    return powerScore >= 71 ? 'band-high' : powerScore >= 41 ? 'band-mid' : 'band-low';
  }

  function ratingBar(elo, cls = 'bar') {
    const s = score(elo);
    return `<div class="${cls}" aria-label="FORCE Score ${fmt(s)}"><i class="${bandClass(s)}" style="width:${s}%"></i></div>`;
  }

  function wp(home, away, hfa = D.config.hfa) {
    return F ? F.independentProbability(home, away, hfa, D.config.scale)
      : 1 / (1 + Math.pow(10, -((home + hfa - away) / D.config.scale)));
  }

  function parseCSV(txt) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (ch === '"') {
        if (q && txt[i + 1] === '"') { cell += '"'; i++; }
        else q = !q;
      } else if (ch === ',' && !q) {
        row.push(cell); cell = '';
      } else if ((ch === '\n' || ch === '\r') && !q) {
        if (ch === '\r' && txt[i + 1] === '\n') i++;
        row.push(cell);
        if (row.length > 1) rows.push(row);
        row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }


  function csvObjects(txt) {
    const rows = parseCSV(txt);
    if (!rows.length) return [];
    const h = rows[0];
    return rows.slice(1).filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
  }

  // V83 partial-week reconciliation now lives exclusively in force_server.py,
  // where disk/memory last-known-good snapshots survive browser reloads.

  // V85: the local proxy is the single owner of partial-week reconciliation.
  // Browser refreshes must replace the in-memory weekly snapshot with the proxy's
  // canonical snapshot. Re-merging in the browser allowed rows from an earlier
  // bad/partial refresh to survive forever until a full page reload cleared memory.
  function canonicalWeeklyRows(incoming, kind='team') {
    const rows=(Array.isArray(incoming)?incoming:[])
      .filter((r)=>r && String(r.season)==='2026')
      .sort((a,b)=>(Number(a.week)||0)-(Number(b.week)||0)||String(a.team||a.recent_team||'').localeCompare(String(b.team||b.recent_team||'')));
    diag('weekly-canonical-replace', { kind, incoming:summarizeCsvObjects(incoming, `${kind}:incoming`), canonical:summarizeCsvObjects(rows, `${kind}:canonical`) });
    return rows;
  }


  function scheduleFromBootstrapText(scheduleText) {
    const rows = parseCSV(scheduleText || '');
    const h = rows[0] || [];
    const ix = (x) => h.indexOf(x);
    const field = (row, name) => ix(name) >= 0 ? row[ix(name)] : '';
    const got = rows.slice(1)
      .filter((x) => field(x, 'season') === '2026' && field(x, 'game_type') === 'REG')
      .map((x) => {
        const away = canon(field(x, 'away_team')), home = canon(field(x, 'home_team'));
        return {
          date: field(x, 'gameday'),
          week: +field(x, 'week'),
          away, home,
          awayScore: numOrNull(field(x, 'away_score')),
          homeScore: numOrNull(field(x, 'home_score')),
          status: field(x, 'home_score') === '' ? 'scheduled' : 'closed',
          time: field(x, 'gametime') || null,
          awayMoneyline: numOrNull(field(x, 'away_moneyline')),
          homeMoneyline: numOrNull(field(x, 'home_moneyline')),
          spreadLine: numOrNull(field(x, 'spread_line')),
          totalLine: numOrNull(field(x, 'total_line')),
          divisional: field(x, 'div_game') === '1' || isDivisionGame(home, away),
          lineSource: 'nflverse current/closing field'
        };
      })
      .filter((g) => D.teams[g.home] && D.teams[g.away]);
    if (got.length <= 200) throw new Error(`unexpected bootstrap schedule row count (${got.length})`);
    return got;
  }

  function bootstrapJson(text, label) {
    try { return JSON.parse(text || '{}'); }
    catch (error) { throw new Error(`${label} bootstrap JSON invalid: ${error?.message || error}`); }
  }

  function snapshotStateBackup() {
    return {
      schedule:S.schedule, live:S.live, connectionState:S.connectionState,
      serverIdentity:S.serverIdentity, lastRefreshAt:S.lastRefreshAt,
      nextRefreshAt:S.nextRefreshAt, refreshError:S.refreshError,
      scheduleVersion:S.scheduleVersion, engineCache:S.engineCache,
      liveTeamStats:S.liveTeamStats, livePlayerStats:S.livePlayerStats,
      liveFtnCharting:S.liveFtnCharting, livePfrPassStats:S.livePfrPassStats,
      priorPfrPassStats:S.priorPfrPassStats, currentPressure:S.currentPressure,
      liveGameFlow2026:S.liveGameFlow2026, initialRefreshDone:S.initialRefreshDone,
      statsLastRefreshAt:S.statsLastRefreshAt, statsError:S.statsError,
      statsWarning:S.statsWarning, statsVersion:S.statsVersion,
      liveProfilesCache:S.liveProfilesCache
    };
  }

  function restoreSnapshotState(backup) { Object.assign(S, backup); }

  function applyBootstrapSnapshot(snapshot, reason = 'bootstrap') {
    if (!snapshot?.ok || !snapshot?.feeds) throw new Error('bootstrap snapshot payload missing');
    const feeds = snapshot.feeds;
    const health = bootstrapJson(feeds.health, 'health');
    if (health?.product !== 'FORCE' || health?.app_version !== 'V149') {
      throw new Error(`wrong bootstrap server identity (expected FORCE V149, got ${health?.product || 'unknown'} ${health?.app_version || 'unknown'})`);
    }

    const next = {
      schedule: scheduleFromBootstrapText(feeds.schedule),
      team: canonicalWeeklyRows(csvObjects(feeds.teamStats || ''), 'team'),
      player: canonicalWeeklyRows(csvObjects(feeds.playerStats || ''), 'player'),
      ftn: csvObjects(feeds.ftnCharting || ''),
      pfr: csvObjects(feeds.pfrPass || ''),
      pfrPrior: csvObjects(feeds.pfrPassPrior || ''),
      pressure: bootstrapJson(feeds.currentPressure || '{}', 'current pressure'),
      gameFlow: bootstrapJson(feeds.gameFlow2026 || '{}', 'game flow')
    };
    if (!next.team.length) throw new Error('bootstrap snapshot has no current team rows');

    const backup = snapshotStateBackup();
    try {
      S.schedule = next.schedule;
      S.liveTeamStats = next.team;
      S.livePlayerStats = next.player;
      S.liveFtnCharting = next.ftn;
      S.livePfrPassStats = next.pfr;
      S.priorPfrPassStats = next.pfrPrior;
      S.currentPressure = next.pressure;
      S.liveGameFlow2026 = next.gameFlow;
      S.serverIdentity = health;
      S.live = true;
      S.connectionState = 'live';
      S.refreshError = null;
      S.statsError = null;
      S.statsWarning = Array.isArray(snapshot.warnings) && snapshot.warnings.length ? snapshot.warnings.join(' · ') : null;

      const builtMs = Date.parse(snapshot.builtAt || '');
      S.lastRefreshAt = Number.isFinite(builtMs) ? builtMs : Date.now();
      S.statsLastRefreshAt = S.lastRefreshAt;
      S.nextRefreshAt = Date.now() + PUBLIC_SNAPSHOT_POLL_MS;
      S.scheduleVersion += 1;
      S.statsVersion += 1;
      S.engineCache = null;
      S.liveProfilesCache = null;
      S.initialRefreshDone = true;

      const integrity = currentDataIntegrity();
      if (!integrity.ready) {
        throw new Error(`bootstrap snapshot failed integrity: ${integrity.missing.join(', ') || 'unknown missing data'}`);
      }

      diag('bootstrap:snapshot-applied', {
        reason,
        generation:snapshot.generation || null,
        builtAt:snapshot.builtAt || null,
        ageSeconds:Number.isFinite(builtMs) ? Math.round((Date.now() - builtMs) / 1000) : null,
        warnings:snapshot.warnings || [],
        integrity:{ready:integrity.ready, missing:integrity.missing, pending:integrity.pending}
      });
      return true;
    } catch (error) {
      restoreSnapshotState(backup);
      throw error;
    }
  }

  async function fetchBootstrapSnapshot(reason = 'bootstrap') {
    const started = diagnosticNow();
    const response = await fetch(`/api/bootstrap?ts=${Date.now()}`, {cache:'no-store'});
    const text = await response.text();
    if (!response.ok) throw new Error(`bootstrap snapshot ${response.status}: ${text.slice(0,220)}`);
    const snapshot = bootstrapJson(text, 'bootstrap');
    applyBootstrapSnapshot(snapshot, reason);
    diag('bootstrap:snapshot-fetch-complete', {
      reason,
      elapsedMs:Math.round(diagnosticNow() - started),
      builtAt:snapshot.builtAt || null
    });
    return snapshot;
  }

  async function refreshPublishedSnapshot(reason = 'snapshot-poll') {
    if (USE_HASH_ROUTING) return refreshSchedule(reason);
    try {
      await fetchBootstrapSnapshot(reason);
      render();
      updateRefreshControls();
    } catch (error) {
      diag('bootstrap:snapshot-poll-failed', {reason, error:diagnosticError(error)});
      if (!S.lastRefreshAt) await refreshSchedule(reason);
    }
  }

  async function waitForBootMinimum() {
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    const remaining = Math.max(0, FORCE_BOOT_MIN_MS - (now - FORCE_BOOT_STARTED_AT));
    if (remaining) await new Promise((resolve)=>setTimeout(resolve, remaining));
  }

  async function initialCanonicalBootstrap() {
    let snapshotLoaded = false;
    if (!USE_HASH_ROUTING) {
      try {
        await fetchBootstrapSnapshot('initial');
        snapshotLoaded = true;
      } catch (error) {
        diag('bootstrap:snapshot-unavailable', {error:diagnosticError(error)});
      }
    }
    if (!snapshotLoaded) {
      await refreshSchedule('initial', null, {renderOnComplete:false});
    }
    await waitForBootMinimum();
    render();
    updateRefreshControls();
  }

  async function verifyServerIdentity(signal) {
    const health=await diagnosticFetch('health', `/api/health?ts=${Date.now()}`, {cache:'no-store',signal}, 'json');
    if (health?.product!=='FORCE' || health?.app_version!=='V149') {
      throw new Error(`wrong local server on port 8080 (expected FORCE V149, got ${health?.product||'unknown'} ${health?.app_version||'unknown'})`);
    }
    S.serverIdentity=health;
    return health;
  }

  async function refreshLiveMetrics(signal) {
    const stamp = Date.now();
    const teamUrl = `/api/team-stats?force_refresh=${stamp}`;
    const playerUrl = `/api/player-stats?force_refresh=${stamp}`;
    const ftnUrl = `/api/ftn-charting?force_refresh=${stamp}`;
    const pfrUrl = `/api/pfr-pass?force_refresh=${stamp}`;
    const pfrPriorUrl = `/api/pfr-pass-prior?force_refresh=${stamp}`;
    const currentPressureUrl = `/api/current-pressure?force_refresh=${stamp}`;
    const gameFlowUrl = `/api/game-flow-2026?force_refresh=${stamp}`;
    diag('metrics:refresh-start', { stamp, existingTeamRows: S.liveTeamStats.length, existingPlayerRows: S.livePlayerStats.length });
    const [teamResult, playerResult, ftnResult, pfrResult, pfrPriorResult, currentPressureResult, gameFlowResult] = await Promise.allSettled([
      diagnosticFetch('team stats', teamUrl, { cache: 'no-store', signal }, 'csv'),
      diagnosticFetch('player stats', playerUrl, { cache: 'no-store', signal }, 'csv'),
      diagnosticFetch('FTN charting', ftnUrl, { cache: 'no-store', signal }, 'csv'),
      diagnosticFetch('PFR pressure', pfrUrl, { cache: 'no-store', signal }, 'csv'),
      diagnosticFetch('PFR pressure prior', pfrPriorUrl, { cache: 'no-store', signal }, 'csv'),
      diagnosticFetch('current pressure', currentPressureUrl, { cache: 'no-store', signal }, 'json'),
      diagnosticFetch('game flow', gameFlowUrl, { cache: 'no-store', signal }, 'json')
    ]);
    const settled = { teamResult, playerResult, ftnResult, pfrResult, pfrPriorResult, currentPressureResult, gameFlowResult };
    diag('metrics:fetch-settled', { results: Object.fromEntries(Object.entries(settled).map(([name,result]) => [name, result.status === 'fulfilled' ? { status: 'fulfilled' } : { status: 'rejected', error: diagnosticError(result.reason) }])) });
    if (teamResult.status !== 'fulfilled' || !teamResult.value.length) {
      throw new Error(teamResult.status === 'rejected' ? teamResult.reason?.message || 'team stats failed' : 'team stats returned no rows');
    }
    S.liveTeamStats = canonicalWeeklyRows(teamResult.value, 'team');
    if (playerResult.status === 'fulfilled' && playerResult.value.length) S.livePlayerStats = canonicalWeeklyRows(playerResult.value, 'player');
    if (ftnResult.status === 'fulfilled') S.liveFtnCharting = ftnResult.value;
    if (pfrResult.status === 'fulfilled') S.livePfrPassStats = pfrResult.value;
    if (pfrPriorResult.status === 'fulfilled') S.priorPfrPassStats = pfrPriorResult.value;
    if (currentPressureResult.status === 'fulfilled') S.currentPressure = currentPressureResult.value;
    if (gameFlowResult.status === 'fulfilled') {
      S.liveGameFlow2026 = gameFlowResult.value;
      const pc=S.liveGameFlow2026?.pressure_context;
      if (pc) {
        const summary=`FORCE pressure context: ${pc.source||'unknown'}; FTN rows ${pc.ftn_rows||0}; joined dropbacks ${pc.joined_dropbacks||0}; explicit pressure rows ${pc.explicit_pressure_rows||0}.`;
        if (pc.warning) console.warn(summary+' '+pc.warning); else console.info(summary);
      }
    }
    S.statsLastRefreshAt = Date.now();
    const errors=[];
    const warnings=[];
    if (playerResult.status !== 'fulfilled') errors.push(`player stats unavailable: ${playerResult.reason?.message || 'fetch failed'}`);
    // FTN and PFR are alternate current-pressure routes in V46, not mandatory
    // sources. Do not flag either one merely because the fresh StatRankings/manual
    // route is carrying the current team pressure rate.
    if (pfrResult.status !== 'fulfilled' && currentPressureResult.status !== 'fulfilled') errors.push(`current pressure fallbacks unavailable: ${pfrResult.reason?.message || 'fetch failed'}`);
    if (pfrPriorResult.status !== 'fulfilled') errors.push(`pressure benchmark unavailable: ${pfrPriorResult.reason?.message || 'fetch failed'}`);
    else if (LP?.pfrChartingReady && !LP.pfrChartingReady(pfrPriorResult.value)) warnings.push('2025 pressure benchmark incomplete');
    if (gameFlowResult.status !== 'fulfilled') warnings.push(`2026 quarter-scoring profile unavailable; Game Flow will fall back to 2025 timing`);
    if (currentPressureResult.status !== 'fulfilled') warnings.push(`advanced current pressure unavailable; nflverse weekly disruption fallback will be used where team stats are current`);
    else {
      const cp=currentPressureResult.value || {};
      if (Number(cp.row_count||0) < 28) warnings.push(`fresh pressure coverage partial (${Number(cp.row_count||0)}/32); uncovered teams will use nflverse weekly disruption fallback`);
      if (cp.automatic?.error && Number(cp.manual?.row_count||0)===0) warnings.push('automatic current-pressure scrape failed; manual browser/Codex override is empty');
    }
    S.statsError = errors.length ? errors.join(' · ') : null;
    S.statsWarning = warnings.length ? warnings.join(' · ') : null;
    S.statsVersion += 1;
    S.liveProfilesCache = null;
    diag('metrics:refresh-complete', {
      teamRows: summarizeCsvObjects(S.liveTeamStats, 'team:state'),
      playerRows: summarizeCsvObjects(S.livePlayerStats, 'player:state'),
      statsError: S.statsError,
      statsWarning: S.statsWarning,
      currentPressureRows: Number(S.currentPressure?.row_count || 0),
      gameFlowGames: Number(S.liveGameFlow2026?.game_count || 0)
    });
  }

  function refreshText() {
    if (S.refreshing && !S.lastRefreshAt) return 'Loading current data…';
    if (S.refreshing) return 'Refreshing now…';
    if (!S.lastRefreshAt) return S.refreshError ? `Initial load failed · ${S.refreshError}` : 'Connecting to live data…';
    const ageMin = Math.max(0, Math.floor((Date.now() - S.lastRefreshAt) / 60000));
    const untilMin = Math.max(0, Math.ceil((S.nextRefreshAt - Date.now()) / 60000));
    const age = ageMin < 1 ? 'just now' : `${ageMin}m ago`;
    const metricState = S.statsError ? ' · some metrics unavailable' : (S.statsLastRefreshAt ? ` · metrics refreshed${S.statsWarning ? ' · freshness warning' : ''}` : '');
    return `Updated ${age}${metricState} · auto in ${untilMin}m`;
  }

  function connectionLabel() {
    if (S.refreshing && !S.lastRefreshAt) return 'Connecting…';
    if (S.live) return S.statsError ? 'Live data degraded' : 'Live data';
    if (S.connectionState==='offline') return 'Offline';
    if (S.refreshError) return 'Live data unavailable';
    return 'Connecting…';
  }

  function queueRefreshRequest(reason, updateTeams) {
    const prior=S.queuedRefresh;
    const requested=Array.isArray(updateTeams)?updateTeams.map(canon):[];
    const teams=new Set([...(prior?.updateTeams||[]),...requested]);
    const leagueWide=reason==='manual'||reason==='update-all'||prior?.leagueWide;
    S.queuedRefresh={
      reason: leagueWide ? 'queued-full-refresh' : `queued-${reason}`,
      updateTeams: leagueWide ? Object.keys(D.teams) : [...teams],
      leagueWide
    };
    diag('schedule:refresh-queued',{reason,queuedReason:S.queuedRefresh.reason,teams:S.queuedRefresh.updateTeams});
  }

  function updateRefreshControls() {
    const b = document.getElementById('refreshData');
    const m = document.getElementById('refreshMeta');
    if (b) { b.disabled = S.refreshing; b.textContent = S.refreshing ? '↻ Refreshing…' : '↻ Refresh'; }
    if (m) m.textContent = refreshText();
  }

  async function refreshSchedule(reason = 'manual', updateTeams = null, options = {}) {
    if (S.refreshing) {
      queueRefreshRequest(reason, updateTeams);
      updateRefreshControls();
      return;
    }
    S.refreshing = true;
    S.connectionState = S.lastRefreshAt ? 'refreshing' : 'connecting';
    S.refreshError = null;
    diag('schedule:refresh-start', { reason, updateTeams: Array.isArray(updateTeams) ? updateTeams.map(canon) : null, navigatorOnline: (typeof navigator !== 'undefined' ? navigator.onLine : null), currentScheduleRows: S.schedule.length, live: S.live });
    updateRefreshControls();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      await verifyServerIdentity(controller.signal);
      const url = `/api/schedule?force_refresh=${Date.now()}`;
      const scheduleText = await diagnosticFetch('schedule', url, { cache: 'no-store', signal: controller.signal }, 'text');
      const rows = parseCSV(scheduleText);
      const h = rows[0];
      const ix = (x) => h.indexOf(x);
      const field = (row, name) => ix(name) >= 0 ? row[ix(name)] : '';
      const got = rows.slice(1)
        .filter((x) => field(x, 'season') === '2026' && field(x, 'game_type') === 'REG')
        .map((x) => {
          const away = canon(field(x, 'away_team')), home = canon(field(x, 'home_team'));
          return {
            date: field(x, 'gameday'),
            week: +field(x, 'week'),
            away, home,
            awayScore: numOrNull(field(x, 'away_score')),
            homeScore: numOrNull(field(x, 'home_score')),
            status: field(x, 'home_score') === '' ? 'scheduled' : 'closed',
            time: field(x, 'gametime') || null,
            awayMoneyline: numOrNull(field(x, 'away_moneyline')),
            homeMoneyline: numOrNull(field(x, 'home_moneyline')),
            spreadLine: numOrNull(field(x, 'spread_line')),
            totalLine: numOrNull(field(x, 'total_line')),
            divisional: field(x, 'div_game') === '1' || isDivisionGame(home, away),
            lineSource: 'nflverse current/closing field'
          };
        })
        .filter((g) => D.teams[g.home] && D.teams[g.away]);
      if (got.length <= 200) throw new Error(`unexpected schedule row count (${got.length})`);
      diag('schedule:parsed', {
        rows: got.length,
        completedGames: got.filter((g)=>g.homeScore!=null&&g.awayScore!=null).length,
        pendingGames: got.filter((g)=>g.homeScore==null||g.awayScore==null).length,
        latestCompletedWeek: got.filter((g)=>g.homeScore!=null&&g.awayScore!=null).reduce((m,g)=>Math.max(m,Number(g.week)||0),0),
        firstPendingWeek: (()=>{ const pending=got.filter((g)=>g.homeScore==null||g.awayScore==null).map((g)=>Number(g.week)||0).filter(Boolean); return pending.length?Math.min(...pending):null; })()
      });
      S.schedule = got;
      try {
        await refreshLiveMetrics(controller.signal);
      } catch (metricError) {
        S.statsError = metricError && metricError.message ? metricError.message : 'live metrics refresh failed';
        diag('metrics:refresh-failed', { error: diagnosticError(metricError), retainedTeamRows: S.liveTeamStats.length, retainedPlayerRows: S.livePlayerStats.length });
      }

      // V85 bootstrap verification: if the first load produced an incomplete
      // current-data state, immediately perform one second canonical metrics pull.
      // This turns the browser-reload workaround into an automatic startup step.
      if (reason==='initial' && !S.initialVerificationAttempted) {
        S.initialVerificationAttempted=true;
        let firstIntegrity=null;
        try { firstIntegrity=currentDataIntegrity(); } catch (_) {}
        if (!firstIntegrity?.ready) {
          diag('bootstrap:verification-retry',{missing:firstIntegrity?.missing||[],pending:firstIntegrity?.pending||[],statsError:S.statsError});
          await new Promise((resolve)=>setTimeout(resolve,750));
          try {
            await refreshLiveMetrics(controller.signal);
            diag('bootstrap:verification-retry-complete',{integrity:currentDataIntegrity()});
          } catch (retryError) {
            diag('bootstrap:verification-retry-failed',{error:diagnosticError(retryError)});
          }
        } else {
          diag('bootstrap:verification-not-needed',{integrity:firstIntegrity});
        }
      }
      S.live = true;
      S.connectionState = 'live';
      S.lastRefreshAt = Date.now();
      S.nextRefreshAt = S.lastRefreshAt + REFRESH_MS;
      S.scheduleVersion += 1;
      S.engineCache = null;
      S.liveProfilesCache = null;
      const targets = Array.isArray(updateTeams) && updateTeams.length ? updateTeams.map(canon) : (reason === 'manual' ? Object.keys(D.teams) : []);
      if (targets.length) {
        const stampNow=Date.now();
        for (const t of targets) S.updateLog[t]={at:stampNow,status:teamUpdateStatus(t)};
        S.lastUpdateScope={at:stampNow,teams:targets};
      }
      try {
        const integrity=currentDataIntegrity();
        diag('schedule:refresh-success', { reason, live:S.live, statsError:S.statsError, statsWarning:S.statsWarning, integrity:{ready:integrity.ready, missing:integrity.missing, pending:integrity.pending} });
      } catch (diagnosticFailure) {
        diag('schedule:post-refresh-diagnostic-error', { error: diagnosticError(diagnosticFailure) });
      }
    } catch (e) {
      S.refreshError = e && e.message ? e.message : 'refresh failed';
      diag('schedule:refresh-failed', { reason, error: diagnosticError(e), navigatorOnline:(typeof navigator !== 'undefined' ? navigator.onLine : null), hadPriorLiveRefresh:Boolean(S.lastRefreshAt) });
      // Preserve previously loaded live data on transient errors. Only the initial
      // load remains on the embedded fallback. A browser that has network but
      // cannot reach FORCE is not labeled "offline"; that state is reserved for
      // navigator.onLine === false.
      if (!S.lastRefreshAt) S.live = false;
      S.connectionState = (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : (S.live ? 'live' : 'error');
      S.nextRefreshAt = Date.now() + REFRESH_MS;
    } finally {
      clearTimeout(timer);
      S.initialRefreshDone = true;
      S.refreshing = false;
      diag('schedule:refresh-finally', { reason, live:S.live, refreshError:S.refreshError, statsError:S.statsError, statsWarning:S.statsWarning, lastRefreshAt:S.lastRefreshAt });
      if (options.renderOnComplete !== false) render();
      updateRefreshControls();
      const queued=S.queuedRefresh;
      if (queued) {
        S.queuedRefresh=null;
        diag('schedule:refresh-dequeued',{reason:queued.reason,teams:queued.updateTeams});
        queueMicrotask(()=>refreshSchedule(queued.reason,queued.updateTeams));
      }
    }
  }

  function sortedSchedule() {
    return [...S.schedule].sort((a, b) => (a.week - b.week) || String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')));
  }

  function seasonEngine() {
    if (S.engineCache && S.engineCache.version === S.scheduleVersion) return S.engineCache.value;
    // `coreRatings` is ordinary result-only Elo.  V34 overlays a transient
    // early-season regime correction for forecasting/current display, but does
    // not bake that correction permanently into Elo.  That is what lets FORCE
    // move aggressively in Weeks 2-6 without creating season-long yo-yoing.
    // V51 season boundary: carry prior-season Elo forward only after the
    // current-era offseason regression. The 17-game-era production rule is
    // 30% toward the league mean (legacy pre-2021 setting: 33.3%). All 2026
    // completed games are then replayed from this regressed preseason state.
    const offseasonMean = Number(D.meta?.meanElo ?? 1505);
    const offseasonReversion = Number(D.config?.reversion ?? 0.30);
    const preseasonRatings = Object.fromEntries(D.rankings.map((x) => [
      x.team,
      offseasonMean + (Number(x.elo) - offseasonMean) * (1 - offseasonReversion)
    ]));
    const coreRatings = { ...preseasonRatings };
    const adaptiveStates = {};
    const earlyStates = {};
    const diagnostics = { staticErrors: [], adaptiveErrors: [], marketGames: 0, weeksObserved: 0, earlyRegime: [] };
    const gameHistory = {};
    const played = sortedSchedule().filter((g) => g.homeScore != null && g.awayScore != null);
    const weeks = [...new Set(played.map((g) => g.week))].sort((a, b) => a - b);

    for (const week of weeks) {
      const batch = played.filter((g) => g.week === week);
      const staged = [];
      // Score every game using state frozen at the start of the week.  Early
      // regime observations are also frozen, so an early Sunday result cannot
      // influence a later kickoff in the same slate.
      for (const g of batch) {
        if (!coreRatings[g.home] || !coreRatings[g.away]) continue;
        const corePreHome = coreRatings[g.home], corePreAway = coreRatings[g.away];
        const earlyHomeElo = regimeCorrectionElo(g.home, week, earlyStates, D.config.scale);
        const earlyAwayElo = regimeCorrectionElo(g.away, week, earlyStates, D.config.scale);
        const preHome = corePreHome + earlyHomeElo;
        const preAway = corePreAway + earlyAwayElo;
        let independentFc = null;
        if (F && A) {
          const staticFc = F.forecastProbability(g, preHome, preAway, {
            hfa: D.config.hfa, scale: D.config.scale, mode: 'smart'
          });
          const adaptiveFc = A.forecastProbability(g, preHome, preAway, adaptiveStates, D.teams, {
            hfa: D.config.hfa, scale: D.config.scale
          });
          independentFc = F.forecastProbability(g, preHome, preAway, {
            hfa: D.config.hfa, scale: D.config.scale, mode: 'independent'
          });
          const baselineIndependent = F.forecastProbability(g, corePreHome, corePreAway, {
            hfa: D.config.hfa, scale: D.config.scale, mode: 'independent'
          });
          gameHistory[gameKey(g)] = {
            preHome: corePreHome, preAway: corePreAway,
            predictivePreHome: preHome, predictivePreAway: preAway,
            earlyHomeElo, earlyAwayElo,
            smart: staticFc, adaptive: adaptiveFc, independent: independentFc,
            baselineIndependent
          };
          if (staticFc.marketAvailable) {
            const y = g.homeScore === g.awayScore ? 0.5 : g.homeScore > g.awayScore ? 1 : 0;
            diagnostics.staticErrors.push(Math.pow(staticFc.probability - y, 2));
            diagnostics.adaptiveErrors.push(Math.pow(adaptiveFc.probability - y, 2));
            diagnostics.marketGames += 1;
          }
        }
        staged.push({ g, corePreHome, corePreAway, preHome, preAway, independentFc });
      }
      // Only after the full weekly slate has been forecast do outcomes enter
      // adaptive state, ordinary Elo, and the V34 early-regime history.
      for (const { g, corePreHome, corePreAway, preHome, preAway } of staged) {
        if (A) A.updateAfterGame(g, preHome, preAway, adaptiveStates, D.teams, {
          hfa: D.config.hfa, scale: D.config.scale
        });
        const ph = wp(corePreHome, corePreAway);
        const result = g.homeScore === g.awayScore ? 0.5 : g.homeScore > g.awayScore ? 1 : 0;
        const margin = Math.abs(g.homeScore - g.awayScore);
        const mult = Math.log(Math.max(margin, 1) + 1) * 2.2 /
          (2.2 + 0.001 * Math.abs((corePreHome + D.config.hfa) - corePreAway));
        const delta = D.config.k * mult * (result - ph);
        const postHome = corePreHome + delta;
        const postAway = corePreAway - delta;
        coreRatings[g.home] = postHome;
        coreRatings[g.away] = postAway;
        const hist = gameHistory[gameKey(g)];
        if (hist) Object.assign(hist, { postHome, postAway, homeDelta: delta, awayDelta: -delta });
      }
      // Build surprise observations from the *baseline* independent expectation,
      // never from the regime-adjusted forecast itself.  This prevents a feedback
      // loop where the feature starts grading its own correction as new evidence.
      if (ER) {
        for (const { g, corePreHome, corePreAway } of staged) {
          const hist = gameHistory[gameKey(g)];
          const baselineP = hist?.baselineIndependent?.probability ?? wp(corePreHome, corePreAway);
          const obs = ER.observationFromGame(g, baselineP, corePreHome, corePreAway);
          if (!obs) continue;
          ER.addObservation(earlyStates, obs.home.team, obs.home.residual, obs.home.opponentElo);
          ER.addObservation(earlyStates, obs.away.team, obs.away.residual, obs.away.opponentElo);
          diagnostics.earlyRegime.push({ week, game: gameKey(g), residual: obs.residual });
        }
        // Once the complete week is in state, expose the next-week transient
        // rating for postgame/rematch audit without altering core Elo.
        for (const { g } of staged) {
          const hist = gameHistory[gameKey(g)];
          if (!hist) continue;
          hist.postPredictiveHome = hist.postHome + regimeCorrectionElo(g.home, Number(week) + 1, earlyStates, D.config.scale);
          hist.postPredictiveAway = hist.postAway + regimeCorrectionElo(g.away, Number(week) + 1, earlyStates, D.config.scale);
        }
      }
      diagnostics.weeksObserved += 1;
    }
    diagnostics.staticBrier = diagnostics.marketGames ? diagnostics.staticErrors.reduce((a, b) => a + b, 0) / diagnostics.marketGames : null;
    diagnostics.adaptiveBrier = diagnostics.marketGames ? diagnostics.adaptiveErrors.reduce((a, b) => a + b, 0) / diagnostics.marketGames : null;

    // V98 look-behind: historical pregame forecasts above remain strictly
    // causal. Only the *current* rating gets a bounded retrospective adjustment
    // based on what each prior opponent did after the target game. This is the
    // mechanism that can reduce Week-2 credit for beating a team that later
    // proves to be much weaker than FORCE believed at the time.
    const causalCoreRatings = { ...coreRatings };
    let retrospective = null;
    let adjustedCoreRatings = { ...causalCoreRatings };
    if (RS?.buildAdjustments && played.length) {
      const lookbackGames = played.map((g) => {
        const hist = gameHistory[gameKey(g)] || {};
        return {
          key: gameKey(g), week: g.week, home: g.home, away: g.away,
          homeScore: g.homeScore, awayScore: g.awayScore,
          preHome: hist.preHome, preAway: hist.preAway,
          postHome: hist.postHome, postAway: hist.postAway,
          homeDelta: hist.homeDelta, awayDelta: hist.awayDelta
        };
      });
      retrospective = RS.buildAdjustments(lookbackGames, causalCoreRatings, {
        hfa: D.config.hfa, scale: D.config.scale, k: D.config.k
      });
      for (const t of Object.keys(adjustedCoreRatings)) {
        adjustedCoreRatings[t] = Number(adjustedCoreRatings[t]) + Number(retrospective.adjustments?.[t] || 0);
      }
      diagnostics.retrospective = {
        version: retrospective.config?.version || 'v98',
        config: retrospective.config,
        center: retrospective.center,
        teams: retrospective.teams,
        games: retrospective.details
      };
      diag('ratings:retrospective-lookbehind', {
        games: retrospective.details?.length || 0,
        adjustedTeams: Object.values(retrospective.adjustments || {}).filter((x) => Math.abs(Number(x) || 0) > 1e-9).length,
        largest: Object.entries(retrospective.adjustments || {}).sort((a,b)=>Math.abs(Number(b[1]))-Math.abs(Number(a[1]))).slice(0,8)
      });
    } else {
      diagnostics.retrospective = { version:'v98', unavailable:true, reason: RS ? 'no completed games' : 'module missing' };
    }

    const nextWeek = (() => {
      const pending = sortedSchedule().filter((g) => g.homeScore == null || g.awayScore == null);
      if (pending.length) return Math.min(...pending.map((g) => Number(g.week) || 1));
      return weeks.length ? Math.max(...weeks) + 1 : 1;
    })();
    const ratings = { ...adjustedCoreRatings };
    if (ER) {
      for (const t of Object.keys(ratings)) ratings[t] += regimeCorrectionElo(t, nextWeek, earlyStates, D.config.scale);
    }
    const value = { ratings, coreRatings:adjustedCoreRatings, causalCoreRatings, preseasonRatings, offseasonMean, offseasonReversion, adaptiveStates, earlyStates, retrospective, diagnostics, gameHistory, nextWeek };
    S.engineCache = { version: S.scheduleVersion, value };
    return value;
  }

  function coreCurrentRatings() {
    return seasonEngine().ratings;
  }

  function unitForceBridgeForProfile(t, coreElo, liveProfile, priorOverride = null, options = {}) {
    t=canon(t);
    const live=liveProfile || priorProfile(t), prior=priorOverride || live?._preseasonUnitPrior || priorProfile(t);
    const baseElo=Number(coreElo ?? coreCurrentRatings()[t] ?? base(t)?.elo ?? D.meta.meanElo);
    const bridgeWeights=options.weights || UNIT_FORCE_WEIGHTS;
    if (UFB?.compute) return {team:t,...UFB.compute(baseElo,live,prior,D.meta,{weights:bridgeWeights})};
    // Defensive fallback for bundles missing the V46 bridge module.
    let weightedDelta=0, availableWeight=0;
    const components=[];
    for (const [key,w] of Object.entries(bridgeWeights)) {
      const lv=live?.[key], pv=prior?.[key];
      const a=(lv==null||lv===''||!Number.isFinite(Number(lv)))?null:Number(lv);
      const b=(pv==null||pv===''||!Number.isFinite(Number(pv)))?null:Number(pv);
      if (a==null || b==null) { components.push({key,weight:w,current:a,prior:b,delta:null,contribution:0}); continue; }
      const delta=a-b, contribution=w*delta;
      weightedDelta += contribution; availableWeight += w;
      components.push({key,weight:w,current:a,prior:b,delta,contribution});
    }
    const bridgePoints=Math.max(-UNIT_FORCE_CAP,Math.min(UNIT_FORCE_CAP,weightedDelta*UNIT_FORCE_SHARE));
    const eloPerPoint=bridgePoints>=0 ? (Number(D.meta.anchorMax)-Number(D.meta.meanElo))/50 : (Number(D.meta.meanElo)-Number(D.meta.anchorMin))/50;
    const elo=baseElo+bridgePoints*eloPerPoint;
    const baseForce=score(baseElo), forceScore=score(elo), forceDelta=forceScore-baseForce;
    return {team:t,baseElo,elo,eloDelta:elo-baseElo,baseForce,forceScore,forceDelta,bridgePoints,weightedUnitDelta:weightedDelta,availableWeight,components};
  }

  function unitForceBridge(t, coreElo = null) {
    return unitForceBridgeForProfile(t, coreElo, profile(t));
  }

  function currentRatings() {
    const core={...coreCurrentRatings()};
    const out={...core};
    for (const t of Object.keys(out)) out[t]=unitForceBridge(t,core[t]).elo;
    return out;
  }

  function qbCarryoverPreset(t) {
    return QBC.presets?.[canon(t)] || null;
  }

  function teamGamesPlayed(t) {
    t = canon(t);
    return S.schedule.filter((g) => g.homeScore != null && g.awayScore != null && (g.home === t || g.away === t)).length;
  }

  function automaticQbRegimeCorrection(t) {
    t = canon(t);
    if (!predictiveQbCarryoverAllowed() || !QR) return 0;
    return QR.correction(qbCarryoverPreset(t), teamGamesPlayed(t));
  }

  function effectiveQbCorrection(t) {
    t = canon(t);
    if (qbCarryoverActive(t)) return Number(S.qbCarryover.restoreElo || 0);
    return automaticQbRegimeCorrection(t);
  }

  function qbCandidates(t) {
    return D.players.filter((p) => p.team === canon(t) && p.pos === 'QB')
      .sort((a, b) => b.impact - a.impact);
  }

  function samePersonName(a,b) {
    const norm=(v)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
    return !!norm(a) && norm(a)===norm(b);
  }

  // V105: the V33 Elo carryover may remain valid as a correction to a team prior,
  // but once the returning starter is already producing current-season QB data we
  // must not paste that historical correction on top of the measured QB unit.
  function suppressQbUnitScenarioOverlay(t, baseProfile=null) {
    t=canon(t);
    const preset=qbCarryoverPreset(t), p=baseProfile || profile(t);
    const currentQb=p?.qb?.qb;
    const liveGames=Number(p?._live?.playerStatGames || p?.qb?.games || 0);
    return !!(preset?.qb && liveGames>0 && samePersonName(currentQb,preset.qb));
  }

  function qbCarryoverActive(t) {
    return !!(S.qbCarryover.enabled && S.qbCarryover.team === canon(t) && Number(S.qbCarryover.restoreElo) > 0);
  }

  function predictiveQbCarryoverAllowed() {
    return PF ? PF.brierEligible('qbCarryover') : false;
  }

  function ratingsWithQBCarryover(t, source = currentRatings()) {
    const out = { ...source };
    t = canon(t);
    const restore = predictiveQbCarryoverAllowed() ? effectiveQbCorrection(t) : 0;
    if (restore > 0) out[t] = (out[t] ?? base(t)?.elo ?? D.meta.meanElo) + restore;
    return out;
  }


  function ratingsWithActiveQBCarryover(source = currentRatings()) {
    const out = { ...source };
    if (!predictiveQbCarryoverAllowed()) return out;
    for (const t of Object.keys(QBC.presets || {})) {
      const restore = effectiveQbCorrection(t);
      if (restore > 0) out[t] = (out[t] ?? base(t)?.elo ?? D.meta.meanElo) + restore;
    }
    return out;
  }

  function quickQbButton(t, compact = true) {
    t = canon(t);
    const preset = qbCarryoverPreset(t);
    if (!preset) return compact ? '' : '<span class="raw">No verified QB-return preset</span>';
    const active = qbCarryoverActive(t);
    const auto = automaticQbRegimeCorrection(t);
    const label = active ? 'Use auto QB fix' : (auto > 0 ? `QB auto +${fmt(auto)}` : 'Apply QB fix');
    const detail = active ? `${preset.qb} | manual +${fmt(S.qbCarryover.restoreElo)} Elo` : auto > 0 ? `${preset.qb} | automatic returning-QB correction` : `${preset.qb} | +${fmt(preset.suggestedRestoreElo)} Elo`;
    return `<button type="button" class="qb-quick ${(active || auto > 0) ? 'active' : ''}" data-qbquick="${t}" title="${active ? 'Return to automatic' : 'Open manual override for'} ${preset.qb} carryover correction">${label}${compact ? '' : `<small>${detail}</small>`}</button>`;
  }

  function teamProbability(g, fc, t) {
    return g.home === t ? fc.probability : 1 - fc.probability;
  }

  function qbCarryoverPanel(t, baseRatings) {
    t = canon(t);
    const preset = qbCarryoverPreset(t);
    const active = qbCarryoverActive(t);
    const autoRestore = automaticQbRegimeCorrection(t);
    const effectiveRestore = effectiveQbCorrection(t);
    const qbs = qbCandidates(t);
    const selectedQB = active ? S.qbCarryover.qb : (preset?.qb || qbs[0]?.name || 'Returning starter');
    const restore = active ? Number(S.qbCarryover.restoreElo) : Number(preset?.suggestedRestoreElo ?? 30);
    const adjusted = { ...baseRatings, [t]: (baseRatings[t] ?? D.meta.meanElo) + restore };
    const unitPreview = qbCarryoverUnitEffect(t, baseRatings, restore, selectedQB);
    const before = projected(t, baseRatings), after = projected(t, adjusted);
    const future = sortedSchedule().find((g) => g.homeScore == null && (g.home === t || g.away === t));
    let nextMarkup = '<div class="scenario-stat"><span>NEXT GAME</span><strong>-</strong><small>No future game loaded.</small></div>';
    if (future) {
      const bf = forecastFor(future, baseRatings), af = forecastFor(future, adjusted);
      const bp = teamProbability(future, bf, t), ap = teamProbability(future, af, t);
      const bproj = exactScoreProjection(future, bf), aproj = exactScoreProjection(future, af);
      const nextOpp = future.home === t ? future.away : future.home;
      nextMarkup = `<div class="scenario-stat"><span class="next-game-team">NEXT GAME | <span class="opp-prefix">${future.home === t ? 'vs' : '@'}</span> ${teamIdentity(nextOpp, { size: 'xs' })}</span><strong>${Math.round(bp*100)}% → ${Math.round(ap*100)}%</strong><small>FORCEcast${bf.marketAvailable ? `, with ${Math.round(bf.marketWeight*100)}% of the prediction coming from the betting market` : ''}<br>Predicted line: ${logoizeTeamCodes(predictedLineLabel(future, bproj))} → ${logoizeTeamCodes(predictedLineLabel(future, aproj))}<br>Predicted score: ${logoizeTeamCodes(`${future.away} ${bproj.away} / ${future.home} ${bproj.home}`)} → ${logoizeTeamCodes(`${future.away} ${aproj.away} / ${future.home} ${aproj.home}`)}</small></div>`;
    }
    const research = QBC.study || {};
    const presetCopy = preset
      ? `<div class="carryover-preset"><b>${preset.qb}:</b> FORCE estimates that the replacement-QB stretch lowered the team rating by about ${fmt(preset.rawBackupWindowEloDamage)} Elo at the time. About ${fmt(preset.postReversionCarryoverDamage)} Elo of that effect carried into the new season. After ${teamGamesPlayed(t)} team games, the automatic correction is now +${fmt(autoRestore)} Elo. The slider lets you test a different total correction.</div>`
      : `<div class="carryover-preset">No preset for this team. Use the slider for a one-off what-if.</div>`;
    return `<section class="card carryover-card">
      <div class="card-head"><div><div class="eyebrow">Returning quarterback adjustment</div><h2>QB Return Lab</h2></div><span class="chip ${(active || autoRestore > 0) ? 'carryover-on' : ''}">${active ? 'MANUAL' : autoRestore > 0 ? 'AUTO' : 'OFF'}</span></div>
      <div class="card-body">
        <p class="carryover-copy">When a team spent time with a replacement quarterback, its team rating can still reflect some of those games after the regular starter returns. For verified cases, FORCE automatically gives back a small part of that lost rating and gradually fades the correction as new games are played. This lab lets you try a different amount. Defense is left alone.</p>
        ${presetCopy}
        <div class="carryover-controls">
          <label>Returning QB<select id="qbCarryoverQB">${(qbs.length ? qbs : [{name:selectedQB}]).map((q) => `<option value="${q.name}" ${q.name === selectedQB ? 'selected' : ''}>${q.name}</option>`).join('')}</select></label>
          <label>Rating restored <div class="range-line"><input id="qbCarryoverElo" type="range" min="0" max="80" step="0.5" value="${restore}"><output id="qbCarryoverValue">+${fmt(restore)} Elo</output></div></label>
          <div class="carryover-actions"><button class="primary-action" id="applyQBCarryover">Apply</button><button class="ghost" id="clearQBCarryover" ${active ? '' : 'disabled'}>Reset</button></div>
        </div>
        <div class="scenario-hero carryover-results">
          <div class="scenario-stat"><span>FORCE SCORE</span><strong>${fmt(score(baseRatings[t]))} → ${fmt(score(adjusted[t]))}</strong><small>Elo ${fmt(baseRatings[t])} → ${fmt(adjusted[t])}</small></div>
          <div class="scenario-stat"><span>OFFENSE PROFILE</span><strong>${fmt(unitPreview?.baseProfile?.offenseComposite ?? profile(t).offenseComposite)} → ${fmt(unitPreview?.profile?.offenseComposite ?? profile(t).offenseComposite)}</strong><small>Defense stays unchanged. The QB-specific correction is carried by offense.</small></div>
          <div class="scenario-stat"><span>QB UNIT</span><strong>${fmt(unitPreview?.baseProfile?.qbIndex ?? profile(t).qbIndex)} → ${fmt(unitPreview?.profile?.qbIndex ?? profile(t).qbIndex)}</strong><small>The displayed QB grade stays based on current QB play. This what-if changes the team rating separately.</small></div>
          <div class="scenario-stat"><span>PROJECTED WINS</span><strong>${fmt(before.ew)} → ${fmt(after.ew)}</strong><small>${after.ew >= before.ew ? '+' : ''}${fmt(after.ew-before.ew,2)} expected wins.</small></div>
          ${nextMarkup}
        </div>
        <div class="warning carryover-warning"><b>Why the automatic correction is cautious:</b> in the historical test, this idea improved predictions more often than it hurt them, but it did not help every team. FORCE therefore uses it only for verified replacement-QB cases, starts with a modest correction, and cuts that correction in half about every four team games.</div>
      </div>
    </section>`;
  }
  function records() {
    const out = {};
    Object.keys(D.teams).forEach((t) => { out[t] = { w: 0, l: 0, t: 0 }; });
    S.schedule.forEach((g) => {
      if (g.homeScore == null || !out[g.home] || !out[g.away]) return;
      const h = out[g.home], a = out[g.away];
      if (g.homeScore > g.awayScore) { h.w++; a.l++; }
      else if (g.homeScore < g.awayScore) { h.l++; a.w++; }
      else { h.t++; a.t++; }
    });
    return out;
  }

  function forecastFor(g, ratings, mode = 'smart') {
    if (!F) {
      const p = wp(ratings[g.home], ratings[g.away]);
      return { probability: p, independent: p, market: null, source: 'independent', marketAvailable: false };
    }
    if (g.homeScore != null && g.awayScore != null) {
      const hist = seasonEngine().gameHistory?.[gameKey(g)];
      if (hist?.[mode]) return hist[mode];
    }
    if (mode === 'adaptive' && A) {
      return A.forecastProbability(g, ratings[g.home], ratings[g.away], seasonEngine().adaptiveStates, D.teams, {
        hfa: D.config.hfa,
        scale: D.config.scale
      });
    }
    return F.forecastProbability(g, ratings[g.home], ratings[g.away], {
      hfa: D.config.hfa,
      scale: D.config.scale,
      mode
    });
  }

  // Internal model-only diagnostic. V35 no longer exposes this as a competing
  // public forecast; probability, line, and score all use the canonical smart blend.
  function forceLineForecastFor(g, ratings) {
    return forecastFor(g, ratings, 'independent');
  }

  function forceLineProjection(g, ratings, beforeWeek = g.week) {
    return exactScoreProjection(g, forceLineForecastFor(g, ratings), beforeWeek);
  }

  function gameKey(g) {
    return `${g.week}|${g.date}|${g.away}|${g.home}`;
  }

  function gameHash(g) {
    return encodeURIComponent(gameKey(g));
  }

  function findGame(encoded) {
    let key = '';
    try { key = decodeURIComponent(encoded || ''); } catch (_) { key = encoded || ''; }
    return S.schedule.find((g) => gameKey(g) === key) || null;
  }

  function priorProfile(t) {
    return M.profiles?.[canon(t)] || {};
  }

  function unitPriorGamesMap(week, earlyStates) {
    const out = {};
    for (const t of Object.keys(D.teams || {})) {
      const correctionPoints = regimeRawCorrectionPoints(t, week, earlyStates || {});
      out[t] = UP ? UP.effectivePriorGames(correctionPoints, 1) : 1;
    }
    return out;
  }

  // Rebuild only the V34 observation state that was legally available before a
  // historical week.  This keeps pregame/postgame unit audit rows leakage-safe
  // while letting V37 apply the same prior-confidence logic to historical views.
  function earlyStatesBeforeWeek(beforeWeek, engine = seasonEngine()) {
    const state = {};
    if (!ER) return state;
    for (const g of sortedSchedule()) {
      if (Number(g.week) >= Number(beforeWeek) || g.homeScore == null || g.awayScore == null) continue;
      const hist = engine.gameHistory?.[gameKey(g)];
      const baselineP = hist?.baselineIndependent?.probability;
      if (!Number.isFinite(Number(baselineP))) continue;
      const obs = ER.observationFromGame(g, baselineP, hist.preHome, hist.preAway);
      if (!obs) continue;
      ER.addObservation(state, obs.home.team, obs.home.residual, obs.home.opponentElo);
      ER.addObservation(state, obs.away.team, obs.away.residual, obs.away.opponentElo);
    }
    return state;
  }

  let penaltyAggregationAuditKey = '';
  function penaltyContextMapBeforeWeek(beforeWeek = null) {
    // V93: game rows are the canonical source of truth. Never trust a separately
    // pre-aggregated season profile when the same payload already contains the
    // finalized game-level values. This guarantees, for example, that two positive
    // BUF game WPA values cannot become a negative season WPA downstream.
    const direct=S.liveGameFlow2026?.penalty_profiles;
    const games=Array.isArray(S.liveGameFlow2026?.penalty_games) ? S.liveGameFlow2026.penalty_games : [];
    const out={};
    for (const g of games) {
      const week=Number(g.week)||0;
      if (beforeWeek != null && week >= Number(beforeWeek)) continue;
      for (const [teamCode,vals] of Object.entries(g.teams||{})) {
        const code=canon(teamCode);
        const row=out[code] ||= {first_downs_for:0,first_downs_against:0,tds_negated_benefit:0,tds_negated_harm:0,turnovers_negated_benefit:0,turnovers_negated_harm:0,drive_saves_benefit:0,drive_saves_harm:0,net_penalty_epa:0,net_penalty_wpa:0,games:0};
        row.first_downs_for += Number(vals?.first_downs_for)||0;
        row.first_downs_against += Number(vals?.first_downs_against)||0;
        row.tds_negated_benefit += Number(vals?.tds_negated_benefit)||0;
        row.tds_negated_harm += Number(vals?.tds_negated_harm)||0;
        row.turnovers_negated_benefit += Number(vals?.turnovers_negated_benefit)||0;
        row.turnovers_negated_harm += Number(vals?.turnovers_negated_harm)||0;
        row.drive_saves_benefit += Number(vals?.drive_saves_benefit)||0;
        row.drive_saves_harm += Number(vals?.drive_saves_harm)||0;
        row.net_penalty_epa += Number(vals?.net_penalty_epa)||0;
        row.net_penalty_wpa += Number(vals?.net_penalty_wpa)||0;
        row.games += 1;
      }
    }
    // Audit the server's optional aggregate against the recomputed game sum. The
    // recomputed value always wins; the direct value is diagnostic only.
    if (beforeWeek == null && direct && typeof direct === 'object') {
      const mismatches=[];
      for (const code of new Set([...Object.keys(out),...Object.keys(direct)])) {
        const a=out[canon(code)]||{};
        const d=direct[code]||direct[canon(code)]||{};
        const dw=Math.abs((Number(a.net_penalty_wpa)||0)-(Number(d.net_penalty_wpa)||0));
        const de=Math.abs((Number(a.net_penalty_epa)||0)-(Number(d.net_penalty_epa)||0));
        const dg=Math.abs((Number(a.games)||0)-(Number(d.games)||0));
        if (dw>1e-9 || de>1e-9 || dg>0) mismatches.push({team:canon(code),gameSumWpa:Number(a.net_penalty_wpa)||0,directWpa:Number(d.net_penalty_wpa)||0,gameSumEpa:Number(a.net_penalty_epa)||0,directEpa:Number(d.net_penalty_epa)||0,gameCount:Number(a.games)||0,directGames:Number(d.games)||0});
      }
      const buf=out.BUF||{};
      const auditKey=`${S.statsVersion}|${games.length}|${Number(buf.net_penalty_wpa)||0}|${Number(buf.games)||0}`;
      if (auditKey!==penaltyAggregationAuditKey) {
        penaltyAggregationAuditKey=auditKey;
        diag('penalty:aggregation-audit',{source:'penalty_games',gameRows:games.length,mismatchCount:mismatches.length,mismatches:mismatches.slice(0,32),BUF:{gameSumWpa:Number(buf.net_penalty_wpa)||0,games:Number(buf.games)||0,wpaPerGame:(Number(buf.games)||0)>0?(Number(buf.net_penalty_wpa)||0)/Number(buf.games):null,directWpa:Number((direct.BUF||{}).net_penalty_wpa)||0,directGames:Number((direct.BUF||{}).games)||0}});
      }
    }
    return out;
  }


  // V100: current-season defensive scoring outcome from the same nflverse PBP
  // already fetched for Game Flow. This is deliberately simple and unadjusted:
  // offensive points allowed / qualifying opponent possessions. Return TDs,
  // safeties, and kneel-only possessions are excluded server-side; OT is included.
  function defensiveDriveContextMapBeforeWeek(beforeWeek = null) {
    const games=Array.isArray(S.liveGameFlow2026?.defensive_drive_games) ? S.liveGameFlow2026.defensive_drive_games : [];
    const out={};
    for (const g of games) {
      const week=Number(g.week)||0;
      if (beforeWeek != null && week >= Number(beforeWeek)) continue;
      const home=canon(g.home), away=canon(g.away);
      const homeDrives=Number(g.home_offensive_drives)||0, awayDrives=Number(g.away_offensive_drives)||0;
      const homePts=Number(g.home_offensive_points)||0, awayPts=Number(g.away_offensive_points)||0;
      const homeCovEpa=Number(g.home_coverage_pass_epa)||0, awayCovEpa=Number(g.away_coverage_pass_epa)||0;
      const homeCovAtt=Math.max(0,Number(g.home_coverage_pass_attempts)||0), awayCovAtt=Math.max(0,Number(g.away_coverage_pass_attempts)||0);
      const homeCovSuccess=Math.max(0,Number(g.home_coverage_pass_successes)||0), awayCovSuccess=Math.max(0,Number(g.away_coverage_pass_successes)||0);
      const homePassYds=Number(g.home_pass_yards)||0, awayPassYds=Number(g.away_pass_yards)||0, homePassTds=Number(g.home_pass_tds)||0, awayPassTds=Number(g.away_pass_tds)||0, homeInts=Number(g.home_interceptions)||0, awayInts=Number(g.away_interceptions)||0, homeSackYds=Number(g.home_sack_yards)||0, awaySackYds=Number(g.away_sack_yards)||0, homeSacks=Number(g.home_sacks)||0, awaySacks=Number(g.away_sacks)||0, homeCpoe=Number.isFinite(Number(g.home_cpoe))?Number(g.home_cpoe):null, awayCpoe=Number.isFinite(Number(g.away_cpoe))?Number(g.away_cpoe):null;
      const homeOlDb=Math.max(0,Number(g.home_pass_protection_dropbacks)||0), awayOlDb=Math.max(0,Number(g.away_pass_protection_dropbacks)||0);
      const homeOlDis=Math.max(0,Number(g.home_pass_protection_disruptions)||0), awayOlDis=Math.max(0,Number(g.away_pass_protection_disruptions)||0);
      const homeStdDb=Math.max(0,Number(g.home_standard_rush_dropbacks)||0), awayStdDb=Math.max(0,Number(g.away_standard_rush_dropbacks)||0);
      const homeStdPressure=Math.max(0,Number(g.home_standard_rush_pressures)||0), awayStdPressure=Math.max(0,Number(g.away_standard_rush_pressures)||0);
      const homePressureEpa=Number(g.home_pressure_epa)||0, awayPressureEpa=Number(g.away_pressure_epa)||0;
      const homePressurePlays=Math.max(0,Number(g.home_pressure_plays)||0), awayPressurePlays=Math.max(0,Number(g.away_pressure_plays)||0);
      const homePressureSuccesses=Math.max(0,Number(g.home_pressure_successes)||0), awayPressureSuccesses=Math.max(0,Number(g.away_pressure_successes)||0);
      const homeCleanEpa=Number(g.home_clean_epa)||0, awayCleanEpa=Number(g.away_clean_epa)||0;
      const homeCleanPlays=Math.max(0,Number(g.home_clean_plays)||0), awayCleanPlays=Math.max(0,Number(g.away_clean_plays)||0);
      const homeQbRushEpa=Number(g.home_qb_rush_epa)||0, awayQbRushEpa=Number(g.away_qb_rush_epa)||0;
      const homeQbRushAtt=Math.max(0,Number(g.home_qb_rush_attempts)||0), awayQbRushAtt=Math.max(0,Number(g.away_qb_rush_attempts)||0);
      if (away && awayDrives>0) {
        const row=out[home] ||= {pointsAllowed:0,opponentDrives:0,games:0,coveragePassEpa:0,coveragePassAttempts:0,coveragePassSuccesses:0,offensivePoints:0,offensiveDrives:0,offensePassEpa:0,offensePassAttempts:0,offensePassSuccesses:0,passProtectionDropbacks:0,passProtectionDisruptions:0,standardRushDropbacks:0,standardRushPressures:0,pressureEpa:0,pressurePlays:0,pressureSuccesses:0,cleanEpa:0,cleanPlays:0,qbRushEpa:0,qbRushAttempts:0,gameRows:[]};
        row.pointsAllowed += awayPts; row.opponentDrives += awayDrives; row.games += 1;
        row.coveragePassEpa += awayCovEpa; row.coveragePassAttempts += awayCovAtt; row.coveragePassSuccesses += awayCovSuccess;
      }
      if (home && homeDrives>0) {
        const row=out[away] ||= {pointsAllowed:0,opponentDrives:0,games:0,coveragePassEpa:0,coveragePassAttempts:0,coveragePassSuccesses:0,offensivePoints:0,offensiveDrives:0,offensePassEpa:0,offensePassAttempts:0,offensePassSuccesses:0,passProtectionDropbacks:0,passProtectionDisruptions:0,standardRushDropbacks:0,standardRushPressures:0,pressureEpa:0,pressurePlays:0,pressureSuccesses:0,cleanEpa:0,cleanPlays:0,qbRushEpa:0,qbRushAttempts:0,gameRows:[]};
        row.pointsAllowed += homePts; row.opponentDrives += homeDrives; row.games += 1;
        row.coveragePassEpa += homeCovEpa; row.coveragePassAttempts += homeCovAtt; row.coveragePassSuccesses += homeCovSuccess;
      }
      // V102 reuses the same sack-free pass-attempt PBP for the offense/QB side.
      if (home && homeDrives>0) {
        const row=out[home] ||= {pointsAllowed:0,opponentDrives:0,games:0,coveragePassEpa:0,coveragePassAttempts:0,coveragePassSuccesses:0,offensivePoints:0,offensiveDrives:0,offensePassEpa:0,offensePassAttempts:0,offensePassSuccesses:0,passProtectionDropbacks:0,passProtectionDisruptions:0,standardRushDropbacks:0,standardRushPressures:0,pressureEpa:0,pressurePlays:0,pressureSuccesses:0,cleanEpa:0,cleanPlays:0,qbRushEpa:0,qbRushAttempts:0,gameRows:[]};
        row.offensivePoints += homePts; row.offensiveDrives += homeDrives;
        row.offensePassEpa += homeCovEpa; row.offensePassAttempts += homeCovAtt; row.offensePassSuccesses += homeCovSuccess;
        row.passProtectionDropbacks += homeOlDb; row.passProtectionDisruptions += homeOlDis;
        row.standardRushDropbacks += homeStdDb; row.standardRushPressures += homeStdPressure; row.pressureEpa += homePressureEpa; row.pressurePlays += homePressurePlays; row.pressureSuccesses += homePressureSuccesses; row.cleanEpa += homeCleanEpa; row.cleanPlays += homeCleanPlays;
        row.qbRushEpa += homeQbRushEpa; row.qbRushAttempts += homeQbRushAtt;
        row.gameRows.push({week,opponent:away,passEpa:homeCovEpa,passAttempts:homeCovAtt,passSuccesses:homeCovSuccess,passYards:homePassYds,passTds:homePassTds,interceptions:homeInts,sackYards:homeSackYds,sacks:homeSacks,cpoe:homeCpoe,standardRushDropbacks:homeStdDb,standardRushPressures:homeStdPressure,pressureEpa:homePressureEpa,pressurePlays:homePressurePlays,pressureSuccesses:homePressureSuccesses,cleanEpa:homeCleanEpa,cleanPlays:homeCleanPlays,qbRushEpa:homeQbRushEpa,qbRushAttempts:homeQbRushAtt});
      }
      if (away && awayDrives>0) {
        const row=out[away] ||= {pointsAllowed:0,opponentDrives:0,games:0,coveragePassEpa:0,coveragePassAttempts:0,coveragePassSuccesses:0,offensivePoints:0,offensiveDrives:0,offensePassEpa:0,offensePassAttempts:0,offensePassSuccesses:0,passProtectionDropbacks:0,passProtectionDisruptions:0,standardRushDropbacks:0,standardRushPressures:0,pressureEpa:0,pressurePlays:0,pressureSuccesses:0,cleanEpa:0,cleanPlays:0,qbRushEpa:0,qbRushAttempts:0,gameRows:[]};
        row.offensivePoints += awayPts; row.offensiveDrives += awayDrives;
        row.offensePassEpa += awayCovEpa; row.offensePassAttempts += awayCovAtt; row.offensePassSuccesses += awayCovSuccess;
        row.passProtectionDropbacks += awayOlDb; row.passProtectionDisruptions += awayOlDis;
        row.standardRushDropbacks += awayStdDb; row.standardRushPressures += awayStdPressure; row.pressureEpa += awayPressureEpa; row.pressurePlays += awayPressurePlays; row.pressureSuccesses += awayPressureSuccesses; row.cleanEpa += awayCleanEpa; row.cleanPlays += awayCleanPlays;
        row.qbRushEpa += awayQbRushEpa; row.qbRushAttempts += awayQbRushAtt;
        row.gameRows.push({week,opponent:home,passEpa:awayCovEpa,passAttempts:awayCovAtt,passSuccesses:awayCovSuccess,passYards:awayPassYds,passTds:awayPassTds,interceptions:awayInts,sackYards:awaySackYds,sacks:awaySacks,cpoe:awayCpoe,standardRushDropbacks:awayStdDb,standardRushPressures:awayStdPressure,pressureEpa:awayPressureEpa,pressurePlays:awayPressurePlays,pressureSuccesses:awayPressureSuccesses,cleanEpa:awayCleanEpa,cleanPlays:awayCleanPlays,qbRushEpa:awayQbRushEpa,qbRushAttempts:awayQbRushAtt});
      }
    }
    for (const row of Object.values(out)) {
      row.pointsPerDrive=row.opponentDrives>0 ? row.pointsAllowed/row.opponentDrives : null;
      row.coveragePassEpaPerAttempt=row.coveragePassAttempts>0 ? row.coveragePassEpa/row.coveragePassAttempts : null;
      row.coveragePassSuccessRate=row.coveragePassAttempts>0 ? row.coveragePassSuccesses/row.coveragePassAttempts : null;
      row.offensivePointsPerDrive=row.offensiveDrives>0 ? row.offensivePoints/row.offensiveDrives : null;
      row.offensePassEpaPerAttempt=row.offensePassAttempts>0 ? row.offensePassEpa/row.offensePassAttempts : null;
      row.offensePassSuccessRate=row.offensePassAttempts>0 ? row.offensePassSuccesses/row.offensePassAttempts : null;
      row.passProtectionDisruptionRate=row.passProtectionDropbacks>0 ? row.passProtectionDisruptions/row.passProtectionDropbacks : null;
      row.standardRushPressureRate=row.standardRushDropbacks>0 ? row.standardRushPressures/row.standardRushDropbacks : null;
      row.pressureEpaPerPlay=row.pressurePlays>0 ? row.pressureEpa/row.pressurePlays : null;
      row.pressureSuccessRate=row.pressurePlays>0 ? row.pressureSuccesses/row.pressurePlays : null;
      row.cleanEpaPerPlay=row.cleanPlays>0 ? row.cleanEpa/row.cleanPlays : null;
      row.pressureEpaDrop=(row.pressureEpaPerPlay!=null&&row.cleanEpaPerPlay!=null)?row.pressureEpaPerPlay-row.cleanEpaPerPlay:null;
    }
    return out;
  }

  function penaltyDebugSnapshot(teamCode='BUF') {
    const code=canon(String(teamCode||'BUF').toUpperCase());
    const flow=S.liveGameFlow2026||{};
    const games=Array.isArray(flow.penalty_games)?flow.penalty_games:[];
    const teamGames=games.filter((g)=>g?.teams && g.teams[code]).map((g)=>({
      game_id:g.game_id,week:Number(g.week)||0,home:g.home,away:g.away,
      team:{...(g.teams[code]||{})},
      events:(Array.isArray(g.events)?g.events:[]).map((e)=>({
        penalty_team:e.penalty_team,beneficiary:e.beneficiary,posteam:e.posteam,defteam:e.defteam,penalty_type:e.penalty_type,
        play_type:e.play_type,special_teams:Boolean(e.special_teams),
        causal_epa:Number(e.causal_epa)||0,causal_wpa:Number(e.causal_wpa)||0,
        actual_team_ep:e.actual_team_ep,counterfactual_team_ep:e.counterfactual_team_ep,actual_ep_source:e.actual_ep_source,
        actual_team_score_delta:e.actual_team_score_delta,counterfactual_team_score_delta:e.counterfactual_team_score_delta,
        actual_team_state_value:e.actual_team_state_value,counterfactual_team_state_value:e.counterfactual_team_state_value,score_erased_points:e.score_erased_points,
        actual_home_wp_post:e.actual_home_wp_post,counterfactual_home_wp:e.counterfactual_home_wp,
        actual_wp_source:e.actual_wp_source,counterfactual_kind:e.counterfactual_kind,
        counterfactual_wp_kind:e.counterfactual_wp_kind,counterfactual_epa_kind:e.counterfactual_epa_kind,
        actual_state:e.actual_state,counterfactual_state:e.counterfactual_state,desc:e.desc
      }))
    }));
    const recomputed=penaltyContextMapBeforeWeek()[code]||{};
    const direct=(flow.penalty_profiles||{})[code]||null;
    let profilePenalty=null;
    try { profilePenalty=liveProfiles()?.[code]?.penalty||null; } catch (error) { profilePenalty={error:diagnosticError(error)}; }
    const gameWpa=teamGames.map((g)=>Number(g.team?.net_penalty_wpa)||0);
    const gameEpa=teamGames.map((g)=>Number(g.team?.net_penalty_epa)||0);
    const result={
      team:code,method:flow.penalty_method||null,calibration:flow.penalty_calibration||null,
      gameCount:teamGames.length,gameWpa,gameEpa,
      arithmetic:{wpaSum:gameWpa.reduce((a,b)=>a+b,0),wpaPerGame:gameWpa.length?gameWpa.reduce((a,b)=>a+b,0)/gameWpa.length:null,epaSum:gameEpa.reduce((a,b)=>a+b,0),epaPerGame:gameEpa.length?gameEpa.reduce((a,b)=>a+b,0)/gameEpa.length:null},
      recomputedFromGames:recomputed,directServerProfile:direct,
      serverScoreBreakdown:direct?.penaltyImpactBreakdown||null,
      liveProfilePenalty:profilePenalty,browserScoreBreakdown:profilePenalty?.penaltyImpactBreakdown||null,games:teamGames
    };
    console.log('[FORCE-PENALTY-DEBUG]',result);
    return result;
  }

  function penaltyScaleAudit() {
    const flow=S.liveGameFlow2026||{};
    const profiles=liveProfiles();
    const rows=Object.keys(D.teams||{}).map((teamCode)=>{
      const code=canon(teamCode);
      const pen=profiles?.[code]?.penalty||{};
      const b=pen?.penaltyImpactBreakdown||null;
      return {team:code,score:Number(pen?.penaltyImpactScore),games:Number(pen?.penalty_context_games)||0,epaPerGame:Number(pen?.net_penalty_epa_per_game),wpaPpPerGame:Number(pen?.net_penalty_wpa_per_game)*100,rawZ:b?.rawZ||null,cappedZ:b?.cappedZ||null,weightedContributions:b?.weightedContributions||null,preGuardCombinedZ:b?.preGuardCombinedZ??b?.pre_guard_combined_z??null,combinedZ:b?.combinedZ??null,directValueAgreement:b?.directValueAgreement??b?.direct_value_agreement??null,directionGuardApplied:b?.directionGuardApplied??b?.direction_guard_applied??null,softness:b?.softness??null,componentZCap:b?.componentZCap??null};
    }).filter((r)=>Number.isFinite(r.score)).sort((a,b)=>b.score-a.score);
    const result={method:flow.penalty_method||null,calibration:flow.penalty_calibration||null,teams:rows,range:{max:rows[0]||null,min:rows[rows.length-1]||null,exact100:rows.filter(r=>r.score>=99.999999).map(r=>r.team),exact0:rows.filter(r=>r.score<=0.000001).map(r=>r.team)}};
    console.log('[FORCE-PENALTY-SCALE-AUDIT]',result);
    return result;
  }

  function penaltyOutliers(limit=30) {
    const flow=S.liveGameFlow2026||{};
    const rows=[];
    for (const g of (Array.isArray(flow.penalty_games)?flow.penalty_games:[])) {
      for (const e of (Array.isArray(g.events)?g.events:[])) {
        rows.push({game_id:g.game_id,week:Number(g.week)||0,home:g.home,away:g.away,penalty_team:e.penalty_team,beneficiary:e.beneficiary,penalty_type:e.penalty_type,play_type:e.play_type,special_teams:Boolean(e.special_teams),causal_epa:Number(e.causal_epa)||0,causal_wpa_pp:(Number(e.causal_wpa)||0)*100,actual_team_ep:e.actual_team_ep,counterfactual_team_ep:e.counterfactual_team_ep,actual_team_score_delta:e.actual_team_score_delta,counterfactual_team_score_delta:e.counterfactual_team_score_delta,actual_team_state_value:e.actual_team_state_value,counterfactual_team_state_value:e.counterfactual_team_state_value,score_erased_points:e.score_erased_points,actual_home_wp_post:e.actual_home_wp_post,counterfactual_home_wp:e.counterfactual_home_wp,counterfactual_wp_kind:e.counterfactual_wp_kind,counterfactual_epa_kind:e.counterfactual_epa_kind,actual_state:e.actual_state,counterfactual_state:e.counterfactual_state,desc:e.desc});
      }
    }
    const n=Math.max(1,Math.min(200,Number(limit)||30));
    const byEpa=[...rows].sort((a,b)=>Math.abs(b.causal_epa)-Math.abs(a.causal_epa)).slice(0,n);
    const byWpa=[...rows].sort((a,b)=>Math.abs(b.causal_wpa_pp)-Math.abs(a.causal_wpa_pp)).slice(0,n);
    const result={eventCount:rows.length,largestAbsEpa:byEpa,largestAbsWpaPp:byWpa};
    console.log('[FORCE-PENALTY-OUTLIERS]',result);
    return result;
  }

  function flagScoreLabel(v) {
    const x=Number(v);
    if (!Number.isFinite(x)) return 'Unavailable';
    if (x < 30) return 'Strong net harm';
    if (x < 45) return 'Net harm';
    if (x <= 55) return 'Near neutral';
    if (x <= 70) return 'Net benefit';
    return 'Strong net benefit';
  }

  function flagScoreClass(v) {
    const x=Number(v);
    if (!Number.isFinite(x)) return '';
    if (x < 45) return 'flag-harm';
    if (x <= 55) return 'flag-neutral';
    return 'flag-benefit';
  }

  function flagGauge(v, compact=false) {
    const x=Number(v);
    if (!Number.isFinite(x)) return '';
    const pct=Math.max(0,Math.min(100,x));
    const label=flagScoreLabel(pct);
    return `<div class="flag-gauge ${compact?'compact':''}" aria-label="FLAG ${fmt(pct,0)} out of 100" data-flag-score="${pct}" data-flag-label="${label}"><div class="flag-scale"><i style="left:${pct}%"></i><em></em></div>${compact?'':`<div class="flag-scale-labels"><span>HARMED</span><span>50 NEUTRAL</span><span>BENEFITED</span></div>`}</div>`;
  }

  function penaltyGameForSchedule(g) {
    if (!g) return null;
    const rows=Array.isArray(S.liveGameFlow2026?.penalty_games)?S.liveGameFlow2026.penalty_games:[];
    const home=canon(g.home), away=canon(g.away), week=Number(g.week)||0;
    return rows.find((row)=>Number(row?.week)===week && canon(row?.home)===home && canon(row?.away)===away) || null;
  }

  // V122 conservative result-relevance screen. A FLAG Swing Candidate requires
  // the winner to have received positive net penalty EPA at least as large as
  // the final scoring margin. WPA is reported as supporting leverage only.
  // This never judges call correctness and never asserts that penalties caused the win.
  function flagSwingAssessment(g) {
    if (!g || g.homeScore == null || g.awayScore == null) return null;
    const hs=Number(g.homeScore), as=Number(g.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || hs===as) return null;
    const winner=hs>as?canon(g.home):canon(g.away);
    const loser=hs>as?canon(g.away):canon(g.home);
    const margin=Math.abs(hs-as);
    const pg=penaltyGameForSchedule(g);
    if (!pg?.teams?.[winner]) return null;
    const winnerRow=pg.teams[winner]||{};
    const loserRow=pg.teams[loser]||{};
    const winnerBenefitEpa=Number(winnerRow.net_penalty_epa)||0;
    const winnerBenefitWpa=Number(winnerRow.net_penalty_wpa)||0;
    const candidate=winnerBenefitEpa>0 && winnerBenefitEpa+1e-9>=margin;
    return {
      candidate,game_id:pg.game_id||null,week:Number(g.week)||0,home:canon(g.home),away:canon(g.away),winner,loser,margin,
      winnerBenefitEpa,winnerBenefitWpa,loserPenaltyEpa:Number(loserRow.net_penalty_epa)||0,loserPenaltyWpa:Number(loserRow.net_penalty_wpa)||0,
      neutralMargin:margin-winnerBenefitEpa
    };
  }

  function flagSwingBadge(g) {
    const a=flagSwingAssessment(g);
    return a?.candidate ? `<span class="flag-swing-chip">FLAG SWING</span>` : '';
  }

  function flagSwingGameBanner(g) {
    const a=flagSwingAssessment(g);
    if (!a?.candidate) return '';
    return `<section class="card flag-swing-banner" data-flag-winner="${a.winner}" data-flag-epa="${a.winnerBenefitEpa}" data-flag-wpa="${a.winnerBenefitWpa}" data-flag-margin="${a.margin}">
      <div class="flag-swing-icon">FLAG</div>
      <div><div class="eyebrow">FLAG Swing Candidate</div><h2>Penalty impact was large enough to be plausibly result-relevant</h2>
      <p>${teamToken(a.winner,'xs')} gained about <b>${signed(a.winnerBenefitEpa,2,' expected points')}</b> from the penalties called in a ${a.margin}-point win. Those calls also moved its win chance by <b>${signed(a.winnerBenefitWpa*100,1,' percentage points')}</b>. The expected-points benefit was at least as large as the final margin.</p>
      <small>This label only says the measured penalty impact was large enough to have mattered. It does not judge whether calls were correct, and it does not say penalties caused the result.</small></div>
    </section>`;
  }

  function flagSwingTeamPanel(teamCode) {
    const t=canon(teamCode);
    const rows=S.schedule.filter((g)=>g.homeScore!=null && (canon(g.home)===t || canon(g.away)===t)).map((g)=>({g,a:flagSwingAssessment(g)})).filter((x)=>x.a?.candidate);
    if (!rows.length) return `<div class="section-title flag-swing-title"><div><div class="eyebrow">FLAG Swing</div><h2>Result-relevant penalty games</h2><p>No completed games currently meet the conservative FLAG Swing threshold.</p></div></div>`;
    return `<div class="section-title flag-swing-title"><div><div class="eyebrow">FLAG Swing</div><h2>Result-relevant penalty games</h2><p>Games where the penalties called gave the winner enough expected-point value to equal or exceed the final scoring margin.</p></div><span class="chip">${rows.length} candidate${rows.length===1?'':'s'}</span></div>
      <section class="card flag-swing-list">${rows.map(({g,a})=>{
        const opp=canon(g.home)===t?canon(g.away):canon(g.home);
        const teamWon=a.winner===t;
        const ts=canon(g.home)===t?Number(g.homeScore):Number(g.awayScore), os=canon(g.home)===t?Number(g.awayScore):Number(g.homeScore);
        return `<button class="flag-swing-row schedule-button" data-game="${gameHash(g)}"><span class="flag-swing-chip">FLAG SWING</span><span><b>W${g.week} ${teamWon?'vs':'at'} ${teamToken(opp,'xs')}</b><small>${teamWon?'Penalties favored the winner':'Penalty advantage favored the opponent'} · final ${ts}-${os}</small></span><span class="flag-swing-values"><b>${signed(a.winnerBenefitEpa,2,' expected points')}</b><small>${signed(a.winnerBenefitWpa*100,1,' win-chance points')} to ${a.winner}</small></span></button>`;
      }).join('')}</section>`;
  }

  window.FORCE_FLAG_SWING_DEBUG=function(teamCode=null) {
    const rows=S.schedule.filter((g)=>g.homeScore!=null).map((g)=>({game:gameKey(g),assessment:flagSwingAssessment(g)})).filter((x)=>x.assessment);
    const filtered=teamCode?rows.filter((x)=>[x.assessment.home,x.assessment.away].includes(canon(teamCode))):rows;
    const result={definition:'FLAG Swing Candidate = winner net penalty EPA benefit >= final scoring margin; correctness/intent not assessed',games:filtered,candidates:filtered.filter(x=>x.assessment.candidate)};
    console.log('[FORCE-FLAG-SWING-DEBUG]',result); return result;
  };

  function qbRecencyAdjustmentFromProfiles(teamCode, profiles) {
    // V148 canonical recency: compute the V140 current-season form adjustment
    // from an already-built profile map so it can be promoted into qbIndex once
    // without recursively rebuilding liveProfiles().
    const team=canon(teamCode), games=(defensiveDriveContextMapBeforeWeek(null)[team]?.gameRows||[]).filter(g=>Number(g.passAttempts)>0).sort((a,b)=>Number(a.week)-Number(b.week));
    if (games.length<2) return 0;
    const component=(t)=>{const q=profiles?.[t]?.qb||{}; return {
      epa:Number.isFinite(Number(q.pass_epa_score))?Number(q.pass_epa_score):50,
      anya:Number.isFinite(Number(q.any_a_score))?Number(q.any_a_score):50,
      success:Number.isFinite(Number(q.pass_success_score))?Number(q.pass_success_score):50,
      rushing:Number.isFinite(Number(q.rushing_value_score))?Number(q.rushing_value_score):50,
      cpoe:Number.isFinite(Number(q.cpoe_score))?Number(q.cpoe_score):50,
      native:{actualPassEpaPerAttempt:Number(q.actual_pass_epa_per_attempt),anyA:Number(q.any_a),passSuccessRate:Number(q.pass_success_rate),qbRushEpaPerAttempt:Number(q.rush_epa_per_attempt),cpoe:Number(q.live_cpoe)}
    };};
    const teams=Object.keys(D.teams).map(t=>component(t));
    const fit=(nativeKey,scoreKey)=>{const pts=teams.map(c=>[Number(c.native[nativeKey]),Number(c[scoreKey])]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)); if(pts.length<8)return null; const mx=pts.reduce((a,p)=>a+p[0],0)/pts.length,my=pts.reduce((a,p)=>a+p[1],0)/pts.length; const den=pts.reduce((a,p)=>a+(p[0]-mx)**2,0); if(den<=1e-9)return null; const b=pts.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0)/den; return {a:my-b*mx,b};};
    const fits={epa:fit('actualPassEpaPerAttempt','epa'),anya:fit('anyA','anya'),success:fit('passSuccessRate','success'),rushing:fit('qbRushEpaPerAttempt','rushing'),cpoe:fit('cpoe','cpoe')};
    const weights={epa:30,anya:30,success:20,rushing:10,cpoe:10};
    const scoreGame=g=>{const att=Math.max(1,Number(g.passAttempts)||0), sacks=Math.max(0,Number(g.sacks)||0); const anya=(Number(g.passYards)||0)+20*(Number(g.passTds)||0)-45*(Number(g.interceptions)||0)-(Number(g.sackYards)||0); const vals={epa:(Number(g.passEpa)||0)/att,anya:anya/Math.max(1,att+sacks),success:(Number(g.passSuccesses)||0)/att,rushing:(Number(g.qbRushAttempts)||0)>0?(Number(g.qbRushEpa)||0)/Number(g.qbRushAttempts):0,cpoe:Number(g.cpoe)}; let sum=0,wt=0; for(const [k,w] of Object.entries(weights)){const f=fits[k],v=vals[k]; if(f&&Number.isFinite(v)){sum+=Math.max(0,Math.min(100,f.a+f.b*v))*w;wt+=w;}} return wt?sum/wt:null;};
    const scored=games.map(g=>({g,score:scoreGame(g)})).filter(x=>Number.isFinite(x.score)); if(scored.length<2)return 0;
    const normal=scored.reduce((a,x)=>a+x.score,0)/scored.length; let num=0,den=0; const n=scored.length; scored.forEach((x,i)=>{const rec=n-1-i,w=rec===0?2:rec===1?1.75:rec===2?1.5:rec===3?1.25:1;num+=x.score*w;den+=w;});
    return Math.max(-4,Math.min(4,0.40*((num/den)-normal)));
  }

  function liveProfiles() {
    if (!LP) {
      if (ALLOW_DEGRADED_TEST_DATA) return M.profiles || {};
      throw new Error('FORCE live-profile module is unavailable; refusing to use prior profiles as current data.');
    }
    const engine = seasonEngine();
    const version = `${S.statsVersion}|${S.scheduleVersion}|${engine.nextWeek}`;
    if (S.liveProfilesCache && S.liveProfilesCache.version === version) return S.liveProfilesCache.value;
    diag('profiles:build-start', {
      version,
      nextWeek: engine.nextWeek,
      teamRows: summarizeCsvObjects(S.liveTeamStats, 'team:profile-input'),
      playerRows: summarizeCsvObjects(S.livePlayerStats, 'player:profile-input'),
      scheduleCompleted: S.schedule.filter((g)=>g.homeScore!=null&&g.awayScore!=null).length,
      scheduleLatestCompletedWeek: S.schedule.filter((g)=>g.homeScore!=null&&g.awayScore!=null).reduce((m,g)=>Math.max(m,Number(g.week)||0),0)
    });
    let value;
    try {
      value = LP.buildProfiles({
      teamRows: S.liveTeamStats,
      playerRows: S.livePlayerStats,
      ftnRows: S.liveFtnCharting,
      pfrPassRows: S.livePfrPassStats,
      priorPfrPassRows: S.priorPfrPassStats,
      currentPressure: S.currentPressure,
      penaltyContextByTeam: penaltyContextMapBeforeWeek(),
      defensiveDriveContextByTeam: defensiveDriveContextMapBeforeWeek(),
      performanceLuckGames: S.liveGameFlow2026?.performance_luck_games || [],
      penaltyPriorByTeam: {},
      penaltyCalibration: S.liveGameFlow2026?.penalty_calibration || null,
      historicalReference: S.liveGameFlow2026?.v104_reference || null,
      useChartedPassRush: true,
      priorProfiles: M.profiles || {},
      // V82 integrity contract: the profile engine must always know what games
      // have actually been completed. If current rows are missing, freshness
      // gates suppress those units instead of rebranding a 2025 prior as current.
      schedule: S.schedule,
      gameHistory: engine.gameHistory,
      teamIds: Object.keys(D.teams || {}),
      priorGames: 1,
      unitPriorReversion: Number(D.config?.reversion ?? 0.30),
      // V37: V34's regime signal controls confidence in the preseason unit prior,
      // never the direction of a unit. A strong early surprise can reduce the
      // effective prior from 1.00 game to 0.25 for non-QB units; V104 floors QB at 1.00 through four games; each unit then moves toward its
      // own measured 2026 performance. Week 7+ naturally returns to 1.00.
      priorGamesByTeam: unitPriorGamesMap(engine.nextWeek, engine.earlyStates),
      coveragePolicy: 'v101-attempts',
      qbPolicy: 'v106-current-season-stabilized',
      receiverPolicy: 'v115-partial-orthogonal',
      olPolicy: 'v102-pass-protection',
      offenseOutcomePolicy: 'v102-ppd',
      rbPolicy: 'v115-partial-orthogonal'
      });
    } catch (error) {
      diag('profiles:build-error', { version, error: diagnosticError(error) });
      throw error;
    }
    // V148: the complete FORCE QB Rating is canonical everywhere. V140 recency
    // used to exist only on the QB Rankings page; promote it into qbIndex here so
    // team cards, Units, matchups, FORCEcast and exports all consume the same value.
    for (const t of Object.keys(D.teams || {})) {
      const p=value?.[t], q=p?.qb;
      if (!p || !q || !Number.isFinite(Number(p.qbIndex))) continue;
      const recency=qbRecencyAdjustmentFromProfiles(t,value);
      q.pre_recency_qb_index=Number(p.qbIndex);
      q.recency_adjustment=recency;
      p.qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency));
      q.canonical_force_qb_rating=p.qbIndex;
    }
    const teamDiagnostics={};
    for (const t of Object.keys(D.teams || {})) {
      const p=value?.[t], f=p?._live?.freshness || {};
      teamDiagnostics[t]={
        completedGames:Number(f.completedGames ?? p?._live?.games ?? 0),
        latestCompletedWeek:Number(f.latestCompletedWeek || 0),
        statGames:Number(p?._live?.statGames || 0),
        playerStatGames:Number(p?._live?.playerStatGames || 0),
        teamStats:f.teamStats || null,
        playerStats:f.playerStats || null,
        passRush:f.passRush || null,
        nullUnits:['offenseIndex','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'].filter((k)=>!Number.isFinite(Number(p?.[k])))
      };
    }
    diag('profiles:build-complete', { version, teams:teamDiagnostics });
    S.liveProfilesCache = { version, value };
    return value;
  }

  function profile(t) {
    const c = canon(t);
    return liveProfiles()?.[c] || priorProfile(c);
  }

  function liveProfileStatus(t) {
    const p = profile(t), info = p?._live;
    if (!info || !info.games) return 'Preseason baseline';
    const accelerated = info.priorAccelerated ? ' | trusting the new season faster because the early results changed sharply' : '';
    return `${info.games} game${info.games === 1 ? '' : 's'} from 2026 | ${Math.round(info.weight * 100)}% current-season evidence and ${Math.round((1-info.weight)*100)}% preseason baseline${accelerated}`;
  }


  function profileBeforeWeek(t, beforeWeek, options = {}) {
    t = canon(t);
    if (!LP) return priorProfile(t);
    const bw = Number(beforeWeek);
    const engine = seasonEngine();
    const teamRows = S.liveTeamStats.filter((r) => Number(r.week) < bw);
    const playerRows = S.livePlayerStats.filter((r) => Number(r.week) < bw);
    const ftnRows = S.liveFtnCharting.filter((r) => Number(r.week) < bw);
    const pfrPassRows = S.livePfrPassStats.filter((r) => Number(r.week) < bw);
    const schedule = S.schedule.filter((g) => Number(g.week) < bw);
    const historicalEarlyStates = earlyStatesBeforeWeek(bw, engine);
    const profiles = LP.buildProfiles({
      teamRows, playerRows, ftnRows, pfrPassRows,
      priorPfrPassRows: S.priorPfrPassStats,
      penaltyContextByTeam: penaltyContextMapBeforeWeek(bw),
      defensiveDriveContextByTeam: defensiveDriveContextMapBeforeWeek(bw),
      performanceLuckGames: (S.liveGameFlow2026?.performance_luck_games || []).filter(g=>Number(g.week)<bw),
      penaltyPriorByTeam: {},
      penaltyCalibration: S.liveGameFlow2026?.penalty_calibration || null,
      historicalReference: S.liveGameFlow2026?.v104_reference || null,
      useChartedPassRush: true,
      priorProfiles: M.profiles || {},
      schedule,
      gameHistory: engine.gameHistory,
      teamIds: Object.keys(D.teams || {}),
      priorGames: 1,
      unitPriorReversion: Number(D.config?.reversion ?? 0.30),
      priorGamesByTeam: unitPriorGamesMap(bw, historicalEarlyStates),
      passRushFallbackPolicy: options.preserveV98PassRush ? 'v98-historical' : 'v99',
      coveragePolicy: options.preserveV100Coverage ? 'v100-historical' : 'v101-attempts',
      qbPolicy: options.preserveV101Offense ? 'v101-legacy' : 'v106-current-season-stabilized',
      receiverPolicy: options.preserveV101Offense ? 'v101-legacy' : 'v115-partial-orthogonal',
      olPolicy: options.preserveV101Offense ? 'v101-legacy' : 'v102-pass-protection',
      offenseOutcomePolicy: options.preserveV101Offense ? 'v101-legacy' : 'v102-ppd',
      rbPolicy: options.preserveV101Offense ? 'v101-legacy' : 'v115-partial-orthogonal'
    });
    return profiles?.[t] || priorProfile(t);
  }

  function teamGamesBeforeWeek(t, week, inclusive = false) {
    t=canon(t); const w=Number(week);
    return S.schedule.filter((g) => g.homeScore != null && g.awayScore != null && (g.home === t || g.away === t) && (inclusive ? Number(g.week) <= w : Number(g.week) < w)).length;
  }

  // V69: canonical historical state. Completed-game pages must use the same
  // FORCE definition as Rankings/Teams, frozen at the requested timestamp:
  // result/regime Elo + timestamp-correct unit bridge + automatic QB regime.
  function canonicalGameTeamState(g, t, phase = 'pre') {
    t=canon(t);
    const engine=seasonEngine(), hist=engine.gameHistory?.[gameKey(g)];
    if (!hist) return currentTeamState(t);
    const home=t===g.home;
    const isPost=phase==='post';
    const coreElo=Number(isPost
      ? (home ? (hist.postPredictiveHome ?? hist.postHome) : (hist.postPredictiveAway ?? hist.postAway))
      : (home ? (hist.predictivePreHome ?? hist.preHome) : (hist.predictivePreAway ?? hist.preAway)));
    const p=profileBeforeWeek(t, Number(g.week) + (isPost ? 1 : 0));
    const bridge=unitForceBridgeForProfile(t, coreElo, p);
    const gamesPlayed=teamGamesBeforeWeek(t,g.week,isPost);
    const qbRestore=(predictiveQbCarryoverAllowed() && QR)
      ? QR.correction(qbCarryoverPreset(t),gamesPlayed)
      : 0;
    const elo=Number(bridge.elo ?? coreElo) + Number(qbRestore || 0);
    return {team:t,phase,coreElo,elo,forceScore:score(elo),unitBridge:bridge,profile:p,qbRestore,gamesPlayed};
  }

  function unitChangeRows(t, beforeWeek, currentProfile) {
    const pre = profileBeforeWeek(t, beforeWeek);
    const post = currentProfile || profile(t);
    const metrics = [
      ['Offense composite', 'offenseComposite'], ['Scoring/drive', 'pointsScoredPerDriveIndex'], ['Team efficiency', 'offenseIndex'], ['Defense', 'defenseIndex'], ['QB', 'qbIndex'],
      ['OL', 'olIndex'], ['RB', 'rbIndex'], ['Receivers', 'receiverIndex'], ['Pass rush', 'passRushIndex'], ['Run defense', 'runDefenseIndex'], ['Coverage', 'coverageIndex'], ['Pts/drive prevention', 'pointsAllowedPerDriveIndex']
    ];
    return metrics.map(([label,key]) => {
      const a = Number(pre?.[key]), b = Number(post?.[key]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
      const d = b-a;
      const cls = d > .05 ? 'positive' : d < -.05 ? 'negative' : '';
      return `<div class="unit-change-row"><span>${label}</span><b>${fmt(a,0)} → ${fmt(b,0)}</b><em class="${cls}">${Math.abs(d)<.05 ? '-' : `${d>0?'+':''}${fmt(d,1)}`}</em></div>`;
    }).join('');
  }

  // The bundled unit snapshot is historical. A QB-return scenario changes the
  // current/future team prior, so the unit display needs a matching scenario
  // overlay rather than showing an unchanged offense next to an adjusted team.
  //
  // Current offensive composite weights, recovered from the bundled model:
  // V102 offense: 20% scoring/drive outcome + 30% QB + 15% receivers + 15% OL + 20% RB.
  // V100 Defense remains 36% coverage + 16% pass rush + 28% run defense + 20% points allowed per opponent drive.
  const OFFENSE_WEIGHTS = { pointsScoredPerDriveIndex: 0.20, qbIndex: 0.30, receiverIndex: 0.15, olIndex: 0.15, rbIndex:0.20 };

  function offenseCompositeFrom(p) {
    if (LP?.offenseCompositeFrom) return LP.offenseCompositeFrom(p);
    const pairs=Object.entries(OFFENSE_WEIGHTS).map(([k,w])=>[matchupValue(p?.[k]),w]).filter(([v])=>v!=null);
    const den=pairs.reduce((a,[,w])=>a+w,0);
    return den ? pairs.reduce((a,[v,w])=>a+v*w,0)/den : null;
  }

  function qbCarryoverUnitEffect(t, baseRatings = currentRatings(), restoreOverride = null, qbOverride = null) {
    t = canon(t);
    const restoreElo = Number(restoreOverride == null ? effectiveQbCorrection(t) : restoreOverride);
    if (!(restoreElo > 0)) return null;
    const baseElo = Number(baseRatings[t] ?? base(t)?.elo ?? D.meta.meanElo);
    const forceBefore = score(baseElo);
    const forceAfter = score(baseElo + restoreElo);
    const forceDelta = forceAfter - forceBefore;

    // The carryover correction is specifically a QB/offense correction. Use
    // the shared pure transform so the same logic is regression-tested outside
    // the UI and cannot silently diverge from the live profile pipeline.
    const baseProfile = profile(t);
    const unitOverlaySuppressed = suppressQbUnitScenarioOverlay(t, baseProfile);
    const scenarioResult = (!unitOverlaySuppressed && LP?.applyQbCarryoverScenario)
      ? LP.applyQbCarryoverScenario(baseProfile, forceBefore, forceAfter)
      : { profile: { ...baseProfile } };
    const scenario = scenarioResult.profile;
    return {
      team: t,
      qb: qbOverride || S.qbCarryover.qb || qbCarryoverPreset(t)?.qb || baseProfile.qb?.qb || 'Returning starter',
      restoreElo,
      forceBefore,
      forceAfter,
      forceDelta,
      unitOverlaySuppressed,
      baseProfile,
      profile: scenario
    };
  }

  // Canonical current-state accessor. Any UI that says "current" must consume
  // this object so FORCE, QB-return adjustments, and unit profiles cannot diverge
  // between Rankings, Team, and Matchup views.
  function currentTeamState(t, baseRatings = currentRatings()) {
    t = canon(t);
    const coreElo = coreCurrentRatings()[t] ?? base(t)?.elo ?? D.meta.meanElo;
    const unitBridge = unitForceBridge(t, coreElo);
    const rawElo = baseRatings[t] ?? unitBridge.elo;
    const adjustedRatings = ratingsWithActiveQBCarryover(baseRatings);
    const elo = adjustedRatings[t] ?? rawElo;
    const effect = qbCarryoverUnitEffect(t, baseRatings);
    let currentProfile = profile(t);
    if (effect && !effect.unitOverlaySuppressed) {
      currentProfile = {
        ...effect.profile,
        _qbScenario: {
          qb: effect.qb,
          restoreElo: effect.restoreElo,
          forceDelta: effect.forceDelta,
          baseOffenseComposite: effect.baseProfile.offenseComposite,
          baseOffenseIndex: effect.baseProfile.offenseIndex,
          baseQbIndex: effect.baseProfile.qbIndex
        }
      };
    }
    const qbRegimeCorrection=effect?{qb:effect.qb,restoreElo:effect.restoreElo,forceDelta:effect.forceDelta,unitOverlaySuppressed:Boolean(effect.unitOverlaySuppressed)}:null;
    return { team:t, coreElo, rawElo, elo, forceScore:score(elo), unitBridge, profile:currentProfile, qbScenario:currentProfile?._qbScenario || null, qbRegimeCorrection };
  }

  function displayProfile(t, _legacyAllowScenario = true, baseRatings = currentRatings()) {
    return currentTeamState(t, baseRatings).profile;
  }

  window.FORCE_CURRENT_TEAM_STATE = currentTeamState;
  window.FORCE_CANONICAL_GAME_TEAM_STATE = canonicalGameTeamState;
  // V69 audit hook: expose timestamped canonical states for regression/QA.
  // This does not affect forecasting or UI; it lets automated tests verify that
  // completed-game postgame states agree with today's canonical state when no
  // later completed game exists for that team.
  window.FORCE_V69_STATE_AUDIT = () => {
    const completed=sortedSchedule().filter((g)=>g.homeScore!=null&&g.awayScore!=null);
    const latestByTeam={};
    for (const g of completed) {
      latestByTeam[g.home]=g; latestByTeam[g.away]=g;
    }
    return Object.keys(D.teams||{}).map((teamId)=>{
      const g=latestByTeam[teamId] || null;
      const current=currentTeamState(teamId);
      const post=g ? canonicalGameTeamState(g,teamId,'post') : null;
      const pre=g ? canonicalGameTeamState(g,teamId,'pre') : null;
      return {
        team:teamId, game:g?gameKey(g):null,
        preForce:pre?.forceScore ?? null, postForce:post?.forceScore ?? null,
        currentForce:current?.forceScore ?? null,
        postVsCurrent:(post&&current)?post.forceScore-current.forceScore:null,
        preElo:pre?.elo ?? null, postElo:post?.elo ?? null, currentElo:current?.elo ?? null
      };
    });
  };
  window.FORCE_UNIT_FORCE_BRIDGE = { unitForceBridge, weights:UNIT_FORCE_WEIGHTS, share:UNIT_FORCE_SHARE, cap:UNIT_FORCE_CAP, eloFromScore };

  // V99: Week-2 continuity ledger. Week 2 entry is the actual canonical state
  // produced after Week 1 (including the V99-smoothed regime correction, unit
  // bridge, and QB regime). Current movement is decomposed into like-for-like
  // deltas from that state; no hidden rebase is allowed.
  function week2EntryState(t) {
    t=canon(t);
    const completed=sortedSchedule().filter((g)=>Number(g.week)<2 && g.homeScore!=null&&g.awayScore!=null&&(g.home===t||g.away===t));
    const g=completed[completed.length-1]||null;
    const engine=seasonEngine();
    if (g) {
      const hist=engine.gameHistory?.[gameKey(g)]||{};
      const home=t===g.home;
      const causalCoreElo=Number(home?hist.postHome:hist.postAway);
      // Preserve the actual V98 Week-2-entry unit semantics. V99's new weekly
      // disruption fallback is new evidence and must not retroactively rewrite
      // the baseline if Week-1 advanced pressure happened to be unavailable.
      const coreElo=Number(home?(hist.postPredictiveHome??hist.postHome):(hist.postPredictiveAway??hist.postAway));
      const p=profileBeforeWeek(t,2,{preserveV98PassRush:true,preserveV100Coverage:true,preserveV101Offense:true});
      const bridge=unitForceBridgeForProfile(t,coreElo,p,null,{weights:V99_UNIT_FORCE_WEIGHTS});
      const gamesPlayed=teamGamesBeforeWeek(t,1,true);
      const qbRestore=(predictiveQbCarryoverAllowed()&&QR)?QR.correction(qbCarryoverPreset(t),gamesPlayed):0;
      const elo=Number(bridge.elo??coreElo)+Number(qbRestore||0);
      const regimeElo=coreElo-causalCoreElo;
      return {team:t,phase:'week2-entry-v98-baseline',week:2,game:gameKey(g),causalCoreElo,regimeElo:Number.isFinite(regimeElo)?regimeElo:0,retrospectiveElo:0,coreElo,elo,forceScore:score(elo),unitBridge:bridge,profile:p,qbRestore,gamesPlayed};
    }
    const causalCoreElo=Number(engine.preseasonRatings?.[t] ?? base(t)?.elo ?? D.meta.meanElo);
    const regimeElo=regimeCorrectionElo(t,2,{},D.config.scale);
    const p=profileBeforeWeek(t,2);
    const coreElo=causalCoreElo+regimeElo;
    const bridge=unitForceBridgeForProfile(t,coreElo,p,null,{weights:V99_UNIT_FORCE_WEIGHTS});
    const qbRestore=(predictiveQbCarryoverAllowed()&&QR)?QR.correction(qbCarryoverPreset(t),0):0;
    const elo=Number(bridge.elo??coreElo)+Number(qbRestore||0);
    return {team:t,phase:'week2-entry',week:2,game:null,causalCoreElo,regimeElo,retrospectiveElo:0,coreElo,elo,forceScore:score(elo),unitBridge:bridge,profile:p,qbRestore,gamesPlayed:0};
  }

  function ratingLedger(teamCode=null) {
    const engine=seasonEngine();
    const teams=teamCode?[canon(String(teamCode).toUpperCase())]:Object.keys(D.teams||{}).sort();
    const rows=teams.map((t)=>{
      const entry=week2EntryState(t);
      const current=currentTeamState(t);
      const causalNow=Number(engine.causalCoreRatings?.[t] ?? entry.causalCoreElo);
      const retroNow=Number(engine.retrospective?.adjustments?.[t]||0);
      const regimeNow=regimeCorrectionElo(t,engine.nextWeek,engine.earlyStates,D.config.scale);
      const resultElo=causalNow-Number(entry.causalCoreElo||0);
      const regimeElo=regimeNow-Number(entry.regimeElo||0);
      const retrospectiveElo=retroNow-Number(entry.retrospectiveElo||0);
      const unitBridgeElo=Number(current.unitBridge?.eloDelta||0)-Number(entry.unitBridge?.eloDelta||0);
      const currentQb=Number(current.qbScenario?.restoreElo ?? effectiveQbCorrection(t) ?? 0);
      const entryQb=Number(entry.qbRestore||0);
      const qbElo=currentQb-entryQb;
      const computedElo=Number(entry.elo)+resultElo+regimeElo+retrospectiveElo+unitBridgeElo+qbElo;
      const residual=Number(current.elo)-computedElo;
      const unitKeys=['offenseIndex','pointsScoredPerDriveIndex','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'];
      const unitComponents=Object.fromEntries(unitKeys.map((k)=>[k,{entry:Number(entry.profile?.[k]),current:Number(current.profile?.[k]),delta:(Number.isFinite(Number(entry.profile?.[k]))&&Number.isFinite(Number(current.profile?.[k])))?Number(current.profile[k])-Number(entry.profile[k]):null}]));
      return {
        team:t,entryWeek:2,entryGame:entry.game,
        entry:{force:Number(entry.forceScore),elo:Number(entry.elo),causalCoreElo:Number(entry.causalCoreElo),regimeElo:Number(entry.regimeElo||0),unitBridgeElo:Number(entry.unitBridge?.eloDelta||0),qbElo:entryQb},
        deltas:{resultElo,regimeElo,retrospectiveElo,unitBridgeElo,qbElo},
        current:{force:Number(current.forceScore),elo:Number(current.elo),causalCoreElo:causalNow,regimeElo:regimeNow,retrospectiveElo:retroNow,unitBridgeElo:Number(current.unitBridge?.eloDelta||0),qbElo:currentQb},
        forceDelta:Number(current.forceScore)-Number(entry.forceScore),computedElo,residual,unitComponents
      };
    });
    const result=teamCode?rows[0]:rows;
    try { console.log('[FORCE-RATING-LEDGER]',result); } catch (_) {}
    return result;
  }

  function unitAudit(teamCode=null) {
    const teams=teamCode?[canon(String(teamCode).toUpperCase())]:Object.keys(D.teams||{}).sort();
    const unitKeys=['offenseIndex','pointsScoredPerDriveIndex','defenseIndex','qbIndex','olIndex','receiverIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'];
    const rows=teams.map((t)=>{
      const p=profile(t), live=p?._live||{}, freshness=live.freshness||{};
      return {team:t,games:Number(live.games||0),statGames:Number(live.statGames||0),playerStatGames:Number(live.playerStatGames||0),priorGames:Number(live.priorGames||0),source:live.source||null,passRushProvider:live.passRushProvider||null,passRushDataState:live.passRushDataState||null,freshness,offensiveOutcome:{pointsPerDrive:Number.isFinite(Number(live?.pointsScoredPerDrive))?Number(live.pointsScoredPerDrive):null,index:Number.isFinite(Number(p?.pointsScoredPerDriveIndex))?Number(p.pointsScoredPerDriveIndex):null},defensiveOutcome:{pointsAllowed:Number.isFinite(Number(p?.defensivePointsAllowed))?Number(p.defensivePointsAllowed):null,opponentDrives:Number.isFinite(Number(p?.opponentDrives))?Number(p.opponentDrives):null,pointsPerDrive:Number.isFinite(Number(p?.defensivePointsPerDrive))?Number(p.defensivePointsPerDrive):null,index:Number.isFinite(Number(p?.pointsAllowedPerDriveIndex))?Number(p.pointsAllowedPerDriveIndex):null},units:Object.fromEntries(unitKeys.map((k)=>[k,Number.isFinite(Number(p?.[k]))?Number(p[k]):null]))};
    });
    const result=teamCode?rows[0]:rows;
    try { console.log('[FORCE-UNIT-AUDIT]',result); } catch (_) {}
    return result;
  }

  function defenseDebug(teamCode='KC') {
    const t=canon(String(teamCode||'KC').toUpperCase()), p=profile(t);
    const weights=LP?.DEFENSE_WEIGHTS || {coverageIndex:.36,passRushIndex:.16,runDefenseIndex:.28,pointsAllowedPerDriveIndex:.20};
    const components={};
    for (const [key,w] of Object.entries(weights)) {
      const value=Number.isFinite(Number(p?.[key]))?Number(p[key]):null;
      components[key]={value,weight:Number(w),contribution:value==null?null:value*Number(w)};
    }
    const result={team:t,defenseCompositeRaw:Number.isFinite(Number(p?.defenseCompositeRaw))?Number(p.defenseCompositeRaw):(LP?.rawDefenseCompositeFrom?LP.rawDefenseCompositeFrom(p):null),defenseIndex:Number.isFinite(Number(p?.defenseIndex))?Number(p.defenseIndex):null,compositeCalibration:LP?.COMPOSITE_V108?.defense??null,weights,components,coverage:{index:Number.isFinite(Number(p?.coverageIndex))?Number(p.coverageIndex):null,epaPerActualPassAttempt:Number.isFinite(Number(p?.cov?.epa_allowed))?Number(p.cov.epa_allowed):null,cpoeAllowed:Number.isFinite(Number(p?.cov?.cpoe_allowed))?Number(p.cov.cpoe_allowed):null,actualPassAttempts:Number.isFinite(Number(p?.cov?.coverage_pass_attempts))?Number(p.cov.coverage_pass_attempts):null,aggregateDropbackEpa:Number.isFinite(Number(p?.cov?.aggregate_dropback_epa))?Number(p.cov.aggregate_dropback_epa):null,scope:p?.cov?.coverage_epa_scope||null,source:p?.cov?.source||null},pointsAllowed:Number.isFinite(Number(p?.defensivePointsAllowed))?Number(p.defensivePointsAllowed):null,opponentDrives:Number.isFinite(Number(p?.opponentDrives))?Number(p.opponentDrives):null,pointsPerDrive:Number.isFinite(Number(p?.defensivePointsPerDrive))?Number(p.defensivePointsPerDrive):null,pointsPerDriveIndex:Number.isFinite(Number(p?.pointsAllowedPerDriveIndex))?Number(p.pointsAllowedPerDriveIndex):null,method:'V108 keeps the V101/V100 defensive component weights but calibrates the displayed composite with a defense-specific soft-tail curve that preserves 0/50/100; predictive FORCE still consumes the underlying component units directly'};
    try { console.log('[FORCE-DEFENSE-DEBUG]',result); } catch (_) {}
    return result;
  }
  window.FORCE_DEFENSE_DEBUG=defenseDebug;

  function qbDebug(teamCode='KC') {
    const t=canon(String(teamCode||'KC').toUpperCase()), p=profile(t), live=p?._live||{}, qb=p?.qb||{};
    const prior=Number.isFinite(Number(p?._preseasonUnitPrior?.qbIndex))?Number(p._preseasonUnitPrior.qbIndex):null;
    const state=currentTeamState(t), displayed=state?.profile||p, scenario=state?.qbScenario||displayed?._qbScenario||null;
    const bridge=state?.unitBridge;
    const qbBridge=(bridge?.components||[]).find((x)=>x.key==='qbIndex')||null;
    const measured=Number.isFinite(Number(p?.qbIndex))?Number(p.qbIndex):null;
    const shown=Number.isFinite(Number(displayed?.qbIndex))?Number(displayed.qbIndex):measured;
    const result={
      team:t,qb:qb.qb||null,primaryQbDropbacks:Number(qb.primary_qb_dropbacks||0),qbRoomDropbacks:Number(qb.qb_room_dropbacks||0),primaryQbDropbackShare:Number.isFinite(Number(qb.primary_qb_dropback_share))?Number(qb.primary_qb_dropback_share):null,qbIndex:measured,measuredQbIndex:measured,displayedQbIndex:shown,preseasonQbIndex:prior,
      movement:(prior!=null&&measured!=null)?measured-prior:null,
      scenarioAdjustment:(measured!=null&&shown!=null)?shown-measured:0,
      scenario:scenario?{qb:scenario.qb||null,restoreElo:Number(scenario.restoreElo)||0,forceDelta:Number(scenario.forceDelta)||0,baseQbIndex:Number(scenario.baseQbIndex),displayedQbIndex:shown}:null,
      qbRegimeCorrection:state?.qbRegimeCorrection||null,
      actualPassEpaPerAttempt:Number.isFinite(Number(qb.actual_pass_epa_per_attempt))?Number(qb.actual_pass_epa_per_attempt):null,
      opponentAdjustedPassEpa:Number.isFinite(Number(qb.opponent_adjusted_epa_per_attempt))?Number(qb.opponent_adjusted_epa_per_attempt):null,
      opponentCoverageIndex:Number.isFinite(Number(qb.opponent_coverage_index))?Number(qb.opponent_coverage_index):null,
      opponentEpaAdjustment:Number.isFinite(Number(qb.opponent_epa_adjustment))?Number(qb.opponent_epa_adjustment):null,
      opponentRatingAdjustment:Number.isFinite(Number(qb.opponent_rating_adjustment))?Number(qb.opponent_rating_adjustment):0,
      opponentForceQbRatingAllowed:Number.isFinite(Number(qb.opponent_force_qb_rating_allowed))?Number(qb.opponent_force_qb_rating_allowed):null,
      opponentForceQbRatingAllowedRaw:Number.isFinite(Number(qb.opponent_force_qb_rating_allowed_raw))?Number(qb.opponent_force_qb_rating_allowed_raw):null,
      opponentAdjustmentMethod:qb.opponent_adjustment_method||null,
      olRatingAdjustment:Number.isFinite(Number(qb.ol_rating_adjustment))?Number(qb.ol_rating_adjustment):0,
      standardRushPressureAdjustment:Number.isFinite(Number(qb.standard_rush_pressure_adjustment))?Number(qb.standard_rush_pressure_adjustment):0,
      overallPressureAdjustment:Number.isFinite(Number(qb.overall_pressure_adjustment))?Number(qb.overall_pressure_adjustment):0,
      standardRushPressureRate:Number.isFinite(Number(qb.standard_rush_pressure_rate))?Number(qb.standard_rush_pressure_rate):null,
      overallPressureRateAllowed:Number.isFinite(Number(qb.overall_pressure_rate_allowed))?Number(qb.overall_pressure_rate_allowed):null,
      pressureEpaPerPlay:Number.isFinite(Number(qb.pressure_epa_per_play))?Number(qb.pressure_epa_per_play):null,
      pressureSuccessRate:Number.isFinite(Number(qb.pressure_success_rate))?Number(qb.pressure_success_rate):null,
      pressurePerformanceAdjustment:Number.isFinite(Number(qb.pressure_performance_adjustment))?Number(qb.pressure_performance_adjustment):0,
      cleanEpaPerPlay:Number.isFinite(Number(qb.clean_epa_per_play))?Number(qb.clean_epa_per_play):null,
      pressureEpaDrop:Number.isFinite(Number(qb.pressure_epa_drop))?Number(qb.pressure_epa_drop):null,
      cpoe:Number.isFinite(Number(qb.live_cpoe))?Number(qb.live_cpoe):null,
      cpoeAttempts:Number.isFinite(Number(qb.cpoe_attempts))?Number(qb.cpoe_attempts):null,
      effectiveCpoe:Number.isFinite(Number(qb.effective_cpoe))?Number(qb.effective_cpoe):null,
      passEpaScore:Number.isFinite(Number(qb.pass_epa_score))?Number(qb.pass_epa_score):null,
      passEpaBenchmarkGames:Number(qb.pass_epa_benchmark_games||0),
      passEpaBenchmarkCount:Number(qb.pass_epa_benchmark_count||live.qbPassBenchmarkCount||0),
      passEpaBenchmarkSource:qb.pass_epa_benchmark_source||live.qbPassBenchmarkSource||null,
      cpoeScore:Number.isFinite(Number(qb.cpoe_score))?Number(qb.cpoe_score):null,
      passSuccessRate:Number.isFinite(Number(qb.pass_success_rate))?Number(qb.pass_success_rate):null,
      stabilizedPassSuccessRate:Number.isFinite(Number(qb.stabilized_pass_success_rate))?Number(qb.stabilized_pass_success_rate):null,
      passSuccessScore:Number.isFinite(Number(qb.pass_success_score))?Number(qb.pass_success_score):null,
      anyA:Number.isFinite(Number(qb.any_a))?Number(qb.any_a):null,
      anyAScore:Number.isFinite(Number(qb.any_a_score))?Number(qb.any_a_score):null,
      rushingValueScore:Number.isFinite(Number(qb.rushing_value_score))?Number(qb.rushing_value_score):null,
      stabilizedPassEpa:Number.isFinite(Number(qb.stabilized_pass_epa))?Number(qb.stabilized_pass_epa):null,
      stabilizedCpoe:Number.isFinite(Number(qb.stabilized_cpoe))?Number(qb.stabilized_cpoe):null,
      currentLeaguePassEpa:Number.isFinite(Number(qb.current_league_pass_epa))?Number(qb.current_league_pass_epa):null,
      currentLeagueCpoe:Number.isFinite(Number(qb.current_league_cpoe))?Number(qb.current_league_cpoe):null,
      currentLeaguePassSuccessRate:Number.isFinite(Number(qb.current_league_pass_success_rate))?Number(qb.current_league_pass_success_rate):null,
      epaReliabilityWeight:Number.isFinite(Number(qb.epa_reliability_weight))?Number(qb.epa_reliability_weight):null,
      cpoeReliabilityWeight:Number.isFinite(Number(qb.cpoe_reliability_weight))?Number(qb.cpoe_reliability_weight):null,
      successReliabilityWeight:Number.isFinite(Number(qb.success_reliability_weight))?Number(qb.success_reliability_weight):null,
      passCoreScore:Number.isFinite(Number(qb.pass_core_score))?Number(qb.pass_core_score):null,
      qbRushEpaPerAttempt:Number.isFinite(Number(qb.rush_epa_per_attempt))?Number(qb.rush_epa_per_attempt):null,
      qbRushEpaTotal:Number.isFinite(Number(qb.rush_epa_total))?Number(qb.rush_epa_total):null,
      qbRushAttempts:Number.isFinite(Number(qb.rush_attempts))?Number(qb.rush_attempts):null,
      qbRushSource:qb.rush_source||null,
      qbRushBonus:Number.isFinite(Number(qb.rush_bonus))?Number(qb.rush_bonus):null,
      liveQbScore:Number.isFinite(Number(qb.live_qb_score))?Number(qb.live_qb_score):null,
      games:Number(qb.games||live.playerStatGames||0),priorGames:Number((qb.prior_games_used??live.qbPriorGames??live.priorGames) || 0),teamPriorGames:Number(live.priorGames||0),source:qb.source||null,bridge:qbBridge
    };
    try { console.log('[FORCE-QB-DEBUG]',result); } catch (_) {}
    return result;
  }

  function unitOverlapAudit(teamCode=null) {
    const ownership={
      pointsScoredPerDriveIndex:'Broad offensive outcome check only; canonical 20% offense-outcome slot. Team EPA remains diagnostic and is not a direct bridge input.',
      qbIndex:'V139 FORCE QB Rating = 30% EPA/play + 30% ANY/A + 20% success rate + 10% QB rushing value + 10% CPOE, followed by opponent and O-line context. Pressure context is 75% standard-rush protection difficulty and 25% performance under disruption.',
      receiverIndex:'V115 WR/TE-only receiving EPA/target with a league-wide historically fitted, ridge-shrunk QB-environment subtraction; current evidence is target-stabilized and environment-aligned to a matching full-season historical quality scale. RB/FB receiving excluded.',
      olIndex:'PBP disrupted dropbacks only: QB hit OR sack counts once; team rushing EPA removed.',
      rbIndex:'V115 RB/FB-only: 70% rushing EPA/carry + 30% receiving EPA/target after a historically fitted ridge-shrunk QB-environment subtraction; rushing remains directly credited to the RB room, components are separately opportunity-stabilized and environment-aligned before historical quality mapping. QB rushing excluded.',
      coverageIndex:'Actual pass-attempt EPA + CPOE; sacks excluded.',
      passRushIndex:'Pressure/disruption with hit/sack finishing credit; owns sacks on defense.',
      runDefenseIndex:'Opponent rushing EPA only.',
      pointsAllowedPerDriveIndex:'Broad defensive outcome check only.'
    };
    const bridgeWeights={...UNIT_FORCE_WEIGHTS};
    const teams=teamCode?[canon(String(teamCode).toUpperCase())]:Object.keys(D.teams||{}).sort();
    const rows=teams.map((t)=>{ const p=profile(t), st=currentTeamState(t); return {team:t,offenseCompositeRaw:p?.offenseCompositeRaw??null,offenseComposite:p?.offenseComposite??null,defenseCompositeRaw:p?.defenseCompositeRaw??null,defenseIndex:p?.defenseIndex??null,bridgeComponents:st?.unitBridge?.components||[],qb:qbDebug(t),receiver:{index:p?.receiverIndex??null,rawEpa:p?.receivers?.adj_epa??null,residualEpa:p?.receivers?.residual_epa??null,orthogonalBeta:p?.receivers?.orthogonal_beta??null,expectedEnvironmentContribution:p?.receivers?.expected_environment_contribution??null,stabilizedResidualEpa:p?.receivers?.stabilized_residual_epa??null,calibratedResidualEpa:p?.receivers?.calibrated_residual_epa??null,currentLeagueResidualEpa:p?.receivers?.current_league_residual_epa??null,historicalResidualMedian:p?.receivers?.historical_residual_median??null,targets:p?.receivers?.targets??null,reliabilityWeight:p?.receivers?.reliability_weight??null,liveScore:p?.receivers?.live_score??null,source:p?.receivers?.source||null},ol:{index:p?.olIndex??null,pressureAllowed:p?.ol?.pressure_rate_allowed??null,pbpDropbacks:p?.ol?.pbp_dropbacks??null,pbpDisruptions:p?.ol?.pbp_disrupted_dropbacks??null,source:p?.ol?.source||null},rb:{index:p?.rbIndex??null,roomRushEpa:p?.rb?.room_rush_epa??null,roomRecvEpa:p?.rb?.room_recv_epa??null,roomRecvResidualEpa:p?.rb?.room_recv_residual_epa??null,recvOrthogonalBeta:p?.rb?.recv_orthogonal_beta??null,recvExpectedEnvironmentContribution:p?.rb?.recv_expected_environment_contribution??null,stabilizedRushEpa:p?.rb?.stabilized_rush_epa??null,stabilizedRecvResidualEpa:p?.rb?.stabilized_recv_residual_epa??null,stabilizedComposite:p?.rb?.stabilized_composite??null,calibratedComposite:p?.rb?.calibrated_composite??null,currentLeagueCompositeCenter:p?.rb?.current_league_composite_center??null,historicalCompositeMedian:p?.rb?.historical_composite_median??null,roomCarries:p?.rb?.room_carries??null,roomTargets:p?.rb?.room_targets??null,rushReliabilityWeight:p?.rb?.rush_reliability_weight??null,recvReliabilityWeight:p?.rb?.recv_reliability_weight??null,liveScore:p?.rb?.live_score??null,source:p?.rb?.source||null}}; });
    const result={version:'V139',ownership,bridgeWeights,team:teamCode?rows[0]:null,teams:teamCode?null:rows};
    try { console.log('[FORCE-UNIT-OVERLAP-AUDIT]',result); } catch (_) {}
    return result;
  }

  function passRushDebug(teamCode='KC') {
    const t=canon(String(teamCode||'KC').toUpperCase()), p=profile(t), live=p?._live||{}, dl=p?.dl||{};
    const result={team:t,rating:Number.isFinite(Number(p?.passRushIndex))?Number(p.passRushIndex):null,provider:live.passRushProvider||dl.pressure_provider||null,dataState:live.passRushDataState||null,ready:Boolean(live.passRushPressureReady),games:Number(live.passRushGames||0),liveWeight:Number(live.passRushWeight||0),priorGames:Number(live.priorGames||0),dropbacks:Number(dl.charted_dropbacks||0)||null,pressures:Number(dl.pressures||0)||null,hurries:Number(dl.hurries||0)||null,hits:Number(dl.qb_hits||0)||null,sacks:Number(dl.sacks||0)||null,pressureRate:Number.isFinite(Number(dl.pressure_rate))?Number(dl.pressure_rate):null,hitRate:Number.isFinite(Number(dl.hit_rate))?Number(dl.hit_rate):null,sackRate:Number.isFinite(Number(dl.sack_rate))?Number(dl.sack_rate):null,compositeRate:Number.isFinite(Number(dl.pass_rush_composite_rate))?Number(dl.pass_rush_composite_rate):null,source:dl.source||null,freshness:live.freshness?.passRush||null};
    try { console.log('[FORCE-PASS-RUSH-DEBUG]',result); } catch (_) {}
    return result;
  }

  function scenarioMetricNote(p, key) {
    const s = p?._qbScenario;
    if (!s) return '';
    const map = {
      offenseComposite: s.baseOffenseComposite,
      offenseIndex: s.baseOffenseIndex,
      qbIndex: s.baseQbIndex
    };
    if (!(key in map)) return '';
    const before = Number(map[key]), after = Number(p[key]);
    if (!Number.isFinite(before) || !Number.isFinite(after) || Math.abs(after - before) < 0.05) return '';
    return `QB-return scenario · was ${fmt(before,0)}`;
  }

  function scenarioBaseValue(p, key) {
    const s = p?._qbScenario;
    if (!s) return null;
    const map = {
      offenseComposite: s.baseOffenseComposite,
      offenseIndex: s.baseOffenseIndex,
      qbIndex: s.baseQbIndex
    };
    const v = map[key];
    return Number.isFinite(Number(v)) ? Number(v) : null;
  }

  function unitCell(p, key) {
    const raw = p?.[key];
    const v = raw == null || raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(v)) return '<td>-</td>';
    const b = scenarioBaseValue(p, key);
    return `<td class="${b != null ? 'scenario-unit-cell' : ''}"><b>${fmt(v,0)}</b>${b != null && Math.abs(v-b) >= .05 ? `<small>${fmt(b,0)} base</small>` : ''}</td>`;
  }

  // Rankings > Units is intentionally a clean numeric board: no scenario notes,
  // no base values, and no QB-return affordance.  Scenario detail remains on the
  // team/matchup pages where it has context.
  function passRushRateLabel(p) {
    const liveGames=Number(p?._live?.games)||0;
    const ready=Boolean(p?._live?.passRushPressureReady && Number(p?._live?.passRushGames)>0);
    if (!ready && liveGames>0) return 'Detailed pressure data are unavailable, so FORCE is using QB hits and sacks when possible. If those are unavailable too, it keeps the preseason rating.';
    if (!Number.isFinite(Number(p?.dl?.pressure_rate))) return 'pressure unavailable';
    const rate=fmt(Number(p.dl.pressure_rate)*100,1);
    const provider=p?._live?.passRushProvider;
    const asOf=p?.dl?.pressure_as_of ? ` · as of ${p.dl.pressure_as_of}` : '';
    if (ready && provider==='manual-current') return `${rate}% pressure rate in 2026 | manually verified current data${asOf}`;
    if (ready && provider==='ftn-play-level') return `${rate}% pressure rate in 2026 | FTN charting${asOf}`;
    if (ready && provider==='statrankings-current') return `${rate}% pressure rate in 2026 | StatRankings${asOf}`;
    if (ready && provider==='pfr-advanced') return `${rate}% pressure rate in 2026 | Pro Football Reference charting${asOf}`;
    if (ready && provider==='nflverse-weekly-disruption') return `${rate}% disruption rate in 2026 | based on QB hits and sacks per opponent pass play${asOf}`;
    return `${rate}% pressure rate from the preseason baseline | no reliable current pressure data yet`;
  }


  const UPDATE_METRICS = [
    ['Offense','teamStats'],['O-Line','teamStats'],['Coverage','teamStats'],['Run defense','teamStats'],
    ['QB','playerStats'],['RB','playerStats'],['Receivers','playerStats'],['Penalties / player detail','playerStats'],['Pass rush','passRush'],['Scoring / luck','schedule']
  ];

  function metricFreshness(t) {
    const p=profile(t), f=p?._live?.freshness || {};
    const games=teamGamesPlayed(t);
    if (!games) return {games:0,overall:'preseason',items:UPDATE_METRICS.map(([label,key])=>({label,key,current:true,detail:'preseason prior'}))};
    const items=UPDATE_METRICS.map(([label,key])=>{
      const x=f[key] || {};
      const current=Boolean(x.current);
      const usable=Boolean(x.usable ?? current);
      const pending=Boolean(x.pending || (usable&&!current));
      const detail=key==='passRush'
        ? (current ? `${x.provider || p?._live?.passRushProvider || 'current source'} · ${x.games||games}/${games} games` : 'missing current pressure')
        : key==='schedule' ? `through Week ${x.throughWeek||f.latestCompletedWeek||'-'}`
        : current ? `through Week ${x.throughWeek||f.latestCompletedWeek||'-'}`
        : pending ? `Week ${x.throughWeek||'-'} retained · Week ${f.latestCompletedWeek||'-'} pending`
        : `feed through Week ${x.throughWeek||0}; needs Week ${f.latestCompletedWeek||'-'}`;
      return {label,key,current,usable,pending,detail};
    });
    const currentCount=items.filter(x=>x.current).length;
    return {games,overall:currentCount===items.length?'current':currentCount?'partial':'stale',items,currentCount,total:items.length,latestWeek:f.latestCompletedWeek||0};
  }

  function teamUpdateStatus(t) { return metricFreshness(t).overall; }

  function canonicalTeamDataState(t) {
    t=canon(t);
    if (teamGamesPlayed(t) === 0) return 'preseason';
    const p=profile(t), f=p?._live?.freshness || {};
    const teamUsable=Boolean(f.teamStats?.usable ?? f.teamStats?.current);
    const playerUsable=Boolean(f.playerStats?.usable ?? f.playerStats?.current);
    if (!teamUsable || !playerUsable) return 'missing';
    if (f.teamStats?.current && f.playerStats?.current) return 'current';
    return 'pending';
  }

  function canonicalTeamDataReady(t) { return canonicalTeamDataState(t)!=='missing'; }

  function currentDataIntegrity() {
    const played=Object.keys(D.teams || {}).filter((t)=>teamGamesPlayed(t)>0);
    const states=Object.fromEntries(played.map((t)=>[t,canonicalTeamDataState(t)]));
    const missing=played.filter((t)=>states[t]==='missing');
    const pending=played.filter((t)=>states[t]==='pending');
    return {ready:missing.length===0, played, missing, pending, states};
  }

  function clientDiagnosticSnapshot() {
    let integrity=null, integrityError=null;
    try { integrity=currentDataIntegrity(); } catch (error) { integrityError=diagnosticError(error); }
    const teamStates={};
    for (const t of Object.keys(D.teams || {}).sort()) {
      try {
        const p=profile(t), f=p?._live?.freshness || {}, mf=metricFreshness(t);
        teamStates[t]={
          games:mf.games,
          overall:mf.overall,
          latestCompletedWeek:Number(f.latestCompletedWeek || 0),
          completedGames:Number(f.completedGames || 0),
          statGames:Number(p?._live?.statGames || 0),
          playerStatGames:Number(p?._live?.playerStatGames || 0),
          teamStats:f.teamStats || null,
          playerStats:f.playerStats || null,
          passRush:f.passRush || null,
          items:mf.items,
          nullUnits:['offenseIndex','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'].filter((k)=>!Number.isFinite(Number(p?.[k])))
        };
      } catch (error) {
        teamStates[t]={error:diagnosticError(error)};
      }
    }
    const completedByTeam={};
    for (const t of Object.keys(D.teams || {})) {
      const completed=S.schedule.filter((g)=>(g.home===t||g.away===t)&&g.homeScore!=null&&g.awayScore!=null);
      completedByTeam[t]={games:completed.length,latestWeek:completed.reduce((m,g)=>Math.max(m,Number(g.week)||0),0)};
    }
    return {
      version: FORCE_DIAG_VERSION,
      capturedAt: new Date().toISOString(),
      environment: { protocol:location.protocol, origin:location.origin, pathname:location.pathname, hash:location.hash, navigatorOnline:(typeof navigator !== 'undefined' ? navigator.onLine : null), visibility:document.visibilityState },
      state: { live:S.live, connectionState:S.connectionState, serverIdentity:S.serverIdentity, queuedRefresh:S.queuedRefresh, refreshing:S.refreshing, initialRefreshDone:S.initialRefreshDone, lastRefreshAt:S.lastRefreshAt, statsLastRefreshAt:S.statsLastRefreshAt, refreshError:S.refreshError, statsError:S.statsError, statsWarning:S.statsWarning, scheduleVersion:S.scheduleVersion, statsVersion:S.statsVersion },
      schedule: { rows:S.schedule.length, completedGames:S.schedule.filter((g)=>g.homeScore!=null&&g.awayScore!=null).length, latestCompletedWeek:S.schedule.filter((g)=>g.homeScore!=null&&g.awayScore!=null).reduce((m,g)=>Math.max(m,Number(g.week)||0),0), completedByTeam },
      feeds: { team:summarizeCsvObjects(S.liveTeamStats,'team:state'), player:summarizeCsvObjects(S.livePlayerStats,'player:state'), ftn:summarizeCsvObjects(S.liveFtnCharting,'ftn:state'), pfr:summarizeCsvObjects(S.livePfrPassStats,'pfr:state'), priorPfr:summarizeCsvObjects(S.priorPfrPassStats,'pfr-prior:state'), currentPressureRows:Number(S.currentPressure?.row_count||0), currentPressureAsOf:S.currentPressure?.as_of||null, currentPressureAutomatic:{rowCount:Number(S.currentPressure?.automatic?.row_count||0),error:S.currentPressure?.automatic?.error||null}, currentPressureManual:{rowCount:Number(S.currentPressure?.manual?.row_count||0),error:S.currentPressure?.manual?.error||null}, gameFlowGames:Number(S.liveGameFlow2026?.game_count||0) },
      integrity,
      integrityError,
      ratingLookbehind:(()=>{ try { return seasonEngine().diagnostics?.retrospective || null; } catch (error) { return {error:diagnosticError(error)}; } })(),
      ratingLedger:(()=>{ try { return ratingLedger(); } catch (error) { return {error:diagnosticError(error)}; } })(),
      unitAudit:(()=>{ try { return unitAudit(); } catch (error) { return {error:diagnosticError(error)}; } })(),
      teams:teamStates,
      events:[...FORCE_DIAG_EVENTS]
    };
  }

  async function collectDiagnosticReport() {
    let server=null, serverError=null;
    try {
      server=await diagnosticFetch('server diagnostics', `/api/diagnostics?ts=${Date.now()}`, {cache:'no-store'}, 'json');
    } catch (error) {
      serverError=diagnosticError(error);
    }
    const report={client:clientDiagnosticSnapshot(),server,serverError};
    diag('diagnostics:report-collected',{serverAvailable:Boolean(server),serverError});
    // Re-snapshot so the report includes the diagnostic-fetch events themselves.
    report.client=clientDiagnosticSnapshot();
    return report;
  }

  window.FORCE_DIAGNOSTICS={
    version:FORCE_DIAG_VERSION,
    events:FORCE_DIAG_EVENTS,
    snapshot:clientDiagnosticSnapshot,
    collect:collectDiagnosticReport,
    report:async()=>JSON.stringify(await collectDiagnosticReport(),null,2),
    copy:async()=>{
      const text=JSON.stringify(await collectDiagnosticReport(),null,2);
      try { await (typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('clipboard unavailable'))); diag('diagnostics:copied',{bytes:text.length}); }
      catch (error) { diag('diagnostics:copy-failed',{error:diagnosticError(error)}); }
      console.log('[FORCE-DIAG-REPORT]\n'+text);
      return text;
    },
    reset:()=>{ FORCE_DIAG_EVENTS.splice(0,FORCE_DIAG_EVENTS.length); diag('diagnostics:reset'); }
  };
  window.FORCE_PENALTY_DEBUG=penaltyDebugSnapshot;
  window.FORCE_PENALTY_SCALE_AUDIT=penaltyScaleAudit;
  window.FORCE_PENALTY_OUTLIERS=penaltyOutliers;
  window.FORCE_RATING_LOOKBACK=()=>seasonEngine().diagnostics?.retrospective || null;
  window.FORCE_RATING_LEDGER=ratingLedger;
  window.FORCE_UNIT_AUDIT=unitAudit;
  window.FORCE_PASS_RUSH_DEBUG=passRushDebug;
  window.FORCE_QB_DEBUG=qbDebug;
  window.FORCE_COMPOSITE_DEBUG=(teamCode=null)=>{
    const teams=teamCode?[canon(String(teamCode).toUpperCase())]:Object.keys(D.teams||{}).sort();
    const rows=teams.map((t)=>{
      const p=profile(t), offPolicy=p?._offenseCompositePolicy||'v102-orthogonal';
      const offInput={offenseIndex:p?.offenseIndex,pointsScoredPerDriveIndex:p?.pointsScoredPerDriveIndex,qbIndex:p?.qbIndex,receiverIndex:p?.receiverIndex,olIndex:p?.olIndex,rbIndex:p?.rbIndex,_offenseCompositePolicy:offPolicy};
      const defInput={coverageIndex:p?.coverageIndex,passRushIndex:p?.passRushIndex,runDefenseIndex:p?.runDefenseIndex,pointsAllowedPerDriveIndex:p?.pointsAllowedPerDriveIndex};
      const offRaw=Number.isFinite(Number(p?.offenseCompositeRaw))?Number(p.offenseCompositeRaw):(LP?.rawOffenseCompositeFrom?LP.rawOffenseCompositeFrom(offInput,offPolicy):null);
      const defRaw=Number.isFinite(Number(p?.defenseCompositeRaw))?Number(p.defenseCompositeRaw):(LP?.rawDefenseCompositeFrom?LP.rawDefenseCompositeFrom(defInput):null);
      return {team:t,offenseRaw:offRaw,offenseDisplayed:Number.isFinite(Number(p?.offenseComposite))?Number(p.offenseComposite):null,defenseRaw:defRaw,defenseDisplayed:Number.isFinite(Number(p?.defenseIndex))?Number(p.defenseIndex):null,offenseCalibration:LP?.COMPOSITE_V108?.offense??null,defenseCalibration:LP?.COMPOSITE_V108?.defense??null,offenseComponents:offInput,defenseComponents:defInput,predictiveBridgeUsesUnderlyingUnits:true};
    });
    const result=teamCode?rows[0]:rows;
    try { console.log('[FORCE-COMPOSITE-DEBUG]',result); } catch (_) {}
    return result;
  };
  window.FORCE_UNIT_OVERLAP_AUDIT=unitOverlapAudit;
  window.FORCE_WEEK2_ENTRY_STATE=week2EntryState;

  function dataIntegrityBlocked(page, integrity=currentDataIntegrity()) {
    const teams=integrity.missing.map((t)=>team(t).name).join(', ');
    const localHost=['localhost','127.0.0.1'].includes(location.hostname);
    const action=localHost
      ? 'Run FORCE through <code>serve_local.bat</code> / <code>serve_local.sh</code> and use <b>↻ Refresh</b> or the Update Center.'
      : 'A current FORCE data source is temporarily incomplete. Try <b>↻ Refresh</b> shortly; last-known-good server snapshots are used automatically when available.';
    return layout(`<section class="card method data-integrity-block"><div class="eyebrow">Current data check</div><h1>Current FORCE data unavailable</h1><p>FORCE has the latest game results, but it does not yet have a usable 2026 team and player data set for ${integrity.missing.length} team${integrity.missing.length===1?'':'s'}. Rather than quietly mixing in old 2025 numbers, the app leaves those current ratings unavailable. If a source is simply late updating after a game, FORCE can keep that team's last good 2026 data until the new week arrives.</p><p class="raw">${teams || 'Current live inputs are incomplete.'}</p><div class="warning"><b>What to do:</b> ${action}</div><button class="primary" data-nav="update">Open Update Center</button></section>`, page);
  }
  function statusChip(status) {
    const label=status==='current'?'CURRENT':status==='partial'?'PARTIAL':status==='preseason'?'PRESEASON':'STALE';
    return `<span class="update-status update-${status}">${label}</span>`;
  }

  function manualPressureEditor(t, freshness) {
    if (!['localhost','127.0.0.1'].includes(location.hostname)) return '';
    const pass=freshness?.items?.find((x)=>x.key==='passRush');
    if (!pass || pass.current || !(freshness.games>0)) return '';
    const today=new Date().toISOString().slice(0,10);
    return `<div class="manual-pressure-editor"><div class="manual-pressure-title"><b>Manual current-pressure rescue</b><small>Use only when automatic providers miss this team. The freshness gate still validates date and games covered.</small></div><div class="manual-pressure-fields"><label>Pressure %<input type="number" min="0" max="100" step="0.1" data-manual-pressure-value="${t}" placeholder="e.g. 45.5"></label><label>As of<input type="date" data-manual-pressure-date="${t}" value="${today}"></label><label>Source / note<input data-manual-pressure-source="${t}" placeholder="NFL NGS / StatRankings / PFF…"></label><label>Source URL<input data-manual-pressure-url="${t}" placeholder="https://…"></label></div><button class="ghost manual-pressure-save" data-save-pressure="${t}" data-games="${freshness.games}" data-week="${freshness.latestWeek||0}">Save + recompute ${t}</button><span class="manual-pressure-feedback" data-pressure-feedback="${t}"></span></div>`;
  }

  async function saveManualPressure(teamCode, button) {
    const t=canon(teamCode);
    const value=document.querySelector(`[data-manual-pressure-value="${t}"]`)?.value;
    const asOf=document.querySelector(`[data-manual-pressure-date="${t}"]`)?.value;
    const source=document.querySelector(`[data-manual-pressure-source="${t}"]`)?.value || 'manual Update Center verification';
    const sourceUrl=document.querySelector(`[data-manual-pressure-url="${t}"]`)?.value || null;
    const feedback=document.querySelector(`[data-pressure-feedback="${t}"]`);
    const rate=Number(value);
    if (!Number.isFinite(rate) || rate<0 || rate>100) { if (feedback) feedback.textContent='Enter a pressure percentage from 0 to 100.'; return; }
    if (!asOf) { if (feedback) feedback.textContent='Choose the source date.'; return; }
    if (button) button.disabled=true;
    if (feedback) feedback.textContent='Saving…';
    try {
      const r=await fetch('/api/current-pressure/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({team:t,pressure_rate:rate,as_of:asOf,games:Number(button?.dataset.games||teamGamesPlayed(t)),through_week:Number(button?.dataset.week||0),source,source_url:sourceUrl,note:'Entered in FORCE V46 Update Center'})});
      const body=await r.json().catch(()=>({}));
      if (!r.ok || !body.ok) throw new Error(body.error || `save failed (${r.status})`);
      if (feedback) feedback.textContent='Saved. Refreshing all live inputs for this team…';
      await refreshSchedule(`manual-pressure-${t}`,[t]);
    } catch (e) {
      if (feedback) feedback.textContent=e?.message || 'Manual pressure save failed.';
      if (button) button.disabled=false;
    }
  }

  function updateCenter() {
    const teams=Object.keys(D.teams).sort((a,b)=>team(a).name.localeCompare(team(b).name));
    const states=teams.map(t=>[t,metricFreshness(t)]);
    const current=states.filter(([,x])=>x.overall==='current'||x.overall==='preseason').length;
    const attention=states.filter(([,x])=>x.overall==='partial'||x.overall==='stale').map(([t])=>t);
    const last=S.lastUpdateScope?.at ? new Date(S.lastUpdateScope.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : '-';
    return layout(`<div class="section-title"><div><div class="eyebrow">Update Center</div><h2>Canonical live team snapshots</h2><p>Refresh one team or the whole league. Every successful source update feeds the same unit ratings, FORCE rating, rankings, team pages, matchups, projections, and future forecasts.</p></div></div>
      <section class="card update-summary"><div class="update-summary-actions"><button class="primary" id="updateAllTeams">↻ Update all 32 teams</button><button class="ghost" id="updateStaleTeams" ${attention.length?'':'disabled'}>Update missing / stale (${attention.length})</button><button class="ghost" id="collectDiagnostics">Collect diagnostic report</button></div><div class="update-summary-stats"><span><b>${current}</b> current/preseason</span><span><b>${attention.length}</b> need attention</span><span>Last requested update: <b>${last}</b></span></div></section>
      <section class="card force-diagnostic-card"><div class="card-head"><div><div class="eyebrow">Troubleshooting</div><h3>Live-data report</h3></div><span class="chip">${FORCE_DIAG_VERSION}</span></div><p class="raw">If a refresh fails, click <b>Collect diagnostic report</b>. It records which data sources loaded, which ones did not, what weeks were available, and which teams are still waiting for fresh data.</p><textarea id="diagnosticOutput" class="force-diagnostic-output" hidden readonly spellcheck="false"></textarea><div id="diagnosticFeedback" class="raw"></div></section>
      <div class="warning update-policy"><b>How FORCE handles stale data:</b> after a team plays, a current rating is shown only when its source includes that team's latest completed game. If the new data are missing, FORCE does not quietly substitute an older week or a 2025 value. When fresh unit data arrive, those unit changes flow into the team's FORCE Score.</div>
      <section class="update-team-grid">${states.map(([t,x])=>{
        const bridge=unitForceBridge(t,coreCurrentRatings()[t]);
        const log=S.updateLog[t];
        return `<article class="card update-team-card" style="${teamAccentStyle(t)}"><div class="card-head"><h3>${teamIdentity(t,{size:'sm'})}</h3>${statusChip(x.overall)}</div><div class="update-team-meta"><span>${x.games} completed game${x.games===1?'':'s'}${x.latestWeek?` · through Week ${x.latestWeek}`:''}</span><span>Unit effect on FORCE: <b class="${bridge.forceDelta>0?'positive':bridge.forceDelta<0?'negative':''}">${bridge.forceDelta>=0?'+':''}${fmt(bridge.forceDelta,1)}</b></span>${log?`<span>Last team update: ${new Date(log.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span>`:''}</div><div class="update-metric-list">${x.items.map(m=>`<div><span>${m.label}</span><b class="${m.current?'positive':'negative'}">${m.current?'Current':'Unavailable'}</b><small>${m.detail}</small></div>`).join('')}</div><button class="ghost update-team-button" data-update-team="${t}">↻ Refresh all ${t} data</button>${manualPressureEditor(t,x)}</article>`;
      }).join('')}</section>`, 'update');
  }

  function rawUnitCell(p, key) {
    const raw = p?.[key];
    const v = raw == null || raw === '' ? NaN : Number(raw);
    let detail = '';
    if (key === 'qbIndex' && p?._qbScenario && Number.isFinite(Number(p?._qbScenario?.baseQbIndex))) {
      detail=` title="Displayed QB includes returning-QB scenario overlay: ${fmt(Number(p._qbScenario.baseQbIndex),1)} measured base → ${fmt(v,1)} scenario value. Use FORCE_QB_DEBUG(team) for both values."`;
    }
    if (key === 'passRushIndex') {
      const ready=Boolean(p?._live?.passRushPressureReady && Number(p?._live?.passRushGames)>0);
      if (!ready && Number(p?._live?.games)>0) {
        const reason=p?._live?.currentPressureReason || 'no fresh complete current-season pressure provider';
        detail=` title="Pass rush is unavailable: ${String(reason).replace(/"/g,'&quot;')}. FORCE first looks for current pressure data, then for current QB hits and sacks. If neither is usable, it keeps the preseason pass-rush rating."`;
      } else if (Number.isFinite(Number(p?.dl?.pressure_rate))) {
        const rate = Number(p.dl.pressure_rate) * 100;
        const hurries = Number(p?.dl?.hurries);
        const hits = Number(p?.dl?.qb_hits);
        const sacks = Number(p?.dl?.sacks);
        const composite = Number(p?.dl?.pass_rush_composite_rate) * 100;
        const liveWeight = Number(p?._live?.passRushWeight);
        const liveGames = Number(p?._live?.passRushGames);
        const providerMap={'manual-current':'curated current override','ftn-play-level':'FTN play-level','statrankings-current':'StatRankings current','pfr-advanced':'complete PFR fallback','nflverse-weekly-disruption':'nflverse weekly disruption fallback','prior-held':'2025 prior held','prior':'2025 prior'};
        const provider = providerMap[p?._live?.passRushProvider] || 'pressure source';
        const events = [
          Number.isFinite(hurries) ? `${fmt(hurries,0)} hurries` : null,
          Number.isFinite(hits) ? `${fmt(hits,0)} hits` : null,
          Number.isFinite(sacks) ? `${fmt(sacks,1).replace(/\.0$/, '')} sacks` : null
        ].filter(Boolean).join(' · ');
        const blend = liveGames>0 && Number.isFinite(liveWeight)
          ? ` | ${Math.round(liveWeight*100)}% based on this season and ${Math.round((1-liveWeight)*100)}% carried in from preseason`
          : ' | still using the preseason baseline';
        detail = ` title="Pass rush: ${fmt(rate,1)}% pressure rate | ${provider}${p?.dl?.pressure_as_of?` | current through ${p.dl.pressure_as_of}`:''}${events ? ` | ${events}` : ''}${blend}. FORCE starts with pressure rate and gives extra credit when a pressure becomes a QB hit or sack."`;
      }
    }
    return `<td${detail}>${Number.isFinite(v) ? `<b>${fmt(v,0)}</b>` : '-'}</td>`;
  }

  function unitBoardRow(p, label, key) {
    const raw = p?.[key];
    const v = raw == null || raw === '' ? NaN : Number(raw);
    const b = scenarioBaseValue(p, key);
    const note = b != null && Math.abs(v-b) >= .05 ? `<small class="unit-scenario-note">${fmt(b,1)} base · QB-return scenario</small>` : '';
    return `<div class="unit-row ${note ? 'scenario-unit-row' : ''}"><span>${label}${note}</span><strong>${Number.isFinite(v) ? fmt(v,1) : '-'}</strong><div class="unit-meter"><i style="width:${Math.max(0, Math.min(100, v || 0))}%"></i></div></div>`;
  }

  function edgeBadge(offTeam, defTeam, edge) {
    if (edge == null || edge === '' || !Number.isFinite(Number(edge))) return '<span class="chip">DATA UNAVAILABLE</span>';
    const e = Number(edge);
    if (Math.abs(e) < .5) return '<span class="chip">EVEN</span>';
    if (e > 0) return `<span class="chip positive team-chip">${teamToken(offTeam)}<span>OFF +${fmt(e,0)}</span></span>`;
    return `<span class="chip negative team-chip">${teamToken(defTeam)}<span>DEF +${fmt(Math.abs(e),0)}</span></span>`;
  }

  // V73: presentation-only unit matchup calibration. Historical unit snapshots are
  // not deep enough to support a leakage-safe fitted mapping, so use a conservative
  // symmetric transform with 50/50 at equal grades and a soft 85/15 ceiling.
  function unitMatchupShare(offValue, defValue) {
    const ov = matchupValue(offValue), dv = matchupValue(defValue);
    if (ov==null || dv==null) return null;
    const diff = ov - dv;
    const offShare = 50 + 35 * Math.tanh(diff / 45);
    return { off: Math.max(15, Math.min(85, offShare)), def: Math.max(15, Math.min(85, 100-offShare)), diff };
  }

  function matchupEdgeLabel(winnerShare) {
    const w = Number(winnerShare) || 50;
    if (w < 55) return 'Even';
    if (w < 60) return 'Slight edge';
    if (w < 70) return 'Edge';
    if (w < 80) return 'Strong edge';
    return 'Major edge';
  }

  function matchupEdgeDonut(offTeam, defTeam, offValue, defValue) {
    const m = unitMatchupShare(offValue, defValue);
    if (!m) return `<div class="matchup-edge-donut matchup-edge-donut-missing"><span>-</span></div>`;
    const offPct = Math.round(m.off), defPct = 100-offPct;
    const winner = offPct === defPct ? null : offPct > defPct ? offTeam : defTeam;
    const winPct = Math.max(offPct, defPct);
    const center = winner ? teamMark(winner, 'xs', 'right', 'matchup-edge-logo') : `<span class="matchup-edge-even">EVEN</span>`;
    return `<div class="matchup-edge-wrap" title="Presentation-only matchup share; not a FORCEcast input">
      <div class="matchup-edge-donut" style="--edge-off:${offPct}%;--edge-off-color:${teamAccent(offTeam)};--edge-def-color:${teamAccent(defTeam)}">
        <div class="matchup-edge-hole">${center}</div>
      </div>
      <div class="matchup-edge-score"><b>${offPct}</b><span>–</span><b>${defPct}</b></div>
      <small>${matchupEdgeLabel(winPct)}</small>
    </div>`;
  }

  function matchupSubedge(label, offTeam, defTeam, offValue, defValue) {
    const ov = matchupValue(offValue), dv = matchupValue(defValue);
    if (ov==null || dv==null) return `<div class="matchup-subedge matchup-subedge-missing"><span>${label}</span><b>data unavailable</b><em>-</em></div>`;
    const edge = ov - dv;
    return `<div class="matchup-subedge matchup-subedge-donut-card">
      <div class="matchup-subedge-title">${label}</div>
      <div class="matchup-subedge-body">
        <div class="matchup-unit-raw matchup-unit-raw-off"><i>${teamToken(offTeam,'xxs')}</i><b class="${bandClass(ov)}">${fmt(ov,0)}</b></div>
        ${matchupEdgeDonut(offTeam, defTeam, ov, dv)}
        <div class="matchup-unit-raw matchup-unit-raw-def"><b class="${bandClass(dv)}">${fmt(dv,0)}</b><i>${teamToken(defTeam,'xxs')}</i></div>
      </div>
    </div>`;
  }

  function matchupBreakdown(offTeam, defTeam, offProfile, defProfile) {
    const off=matchupValue(offProfile.offenseComposite), def=matchupValue(defProfile.defenseIndex);
    const overall = off==null || def==null ? null : off-def;
    const overallWinner = overall==null ? 'data unavailable' : Math.abs(overall) < .5 ? 'Even' : overall > 0
      ? `${teamToken(offTeam)} offense +${fmt(overall,0)}`
      : `${teamToken(defTeam)} defense +${fmt(Math.abs(overall),0)}`;
    return `<div class="matchup-summary">
      <div class="matchup-overall ${overall==null?'matchup-subedge-missing':''}"><span>Overall edge</span><strong>${off==null?'-':fmt(off,0)} offense vs ${def==null?'-':fmt(def,0)} defense</strong><b class="${overall==null?'':overall >= 0 ? 'positive' : 'negative'}">${overallWinner}</b></div>
      <div class="matchup-subedges">
        ${matchupSubedge('QB vs coverage', offTeam, defTeam, offProfile.qbIndex, defProfile.coverageIndex)}
        ${matchupSubedge('Receivers vs coverage', offTeam, defTeam, offProfile.receiverIndex, defProfile.coverageIndex)}
        ${matchupSubedge('OL vs pass rush', offTeam, defTeam, offProfile.olIndex, defProfile.passRushIndex)}
        ${matchupSubedge('RB vs run defense', offTeam, defTeam, offProfile.rbIndex, defProfile.runDefenseIndex)}
      </div>
      <p class="matchup-footnote">Overall edge = offense profile − defense profile. The rows below show absolute FORCE unit grades plus a presentation-only relative matchup share. The donut is not added to FORCEcast.</p>
    </div>`;
  }

  function probToSpread(p) {
    // V31: use the exact inverse of Forecast v2's spread -> probability
    // calibration. The old 28.6-Elo-per-point constant was unrelated to the
    // 6.5 logit spread scale and compressed FORCE-implied lines toward zero.
    if (F?.probabilityToSpread) return F.probabilityToSpread(p);
    p = Math.max(0.01, Math.min(0.99, Number(p) || 0.5));
    return -6.5 * Math.log(p / (1 - p));
  }

  function scoringProfile(t, beforeWeek = Infinity) {
    const prior = priorProfile(t).scoring || { ppg_for: 22.5, ppg_against: 22.5, games: 0 };
    const played = S.schedule.filter((g) => (g.home === t || g.away === t) && g.homeScore != null && g.awayScore != null && g.week < beforeWeek);
    if (!played.length) return { for: prior.ppg_for || 22.5, against: prior.ppg_against || 22.5, liveGames: 0 };
    let pf = 0, pa = 0;
    for (const g of played) {
      const home = g.home === t;
      pf += home ? g.homeScore : g.awayScore;
      pa += home ? g.awayScore : g.homeScore;
    }
    const priorGames = 6;
    return {
      for: ((prior.ppg_for || 22.5) * priorGames + pf) / (priorGames + played.length),
      against: ((prior.ppg_against || 22.5) * priorGames + pa) / (priorGames + played.length),
      liveGames: played.length
    };
  }

  const FORCECAST_SCORE_SIM_RUNS = 25000;

  function forcecastScoreSeed(g, beforeWeek, rawTotal, rawMargin) {
    // Stable for the same matchup + model state so refreshing never changes the public score.
    const text = `${gameKey(g)}|${beforeWeek}|${rawTotal.toFixed(3)}|${rawMargin.toFixed(3)}|V149`;
    let h = 2166136261 >>> 0;
    for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619) >>> 0; }
    return h || 1;
  }

  function forcecastScoreRng(seed) {
    let x = seed >>> 0;
    return () => { x = (Math.imul(1664525,x) + 1013904223) >>> 0; return x / 4294967296; };
  }

  function forcecastNormal(rng) {
    // Box-Muller with a floor to avoid log(0).
    const u1=Math.max(1e-12,rng()), u2=Math.max(1e-12,rng());
    return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  }

  function forcecastPoisson(lambda, rng) {
    const L=Math.exp(-Math.max(0.01,lambda));
    let k=0,p=1;
    do { k++; p*=rng(); } while (p>L && k<40);
    return Math.max(0,k-1);
  }

  function simulateForcecastScore(g, rawTotal, rawMargin, beforeWeek = g.week) {
    const homeMean=Math.max(8,Math.min(45,(rawTotal+rawMargin)/2));
    const awayMean=Math.max(8,Math.min(45,(rawTotal-rawMargin)/2));
    const rng=forcecastScoreRng(forcecastScoreSeed(g,beforeWeek,rawTotal,rawMargin));
    const counts=new Map();
    const homeScores=[], awayScores=[], margins=[], totals=[];
    let homeSum=0,awaySum=0;

    // NFL games generally land near 10-12 offensive possessions per team. Pace varies by game,
    // and the shared pace draw keeps both teams in the same game environment.
    const basePoss=10.6;
    for(let run=0;run<FORCECAST_SCORE_SIM_RUNS;run++) {
      const paceShock=forcecastNormal(rng)*0.85;
      const commonGameShock=forcecastNormal(rng)*0.10;
      const homeShock=commonGameShock+forcecastNormal(rng)*0.16;
      const awayShock=commonGameShock+forcecastNormal(rng)*0.16;
      const homePoss=Math.max(7,Math.min(15,forcecastPoisson(Math.max(7.5,basePoss+paceShock),rng)));
      const awayPoss=Math.max(7,Math.min(15,homePoss + (rng()<0.33?-1:rng()>0.67?1:0)));

      const simulateTeam=(meanPts,poss,shock)=>{
        // Convert expected points/game to expected points/drive, then into TD/FG/no-score
        // probabilities. A game-level efficiency shock makes drives correlated rather than
        // independent coin flips and naturally creates hot/cold games and blowouts.
        const targetPPD=Math.max(0.75,Math.min(3.75,meanPts/basePoss));
        const shockedPPD=Math.max(0.55,Math.min(4.15,targetPPD*Math.exp(shock)));
        let tdShare=Math.max(0.48,Math.min(0.72,0.56 + (shockedPPD-2.1)*0.045));
        let scoreProb=shockedPPD/(3 + 4*tdShare);
        scoreProb=Math.max(0.18,Math.min(0.58,scoreProb));
        const tdProb=scoreProb*tdShare, fgProb=scoreProb*(1-tdShare);
        let pts=0;
        for(let d=0;d<poss;d++) {
          const u=rng();
          if(u<tdProb) pts+=7;
          else if(u<tdProb+fgProb) pts+=3;
          // Rare nonstandard scoring keeps the distribution football-shaped without driving it.
          else if(u>0.995) pts+=2;
        }
        return pts;
      };

      let home=simulateTeam(homeMean,homePoss,homeShock);
      let away=simulateTeam(awayMean,awayPoss,awayShock);
      // Regular-season ties are possible; postseason games are not modeled separately here.
      homeSum+=home; awaySum+=away;
      homeScores.push(home); awayScores.push(away); margins.push(home-away); totals.push(home+away);
      const key=`${away}-${home}`;
      counts.set(key,(counts.get(key)||0)+1);
    }

    homeScores.sort((a,b)=>a-b); awayScores.sort((a,b)=>a-b); margins.sort((a,b)=>a-b); totals.sort((a,b)=>a-b);
    const mid=Math.floor(FORCECAST_SCORE_SIM_RUNS/2);
    const medianHome=homeScores[mid], medianAway=awayScores[mid];
    const meanHome=homeSum/FORCECAST_SCORE_SIM_RUNS, meanAway=awaySum/FORCECAST_SCORE_SIM_RUNS;

    // Pick an actually simulated football score near the joint center, favoring common outcomes.
    let best=null;
    for(const [key,count] of counts) {
      const [away,home]=key.split('-').map(Number);
      const centerPenalty=Math.abs(home-medianHome)+Math.abs(away-medianAway);
      const marginPenalty=Math.abs((home-away)-rawMargin)*0.35;
      const totalPenalty=Math.abs((home+away)-rawTotal)*0.20;
      const frequencyBonus=Math.log1p(count)*0.65;
      const objective=centerPenalty+marginPenalty+totalPenalty-frequencyBonus;
      if(!best || objective<best.objective) best={home,away,count,objective};
    }
    return {
      home:best?.home ?? medianHome, away:best?.away ?? medianAway,
      total:(best?.home ?? medianHome)+(best?.away ?? medianAway),
      margin:(best?.home ?? medianHome)-(best?.away ?? medianAway),
      meanHome,meanAway,medianHome,medianAway,
      medianMargin:margins[mid],medianTotal:totals[mid],runs:FORCECAST_SCORE_SIM_RUNS
    };
  }

  function exactScoreProjection(g, fc, beforeWeek = g.week) {
    const hp = scoringProfile(g.home, beforeWeek), ap = scoringProfile(g.away, beforeWeek);
    let rawTotal = ((hp.for + ap.against) / 2) + ((ap.for + hp.against) / 2);
    rawTotal = Math.max(32, Math.min(62, rawTotal));
    const spread = probToSpread(fc.probability);
    const rawMargin = -spread;
    const simulated = simulateForcecastScore(g,rawTotal,rawMargin,beforeWeek);
    return {
      home: simulated.home,
      away: simulated.away,
      total: simulated.total,
      margin: simulated.margin,
      rawTotal,
      rawMargin,
      spread,
      normalized: false,
      monteCarlo: true,
      simulationRuns: simulated.runs,
      simulatedMeanHome: simulated.meanHome,
      simulatedMeanAway: simulated.meanAway,
      simulatedMedianMargin: simulated.medianMargin,
      simulatedMedianTotal: simulated.medianTotal
    };
  }

  function gameFlowQuarterWeights() {
    const raw = GF?.meta?.leagueQuarterShare;
    const fallback = [0.202, 0.303, 0.206, 0.289];
    if (!Array.isArray(raw) || raw.length !== 4) return fallback;
    const clean = raw.map(Number);
    const total = clean.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
    return total > 0.98 && total < 1.02 ? clean.map((v) => v / total) : fallback;
  }

  function gameFlowNormalizeShares(points, fallback = gameFlowQuarterWeights()) {
    if (!Array.isArray(points) || points.length !== 4) return [...fallback];
    const clean = points.map((v) => Math.max(0, Number(v) || 0));
    const total = clean.reduce((s, v) => s + v, 0);
    return total > 0 ? clean.map((v) => v / total) : [...fallback];
  }

  // V77: 2026 timing earns trust gradually. One current game is only 1/7
  // of the season blend; 2 games = 25%, 4 = 40%, 8 ~= 57%. This lets a
  // dramatic current-quarter result nudge the projection without allowing
  // one September game to erase a 17-game prior.
  function gameFlow2026Weight(games) {
    const n = Math.max(0, Number(games) || 0);
    return Math.min(0.80, n / (n + 6));
  }

  function gameFlow2026Profile(t, field = 'for', beforeWeek = null) {
    const code = canon(t);
    const games = Array.isArray(S.liveGameFlow2026?.games) ? S.liveGameFlow2026.games : [];
    const pts = [0,0,0,0];
    let n = 0;
    for (const g of games) {
      const week = Number(g.week) || 0;
      if (beforeWeek != null && week >= Number(beforeWeek)) continue;
      const isHome = canon(g.home) === code;
      const isAway = canon(g.away) === code;
      if (!isHome && !isAway) continue;
      const own = isHome ? g.home_q : g.away_q;
      const opp = isHome ? g.away_q : g.home_q;
      const src = field === 'against' ? opp : own;
      if (!Array.isArray(src) || src.length !== 4) continue;
      for (let i=0;i<4;i++) pts[i] += Math.max(0, Number(src[i]) || 0);
      n += 1;
    }
    return { points: pts, games: n, shares: n ? gameFlowNormalizeShares(pts) : null };
  }

  function gameFlowBlendedTeamProfile(t, field = 'for', beforeWeek = null) {
    const league = gameFlowQuarterWeights();
    const priorPts = GF?.profiles?.[canon(t)]?.[field];
    const prior = gameFlowNormalizeShares(priorPts, league);
    const current = gameFlow2026Profile(t, field, beforeWeek);
    const w26 = current.games > 0 ? gameFlow2026Weight(current.games) : 0;
    const currentShares = current.shares || prior;
    const shares = prior.map((v, i) => (1 - w26) * v + w26 * currentShares[i]);
    return { shares: gameFlowNormalizeShares(shares, league), w26, games: current.games, prior, current: current.shares };
  }

  function gameFlowMatchupQuarterWeights(offenseTeam, defenseTeam, beforeWeek = null) {
    const league = gameFlowQuarterWeights();
    const offense = gameFlowBlendedTeamProfile(offenseTeam, 'for', beforeWeek);
    const defense = gameFlowBlendedTeamProfile(defenseTeam, 'against', beforeWeek);
    // Timing-only matchup shape: own scoring tendency matters most, opponent
    // allowance profile matters second, and league timing remains a stabilizer.
    const raw = league.map((v, i) => 0.20 * v + 0.50 * offense.shares[i] + 0.30 * defense.shares[i]);
    return { weights: gameFlowNormalizeShares(raw, league), offense, defense };
  }


  const GAME_FLOW_QUARTER_PRIOR = Object.freeze({
  0: 0.18, 2: 1.45, 3: 0.05, 4: 3.00, 5: 2.50, 6: 1.10, 7: 0.00,
  8: 1.90, 9: 0.95, 10: 0.10, 11: 1.35, 12: 1.15, 13: 0.62,
  14: 0.12, 15: 1.35, 16: 1.15, 17: 0.45, 18: 1.25, 19: 1.25,
  20: 0.72, 21: 0.22, 22: 1.35, 23: 1.35, 24: 0.62, 27: 0.72, 28: 0.52
  });

  function gameFlowQuarterScoreAllowed(points) {
  const p = Math.max(0, Math.round(Number(points) || 0));
  // V116: do not project a one-point quarter. A one-point safety exists only in
  // an exceptionally rare try-play edge case and is not a reasonable FORCEcast
  // scoring allocation. Quarter-flow is a plausible-score presentation layer,
  // so treat 1 as unavailable rather than merely unlikely.
  return p !== 1;
  }

  function gameFlowQuarterPrior(points) {
  const p = Math.max(0, Math.round(Number(points) || 0));
  if (!gameFlowQuarterScoreAllowed(p)) return 1e6;
  if (Object.prototype.hasOwnProperty.call(GAME_FLOW_QUARTER_PRIOR, p)) return GAME_FLOW_QUARTER_PRIOR[p];
  // Unknown quarter totals are allowed, but common football combinations should win close searches.
  return 1.15 + Math.min(2.5, Math.abs(p - 10) * 0.045);
  }

  function gameFlowAllocationCost(parts, finalScore, weights = gameFlowQuarterWeights()) {
  const final = Math.max(0, Math.round(Number(finalScore) || 0));
  let cost = 0;
  for (let i = 0; i < 4; i++) {
    const expected = final * weights[i];
    const scale = Math.max(2.75, Math.sqrt(Math.max(1, expected)) * 1.45);
    const timingError = (parts[i] - expected) / scale;
    cost += 0.72 * timingError * timingError;
    cost += gameFlowQuarterPrior(parts[i]);
  }
  // Mildly discourage extremely lopsided quarter allocation unless the final itself demands it.
  const maxQ = Math.max(...parts), minQ = Math.min(...parts);
  if (maxQ - minQ >= 18) cost += 0.55;
  return cost;
  }

  function gameFlowTopAllocations(finalScore, weights = gameFlowQuarterWeights(), limit = 72) {
  const final = Math.max(0, Math.round(Number(finalScore) || 0));
  const candidates = [];
  for (let q1 = 0; q1 <= final; q1++) {
    for (let q2 = 0; q2 <= final - q1; q2++) {
      for (let q3 = 0; q3 <= final - q1 - q2; q3++) {
        const q4 = final - q1 - q2 - q3;
        const parts = [q1, q2, q3, q4];
        if (!parts.every(gameFlowQuarterScoreAllowed)) continue;
        const cost = gameFlowAllocationCost(parts, final, weights);
        candidates.push({ parts, cost });
      }
    }
  }
  candidates.sort((a, b) => a.cost - b.cost || a.parts.join(',').localeCompare(b.parts.join(',')));
  return candidates.slice(0, Math.max(1, limit));
  }

  function gameFlowConversionStrategyCost(awayParts, homeParts) {
  let away = 0, home = 0, cost = 0;
  for (let q = 0; q < 4; q++) {
    const prevAway = away, prevHome = home;
    const a = awayParts[q], h = homeParts[q];

    // Strong football prior: when a team is down exactly eight and scores a lone TD,
    // modern strategy overwhelmingly favors a two-point try. That makes +6 (failed try)
    // or +8 (successful try) plausible, while +7 (kick to remain down one) is strongly disfavored.
    if ((prevAway - prevHome) === -8 && h === 0 && [6,7,8].includes(a)) {
      if (a === 7) cost += 6.0;
      else if (a === 6) cost += 0.25;
      else cost -= 0.20;
    }
    if ((prevHome - prevAway) === -8 && a === 0 && [6,7,8].includes(h)) {
      if (h === 7) cost += 6.0;
      else if (h === 6) cost += 0.25;
      else cost -= 0.20;
    }

    // Late multi-score conversion chart: down 14 entering Q4, a first TD often draws a 2-point try.
    // Keep this softer because coach behavior is less uniform than the down-eight case.
    if (q === 3 && (prevAway - prevHome) === -14 && h === 0 && [6,7,8].includes(a)) {
      if (a === 7) cost += 1.1; else if (a === 8) cost -= 0.08;
    }
    if (q === 3 && (prevHome - prevAway) === -14 && a === 0 && [6,7,8].includes(h)) {
      if (h === 7) cost += 1.1; else if (h === 8) cost -= 0.08;
    }

    away += a;
    home += h;
  }
  return cost;
  }

  function gameFlowQuarterProjection(awayFinal, homeFinal, g = null) {
  const beforeWeek = g?.week != null ? Number(g.week) : null;
  const awayTiming = g ? gameFlowMatchupQuarterWeights(g.away, g.home, beforeWeek) : { weights: gameFlowQuarterWeights() };
  const homeTiming = g ? gameFlowMatchupQuarterWeights(g.home, g.away, beforeWeek) : { weights: gameFlowQuarterWeights() };
  const awayCandidates = gameFlowTopAllocations(awayFinal, awayTiming.weights);
  const homeCandidates = gameFlowTopAllocations(homeFinal, homeTiming.weights);
  let best = null;
  for (const a of awayCandidates) {
    for (const h of homeCandidates) {
      const stateCost = gameFlowConversionStrategyCost(a.parts, h.parts);
      const totalCost = a.cost + h.cost + stateCost;
      const tie = `${a.parts.join('-')}|${h.parts.join('-')}`;
      if (!best || totalCost < best.cost - 1e-9 || (Math.abs(totalCost - best.cost) < 1e-9 && tie < best.tie)) {
        best = { away: a.parts, home: h.parts, cost: totalCost, tie, awayTiming, homeTiming };
      }
    }
  }
  return best || { away: [0,0,0,Math.round(awayFinal)||0], home: [0,0,0,Math.round(homeFinal)||0], cost: 0, tie: '', awayTiming, homeTiming };
  }

  function gameFlowCumulative(parts) {
  let total = 0;
  return parts.map((v) => (total += Number(v) || 0));
  }

  function gameFlowTendency(t) {
    const p = GF?.profiles?.[canon(t)];
    if (!p || !Array.isArray(p.for) || p.for.length !== 4) return null;
    const pts = p.for.map(Number);
    const total = pts.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
    if (!(total > 0)) return null;
    const league = gameFlowQuarterWeights();
    const shares = pts.map((v) => v / total);
    let best = 0;
    for (let i = 1; i < 4; i++) {
      if ((shares[i] - league[i]) > (shares[best] - league[best])) best = i;
    }
    return { quarter: best + 1, deltaPct: (shares[best] - league[best]) * 100, shares };
  }


  function gameFlowPanel(g, proj) {
  const flow = gameFlowQuarterProjection(proj.away, proj.home, g);
  const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Final'];
  const rowValues = (parts, final) => [...parts, Math.round(final)].map((x) => `<strong>${x}</strong>`).join('');
  return `<div class="game-flow-research">
    <div class="postgame-heading"><div><span class="eyebrow">Game Flow · Research</span><h3>Projected scoring by quarter</h3></div><span class="chip">display-only</span></div>
    <div class="game-flow-table" role="table" aria-label="Projected scoring by quarter">
      <div class="game-flow-head"><span></span>${labels.map((x) => `<b>${x}</b>`).join('')}</div>
      <div class="game-flow-row"><span>${teamIdentity(g.away, { size: 'xs' })}</span>${rowValues(flow.away, proj.away)}</div>
      <div class="game-flow-row"><span>${teamIdentity(g.home, { size: 'xs' })}</span>${rowValues(flow.home, proj.home)}</div>
    </div>
  </div>`;
  }

  function predictedLineLabel(g, proj) {
    const spread = roundHalf(proj.spread);
    if (spread === 0) return 'Pick’em';
    return spread < 0 ? `${g.home} -${fmt(Math.abs(spread), 1)}` : `${g.away} -${fmt(Math.abs(spread), 1)}`;
  }

  // nflverse spread_line is NOT sportsbook notation. It is a home-oriented
  // expected margin: +2.5 means the HOME team is favored by 2.5. Sportsbook
  // notation shows the favorite with a negative number, so convert only at
  // the presentation boundary. Model code keeps the home-margin convention.
  function marketLineLabel(g) {
    const s = Number(g?.spreadLine);
    const total = g?.totalLine != null && Number.isFinite(Number(g.totalLine))
      ? ` · total ${fmt(Number(g.totalLine))}` : '';
    if (!Number.isFinite(s)) return 'No current line in feed';
    if (Math.abs(s) < 0.05) return `Pick’em${total}`;
    const favorite = s > 0 ? g.home : g.away;
    const dog = s > 0 ? g.away : g.home;
    const points = Math.abs(s);
    return `${favorite} -${fmt(points)} · ${dog} +${fmt(points)}${total}`;
  }

  function marketAdjustmentLabel(g, points) {
    const p = Number(points);
    if (!Number.isFinite(p) || Math.abs(p) < 0.05) return 'no adaptive line move';
    const toward = p > 0 ? g.home : g.away;
    return `toward ${toward} by ${fmt(Math.abs(p))} pts`;
  }

  function currentWeekNumber() {
    const pending = sortedSchedule().filter((g) => g.homeScore == null || g.awayScore == null);
    if (pending.length) return Math.min(...pending.map((g) => g.week));
    const weeks = sortedSchedule().map((g) => g.week);
    return weeks.length ? Math.max(...weeks) : 1;
  }

  function gamePhase(g) {
    if (g.homeScore != null && g.awayScore != null) return 'completed';
    return g.week === currentWeekNumber() ? 'current' : 'upcoming';
  }

  function forecastAudit(g, ratings) {
    const fc = forecastFor(g, ratings);
    const proj = exactScoreProjection(g, fc);
    const post = postgameAudit(g);
    return {
      fc, proj, post,
      line: predictedLineLabel(g, proj),
      score: `${g.away} ${proj.away} · ${g.home} ${proj.home}`,
      actual: g.homeScore != null && g.awayScore != null ? `${g.away} ${g.awayScore} · ${g.home} ${g.homeScore}` : null
    };
  }

  function postgameAudit(g) {
    if (g.homeScore == null || g.awayScore == null) return null;
    const hist = seasonEngine().gameHistory?.[gameKey(g)];
    if (!hist || !Number.isFinite(hist.postHome) || !Number.isFinite(hist.postAway)) return null;

    const preHomeState=canonicalGameTeamState(g,g.home,'pre');
    const preAwayState=canonicalGameTeamState(g,g.away,'pre');
    const postHomeState=canonicalGameTeamState(g,g.home,'post');
    const postAwayState=canonicalGameTeamState(g,g.away,'post');

    // Immediate rematch starts from the complete canonical postgame state, not
    // the old result-only Elo snapshot. Reuse only the frozen pregame market
    // anchor; no future market information is introduced.
    const baselineMode='smart';
    const baselineFc=hist[baselineMode] || hist.smart || hist.independent;
    const nextWeek=Number(g.week)+1;
    const independentRematchP=F?.independentProbability
      ? F.independentProbability(postHomeState.elo,postAwayState.elo,D.config.hfa,D.config.scale)
      : wp(postHomeState.elo,postAwayState.elo);
    const frozenMarketP=baselineFc?.marketAvailable ? baselineFc.market : null;
    const nextMarketWeight=frozenMarketP != null && F?.marketWeightForWeek ? F.marketWeightForWeek(nextWeek) : 0;
    const rematchP=frozenMarketP != null && F?.blendLogits
      ? F.blendLogits(independentRematchP,frozenMarketP,1-nextMarketWeight)
      : independentRematchP;
    const rematchGame={...g,week:nextWeek,homeScore:null,awayScore:null,lineSource:frozenMarketP!=null?'frozen market anchor + next-week FORCE blend':'postgame model forecast'};
    const rematchFc={probability:rematchP,independent:independentRematchP,market:frozenMarketP,marketAvailable:frozenMarketP!=null,modelWeight:1-nextMarketWeight,marketWeight:nextMarketWeight,source:frozenMarketP!=null?'postgame-rematch-market-anchor':'postgame-rematch-model'};
    const independentRematchProj=exactScoreProjection(rematchGame,{probability:independentRematchP},nextWeek);
    const rematchProj=exactScoreProjection(rematchGame,rematchFc,nextWeek);
    return {
      preHome:preHomeState.elo, preAway:preAwayState.elo,
      postHome:postHomeState.elo, postAway:postAwayState.elo,
      preHomeForce:preHomeState.forceScore, preAwayForce:preAwayState.forceScore,
      postHomeForce:postHomeState.forceScore, postAwayForce:postAwayState.forceScore,
      homeDelta:postHomeState.elo-preHomeState.elo, awayDelta:postAwayState.elo-preAwayState.elo,
      homePowerDelta:postHomeState.forceScore-preHomeState.forceScore,
      awayPowerDelta:postAwayState.forceScore-preAwayState.forceScore,
      preHomeState,preAwayState,postHomeState,postAwayState,
      rematchProbability:rematchFc.probability,
      rematchLine:predictedLineLabel(rematchGame,rematchProj),
      rematchScore:`${g.away} ${rematchProj.away} · ${g.home} ${rematchProj.home}`,
      independentRematchProbability:independentRematchP,
      independentRematchLine:predictedLineLabel(rematchGame,independentRematchProj),
      baselineProbability:baselineFc?.probability ?? null,
      baselineMode,
      netRatingShift:(postHomeState.elo-preHomeState.elo)-(postAwayState.elo-preAwayState.elo),
      rematchProj
    };
  }

  function matchupValue(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }

  function duel(label, away, home, awayValue, homeValue, awayNote = '', homeNote = '') {
    const av = matchupValue(awayValue), hv = matchupValue(homeValue);
    const aw=av==null?50:av, hw=hv==null?50:hv;
    const ac=av==null?'':bandClass(av), hc=hv==null?'':bandClass(hv);
    return `<div class="duel ${av==null||hv==null?'duel-missing-data':''}">
      <div class="duel-title">${label}</div>
      <div class="duel-side away-side"><b>${teamToken(away, 'sm')}</b><strong class="${ac}">${av==null?'-':fmt(av, 0)}</strong><small>${awayNote}</small></div>
      <div class="duel-track"><i class="${ac}" style="width:${aw}%"></i><em></em><i class="${hc}" style="width:${hw}%"></i></div>
      <div class="duel-side home-side"><b>${teamToken(home, 'sm')}</b><strong class="${hc}">${hv==null?'-':fmt(hv, 0)}</strong><small>${homeNote}</small></div>
    </div>`;
  }

  function profileStrengths(t, pOverride = null) {
    const p = pOverride || displayProfile(t);
    const metrics = [
      ['Offense', p.offenseComposite], ['QB play', p.qbIndex], ['RB', p.rbIndex], ['Receivers', p.receiverIndex],
      ['Offensive line', p.olIndex], ['Pass rush', p.passRushIndex], ['Run defense', p.runDefenseIndex], ['Coverage', p.coverageIndex], ['Defense', p.defenseIndex]
    ].filter((x) => x[1] != null && x[1] !== '' && Number.isFinite(Number(x[1])));
    const high = [...metrics].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const low = [...metrics].sort((a, b) => a[1] - b[1]).slice(0, 2);
    return { high, low };
  }

  function contextCard(t) {
    const p = profile(t), l = p.luck || {}, pen = p.penalty || {}, ai = adaptiveTeamInfo(t);
    const luckScore=luckContextScore(l), penScore=penaltyContextScore(pen), spreadScore=spreadContextScore(ai), penUnavailable=Boolean(pen.unavailable);
    return `<div class="context-card card team-accent-card" style="${teamAccentStyle(t)}">
      <div class="context-title">${teamMark(t, 'sm')}<b>${team(t).name}</b></div>
      <div class="context-grid">
        <div><span>Luck</span><strong class="${contextScoreClass(luckScore)}">${contextScoreText(luckScore)}</strong><small>${l.exp_w != null ? `50 neutral · ${l.w}-${l.l} actual · ${Math.round(Number(l.exp_w))} expected wins · 60% EPA scoring realization + 20% FLAG + 15% fumble recovery + 5% outcome surprise` : '0–100 · 50 neutral'}</small></div>
        <div class="flag-context"><span>FLAG</span><strong class="${penUnavailable?'':flagScoreClass(penScore)}">${penUnavailable?'-':contextScoreText(penScore)}</strong>${penUnavailable?'':flagGauge(penScore,true)}<small>${penUnavailable?'current penalty data unavailable':pen.live ? `${flagScoreLabel(penScore)} · Flag Leverage & Advantage Gauge · 50 neutral` : 'current-season FLAG data unavailable'}</small></div>
        <div><span>Recent vs spread</span><strong class="${spreadHistoryReady(ai) ? contextScoreClass(spreadScore) : ''}">${spreadHistoryReady(ai) ? contextScoreText(spreadScore) : ''}</strong><small>${spreadHistoryReady(ai) ? `0–100 · 50 neutral · team history, not a matchup mirror · ${confidenceLabel(ai)}` : ai ? `${ai.marketGames ?? 0}/4 market-tracked games · shown after 4` : 'Adaptive data unavailable'}</small></div>
      </div>
    </div>`;
  }


  const RATING_VIEWS = [
    ['power', 'Strength'], ['luck', 'Luck'], ['penalties', 'FLAG'], ['units', 'Units'], ['advanced', 'Advanced']
  ];

  function ratingViewControl(compact = false) {
    return `<div class="diagnostic-viewer ${compact ? 'compact' : ''}" role="tablist" aria-label="Team rating detail view">${RATING_VIEWS.map(([k, label]) => `<button type="button" data-ratingview="${k}" class="${S.ratingView === k ? 'active' : ''}" role="tab" aria-selected="${S.ratingView === k ? 'true' : 'false'}">${label}</button>`).join('')}</div>`;
  }

  window.FORCE_LUCK_DEBUG = function(teamCode) {
    const t=canon(teamCode), p=profile(t), l=p?.luck||{}, pen=p?.penalty||{};
    const result={team:t,actualWins:Number(l.w||0)+0.5*Number(l.t||0),record:`${l.w??0}-${l.l??0}${l.t?`-${l.t}`:''}`,pointsFor:l.pf??null,pointsAgainst:l.pa??null,expectedWins:l.exp_w??null,expectedWinsDisplayed:l.exp_w!=null?Math.round(Number(l.exp_w)):null,expectedLosses:l.exp_l??null,rawWinSurplus:l.luck??null,winSurplusPct:l.luck_pct??null,outcomeResidual:l.outcome_residual??l.luck??null,outcomeVariance:l.outcome_variance??null,outcomeStd:l.outcome_std??null,outcomeSurpriseZ:l.outcome_surprise_z??null,outcomeNeutralZ:l.outcome_neutral_z??null,outcomeSurpriseExcessZ:l.outcome_surprise_excess_z??null,pregameExpectedWins:l.pregame_exp_w??null,pythagoreanExpectedWins:l.pythagorean_exp_w??null,expectedWinsMethod:l.source||null,deservedGames:l.deserved_games||[],fumbleEvents:(l.deserved_games||[]).flatMap(g=>Array.isArray(g?.fumble_events)?g.fumble_events.map(ev=>({...ev,game_id:g.game_id,week:g.week,opponent:g.opponent})):[]),epaLuckScore:epaLuckContextScore(l),actualPointDiff:l.actual_point_diff??null,epaObservedPointDiff:l.epa_observed_point_diff??null,epaExpectedPointDiff:l.epa_expected_point_diff??null,epaScoringResidual:l.epa_scoring_residual??null,epaScoringResidualStd:l.epa_scoring_residual_std??null,epaScoringLuckZ:l.epa_scoring_luck_z??null,epaScoringNeutralZ:l.epa_scoring_neutral_z??null,epaScoringLuckExcessZ:l.epa_scoring_luck_excess_z??null,epaCalibrationGames:l.epa_calibration_games??null,winLuckScore:winLuckContextScore(l),penaltyImpactScore:penaltyContextScore(pen),fumbleOpportunities:l.fumble_opportunities??0,fumbleRecoveries:l.fumble_recoveries??0,fumbleRecoveryRate:l.fumble_recovery_rate??null,fumbleWeightedOpportunities:l.fumble_weighted_opportunities??0,fumbleWeightedRecoveries:l.fumble_weighted_recoveries??0,fumbleExpectedRecoveries:l.fumble_expected_recoveries??0,fumbleRecoveryExcess:l.fumble_recovery_excess??0,ordinaryFumbleOpportunities:l.ordinary_fumble_opportunities??0,botchedSnapFumbleOpportunities:l.botched_snap_fumble_opportunities??0,stabilizedFumbleRecoveryRate:l.stabilized_fumble_recovery_rate??null,fumbleLuckScore:fumbleLuckContextScore(l),rawOverallLuckScore:rawLuckContextScore(l),displayedLuckScore:luckContextScore(l),overallLuckScore:luckContextScore(l),luckDisplayCalibration:LUCK_DISPLAY_V113,epaLuckCalibration:EPA_LUCK_V121,winLuckCalibration:WIN_LUCK_V113,blend:{epaScoringRealization:0.60,penaltyImpact:0.20,fumbleRecovery:0.15,outcomeSurprise:0.05},penalty:l.penalty_impact_score??pen.penaltyImpactScore??null};
    console.log('[FORCE-LUCK-DEBUG]',result); return result;
  };

  function flagIntroPanel() {
    return `<section class="flag-intro card"><div class="flag-intro-lockup"><span class="flag-word">FLAG</span><div><strong>Flag Leverage &amp; Advantage Gauge</strong><small>What did the penalties actually called do to each team's game value?</small></div></div><div class="flag-intro-scale"><span>MORE HARM</span><div class="flag-scale"><i style="left:50%"></i><em></em></div><span>MORE BENEFIT</span></div><p>FLAG runs from 0 to 100, with 50 neutral. It looks mostly at how much called penalties changed expected points and win chances, then also accounts for first downs and touchdowns created or erased. It measures impact, not whether a call was right or wrong and not why an official made it.</p></section>`;
  }

  function penaltyImpactSortControl() {
    if (S.ratingView !== 'penalties') return '';
    const desc = S.rankSort.key === 'penEPA' && S.rankSort.dir !== 'asc';
    const asc = S.rankSort.key === 'penEPA' && S.rankSort.dir === 'asc';
    return `<div class="penalty-sort-toolbar" aria-label="FLAG sort order">
      <span><b>FLAG order</b><small>50 is neutral. Higher scores mean the penalties actually called helped that team more overall.</small></span>
      <div class="penalty-sort-toggle">
        <button type="button" data-penaltysort="desc" class="${desc ? 'active' : ''}" aria-pressed="${desc ? 'true' : 'false'}">Most benefit first</button>
        <button type="button" data-penaltysort="asc" class="${asc ? 'active' : ''}" aria-pressed="${asc ? 'true' : 'false'}">Least benefit first</button>
      </div>
    </div>`;
  }

  function signed(n, d = 1, suffix = '') {
    if (!Number.isFinite(Number(n))) return '-';
    const v = Number(n);
    return `${v > 0 ? '+' : ''}${fmt(v, d)}${suffix}`;
  }


  // V62 unified contextual FORCE-style scores. These are display diagnostics,
  // not predictive inputs. 50 is neutral; >50 favorable; <50 unfavorable.
  function contextScore(raw, scale, softness = 2) {
    const x=Number(raw), s=Math.abs(Number(scale));
    if (!Number.isFinite(x) || !(s>0)) return null;
    return Math.max(0,Math.min(100,50+50*Math.tanh((x/s)/Math.max(.25,Number(softness)||2))));
  }
  const WIN_LUCK_V113 = Object.freeze({neutralZ:0.5,softnessZ:1.25,amplitude:45});
  const EPA_LUCK_V121 = Object.freeze({neutralZ:0.20,softnessZ:1.10,amplitude:45});
  function winLuckContextScore(luck) {
    const z=Number(luck?.outcome_surprise_z);
    if (Number.isFinite(z)) {
      const excess=Number.isFinite(Number(luck?.outcome_surprise_excess_z))
        ? Number(luck.outcome_surprise_excess_z)
        : Math.sign(z)*Math.max(0,Math.abs(z)-WIN_LUCK_V113.neutralZ);
      return Math.max(0,Math.min(100,50+WIN_LUCK_V113.amplitude*Math.tanh(excess/WIN_LUCK_V113.softnessZ)));
    }
    const pct=Number(luck?.luck_pct);
    if (!Number.isFinite(pct)) return null;
    const raw=contextScore(pct,11.545);
    const g=Math.max(0,Number(luck?.g)||0);
    const w=g/(g+3);
    return raw==null?null:50+(raw-50)*w;
  }
  function epaLuckContextScore(luck) {
    const direct=Number(luck?.epa_scoring_luck_score);
    if (Number.isFinite(direct)) return Math.max(0,Math.min(100,direct));
    const z=Number(luck?.epa_scoring_luck_z);
    if (!Number.isFinite(z)) return 50;
    const excess=Math.sign(z)*Math.max(0,Math.abs(z)-EPA_LUCK_V121.neutralZ);
    return Math.max(0,Math.min(100,50+EPA_LUCK_V121.amplitude*Math.tanh(excess/EPA_LUCK_V121.softnessZ)));
  }
  function fumbleLuckContextScore(luck) {
    const direct=Number(luck?.fumble_luck_score);
    return Number.isFinite(direct)?Math.max(0,Math.min(100,direct)):50;
  }
  const LUCK_DISPLAY_V113 = Object.freeze({softness:22});
  function rawLuckContextScore(luck) {
    const epaScore=epaLuckContextScore(luck);
    const winScore=winLuckContextScore(luck);
    const penalty=Number(luck?.penalty_impact_score);
    const penaltyScore=Number.isFinite(penalty)?Math.max(0,Math.min(100,penalty)):50;
    const fumbleScore=fumbleLuckContextScore(luck);
    return Math.max(0,Math.min(100,0.60*epaScore+0.20*penaltyScore+0.15*fumbleScore+0.05*(winScore==null?50:winScore)));
  }
  function calibrateLuckDisplay(raw) {
    if (raw==null || raw==='') return null;
    const x=Number(raw); if(!Number.isFinite(x)) return null;
    const softness=LUCK_DISPLAY_V113.softness;
    const endpoint=Math.tanh(50/softness);
    return Math.max(0,Math.min(100,50+50*Math.tanh((x-50)/softness)/endpoint));
  }
  function luckContextScore(luck) {
    return calibrateLuckDisplay(rawLuckContextScore(luck));
  }
  function penaltyContextScore(pen) {
    const direct=Number(pen?.penaltyImpactScore ?? pen?.penaltyIndex);
    return Number.isFinite(direct) ? Math.max(0,Math.min(100,direct)) : null;
  }

  function spreadContextScore(ai) {
    if (!spreadHistoryReady(ai)) return null;
    return contextScore(Number(ai.residual),4.0);
  }
  function contextScoreText(v) {
    if (v == null || v === '') return '-';
    const x=Number(v);
    return Number.isFinite(x) ? fmt(x,0) : '-';
  }
  function penaltyScoreText(v) {
    if (v == null || v === '') return '-';
    const x=Number(v);
    return Number.isFinite(x) ? fmt(x,1) : '-';
  }
  // V64: contextual 0–100 scores use the exact same semantic bands as FORCE:
  // [0,41) red, [41,71) yellow, [71,100] green.
  function contextScoreClass(v) {
    if (v == null || v === '') return '';
    const x=Number(v);
    return Number.isFinite(x) ? bandClass(x) : '';
  }

  function spreadHistoryReady(ai, minGames = 4) {
    return !!ai && Number(ai.marketGames ?? 0) >= Number(minGames);
  }

  function spreadHistoryDisplay(ai, decimals = 1, suffix = ' pts') {
    return spreadHistoryReady(ai) ? signed(ai.residual, decimals, suffix) : '-';
  }

  function diagnosticNotice(view = S.ratingView) {
    const notes = {
      power: 'FORCE Score runs from 0 to 100, with 50 representing an average NFL team. Scores near either end are intentionally hard to reach. The other views explain what is helping or hurting each team.',
      luck: 'Luck is a 0 to 100 score with 50 meaning roughly neutral. Most of it asks a simple question: has the scoreboard rewarded a team about as much as its play-by-play efficiency says it should have? That accounts for 60% of the score. FLAG contributes 20%, fumble recoveries 15%, and unusually fortunate or unfortunate wins and losses 5%. A great team can still look unlucky if it is playing even better than its scoring margin suggests.',
      penalties: "FLAG, the Flag Leverage & Advantage Gauge, shows how much the penalties actually called have helped or hurt a team this season. A 50 is neutral. Higher scores mean more net benefit; lower scores mean more net harm. The score mostly follows how much those calls changed expected points and win chances, while also accounting for first downs and touchdowns created or erased by penalties. FLAG does not decide whether a call was correct and does not try to infer intent. A game gets a FLAG Swing label only when the winner's measured penalty advantage was at least as large as the final scoring margin, meaning penalties were large enough to be one plausible part of why the result went that way.",
      units: 'Unit scores are relative strength ratings, so higher is better. Overall defense leans most heavily on coverage and run defense, with pass rush and points allowed per drive filling out the picture. Pass rush uses the freshest reliable pressure source available; if detailed pressure data are missing, FORCE can use current QB hits and sacks instead of pretending the missing pressure count is zero. The RB score is driven mostly by rushing efficiency, with receiving work making up the rest.',
      advanced: 'This view shows the underlying team rating and how FORCE has compared with the betting market. The market-comparison score stays hidden until a team has at least four games with usable closing lines.'
    };
    return `<div class="diagnostic-note">${notes[view] || notes.power}</div>`;
  }

  function teamDiagnosticPanel(t, r, b, p) {
    const pr = displayProfile(t), luck = pr.luck || {}, pen = pr.penalty || {}, ai = adaptiveTeamInfo(t), scoring = pr.scoring || {};
    if (S.ratingView === 'luck') return `<div class="grid three diagnostic-grid">
      <div class="card kpi"><div class="label">ACTUAL ${luck.source?.includes('2026') ? '2026' : '2025 PRIOR'} RECORD</div><div class="value">${luck.w ?? b.w ?? '-'}–${luck.l ?? b.l ?? '-'}${luck.t ? '-' + luck.t : ''}</div><div class="sub">${luck.g ?? '-'} games in diagnostic sample.</div></div>
      <div class="card kpi"><div class="label">EXPECTED WINS</div><div class="value">${luck.exp_w != null ? Math.round(Number(luck.exp_w)) : '-'}</div><div class="sub">About how many wins the team's underlying performance would normally produce.</div></div>
      <div class="card kpi"><div class="label">LUCK SCORE</div><div class="value ${contextScoreClass(luckContextScore(luck))}">${contextScoreText(luckContextScore(luck))}</div><div class="sub">50 is neutral. Most of the score compares actual scoring margin with what the team's play-by-play efficiency normally deserves, with smaller adjustments for FLAG, fumble recoveries, and unusually fortunate or unfortunate results.</div></div>
    ` + `</div>`;
    if (S.ratingView === 'penalties') return `<div class="grid three diagnostic-grid">
      <div class="card kpi flag-hero-card"><div class="flag-brandline"><span class="flag-word">FLAG</span><span>Flag Leverage &amp; Advantage Gauge</span></div><div class="value ${flagScoreClass(penaltyContextScore(pen))}">${pen.unavailable?'-':penaltyScoreText(penaltyContextScore(pen))}</div>${pen.unavailable?'':flagGauge(penaltyContextScore(pen))}<div class="sub">${pen.unavailable?'Current FLAG data unavailable.':`${flagScoreLabel(penaltyContextScore(pen))} · higher = more benefit from penalties actually called · 50 neutral`}</div></div>
      <div class="card kpi"><div class="label">PENALTY EFFECT ON GAME VALUE</div><div class="value ${Number(pen.net_penalty_epa_per_game ?? pen.net_pen_epa) >= 0 ? 'positive' : 'negative'}">${pen.live ? `${signed(pen.net_penalty_epa_per_game,2)} expected points/game | ${signed(Number(pen.net_penalty_wpa_per_game)*100,1,' win-chance points/game')}` : '-'}</div><div class="sub">How much the called penalties changed expected scoring and win probability for this team, on average per game.</div></div>
      <div class="card kpi"><div class="label">FIRST DOWNS VIA PENALTY</div><div class="value" style="font-size:25px">${pen.live ? `${pen.first_downs_via_penalty_for ?? '-'} / ${pen.first_downs_via_penalty_against ?? '-'}` : '-'}</div><div class="sub">First number is gained, second is allowed. Net: ${pen.live ? signed(pen.net_first_downs_via_penalty,0) : '-'}.</div></div>
      <div class="card kpi"><div class="label">TOUCHDOWNS ERASED BY PENALTY</div><div class="value" style="font-size:25px">${pen.live ? `${pen.tds_negated_benefit ?? '-'} / ${pen.tds_negated_harm ?? '-'}` : '-'}</div><div class="sub">First number is opponent touchdowns erased, second is this team's touchdowns erased. Net: ${pen.live ? signed(pen.net_tds_negated,0) : '-'}.</div></div>
      <div class="card kpi"><div class="label">TURNOVERS ERASED BY PENALTY</div><div class="value" style="font-size:25px">${pen.live ? `${pen.turnovers_negated_benefit ?? '-'} / ${pen.turnovers_negated_harm ?? '-'}` : '-'}</div><div class="sub">First number helped this team, second hurt it. Net: ${pen.live ? signed(pen.net_turnovers_negated,0) : '-'}.</div></div>
      <div class="card kpi"><div class="label">3RD/4TH-DOWN DRIVE SAVES</div><div class="value" style="font-size:25px">${pen.live ? `${pen.drive_saves_benefit ?? '-'} / ${pen.drive_saves_harm ?? '-'}` : '-'}</div><div class="sub">Accepted penalties that kept a drive alive on third or fourth down. Net: ${pen.live ? signed(pen.net_drive_saves,0) : '-'}.</div></div>
      <div class="card kpi"><div class="label">2026 SAMPLE</div><div class="value">${pen.penalty_context_games ?? '-'}</div><div class="sub">Completed 2026 games represented in FLAG.</div></div>
      <div class="card kpi"><div class="label">TRACKED YARDS FOR / AGAINST</div><div class="value" style="font-size:25px">${pen.pen_yards_for ?? '-'} / ${pen.pen_yards_against ?? '-'}</div><div class="sub">Penalty yards gained from opponents first, penalty yards assessed against this team second.</div></div>
      <div class="card kpi"><div class="label">DATA STATUS</div><div class="value" style="font-size:20px">${pen.live && !pen.unavailable ? 'LIVE 2026' : 'UNAVAILABLE'}</div><div class="sub">${pen.source || 'Current-season penalty context unavailable.'}</div></div>
    </div>`;
    if (S.ratingView === 'units') return `<div class="unit-board card">
      ${unitBoardRow(pr, 'Overall offense', 'offenseComposite')}
      ${unitBoardRow(pr, 'QB play', 'qbIndex')}
      ${unitBoardRow(pr, 'Offensive line', 'olIndex')}
      ${unitBoardRow(pr, 'RB', 'rbIndex')}
      ${unitBoardRow(pr, 'Receivers', 'receiverIndex')}
      ${unitBoardRow(pr, 'Overall defense', 'defenseIndex')}
      ${unitBoardRow(pr, 'Pass rush', 'passRushIndex')}
      ${unitBoardRow(pr, 'Run defense', 'runDefenseIndex')}
      ${unitBoardRow(pr, 'Coverage', 'coverageIndex')}
      ${unitBoardRow(pr, 'Pts/drive prevention', 'pointsAllowedPerDriveIndex')}
    </div>`;
    if (S.ratingView === 'advanced') return `<div class="grid three diagnostic-grid">
      <div class="card kpi"><div class="label">RAW ELO</div><div class="value">${fmt(r)}</div><div class="sub">Base snapshot ${fmt(b.elo)} · bridge ${signed(r - b.elo, 1)}</div></div>
      <div class="card kpi"><div class="label">OFFENSIVE EFFICIENCY PER PLAY</div><div class="value ${Number(pr.off_epa) >= 0 ? 'positive' : 'negative'}">${pr.off_epa != null ? signed(pr.off_epa, 3) : '-'}</div><div class="sub">${pr._live?.games ? `${liveProfileStatus(t)} | current-season efficiency with early games gently steadied by the preseason baseline` : 'Preseason offensive efficiency baseline' }.</div></div>
      <div class="card kpi"><div class="label">SCORING PROFILE</div><div class="value" style="font-size:25px">${scoring.ppg_for != null ? `${fmt(scoring.ppg_for)} / ${fmt(scoring.ppg_against)}` : '-'}</div><div class="sub">Points scored / allowed per game.</div></div>
      <div class="card kpi"><div class="label">RECENT VS SPREAD</div><div class="value ${spreadHistoryReady(ai) ? contextScoreClass(spreadContextScore(ai)) : ''}">${spreadHistoryReady(ai) ? contextScoreText(spreadContextScore(ai)) : ''}</div><div class="sub">${spreadHistoryReady(ai) ? `0–100 · 50 neutral · raw decayed/shrunk residual ${signed(ai.residual,2,' pts')}. Team history, not a matchup mirror.` : ai ? `${ai.marketGames ?? 0}/4 market-tracked games. Value appears after four games.` : 'Adaptive data unavailable.'}</div></div>
      <div class="card kpi"><div class="label">HOW MUCH THE FORECAST USES VEGAS</div><div class="value">${ai ? Math.round(ai.marketWeight * 100) + '%' : '-'}</div><div class="sub">The share of this experimental forecast coming from the betting market rather than FORCE alone.</div></div>
      <div class="card kpi"><div class="label">MARKET EFFECT ON TEAM RATING</div><div class="value ${ai && ai.eloEquivalent >= 0 ? 'positive' : 'negative'}">${ai ? signed(ai.eloEquivalent, 1, ' Elo') : '-'}</div><div class="sub">The same market adjustment translated into familiar Elo-rating points.</div></div>
    </div>`;
    return `<div class="grid three diagnostic-grid">
      <div class="card kpi"><div class="label">FORCE SCORE</div><div class="value">${fmt(score(r))}</div>${ratingBar(r, 'meter')}</div>
      <div class="card kpi"><div class="label">EXPECTED FINAL WINS</div><div class="value">${fmt(p.ew)}</div><div class="sub">Actual wins + remaining win chances${p.marketGames ? ` · ${p.marketGames} currently market-informed` : ''}</div></div>
      <div class="card kpi"><div class="label">REMAINING GAMES</div><div class="value">${p.remaining}</div><div class="sub"><button class="ghost" data-labteam="${t}">Open Roster Lab →</button></div></div>
    </div>`;
  }

  function sortHeader(label, key) {
    const active = S.rankSort.key === key;
    const arrow = active ? (S.rankSort.dir === 'desc' ? ' ↓' : ' ↑') : '';
    return `<th><button type="button" class="sort-head ${active ? 'active' : ''}" data-ranksort="${key}">${label}${arrow}</button></th>`;
  }


  function sortKeysForView(view = S.ratingView) {
    const base = ['force'];
    if (view === 'luck') return base.concat(['actualWins','expectedWins','luck']);
    if (view === 'penalties') return base.concat(['penEPA','penWP','decisive']);
    if (view === 'units') return base.concat(['off','def','qb','ol','rb','passRush','runDef','cov','rec']);
    if (view === 'advanced') return base.concat(['elo','sinceBase','offEpa','vsVegas','vegasWeight']);
    return base.concat(['elo','sinceBase']);
  }

  function rankLabel(key = S.rankSort.key) {
    return ({
      force:'FORCE', actualWins:'Actual record', expectedWins:'Expected record', luck:'Luck score',
      penEPA:'FLAG', penWP:'Penalty context', decisive:'Live games',
      off:'Offense', def:'Defense', qb:'QB', ol:'OL', passRush:'Pass rush', runDef:'Run defense', cov:'Coverage', rb:'RB', rec:'Receivers',
      elo:'Elo', sinceBase:'Since base', offEpa:'Off EPA', vsVegas:'Recent vs spread', vegasWeight:'Vegas weight'
    })[key] || 'Metric';
  }

  function rankingHeader(view = S.ratingView) {
    if (view === 'units') return `<tr><th class="metric-rank-head">${rankLabel()} rank</th><th>Team</th>${sortHeader('FORCE','force')}${sortHeader('Offense','off')}${sortHeader('Defense','def')}${sortHeader('QB','qb')}${sortHeader('O-Line','ol')}${sortHeader('Pass Rush','passRush')}${sortHeader('Run Defense','runDef')}${sortHeader('Coverage','cov')}${sortHeader('RB','rb')}${sortHeader('Receiver','rec')}</tr>`;
    const lead = `<tr><th class="metric-rank-head">${rankLabel()} rank</th><th>Team</th>${sortHeader('FORCE','force')}`;
    const action = '<th>QB return</th></tr>';
    if (view === 'luck') return `<tr><th class="metric-rank-head">${rankLabel()} rank</th><th>Team</th>${sortHeader('FORCE','force')}${sortHeader('Actual record','actualWins')}${sortHeader('Expected record','expectedWins')}${sortHeader('Luck score','luck')}</tr>`;
    if (view === 'penalties') return lead + `${sortHeader('FLAG','penEPA')}<th>Causal EPA / WPA</th><th>Net penalty 1st downs</th><th>Net erased TDs</th><th>Events for/against</th>${sortHeader('Live games','decisive')}` + action;
    if (view === 'advanced') return lead + `${sortHeader('Elo','elo')}${sortHeader('Since base','sinceBase')}${sortHeader('Off EPA','offEpa')}<th>PF/PA</th>${sortHeader('Recent vs spread','vsVegas')}${sortHeader('Vegas wt.','vegasWeight')}` + action;
    return lead + `${sortHeader('Elo','elo')}${sortHeader('Since base','sinceBase')}<th>2025 record*</th>` + action;
  }

  function rankingRow(r, displayRank, forceRank) {
    const pr = displayProfile(r.team), l = pr.luck || {}, pen = pr.penalty || {}, sc = pr.scoring || {}, ai = adaptiveTeamInfo(r.team);
    const subRank = S.rankSort.key !== 'force' ? `<small class="table-subrank">FORCE #${forceRank}</small>` : `<small>${r.division}</small>`;
    const lead = `<td>${displayRank}</td><td><button class="team-link" data-team="${r.team}">${teamIdentity(r.team, { size: 'xs', sub: subRank })}</button></td><td class="rating-cell"><b class="score">${fmt(score(r.liveElo))}</b>${ratingBar(r.liveElo)}</td>`;
    const action = `<td class="qb-action-cell">${quickQbButton(r.team)}</td>`;
    if (S.ratingView === 'luck') {
      const ls=luckContextScore(l);
      const actualW=Number(l.w ?? r.w ?? 0), actualL=Number(l.l ?? r.l ?? 0), actualT=Number(l.t ?? r.t ?? 0);
      const actualRecord=`${actualW}-${actualL}${actualT?`-${actualT}`:''}`;
      const completedGames=Math.max(0,actualW+actualL+actualT);
      const expectedW=l.exp_w!=null?Math.max(0,Math.min(completedGames,Math.round(Number(l.exp_w)))):null;
      const expectedRecord=expectedW!=null?`${expectedW}-${Math.max(0,completedGames-expectedW)}`:'-';
      const luckLead=`<td>${displayRank}</td><td><button class="team-link" data-team="${r.team}">${teamIdentity(r.team,{size:'xs'})}</button></td><td class="rating-cell"><b class="score">${fmt(score(r.liveElo))}</b>${ratingBar(r.liveElo)}</td>`;
      return `<tr data-filter="${r.name.toLowerCase()} ${r.team.toLowerCase()}">${luckLead}<td>${actualRecord}</td><td>${expectedRecord}</td><td class="${contextScoreClass(ls)}">${contextScoreText(ls)}</td></tr>`;
    }
    if (S.ratingView === 'penalties') { const ps=penaltyContextScore(pen); return `<tr data-filter="${r.name.toLowerCase()} ${r.team.toLowerCase()}">${lead}<td class="flag-table-cell">${pen.unavailable?'-':`<b class="${flagScoreClass(ps)}">${penaltyScoreText(ps)}</b>${flagGauge(ps,true)}<small>${flagScoreLabel(ps)}</small>`}</td><td>${pen.live && !pen.unavailable ? `${signed(pen.net_penalty_epa_per_game,2,' EPA/g')} · ${signed(Number(pen.net_penalty_wpa_per_game)*100,1,' WPA pp/g')}` : '-'}</td><td>${pen.live ? signed(pen.net_first_downs_via_penalty,0) : '-'}</td><td>${pen.live ? signed(pen.net_tds_negated,0) : '-'}</td><td>${pen.pen_count_for ?? '-'} / ${pen.pen_count_against ?? '-'}</td><td>${pen.penalty_context_games ?? '-'}</td>${action}</tr>`; }
    if (S.ratingView === 'units') {
      const unitLead = `<td>${displayRank}</td><td><button class="team-link" data-team="${r.team}">${teamIdentity(r.team, { size: 'xs' })}</button></td><td class="rating-cell"><b class="score ${bandClass(score(r.liveElo))}">${fmt(score(r.liveElo))}</b></td>`;
      return `<tr data-filter="${r.name.toLowerCase()} ${r.team.toLowerCase()}">${unitLead}${rawUnitCell(pr,'offenseComposite')}${rawUnitCell(pr,'defenseIndex')}${rawUnitCell(pr,'qbIndex')}${rawUnitCell(pr,'olIndex')}${rawUnitCell(pr,'passRushIndex')}${rawUnitCell(pr,'runDefenseIndex')}${rawUnitCell(pr,'coverageIndex')}${rawUnitCell(pr,'rbIndex')}${rawUnitCell(pr,'receiverIndex')}</tr>`;
    }
    if (S.ratingView === 'advanced') return `<tr data-filter="${r.name.toLowerCase()} ${r.team.toLowerCase()}">${lead}<td class="raw">${fmt(r.liveElo)}</td><td class="${r.liveElo >= r.elo ? 'positive' : 'negative'}">${signed(r.liveElo-r.elo,1)}</td><td>${pr.off_epa != null ? signed(pr.off_epa,3) : '-'}</td><td>${sc.ppg_for != null ? `${fmt(sc.ppg_for)}/${fmt(sc.ppg_against)}` : '-'}</td><td class="${spreadHistoryReady(ai) ? contextScoreClass(spreadContextScore(ai)) : ''}">${spreadHistoryReady(ai) ? contextScoreText(spreadContextScore(ai)) : ''}</td><td>${ai ? Math.round(ai.marketWeight*100)+'%' : '-'}</td>${action}</tr>`;
    return `<tr data-filter="${r.name.toLowerCase()} ${r.team.toLowerCase()}">${lead}<td class="raw">${fmt(r.liveElo)}</td><td class="${r.liveElo >= r.elo ? 'positive' : 'negative'}">${signed(r.liveElo-r.elo,1)}</td><td>${r.w ?? '-'}-${r.l ?? '-'}${r.t ? '-' + r.t : ''}</td>${action}</tr>`;
  }

  function sourceLabel(fc) {
    if (fc.adaptive && !fc.marketAvailable) return '<span class="forecast-badge adaptive">FORCE ADAPTIVE</span>';
    if (!fc.marketAvailable) return '<span class="forecast-badge model">FORCEcast</span>';
    if (fc.adaptive) return '<span class="forecast-badge adaptive">FORCE ADAPTIVE</span>';
    if (fc.source === 'moneyline') return '<span class="forecast-badge market">FORCEcast</span>';
    return '<span class="forecast-badge market">FORCEcast</span>';
  }

  function adaptiveTeamInfo(t) {
    if (!A) return null;
    const raw = seasonEngine().adaptiveStates[t] || A.emptyTeamState();
    const snap = A.teamSnapshot(raw, A.DEFAULTS);
    return { ...snap, eloEquivalent: A.teamEloEquivalent(snap, D.config.scale, A.DEFAULTS) };
  }

  function confidenceLabel(info) {
    if (!info || info.marketGames < 2) return 'very low sample';
    if (info.marketGames < 5) return 'low sample';
    if (info.marketGames < 9) return 'building';
    return 'established sample';
  }

  function projected(t, ratings, delta = 0) {
    const rec = records()[t] || { w: 0, l: 0, t: 0 };
    let ew = rec.w + 0.5 * rec.t, remaining = 0, marketGames = 0;
    S.schedule.filter((g) => g.home === t || g.away === t).forEach((g) => {
      if (g.homeScore != null) return;
      remaining++;
      const fc = forecastFor(g, ratings);
      if (fc.marketAvailable) marketGames++;
      const adjustedHomeP = delta
        ? F.applyEloDelta(fc.probability, delta, g.home === t, D.config.scale)
        : fc.probability;
      ew += g.home === t ? adjustedHomeP : 1 - adjustedHomeP;
    });
    return { ...rec, ew, remaining, losses: 17 - ew, marketGames };
  }


  const PROJECTION_RUNS = 5000;
  function projectionSeed() {
    let h = 2166136261 >>> 0;
    const text = `${S.scheduleVersion}|${S.schedule.length}|${Object.keys(D.teams).length}`;
    for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619) >>> 0; }
    return h || 1;
  }
  function projectionRng(seed) {
    let x = seed >>> 0;
    return () => { x = (Math.imul(1664525,x) + 1013904223) >>> 0; return x / 4294967296; };
  }
  function conferenceOf(t) { return String(team(t).division || '').split(' ')[0] || ''; }
  function recordPct(r) {
    const g=(r?.w||0)+(r?.l||0)+(r?.t||0);
    return g ? ((r?.w||0)+0.5*(r?.t||0))/g : 0;
  }
  function cloneRecords(rec, teams) {
    return Object.fromEntries(teams.map(t=>[t,{w:rec[t]?.w||0,l:rec[t]?.l||0,t:rec[t]?.t||0}]));
  }
  function completedProjectionOutcomes() {
    return sortedSchedule().filter(g=>g.homeScore!=null && D.teams[g.home] && D.teams[g.away]).map(g=>{
      const hs=Number(g.homeScore), as=Number(g.awayScore);
      return {home:g.home,away:g.away,winner:hs>as?g.home:as>hs?g.away:null,tie:hs===as};
    });
  }
  function addProjectedOutcome(records, outcomes, home, away, winner) {
    if (!records[home] || !records[away]) return;
    if (winner===home) { records[home].w++; records[away].l++; }
    else if (winner===away) { records[away].w++; records[home].l++; }
    else { records[home].t++; records[away].t++; }
    outcomes.push({home,away,winner:winner||null,tie:!winner});
  }
  function selectRepresentativeProjection(snapshots, teams, expectedWinsByTeam, fallbackRecords) {
    let representative=snapshots[0]||{records:cloneRecords(fallbackRecords||{},teams),divisionFinish:{},seedByTeam:{},divisionWinner:[]};
    let bestDistance=Infinity, bestMaxDeviation=Infinity;
    for(const snap of snapshots){
      let distance=0, maxDeviation=0;
      for(const t of teams){
        const r=snap.records[t]||{w:0,t:0};
        const wins=(r.w||0)+0.5*(r.t||0);
        const dev=Math.abs(wins-(expectedWinsByTeam[t]||0));
        distance += dev*dev;
        if(dev>maxDeviation) maxDeviation=dev;
      }
      if(distance<bestDistance-1e-12 || (Math.abs(distance-bestDistance)<1e-12 && maxDeviation<bestMaxDeviation-1e-12)){
        representative=snap; bestDistance=distance; bestMaxDeviation=maxDeviation;
      }
    }
    return {representative,bestDistance,bestMaxDeviation};
  }
  function opponentInOutcome(t,g) { return g.home===t?g.away:g.away===t?g.home:null; }
  function resultValue(t,g) {
    if (g.home!==t && g.away!==t) return null;
    if (g.tie || !g.winner) return 0.5;
    return g.winner===t ? 1 : 0;
  }
  function recordAgainst(t, outcomes, predicate) {
    let w=0,l=0,tt=0,games=0;
    for (const g of outcomes) {
      const opp=opponentInOutcome(t,g); if (!opp || !predicate(opp,g)) continue;
      games++;
      const v=resultValue(t,g); if(v===1) w++; else if(v===0.5) tt++; else l++;
    }
    return {w,l,t:tt,games,pct:games?(w+0.5*tt)/games:null};
  }
  function headToHeadPct(t, opp, outcomes) {
    return recordAgainst(t,outcomes,(o)=>o===opp);
  }
  function divisionRecord(t,outcomes) {
    const div=team(t).division;
    return recordAgainst(t,outcomes,(opp)=>team(opp).division===div);
  }
  function conferenceRecord(t,outcomes) {
    const conf=conferenceOf(t);
    return recordAgainst(t,outcomes,(opp)=>conferenceOf(opp)===conf);
  }
  function commonGamesRecord(a,b,outcomes,minGames=0) {
    const aOpp=new Set(), bOpp=new Set();
    for(const g of outcomes){ const ao=opponentInOutcome(a,g); if(ao) aOpp.add(ao); const bo=opponentInOutcome(b,g); if(bo) bOpp.add(bo); }
    const common=new Set([...aOpp].filter(x=>bOpp.has(x) && x!==a && x!==b));
    const ar=recordAgainst(a,outcomes,(opp)=>common.has(opp));
    const br=recordAgainst(b,outcomes,(opp)=>common.has(opp));
    if(ar.games<minGames || br.games<minGames) return null;
    return {a:ar,b:br};
  }
  function strengthOfVictory(t,records,outcomes) {
    let points=0,games=0;
    for(const g of outcomes){
      const opp=opponentInOutcome(t,g); if(!opp || resultValue(t,g)!==1) continue;
      const r=records[opp]; if(!r) continue; points += (r.w||0)+0.5*(r.t||0); games += (r.w||0)+(r.l||0)+(r.t||0);
    }
    return games?points/games:0;
  }
  function strengthOfSchedule(t,records,outcomes) {
    let points=0,games=0;
    for(const g of outcomes){
      const opp=opponentInOutcome(t,g); if(!opp) continue;
      const r=records[opp]; if(!r) continue; points += (r.w||0)+0.5*(r.t||0); games += (r.w||0)+(r.l||0)+(r.t||0);
    }
    return games?points/games:0;
  }
  function cmpMetric(a,b) {
    if(a==null || b==null || Math.abs(a-b)<1e-12) return 0;
    return b-a;
  }
  function metricLeaders(group, valueFn) {
    const values=group.map(t=>[t,valueFn(t)]).filter(([,v])=>v!=null && Number.isFinite(Number(v)));
    if(values.length!==group.length || !values.length) return group.slice();
    const best=Math.max(...values.map(([,v])=>Number(v)));
    return values.filter(([,v])=>Math.abs(Number(v)-best)<1e-12).map(([t])=>t);
  }
  function tiedMemberRecord(t, group, outcomes) {
    const set=new Set(group);
    return recordAgainst(t,outcomes,(opp)=>set.has(opp));
  }
  function commonGroupRecords(group,outcomes,minGames=0) {
    if(group.length<2) return null;
    let common=null;
    const tied=new Set(group);
    for(const t of group){
      const opps=new Set();
      for(const g of outcomes){ const opp=opponentInOutcome(t,g); if(opp && !tied.has(opp)) opps.add(opp); }
      common = common==null ? opps : new Set([...common].filter(x=>opps.has(x)));
    }
    common=common||new Set();
    const rec={};
    for(const t of group){
      rec[t]=recordAgainst(t,outcomes,(opp)=>common.has(opp));
      if(rec[t].games<minGames) return null;
    }
    return rec;
  }
  function fallbackTieWinner(group,ctx) {
    const leaders=metricLeaders(group,t=>ctx.force[t]);
    return leaders.slice().sort((a,b)=>a.localeCompare(b))[0];
  }
  function twoTeamDivisionWinner(a,b,ctx) {
    const {records,outcomes}=ctx;
    let leaders;
    const hA=headToHeadPct(a,b,outcomes), hB=headToHeadPct(b,a,outcomes);
    if(hA.games && hB.games){ leaders=metricLeaders([a,b],t=>t===a?hA.pct:hB.pct); if(leaders.length===1) return leaders[0]; }
    leaders=metricLeaders([a,b],t=>divisionRecord(t,outcomes).pct); if(leaders.length===1) return leaders[0];
    const common=commonGamesRecord(a,b,outcomes,0); if(common){ leaders=metricLeaders([a,b],t=>t===a?common.a.pct:common.b.pct); if(leaders.length===1) return leaders[0]; }
    leaders=metricLeaders([a,b],t=>conferenceRecord(t,outcomes).pct); if(leaders.length===1) return leaders[0];
    leaders=metricLeaders([a,b],t=>strengthOfVictory(t,records,outcomes)); if(leaders.length===1) return leaders[0];
    leaders=metricLeaders([a,b],t=>strengthOfSchedule(t,records,outcomes)); if(leaders.length===1) return leaders[0];
    // Official criteria continue with points/TD rankings. Future Monte Carlo runs
    // do not simulate exact margins, so FORCE is used only as the terminal fallback.
    return fallbackTieWinner([a,b],ctx);
  }
  function resolveDivisionTie(group,ctx) {
    let tied=[...group];
    if(tied.length<=1) return tied[0]||null;
    if(tied.length===2) return twoTeamDivisionWinner(tied[0],tied[1],ctx);
    const {records,outcomes}=ctx;
    const criteria=[
      ()=>metricLeaders(tied,t=>tiedMemberRecord(t,tied,outcomes).pct),
      ()=>metricLeaders(tied,t=>divisionRecord(t,outcomes).pct),
      ()=>{ const c=commonGroupRecords(tied,outcomes,0); return c?metricLeaders(tied,t=>c[t].pct):tied.slice(); },
      ()=>metricLeaders(tied,t=>conferenceRecord(t,outcomes).pct),
      ()=>metricLeaders(tied,t=>strengthOfVictory(t,records,outcomes)),
      ()=>metricLeaders(tied,t=>strengthOfSchedule(t,records,outcomes))
    ];
    for(const criterion of criteria){
      const leaders=criterion();
      if(leaders.length===1) return leaders[0];
      if(leaders.length<tied.length) return resolveDivisionTie(leaders,ctx); // restart when clubs are eliminated
    }
    return fallbackTieWinner(tied,ctx);
  }
  function headToHeadSweepWinner(group,outcomes) {
    // NFL multi-club wildcard criterion applies only when one club has defeated
    // every other tied club, or one club has lost to every other tied club.
    for(const t of group){
      let playedAll=true, sweptAll=true;
      for(const opp of group){
        if(opp===t) continue;
        const r=headToHeadPct(t,opp,outcomes);
        if(!r.games){ playedAll=false; sweptAll=false; break; }
        if(r.pct!==1) sweptAll=false;
      }
      if(playedAll && sweptAll) return {winner:t,remaining:group.slice()};
    }
    const losers=[];
    for(const t of group){
      let playedAll=true, lostAll=true;
      for(const opp of group){
        if(opp===t) continue;
        const r=headToHeadPct(t,opp,outcomes);
        if(!r.games){ playedAll=false; lostAll=false; break; }
        if(r.pct!==0) lostAll=false;
      }
      if(playedAll && lostAll) losers.push(t);
    }
    if(losers.length){
      const remaining=group.filter(t=>!losers.includes(t));
      if(remaining.length===1) return {winner:remaining[0],remaining};
      return {winner:null,remaining};
    }
    return {winner:null,remaining:group.slice()};
  }
  function twoTeamWildcardWinner(a,b,ctx) {
    if(team(a).division===team(b).division) return twoTeamDivisionWinner(a,b,ctx);
    const {records,outcomes}=ctx;
    let leaders;
    const hA=headToHeadPct(a,b,outcomes), hB=headToHeadPct(b,a,outcomes);
    if(hA.games && hB.games){ leaders=metricLeaders([a,b],t=>t===a?hA.pct:hB.pct); if(leaders.length===1) return leaders[0]; }
    leaders=metricLeaders([a,b],t=>conferenceRecord(t,outcomes).pct); if(leaders.length===1) return leaders[0];
    const common=commonGamesRecord(a,b,outcomes,4); if(common){ leaders=metricLeaders([a,b],t=>t===a?common.a.pct:common.b.pct); if(leaders.length===1) return leaders[0]; }
    leaders=metricLeaders([a,b],t=>strengthOfVictory(t,records,outcomes)); if(leaders.length===1) return leaders[0];
    leaders=metricLeaders([a,b],t=>strengthOfSchedule(t,records,outcomes)); if(leaders.length===1) return leaders[0];
    return fallbackTieWinner([a,b],ctx);
  }
  function resolveCrossDivisionWildcardTie(group,ctx) {
    let tied=[...group];
    if(tied.length<=1) return tied[0]||null;
    if(tied.length===2) return twoTeamWildcardWinner(tied[0],tied[1],ctx);
    const {records,outcomes}=ctx;
    const sweep=headToHeadSweepWinner(tied,outcomes);
    if(sweep.winner) return sweep.winner;
    if(sweep.remaining.length<tied.length) return resolveCrossDivisionWildcardTie(sweep.remaining,ctx);
    let leaders=metricLeaders(tied,t=>conferenceRecord(t,outcomes).pct);
    if(leaders.length===1) return leaders[0]; if(leaders.length<tied.length) return resolveCrossDivisionWildcardTie(leaders,ctx);
    const common=commonGroupRecords(tied,outcomes,4);
    if(common){ leaders=metricLeaders(tied,t=>common[t].pct); if(leaders.length===1) return leaders[0]; if(leaders.length<tied.length) return resolveCrossDivisionWildcardTie(leaders,ctx); }
    leaders=metricLeaders(tied,t=>strengthOfVictory(t,records,outcomes));
    if(leaders.length===1) return leaders[0]; if(leaders.length<tied.length) return resolveCrossDivisionWildcardTie(leaders,ctx);
    leaders=metricLeaders(tied,t=>strengthOfSchedule(t,records,outcomes));
    if(leaders.length===1) return leaders[0]; if(leaders.length<tied.length) return resolveCrossDivisionWildcardTie(leaders,ctx);
    return fallbackTieWinner(tied,ctx);
  }
  function rankDivisionTeams(div,ctx) {
    const remaining=Object.keys(ctx.records).filter(t=>team(t).division===div), ranked=[];
    while(remaining.length){
      const bestPct=Math.max(...remaining.map(t=>recordPct(ctx.records[t])));
      const tied=remaining.filter(t=>Math.abs(recordPct(ctx.records[t])-bestPct)<1e-12);
      const winner=tied.length===1?tied[0]:resolveDivisionTie(tied,ctx);
      ranked.push(winner); remaining.splice(remaining.indexOf(winner),1);
    }
    return ranked;
  }
  function selectWildcardTeam(eligible,ctx) {
    const bestPct=Math.max(...eligible.map(t=>recordPct(ctx.records[t])));
    const recordTied=eligible.filter(t=>Math.abs(recordPct(ctx.records[t])-bestPct)<1e-12);
    if(recordTied.length===1) return recordTied[0];
    // NFL multi-team wildcard procedure first reduces each division to its
    // highest-ranked tied club using the division tiebreaker.
    const byDiv=new Map();
    for(const t of recordTied){ const d=team(t).division; if(!byDiv.has(d)) byDiv.set(d,[]); byDiv.get(d).push(t); }
    const candidates=[];
    for(const [div,group] of byDiv.entries()){
      if(group.length===1){ candidates.push(group[0]); continue; }
      // NFL keeps the original within-division seeding for subsequent wild-card
      // applications. Reuse the conference field's division order when available.
      const originalOrder=ctx.divisionOrders?.[div];
      const winner=originalOrder?.find(t=>group.includes(t)) || resolveDivisionTie(group,ctx);
      candidates.push(winner);
    }
    return candidates.length===1?candidates[0]:resolveCrossDivisionWildcardTie(candidates,ctx);
  }
  function rankConferenceCandidates(candidates,ctx) {
    const remaining=[...candidates], ranked=[];
    while(remaining.length){
      const bestPct=Math.max(...remaining.map(t=>recordPct(ctx.records[t])));
      const tied=remaining.filter(t=>Math.abs(recordPct(ctx.records[t])-bestPct)<1e-12);
      const winner=tied.length===1?tied[0]:resolveCrossDivisionWildcardTie(tied,ctx);
      ranked.push(winner); remaining.splice(remaining.indexOf(winner),1);
    }
    return ranked;
  }
  function tiebreakCompare(a,b,ctx,kind='wildcard') {
    // Backward-compatible two-club comparator for diagnostics/tests. Multi-club
    // postseason ordering uses the selection/restart functions above.
    if(a===b) return 0;
    const pa=recordPct(ctx.records[a]), pb=recordPct(ctx.records[b]);
    if(Math.abs(pa-pb)>1e-12) return pb-pa;
    const winner=(kind==='division'||team(a).division===team(b).division)
      ? twoTeamDivisionWinner(a,b,ctx)
      : twoTeamWildcardWinner(a,b,ctx);
    return winner===a?-1:1;
  }
  function buildConferenceField(conf,ctx) {
    const conferenceTeams=Object.keys(ctx.records).filter(t=>conferenceOf(t)===conf);
    const divisions=[...new Set(conferenceTeams.map(t=>team(t).division))];
    const divisionOrders=Object.fromEntries(divisions.map(div=>[div,rankDivisionTeams(div,ctx)]));
    const winners=rankConferenceCandidates(divisions.map(div=>divisionOrders[div][0]).filter(Boolean),ctx);
    const winnerSet=new Set(winners);
    const eligible=conferenceTeams.filter(t=>!winnerSet.has(t));
    const wild=[];
    const wildcardCtx={...ctx,divisionOrders};
    while(wild.length<3 && eligible.length){
      const winner=selectWildcardTeam(eligible,wildcardCtx);
      if(!winner) break;
      wild.push(winner); eligible.splice(eligible.indexOf(winner),1);
    }
    const seeds=[...winners,...wild];
    return {winners,wild,seeds,winnerSet,divisionOrders};
  }
  function seasonProjection() {
    const ratings = ratingsWithActiveQBCarryover();
    const rec = records();
    const teams = Object.keys(D.teams);
    const remaining = sortedSchedule().filter(g => g.homeScore == null && ratings[g.home] != null && ratings[g.away] != null)
      .map(g => ({...g, pHome: forecastFor(g, ratings).probability}));
    const stats = Object.fromEntries(teams.map(t => [t,{wins:0,divTitle:0,playoffs:0,bye:0,finish:[0,0,0,0,0],seed:[0,0,0,0,0,0,0,0,0]}]));
    const force = Object.fromEntries(teams.map(t => [t, score(ratings[t])]));
    const divisions = [...new Set(teams.map(t => team(t).division))];
    const baseOutcomes=completedProjectionOutcomes();
    const rng = projectionRng(projectionSeed());
    // Keep compact snapshots of each Monte Carlo season. After the simulation we
    // select the single run whose team-win vector is closest to the Monte Carlo
    // expected-win vector. This yields a representative coherent bracket without
    // the deterministic "every favorite wins" path that can manufacture 16-1/17-0
    // records far above the actual expected-win projection.
    const snapshots=[];
    for (let run=0; run<PROJECTION_RUNS; run++) {
      const finalRec=cloneRecords(rec,teams), outcomes=baseOutcomes.slice();
      for (const g of remaining) addProjectedOutcome(finalRec,outcomes,g.home,g.away,rng()<g.pHome?g.home:g.away);
      const ctx={records:finalRec,outcomes,force};
      const divisionFinish={}, seedByTeam={}, divisionWinner=new Set();
      for (const div of divisions) {
        const arr=rankDivisionTeams(div,ctx);
        arr.forEach((t,i)=>{ if(i<4) stats[t].finish[i+1]++; divisionFinish[t]=i+1; });
        if(arr[0]) stats[arr[0]].divTitle++;
      }
      for (const conf of ['AFC','NFC']) {
        const field=buildConferenceField(conf,ctx);
        field.winners.forEach(t=>divisionWinner.add(t));
        field.seeds.forEach((t,i)=>{ stats[t].playoffs++; stats[t].seed[i+1]++; seedByTeam[t]=i+1; if(i===0) stats[t].bye++; });
      }
      teams.forEach(t=>{ stats[t].wins += (finalRec[t].w||0)+0.5*(finalRec[t].t||0); });
      snapshots.push({
        records:Object.fromEntries(teams.map(t=>[t,{...finalRec[t]}])),
        divisionFinish,
        seedByTeam,
        divisionWinner:[...divisionWinner]
      });
    }

    const expectedWinsByTeam=Object.fromEntries(teams.map(t=>[t,stats[t].wins/PROJECTION_RUNS]));
    const representativePick=selectRepresentativeProjection(snapshots,teams,expectedWinsByTeam,rec);
    const representative=representativePick.representative;
    const bestDistance=representativePick.bestDistance;
    const projectedRec=representative.records;
    const projectedSeedByTeam=representative.seedByTeam||{};
    const projectedDivisionWinner=new Set(representative.divisionWinner||[]);
    const projectedDivisionFinishByTeam=representative.divisionFinish||{};

    const out={};
    for (const t of teams) {
      const s=stats[t];
      let finish=1, finishN=-1; for(let i=1;i<=4;i++){ if(s.finish[i]>finishN){finishN=s.finish[i];finish=i;} }
      const expWins=expectedWinsByTeam[t];
      const pathRec=projectedRec[t]||{w:0,l:0,t:0};
      const projectedRecord=pathRec.t ? `${pathRec.w}-${pathRec.l}-${pathRec.t}` : `${pathRec.w}-${pathRec.l}`;
      out[t]={team:t,force:force[t],current:rec[t],expectedWins:expWins,projectedRecord,projectedPathRecord:{...pathRec},projectedFinish:projectedDivisionFinishByTeam[t]||finish,divisionPct:100*s.divTitle/PROJECTION_RUNS,playoffPct:100*s.playoffs/PROJECTION_RUNS,byePct:100*s.bye/PROJECTION_RUNS,projectedSeed:projectedSeedByTeam[t]||'Out',projectedDivisionWinner:projectedDivisionWinner.has(t)};
    }
    return {teams:out, runs:PROJECTION_RUNS, remainingGames:remaining.length, representativeDistance:bestDistance};
  }

  function pct(v) { return `${Math.round(v)}%`; }
  function divisionsPage() {
    const sim=seasonProjection();
    const divisionOrder=['AFC East','AFC North','AFC South','AFC West','NFC East','NFC North','NFC South','NFC West'];
    const cards=divisionOrder.map(div=>{
      const rows=Object.values(sim.teams).filter(x=>team(x.team).division===div).sort((a,b)=>a.projectedFinish-b.projectedFinish || b.expectedWins-a.expectedWins || b.force-a.force);
      return `<section class="card projection-card"><div class="card-head"><h2>${div}</h2><span class="chip">${rows[0] ? `${pct(rows[0].divisionPct)} leader odds` : ''}</span></div><div class="table-wrap"><table class="projection-table"><thead><tr><th>Proj</th><th>Team</th><th>Record</th><th>FORCE</th><th>Projected</th><th>Division</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.projectedFinish}</b></td><td><button class="team-link" data-team="${r.team}">${teamIdentity(r.team,{size:'xs'})}</button></td><td>${r.current.w}-${r.current.l}${r.current.t?`-${r.current.t}`:''}</td><td class="${bandClass(r.force)}"><b>${fmt(r.force,1)}</b></td><td><b>${r.projectedRecord}</b><small>${fmt(r.expectedWins,1)} exp. wins</small></td><td><b>${pct(r.divisionPct)}</b></td></tr>`).join('')}</tbody></table></div></section>`;
    }).join('');
    return layout(`<div class="section-title"><div><div class="eyebrow">Season projection</div><h2>Divisions</h2><p>Where each division is most likely to finish from here.</p></div><span class="chip">${sim.runs.toLocaleString()} simulated seasons</span></div><div class="projection-grid">${cards}</div><p class="raw projection-note">FORCE simulates every remaining game using its current win probability. The displayed standings come from one simulated season that is closest to the average result across all runs, while the division-title percentages use every simulation. NFL tiebreakers are applied in their normal order as far as the simulation has enough information to do so.</p>`, 'divisions');
  }

  function playoffPicturePage() {
    const sim=seasonProjection();
    const confMarkup=['AFC','NFC'].map(conf=>{
      const rows=Object.values(sim.teams).filter(x=>conferenceOf(x.team)===conf).sort((a,b)=>{ const as=typeof a.projectedSeed==='number'?a.projectedSeed:99, bs=typeof b.projectedSeed==='number'?b.projectedSeed:99; return as-bs || b.playoffPct-a.playoffPct || b.expectedWins-a.expectedWins; });
      return `<section class="card playoff-card"><div class="card-head"><h2>${conf} Playoff Picture</h2><span class="chip">7 playoff spots</span></div><div class="table-wrap"><table class="projection-table playoff-table"><thead><tr><th>Proj seed</th><th>Team</th><th>Record</th><th>FORCE</th><th>Projected</th><th>Playoffs</th><th>Division</th><th>Bye</th></tr></thead><tbody>${rows.map(r=>`<tr class="${typeof r.projectedSeed==='number'?'projected-in':'projected-out'}"><td><b>${typeof r.projectedSeed==='number' ? `#${r.projectedSeed}${r.projectedDivisionWinner ? ' <small>DIV</small>' : ''}` : 'Out'}</b></td><td><button class="team-link" data-team="${r.team}">${teamIdentity(r.team,{size:'xs'})}</button></td><td>${r.current.w}-${r.current.l}${r.current.t?`-${r.current.t}`:''}</td><td class="${bandClass(r.force)}"><b>${fmt(r.force,1)}</b></td><td><b>${r.projectedRecord}</b><small>${fmt(r.expectedWins,1)} exp. wins</small></td><td><b>${pct(r.playoffPct)}</b></td><td>${pct(r.divisionPct)}</td><td>${pct(r.byePct)}</td></tr>`).join('')}</tbody></table></div></section>`;
    }).join('');
    return layout(`<div class="section-title"><div><div class="eyebrow">Season projection</div><h2>Playoff Picture</h2><p>What the season most plausibly looks like from here, based on current FORCE win chances.</p></div><span class="chip">${sim.runs.toLocaleString()} simulated seasons</span></div><div class="grid two playoff-grid">${confMarkup}</div><p class="raw projection-note">FORCE simulates the rest of the season thousands of times using each game's current win probability. The records and seeds shown here come from one representative Monte Carlo season, meaning one simulated season that looks most like the average result across all of those runs. That keeps the bracket and records consistent with each other. The playoff, division, and bye percentages use every simulation. NFL tiebreakers are applied in their normal order as far as the simulation has enough information to do so.</p>`, 'playoffs');
  }


  function forcecastSlatePage() {
    const ratings=ratingsWithActiveQBCarryover();
    const current=currentWeekNumber();
    const weeks=[...new Set(sortedSchedule().map(g=>Number(g.week)).filter(w=>Number.isFinite(w)&&w>=current))].sort((a,b)=>a-b);
    const fallback=weeks[0]||current;
    let week=Number(S.slateWeek)||fallback;
    if(!weeks.includes(week)) week=fallback;
    S.slateWeek=week;
    const games=sortedSchedule().filter(g=>Number(g.week)===week);
    const cards=games.map(g=>{
      const audit=forecastAudit(g,ratings), fc=audit.fc, proj=audit.proj;
      const awayProb=Math.round((1-fc.probability)*100), homeProb=Math.round(fc.probability*100);
      const awayFav=awayProb>homeProb, homeFav=homeProb>awayProb;
      return `<button class="slate-game-card" data-game="${gameHash(g)}" aria-label="Open ${team(g.away).name} at ${team(g.home).name} matchup">
        <div class="slate-game-meta"><span>${g.date}${g.time?` · ${formatKickoffTime(g.date,g.time)}`:''}</span><span>Week ${g.week}</span></div>
        <div class="slate-game-head"><span>Team</span><span>Pred final</span><span>Win</span></div>
        <div class="slate-team-row ${awayFav?'slate-favorite':''}"><span>${teamIdentity(g.away,{size:'xs'})}</span><strong>${proj.away}</strong><b>${awayProb}%</b></div>
        <div class="slate-team-row ${homeFav?'slate-favorite':''}"><span>${teamIdentity(g.home,{size:'xs'})}</span><strong>${proj.home}</strong><b>${homeProb}%</b></div>
      </button>`;
    }).join('');
    return layout(`<div class="section-title slate-title"><div><div class="eyebrow">Weekly forecast board</div><h2>FORCEcast Slate</h2><p>Predicted final score and win probability for every game in the week.</p></div><div class="slate-controls"><label>Week <select id="slateWeek">${weeks.map(w=>`<option value="${w}" ${w===week?'selected':''}>${w}</option>`).join('')}</select></label></div></div><div class="slate-single-export"><div class="slate-board">${cards||'<div class="loading">No games loaded for this week.</div>'}</div></div>`, 'slate');
  }

  function modeControl() { return ''; }

  function layout(content, active) {
    return `<header class="topbar">
      <div class="brand"><img class="force-brand-logo force-brand-logo-topbar" src="assets/force-approved-mark.png" alt="FORCE - approved Vector-F mark"><span class="working">prototype</span></div>
      <button class="ghost mobile-export-button" id="exportPngMobile" title="Save this page as a PNG">PNG</button>
      <nav class="nav">${[
        ['home', 'Home'], ['rankings', 'FORCE Rankings'], ['qbs', 'QB Rankings'], ['divisions', 'Divisions'], ['playoffs', 'Playoff Picture'], ['slate', 'FORCEcast Slate'], ['matchups', 'Games'],
        ['teams', 'Teams'], ['update', 'Update'], ['lab', 'Roster Lab'], ['model', 'Method']
      ].map(([k, v]) => `<button data-nav="${k}" class="${active === k ? 'active' : ''}">${v}</button>`).join('')}</nav>
      <div class="top-actions"><span class="status"><i class="dot ${S.refreshError ? 'warn' : ''}"></i>${connectionLabel()}</span><button class="ghost refresh-button" id="refreshData" title="Update schedule plus all current team/player/unit sources and recompute FORCE everywhere">↻ Refresh</button><button class="ghost export-button" id="exportPng" title="Save this page as a PNG">Export PNG</button><span class="refresh-meta" id="refreshMeta">${refreshText()}</span><button class="ghost" data-nav="names">About FORCE</button></div>
    </header>
    <main class="shell"><div id="exportCapture" class="export-capture">${S.refreshError ? `<div class="refresh-warning">${S.lastRefreshAt ? 'Refresh failed. Kept the last good data.' : `Live-data bootstrap failed: ${S.refreshError}`}</div>` : ''}${S.statsError ? `<div class="refresh-warning">Some live metrics could not refresh (${S.statsError}). Current values are suppressed unless a fresh or last-known-good live snapshot is available.</div>` : ''}${S.statsWarning ? `<div class="refresh-warning refresh-warning-info">Live metrics refreshed; ${S.statsWarning}.</div>` : ''}${content}
      <div class="footer">FORCE prototype | Ratings and forecasts refresh with current data when available. FORCE Score measures team strength. Luck and FLAG add context but do not directly change the public forecast. See Method for a plain-language explanation of how the model works.</div></div>
    </main>`;
  }

  function gameCard(g, ratings) {
    const audit = forecastAudit(g, ratings);
    const fc = audit.fc;
    const ph = fc.probability;
    const phase = gamePhase(g);
    const right = phase === 'completed'
      ? '<span class="forecast-badge final">FINAL</span>'
      : phase === 'current' ? '<span class="forecast-badge adaptive">THIS WEEK</span>' : sourceLabel(fc);
    return `<button class="game game-button ${phase}" data-game="${gameHash(g)}" aria-label="Open ${team(g.away).name} at ${team(g.home).name} matchup detail">
      <div class="game-top"><span>WEEK ${g.week} · ${g.date}${g.time ? ' · ' + formatKickoffTime(g.date,g.time) : ''}</span>${right}</div>
      <div class="game-line">
        <span class="away">${teamIdentity(g.away, { size: 'xs', extra: 'game-team game-team-away' })}</span>
        <span class="prob">${Math.round((1 - ph) * 100)}%</span>
        <span class="at">@</span>
        <span class="prob">${Math.round(ph * 100)}%</span>
        <span>${teamIdentity(g.home, { size: 'xs', extra: 'game-team game-team-home' })}</span>
      </div>
      <div class="forecast-audit-strip ${audit.post ? 'with-postgame' : ''}">
        <span><b>Pred line</b> ${logoizeTeamCodes(audit.line)}</span>
        <span><b>Pred score</b> ${logoizeTeamCodes(audit.score)}</span>
        ${audit.actual ? `<span class="actual-final"><b>Final</b> ${logoizeTeamCodes(audit.actual)}</span>` : '<span class="actual-pending"><b>Final</b> -</span>'}
        ${audit.post ? `<span class="rating-shift"><b>FORCE change</b> ${teamToken(g.away)} ${audit.post.awayPowerDelta >= 0 ? '+' : ''}${fmt(audit.post.awayPowerDelta)} · ${teamToken(g.home)} ${audit.post.homePowerDelta >= 0 ? '+' : ''}${fmt(audit.post.homePowerDelta)}</span><span class="rematch-forecast"><b>Immediate rematch</b> ${logoizeTeamCodes(audit.post.rematchLine)} · ${logoizeTeamCodes(audit.post.rematchScore)}</span>` : ''}
      </div>
      ${fc.marketAvailable ? `<div class="market-detail">The betting market gives the home team a ${Math.round(fc.market * 100)}% chance${fc.adaptive ? `; FORCE Adaptive shifts that to ${Math.round(fc.adjustedMarket * 100)}% and lets the market supply ${Math.round(fc.context.marketWeight * 100)}% of the final prediction; ${logoizeTeamCodes(marketAdjustmentLabel(g, fc.context.correctionPoints))}${fc.context.divisional ? '; division game' : ''}` : fc.marketWeight != null ? `; the market supplies ${Math.round(fc.marketWeight * 100)}% of the final prediction` : ''}${g.lineSource ? `. Source: ${g.lineSource}` : ''}</div>` : ''}
      <span class="open-game">Open matchup report →</span>
    </button>`;
  }

  function matchupPage(g) {
    const ratings = ratingsWithActiveQBCarryover();
    const fc = forecastFor(g, ratings);
    const awayState = currentTeamState(g.away);
    const homeState = currentTeamState(g.home);
    const ap = awayState.profile, hp = homeState.profile;
    const proj = exactScoreProjection(g, fc);
    const hist = g.homeScore != null ? seasonEngine().gameHistory?.[gameKey(g)] : null;
    const historicalPreHome = g.homeScore != null ? canonicalGameTeamState(g,g.home,'pre') : null;
    const historicalPreAway = g.homeScore != null ? canonicalGameTeamState(g,g.away,'pre') : null;
    const historicalPostHome = g.homeScore != null ? canonicalGameTeamState(g,g.home,'post') : null;
    const historicalPostAway = g.homeScore != null ? canonicalGameTeamState(g,g.away,'post') : null;
    const preHome = historicalPreHome?.elo ?? homeState.rawElo;
    const preAway = historicalPreAway?.elo ?? awayState.rawElo;
    const postHome = historicalPostHome?.elo ?? preHome;
    const postAway = historicalPostAway?.elo ?? preAway;
    const aStrength = profileStrengths(g.away, ap), hStrength = profileStrengths(g.home, hp);
    const marketText = marketLineLabel(g);
    const resultText = g.homeScore != null ? `${g.away} ${g.awayScore} · ${g.home} ${g.homeScore}` : null;
    const awayOff=matchupValue(ap.offenseComposite), homeDef=matchupValue(hp.defenseIndex);
    const homeOff=matchupValue(hp.offenseComposite), awayDef=matchupValue(ap.defenseIndex);
    const offAwayVsHome = awayOff==null || homeDef==null ? null : awayOff-homeDef;
    const offHomeVsAway = homeOff==null || awayDef==null ? null : homeOff-awayDef;
    const qbAway = ap.qb || {}, qbHome = hp.qb || {};
    const lineLabel = predictedLineLabel(g, proj);
    const post = postgameAudit(g);
    const actualMargin = g.homeScore != null ? g.homeScore - g.awayScore : null;
    const actualWinnerLine = actualMargin == null ? null : actualMargin > 0 ? `${g.home} by ${actualMargin}` : actualMargin < 0 ? `${g.away} by ${Math.abs(actualMargin)}` : 'Tie';
    const marginError = actualMargin == null ? null : Math.abs(proj.margin - actualMargin);
    const totalError = g.homeScore == null ? null : Math.abs(proj.total - (g.homeScore + g.awayScore));
    const scenarioTeams = [ap._qbScenario ? g.away : null, hp._qbScenario ? g.home : null].filter(Boolean);
    const unitSnapshotLabel = '2026 ratings';
    const awayOffNote = [scenarioMetricNote(ap, 'offenseComposite'), ap.off_epa != null ? `${fmt(ap.off_epa,3)} expected points per play | ${liveProfileStatus(g.away)}` : ''].filter(Boolean).join(' | ');
    const homeOffNote = [scenarioMetricNote(hp, 'offenseComposite'), hp.off_epa != null ? `${fmt(hp.off_epa,3)} expected points per play | ${liveProfileStatus(g.home)}` : ''].filter(Boolean).join(' | ');
    const awayQbNote = [scenarioMetricNote(ap, 'qbIndex'), qbAway.qb ? `${ap._qbScenario?.qb || qbAway.qb} | ${fmt(qbAway.epa_per_play,3)} expected points per play | ${liveProfileStatus(g.away)}` : 'QB profile'].filter(Boolean).join(' | ');
    const homeQbNote = [scenarioMetricNote(hp, 'qbIndex'), qbHome.qb ? `${hp._qbScenario?.qb || qbHome.qb} | ${fmt(qbHome.epa_per_play,3)} expected points per play | ${liveProfileStatus(g.home)}` : 'QB profile'].filter(Boolean).join(' | ');
    return layout(`<div class="matchup-back"><button class="ghost" data-nav="matchups">← Matchups</button></div>
      <section class="matchup-hero card">
        <div class="matchup-team away-team" style="${teamAccentStyle(g.away)}">${teamMark(g.away, 'lg', 'right')}<div><div class="eyebrow">${team(g.away).division}</div><h1>${team(g.away).name}</h1><div class="raw">Pregame FORCE ${fmt(score(preAway))}</div>${quickQbButton(g.away)}</div></div>
        <div class="matchup-center"><div class="raw">WEEK ${g.week} · ${g.date}${g.time ? ` · ${formatKickoffTime(g.date,g.time)}` : ''}</div><div class="matchup-prob"><strong>${Math.round((1 - fc.probability) * 100)}%</strong><span>@</span><strong>${Math.round(fc.probability * 100)}%</strong></div><div>${sourceLabel(fc)}${g.divisional ? ' <span class="chip">DIVISION</span>' : ''}</div>${resultText ? `<div class="final-score">FINAL · ${logoizeTeamCodes(resultText, 'xs')}</div>` : ''}</div>
        <div class="matchup-team home-team" style="${teamAccentStyle(g.home)}">${teamMark(g.home, 'lg', 'left')}<div><div class="eyebrow">${team(g.home).division}</div><h1>${team(g.home).name}</h1><div class="raw">Pregame FORCE ${fmt(score(preHome))}</div>${quickQbButton(g.home)}</div></div>
      </section>
      <div class="grid three matchup-kpis" style="margin-top:16px">
        <div class="card kpi"><div class="label">FORCEcast</div><div class="value">${Math.round(fc.probability * 100)}%</div><div class="sub team-kpi-sub">${teamToken(g.home)} <span>home win${fc.marketAvailable && fc.marketWeight != null ? `; ${Math.round(fc.marketWeight * 100)}% of this prediction comes from the betting market` : '; FORCE only because no usable market line is available'}</span></div></div>
        <div class="card kpi"><div class="label">MARKET LINE</div><div class="value team-line-value" style="font-size:25px">${logoizeTeamCodes(marketText, 'xs')}</div><div class="sub">A negative number means that team is favored by that many points. The betting line can affect FORCEcast, but it never changes the team's FORCE Score.</div></div>
        <div class="card kpi"><div class="label">MATCHUP TYPE</div><div class="value" style="font-size:25px">${g.divisional ? 'Division' : 'Non-division'}</div><div class="sub">${g.divisional ? 'No extra division adjustment is forced.' : 'Standard matchup.'}</div></div>
      </div>
      ${flagSwingGameBanner(g)}
      <div class="section-title matchup-edge-title"><div><div class="eyebrow">Matchup edges</div><h2>${g.homeScore != null ? 'Where each team stands now' : 'Where each team has an edge'}</h2><p>${g.homeScore != null ? 'Pregame and current ratings are shown on the same 0 to 100 FORCE scale.' : 'The offense score is built mostly from overall offensive performance and quarterback play, with receivers and the offensive line filling out the rest. Defense leans most heavily on coverage and run defense, with points allowed per drive and pass rush also included. Overall edge is simply the gap between the two sides.'}</p></div><span class="chip">${unitSnapshotLabel}</span></div>
      <section class="card duel-card">
        ${g.homeScore != null ? duel('Postgame FORCE Score', g.away, g.home, historicalPostAway?.forceScore, historicalPostHome?.forceScore, 'Postgame rating', 'Postgame rating') : ''}
        ${duel(g.homeScore != null ? 'Current FORCE Score' : 'FORCE Score', g.away, g.home, awayState.forceScore, homeState.forceScore, g.homeScore != null ? 'Latest rating' : '0–100 strength', g.homeScore != null ? 'Latest rating' : '0–100 strength')}
        ${duel('Offensive profile', g.away, g.home, ap.offenseComposite, hp.offenseComposite, awayOffNote, homeOffNote)}
        ${duel('Defensive profile', g.away, g.home, ap.defenseIndex, hp.defenseIndex, '36% coverage · 16% pass rush · 28% run defense · 20% pts/drive', '36% coverage · 16% pass rush · 28% run defense · 20% pts/drive')}
        ${duel('Quarterback play', g.away, g.home, ap.qbIndex, hp.qbIndex, awayQbNote, homeQbNote)}
        ${duel('Offensive line', g.away, g.home, ap.olIndex, hp.olIndex, ap.ol ? `${fmt((1-ap.ol.pressure_rate_allowed)*100,1)}% disruption-free dropback proxy` : '', hp.ol ? `${fmt((1-hp.ol.pressure_rate_allowed)*100,1)}% disruption-free dropback proxy` : '')}
        ${duel('Pass rush', g.away, g.home, ap.passRushIndex, hp.passRushIndex, ap.dl ? passRushRateLabel(ap) : '', hp.dl ? passRushRateLabel(hp) : '')}
        ${duel('Run defense', g.away, g.home, ap.runDefenseIndex, hp.runDefenseIndex, ap.dl?.run_epa_allowed != null ? `${fmt(ap.dl.run_epa_allowed,3)} rush EPA/play allowed` : '', hp.dl?.run_epa_allowed != null ? `${fmt(hp.dl.run_epa_allowed,3)} rush EPA/play allowed` : '')}
        ${duel('Coverage', g.away, g.home, ap.coverageIndex, hp.coverageIndex, ap.cov ? `${fmt(ap.cov.press_adj_epa,3)} pass EPA/play allowed` : '', hp.cov ? `${fmt(hp.cov.press_adj_epa,3)} pass EPA/play allowed` : '')}
        ${duel('Receiving efficiency', g.away, g.home, ap.receiverIndex, hp.receiverIndex, ap.receivers ? `${fmt(ap.receivers.adj_epa,3)} receiving EPA/target` : '', hp.receivers ? `${fmt(hp.receivers.adj_epa,3)} receiving EPA/target` : '')}
        ${duel('RB efficiency', g.away, g.home, ap.rbIndex, hp.rbIndex, ap.rb?.room_composite != null ? `${ap.rb.name || 'RB room'} · ${fmt(ap.rb.room_composite,3)} composite EPA` : 'RB/FB room efficiency', hp.rb?.room_composite != null ? `${hp.rb.name || 'RB room'} · ${fmt(hp.rb.room_composite,3)} composite EPA` : 'RB/FB room efficiency')}
      </section>
      <div class="grid two matchup-pair matchup-analysis" style="margin-top:16px">
        <section class="card team-accent-card" style="${teamAccentStyle(g.away)}"><div class="card-head"><h2 class="headed-team matchup-versus-title">${teamToken(g.away, 'xs')}<span>offense vs</span>${teamToken(g.home, 'xs')}<span>defense</span></h2>${edgeBadge(g.away, g.home, offAwayVsHome)}</div><div class="card-body">
          ${matchupBreakdown(g.away, g.home, ap, hp)}
          <p class="raw matchup-qb-line">QB data: ${ap._qbScenario?.qb || qbAway.qb || '-'}${qbAway.epa_per_play != null ? ` | ${fmt(qbAway.epa_per_play,3)} expected points per play | ${fmt(qbAway.cpoe,1)} completion percentage points above expectation` : ''}</p>
        </div></section>
        <section class="card team-accent-card" style="${teamAccentStyle(g.home)}"><div class="card-head"><h2 class="headed-team matchup-versus-title">${teamToken(g.home, 'xs')}<span>offense vs</span>${teamToken(g.away, 'xs')}<span>defense</span></h2>${edgeBadge(g.home, g.away, offHomeVsAway)}</div><div class="card-body">
          ${matchupBreakdown(g.home, g.away, hp, ap)}
          <p class="raw matchup-qb-line">QB data: ${hp._qbScenario?.qb || qbHome.qb || '-'}${qbHome.epa_per_play != null ? ` | ${fmt(qbHome.epa_per_play,3)} expected points per play | ${fmt(qbHome.cpoe,1)} completion percentage points above expectation` : ''}</p>
        </div></section>
      </div>
      <div class="section-title"><div><div class="eyebrow">Context</div><h2>Luck, FLAG, and market</h2></div></div>
      <div class="grid two matchup-pair">${contextCard(g.away)}${contextCard(g.home)}</div>
      <div class="grid two matchup-pair matchup-strengths" style="margin-top:16px">
        <section class="card team-accent-card" style="${teamAccentStyle(g.away)}"><div class="card-head"><h2 class="headed-team">${teamIdentity(g.away, { size: 'xs' })}<span>: strengths & weaknesses</span></h2></div><div class="card-body strength-list"><h3>Strengths</h3>${aStrength.high.map(([n,v])=>`<div><b>${n}</b><span>${fmt(v,0)}</span></div>`).join('')}<h3>Weaknesses</h3>${aStrength.low.map(([n,v])=>`<div><b>${n}</b><span>${fmt(v,0)}</span></div>`).join('')}</div></section>
        <section class="card team-accent-card" style="${teamAccentStyle(g.home)}"><div class="card-head"><h2 class="headed-team">${teamIdentity(g.home, { size: 'xs' })}<span>: strengths & weaknesses</span></h2></div><div class="card-body strength-list"><h3>Strengths</h3>${hStrength.high.map(([n,v])=>`<div><b>${n}</b><span>${fmt(v,0)}</span></div>`).join('')}<h3>Weaknesses</h3>${hStrength.low.map(([n,v])=>`<div><b>${n}</b><span>${fmt(v,0)}</span></div>`).join('')}</div></section>
      </div>
      <section class="prediction-finale card">
        <div class="eyebrow">FORCEcast</div><div class="prediction-grid ${g.homeScore != null ? 'three-up' : ''}">
          <div><span>Predicted line</span><strong class="rich-team-line">${logoizeForecastTeamCodes(lineLabel, 'xs')}</strong><small>Comes from the same win probability shown above${fc.marketAvailable && fc.marketWeight != null ? ` | ${Math.round(fc.marketWeight * 100)}% from the market and ${Math.round(fc.modelWeight * 100)}% from FORCE` : ''}${scenarioTeams.length ? ` | returning-QB adjustment active` : ''}.</small></div>
          <div class="exact"><span>Predicted final score</span><strong class="rich-team-line">${logoizeForecastTeamCodes(`${g.away} ${proj.away} · ${g.home} ${proj.home}`, 'xs')}</strong><small>The predicted score comes from 25,000 possession-level simulations centered on FORCEcast's expected matchup strength and scoring environment. Pace, drive outcomes, and game-level offensive variance can move the representative score away from the betting-style line. Treat the exact score as less certain than the line or win probability.</small></div>
          ${g.homeScore != null ? `<div class="actual-result"><span>Actual final</span><strong class="rich-team-line">${logoizeTeamCodes(`${g.away} ${g.awayScore} · ${g.home} ${g.homeScore}`, 'xs')}</strong><small>${logoizeTeamCodes(actualWinnerLine)} · margin error ${fmt(marginError)} · total error ${fmt(totalError)}.</small></div>` : ''}
        </div>
        ${gameFlowPanel(g, proj)}
        ${post ? `<div class="postgame-learning">
          <div class="postgame-heading"><div><span class="eyebrow">What changed</span><h3>Postgame FORCE & rematch</h3></div><span class="chip">Same venue</span></div>
          <div class="postgame-grid">
            <div class="rating-impact"><span class="rating-team-label">${teamToken(g.away)}<span>FORCE change</span></span><strong class="${post.awayPowerDelta >= 0 ? 'positive' : 'negative'}">${post.awayPowerDelta >= 0 ? '+' : ''}${fmt(post.awayPowerDelta)} FORCE</strong><small>FORCE ${fmt(post.preAwayForce)} → ${fmt(post.postAwayForce)}</small></div>
            <div class="rating-impact"><span class="rating-team-label">${teamToken(g.home)}<span>FORCE change</span></span><strong class="${post.homePowerDelta >= 0 ? 'positive' : 'negative'}">${post.homePowerDelta >= 0 ? '+' : ''}${fmt(post.homePowerDelta)} FORCE</strong><small>FORCE ${fmt(post.preHomeForce)} → ${fmt(post.postHomeForce)}</small></div>
            <div class="rematch-card"><span>Predicted rematch line</span><strong class="rich-team-line">${logoizeTeamCodes(post.rematchLine, 'xs')}</strong><small class="rematch-home-win">${Math.round(post.rematchProbability * 100)}% ${teamToken(g.home)} <span>home win · same venue hypothetical.</span></small></div>
            <div class="rematch-card exact"><span>Predicted rematch score</span><strong class="rich-team-line">${logoizeTeamCodes(post.rematchScore, 'xs')}</strong><small>Same venue hypothetical.</small></div>
          </div>
          <div class="postgame-unit-change">
            <div class="postgame-heading"><div><span class="eyebrow">Unit update</span><h3>Pregame → Postgame</h3></div><span class="chip">2026 ratings</span></div>
            <div class="grid two matchup-pair">
              <div class="card unit-change-card" style="${teamAccentStyle(g.away)}"><h4>${teamIdentity(g.away, { size: 'xs' })}</h4>${unitChangeRows(g.away, g.week, post?.postAwayState?.profile || profileBeforeWeek(g.away, Number(g.week)+1))}</div>
              <div class="card unit-change-card" style="${teamAccentStyle(g.home)}"><h4>${teamIdentity(g.home, { size: 'xs' })}</h4>${unitChangeRows(g.home, g.week, post?.postHomeState?.profile || profileBeforeWeek(g.home, Number(g.week)+1))}</div>
            </div>
          </div>
        </div>` : ''}
      </section>
      <div class="warning matchup-warning"><b>Data:</b> scores, lines, team stats, player stats, efficiency measures, unit ratings, Luck, and FLAG refresh hourly when the source data are available. Early in the season, unit ratings still keep a small amount of the preseason baseline so one game does not overwhelm everything else.</div>`, 'matchups');
  }

  function home() {
    const ratings = ratingsWithActiveQBCarryover();
    const rr = D.rankings.map((x) => ({ ...x, liveElo: ratings[x.team] || x.elo })).sort((a, b) => b.liveElo - a.liveElo);
    const currentWeek = currentWeekNumber();
    const weekGames = sortedSchedule().filter((g) => g.week === currentWeek);
    const recentFinals = sortedSchedule().filter((g) => g.homeScore != null).slice(-4).reverse();
    const up = sortedSchedule().filter((g) => g.homeScore == null).slice(0, 5);
    const recs = records();
    const cards = rr.slice(0, 8).map((r, i) => `<div class="rank-row">
      <span class="rank">${i + 1}</span>
      <button class="team-link" data-team="${r.team}">${teamIdentity(r.team, { size: 'xs', sub: `<small>${r.division}</small>` })}</button>
      <div><span class="score">${fmt(score(r.liveElo))}</span>${ratingBar(r.liveElo)}</div>
      <span class="raw">${Math.round(r.liveElo)} Elo</span>
      <span class="raw">${recs[r.team].w}-${recs[r.team].l}${recs[r.team].t ? '-' + recs[r.team].t : ''}</span>
      <span class="home-qb-fix">${quickQbButton(r.team)}</span>
    </div>`).join('');
    const biggest = rr.slice().sort((a, b) => (b.liveElo - b.elo) - (a.liveElo - a.elo))[0];
    return layout(`<div class="eyebrow">Football Objective Rating & Comparative Efficiency</div>
      <div class="hero"><div><h1>NFL strength, explained.</h1><p>Ratings, forecasts, matchup edges, and roster what-ifs.</p></div>
      <div class="score-explain"><strong>FORCE Score</strong><div class="raw">50 is average | 0 and 100 are theoretical limits | red 0 to 40 | yellow 41 to 70 | green 71+</div></div></div>
      <div class="grid two">
        <section class="card"><div class="card-head"><h2>FORCE Rankings</h2><div class="card-head-actions"><span class="chip">32 teams</span>${quickQbButton('KC')}</div></div>${cards}<div class="card-body ranking-entry-actions"><button class="ghost" data-nav="rankings">See all 32 →</button><span class="raw">Views: Strength · Luck · FLAG · Units · Advanced</span></div></section>
        <section class="card"><div class="card-head"><h2>Week ${currentWeek}</h2><span class="pill-live">${S.live ? 'LIVE' : (S.connectionState==='offline' ? 'OFFLINE' : S.refreshing ? 'CONNECTING' : 'UNAVAILABLE')}</span></div>${weekGames.length ? weekGames.map((g) => gameCard(g, ratings)).join('') : '<div class="loading">No games loaded.</div>'}</section>
      </div>
      <div class="grid two" style="margin-top:16px">
        <section class="card"><div class="card-head"><h2>Recent finals</h2><span class="chip">forecast vs final</span></div>${recentFinals.length ? recentFinals.map((g) => gameCard(g, ratings)).join('') : '<div class="loading">No finals yet.</div>'}</section>
        <section class="card"><div class="card-head"><h2>Next games</h2><span class="chip">upcoming</span></div>${up.length ? up.map((g) => gameCard(g, ratings)).join('') : '<div class="loading">No games loaded.</div>'}</section>
      </div>
      <div class="grid three" style="margin-top:16px">
        <div class="card kpi"><div class="label">BIGGEST RISER</div><div class="value team-kpi-value">${teamIdentity(biggest.team, { size: 'sm' })}</div><div class="sub">${signed(biggest.liveElo - biggest.elo, 1, ' Elo')} since the base snapshot.</div></div>
        <div class="card kpi"><div class="label">FORCE PREDICTION ERROR</div><div class="value">0.2170</div><div class="sub">Historical test on games the model was not trained on. Lower is better.</div></div>
        <div class="card kpi"><div class="label">CLOSING-LINE PREDICTION ERROR</div><div class="value positive">0.2095</div><div class="sub">Historical benchmark from the betting market. Lower is better.</div></div>
      </div>`, 'home');
  }

  function rankings() {
    const ratings = ratingsWithActiveQBCarryover();
    const rows = D.rankings.map((r) => {
      const state = currentTeamState(r.team), pr = state.profile, l = pr.luck || {}, pen = pr.penalty || {}, ai = adaptiveTeamInfo(r.team);
      return { ...r, liveElo: state.elo, _sort: {
        force: state.forceScore, elo: state.elo, sinceBase: state.elo - r.elo,
        actualWins: Number(l.w ?? r.w ?? 0), expectedWins: Number(l.exp_w ?? 0), luck: Number(luckContextScore(l) ?? -999), luckPct: Number(l.luck_pct ?? 0),
        penEPA: pen.unavailable ? null : penaltyContextScore(pen), penUnavailable: Boolean(pen.unavailable), penWP: Number(pen.live ? (pen.net_pen_yards ?? 0) : (pen.pen_wp_swing ?? 0)), decisive: Number(pr._live?.games ?? 0),
        off: Number(pr.offenseComposite ?? -999), def: Number(pr.defenseIndex ?? -999), qb: Number(pr.qbIndex ?? -999), ol: Number(pr.olIndex ?? -999),
        passRush: Number(pr.passRushIndex ?? -999), runDef: Number(pr.runDefenseIndex ?? -999), cov: Number(pr.coverageIndex ?? -999), rb: Number(pr.rbIndex ?? -999), rec: Number(pr.receiverIndex ?? -999),
        offEpa: Number(pr.off_epa ?? -999), vsVegas: Number(spreadContextScore(ai) ?? -999), vegasWeight: Number(ai?.marketWeight ?? 0)
      }};
    });
    const forceOrder = [...rows].sort((a,b) => b._sort.force - a._sort.force || a.name.localeCompare(b.name));
    const forceRank = Object.fromEntries(forceOrder.map((r,i) => [r.team, i+1]));
    // Metric rank is always 1 = strongest/highest value, even when the user flips the table to ascending.
    // This prevents the # column from turning into a mere row number.
    const compareMetric = (a,b,key,dir='desc') => {
      // V87: unavailable penalty rows always stay at the bottom in either direction.
      // Otherwise an ascending "least benefit" sort would incorrectly put missing data first.
      if (key === 'penEPA') {
        const am=Boolean(a._sort.penUnavailable) || a._sort.penEPA == null || !Number.isFinite(Number(a._sort.penEPA));
        const bm=Boolean(b._sort.penUnavailable) || b._sort.penEPA == null || !Number.isFinite(Number(b._sort.penEPA));
        if (am !== bm) return am ? 1 : -1;
      }
      const av=Number(a._sort[key]), bv=Number(b._sort[key]);
      const af=Number.isFinite(av), bf=Number.isFinite(bv);
      if (af !== bf) return af ? -1 : 1;
      if (!af && !bf) return a.name.localeCompare(b.name);
      return (dir === 'asc' ? av-bv : bv-av) || a.name.localeCompare(b.name);
    };
    const metricOrder = [...rows].sort((a,b) => compareMetric(a,b,S.rankSort.key,'desc'));
    const metricRank = Object.fromEntries(metricOrder.map((r,i) => [r.team, i+1]));
    rows.sort((a,b) => compareMetric(a,b,S.rankSort.key,S.rankSort.dir));
    return layout(`<div class="section-title diagnostic-title"><div><div class="eyebrow">FORCE Rankings</div><h2>All 32 teams</h2><p>Start with strength. Open the other views for context.</p></div><input id="rankSearch" class="search" placeholder="Find team…"></div>
      ${ratingViewControl()}
      ${S.ratingView === 'penalties' ? flagIntroPanel() : ''}
      ${penaltyImpactSortControl()}
      ${S.ratingView === 'units' ? '' : diagnosticNotice()}
      <section class="card" data-export-row-group="16"><div class="table-wrap"><table class="diagnostic-table"><thead>${rankingHeader()}</thead><tbody id="rankBody">
      ${rows.map((r) => rankingRow(r, metricRank[r.team], forceRank[r.team])).join('')}</tbody></table></div></section>
      ${S.ratingView === 'units' ? '<p class="raw">Changes in these unit ratings feed into the overall FORCE Score, but no single unit is allowed to swing the team rating without limit.</p>' : '<p class="raw">FORCE Score is the main team-strength rating. Current unit performance can move it, while Luck and FLAG are context and do not directly change the forecast.</p>'}`, 'rankings');
  }

  const QB_DEFAULT_WEIGHTS = Object.freeze({ epa:30, anya:30, success:20, rushing:10, cpoe:10 });
  const QB_WEIGHT_LABELS = Object.freeze({ epa:'EPA/play', anya:'ANY/A', success:'Success Rate', rushing:'QB rushing value', cpoe:'CPOE' });

  function qbComponentScores(t) {
    const q=qbDebug(t), neutral=50;
    return {
      debug:q,
      epa:Number.isFinite(Number(q.passEpaScore))?Number(q.passEpaScore):neutral,
      anya:Number.isFinite(Number(q.anyAScore))?Number(q.anyAScore):neutral,
      success:Number.isFinite(Number(q.passSuccessScore))?Number(q.passSuccessScore):neutral,
      rushing:Number.isFinite(Number(q.rushingValueScore))?Number(q.rushingValueScore):neutral,
      cpoe:Number.isFinite(Number(q.cpoeScore))?Number(q.cpoeScore):neutral
    };
  }
  function qbCustomOpponentAdjustment(c, weights=S.qbWeights) {
    // V139 opponent context is a separate schedule-strength term based on FORCE QB
    // Rating allowed, not an EPA-only adjustment, so custom stat weights do not rescale it.
    return Number(c.debug?.opponentRatingAdjustment)||0;
  }
  function qbRecencyAdjustment(teamCode) {
    const stored=profile(canon(teamCode))?.qb?.recency_adjustment;
    if (Number.isFinite(Number(stored))) return Number(stored);
    // V140 fallback: current-season form only. The latest four games receive 2.00x,
    // 1.75x, 1.50x and 1.25x weights; older current-season games stay at 1.00x.
    // Convert each game's native metrics to the same FORCE component scale by
    // fitting the current cross-section of native values to component scores.
    const games=(defensiveDriveContextMapBeforeWeek(null)[canon(teamCode)]?.gameRows||[]).filter(g=>Number(g.passAttempts)>0).sort((a,b)=>Number(a.week)-Number(b.week));
    if (games.length<2) return 0;
    const teams=Object.keys(D.teams).map(t=>qbComponentScores(t));
    const fit=(nativeKey,scoreKey)=>{const pts=teams.map(c=>[Number(c.debug?.[nativeKey]),Number(c[scoreKey])]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)); if(pts.length<8)return null; const mx=pts.reduce((a,p)=>a+p[0],0)/pts.length,my=pts.reduce((a,p)=>a+p[1],0)/pts.length; const den=pts.reduce((a,p)=>a+(p[0]-mx)**2,0); if(den<=1e-9)return null; const b=pts.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0)/den; return {a:my-b*mx,b};};
    const fits={epa:fit('actualPassEpaPerAttempt','epa'),anya:fit('anyA','anya'),success:fit('passSuccessRate','success'),rushing:fit('qbRushEpaPerAttempt','rushing'),cpoe:fit('cpoe','cpoe')};
    const scoreGame=g=>{const att=Math.max(1,Number(g.passAttempts)||0), sacks=Math.max(0,Number(g.sacks)||0); const anya=(Number(g.passYards)||0)+20*(Number(g.passTds)||0)-45*(Number(g.interceptions)||0)-(Number(g.sackYards)||0); const vals={epa:(Number(g.passEpa)||0)/att,anya:anya/Math.max(1,att+sacks),success:(Number(g.passSuccesses)||0)/att,rushing:(Number(g.qbRushAttempts)||0)>0?(Number(g.qbRushEpa)||0)/Number(g.qbRushAttempts):0,cpoe:Number(g.cpoe)}; let sum=0,wt=0; for(const [k,w] of Object.entries(QB_DEFAULT_WEIGHTS)){const f=fits[k],v=vals[k]; if(f&&Number.isFinite(v)){sum+=Math.max(0,Math.min(100,f.a+f.b*v))*w;wt+=w;}} return wt?sum/wt:null;};
    const scored=games.map(g=>({g,score:scoreGame(g)})).filter(x=>Number.isFinite(x.score)); if(scored.length<2)return 0;
    const normal=scored.reduce((a,x)=>a+x.score,0)/scored.length; let num=0,den=0; const n=scored.length; scored.forEach((x,i)=>{const rec=n-1-i; const w=rec===0?2:rec===1?1.75:rec===2?1.5:rec===3?1.25:1; num+=x.score*w;den+=w;});
    return Math.max(-4,Math.min(4,0.40*((num/den)-normal)));
  }
  function qbCustomScore(c, weights=S.qbWeights) {
    const total=Object.values(weights).reduce((a,v)=>a+Math.max(0,Number(v)||0),0)||1;
    const uncalibratedBase=Object.keys(QB_DEFAULT_WEIGHTS).reduce((sum,k)=>sum+c[k]*(Math.max(0,Number(weights[k])||0)/total),0);
    const base=(window.FORCE_LIVE_PROFILE?.calibrateQbComposite?window.FORCE_LIVE_PROFILE.calibrateQbComposite(uncalibratedBase):Math.max(0,Math.min(100,50+1.20*(uncalibratedBase-50))));
    return Math.max(0,Math.min(100,base+qbCustomOpponentAdjustment(c,weights)+(Number(c.debug?.olRatingAdjustment)||0)+qbRecencyAdjustment(c.debug?.team)));
  }
  function qbRankingsPage() {
    const custom=S.qbRankingMode==='custom';
    const rows=Object.keys(D.teams).map(t=>{
      const c=qbComponentScores(t), q=c.debug;
      const recencyAdj=qbRecencyAdjustment(t); const rating=custom?qbCustomScore(c):Math.max(0,Math.min(100,Number(q.displayedQbIndex??q.measuredQbIndex??50)));
      return {team:t,qb:q.qb||`${t} quarterbacks`,rating,c,q};
    }).filter(r=>Number.isFinite(r.q.primaryQbDropbackShare) && r.q.primaryQbDropbackShare>=0.60).sort((a,b)=>b.rating-a.rating||a.qb.localeCompare(b.qb));
    const total=Object.values(S.qbWeights).reduce((a,v)=>a+Number(v||0),0);
    const controls=Object.keys(QB_DEFAULT_WEIGHTS).map(k=>`<label class="qb-weight"><span>${QB_WEIGHT_LABELS[k]} <b id="qbWeightOut-${k}">${S.qbWeights[k]}%</b></span><input type="range" min="0" max="100" step="1" value="${S.qbWeights[k]}" data-qb-weight="${k}"></label>`).join('');
    const native=(v,d=2,suffix='')=>Number.isFinite(Number(v))?`${fmt(Number(v),d)}${suffix}`:'-';
    return layout(`<div class="section-title"><div><div class="eyebrow">Quarterback model</div><h2>QB Rankings</h2><p>FORCE's standard quarterback rating, with the underlying football statistics shown in their native units. Main rankings require the listed QB to account for at least 60% of his team's QB dropbacks.</p></div><div class="qb-mode"><button class="${custom?'ghost':'primary'}" data-qb-mode="default">FORCE Default</button><button class="${custom?'primary':'ghost'}" data-qb-mode="custom">Customize</button></div></div>
      <section class="card qb-builder ${custom?'':'qb-builder-disabled'}"><div class="card-head"><div><h2>${custom?'Your QB Rating':'FORCE Default'}</h2><p class="raw">Default: 30% EPA/play · 30% ANY/A · 20% Success Rate · 10% QB rushing value · 10% CPOE, then opponent-strength, pressure-context, and current-season recency adjustments.</p></div><span class="chip">${custom?`Weights normalize automatically · entered ${total}%`:'Predictive default'}</span></div><div class="qb-weight-grid">${controls}</div>${custom?'<p class="raw">Your weights change this ranking only. They do not alter FORCEcast, team FORCE ratings, or the canonical QB unit. Opponent strength is still applied after the weighted components using the canonical leave-one-matchup-out defense context. The Pressure Adjustment remains contextual and unchanged by your stat weights.</p>':'<p class="raw">The default rating is the canonical QB unit used throughout FORCE. The five statistics are combined, then the final 0-100 QB Rating is adjusted for opponent strength and pass protection. The Recency Adjustment uses current-season games only: 2.00x for the latest game, then 1.75x, 1.50x, 1.25x, and 1.00x thereafter; 40% of the recency-weighted rating difference is applied, capped at ±4 points. Pressure Adjustment is 75% standard-rush protection difficulty and 25% performance under disruption relative to league average. Early-season continuity and sample stabilization still apply.</p>'}</section>
      <section class="card"><div class="table-wrap qb-ranking-table-wrap"><table class="diagnostic-table qb-ranking-table"><thead><tr><th>#</th><th>Quarterback</th><th>${custom?'Your QB Rating':'FORCE QB Rating'}</th><th>Raw QB Rating</th><th>Opponent Adjustment</th><th>Pressure Adjustment</th><th>Recency Adjustment</th><th>EPA/play</th><th>ANY/A</th><th>Success</th><th>Rush EPA/att</th><th>CPOE</th></tr></thead><tbody>${rows.map((r,i)=>{const adj=custom?qbCustomOpponentAdjustment(r.c):Number(r.q.opponentRatingAdjustment)||0; const olAdj=Number(r.q.olRatingAdjustment)||0; const recAdj=qbRecencyAdjustment(r.team); const rawRating=Math.max(0,Math.min(100,r.rating-adj-olAdj-recAdj)); const olTitle=`75% protection difficulty / 25% performance under pressure · standard-rush pressure ${r.q.standardRushPressureRate==null?'—':(r.q.standardRushPressureRate*100).toFixed(1)+'%'} · under-pressure EPA ${r.q.pressureEpaPerPlay==null?'—':r.q.pressureEpaPerPlay.toFixed(3)} · success ${r.q.pressureSuccessRate==null?'—':(r.q.pressureSuccessRate*100).toFixed(1)+'%'}`; return `<tr><td><b>${i+1}</b></td><td><span class="qb-name-team"><b>${r.qb}</b>${teamMark(r.team,'xxs','right','qb-team-mark')}</span></td><td class="${bandClass(r.rating)}"><b>${fmt(r.rating,1)}</b></td><td><b>${fmt(rawRating,1)}</b></td><td>${adj>=0?'+':''}${fmt(adj,1)}</td><td title="${olTitle}">${olAdj>=0?'+':''}${fmt(olAdj,1)}</td><td>${recAdj>=0?'+':''}${fmt(recAdj,1)}</td><td>${native(r.q.actualPassEpaPerAttempt,3)}</td><td>${native(r.q.anyA,2)}</td><td>${native(r.q.passSuccessRate==null?null:r.q.passSuccessRate*100,1,'%')}</td><td>${native(r.q.qbRushEpaPerAttempt,2)}</td><td>${native(r.q.cpoe,1)}</td></tr>`}).join('')}</tbody></table></div></section>
      <p class="raw">FORCE QB Rating is the final 0-100 quarterback score after contextual adjustments. Raw QB Rating is the 0-100 score before opponent, pressure, or recency context is applied. Opponent Adjustment is the number of rating points added or subtracted from the leave-one-matchup-out FORCE QB Rating allowed by the defenses faced. Your own matchup against each defense is excluded from that defense’s baseline, and small remaining samples are stabilized toward league average. Recency Adjustment uses current-season games only: 2.00x for the latest game, then 1.75x, 1.50x, 1.25x, and 1.00x thereafter; 40% of the recency-weighted rating difference is applied, capped at ±4 points. Pressure Adjustment is 75% standard-rush protection difficulty and 25% performance under disruption. In live 2026 data, an explicit pressure flag is preferred; when unavailable, FORCE uses a labeled observable-pressure proxy (QB hit, sack, or FTN-charted throwaway). More standard-rush pressure increases contextual credit; better EPA and Success Rate on disrupted dropbacks increases the performance component. Standard-rush disruption uses hit-or-sack outcomes on four-or-fewer-rusher dropbacks, excluding screens, out-of-pocket plays, and QB-fault sacks when FTN charting identifies them. Pressure-performance inputs remain internal to the Pressure Adjustment rather than appearing as separate leaderboard columns. The five-component raw composite is calibrated with a 1.20x expansion around 50 to counter the mechanical tail compression caused by averaging multiple 0-100 component scores; the individual component statistics themselves are unchanged. All displayed individual statistics remain in their actual observed units.</p>`, 'qbs');
  }

  function matchups() {
    const ratings = ratingsWithActiveQBCarryover();
    const games = sortedSchedule();
    const weeks = [...new Set(games.map((g) => g.week))].sort((a, b) => a - b);
    const cw = currentWeekNumber();
    return layout(`<div class="section-title"><div><div class="eyebrow">FORCE Games</div><h2>Forecasts and results</h2><p>Open any game for the full matchup.</p></div>
      <div class="filters"><select id="statusFilter"><option value="all">All games</option><option value="completed">Completed</option><option value="current">Week ${cw}</option><option value="upcoming">Upcoming</option></select><select id="weekFilter"><option value="all">All weeks</option>${weeks.map((w) => `<option>${w}</option>`).join('')}</select><input class="search" id="gameSearch" placeholder="Find team…"></div></div>
      <section class="card" id="gamesList">${games.map((g) => `<div class="game-filter" data-week="${g.week}" data-status="${gamePhase(g)}" data-filter="${team(g.away).name.toLowerCase()} ${team(g.home).name.toLowerCase()} ${g.away.toLowerCase()} ${g.home.toLowerCase()}">${gameCard(g, ratings)}</div>`).join('')}</section>`, 'matchups');
  }

  function teams() {
    const ratings = ratingsWithActiveQBCarryover();
    return layout(`<div class="section-title"><div><div class="eyebrow">Teams</div><h2>Team profiles</h2><p>Rating, context, schedule, and what-ifs.</p></div></div>
      <div class="grid three">${Object.keys(D.teams).sort((a, b) => D.teams[a].name.localeCompare(D.teams[b].name)).map((t) => {
        const r = ratings[t] || D.meta.meanElo;
        const p = projected(t, ratings);
        return `<article class="card kpi team-directory-card team-accent-card" style="${teamAccentStyle(t)}"><button class="team-link team-directory-link" data-team="${t}"><div class="label">${D.teams[t].division}</div><div class="team-directory-name">${teamMark(t, 'sm')}<div class="value" style="font-size:21px">${D.teams[t].name}</div></div><div class="sub">FORCE ${fmt(score(r))} · ${fmt(p.ew)} projected wins</div>${ratingBar(r)}</button>${quickQbButton(t)}</article>`;
      }).join('')}</div>`, 'teams');
  }

  function teamPage(t) {
    t = canon(t); S.team = t;
    const baseRatings = currentRatings();
    const active = qbCarryoverActive(t);
    const autoRestore = automaticQbRegimeCorrection(t);
    const effectiveRestore = effectiveQbCorrection(t);
    const state = currentTeamState(t, baseRatings);
    const ratings = ratingsWithQBCarryover(t, baseRatings);
    const r = state.elo;
    const rawR = state.rawElo;
    const b = base(t);
    const p = projected(t, ratings);
    const baseP = projected(t, baseRatings);
    const sched = S.schedule.filter((g) => g.home === t || g.away === t).sort((a, b2) => a.date.localeCompare(b2.date));
    const current = `${p.w}-${p.l}${p.t ? '-' + p.t : ''}`;
    const overlay = effectiveRestore > 0 ? `<span class="carryover-inline">QB ${active ? 'manual' : 'auto'} +${fmt(r-rawR)} Elo</span>` : '';
    return layout(`<section class="card team-hero">
      ${teamMark(t, 'xl')}<div><div class="eyebrow">${team(t).division}</div><h1>${team(t).name}</h1><div class="raw">Elo ${fmt(r)}${effectiveRestore > 0 ? ` <span class="muted-strike">${fmt(rawR)} base</span>` : ''} · 2025 base ${fmt(b.elo)} · FORCE Score ${fmt(score(r))} ${overlay}</div>${ratingBar(r, 'bar team-bar')}<div class="team-quick-fix">${quickQbButton(t, false)}</div></div>
      <div class="record-big"><strong>${fmt(p.ew)}–${fmt(17 - p.ew)}</strong><span>projected record · current ${current}${effectiveRestore > 0 ? ` · base projection ${fmt(baseP.ew)} wins` : ''}</span></div>
      </section>
      <div class="team-view-toolbar"><div><div class="eyebrow">Explore the team</div><h2>Choose a view</h2></div>${ratingViewControl()}</div>
      ${diagnosticNotice()}
      ${teamDiagnosticPanel(t, r, b, p)}
      ${S.ratingView === 'penalties' ? flagSwingTeamPanel(t) : ''}
      ${qbCarryoverPanel(t, baseRatings)}
      <div class="section-title"><div><div class="eyebrow">2026 Season</div><h2>Schedule & forecast</h2></div></div>
      <section class="card">${sched.length ? sched.map((g) => {
        const opp = g.home === t ? g.away : g.home;
        const home = g.home === t;
        const audit = forecastAudit(g, ratings);
        const prob = home ? audit.fc.probability : 1 - audit.fc.probability;
        let result = `<span class="result future">${Math.round(prob * 100)}% win</span>`;
        if (g.homeScore != null) {
          const ts = home ? g.homeScore : g.awayScore, os = home ? g.awayScore : g.homeScore;
          result = `<span class="result ${ts > os ? 'win' : ts < os ? 'loss' : ''}">${ts > os ? 'W' : ts < os ? 'L' : 'T'} ${ts}-${os}</span>`;
        }
        return `<button class="schedule-row schedule-button audit-row" data-game="${gameHash(g)}" aria-label="Open matchup report for ${team(g.away).name} at ${team(g.home).name}"><span>W${g.week}</span><span class="raw">${g.date}</span><span class="opp"><span class="opp-prefix">${home ? 'vs' : '@'}</span>${teamIdentity(opp, { size: 'xs' })}</span>${result}<span class="schedule-audit">${flagSwingBadge(g)}<b>Pred</b> ${logoizeTeamCodes(audit.line)} · ${logoizeTeamCodes(audit.score)}${audit.actual ? `<br><b>Final</b> ${logoizeTeamCodes(audit.actual)}` : ''}${audit.post ? `<br><b>Rating</b> ${teamToken(g.away)} ${audit.post.awayDelta >= 0 ? '+' : ''}${fmt(audit.post.awayDelta)} · ${teamToken(g.home)} ${audit.post.homeDelta >= 0 ? '+' : ''}${fmt(audit.post.homeDelta)}<br><b>Rematch</b> ${logoizeTeamCodes(audit.post.rematchLine)} · ${logoizeTeamCodes(audit.post.rematchScore)}` : ''}</span></button>`;
      }).join('') : '<div class="loading">Refresh to load the full schedule.</div>'}</section>`, 'teams');
  }

  function lab() {
    const t = S.team || 'BUF';
    const ratings = currentRatings();
    const teamPlayers = D.players.filter((p) => p.team === t).sort((a, b) => a.pos.localeCompare(b.pos) || b.impact - a.impact);
    const others = D.players.filter((p) => p.team !== t).sort((a, b) => b.impact - a.impact).slice(0, 100);
    let delta = 0;
    S.scenario.removed.forEach((n) => {
      const p = D.players.find((x) => x.name === n && x.team === t);
      if (p) delta -= p.impact;
    });
    if (S.scenario.add) {
      const p = D.players.find((x) => x.name === S.scenario.add);
      if (p) {
        if (p.pos === 'QB') {
          const cur = teamPlayers.filter((x) => x.pos === 'QB').sort((a, b) => b.impact - a.impact)[0];
          delta += p.impact - (cur?.impact || 0);
        } else delta += p.impact;
      }
    }
    const r = ratings[t];
    const before = projected(t, ratings);
    const after = projected(t, ratings, delta);
    return layout(`<div class="section-title"><div><div class="eyebrow">Roster what-if</div><h2>Roster Lab</h2></div></div>
      <div class="warning">QB effects use the validated QB signal. Other positions are experimental.</div>
      <div class="lab" style="margin-top:16px"><aside class="card">
        <div class="control"><label>Team</label><select id="labTeam">${Object.keys(D.teams).sort().map((x) => `<option ${x === t ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="control"><label>Add / trade for a player</label><select id="addPlayer"><option value="">No addition</option>${others.map((p) => `<option value="${p.name}" ${S.scenario.add === p.name ? 'selected' : ''}>${p.name} · ${p.pos} · ${p.team} (${p.impact >= 0 ? '+' : ''}${p.impact})</option>`).join('')}</select></div>
        <div class="card-head"><h3>Remove / injury</h3><span class="chip">toggle players</span></div>
        <div class="roster-list">${teamPlayers.map((p) => `<label class="player"><input type="checkbox" data-remove="${p.name}" ${S.scenario.removed.has(p.name) ? 'checked' : ''}><span>${p.name}<small>${p.pos} · ${p.confidence === 'experimental' ? 'experimental' : 'validated QB signal'}</small></span><span class="impact">${p.impact >= 0 ? '+' : ''}${p.impact}</span></label>`).join('') || '<div class="loading">No player rows in base snapshot</div>'}</div>
      </aside><section>
        <div class="card scenario-hero">
          <div class="scenario-stat"><span>FORCE Score</span><strong>${fmt(score(r + delta))}</strong>${ratingBar(r + delta)}<div class="change ${delta >= 0 ? 'positive' : 'negative'}">${delta >= 0 ? '+' : ''}${fmt(score(r + delta) - score(r))}</div></div>
          <div class="scenario-stat"><span>Expected wins</span><strong>${fmt(after.ew)}</strong><div class="change ${after.ew >= before.ew ? 'positive' : 'negative'}">${after.ew >= before.ew ? '+' : ''}${fmt(after.ew - before.ew)}</div></div>
          <div class="scenario-stat"><span>Raw rating delta</span><strong>${delta >= 0 ? '+' : ''}${fmt(delta)}</strong><div class="raw">scenario Elo points</div></div>
        </div>
        <div class="section-title"><div><h2>Remaining schedule impact</h2></div></div>
        <section class="card">${S.schedule.filter((g) => g.homeScore == null && (g.home === t || g.away === t)).map((g) => {
          const opp = g.home === t ? g.away : g.home;
          const home = g.home === t;
          const fc = forecastFor(g, ratings);
          const oldTeamP = home ? fc.probability : 1 - fc.probability;
          const newHomeP = F.applyEloDelta(fc.probability, delta, home, D.config.scale);
          const newTeamP = home ? newHomeP : 1 - newHomeP;
          return `<div class="schedule-row"><span>W${g.week}</span><span class="raw">${g.date}</span><span class="opp"><span class="opp-prefix">${home ? 'vs' : '@'}</span>${teamIdentity(opp, { size: 'xs' })}</span><span>${Math.round(oldTeamP * 100)}% → <b>${Math.round(newTeamP * 100)}%</b></span><span class="${newTeamP >= oldTeamP ? 'positive' : 'negative'}">${newTeamP >= oldTeamP ? '+' : ''}${fmt((newTeamP - oldTeamP) * 100)} pp</span></div>`;
        }).join('') || '<div class="loading">Full remaining schedule appears after live schedule load.</div>'}</section>
      </section></div>`, 'lab');
  }

  function model() {
    const eng = seasonEngine();
    const dg = eng.diagnostics;
    const board = Object.keys(D.teams).map((t) => ({ t, ...adaptiveTeamInfo(t) }))
      .sort((a, b) => Math.abs(b.eloEquivalent || 0) - Math.abs(a.eloEquivalent || 0));
    const currentStatic = dg.staticBrier == null ? '-' : fmt(dg.staticBrier, 4);
    const currentAdaptive = dg.adaptiveBrier == null ? '-' : fmt(dg.adaptiveBrier, 4);
    return layout(`<div class="method wide-method"><div class="eyebrow">Method</div><h1>How FORCE works</h1>
      <p>FORCE starts with a team-strength rating, turns that rating into a game prediction, and checks proposed changes against games the model did not get to learn from first.</p>
      <div class="grid three brier-grid">
        <div class="card kpi"><div class="label">FORCE PREDICTION ERROR</div><div class="value">0.2170</div><div class="sub">Historical test from 2023 through 2025. Lower is better.</div></div>
        <div class="card kpi"><div class="label">CLOSING-LINE ERROR</div><div class="value positive">0.2095</div><div class="sub">Historical betting-market benchmark. Lower is better.</div></div>
        <div class="card kpi"><div class="label">FORCE ADAPTIVE</div><div class="value">RESEARCH</div><div class="sub">Still being tested before it can affect the public forecast.</div></div>
      </div>
      <h2>FORCE Score</h2>
      <p>The main 0 to 100 team-strength rating. A 50 represents an average NFL team. Scores near 0 or 100 are intentionally hard to reach. Betting lines never change this score.</p>
      <p><b>Starting a new season:</b> FORCE does not assume last year's rating carries over perfectly. Before the first new-season game, ${Math.round(eng.offseasonReversion * 100)}% of the gap between each team and the league average is pulled back toward the middle. From there, the new season's completed games move the rating forward normally.</p>
      <h2>FORCEcast</h2>
      <p>FORCEcast is the public game prediction. Early in the season it listens more heavily to the betting market because there is not much new-season evidence yet. The market supplies 75% of the Week 1 prediction, 50% in Week 2, 25% in Week 3, 15% in Week 4, 10% in Week 5, and 5% from Week 6 onward. The win probability and predicted line come from the same final prediction. The predicted score is then generated from 25,000 possession-level simulations centered on that FORCEcast expectation and the matchup's scoring environment.</p>
      <p>The displayed score is adjusted toward point totals that actually occur in football. That keeps the score realistic without changing the underlying win probability. Because of that, the exact score can differ slightly from the betting-style line.</p>
      <h2>Unit profiles</h2>
      <p><b>Offense:</b> 45% overall offensive performance, 25% quarterback play, 15% receivers, and 15% offensive line.</p>
      <p><b>Defense:</b> 36% coverage, 28% run defense, 20% points allowed per opponent drive, and 16% pass rush.</p>
      <p>Those percentages describe how the overall offense and defense scores are built. They are not four extra adjustments piled on top of the final FORCE Score.</p>
      <h2>How new games change unit ratings</h2>
      <p>Early-season samples are noisy, so FORCE does not let one game completely replace what was known before the season. After one game, a typical unit is roughly half current-season evidence and half preseason baseline. After two games, about two-thirds comes from the current season. By four games, about four-fifths comes from the current season. If the early team results are dramatically different from expectations, FORCE can trust the new evidence somewhat faster.</p>
      <p>Quarterback play focuses mostly on passing efficiency, then pass success and completion performance relative to expectation. Positive rushing value can add a smaller bonus. Receiver ratings try to separate what the receiving group created from what came simply from the quarterback and passing environment. Running back ratings lean mostly on rushing efficiency, with receiving work making up the smaller share.</p>
      <p>Pass rush uses the freshest reliable pressure information available. If detailed pressure charting is missing, FORCE can fall back to current QB hits and sacks. It does not treat missing pressure data as zero.</p>
      <h2>How unit ratings reach the team rating</h2>
      <p>When a unit gets better or worse, that movement can change the overall FORCE Score. The effect is limited so a single noisy unit cannot overwhelm the entire team rating. Missing unit data simply add no new movement until reliable data arrive.</p>
      <p>On matchup pages, the overall edge compares one team's offense with the other team's defense. The QB versus coverage and offensive line versus pass rush rows explain parts of that matchup; they are not added a second time.</p>
      <h2>Luck</h2>
      <p>Luck asks whether a team's results have been better or worse than its underlying play would normally produce. Sixty percent compares actual scoring margin with the margin normally associated with the team's play-by-play efficiency. FLAG contributes 20%, fumble recoveries 15%, and unusually fortunate or unfortunate wins and losses 5%. A team can therefore be excellent and still rate as unlucky if it is playing even better than the scoreboard shows.</p>
      <h2>QB return correction</h2>
      <p>A stretch with a replacement quarterback can pull down a team's rating even after the regular starter comes back. Historical testing suggests that giving back a modest part of that lost rating can help, but it does not help every case. FORCE therefore applies the automatic correction only to verified situations and fades it quickly as the returning starter builds a new sample.</p>
      <div class="grid three brier-grid">
        <div class="card kpi"><div class="label">FIRST FOUR WEEKS</div><div class="value positive">-0.0104</div><div class="sub">Historical prediction error improved in 6 of 11 cases.</div></div>
        <div class="card kpi"><div class="label">FIRST EIGHT WEEKS</div><div class="value positive">-0.0094</div><div class="sub">Historical prediction error improved in 7 of 11 cases.</div></div>
        <div class="card kpi"><div class="label">STATUS</div><div class="value" style="font-size:22px">LIMITED USE</div><div class="sub">Automatic only for verified cases; manual what-if available on team pages.</div></div>
      </div>
      <h2>FORCE Adaptive</h2>
      <p>This is a research feature that asks whether the betting market has consistently known something about a particular team that FORCE has missed. It only uses earlier games when judging a later game, and it keeps any adjustment small.</p>
      <div class="formula">Look at earlier games only → compare FORCE with the market → require repeated evidence → limit the size of the adjustment → test the next game.</div>
      <h2>Live research</h2>
      <div class="grid three brier-grid">
        <div class="card kpi"><div class="label">GAMES WITH MARKET DATA</div><div class="value">${dg.marketGames}</div><div class="sub">${dg.weeksObserved} completed week(s) included.</div></div>
        <div class="card kpi"><div class="label">FORCECAST ERROR</div><div class="value">${currentStatic}</div><div class="sub">Current-season prediction error. Lower is better.</div></div>
        <div class="card kpi"><div class="label">ADAPTIVE ERROR</div><div class="value">${currentAdaptive}</div><div class="sub">Research version on the same games. Lower is better.</div></div>
      </div>
      <h2>Adaptive team state</h2>
      <p>This table is for research only. Nothing here changes the public FORCE Score.</p>
      <section class="card"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Games with lines</th><th>FORCE vs market</th><th>Big-favorite games</th><th>Vegas share</th><th>Rating effect</th></tr></thead><tbody>
      ${board.map((x) => `<tr><td><button class="team-link" data-team="${x.t}">${teamIdentity(x.t, { size: 'xs' })}</button></td><td>${x.marketGames}</td><td class="${spreadHistoryReady(x) ? (x.residual >= 0 ? 'positive' : 'negative') : ''}">${spreadHistoryDisplay(x,1,' pts')}</td><td>${x.bigFavoriteGames ? `${signed(x.favoriteResidual,1,' pts')} (${x.bigFavoriteGames})` : '-'}</td><td>${Math.round(x.marketWeight * 100)}%</td><td class="${x.eloEquivalent >= 0 ? 'positive' : 'negative'}">${signed(x.eloEquivalent,1)}</td></tr>`).join('')}
      </tbody></table></div></section>
      <h2>What is allowed to affect predictions?</h2>
      <p>A new stat or adjustment does not get into the forecast just because it looks interesting. FORCE first tests it on games that happened after the data used to build it. If prediction error gets worse, or if the test is not clean enough to trust, that feature gets no predictive weight.</p>
      <div class="formula">Build the idea from past data → test it only on later games → keep it only if prediction error holds steady or improves.</div>
      <p>Right now the forecast can use the core team rating, validated betting-market information, and the limited returning-QB correction. Luck and FLAG remain descriptive unless future testing shows they improve predictions.</p>
    </div>`, 'model');
  }

  function names() {
    return layout(`<div class="method"><div class="eyebrow">Identity</div><h1>Why FORCE?</h1>
      <div class="force-identity-card card">
        <div class="force-wordmark force-wordmark-board"><img class="force-brand-logo force-brand-logo-about" src="assets/force-approved-board.png" alt="FORCE - approved Vector-F identity board"></div>
        <p><b>Football Objective Rating & Comparative Efficiency.</b></p>
        <p>One name for ratings, forecasts, matchup analysis, and roster what-ifs.</p>
      </div>
      <h2>Naming inside the app</h2>
      <div class="brand-language card">
        <div><b>FORCE Score</b><span>Team strength on a 0 to 100 scale. 50 is average, and the endpoints are intentionally difficult to reach.</span></div>
        <div><b>FORCE Rankings</b><span>Teams ordered by FORCE Score.</span></div>
        <div><b>FORCEcast</b><span>Win odds, line, and score.</span></div>
        <div><b>FORCEcast</b><span>Single public win odds, line, and score; blends market by week when available.</span></div>
        <div><b>FORCE Adaptive</b><span>Research version that tests whether some teams should lean a little more or less on the betting market.</span></div>
        <div><b>Roster Lab</b><span>Player what-if tool. Kept plain on purpose.</span></div>
      </div>
      <div class="notice" style="margin-top:16px"><b>Brand principle:</b> use FORCE where it adds meaning. Keep ordinary football terms ordinary.</div>
      <div class="warning"><b>Prototype name.</b> This is a product-design treatment, not trademark or domain clearance.</div>
    </div>`, 'names');
  }

  async function loadExportCss() {
    if (exportCssCache) return exportCssCache;
    const chunks = [...document.querySelectorAll('style')].map((node) => node.textContent || '');
    // CSSOM works even when the prototype is opened directly from disk in browsers that block fetch(file://...).
    for (const sheet of [...document.styleSheets || []]) {
      try {
        const rules = [...(sheet.cssRules || [])].map((rule) => rule.cssText).join('\n');
        if (rules) chunks.push(rules);
      } catch (_) {}
    }
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const external = await Promise.all(links.map(async (link) => {
      try {
        const url = new URL(link.getAttribute('href'), location.href).toString();
        const res = await fetch(url);
        return res.ok ? await res.text() : '';
      } catch (_) {
        return '';
      }
    }));
    exportCssCache = [...chunks, ...external].filter(Boolean).join('\n');
    return exportCssCache;
  }

  function exportPageLabel() {
    const hash = currentRoute();
    const [page, id] = hash.split('/');
    if (page === 'rankings') {
      const viewLabel = RATING_VIEWS.find(([key]) => key === S.ratingView)?.[1] || 'Strength';
      return `FORCE Rankings · ${viewLabel}`;
    }
    if (page === 'divisions') return 'Divisions';
    if (page === 'playoffs') return 'Playoff Picture';
    if (page === 'slate') return `FORCEcast Slate · Week ${Number(S.slateWeek)||currentWeekNumber()}`;
    if (page === 'matchups') return 'Games';
    if (page === 'teams' && id) return `${teamToken(id, 'xxs', team(id).name)} <span>team page</span>`;
    if (page === 'teams') return 'Teams';
    if (page === 'game') {
      const g = findGame(hash.slice('game/'.length));
      return g ? `${teamToken(g.away)} <span>at</span> ${teamToken(g.home)} <span>matchup</span>` : 'Matchup';
    }
    if (page === 'lab') return 'Roster Lab';
    if (page === 'model') return 'Method';
    if (page === 'names') return 'About FORCE';
    return 'NFL ratings & forecasts';
  }

  function forceExportLogoMarkup() {
    // V52: export uses the approved PNG asset instead of a reconstructed SVG.
    // inlineExportBrandImages() converts this exact image to a data URI before PNG serialization.
    return `<img class="force-brand-logo force-brand-logo-export" src="assets/force-approved-export-logo.png" alt="FORCE - Football Objective Rating & Comparative Efficiency">`;
  }

  function exportFileName(index = 1, total = 1) {
    const page = currentRoute().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'page';
    const stamp = new Date().toISOString().slice(0, 10);
    return total > 1
      ? `force-${page}-${stamp}-${index}-of-${total}.png`
      : `force-${page}-${stamp}.png`;
  }

  function exportZipFileName(total = 1) {
    const page = currentRoute().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'page';
    const stamp = new Date().toISOString().slice(0, 10);
    if (page === 'playoffs' && total === 3) return `force-playoffs-${stamp}-overview-plus-mobile.zip`;
    return `force-${page}-${stamp}-${total}-pages.zip`;
  }

  function triggerExportDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  let exportCrcTable = null;
  function crc32(bytes) {
    if (!exportCrcTable) {
      exportCrcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        exportCrcTable[n] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = exportCrcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zipDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    const dosDate = (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    return { dosTime, dosDate };
  }

  function writeU16(view, offset, value) { view.setUint16(offset, value & 0xFFFF, true); }
  function writeU32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  async function buildExportZip(entries) {
    const enc = new TextEncoder();
    const now = zipDosDateTime(new Date());
    const prepared = [];
    let localOffset = 0;

    for (const entry of entries) {
      const name = enc.encode(entry.name);
      const data = new Uint8Array(await entry.blob.arrayBuffer());
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      const lv = new DataView(local.buffer);
      writeU32(lv, 0, 0x04034B50);
      writeU16(lv, 4, 20);
      writeU16(lv, 6, 0x0800);
      writeU16(lv, 8, 0); // stored: PNGs are already compressed
      writeU16(lv, 10, now.dosTime);
      writeU16(lv, 12, now.dosDate);
      writeU32(lv, 14, crc);
      writeU32(lv, 18, data.length);
      writeU32(lv, 22, data.length);
      writeU16(lv, 26, name.length);
      writeU16(lv, 28, 0);
      local.set(name, 30);
      local.set(data, 30 + name.length);
      prepared.push({ name, data, crc, offset: localOffset, local });
      localOffset += local.length;
    }

    const centralChunks = [];
    let centralSize = 0;
    for (const entry of prepared) {
      const c = new Uint8Array(46 + entry.name.length);
      const cv = new DataView(c.buffer);
      writeU32(cv, 0, 0x02014B50);
      writeU16(cv, 4, 20);
      writeU16(cv, 6, 20);
      writeU16(cv, 8, 0x0800);
      writeU16(cv, 10, 0);
      writeU16(cv, 12, now.dosTime);
      writeU16(cv, 14, now.dosDate);
      writeU32(cv, 16, entry.crc);
      writeU32(cv, 20, entry.data.length);
      writeU32(cv, 24, entry.data.length);
      writeU16(cv, 28, entry.name.length);
      writeU16(cv, 30, 0);
      writeU16(cv, 32, 0);
      writeU16(cv, 34, 0);
      writeU16(cv, 36, 0);
      writeU32(cv, 38, 0);
      writeU32(cv, 42, entry.offset);
      c.set(entry.name, 46);
      centralChunks.push(c);
      centralSize += c.length;
    }

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    writeU32(ev, 0, 0x06054B50);
    writeU16(ev, 4, 0);
    writeU16(ev, 6, 0);
    writeU16(ev, 8, prepared.length);
    writeU16(ev, 10, prepared.length);
    writeU32(ev, 12, centralSize);
    writeU32(ev, 16, localOffset);
    writeU16(ev, 20, 0);

    return new Blob([...prepared.map((e) => e.local), ...centralChunks, end], { type: 'application/zip' });
  }

  function exportLayoutConfig() {
    const mobile = (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) || window.innerWidth <= 760;
    if (mobile) {
      const layoutWidth = Math.max(390, Math.min(window.innerWidth - 24 || 390, 430));
      const minHeight = Math.round(layoutWidth * 16 / 9);
      return {
        mobile: true,
        layoutWidth,
        minHeight,
        idealHeight: Math.round(minHeight * 1.10),
        maxHeight: Math.round(minHeight * 1.24),
        scale: 3
      };
    }
    // Social exports should be dense first and 16:9-ish second. 675px is a
    // strict 16:9 frame at 1200px wide; pages may grow modestly when doing so
    // avoids a mostly-empty extra slide or a bad mid-section split.
    return { mobile: false, layoutWidth: 1200, minHeight: 675, idealHeight: 820, maxHeight: 980, scale: 2 };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function inlineExportBrandImages(root) {
    const images = [...root.querySelectorAll('img.force-brand-logo[src]')];
    await Promise.all(images.map(async (img) => {
      try {
        const res = await fetch(img.src, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`brand ${res.status}`);
        img.src = await blobToDataUrl(await res.blob());
      } catch (_) {
        // The export header itself is inline SVG, so a non-critical page-level
        // brand illustration should never be allowed to break PNG generation.
        img.remove();
      }
    }));
  }

  async function inlineExportTeamLogos(root) {
    const images = [...root.querySelectorAll('img.team-mark-img')];
    await Promise.all(images.map(async (img) => {
      try {
        const res = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
        if (!res.ok) throw new Error(`logo ${res.status}`);
        img.src = await blobToDataUrl(await res.blob());
        img.removeAttribute('crossorigin');
        img.removeAttribute('onerror');
      } catch (_) {
        // V67: never replace a failed export logo with an abbreviation badge.
        // Remove the whole mark; surrounding names/labels remain where present.
        img.closest('.team-mark')?.remove();
      }
    }));
  }

  function stripExportTeamLogos(root) {
    // Image-free retry remains a last resort, but it is now truly image-free:
    // do not resurrect abbreviation badges in place of failed logos.
    root.querySelectorAll('.team-mark').forEach((mark) => mark.remove());
  }

  function freezeExportTextStyles(root) {
    // foreignObject rendering can lose inherited text colors/custom-property
    // resolution even when the live DOM looks correct. Freeze the browser's
    // already-computed text presentation onto the export clone so SVG
    // rasterization does not have to reinterpret it.
    const nodes = [root, ...root.querySelectorAll('*')];
    const props = [
      'color', 'font-family', 'font-size', 'font-weight', 'font-style',
      'line-height', 'letter-spacing', 'text-transform', 'text-decoration',
      'text-align', 'white-space', 'word-break', 'text-shadow'
    ];
    nodes.forEach((el) => {
      const cs = getComputedStyle(el);
      props.forEach((prop) => {
        const value = cs.getPropertyValue(prop);
        if (value) el.style.setProperty(prop, value);
      });
      // Chromium may apply a default text fill while painting foreignObject
      // descendants. Pin it to the same computed CSS color.
      if (cs.color) el.style.setProperty('-webkit-text-fill-color', cs.color);
    });
  }

  function outerHeight(el) {
    if (!el) return 0;
    const stamped = el.dataset && Number(el.dataset.exportHeight);
    if (Number.isFinite(stamped) && stamped > 0) return stamped;
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().height + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
  }

  function stampExportHeight(el, height) {
    if (el && el.dataset && Number.isFinite(height) && height > 0) el.dataset.exportHeight = String(Math.ceil(height));
    return el;
  }

  function cloneEmpty(node) {
    const c = node.cloneNode(false);
    c.innerHTML = '';
    return c;
  }

  function splitDuelCard(node, maxHeight) {
    const rows = [...node.children].filter((c) => c.classList && c.classList.contains('duel'));
    if (rows.length < 2 || outerHeight(node) <= maxHeight) return [node];
    const rowHeights = rows.map((row) => outerHeight(row));
    const chrome = Math.max(0, outerHeight(node) - rowHeights.reduce((a, b) => a + b, 0));
    // Smaller chunks let the paginator use otherwise-wasted space above/below
    // the long matchup-edges table instead of pushing the whole table to its
    // own slide. This is intentionally much smaller than a full export page.
    const chunkLimit = Math.min(maxHeight, Math.max(300, maxHeight * 0.48));
    const parts = [];
    let shell = cloneEmpty(node);
    let used = 0;
    rows.forEach((row, idx) => {
      const h = rowHeights[idx];
      if (shell.children.length && used + h + chrome > chunkLimit) {
        stampExportHeight(shell, used + chrome);
        parts.push(shell);
        shell = cloneEmpty(node);
        used = 0;
      }
      shell.appendChild(row.cloneNode(true));
      used += h;
    });
    if (shell.children.length) {
      stampExportHeight(shell, used + chrome);
      parts.push(shell);
    }
    return parts;
  }

  function splitGamesList(node, maxHeight) {
    const items = [...node.children].filter((c) => c.classList && c.classList.contains('game-filter'));
    if (items.length < 2 || outerHeight(node) <= maxHeight) return [node];
    const parts = [];
    let shell = cloneEmpty(node);
    let used = 0;
    items.forEach((item) => {
      const h = outerHeight(item);
      if (shell.children.length && used + h > maxHeight) {
        stampExportHeight(shell, used);
        parts.push(shell);
        shell = cloneEmpty(node);
        used = 0;
      }
      shell.appendChild(item.cloneNode(true));
      used += h;
    });
    if (shell.children.length) { stampExportHeight(shell, used); parts.push(shell); }
    return parts;
  }

  function splitDiagnosticTable(node, maxHeight) {
    const table = node.querySelector('table.diagnostic-table');
    const wrap = node.querySelector('.table-wrap');
    const body = table ? table.querySelector('tbody') : null;
    const head = table ? table.querySelector('thead') : null;
    const rows = body ? [...body.children] : [];
    const forcedRows = Math.max(0, Number(node.getAttribute?.('data-export-row-group')) || 0);
    if (!table || !wrap || !head || rows.length < 2) return [node];
    if (!forcedRows && outerHeight(node) <= maxHeight) return [node];
    const chrome = outerHeight(node) - outerHeight(body);
    const parts = [];
    if (forcedRows) {
      for (let i = 0; i < rows.length; i += forcedRows) {
        const shell = cloneEmpty(node);
        shell.setAttribute('data-export-force-page', '1');
        const shellWrap = wrap.cloneNode(false);
        const shellTable = table.cloneNode(false);
        shellTable.appendChild(head.cloneNode(true));
        const shellBody = body.cloneNode(false);
        rows.slice(i, i + forcedRows).forEach((row) => shellBody.appendChild(row.cloneNode(true)));
        shellTable.appendChild(shellBody);
        shellWrap.appendChild(shellTable);
        shell.appendChild(shellWrap);
        stampExportHeight(shell, chrome + rows.slice(i, i + forcedRows).reduce((sum, row) => sum + outerHeight(row), 0));
        parts.push(shell);
      }
      return parts;
    }
    let shell = cloneEmpty(node);
    let shellWrap = wrap.cloneNode(false);
    let shellTable = table.cloneNode(false);
    shellTable.appendChild(head.cloneNode(true));
    let shellBody = body.cloneNode(false);
    shellTable.appendChild(shellBody);
    shellWrap.appendChild(shellTable);
    shell.appendChild(shellWrap);
    let used = chrome;
    rows.forEach((row) => {
      const h = outerHeight(row);
      if (shellBody.children.length && used + h > maxHeight) {
        stampExportHeight(shell, used);
        parts.push(shell);
        shell = cloneEmpty(node);
        shellWrap = wrap.cloneNode(false);
        shellTable = table.cloneNode(false);
        shellTable.appendChild(head.cloneNode(true));
        shellBody = body.cloneNode(false);
        shellTable.appendChild(shellBody);
        shellWrap.appendChild(shellTable);
        shell.appendChild(shellWrap);
        used = chrome;
      }
      shellBody.appendChild(row.cloneNode(true));
      used += h;
    });
    if (shellBody.children.length) { stampExportHeight(shell, used); parts.push(shell); }
    return parts;
  }

  function splitGridNode(node, maxHeight) {
    const items = [...node.children];
    const cols = node.classList.contains('three') ? 3 : node.classList.contains('two') ? 2 : 1;
    if (items.length <= cols || outerHeight(node) <= maxHeight) return [node];
    const rows = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    const parts = [];
    let shell = cloneEmpty(node);
    let used = 0;
    rows.forEach((row) => {
      const h = Math.max(...row.map((item) => outerHeight(item)));
      if (shell.children.length && used + h > maxHeight) {
        stampExportHeight(shell, used);
        parts.push(shell);
        shell = cloneEmpty(node);
        used = 0;
      }
      row.forEach((item) => shell.appendChild(item.cloneNode(true)));
      used += h;
    });
    if (shell.children.length) { stampExportHeight(shell, used); parts.push(shell); }
    return parts;
  }


  function splitPredictionFinale(node, maxHeight) {
    const predictionGrid = [...node.children].find((c) => c.classList && c.classList.contains('prediction-grid'));
    const eyebrow = [...node.children].find((c) => c.classList && c.classList.contains('eyebrow'));
    const post = [...node.children].find((c) => c.classList && c.classList.contains('postgame-learning'));
    if (!predictionGrid || !post || outerHeight(node) <= maxHeight) return [node];

    const direct = [...node.children];
    const nodeChrome = Math.max(0, outerHeight(node) - direct.reduce((sum, c) => sum + outerHeight(c), 0));
    const postChildren = [...post.children];
    const postChrome = Math.max(0, outerHeight(post) - postChildren.reduce((sum, c) => sum + outerHeight(c), 0));
    const heading = postChildren.find((c) => c.classList && c.classList.contains('postgame-heading'));
    const postGrid = postChildren.find((c) => c.classList && c.classList.contains('postgame-grid'));
    const unit = postChildren.find((c) => c.classList && c.classList.contains('postgame-unit-change'));
    const parts = [];

    // Part 1: the shareable forecast/actual-final summary.
    const forecastShell = cloneEmpty(node);
    if (eyebrow) forecastShell.appendChild(eyebrow.cloneNode(true));
    forecastShell.appendChild(predictionGrid.cloneNode(true));
    stampExportHeight(forecastShell, nodeChrome + (eyebrow ? outerHeight(eyebrow) : 0) + outerHeight(predictionGrid));
    parts.push(forecastShell);

    // Part 2: postgame FORCE movement + rematch outputs.
    if (heading || postGrid) {
      const rematchOuter = cloneEmpty(node);
      const rematchPost = post.cloneNode(false);
      rematchPost.innerHTML = '';
      if (heading) rematchPost.appendChild(heading.cloneNode(true));
      if (postGrid) rematchPost.appendChild(postGrid.cloneNode(true));
      rematchOuter.appendChild(rematchPost);
      stampExportHeight(rematchOuter, nodeChrome + postChrome + (heading ? outerHeight(heading) : 0) + (postGrid ? outerHeight(postGrid) : 0));
      parts.push(rematchOuter);
    }

    // Part 3: the unit update. Keeping it independent prevents a long two-team
    // table from being clipped below a rematch summary.
    if (unit) {
      const unitOuter = cloneEmpty(node);
      const unitPost = post.cloneNode(false);
      unitPost.innerHTML = '';
      unitPost.appendChild(unit.cloneNode(true));
      unitOuter.appendChild(unitPost);
      stampExportHeight(unitOuter, nodeChrome + postChrome + outerHeight(unit));
      parts.push(unitOuter);
    }
    return parts;
  }

  function expandExportNode(node, maxHeight) {
    if (node.classList && node.classList.contains('prediction-finale')) return splitPredictionFinale(node, maxHeight);
    if (node.classList && node.classList.contains('duel-card')) return splitDuelCard(node, maxHeight);
    if (node.id === 'gamesList') return splitGamesList(node, maxHeight);
    if (node.querySelector && node.querySelector('table.diagnostic-table')) return splitDiagnosticTable(node, maxHeight);
    if (node.classList && node.classList.contains('grid') && node.children && node.children.length > (node.classList.contains('three') ? 6 : node.classList.contains('two') ? 4 : 10)) return splitGridNode(node, maxHeight);
    return [node];
  }

  function buildPlayoffExportPages(clone) {
    const brand = clone.querySelector('.social-export-brand');
    const cards = [...clone.querySelectorAll('.playoff-card')];
    if (!brand || cards.length < 2) return null;

    const makeRoot = (width, height, className) => {
      const root = clone.cloneNode(false);
      root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      root.classList.add('playoff-export-page', className);
      root.style.margin = '0';
      root.style.maxWidth = 'none';
      root.style.width = `${width}px`;
      root.style.minHeight = `${height}px`;
      root.style.height = `${height}px`;
      root.style.background = '#070b10';
      return root;
    };

    const brandFor = (suffix) => {
      const node = brand.cloneNode(true);
      const label = node.querySelector(':scope > span');
      if (label) label.textContent = suffix ? `Playoff Picture · ${suffix}` : 'Playoff Picture';
      return node;
    };

    // Landscape share card: both conferences in one true 16:9 frame.
    const overview = makeRoot(1200, 675, 'playoff-export-overview');
    overview.appendChild(brandFor('AFC + NFC'));
    const grid = document.createElement('div');
    grid.className = 'grid two playoff-grid playoff-export-overview-grid';
    cards.slice(0, 2).forEach((card) => grid.appendChild(card.cloneNode(true)));
    overview.appendChild(grid);

    // Portrait/mobile cards: one conference per 9:16 image.
    const mobilePages = cards.slice(0, 2).map((card, idx) => {
      const conf = idx === 0 ? 'AFC' : 'NFC';
      const root = makeRoot(675, 1200, 'playoff-export-mobile');
      root.appendChild(brandFor(conf));
      root.appendChild(card.cloneNode(true));
      return {
        node: root,
        width: 675,
        height: 1200,
        scale: 2,
        filename: `force-playoffs-${new Date().toISOString().slice(0, 10)}-${conf.toLowerCase()}-mobile.png`
      };
    });

    return [
      {
        node: overview,
        width: 1200,
        height: 675,
        scale: 2,
        filename: `force-playoffs-${new Date().toISOString().slice(0, 10)}-overview-16x9.png`
      },
      ...mobilePages
    ];
  }

  function buildExportPages(clone, config) {
    const playoffPages = clone.querySelector('.playoff-grid') ? buildPlayoffExportPages(clone) : null;
    if (playoffPages) return playoffPages;
    const brand = clone.querySelector('.social-export-brand');
    const nodes = [...clone.children].filter((n) => n !== brand);
    const brandH = brand ? outerHeight(brand) : 0;
    const usable = Math.max(240, config.maxHeight - brandH - 18);

    // V79: FORCEcast Slate is intentionally a one-image weekly board. Unlike
    // ordinary pages, let the canvas grow vertically instead of paginating.
    if (clone.querySelector('.slate-board')) {
      const root = clone.cloneNode(false);
      root.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
      root.style.margin='0'; root.style.maxWidth='none'; root.style.width=`${config.layoutWidth}px`;
      if (brand) root.appendChild(brand.cloneNode(true));
      nodes.forEach(node=>root.appendChild(node.cloneNode(true)));
      const contentH=nodes.reduce((sum,node)=>sum+outerHeight(node),0);
      const pageHeight=Math.max(config.minHeight,Math.ceil(brandH+contentH+26));
      root.style.minHeight=`${pageHeight}px`; root.style.height=`${pageHeight}px`; root.style.background='#070b10';
      return [{node:root,height:pageHeight}];
    }
    const expanded = [];
    nodes.forEach((node) => expanded.push(...expandExportNode(node, usable)));

    // Build reasonably atomic blocks. Headings stay with the next block only
    // when that pair is small enough to remain useful for page packing.
    const blocks = [];
    for (let i = 0; i < expanded.length; i++) {
      const node = expanded[i];
      const h = outerHeight(node);
      if (node.classList && node.classList.contains('section-title') && expanded[i + 1]) {
        const next = expanded[i + 1];
        const pairH = h + outerHeight(next);
        if (pairH <= usable * 0.58) {
          blocks.push({ nodes: [node, next], height: pairH });
          i += 1;
          continue;
        }
      }
      if (node.classList && node.classList.contains('matchup-back') && expanded[i + 1] && expanded[i + 1].classList.contains('matchup-hero')) {
        const group = [node, expanded[i + 1]];
        let groupH = h + outerHeight(expanded[i + 1]);
        if (expanded[i + 2] && expanded[i + 2].classList && expanded[i + 2].classList.contains('matchup-kpis')) {
          group.push(expanded[i + 2]);
          groupH += outerHeight(expanded[i + 2]);
          i += 2;
        } else {
          i += 1;
        }
        blocks.push({ nodes: group, height: groupH });
        continue;
      }
      blocks.push({ nodes: [node], height: h });
    }

    const packed = [];
    let current = { blocks: [], used: 0 };
    blocks.forEach((block) => {
      const forcePage = block.nodes.some((node) => node.getAttribute?.('data-export-force-page') === '1');
      if (forcePage) {
        if (current.blocks.length) {
          packed.push(current);
          current = { blocks: [], used: 0 };
        }
        packed.push({ blocks: [block], used: block.height, forcePage: true });
        return;
      }
      if (current.blocks.length && current.used + block.height > usable) {
        packed.push(current);
        current = { blocks: [], used: 0 };
      }
      current.blocks.push(block);
      current.used += block.height;
    });
    if (current.blocks.length) packed.push(current);

    // V70: rebalance any underfilled page, not only the trailing page. Pull
    // logical blocks forward when they fit so context/forecast sections do not
    // get stranded on mostly-empty slides.
    for (let i = 0; i < packed.length - 1; i++) {
      const page = packed[i];
      const next = packed[i + 1];
      if (page.forcePage || next.forcePage) continue;
      let guard = 0;
      while (page.used < usable * 0.58 && next.blocks.length && guard++ < 8) {
        const candidate = next.blocks[0];
        if (page.used + candidate.height > usable) break;
        page.blocks.push(next.blocks.shift());
        page.used += candidate.height;
        next.used -= candidate.height;
      }
      if (!next.blocks.length) { packed.splice(i + 1, 1); i -= 1; }
    }

    // A tiny last page is worse than a modestly taller previous page. Try to
    // absorb it first; otherwise rebalance one logical block from the prior
    // page so both slides carry useful information.
    if (packed.length > 1) {
      const last = packed[packed.length - 1];
      const prev = packed[packed.length - 2];
      if (!last.forcePage && !prev.forcePage && last.used < usable * 0.42 && prev.used + last.used <= usable) {
        prev.blocks.push(...last.blocks);
        prev.used += last.used;
        packed.pop();
      } else if (!last.forcePage && !prev.forcePage && last.used < usable * 0.42 && prev.blocks.length > 1) {
        const candidate = prev.blocks[prev.blocks.length - 1];
        if (last.used + candidate.height <= usable && prev.used - candidate.height >= usable * 0.48) {
          prev.blocks.pop();
          prev.used -= candidate.height;
          last.blocks.unshift(candidate);
          last.used += candidate.height;
        }
      }
    }

    // Rankings force exactly 16 team rows per page. Do not clamp a forced
    // table page to the generic social max-height, because doing so can clip
    // rows 15–16 (and 31–32) even though the data chunk itself is correct.
    const rawHeights = packed.map((page) => {
      const needed=Math.ceil(brandH + page.used + 20);
      return page.forcePage ? Math.max(config.minHeight,needed) : Math.max(config.minHeight,Math.min(config.maxHeight,needed));
    });
    const normalizedHeight = packed.length > 1 ? Math.max(...rawHeights) : rawHeights[0];
    return packed.map((page, idx) => {
      const root = clone.cloneNode(false);
      root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      root.style.margin = '0';
      root.style.maxWidth = 'none';
      root.style.width = `${config.layoutWidth}px`;
      const pageHeight = normalizedHeight;
      root.style.minHeight = `${pageHeight}px`;
      root.style.height = `${pageHeight}px`;
      root.style.background = '#070b10';
      if (brand) {
        const brandClone = brand.cloneNode(true);
        const pager = document.createElement('span');
        pager.className = 'social-export-page';
        pager.textContent = packed.length > 1 ? `Page ${idx + 1} of ${packed.length}` : '';
        brandClone.appendChild(pager);
        root.appendChild(brandClone);
      }
      page.blocks.forEach((block) => block.nodes.forEach((node) => root.appendChild(node.cloneNode(true))));
      return { node: root, height: pageHeight };
    });
  }

  // V129: the export document is XML, not HTML. CSS inserted directly into an
  // SVG <style> node must therefore escape XML-significant text. V122's FLAG
  // stylesheet introduced a literal ampersand in a comment ("Leverage &
  // Advantage"), which made the whole serialized SVG malformed and caused
  // Image.onerror before canvas rendering. Escape the stylesheet payload at
  // the serialization boundary so future CSS text cannot repeat this failure.
  function escapeExportXmlText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function exportSvgMarkup(node, cssText, width, height) {
    const markup = new XMLSerializer().serializeToString(node);
    const exportCss = `html,body{margin:0;padding:0;background:#070b10;color:#f5f7fa;width:${width}px;height:${height}px;min-height:${height}px}.export-capture{padding:0;box-sizing:border-box;min-height:${height}px;background:#070b10}.social-export-page{opacity:.75;font-size:12px;margin-left:auto}`;
    const safeCss=escapeExportXmlText(`${exportCss}${String(cssText||'').replace(/<\/style>/gi,'')}`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#070b10"/><style>${safeCss}</style><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
  }

  function exportSvgDataUrl(svg) {
    // Chrome/WebKit can mark a canvas as tainted when an SVG containing
    // <foreignObject> is loaded through a blob: URL and then drawn to canvas.
    // A data: URL keeps the same self-contained SVG origin-clean in Chromium.
    return new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not encode export image'));
      reader.readAsDataURL(blob);
    });
  }

  async function loadExportSvg(svg) {
    const img = new Image();
    const src = await exportSvgDataUrl(svg);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => {
        const rawAmpersands=(String(svg).match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi)||[]).length;
        reject(new Error(`Browser could not render the export image${rawAmpersands ? ` (${rawAmpersands} unescaped XML ampersand${rawAmpersands===1?'':'s'} remain)` : ''}`));
      };
      img.src = src;
    });
    return img;
  }


  async function renderExportPngBlob(clone, cssText, width, height, scale = 2) {
    const img = await loadExportSvg(exportSvgMarkup(clone, cssText, width, height));
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser');
    ctx.fillStyle = '#050b12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas PNG encoding failed')), 'image/png');
      } catch (err) {
        reject(err);
      }
    });
  }

  // V126: SVG foreignObject export-safe FLAG representation. The live UI keeps
  // the richer gradient gauge and Swing card, while the cloned export DOM uses
  // plain text and simple boxes that Chromium reliably rasterizes.
  function simplifyFlagForExport(root) {
    if (!root) return;
    root.querySelectorAll('.flag-intro-scale').forEach((scale) => {
      const replacement=document.createElement('div');
      replacement.className='flag-export-scale-key';
      replacement.innerHTML='<span>0 HARM</span><b>50 NEUTRAL</b><span>100 BENEFIT</span>';
      scale.replaceWith(replacement);
    });
    root.querySelectorAll('.flag-gauge').forEach((gauge) => {
      const rawScore=Number(gauge.dataset?.flagScore);
      const score=Number.isFinite(rawScore) ? Math.max(0,Math.min(100,rawScore)) : Number((gauge.getAttribute('aria-label')||'').match(/FLAG\s+([0-9.]+)/i)?.[1]);
      const label=gauge.dataset?.flagLabel || (Number.isFinite(score) ? flagScoreLabel(score) : 'Unavailable');
      const replacement=document.createElement('div');
      replacement.className='flag-export-summary';
      replacement.setAttribute('aria-label', gauge.getAttribute('aria-label') || 'FLAG');
      replacement.innerHTML=`<b>FLAG ${Number.isFinite(score)?fmt(score,0):'—'}</b><span>${label}</span>`;
      gauge.replaceWith(replacement);
    });
    root.querySelectorAll('.flag-swing-banner').forEach((banner) => {
      const winner=canon(banner.dataset?.flagWinner||'');
      const epa=Number(banner.dataset?.flagEpa);
      const wpa=Number(banner.dataset?.flagWpa);
      const margin=Number(banner.dataset?.flagMargin);
      const compact=document.createElement('section');
      compact.className='card flag-export-swing';
      const detail=[
        winner ? `${winner} penalty benefit` : 'Winner penalty benefit',
        Number.isFinite(epa) ? signed(epa,2,' expected points') : null,
        Number.isFinite(wpa) ? signed(wpa*100,1,' win-chance points') : null,
        Number.isFinite(margin) ? `${fmt(margin,0)}-point final margin` : null
      ].filter(Boolean).join(' · ');
      compact.innerHTML=`<span class="flag-swing-chip">FLAG SWING</span><div><b>Penalty impact was large enough to be plausibly result-relevant</b>${detail?`<p>${detail}</p>`:''}</div>`;
      banner.replaceWith(compact);
    });
  }

  // V128: export clones are pictures, not interactive documents. Chromium's
  // foreignObject renderer is more reliable when table buttons/links are plain
  // inline elements, especially after V127's contextual Luck-rank change.
  function simplifyInteractiveControlsForExport(root) {
    if (!root) return;
    root.querySelectorAll('button, a').forEach((control) => {
      if (control.classList?.contains('export-preserve-control')) return;
      const replacement=document.createElement('span');
      replacement.className=control.className || '';
      replacement.innerHTML=control.innerHTML;
      const style=control.getAttribute('style');
      if (style) replacement.setAttribute('style',style);
      const aria=control.getAttribute('aria-label');
      if (aria) replacement.setAttribute('aria-label',aria);
      control.replaceWith(replacement);
    });
  }

  function prepareCloneForSocialExport(clone) {
    if (!clone) return;
    simplifyFlagForExport(clone);
    simplifyInteractiveControlsForExport(clone);
    clone.classList.add('export-compact-copy');
    clone.querySelectorAll([
      '.diagnostic-note',
      '.forecast-audit-strip',
      '.market-detail',
      '.open-game',
      '.matchup-footnote',
      '.matchup-qb-line',
      '.hero p',
      '.section-title p',
      '.score-explain .raw',
      '.ranking-entry-actions .raw',
      '.refresh-warning',
      '.matchup-strengths',
      '.slate-controls'
    ].join(',')).forEach((el) => el.remove());
    clone.querySelectorAll('.sub, small').forEach((el) => el.remove());
  }

  async function exportCurrentPagePng(button = document.getElementById('exportPng')) {
    const target = document.getElementById('exportCapture') || document.querySelector('.shell');
    if (!target) return;
    const oldLabel = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Preparing…'; }
    let staging = null;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const cssText = await loadExportCss();
      const config = exportLayoutConfig();
      const clone = target.cloneNode(true);
      // V146: the live QB leaderboard intentionally scrolls at 1500px+, but a
      // normal desktop export canvas is only 1200px wide. Expand only the QB
      // export canvas so all native-stat columns are captured instead of
      // clipping around ANY/A; the interactive page keeps its scroll behavior.
      if (clone.querySelector('.qb-ranking-table')) {
        config.layoutWidth = Math.max(config.layoutWidth, 1600);
        // V147: QB PNGs are share cards, not a replacement for the site's Method
        // copy. Export only the ranking board and balance qualifying QBs across
        // two pages (odd totals put the extra row on page 1: 27 -> 14 + 13).
        clone.querySelectorAll('.qb-builder, p.raw').forEach((el) => el.remove());
        const qbTable = clone.querySelector('.qb-ranking-table');
        const qbCard = qbTable?.closest('section.card');
        const qbRows = qbTable ? qbTable.querySelectorAll('tbody tr').length : 0;
        if (qbCard && qbRows > 1) qbCard.setAttribute('data-export-row-group', String(Math.ceil(qbRows / 2)));
      }
      // Social exports should contain information, not navigation or boilerplate.
      // Removing these also prevents a tiny footer-only trailing page.
      clone.querySelectorAll('.footer, .matchup-warning, .matchup-back, .qb-quick').forEach((el) => el.remove());
      if (currentRoute().split('/')[0] === 'rankings') {
        // Every FORCE Rankings sub-tab exports as the same two-page board:
        // teams 1–16, then 17–32. Strip screen-only controls/notes so they
        // cannot create a third page around the two forced table chunks.
        clone.querySelectorAll('.section-title, .diagnostic-viewer, .diagnostic-note, .penalty-sort-toolbar, p.raw').forEach((el) => el.remove());
        // Export the complete 32-team board even if the on-screen search box
        // currently hides rows; the two PNGs are always teams 1–16 and 17–32.
        clone.querySelectorAll('#rankBody tr').forEach((row) => { row.style.display = ''; });
      }
      prepareCloneForSocialExport(clone);
      clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      clone.style.margin = '0';
      clone.style.maxWidth = 'none';
      clone.style.width = `${config.layoutWidth}px`;
      clone.style.background = '#050b12';
      const brand = document.createElement('div');
      brand.className = 'social-export-brand';
      brand.innerHTML = `<div class="social-export-wordmark">${forceExportLogoMarkup()}</div><span>${exportPageLabel()}</span>`;
      clone.insertBefore(brand, clone.firstChild);
      // Inline after adding the export header so team marks used by team/game
      // page labels are self-contained too, not just marks in page content.
      await Promise.all([inlineExportTeamLogos(clone), inlineExportBrandImages(clone)]);

      staging = document.createElement('div');
      staging.className = 'export-staging';
      staging.style.cssText = `position:fixed;left:-20000px;top:0;width:${config.layoutWidth}px;pointer-events:none;z-index:-1;`;
      staging.appendChild(clone);
      document.body.appendChild(staging);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      freezeExportTextStyles(clone);
      const pages = buildExportPages(clone, config);
      staging.remove(); staging = null;

      const pngEntries = [];
      for (let i = 0; i < pages.length; i++) {
        if (button) button.textContent = `Rendering ${i + 1}/${pages.length}…`;
        const page = pages[i];
        let png;
        try {
          png = await renderExportPngBlob(page.node, cssText, page.width || config.layoutWidth, page.height, page.scale || config.scale);
        } catch (firstError) {
          console.warn('FORCE PNG export retrying without image assets', firstError);
          stripExportTeamLogos(page.node);
          try {
            png = await renderExportPngBlob(page.node, cssText, page.width || config.layoutWidth, page.height, page.scale || config.scale);
          } catch (secondError) {
            console.warn('FORCE PNG export retrying with export-safe FLAG markup', secondError);
            simplifyFlagForExport(page.node);
            png = await renderExportPngBlob(page.node, cssText, page.width || config.layoutWidth, page.height, page.scale || config.scale);
          }
        }
        pngEntries.push({ name: page.filename || exportFileName(i + 1, pages.length), blob: png });
      }

      if (pngEntries.length === 1) {
        if (button) button.textContent = 'Downloading…';
        triggerExportDownload(pngEntries[0].blob, pngEntries[0].name);
      } else {
        if (button) button.textContent = `Packing ${pngEntries.length} pages…`;
        const zip = await buildExportZip(pngEntries);
        triggerExportDownload(zip, exportZipFileName(pngEntries.length));
      }
    } catch (err) {
      console.error(err);
      const detail = err && err.message ? err.message : 'unknown browser error';
      alert(`PNG export failed: ${detail}`);
    } finally {
      if (staging) staging.remove();
      if (button) { button.disabled = false; button.textContent = oldLabel || 'Export PNG'; }
    }
  }

  function criticalRuntimeModulesMissing() {
    const required=[['forecast engine',F],['score normalizer',SN],['live profiles',LP],['unit bridge',UFB]];
    return required.filter(([,value])=>!value).map(([name])=>name);
  }

  function runtimeModuleBlocked(missing) {
    return `<main class="shell"><section class="card method data-integrity-block"><div class="eyebrow">Runtime integrity gate</div><h1>FORCE did not load completely</h1><p>Required model modules are missing: <b>${missing.join(', ')}</b>.</p><p>FORCE will not silently fall back to simplified ratings or score rounding. Reload the app from the complete V82 bundle.</p></section></main>`;
  }


  const PUBLIC_PATH_BY_PAGE = Object.freeze({
    home: '/',
    rankings: '/rankings',
    qbs: '/qb-rankings',
    divisions: '/divisions',
    playoffs: '/playoff-picture',
    slate: '/forcecast-slate',
    matchups: '/games',
    teams: '/teams',
    update: '/update',
    lab: '/roster-lab',
    model: '/method',
    names: '/about'
  });

  const USE_HASH_ROUTING = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

  function currentRoute() {
    // Preserve all existing local / legacy # routes.
    const legacyHash = location.hash.replace(/^#/, '');
    if (legacyHash) return legacyHash;

    const segments = (location.pathname || '/')
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    if (!segments.length) return 'home';

    const [head, ...rest] = segments;
    const pathToPage = {
      rankings: 'rankings',
      'qb-rankings': 'qbs',
      divisions: 'divisions',
      'playoff-picture': 'playoffs',
      'forcecast-slate': 'slate',
      games: 'matchups',
      teams: 'teams',
      update: 'update',
      'roster-lab': 'lab',
      method: 'model',
      about: 'names'
    };

    const page = pathToPage[head] || 'home';

    if (page === 'teams' && rest.length) {
      return `teams/${rest.join('/')}`;
    }

    if (page === 'matchups' && rest.length) {
      return `game/${rest.join('/')}`;
    }

    return page;
  }

  function publicPathForRoute(route) {
    const [page, ...rest] = String(route || 'home').split('/');

    if (page === 'teams' && rest.length) {
      return `/teams/${rest.map(encodeURIComponent).join('/')}`;
    }

    if (page === 'game' && rest.length) {
      return `/games/${rest.map(encodeURIComponent).join('/')}`;
    }

    return PUBLIC_PATH_BY_PAGE[page] || '/';
  }

  function navigateRoute(route) {
    if (USE_HASH_ROUTING) {
      location.hash = route;
      return;
    }

    history.pushState(null, '', publicPathForRoute(route));
    render();
  }

  function render() {
    const hash = currentRoute();
    const parts = hash.split('/');
    const page = parts[0];
    const missingModules=criticalRuntimeModulesMissing();
    if (missingModules.length && !ALLOW_DEGRADED_TEST_DATA) { app.innerHTML=runtimeModuleBlocked(missingModules); return; }
    const currentDependent=new Set(['home','rankings','qbs','divisions','playoffs','slate','matchups','teams','game','lab']);
    if (!ALLOW_DEGRADED_TEST_DATA && S.initialRefreshDone && currentDependent.has(page)) {
      const integrity=currentDataIntegrity();
      diag('integrity:render-check',{page,ready:integrity.ready,missing:integrity.missing,pending:integrity.pending});
      if (!integrity.ready) { diag('integrity:render-blocked',{page,missing:integrity.missing}); app.innerHTML=dataIntegrityBlocked(page,integrity); bind(); return; }
    }
    const content = page === 'home' ? home()
      : page === 'rankings' ? rankings()
      : page === 'qbs' ? qbRankingsPage()
      : page === 'divisions' ? divisionsPage()
      : page === 'playoffs' ? playoffPicturePage()
      : page === 'slate' ? forcecastSlatePage()
      : page === 'matchups' ? matchups()
      : page === 'teams' ? (parts[1] ? teamPage(parts[1]) : teams())
      : page === 'update' ? updateCenter()
      : page === 'lab' ? lab()
      : page === 'model' ? model()
      : page === 'game' ? (findGame(parts.slice(1).join('/')) ? matchupPage(findGame(parts.slice(1).join('/'))) : matchups())
      : page === 'names' ? names()
      : home();
    app.innerHTML = content;
    bind();
  }

  function bind() {
    document.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => { navigateRoute(b.dataset.nav); }; });
    document.querySelectorAll('[data-team]').forEach((b) => { b.onclick = () => { navigateRoute('teams/' + b.dataset.team); }; });
    document.querySelectorAll('[data-game]').forEach((b) => { b.onclick = () => { navigateRoute('game/' + b.dataset.game); }; });
    document.querySelectorAll('[data-labteam]').forEach((b) => {
      b.onclick = () => { S.team = b.dataset.labteam; S.scenario = { removed: new Set(), add: null }; navigateRoute('lab'); };
    });
    const slateWeek=document.getElementById('slateWeek');
    if(slateWeek) slateWeek.onchange=()=>{ S.slateWeek=Number(slateWeek.value); render(); };
    document.querySelectorAll('[data-qb-mode]').forEach((b)=>{ b.onclick=()=>{ S.qbRankingMode=b.dataset.qbMode==='custom'?'custom':'default'; render(); }; });
    document.querySelectorAll('[data-qb-weight]').forEach((input)=>{ input.disabled=S.qbRankingMode!=='custom'; input.oninput=()=>{ S.qbWeights[input.dataset.qbWeight]=Number(input.value); render(); }; });

    const refresh = document.getElementById('refreshData');
    if (refresh) refresh.onclick = () => refreshSchedule('manual', Object.keys(D.teams));
    const updateAll=document.getElementById('updateAllTeams');
    if (updateAll) updateAll.onclick=()=>refreshSchedule('update-all',Object.keys(D.teams));
    const updateStale=document.getElementById('updateStaleTeams');
    if (updateStale) updateStale.onclick=()=>{
      const targets=Object.keys(D.teams).filter(t=>['partial','stale'].includes(teamUpdateStatus(t)));
      if (targets.length) refreshSchedule('update-stale',targets);
    };
    const collectDiagnostics=document.getElementById('collectDiagnostics');
    if (collectDiagnostics) collectDiagnostics.onclick=async()=>{
      const output=document.getElementById('diagnosticOutput');
      const feedback=document.getElementById('diagnosticFeedback');
      const oldLabel=collectDiagnostics.textContent;
      collectDiagnostics.disabled=true;
      collectDiagnostics.textContent='Collecting…';
      if (feedback) feedback.textContent='Collecting browser + local proxy diagnostics…';
      try {
        const text=await window.FORCE_DIAGNOSTICS.report();
        if (output) { output.hidden=false; output.value=text; output.focus(); output.select(); }
        try { await (typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('clipboard unavailable'))); if (feedback) feedback.textContent='Diagnostic report collected and copied. If clipboard access was blocked, the full report is selected below.'; }
        catch (_) { if (feedback) feedback.textContent='Diagnostic report collected. Clipboard access was blocked, so the full report is selected below.'; }
      } catch (error) {
        if (feedback) feedback.textContent=`Diagnostic collection failed: ${error?.message || error}`;
      } finally {
        collectDiagnostics.disabled=false;
        collectDiagnostics.textContent=oldLabel;
      }
    };
    document.querySelectorAll('[data-update-team]').forEach((b)=>{ b.onclick=()=>refreshSchedule(`update-${b.dataset.updateTeam}`,[b.dataset.updateTeam]); });
    document.querySelectorAll('[data-save-pressure]').forEach((b)=>{ b.onclick=()=>saveManualPressure(b.dataset.savePressure,b); });
    const exportBtn = document.getElementById('exportPng');
    if (exportBtn) exportBtn.onclick = () => exportCurrentPagePng(exportBtn);
    const exportBtnMobile = document.getElementById('exportPngMobile');
    if (exportBtnMobile) exportBtnMobile.onclick = () => exportCurrentPagePng(exportBtnMobile);

    const qbcRange = document.getElementById('qbCarryoverElo');
    const qbcOut = document.getElementById('qbCarryoverValue');
    if (qbcRange && qbcOut) qbcRange.oninput = () => { qbcOut.textContent = `+${fmt(Number(qbcRange.value))} Elo`; };
    const applyQbc = document.getElementById('applyQBCarryover');
    if (applyQbc) applyQbc.onclick = () => {
      const teamCode = S.team;
      const qbSel = document.getElementById('qbCarryoverQB');
      const elo = document.getElementById('qbCarryoverElo');
      S.qbCarryover = { enabled: true, team: teamCode, qb: qbSel?.value || 'Returning starter', restoreElo: Math.max(0, Number(elo?.value || 0)) };
      render();
    };
    const clearQbc = document.getElementById('clearQBCarryover');
    if (clearQbc) clearQbc.onclick = () => { S.qbCarryover.enabled = false; render(); };

    document.querySelectorAll('[data-qbquick]').forEach((b) => {
      b.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        const t = canon(b.dataset.qbquick);
        const preset = qbCarryoverPreset(t);
        if (!preset) return;
        if (qbCarryoverActive(t)) S.qbCarryover.enabled = false;
        else S.qbCarryover = { enabled: true, team: t, qb: preset.qb, restoreElo: Number(preset.suggestedRestoreElo || 0) };
        render();
      };
    });

    document.querySelectorAll('[data-ranksort]').forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.ranksort;
        if (S.rankSort.key === key) S.rankSort.dir = S.rankSort.dir === 'desc' ? 'asc' : 'desc';
        else { S.rankSort.key = key; S.rankSort.dir = 'desc'; }
        render();
      };
    });

    document.querySelectorAll('[data-penaltysort]').forEach((b) => {
      b.onclick = () => {
        S.rankSort = { key: 'penEPA', dir: b.dataset.penaltysort === 'asc' ? 'asc' : 'desc' };
        render();
      };
    });

    document.querySelectorAll('[data-ratingview]').forEach((b) => {
      b.onclick = () => {
        const nextView = b.dataset.ratingview;
        S.ratingView = nextView;
        if (nextView === 'penalties') S.rankSort = { key: 'penEPA', dir: 'desc' };
        else if (!sortKeysForView(S.ratingView).includes(S.rankSort.key)) S.rankSort = { key: 'force', dir: 'desc' };
        localStorage.setItem('forceRatingView', S.ratingView);
        render();
      };
    });

    const rs = document.getElementById('rankSearch');
    if (rs) rs.oninput = () => document.querySelectorAll('#rankBody tr').forEach((tr) => {
      tr.style.display = tr.dataset.filter.includes(rs.value.toLowerCase()) ? '' : 'none';
    });

    const wf = document.getElementById('weekFilter'), sf = document.getElementById('statusFilter'), gs = document.getElementById('gameSearch');
    function filterGames() {
      document.querySelectorAll('.game-filter').forEach((x) => {
        const okW = !wf || wf.value === 'all' || x.dataset.week === wf.value;
        const okP = !sf || sf.value === 'all' || x.dataset.status === sf.value;
        const okS = !gs || x.dataset.filter.includes(gs.value.toLowerCase());
        x.style.display = okW && okP && okS ? '' : 'none';
      });
    }
    if (wf) wf.onchange = filterGames;
    if (sf) sf.onchange = filterGames;
    if (gs) gs.oninput = filterGames;

    const lt = document.getElementById('labTeam');
    if (lt) lt.onchange = () => { S.team = lt.value; S.scenario = { removed: new Set(), add: null }; render(); };
    const ap = document.getElementById('addPlayer');
    if (ap) ap.onchange = () => { S.scenario.add = ap.value || null; render(); };
    document.querySelectorAll('[data-remove]').forEach((x) => {
      x.onchange = () => { x.checked ? S.scenario.removed.add(x.dataset.remove) : S.scenario.removed.delete(x.dataset.remove); render(); };
    });
  }

  if (window.__FORCE_TEST_MODE__) {
    window.FORCE_PROJECTION_TEST_HOOKS = {
      recordPct, tiebreakCompare, resolveDivisionTie, resolveCrossDivisionWildcardTie,
      selectWildcardTeam, rankConferenceCandidates, rankDivisionTeams, buildConferenceField, addProjectedOutcome, selectRepresentativeProjection
    };
    return;
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('popstate', render);
  window.addEventListener('online', () => { diag('browser:online-event',{navigatorOnline:(typeof navigator !== 'undefined' ? navigator.onLine : null)}); refreshPublishedSnapshot('online'); });
  window.addEventListener('offline', () => { S.connectionState='offline'; diag('browser:offline-event',{navigatorOnline:(typeof navigator !== 'undefined' ? navigator.onLine : null)}); render(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!S.lastRefreshAt || Date.now() - S.lastRefreshAt >= REFRESH_MS)) {
      refreshPublishedSnapshot('visibility-catchup');
    }
  });
  setInterval(() => refreshPublishedSnapshot('snapshot-poll'), PUBLIC_SNAPSHOT_POLL_MS);
  setInterval(updateRefreshControls, 30000);
  const missingAtBoot=criticalRuntimeModulesMissing();
  diag('boot',{version:FORCE_DIAG_VERSION,protocol:location.protocol,origin:location.origin,pathname:location.pathname,navigatorOnline:(typeof navigator !== 'undefined' ? navigator.onLine : null),missingModules:missingAtBoot,embeddedFallbackScheduleRows:S.schedule.length});
  if (missingAtBoot.length && !ALLOW_DEGRADED_TEST_DATA) app.innerHTML=runtimeModuleBlocked(missingAtBoot);
  else if (ALLOW_DEGRADED_TEST_DATA) render();
  else {
    const slowBootTimer = setTimeout(() => {
      const detail = document.querySelector('.force-boot-detail');
      if (detail) detail.textContent = 'Finishing live data sync…';
    }, FORCE_BOOT_MIN_MS + 100);
    initialCanonicalBootstrap()
      .catch((error) => {
        S.refreshError = error?.message || 'initial bootstrap failed';
        diag('bootstrap:initial-failed', {error:diagnosticError(error)});
        render();
      })
      .finally(() => clearTimeout(slowBootTimer));
  }
})();
