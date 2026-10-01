#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser
from datetime import datetime, timezone
from pathlib import Path
import html as html_lib
import json
import csv
import io
import os
import re
import time
import threading
import gzip
import hashlib
import math
import webbrowser

PORT = 8080
BASE_DIR = Path(__file__).resolve().parent
UPSTREAMS = {
    '/api/schedule': 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
    '/api/team-stats': 'https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2026.csv',
    '/api/player-stats': 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv',
    '/api/pfr-pass': 'https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_week_pass_2026.csv',
    '/api/pfr-pass-prior': 'https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_week_pass_2025.csv',
    '/api/ftn-charting': 'https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2026.csv',
}
TTL = {'/api/schedule': 300, '/api/team-stats': 900, '/api/player-stats': 900, '/api/pfr-pass': 3600, '/api/pfr-pass-prior': 21600, '/api/ftn-charting': 1800}
CACHE = {}
LOCK = threading.Lock()
APP_VERSION = 'V149'
SERVER_DIAG_VERSION = 'V149-DIAG-1'
SERVER_DIAG_MAX_EVENTS = 600
SERVER_DIAG_EVENTS = []
SERVER_DIAG_LOCK = threading.Lock()
SERVER_STARTED_AT = datetime.now(timezone.utc).isoformat()

def _server_diag(event, **detail):
    entry = {'at': datetime.now(timezone.utc).isoformat(), 'event': event, **detail}
    with SERVER_DIAG_LOCK:
        SERVER_DIAG_EVENTS.append(entry)
        if len(SERVER_DIAG_EVENTS) > SERVER_DIAG_MAX_EVENTS:
            del SERVER_DIAG_EVENTS[:-SERVER_DIAG_MAX_EVENTS]
    try:
        print('[FORCE-DIAG] ' + json.dumps(entry, separators=(',', ':'), default=str), flush=True)
    except Exception:
        pass
    return entry

def _csv_body_summary(body):
    try:
        text = body.decode('utf-8', errors='replace') if isinstance(body, (bytes, bytearray)) else str(body or '')
        reader = csv.DictReader(io.StringIO(text))
        fields = list(reader.fieldnames or [])
        rows = 0
        seasons, weeks, teams = set(), set(), set()
        rows_by_week = {}
        for row in reader:
            rows += 1
            season = str(row.get('season') or '')
            if season:
                seasons.add(season)
            week = str(row.get('week') or '')
            if week:
                weeks.add(week)
                rows_by_week[week] = rows_by_week.get(week, 0) + 1
            team = _canon_team_code(row.get('team') or row.get('recent_team') or '')
            if team:
                teams.add(team)
        return {'rows': rows, 'columns': fields, 'seasons': sorted(seasons), 'weeks': sorted(weeks, key=lambda x: int(x) if str(x).isdigit() else 999), 'rows_by_week': rows_by_week, 'team_count': len(teams), 'teams': sorted(teams)}
    except Exception as e:
        return {'error': str(e), 'bytes': len(body or b'')}

def _server_diagnostic_snapshot():
    cache = {}
    with LOCK:
        for key, value in CACHE.items():
            cache[key] = {'age_seconds': round(max(0.0, time.time() - float(value.get('ts') or time.time())), 3), 'bytes': len(value.get('body') or b''), 'ctype': value.get('ctype')}
    disk = {}
    for key in list(UPSTREAMS.keys()) + ['/api/current-pressure', '/api/game-flow-2026-v113']:
        cached = _read_disk_cache(key)
        if cached:
            disk[key] = {'bytes': len(cached.get('body') or b''), 'ctype': cached.get('ctype'), 'saved_at': cached.get('saved_at')}
    with SERVER_DIAG_LOCK:
        events = list(SERVER_DIAG_EVENTS)
    return {'version': SERVER_DIAG_VERSION, 'server_started_at': SERVER_STARTED_AT, 'cache': cache, 'disk_cache': disk, 'events': events}

LIVE_CACHE_DIR = BASE_DIR / 'data' / 'live-cache'
LIVE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

STAT_RANKINGS_URL = 'https://statrankings.com/nfl/advanced/teams/defense/pressure-rate'
PRESSURE_CACHE_TTL = 900
PRESSURE_OVERRIDE_PATH = BASE_DIR / 'data' / 'pressure-current.manual.json'

PBP_2026_URL = 'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.csv.gz'
PBP_2025_URL = 'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv.gz'
PENALTY_REFERENCE_2025_CACHE_KEY = '/derived/penalty-reference-2025-v97-score-aware'
V104_REFERENCE_2025_CACHE_KEY = '/derived/v106-qb-current-season-reference-2025-v3'
PERFORMANCE_LUCK_2025_CACHE_KEY = '/derived/performance-luck-calibration-2025-v121'
PENALTY_MODEL_VERSION = 'V97 score-aware same-state nflfastR-derived EPA + same-model nflfastR WPA + scoring-play counterfactuals + dedicated special-teams reconstruction + canonical game-row aggregation + approved 40/25/20/15 blend + direct-value coherence guard + capped component z-scores'
PENALTY_PRIOR_EQUIV_GAMES = 0.0
GAME_FLOW_CACHE_TTL = 900
EP_SURFACE_2025_CACHE_KEY = '/derived/ep-state-surface-2025-v97'
_EP_SURFACE_2025 = None
_EP_SURFACE_LOCK = threading.Lock()

TEAM_NAMES = {
    'ARI':'Arizona Cardinals','ATL':'Atlanta Falcons','BAL':'Baltimore Ravens','BUF':'Buffalo Bills',
    'CAR':'Carolina Panthers','CHI':'Chicago Bears','CIN':'Cincinnati Bengals','CLE':'Cleveland Browns',
    'DAL':'Dallas Cowboys','DEN':'Denver Broncos','DET':'Detroit Lions','GB':'Green Bay Packers',
    'HOU':'Houston Texans','IND':'Indianapolis Colts','JAX':'Jacksonville Jaguars','KC':'Kansas City Chiefs',
    'LV':'Las Vegas Raiders','LAC':'Los Angeles Chargers','LAR':'Los Angeles Rams','MIA':'Miami Dolphins',
    'MIN':'Minnesota Vikings','NE':'New England Patriots','NO':'New Orleans Saints','NYG':'New York Giants',
    'NYJ':'New York Jets','PHI':'Philadelphia Eagles','PIT':'Pittsburgh Steelers','SF':'San Francisco 49ers',
    'SEA':'Seattle Seahawks','TB':'Tampa Bay Buccaneers','TEN':'Tennessee Titans','WAS':'Washington Commanders',
}


def _norm(s):
    return re.sub(r'[^a-z0-9]+', '', str(s or '').lower())

TEAM_LOOKUPS = {}
for code, name in TEAM_NAMES.items():
    TEAM_LOOKUPS[_norm(name)] = code
    TEAM_LOOKUPS[_norm(name.replace('49ers','Forty Niners'))] = code
    TEAM_LOOKUPS[_norm(code)] = code
# Common external aliases.
TEAM_LOOKUPS[_norm('Jacksonville Jaguars')] = 'JAX'
TEAM_LOOKUPS[_norm('Los Angeles Rams')] = 'LAR'
TEAM_LOOKUPS[_norm('Los Angeles Chargers')] = 'LAC'


def _canon_team_code(code):
    c = str(code or '').upper().strip()
    return {'LA':'LAR','JAC':'JAX','WSH':'WAS','OAK':'LV','SD':'LAC','STL':'LAR'}.get(c, c)


class _RowCollector(HTMLParser):
    """Collect visible text plus attributes for each HTML table row.

    StatRankings renders team identity partly through image/link attributes, so the
    parser intentionally keeps alt/title/href/src/aria-label values alongside text.
    """
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_tr = False
        self.parts = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'tr':
            self.in_tr = True
            self.parts = []
        if self.in_tr:
            for key, value in attrs:
                if key.lower() in {'alt','title','href','src','aria-label','data-team','data-name'} and value:
                    self.parts.append(value)

    def handle_data(self, data):
        if self.in_tr and data and data.strip():
            self.parts.append(data.strip())

    def handle_endtag(self, tag):
        if tag.lower() == 'tr' and self.in_tr:
            self.rows.append(' '.join(self.parts))
            self.in_tr = False
            self.parts = []


def _team_from_blob(blob):
    nblob = _norm(blob)
    # Match full names first; abbreviation matching on arbitrary HTML is too noisy.
    for code, name in TEAM_NAMES.items():
        if _norm(name) in nblob:
            return code
    # URL slugs are common even when the row's visible team text is an image.
    for code, name in TEAM_NAMES.items():
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        if slug in str(blob).lower():
            return code
    return None


def parse_statrankings_pressure_html(text):
    """Normalize the free StatRankings team pressure-rate page.

    Returns season-to-date 2026 pressure rate plus the page's 2025 comparison.
    The function refuses to guess team identity or synthesize missing rows.
    """
    text = html_lib.unescape(text or '')
    update_match = re.search(r'Last\s+updated\s+(\d{1,2}/\d{1,2}/\d{2,4})', text, re.I)
    as_of = None
    if update_match:
        raw = update_match.group(1)
        for fmt in ('%m/%d/%y','%m/%d/%Y'):
            try:
                as_of = datetime.strptime(raw, fmt).date().isoformat()
                break
            except ValueError:
                pass

    parser = _RowCollector()
    parser.feed(text)
    teams = {}
    for blob in parser.rows:
        team = _team_from_blob(blob)
        if not team:
            continue
        pcts = [float(x)/100.0 for x in re.findall(r'(?<!\d)(\d{1,3}(?:\.\d+)?)\s*%', blob)]
        # The table columns are 2026, Last 1, Last 3, Last 5, Last 10, Home, Away, 2025.
        # Dashes remove some split values, but the first percentage remains 2026 and
        # the final percentage remains the 2025 comparison.
        if len(pcts) < 2:
            continue
        current = pcts[0]
        prior = pcts[-1]
        if not (0 <= current <= 1 and 0 <= prior <= 1):
            continue
        candidate = {
            'team': team,
            'pressure_rate': current,
            'prior_pressure_rate': prior,
            'as_of': as_of,
            'source': 'StatRankings',
            'source_url': STAT_RANKINGS_URL,
            'mode': 'automatic',
        }
        # If duplicate render fragments exist, prefer the row carrying the most split values.
        if team not in teams or len(pcts) > teams[team].get('_pct_count', 0):
            candidate['_pct_count'] = len(pcts)
            teams[team] = candidate
    for row in teams.values():
        row.pop('_pct_count', None)
    return {'as_of': as_of, 'teams': teams, 'row_count': len(teams)}


def load_manual_pressure_overrides():
    if not PRESSURE_OVERRIDE_PATH.exists():
        return {'as_of': None, 'source': None, 'teams': {}}
    try:
        obj = json.loads(PRESSURE_OVERRIDE_PATH.read_text(encoding='utf-8'))
    except Exception as e:
        return {'as_of': None, 'source': None, 'teams': {}, 'error': f'invalid manual pressure file: {e}'}
    base_as_of = obj.get('as_of')
    base_source = obj.get('source') or 'manual browser/Codex override'
    out = {}
    for key, value in (obj.get('teams') or {}).items():
        code = str(key).upper()
        if code == 'JAC': code = 'JAX'
        if code not in TEAM_NAMES:
            continue
        if isinstance(value, (int, float)):
            rate = float(value)
            row = {}
        elif isinstance(value, dict):
            rate = value.get('pressure_rate')
            row = dict(value)
        else:
            continue
        try:
            rate = float(rate)
        except (TypeError, ValueError):
            continue
        if rate > 1 and rate <= 100:
            rate /= 100.0
        if not (0 <= rate <= 1):
            continue
        out[code] = {
            'team': code,
            'pressure_rate': rate,
            'as_of': row.get('as_of') or base_as_of,
            'games': row.get('games'),
            'through_week': row.get('through_week'),
            'source': row.get('source') or base_source,
            'source_url': row.get('source_url') or obj.get('source_url'),
            'note': row.get('note'),
            'mode': 'manual',
        }
    return {'as_of': base_as_of, 'source': base_source, 'teams': out, 'row_count': len(out)}



def save_manual_pressure_override(payload):
    """Persist one curated current-pressure row from the local Update Center.

    This is intentionally narrow: the browser can only write to FORCE's own
    local override file, never to an upstream provider. Freshness is still
    enforced later by live_profiles.js before the row can affect a rating.
    """
    team = str((payload or {}).get('team') or '').upper().strip()
    if team == 'JAC':
        team = 'JAX'
    if team not in TEAM_NAMES:
        raise ValueError('unknown team code')
    rate = (payload or {}).get('pressure_rate')
    try:
        rate = float(rate)
    except (TypeError, ValueError):
        raise ValueError('pressure_rate must be numeric')
    if rate > 1 and rate <= 100:
        rate /= 100.0
    if not (0 <= rate <= 1):
        raise ValueError('pressure_rate must be between 0 and 1 (or 0 and 100 percent)')

    as_of = str((payload or {}).get('as_of') or '').strip()
    try:
        datetime.strptime(as_of, '%Y-%m-%d')
    except ValueError:
        raise ValueError('as_of must be YYYY-MM-DD')

    def opt_int(name):
        value = (payload or {}).get(name)
        if value in (None, ''):
            return None
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise ValueError(f'{name} must be an integer')
        if value < 0:
            raise ValueError(f'{name} cannot be negative')
        return value

    games = opt_int('games')
    through_week = opt_int('through_week')
    source = str((payload or {}).get('source') or 'manual Update Center verification').strip()
    source_url = str((payload or {}).get('source_url') or '').strip() or None
    note = str((payload or {}).get('note') or '').strip() or None

    try:
        doc = json.loads(PRESSURE_OVERRIDE_PATH.read_text(encoding='utf-8')) if PRESSURE_OVERRIDE_PATH.exists() else {}
    except Exception:
        doc = {}
    if not isinstance(doc, dict):
        doc = {}
    doc.setdefault('source', 'manual browser/Codex override')
    doc.setdefault('source_url', None)
    doc['as_of'] = max(str(doc.get('as_of') or ''), as_of) or as_of
    teams = doc.setdefault('teams', {})
    if not isinstance(teams, dict):
        teams = {}
        doc['teams'] = teams
    teams[team] = {
        'pressure_rate': round(rate, 6),
        'as_of': as_of,
        'games': games,
        'through_week': through_week,
        'source': source,
        'source_url': source_url,
        'note': note,
    }
    PRESSURE_OVERRIDE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PRESSURE_OVERRIDE_PATH.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    with LOCK:
        CACHE.pop('/api/current-pressure', None)
    return {'team': team, **teams[team]}


def _fetch_text(url, timeout=25):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36 FORCE/104',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    with urlopen(req, timeout=timeout) as r:
        raw = r.read()
        if str(url).endswith('.gz') or str(r.headers.get('Content-Encoding') or '').lower() == 'gzip':
            raw = gzip.decompress(raw)
        charset = r.headers.get_content_charset() or 'utf-8'
        return raw.decode(charset, errors='replace')


def _disk_cache_paths(key):
    digest = hashlib.sha256(str(key).encode('utf-8')).hexdigest()[:20]
    return LIVE_CACHE_DIR / f'{digest}.bin', LIVE_CACHE_DIR / f'{digest}.json'


def _write_disk_cache(key, body, ctype):
    data_path, meta_path = _disk_cache_paths(key)
    tmp = data_path.with_suffix('.tmp')
    tmp.write_bytes(body)
    tmp.replace(data_path)
    meta = {'key': key, 'ctype': ctype, 'saved_at': datetime.now(timezone.utc).isoformat(), 'bytes': len(body)}
    meta_path.write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')


def _read_disk_cache(key):
    data_path, meta_path = _disk_cache_paths(key)
    if not data_path.is_file():
        return None
    try:
        meta = json.loads(meta_path.read_text('utf-8')) if meta_path.is_file() else {}
        body = data_path.read_bytes()
        if len(body) < 100:
            return None
        return {'body': body, 'ctype': meta.get('ctype') or 'text/csv', 'saved_at': meta.get('saved_at')}
    except Exception:
        return None


def _merge_weekly_csv(path, previous_body, new_body):
    """Merge partial nflverse weekly refreshes onto last-known-good rows.

    During an in-progress NFL week, the release asset can briefly contain only
    the newly completed game(s). Never let that transient snapshot erase prior
    2026 weeks. New rows win on the same stable game/team[/player] key so later
    nflverse corrections still propagate.
    """
    if path not in {'/api/team-stats', '/api/player-stats'}:
        return new_body
    if not previous_body:
        _server_diag('weekly-merge:no-prior-snapshot', path=path, incoming=_csv_body_summary(new_body))
        return new_body
    try:
        old_text=previous_body.decode('utf-8', errors='replace')
        new_text=new_body.decode('utf-8', errors='replace')
        old_reader=csv.DictReader(io.StringIO(old_text))
        new_reader=csv.DictReader(io.StringIO(new_text))
        new_fields=list(new_reader.fieldnames or [])
        if not new_fields:
            return previous_body
        all_fields=list(dict.fromkeys(new_fields + list(old_reader.fieldnames or [])))
        def row_key(row):
            if path == '/api/player-stats':
                pid=row.get('player_id') or row.get('gsis_id') or row.get('player_name') or ''
                return (row.get('season',''),row.get('week',''),row.get('game_id',''),pid,_canon_team_code(row.get('team') or row.get('recent_team') or ''))
            return (row.get('season',''),row.get('week',''),row.get('game_id',''),_canon_team_code(row.get('team') or ''))
        merged={}
        for row in old_reader:
            if str(row.get('season'))=='2026': merged[row_key(row)]=row
        for row in new_reader:
            if str(row.get('season'))=='2026': merged[row_key(row)]=row
        if not merged:
            return new_body
        rows=sorted(merged.values(), key=lambda r:(int(r.get('week') or 0), _canon_team_code(r.get('team') or r.get('recent_team') or ''), str(r.get('player_id') or '')))
        buf=io.StringIO(newline='')
        writer=csv.DictWriter(buf, fieldnames=all_fields, extrasaction='ignore', lineterminator='\n')
        writer.writeheader()
        for row in rows: writer.writerow({k:row.get(k,'') for k in all_fields})
        merged_body = buf.getvalue().encode('utf-8')
        _server_diag('weekly-merge:complete', path=path, previous=_csv_body_summary(previous_body), incoming=_csv_body_summary(new_body), merged=_csv_body_summary(merged_body))
        return merged_body
    except Exception as e:
        _server_diag('weekly-merge:error', path=path, error=repr(e), incoming=_csv_body_summary(new_body))
        return new_body


def current_pressure_payload(force=False):
    now = time.time()
    with LOCK:
        cached = CACHE.get('/api/current-pressure')
        if not force and cached and now - cached['ts'] < PRESSURE_CACHE_TTL:
            return cached['body'], True

    automatic = {'as_of': None, 'teams': {}, 'row_count': 0}
    auto_error = None
    try:
        automatic = parse_statrankings_pressure_html(_fetch_text(STAT_RANKINGS_URL))
        if automatic['row_count'] < 28:
            raise ValueError(f'StatRankings pressure parser found only {automatic["row_count"]} teams')
    except Exception as e:
        auto_error = str(e)
        automatic = {'as_of': None, 'teams': {}, 'row_count': 0}

    manual = load_manual_pressure_overrides()
    merged = dict(automatic.get('teams') or {})
    # Explicit manually sourced data wins. This is the intentional weekly-browser
    # escape hatch when a public automated provider is delayed or changes markup.
    merged.update(manual.get('teams') or {})

    payload = {
        'season': 2026,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'freshness_policy': 'team row must be dated at least one calendar day after its latest completed game; explicit game counts must cover all completed games',
        'automatic': {
            'source': 'StatRankings',
            'url': STAT_RANKINGS_URL,
            'as_of': automatic.get('as_of'),
            'row_count': automatic.get('row_count', 0),
            'error': auto_error,
        },
        'manual': {
            'path': str(PRESSURE_OVERRIDE_PATH.relative_to(BASE_DIR)),
            'as_of': manual.get('as_of'),
            'row_count': manual.get('row_count', 0),
            'error': manual.get('error'),
        },
        'teams': merged,
        'row_count': len(merged),
    }
    body = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    with LOCK:
        CACHE['/api/current-pressure'] = {'ts': now, 'body': body, 'ctype': 'application/json'}
    return body, False



def _pbp_num(row, key, default=None):
    try:
        v = float(row.get(key))
        return v if v == v else default
    except (TypeError, ValueError):
        return default


def _pbp_true(value):
    if value is None:
        return False
    s = str(value).strip().lower()
    if s in ('', 'na', 'nan', 'none', 'false', 'no'):
        return False
    try:
        return float(s) != 0.0
    except (TypeError, ValueError):
        return s in ('true', 'yes', 'y')


def _accepted_penalty(row, home, away):
    penalty_team = _canon_team_code(row.get('penalty_team'))
    penalty_flag = _pbp_true(row.get('penalty')) or penalty_team in (home, away)
    if not penalty_flag or penalty_team not in (home, away):
        return False
    desc = str(row.get('desc') or row.get('play_description') or '')
    upper = desc.upper()
    # Declined-only and offsetting-only calls do not alter the enforced state.
    if 'DECLINED' in upper and 'ENFORCED' not in upper:
        return False
    if ('OFFSETTING' in upper or 'PENALTIES OFFSET' in upper) and 'ENFORCED' not in upper:
        return False
    return True


def _distance_bucket(v):
    try:
        x = max(0.0, float(v))
    except (TypeError, ValueError):
        return 10
    if x <= 1: return 1
    if x <= 3: return 3
    if x <= 6: return 6
    if x <= 10: return 10
    if x <= 15: return 15
    return 20


def _yard_bucket(v):
    try:
        x = min(99.0, max(1.0, float(v)))
    except (TypeError, ValueError):
        return 50
    return int(round(x / 5.0) * 5)


def _build_ep_lookup(rows):
    """Build a compact empirical EP state table from the same nflverse season.

    We intentionally use nflfastR's own pre-play EP estimates as the reference
    surface.  Counterfactuals therefore remain on the same scale as the source
    EPA instead of introducing a second hand-tuned points model.
    """
    sums, counts = {}, {}
    by_down = {}
    for row in rows:
        ep = _pbp_num(row, 'ep')
        down = _pbp_num(row, 'down')
        yl = _pbp_num(row, 'yardline_100')
        if ep is None or down is None or yl is None:
            continue
        down = int(down)
        if down < 1 or down > 4:
            continue
        key = (down, _distance_bucket(row.get('ydstogo')), _yard_bucket(yl))
        sums[key] = sums.get(key, 0.0) + ep
        counts[key] = counts.get(key, 0) + 1
        by_down.setdefault(down, []).append((key[1], key[2], ep))
    lookup = {k: sums[k] / counts[k] for k in sums}
    return lookup, by_down


def _lookup_ep(lookup, by_down, down, ydstogo, yardline_100):
    try:
        d = int(down)
    except (TypeError, ValueError):
        d = 1
    d = min(4, max(1, d))
    db = _distance_bucket(ydstogo)
    yb = _yard_bucket(yardline_100)
    direct = lookup.get((d, db, yb))
    if direct is not None:
        return direct
    candidates = by_down.get(d) or []
    if candidates:
        # Yard line matters more than a one-bucket distance mismatch.
        best = min(candidates, key=lambda x: abs(x[1] - yb) + 2.0 * abs(x[0] - db))
        return best[2]
    # Conservative field-position fallback used only if the season table has no
    # matching down at all (normally synthetic/unit-test fixtures).
    yl = min(99.0, max(1.0, float(yardline_100 or 50)))
    base = (50.0 - yl) * 0.055
    down_penalty = {1: 0.65, 2: 0.15, 3: -0.45, 4: -1.05}.get(d, 0.0)
    distance_penalty = max(0.0, float(ydstogo or 10) - 1.0) * 0.035
    return max(-2.8, min(6.2, base + down_penalty - distance_penalty))


def _parse_underlying_gain(desc):
    text = str(desc or '')
    # Covers "for 19 yards", "for -3 yards", and common sack wording.
    matches = re.findall(r'\bfor\s+(-?\d+)\s+yards?\b', text, re.I)
    if matches:
        try:
            return float(matches[-1])
        except ValueError:
            pass
    m = re.search(r'\bsacked\s+at\s+[A-Z]{2,3}\s+(\d+)\b', text, re.I)
    if m:
        return None
    return None


def _parse_turnover_new_yardline_100(row, defteam):
    """Return yardline_100 from the new possessor's perspective when possible."""
    desc = str(row.get('desc') or row.get('play_description') or '')
    # Examples: "INTERCEPTED at DET 5" / "RECOVERED by DET at DET 23".
    patterns = [
        r'INTERCEPTED\s+at\s+([A-Z]{2,3})\s+(\d+)',
        r'RECOVERED\s+by\s+[A-Z0-9.\-]+\s+at\s+([A-Z]{2,3})\s+(\d+)',
        r'RECOVERED\s+by\s+([A-Z]{2,3})[^,.;]*?\s+at\s+([A-Z]{2,3})\s+(\d+)'
    ]
    for idx, pat in enumerate(patterns):
        m = re.search(pat, desc, re.I)
        if not m:
            continue
        try:
            if idx < 2:
                side, yard = m.group(1).upper(), int(m.group(2))
            else:
                side, yard = m.group(2).upper(), int(m.group(3))
        except Exception:
            continue
        side = _canon_team_code(side)
        # New possessor is the defense for an interception/lost fumble.  If the
        # ball is on its own side, distance to the opponent goal is 100-yard.
        return float(100 - yard if side == defteam else yard)
    # Approximate spot using start position and air/return information.
    start = _pbp_num(row, 'yardline_100')
    if start is None:
        return 75.0
    air = _pbp_num(row, 'air_yards', 0.0) or 0.0
    ret = _pbp_num(row, 'return_yards', 0.0) or 0.0
    old_offense_spot = min(99.0, max(1.0, start - air + ret))
    return min(99.0, max(1.0, 100.0 - old_offense_spot))



def _game_seconds_remaining(row):
    direct=_pbp_num(row,'game_seconds_remaining')
    if direct is not None:
        return max(0.0,min(3600.0,float(direct)))
    qtr=int(_pbp_num(row,'qtr',1) or 1)
    quarter=_pbp_num(row,'quarter_seconds_remaining')
    if quarter is not None:
        return max(0.0,min(3600.0,(4-max(1,min(4,qtr)))*900.0+float(quarter)))
    clock=str(row.get('time') or '').strip()
    m=re.match(r'^(\d{1,2}):(\d{2})$',clock)
    if m:
        sec=int(m.group(1))*60+int(m.group(2))
        return max(0.0,min(3600.0,(4-max(1,min(4,qtr)))*900.0+sec))
    return max(0.0,min(3600.0,(4-max(1,min(4,qtr)))*900.0+450.0))


def _pre_home_away_scores(row):
    """Fixed-team score at the START of the play.

    nflverse ``home_wp`` is a pre-play probability. ``posteam_score`` and
    ``defteam_score`` are therefore the correct score fields for reconstructed
    no-penalty post-states. ``total_home_score`` / ``total_away_score`` are
    post-play totals and are used only as a last-resort fallback.
    """
    home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
    posteam=_canon_team_code(row.get('posteam'))
    ps=_pbp_num(row,'posteam_score'); ds=_pbp_num(row,'defteam_score')
    if ps is not None and ds is not None and posteam in (home,away):
        return (float(ps),float(ds)) if posteam==home else (float(ds),float(ps))
    sd=_pbp_num(row,'score_differential')
    if sd is not None and posteam in (home,away):
        hd=float(sd) if posteam==home else -float(sd)
        return (hd,0.0) if hd>=0 else (0.0,-hd)
    hs=_pbp_num(row,'total_home_score',0.0) or 0.0
    aws=_pbp_num(row,'total_away_score',0.0) or 0.0
    return float(hs),float(aws)


def _score_diff_home(row):
    hs,aws=_pre_home_away_scores(row)
    return float(hs)-float(aws)

NFLFASTR_WP_MODEL_PATH = BASE_DIR / 'data' / 'nflfastr_wp_model.json'
_NFLFASTR_WP_MODEL = None
_NFLFASTR_WP_MODEL_LOCK = threading.Lock()


def _half_seconds_remaining(row):
    direct=_pbp_num(row,'half_seconds_remaining')
    if direct is not None:return max(0.0,min(1800.0,float(direct)))
    g=_game_seconds_remaining(row)
    return g-1800.0 if g>1800.0 else g


def _fixed_team_timeouts(row,home,posteam):
    hp=_pbp_num(row,'home_timeouts_remaining'); ap=_pbp_num(row,'away_timeouts_remaining')
    if hp is not None and ap is not None:return int(hp),int(ap)
    pt=_pbp_num(row,'posteam_timeouts_remaining'); dt=_pbp_num(row,'defteam_timeouts_remaining')
    if pt is not None and dt is not None:
        return (int(pt),int(dt)) if posteam==home else (int(dt),int(pt))
    return 3,3


def _home_receive_2h(row,home,posteam):
    # receive_2h_ko is possession-team-oriented and only meaningful before HT.
    if _game_seconds_remaining(row) <= 1800.0:
        return None
    v=_pbp_num(row,'receive_2h_ko')
    if v is None:return None
    return bool(v) if posteam==home else not bool(v)


def _load_nflfastr_wp_model():
    global _NFLFASTR_WP_MODEL
    if _NFLFASTR_WP_MODEL is not None:
        return _NFLFASTR_WP_MODEL
    with _NFLFASTR_WP_MODEL_LOCK:
        if _NFLFASTR_WP_MODEL is None:
            with NFLFASTR_WP_MODEL_PATH.open('r',encoding='utf-8') as fh:
                model=json.load(fh)
            if model.get('model_type','').lower().find('no-spread') < 0 or len(model.get('trees') or []) < 1:
                raise RuntimeError('invalid packaged nflfastR WP model')
            _NFLFASTR_WP_MODEL=model
    return _NFLFASTR_WP_MODEL


def _xgb_binary_logistic_predict(features):
    """Pure-Python inference for the packaged nflfastR XGBoost WP model.

    This is the exact no-spread ``fastrmodels::wp_model`` tree ensemble exported
    to JSON. It adds no third-party Python dependency to FORCE.
    """
    model=_load_nflfastr_wp_model()
    base=float(model.get('base_score',0.5))
    base=min(.999999,max(.000001,base))
    margin=math.log(base/(1.0-base))
    for tree in model.get('trees') or []:
        left=tree['left_children']; right=tree['right_children']; default_left=tree['default_left']
        split_idx=tree['split_indices']; split_cond=tree['split_conditions']
        node=0
        while left[node] != -1:
            idx=int(split_idx[node]); value=features[idx] if idx < len(features) else float('nan')
            missing=value is None or (isinstance(value,float) and math.isnan(value))
            if missing:
                node=left[node] if int(default_left[node]) else right[node]
            else:
                node=left[node] if float(value) < float(split_cond[node]) else right[node]
        # XGBoost's JSON representation stores the shrunken leaf value in
        # split_conditions for leaf nodes.
        margin += float(split_cond[node])
    if margin >= 0:
        z=math.exp(-margin); return 1.0/(1.0+z)
    z=math.exp(margin); return z/(1.0+z)


def _nflfastr_home_wp(state):
    """Run a reconstructed state through nflfastR's no-spread WP model.

    nflfastR predicts from the possession team's perspective. FORCE constructs
    those 11 published model features, obtains posteam WP, then converts it to
    one fixed home-team frame before comparing actual and counterfactual states.
    """
    possession_home=bool(state.get('possession_home'))
    game_sec=max(0.0,min(3600.0,float(state.get('game_seconds_remaining') or 0.0)))
    half_sec=max(0.0,min(1800.0,float(state.get('half_seconds_remaining') or (game_sec-1800.0 if game_sec>1800.0 else game_sec))))
    home_diff=float(state.get('home_score_diff') or 0.0)
    score_diff=home_diff if possession_home else -home_diff
    elapsed_share=(3600.0-game_sec)/3600.0
    diff_time_ratio=score_diff/math.exp(-4.0*elapsed_share)
    hto=max(0,min(3,int(state.get('home_timeouts',3))))
    ato=max(0,min(3,int(state.get('away_timeouts',3))))
    posteam_to=hto if possession_home else ato
    defteam_to=ato if possession_home else hto
    home_receives_2h=state.get('home_receive_2h')
    receive_2h_ko=0
    if game_sec>1800.0 and home_receives_2h is not None:
        receive_2h_ko=1 if bool(home_receives_2h)==possession_home else 0
    features=[
        float(receive_2h_ko),
        1.0 if possession_home else 0.0,
        half_sec,
        game_sec,
        diff_time_ratio,
        score_diff,
        float(max(1,min(4,int(state.get('down') or 1)))),
        max(1.0,float(state.get('ydstogo') or 10.0)),
        max(0.0,min(100.0,float(state.get('yardline_100') or 50.0))),
        float(posteam_to),
        float(defteam_to),
    ]
    posteam_wp=_xgb_binary_logistic_predict(features)
    home_wp=posteam_wp if possession_home else 1.0-posteam_wp
    return max(0.000001,min(0.999999,float(home_wp)))

def _model_state_from_preplay_row(row):
    """Convert an nflverse pre-play row to the exact feature state used by WP.

    This is intentionally used for the *actual enforced* side of a penalty
    comparison.  The first subsequent scrimmage row already encodes the result
    of enforcement (possession, down/distance, spot, clock, score and timeouts),
    so running that state through the same packaged nflfastR model makes the
    actual and counterfactual sides strictly apples-to-apples.
    """
    if not isinstance(row, dict):
        return None
    home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
    posteam=_canon_team_code(row.get('posteam'))
    if home not in TEAM_NAMES or away not in TEAM_NAMES or posteam not in (home,away):
        return None
    down=_pbp_num(row,'down'); dist=_pbp_num(row,'ydstogo'); yl=_pbp_num(row,'yardline_100')
    if down is None or dist is None or yl is None:
        return None
    try:
        down_i=int(float(down))
    except (TypeError,ValueError):
        return None
    if down_i < 1 or down_i > 4:
        return None
    hs,aws=_pre_home_away_scores(row)
    hto,ato=_fixed_team_timeouts(row,home,posteam)
    recv2h=_home_receive_2h(row,home,posteam)
    game_sec=_game_seconds_remaining(row); half_sec=_half_seconds_remaining(row)
    return {
        'possession_home':posteam==home,
        'down':down_i,
        'ydstogo':max(1.0,float(dist)),
        'yardline_100':max(1.0,min(99.0,float(yl))),
        'game_seconds_remaining':game_sec,
        'half_seconds_remaining':half_sec,
        'home_score_diff':float(hs)-float(aws),
        'home_timeouts':hto,'away_timeouts':ato,
        'home_receive_2h':recv2h,
        'season':int(_pbp_num(row,'season',2026) or 2026),
        'roof':str(row.get('roof') or row.get('stadium_type') or '').lower(),
    }


def _field_spot_yardline_100(side, yard, possession, other):
    """Convert a textual field spot into yardline_100 for ``possession``."""
    side=_canon_team_code(side)
    try: yard=float(yard)
    except (TypeError,ValueError): return None
    yard=max(0.0,min(100.0,yard))
    if side==possession:
        return max(0.0,min(100.0,100.0-yard))
    if side==other:
        return max(0.0,min(100.0,yard))
    return None


def _special_teams_unpenalized_spot(row, receiving_team, kicking_team):
    """Return the receiving team's no-penalty post-return yardline_100.

    Kickoffs and punts cannot be reconstructed with ordinary scrimmage down/
    distance logic.  Parse the final return/fair-catch spot *before* the penalty
    clause and express it from the receiving team's perspective.
    """
    desc=str(row.get('desc') or row.get('play_description') or '')
    before=re.split(r'\bPENALTY\b',desc,flags=re.I,maxsplit=1)[0]
    upper=before.upper()
    play_type=str(row.get('play_type') or '').lower()
    # Nullified special-teams return touchdown.
    if 'TOUCHDOWN' in upper:
        return 0.0
    # Explicit touchback.  NFL kickoffs in the current 2025+ rules put the ball
    # at the 35; punts remain at the 20.  This branch is only used when the
    # description does not provide a more precise returned/fair-caught spot.
    if 'TOUCHBACK' in upper:
        try: season=int(float(row.get('season') or 2026))
        except (TypeError,ValueError): season=2026
        own = 35.0 if play_type=='kickoff' and season>=2025 else (25.0 if play_type=='kickoff' else 20.0)
        return 100.0-own
    # Take the final field spot in the football action before the penalty text.
    # Examples include "to BUF 46 for 41 yards", "at BUF 36", and
    # "fair catch at HOU 18". Choosing the last match avoids the kick landing
    # point when a return follows it.
    matches=list(re.finditer(r'\b(?:TO|AT)\s+([A-Z]{2,3})\s+(\d{1,2})\b',upper,re.I))
    for m in reversed(matches):
        y100=_field_spot_yardline_100(m.group(1),m.group(2),receiving_team,kicking_team)
        if y100 is not None:
            return y100
    return None


def _is_special_teams_play(row):
    pt=str(row.get('play_type') or '').lower()
    return pt in ('kickoff','punt') or _pbp_true(row.get('kickoff_attempt')) or _pbp_true(row.get('punt_attempt'))


def _post_score_receiving_yardline_100(row):
    """Approximate the ordinary post-kickoff scrimmage spot after a TD.

    2025+ touchbacks begin at the receiving 35 (yardline_100=65). This keeps
    erased-TD EP/WP counterfactuals on the current kickoff rules rather than the
    older own-25 assumption.
    """
    try: season=int(float(row.get('season') or 2026))
    except (TypeError,ValueError): season=2026
    if season>=2025:return 65.0
    if season>=2024:return 70.0
    return 75.0



def _underlying_scoring_outcome(row, home, away, posteam, defteam):
    """Return (scoring_team, points, kind) for a scoring football action.

    This describes the football action before enforcement. Whether the points
    actually counted is decided by comparing the next enforced state with the
    pre-play scoreboard in ``_counterfactual_no_penalty_state``.
    """
    desc=str(row.get('desc') or row.get('play_description') or '')
    upper=desc.upper()
    td=_pbp_true(row.get('touchdown')) or 'TOUCHDOWN' in upper
    if td:
        td_team=_canon_team_code(row.get('td_team'))
        scorer=td_team if td_team in (home,away) else posteam
        if scorer in (home,away):
            # FORCE has historically folded the near-certain conversion into a
            # nullified TD counterfactual. Keep that convention for continuity.
            return scorer,7.0,'touchdown'
    fg_result=str(row.get('field_goal_result') or '').strip().lower()
    fg_made=(fg_result in ('made','good','successful','success') or bool(re.search(r'FIELD GOAL(?: IS)? GOOD',upper)))
    if fg_made and posteam in (home,away):
        return posteam,3.0,'field-goal'
    xp_result=str(row.get('extra_point_result') or '').strip().lower()
    xp_good=(xp_result in ('good','made','successful','success') or 'EXTRA POINT IS GOOD' in upper or 'PAT GOOD' in upper)
    if xp_good and posteam in (home,away):
        return posteam,1.0,'extra-point'
    two_result=str(row.get('two_point_conv_result') or row.get('two_point_result') or '').strip().lower()
    two_good=(two_result in ('success','successful','good','made') or ('TWO-POINT' in upper and ('SUCCEEDS' in upper or 'SUCCESSFUL' in upper)))
    if two_good and posteam in (home,away):
        return posteam,2.0,'two-point'
    return None


def _fixed_team_score_diff(home_score_diff, team_is_home):
    try: hd=float(home_score_diff)
    except (TypeError,ValueError): hd=0.0
    return hd if team_is_home else -hd

def _counterfactual_no_penalty_state(row,next_row=None):
    """Reconstruct the post-play game state if the accepted flag were absent."""
    home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
    posteam=_canon_team_code(row.get('posteam')); defteam=_canon_team_code(row.get('defteam'))
    down=int(_pbp_num(row,'down',1) or 1); ydstogo=_pbp_num(row,'ydstogo',10) or 10
    yl=_pbp_num(row,'yardline_100',50) or 50
    hs,aws=_pre_home_away_scores(row)
    desc=str(row.get('desc') or row.get('play_description') or ''); upper=desc.upper(); play_type=str(row.get('play_type') or '').lower()
    turnover=_pbp_true(row.get('interception')) or _pbp_true(row.get('fumble_lost')) or 'INTERCEPTED' in upper
    td=_pbp_true(row.get('touchdown')) or 'TOUCHDOWN' in upper
    incomplete=_pbp_true(row.get('incomplete_pass')) or 'PASS INCOMPLETE' in upper or 'INCOMPLETE' in upper
    sack=_pbp_true(row.get('sack')) or 'SACKED' in upper
    presnap_types=('FALSE START','DELAY OF GAME','NEUTRAL ZONE INFRACTION','ENCROACHMENT','OFFSIDE','TOO MANY MEN','12 MEN','ILLEGAL SUBSTITUTION')
    ptype=str(row.get('penalty_type') or '').upper()
    pretime=_game_seconds_remaining(row); prehalf=_half_seconds_remaining(row)
    hto,ato=_fixed_team_timeouts(row,home,posteam); recv2h=_home_receive_2h(row,home,posteam)
    nexttime=None
    actual_ref=None
    if next_row is not None and str(next_row.get('game_id') or '')==str(row.get('game_id') or ''):
        nexttime=_pbp_num(next_row,'game_seconds_remaining')
        actual_ref=_model_state_from_preplay_row(next_row)
        # Which club receives the second-half kickoff is fixed for the whole
        # game. Never let a possession change alter this invariant.
        if actual_ref is not None and actual_ref.get('home_receive_2h') is not None:
            recv2h=actual_ref.get('home_receive_2h')
    def state(possession,ndown,dist,nyl,live_ball=True,home_score=hs,away_score=aws):
        sec=pretime
        if live_ball:
            if nexttime is not None and 0<=float(nexttime)<=pretime:
                sec=float(nexttime)
            else:
                sec=max(0.0,pretime-6.0)
        half=sec-1800.0 if sec>1800.0 else sec
        return {'possession_home':possession==home,'down':max(1,min(4,int(ndown))),
                'ydstogo':max(1.0,float(dist)),'yardline_100':max(1.0,min(99.0,float(nyl))),
                'game_seconds_remaining':sec,'half_seconds_remaining':max(0.0,min(1800.0,half)),
                'home_score_diff':float(home_score)-float(away_score),'home_timeouts':hto,'away_timeouts':ato,
                'home_receive_2h':recv2h,
                'season':int(_pbp_num(row,'season',2026) or 2026),
                'roof':str(row.get('roof') or row.get('stadium_type') or '').lower()}

    # V94+: kickoffs and punts get their own receiving-team reconstruction.
    if _is_special_teams_play(row):
        kicking=posteam if posteam in (home,away) else None
        next_posteam=_canon_team_code(next_row.get('posteam')) if isinstance(next_row,dict) else None
        receiving=next_posteam if next_posteam in (home,away) and next_posteam!=kicking else defteam
        if receiving not in (home,away):
            receiving=away if kicking==home else home
        other=home if receiving==away else away
        raw_y100=_special_teams_unpenalized_spot(row,receiving,other)
        if raw_y100 is not None:
            if raw_y100 <= 0.0:
                nhs,naws=float(hs),float(aws)
                if receiving==home: nhs+=7.0
                else: naws+=7.0
                return state(other,1,10,_post_score_receiving_yardline_100(row),True,nhs,naws),'special-teams-return-touchdown'
            return state(receiving,1,min(10.0,raw_y100),raw_y100,True),'special-teams-return'
        enforced=_model_state_from_preplay_row(next_row)
        if enforced is not None:
            return dict(enforced),'special-teams-unresolved-zero'

    # V97: detect a score that the penalty erased by comparing the underlying
    # scoring action with the enforced next-state scoreboard. This handles TDs,
    # made field goals, PATs and two-point tries, including turnovers returned
    # for a score. Scoring must be checked before the generic turnover branch.
    scoring=_underlying_scoring_outcome(row,home,away,posteam,defteam)
    if scoring is not None:
        scorer,nominal_points,score_kind=scoring
        pre_home_diff=float(hs)-float(aws)
        actual_home_diff=(float(actual_ref.get('home_score_diff')) if actual_ref is not None and actual_ref.get('home_score_diff') is not None else None)
        scorer_actual_delta=None
        if actual_home_diff is not None:
            raw_delta=actual_home_diff-pre_home_diff
            scorer_actual_delta=raw_delta if scorer==home else -raw_delta
        explicit_nullified=(play_type=='no_play' or 'NULLIFIED' in upper or 'NO PLAY' in upper)
        # A counted TD may produce a 6-, 7-, or 8-point scoreboard change by
        # the next scrimmage depending on the conversion. Do not misclassify a
        # missed PAT as an erased TD merely because the old nominal branch used
        # +7. Other scoring plays have much tighter observed deltas.
        threshold={'touchdown':5.5,'field-goal':2.5,'extra-point':0.5,'two-point':1.5}.get(score_kind,max(.5,float(nominal_points)-.5))
        score_counted=(scorer_actual_delta is not None and scorer_actual_delta>=threshold)
        erased=explicit_nullified or (actual_ref is not None and not score_counted)
        points_for_cf=float(nominal_points if erased or scorer_actual_delta is None else scorer_actual_delta)
        nhs,naws=float(hs),float(aws)
        if scorer==home: nhs+=points_for_cf
        else: naws+=points_for_cf
        new_poss=away if scorer==home else home
        kind=(f'erased-{score_kind}' if erased else f'scoring-{score_kind}-no-penalty')
        return state(new_poss,1,10,_post_score_receiving_yardline_100(row),True,nhs,naws),kind

    if play_type=='no_play' and not turnover and not td and not incomplete and not sack and any(x in ptype or x in upper for x in presnap_types):
        return state(posteam,down,ydstogo,yl,False), 'pre-snap-unchanged'
    if turnover and defteam:
        new_yl=_parse_turnover_new_yardline_100(row,defteam)
        return state(defteam,1,min(10,new_yl),new_yl,True), 'erased-turnover'
    gain=_pbp_num(row,'yards_gained'); parsed=_parse_underlying_gain(desc)
    if play_type=='no_play' and parsed is not None and (gain is None or abs(float(gain))<1e-9):gain=parsed
    elif gain is None:gain=parsed
    if incomplete:gain=0.0
    if sack and gain is None:gain=-7.0
    if gain is None:
        return state(posteam,down,ydstogo,yl,False), 'enforcement-only'
    gain=float(gain); new_yl=min(99.0,max(0.0,float(yl)-gain)); converted=gain>=float(ydstogo) or new_yl<=0.0
    if new_yl<=0.0:
        nhs,naws=float(hs),float(aws)
        if posteam==home:nhs+=7.0
        else:naws+=7.0
        new_poss=defteam if defteam in (home,away) else (away if posteam==home else home)
        return state(new_poss,1,10,_post_score_receiving_yardline_100(row),True,nhs,naws),'underlying-touchdown'
    if converted:return state(posteam,1,min(10,new_yl),new_yl,True),'underlying-first-down'
    if down>=4:
        new_poss=defteam if defteam in (home,away) else (away if posteam==home else home)
        new_poss_yl=max(1.0,min(99.0,100.0-new_yl))
        return state(new_poss,1,min(10,new_poss_yl),new_poss_yl,True),'underlying-turnover-on-downs'
    return state(posteam,down+1,max(1.0,float(ydstogo)-gain),new_yl,True),'underlying-play'

def _ep_half_bucket(seconds):
    """Quantize half time for the nflfastR-derived EP reference surface.

    End-of-half states need finer resolution because expected points decay much
    faster there. Earlier-half states can use wider bins without creating sparse
    cells.
    """
    try: sec=max(0.0,min(1800.0,float(seconds)))
    except (TypeError,ValueError): sec=900.0
    if sec <= 300.0:
        return int(round(sec/30.0)*30)
    if sec <= 900.0:
        return int(round(sec/90.0)*90)
    return int(round(sec/180.0)*180)


def _ep_timeout_pair(state):
    possession_home=bool(state.get('possession_home'))
    h=max(0,min(3,int(state.get('home_timeouts',3))))
    a=max(0,min(3,int(state.get('away_timeouts',3))))
    return (h,a) if possession_home else (a,h)


def _ep_surface_cell_key(state):
    try:d=max(1,min(4,int(state.get('down') or 1)))
    except (TypeError,ValueError):d=1
    db=_distance_bucket(state.get('ydstogo'))
    yb=_yard_bucket(state.get('yardline_100'))
    tb=_ep_half_bucket(state.get('half_seconds_remaining'))
    home=1 if bool(state.get('possession_home')) else 0
    pto,dto=_ep_timeout_pair(state)
    return (d,db,yb,tb,home,pto,dto)


def _build_ep_state_surface(rows):
    """Build a smooth state EP reference from nflverse/nflfastR pre-play EP.

    nflverse's ``ep`` is the nflfastR expected-points estimate at the start of a
    play from the possession team's perspective.  We aggregate those model
    outputs by football state, then use the same reference surface for both the
    actual enforced post-state and the reconstructed no-penalty post-state.
    This removes the old V94 asymmetry of stored play EPA on one side and an
    unrelated coarse counterfactual lookup on the other.
    """
    sums={}; counts={}
    for row in rows:
        ep=_pbp_num(row,'ep'); down=_pbp_num(row,'down'); dist=_pbp_num(row,'ydstogo'); yl=_pbp_num(row,'yardline_100')
        if ep is None or down is None or dist is None or yl is None: continue
        try:d=int(float(down))
        except (TypeError,ValueError):continue
        if d<1 or d>4:continue
        home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team')); posteam=_canon_team_code(row.get('posteam'))
        if home not in TEAM_NAMES or away not in TEAM_NAMES or posteam not in (home,away):continue
        hto,ato=_fixed_team_timeouts(row,home,posteam)
        st={'possession_home':posteam==home,'down':d,'ydstogo':float(dist),'yardline_100':float(yl),
            'half_seconds_remaining':_half_seconds_remaining(row),'home_timeouts':hto,'away_timeouts':ato}
        key=_ep_surface_cell_key(st)
        sums[key]=sums.get(key,0.0)+float(ep); counts[key]=counts.get(key,0)+1
    cells=[]; by_down={1:[],2:[],3:[],4:[]}; by_down_time={1:{},2:{},3:{},4:{}}
    for key,total in sums.items():
        count=counts[key]; rec=(*key,total/count,count)
        cells.append(rec); by_down[key[0]].append(rec); by_down_time[key[0]].setdefault(key[3],[]).append(rec)
    return {'version':'V97-nflfastR-derived-EP-surface','cells':cells,'by_down':by_down,'by_down_time':by_down_time,'row_cells':len(cells)}


def _serialize_ep_surface(surface):
    return {'version':surface.get('version'),'cells':[list(x) for x in surface.get('cells') or []]}


def _deserialize_ep_surface(obj):
    cells=[]; by_down={1:[],2:[],3:[],4:[]}; by_down_time={1:{},2:{},3:{},4:{}}
    for raw in obj.get('cells') or []:
        if len(raw)!=9:continue
        rec=tuple(raw); cells.append(rec)
        try:d=int(rec[0]); tb=int(rec[3])
        except Exception:continue
        if d in by_down:
            by_down[d].append(rec); by_down_time[d].setdefault(tb,[]).append(rec)
    return {'version':obj.get('version') or 'V97-nflfastR-derived-EP-surface','cells':cells,'by_down':by_down,'by_down_time':by_down_time,'row_cells':len(cells)}


def _ep_surface_predict(state,surface):
    """Estimate possession-team EP from the shared nflfastR-derived surface.

    The lookup is a locally weighted average of nearby 2025 nflfastR EP states.
    Both sides of every penalty comparison use this identical function, so any
    remaining approximation error is common-mode instead of being baked into
    only the counterfactual side.
    """
    if not state or not surface:return 0.0
    key=_ep_surface_cell_key(state); d,db,yb,tb,home,pto,dto=key
    by_time=((surface.get('by_down_time') or {}).get(d) or {})
    if by_time:
        nearest_times=sorted(by_time,key=lambda x:abs(float(x)-float(tb)))[:3]
        candidates=[rec for t in nearest_times for rec in by_time.get(t,[])]
    else:
        candidates=(surface.get('by_down') or {}).get(d) or []
    if not candidates:return 0.0
    # Prefer an exact populated cell.
    for rec in candidates:
        rd,rdb,ryb,rtb,rhome,rpto,rdto,mean,count=rec
        if (rdb,ryb,rtb,rhome,rpto,rdto)==(db,yb,tb,home,pto,dto) and count>=2:
            return float(mean)
    dist_order={1:0,3:1,6:2,10:3,15:4,20:5}
    target_di=dist_order.get(db,3)
    scored=[]
    for rec in candidates:
        rd,rdb,ryb,rtb,rhome,rpto,rdto,mean,count=rec
        # Field position and down/distance dominate. Time becomes increasingly
        # important near halftime; home/timeout effects are smaller tie-breakers.
        yard_term=abs(float(ryb)-float(yb))/5.0
        dist_term=1.35*abs(dist_order.get(int(rdb),3)-target_di)
        tscale=60.0 if tb<=300 else (180.0 if tb<=900 else 360.0)
        time_term=0.75*abs(float(rtb)-float(tb))/tscale
        home_term=0.20*(int(rhome)!=int(home))
        to_term=0.12*(abs(int(rpto)-int(pto))+abs(int(rdto)-int(dto)))
        distance=yard_term+dist_term+time_term+home_term+to_term
        if distance<=7.0:
            weight=max(1.0,float(count))/((1.0+distance)**2)
            scored.append((distance,weight,float(mean),int(count)))
    if not scored:
        # Last-resort nearest state on the same down.
        rec=min(candidates,key=lambda r:abs(float(r[2])-float(yb))+1.5*abs(dist_order.get(int(r[1]),3)-target_di))
        return float(rec[7])
    scored.sort(key=lambda x:x[0]); scored=scored[:18]
    den=sum(x[1] for x in scored)
    return sum(x[1]*x[2] for x in scored)/den if den>0 else scored[0][2]


def _fixed_team_ep_from_state(state, team_is_home, surface):
    """Return EP from one fixed team's perspective for a reconstructed state."""
    poss_ep=_ep_surface_predict(state,surface)
    team_has_ball=bool(state.get('possession_home'))==bool(team_is_home)
    return float(poss_ep) if team_has_ball else -float(poss_ep)


def _same_state_causal_epa(row,home,beneficiary,actual_state,counterfactual_state,ep_surface):
    """Score-aware causal EPA in one fixed-team frame.

    Expected points is a *future* possession value. Comparing only future EP
    misses points already scored in one branch. V97 therefore values each
    post-state as: realized fixed-team score-margin change from the pre-play
    scoreboard + fixed-team future EP. Both actual and no-penalty branches use
    the same EP surface.
    """
    team_is_home=(beneficiary==home)
    hs,aws=_pre_home_away_scores(row)
    pre_home_diff=float(hs)-float(aws)
    pre_team_diff=_fixed_team_score_diff(pre_home_diff,team_is_home)
    if actual_state is not None and counterfactual_state is not None and ep_surface:
        actual_future_ep=_fixed_team_ep_from_state(actual_state,team_is_home,ep_surface)
        cf_future_ep=_fixed_team_ep_from_state(counterfactual_state,team_is_home,ep_surface)
        actual_score_delta=_fixed_team_score_diff(actual_state.get('home_score_diff'),team_is_home)-pre_team_diff
        cf_score_delta=_fixed_team_score_diff(counterfactual_state.get('home_score_diff'),team_is_home)-pre_team_diff
        actual_state_value=actual_score_delta+actual_future_ep
        cf_state_value=cf_score_delta+cf_future_ep
        return (actual_state_value-cf_state_value,actual_future_ep,cf_future_ep,
                'nflfastR-derived-score-aware-same-state-surface',actual_score_delta,cf_score_delta,
                actual_state_value,cf_state_value)
    pre_ep=_pbp_num(row,'ep',0.0) or 0.0; observed=_pbp_num(row,'epa',0.0) or 0.0
    posteam=_canon_team_code(row.get('posteam'))
    post_old_offense=float(pre_ep)+float(observed)
    actual_future_ep=post_old_offense if beneficiary==posteam else -post_old_offense
    return (0.0,actual_future_ep,actual_future_ep,'nflverse-epa-endstate-fallback-zero',
            0.0,0.0,actual_future_ep,actual_future_ep)

def _get_ep_surface_2025(rows=None):
    global _EP_SURFACE_2025
    if _EP_SURFACE_2025 is not None:return _EP_SURFACE_2025
    with _EP_SURFACE_LOCK:
        if _EP_SURFACE_2025 is not None:return _EP_SURFACE_2025
        disk=_read_disk_cache(EP_SURFACE_2025_CACHE_KEY)
        if disk:
            try:
                obj=json.loads(disk['body'].decode('utf-8'))
                if obj.get('version')=='V97-nflfastR-derived-EP-surface':
                    _EP_SURFACE_2025=_deserialize_ep_surface(obj); return _EP_SURFACE_2025
            except Exception:pass
        if rows is None:
            text=_fetch_text(PBP_2025_URL,timeout=90); rows=list(csv.DictReader(io.StringIO(text)))
        _EP_SURFACE_2025=_build_ep_state_surface(rows)
        body=json.dumps(_serialize_ep_surface(_EP_SURFACE_2025),separators=(',',':')).encode('utf-8')
        _write_disk_cache(EP_SURFACE_2025_CACHE_KEY,body,'application/json')
        return _EP_SURFACE_2025


def _counterfactual_no_penalty_epa(row, ep_lookup, ep_by_down):
    """Estimate the underlying play EPA if the accepted flag were not enforced.

    This is an enforcement counterfactual, not a claim that the foul did or did
    not cause the football action.  For nullified turnovers/TDs we restore that
    explicit outcome.  For ordinary plays we advance the observed non-penalty
    yards.  Pre-snap/dead-ball no-plays default to the unchanged pre-play state.
    """
    pre_ep = _pbp_num(row, 'ep')
    if pre_ep is None:
        pre_ep = 0.0
    down = int(_pbp_num(row, 'down', 1) or 1)
    ydstogo = _pbp_num(row, 'ydstogo', 10) or 10
    yl = _pbp_num(row, 'yardline_100', 50) or 50
    posteam = _canon_team_code(row.get('posteam'))
    defteam = _canon_team_code(row.get('defteam'))
    desc = str(row.get('desc') or row.get('play_description') or '')
    upper = desc.upper()
    play_type = str(row.get('play_type') or '').lower()

    turnover = _pbp_true(row.get('interception')) or _pbp_true(row.get('fumble_lost')) or 'INTERCEPTED' in upper
    if turnover and defteam:
        new_yl = _parse_turnover_new_yardline_100(row, defteam)
        new_ep = _lookup_ep(ep_lookup, ep_by_down, 1, min(10, new_yl), new_yl)
        after_for_old_offense = -new_ep
        return after_for_old_offense - pre_ep, 'erased-turnover'

    td = _pbp_true(row.get('touchdown')) or 'TOUCHDOWN' in upper
    nullified = play_type == 'no_play' or 'NULLIFIED' in upper or 'NO PLAY' in upper
    if td and nullified:
        # nflfastR EP uses the possession team's perspective. A would-be
        # offensive TD is approximately a seven-point post-state from that view.
        return 7.0 - pre_ep, 'erased-touchdown'

    incomplete = _pbp_true(row.get('incomplete_pass')) or 'PASS INCOMPLETE' in upper or 'INCOMPLETE' in upper
    sack = _pbp_true(row.get('sack')) or 'SACKED' in upper

    # nflverse commonly stores yards_gained=0 on no_play rows even when the
    # description contains the erased football action.  Handle true pre-snap /
    # dead-ball no-plays before looking at yards, because no-penalty means the
    # same down/distance/state rather than a phantom zero-yard snap that consumes
    # a down.  This was the V86 inversion bug exposed by BUF's Week 1 4th-and-1
    # too-many-men penalty.
    presnap_types = (
        'FALSE START','DELAY OF GAME','NEUTRAL ZONE INFRACTION','ENCROACHMENT',
        'OFFSIDE','TOO MANY MEN','12 MEN','ILLEGAL SUBSTITUTION'
    )
    ptype = str(row.get('penalty_type') or '').upper()
    if play_type == 'no_play' and not turnover and not td and not incomplete and not sack \
            and any(x in ptype or x in upper for x in presnap_types):
        return 0.0, 'pre-snap-unchanged'

    gain = _pbp_num(row, 'yards_gained')
    parsed_gain = _parse_underlying_gain(desc)
    if play_type == 'no_play' and parsed_gain is not None and (gain is None or abs(float(gain)) < 1e-9):
        gain = parsed_gain
    elif gain is None:
        gain = parsed_gain

    if incomplete:
        gain = 0.0
    if sack and gain is None:
        # Text often lacks a clean signed gain in penalty/no-play rows.
        m = re.search(r'SACKED\s+AT\s+[A-Z]{2,3}\s+(\d+)', upper)
        if m:
            # Convert spot to an approximate loss using current side/yardline.
            gain = -7.0
        else:
            gain = -7.0
    if gain is None:
        # Unparseable live-ball penalty: treat enforcement as the observed state
        # change rather than inventing an underlying football result.
        return 0.0, 'enforcement-only'

    gain = float(gain)
    new_yl = min(99.0, max(0.0, yl - gain))
    converted = gain >= ydstogo or new_yl <= 0.0
    if new_yl <= 0.0:
        return 7.0 - pre_ep, 'underlying-touchdown'
    if converted:
        after_ep = _lookup_ep(ep_lookup, ep_by_down, 1, min(10, new_yl), new_yl)
        return after_ep - pre_ep, 'underlying-first-down'
    if down >= 4:
        new_poss_yl = min(99.0, max(1.0, 100.0 - new_yl))
        new_ep = _lookup_ep(ep_lookup, ep_by_down, 1, min(10, new_poss_yl), new_poss_yl)
        return (-new_ep) - pre_ep, 'underlying-turnover-on-downs'
    after_ep = _lookup_ep(ep_lookup, ep_by_down, down + 1, max(1.0, ydstogo - gain), new_yl)
    return after_ep - pre_ep, 'underlying-play'


def _causal_penalty_event(row, home, away, ep_lookup, ep_by_down, wp_model=None, next_row=None, ep_surface=None):
    if not _accepted_penalty(row, home, away):
        return None
    penalty_team = _canon_team_code(row.get('penalty_team'))
    posteam = _canon_team_code(row.get('posteam'))
    defteam = _canon_team_code(row.get('defteam'))
    if posteam not in (home, away):
        return None
    beneficiary = away if penalty_team == home else home
    observed_play_epa = _pbp_num(row, 'epa', 0.0) or 0.0

    # V97: reconstruct the two post-states once, then evaluate score-aware EPA and WPA from
    # those same states. EPA no longer mixes stored whole-play EPA with a coarse
    # counterfactual estimate.
    cf_state, state_kind=_counterfactual_no_penalty_state(row,next_row)

    # V92+: score BOTH WPA sides through the exact same packaged nflfastR model.
    # V91 mixed nflverse's stored home_wp_post on the actual side with our
    # packaged model on the counterfactual side. Even small model/state-version
    # differences repeated over many flags can create a large false season WPA.
    # The next valid scrimmage row is the authoritative enforced post-state.
    source_home_wp_post=_pbp_num(row,'home_wp_post')
    observed_posteam_wpa=_pbp_num(row,'wpa',0.0) or 0.0
    actual_state=_model_state_from_preplay_row(next_row)
    if actual_state is not None:
        actual_home_wp_post=_nflfastr_home_wp(actual_state)
        actual_wp_source='nflfastR-next-state'
    else:
        # Rare end-of-half / special-teams fallback only. Keep this visible in
        # event audit data so it can never silently contaminate a benchmark.
        actual_home_wp_post=source_home_wp_post
        if actual_home_wp_post is None:
            home_wp=_pbp_num(row,'home_wp')
            posteam_is_home=(posteam==home)
            pre=0.5 if home_wp is None else float(home_wp)
            actual_home_wp_post=max(0.0,min(1.0,pre+(float(observed_posteam_wpa) if posteam_is_home else -float(observed_posteam_wpa))))
        actual_wp_source='nflverse-home_wp_post-fallback'
    counterfactual_home_wp=_nflfastr_home_wp(cf_state)
    causal_home_wpa=float(actual_home_wp_post)-float(counterfactual_home_wp)
    causal_wpa=causal_home_wpa if beneficiary==home else -causal_home_wpa

    (causal_epa,actual_team_ep,counterfactual_team_ep,actual_ep_source,
     actual_team_score_delta,counterfactual_team_score_delta,actual_team_state_value,
     counterfactual_team_state_value)=_same_state_causal_epa(
        row,home,beneficiary,actual_state,cf_state,ep_surface)
    cf_kind=state_kind

    desc = str(row.get('desc') or row.get('play_description') or '')
    upper = desc.upper(); play_type = str(row.get('play_type') or '').lower()
    underlying_turnover = (_pbp_true(row.get('interception')) or _pbp_true(row.get('fumble_lost')) or 'INTERCEPTED' in upper)
    turnover_erased = bool(underlying_turnover and actual_state is not None and cf_state is not None and
                           bool(actual_state.get('possession_home')) != bool(cf_state.get('possession_home')))
    td_erased = ('erased-touchdown' == cf_kind)
    score_erased_points = {'erased-touchdown':7.0,'erased-field-goal':3.0,'erased-extra-point':1.0,'erased-two-point':2.0}.get(cf_kind,0.0)
    first_down = _pbp_true(row.get('first_down_penalty'))
    down = int(_pbp_num(row, 'down', 0) or 0)
    drive_saved = first_down and down in (3,4) and beneficiary == posteam
    return {
        'penalty_team': penalty_team, 'beneficiary': beneficiary, 'posteam': posteam, 'defteam': defteam,
        'penalty_type': str(row.get('penalty_type') or ''), 'penalty_yards': _pbp_num(row, 'penalty_yards', 0.0) or 0.0,
        'causal_epa': causal_epa, 'causal_wpa': causal_wpa, 'causal_home_wpa': causal_home_wpa,
        'actual_team_ep': actual_team_ep, 'counterfactual_team_ep': counterfactual_team_ep, 'actual_ep_source': actual_ep_source,
        'actual_team_future_ep': actual_team_ep, 'counterfactual_team_future_ep': counterfactual_team_ep,
        'actual_team_score_delta': actual_team_score_delta, 'counterfactual_team_score_delta': counterfactual_team_score_delta,
        'actual_team_state_value': actual_team_state_value, 'counterfactual_team_state_value': counterfactual_team_state_value,
        'actual_home_wp_post': float(actual_home_wp_post), 'source_home_wp_post': source_home_wp_post, 'actual_wp_source': actual_wp_source, 'counterfactual_home_wp': counterfactual_home_wp,
        'counterfactual_state': cf_state, 'counterfactual_epa': counterfactual_team_ep, 'observed_play_epa': observed_play_epa,
        'observed_play_wpa': observed_posteam_wpa, 'counterfactual_kind': state_kind,
        'counterfactual_wp_kind': state_kind, 'counterfactual_epa_kind': state_kind,
        'play_type': play_type, 'special_teams': bool(_is_special_teams_play(row)),
        'actual_state': actual_state, 'counterfactual_state': cf_state,
        'first_down_via_penalty': bool(first_down and beneficiary == posteam), 'turnover_erased': bool(turnover_erased),
        'touchdown_erased': bool(td_erased), 'score_erased_points':score_erased_points, 'drive_saved': bool(drive_saved), 'desc': desc[:700],
    }


def _blank_penalty_team():
    return {
        'first_downs_for':0,'first_downs_against':0,
        'tds_negated_benefit':0,'tds_negated_harm':0,
        'turnovers_negated_benefit':0,'turnovers_negated_harm':0,
        'drive_saves_benefit':0,'drive_saves_harm':0,
        'net_penalty_epa':0.0,'net_penalty_wpa':0.0,'events':0,
    }


def _penalty_context_from_rows(rows, include_postseason=False, wp_model=None, ep_surface=None):
    allowed = {'REG','POST'} if include_postseason else {'REG'}
    usable=[]
    game_meta={}
    for row in rows:
        st=str(row.get('season_type') or row.get('game_type') or '').upper()
        if st and st not in allowed:
            continue
        game_id=str(row.get('game_id') or '').strip()
        home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
        if not game_id or home not in TEAM_NAMES or away not in TEAM_NAMES:
            continue
        try: week=int(float(row.get('week') or 0))
        except (TypeError,ValueError): week=0
        usable.append(row)
        game_meta[game_id]={'game_id':game_id,'week':week,'home':home,'away':away}
    ep_lookup, ep_by_down = _build_ep_lookup(usable)
    if ep_surface is None:
        # Synthetic/unit-test callers can remain self-contained. Production
        # 2025/2026 paths pass the shared 2025 reference surface explicitly.
        ep_surface=_build_ep_state_surface(usable)
    games={}
    for gid, meta in game_meta.items():
        games[gid]={**meta,'teams':{meta['home']:_blank_penalty_team(),meta['away']:_blank_penalty_team()},'events':[]}
    next_by_id={}
    # Find the first subsequent row in the same game that represents a legal
    # scrimmage pre-state. This skips timeout/injury/PAT bookkeeping rows while
    # preserving the exact state produced by penalty enforcement.
    for i,row in enumerate(usable[:-1]):
        gid=str(row.get('game_id') or '')
        for j in range(i+1,min(len(usable),i+10)):
            cand=usable[j]
            if str(cand.get('game_id') or '') != gid:
                break
            if _model_state_from_preplay_row(cand) is not None:
                next_by_id[id(row)]=cand
                break
    for row in usable:
        gid=str(row.get('game_id') or '').strip(); meta=game_meta.get(gid)
        if not meta: continue
        event=_causal_penalty_event(row,meta['home'],meta['away'],ep_lookup,ep_by_down,wp_model,next_by_id.get(id(row)),ep_surface=ep_surface)
        if not event: continue
        offender=event['penalty_team']; beneficiary=event['beneficiary']
        if offender not in games[gid]['teams'] or beneficiary not in games[gid]['teams']:
            continue
        b=games[gid]['teams'][beneficiary]; o=games[gid]['teams'][offender]
        b['net_penalty_epa'] += event['causal_epa']; o['net_penalty_epa'] -= event['causal_epa']
        b['net_penalty_wpa'] += event['causal_wpa']; o['net_penalty_wpa'] -= event['causal_wpa']
        b['events'] += 1; o['events'] += 1
        if event['first_down_via_penalty']:
            b['first_downs_for'] += 1; o['first_downs_against'] += 1
        if event['turnover_erased']:
            b['turnovers_negated_benefit'] += 1; o['turnovers_negated_harm'] += 1
        if event['touchdown_erased']:
            b['tds_negated_benefit'] += 1; o['tds_negated_harm'] += 1
        if event['drive_saved']:
            b['drive_saves_benefit'] += 1; o['drive_saves_harm'] += 1
        games[gid]['events'].append(event)
    profiles={}
    for gid,g in games.items():
        for team, vals in g['teams'].items():
            pp=profiles.setdefault(team,{**_blank_penalty_team(),'games':0})
            pp['games'] += 1
            for key in ('first_downs_for','first_downs_against','tds_negated_benefit','tds_negated_harm',
                        'turnovers_negated_benefit','turnovers_negated_harm','drive_saves_benefit','drive_saves_harm','events'):
                pp[key] += int(vals.get(key,0) or 0)
            for key in ('net_penalty_epa','net_penalty_wpa'):
                pp[key] += float(vals.get(key,0) or 0)
    return list(games.values()), profiles


def _penalty_calibration_from_profiles(profiles):
    epa=[]; wpa=[]; first_downs=[]; erased_tds=[]
    for vals in profiles.values():
        g=max(1,int(vals.get('games') or 0))
        epa.append(float(vals.get('net_penalty_epa') or 0.0)/g)
        wpa.append(float(vals.get('net_penalty_wpa') or 0.0)/g)
        first_downs.append((float(vals.get('first_downs_for') or 0)-float(vals.get('first_downs_against') or 0))/g)
        erased_tds.append((float(vals.get('tds_negated_benefit') or 0)-float(vals.get('tds_negated_harm') or 0))/g)
    def rms(xs, fallback):
        if not xs: return fallback
        v=(sum(x*x for x in xs)/len(xs))**0.5
        return v if v > 1e-9 else fallback
    return {
        'epa_per_game_rms':rms(epa,1.1301),
        'wpa_per_game_rms':rms(wpa,0.03217),
        'first_downs_per_game_rms':rms(first_downs,0.65),
        'erased_tds_per_game_rms':rms(erased_tds,0.15),
        'epa_weight':0.40,'wpa_weight':0.25,'first_down_weight':0.20,'erased_td_weight':0.15,
        'softness':3.0,
        'component_z_cap':3.0,
        'score_scale_version':'V97 cap3-softness3-direct-coherence',
        'prior_equivalent_games':PENALTY_PRIOR_EQUIV_GAMES,
        'source_season':2025,'method':PENALTY_MODEL_VERSION,
    }


def _penalty_score_breakdown_from_averages(epa_pg, wpa_pg, first_down_pg, erased_td_pg, calibration):
    """Return the complete V97 Penalty Impact transform audit.

    The approved 40/25/20/15 weighted blend is unchanged. Each component is
    normalized and capped at +/-3 z. V97 adds a *directional coherence guard*:
    when both direct-value measures (causal EPA and causal WPA) agree that a
    team was helped or harmed, the descriptive first-down/erased-TD components
    may move the magnitude toward neutral but may not reverse which side of 50
    the final score lands on. When EPA and WPA disagree, all four components
    remain free to decide the sign.
    """
    import math
    es=max(1e-9,float(calibration.get('epa_per_game_rms') or 1.1301))
    ws=max(1e-9,float(calibration.get('wpa_per_game_rms') or .03217))
    fs=max(1e-9,float(calibration.get('first_downs_per_game_rms') or .65))
    ts=max(1e-9,float(calibration.get('erased_tds_per_game_rms') or .15))
    ew=float(calibration.get('epa_weight') or .40); ww=float(calibration.get('wpa_weight') or .25)
    fw=float(calibration.get('first_down_weight') or .20); tw=float(calibration.get('erased_td_weight') or .15)
    soft=max(.25,float(calibration.get('softness') or 3.0))
    cap=max(.25,float(calibration.get('component_z_cap') or 3.0))
    values={'epa':float(epa_pg or 0.0),'wpa':float(wpa_pg or 0.0),'first_down':float(first_down_pg or 0.0),'erased_td':float(erased_td_pg or 0.0)}
    scales={'epa':es,'wpa':ws,'first_down':fs,'erased_td':ts}
    weights={'epa':ew,'wpa':ww,'first_down':fw,'erased_td':tw}
    raw_z={k:values[k]/scales[k] for k in values}
    capped_z={k:max(-cap,min(cap,raw_z[k])) for k in raw_z}
    weighted={k:weights[k]*capped_z[k] for k in capped_z}
    weight_sum=max(1e-9,sum(weights.values()))
    pre_guard_combined_z=sum(weighted.values())/weight_sum
    direct_agreement='mixed'
    combined_z=pre_guard_combined_z
    guard_applied=False
    if values['epa']>0 and values['wpa']>0:
        direct_agreement='positive'
        if combined_z<0:
            combined_z=0.0; guard_applied=True
    elif values['epa']<0 and values['wpa']<0:
        direct_agreement='negative'
        if combined_z>0:
            combined_z=0.0; guard_applied=True
    score=max(0.0,min(100.0,50.0+50.0*math.tanh(combined_z/soft)))
    return {
        'raw':values,'scales':scales,'raw_z':raw_z,'capped_z':capped_z,
        'weights':weights,'weighted_contributions':weighted,'weight_sum':weight_sum,
        'pre_guard_combined_z':pre_guard_combined_z,'combined_z':combined_z,
        'direct_value_agreement':direct_agreement,'direction_guard_applied':guard_applied,
        'softness':soft,'component_z_cap':cap,'score':score,
        'effective_score_floor':50.0+50.0*math.tanh(-cap/soft),
        'effective_score_ceiling':50.0+50.0*math.tanh(cap/soft),
    }

def _penalty_score_from_averages(epa_pg, wpa_pg, first_down_pg, erased_td_pg, calibration):
    return _penalty_score_breakdown_from_averages(epa_pg,wpa_pg,first_down_pg,erased_td_pg,calibration)['score']


def _attach_penalty_scores(games, profiles, calibration):
    for vals in profiles.values():
        g=max(1,int(vals.get('games') or 0))
        fd=(float(vals.get('first_downs_for') or 0)-float(vals.get('first_downs_against') or 0))/g
        td=(float(vals.get('tds_negated_benefit') or 0)-float(vals.get('tds_negated_harm') or 0))/g
        breakdown=_penalty_score_breakdown_from_averages(vals.get('net_penalty_epa',0)/g,vals.get('net_penalty_wpa',0)/g,fd,td,calibration)
        vals['penaltyImpactScore']=breakdown['score']
        vals['penaltyImpactBreakdown']=breakdown
    for game in games:
        for vals in game.get('teams',{}).values():
            fd=float(vals.get('first_downs_for') or 0)-float(vals.get('first_downs_against') or 0)
            td=float(vals.get('tds_negated_benefit') or 0)-float(vals.get('tds_negated_harm') or 0)
            breakdown=_penalty_score_breakdown_from_averages(vals.get('net_penalty_epa',0),vals.get('net_penalty_wpa',0),fd,td,calibration)
            vals['penaltyImpactScore']=breakdown['score']
            vals['penaltyImpactBreakdown']=breakdown


def penalty_reference_2025_payload():
    """2025 modeling reference only: league normalization under the V97 method.

    No team-specific 2025 penalty result is carried into 2026.  The historical
    season is used only to normalize the current-season 0-100 scale. Counterfactual
    WP comes from the packaged nflfastR no-spread model; EPA uses the same 2025 nflfastR-derived state surface on both sides of each penalty.
    """
    with LOCK:
        cached=CACHE.get(PENALTY_REFERENCE_2025_CACHE_KEY)
        if cached:
            return json.loads(cached['body'].decode('utf-8'))
    disk=_read_disk_cache(PENALTY_REFERENCE_2025_CACHE_KEY)
    if disk:
        try:
            obj=json.loads(disk['body'].decode('utf-8'))
            if obj.get('method') == PENALTY_MODEL_VERSION:
                with LOCK:CACHE[PENALTY_REFERENCE_2025_CACHE_KEY]={'ts':time.time(),'body':disk['body'],'ctype':'application/json'}
                return obj
        except Exception:pass
    text=_fetch_text(PBP_2025_URL,timeout=90)
    rows=list(csv.DictReader(io.StringIO(text)))
    ep_surface=_get_ep_surface_2025(rows)
    games,profiles=_penalty_context_from_rows(rows,include_postseason=False,wp_model=None,ep_surface=ep_surface)
    calibration=_penalty_calibration_from_profiles(profiles)
    calibration['prior_equivalent_games']=0.0
    calibration['source_season']=2025
    calibration['role']='league calibration only; no team carryover'
    model=_load_nflfastr_wp_model()
    obj={'season':2025,'method':PENALTY_MODEL_VERSION,'game_count':len(games),'calibration':calibration,'wp_reference':{'source':model.get('source'),'model_type':model.get('model_type'),'trees':len(model.get('trees') or [])},'ep_reference':{'source':'nflverse 2025 pre-play ep','method':'same-state locally weighted nflfastR-derived EP surface','cells':ep_surface.get('row_cells')}}
    body=json.dumps(obj,separators=(',',':')).encode('utf-8')
    with LOCK:CACHE[PENALTY_REFERENCE_2025_CACHE_KEY]={'ts':time.time(),'body':body,'ctype':'application/json'}
    _write_disk_cache(PENALTY_REFERENCE_2025_CACHE_KEY,body,'application/json')
    return obj




def _pbp_truthy(value):
    return str(value or '').strip().lower() in {'1','1.0','true','t','yes'}


def _pbp_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _defensive_points_per_drive_games(rows):
    """Return per-game drive scoring, sack-free pass EPA, OL disruption, and V103 QB rushing.

    Drives count only possessions with at least one real offensive scrimmage snap
    (or a field-goal attempt) and exclude kneel-only possessions. Points are
    credited only when the offense itself scores: offensive TDs, made field goals,
    PATs and successful two-point tries. Defensive/special-teams return scores and
    safeties therefore never get charged to the defense that was off the field.
    Overtime possessions are included.
    """
    # Identify each team's actual passers first so designed QB runs and scrambles
    # can be attributed from PBP without treating kneels as negative QB rushing.
    qb_ids_by_game_team={}
    for row in rows:
        game_id=str(row.get('game_id') or '').strip()
        posteam=_canon_team_code(row.get('posteam'))
        passer_id=str(row.get('passer_player_id') or '').strip()
        if not game_id or posteam not in TEAM_NAMES or not passer_id:
            continue
        if _pbp_truthy(row.get('pass_attempt')) or _pbp_truthy(row.get('sack')):
            qb_ids_by_game_team.setdefault((game_id,posteam),set()).add(passer_id)

    game_meta={}
    offense_points={}
    coverage_pass_epa={}
    coverage_pass_attempts={}
    coverage_pass_successes={}
    game_pass_yards={}
    game_pass_tds={}
    game_interceptions={}
    game_sack_yards={}
    game_sacks={}
    game_cpoe_sum={}
    game_cpoe_count={}
    pass_protection_dropbacks={}
    pass_protection_disruptions={}
    qb_rush_epa={}
    qb_rush_attempts={}
    drive_keys={}
    for row in rows:
        season_type=str(row.get('season_type') or row.get('game_type') or '').upper()
        if season_type and season_type!='REG':
            continue
        game_id=str(row.get('game_id') or '').strip()
        if not game_id:
            continue
        home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
        if home not in TEAM_NAMES or away not in TEAM_NAMES:
            continue
        try: week=int(float(row.get('week') or 0))
        except (TypeError,ValueError): week=0
        game_meta[game_id]={'game_id':game_id,'week':week,'home':home,'away':away}
        posteam=_canon_team_code(row.get('posteam')); defteam=_canon_team_code(row.get('defteam'))
        if posteam not in TEAM_NAMES or defteam not in TEAM_NAMES or posteam==defteam:
            continue

        points=0
        td_team=_canon_team_code(row.get('td_team'))
        is_kick_return=_pbp_truthy(row.get('kickoff_attempt')) or _pbp_truthy(row.get('punt_attempt'))
        if _pbp_truthy(row.get('touchdown')) and td_team==posteam and not is_kick_return:
            points += 6
        if str(row.get('field_goal_result') or '').strip().lower() in {'made','good'}:
            points += 3
        if str(row.get('extra_point_result') or '').strip().lower() in {'good','made'}:
            points += 1
        if str(row.get('two_point_conv_result') or '').strip().lower() in {'success','successful','good'}:
            points += 2
        if points:
            offense_points[(game_id,posteam)] = offense_points.get((game_id,posteam),0) + points

        # V101 Coverage owns only what happens once the quarterback actually
        # throws. Sacks belong exclusively to Pass Rush. Use real pass attempts
        # from play-by-play, exclude sacks and spikes, and aggregate their EPA.
        # Restrict to normal scrimmage downs so two-point attempts do not distort
        # the coverage efficiency sample.
        down=_pbp_float(row.get('down'))
        actual_pass_attempt=(
            _pbp_truthy(row.get('pass_attempt'))
            and not _pbp_truthy(row.get('sack'))
            and not _pbp_truthy(row.get('qb_spike'))
            and down is not None and 1 <= down <= 4
        )
        if actual_pass_attempt:
            epa=_pbp_float(row.get('epa'))
            if epa is not None:
                key=(game_id,posteam)
                coverage_pass_epa[key]=coverage_pass_epa.get(key,0.0)+epa
                coverage_pass_attempts[key]=coverage_pass_attempts.get(key,0)+1
                success=_pbp_float(row.get('success'))
                if success is not None and success > 0.5:
                    coverage_pass_successes[key]=coverage_pass_successes.get(key,0)+1
                py=_pbp_float(row.get('passing_yards'))
                if py is None: py=_pbp_float(row.get('yards_gained'))
                if py is not None: game_pass_yards[key]=game_pass_yards.get(key,0.0)+max(0.0,py)
                if _pbp_truthy(row.get('pass_touchdown')): game_pass_tds[key]=game_pass_tds.get(key,0)+1
                if _pbp_truthy(row.get('interception')): game_interceptions[key]=game_interceptions.get(key,0)+1
                cp=_pbp_float(row.get('cpoe'))
                if cp is not None:
                    game_cpoe_sum[key]=game_cpoe_sum.get(key,0.0)+cp
                    game_cpoe_count[key]=game_cpoe_count.get(key,0)+1

        # V102 pass protection: one disruption per dropback, never QB-hit + sack
        # arithmetic that can double-count a sack depending on provider semantics.
        normal_dropback=(
            down is not None and 1 <= down <= 4
            and not _pbp_truthy(row.get('qb_spike'))
            and (_pbp_truthy(row.get('pass_attempt')) or _pbp_truthy(row.get('sack')))
        )
        if normal_dropback:
            key=(game_id,posteam)
            pass_protection_dropbacks[key]=pass_protection_dropbacks.get(key,0)+1
            disrupted=_pbp_truthy(row.get('sack')) or _pbp_truthy(row.get('qb_hit'))
            if disrupted:
                pass_protection_disruptions[key]=pass_protection_disruptions.get(key,0)+1
            if _pbp_truthy(row.get('sack')):
                yg=_pbp_float(row.get('yards_gained'))
                if yg is not None: game_sack_yards[key]=game_sack_yards.get(key,0.0)+max(0.0,-yg)
                game_sacks[key]=game_sacks.get(key,0)+1

        # V103 QB rushing bonus: actual quarterback rushes only, with kneels
        # excluded. Passer IDs are established from the full game in the prepass,
        # so designed runs count along with scrambles without relying on a single
        # play-type flag.
        rusher_id=str(row.get('rusher_player_id') or '').strip()
        normal_qb_rush=(
            down is not None and 1 <= down <= 4
            and _pbp_truthy(row.get('rush_attempt'))
            and not _pbp_truthy(row.get('qb_kneel'))
            and rusher_id and rusher_id in qb_ids_by_game_team.get((game_id,posteam),set())
        )
        if normal_qb_rush:
            epa=_pbp_float(row.get('epa'))
            if epa is not None:
                key=(game_id,posteam)
                qb_rush_epa[key]=qb_rush_epa.get(key,0.0)+epa
                qb_rush_attempts[key]=qb_rush_attempts.get(key,0)+1

        drive=str(row.get('drive') or '').strip()
        if not drive:
            continue
        down=_pbp_float(row.get('down'))
        real_snap=down is not None and 1 <= down <= 4 and not _pbp_truthy(row.get('qb_kneel'))
        field_goal=_pbp_truthy(row.get('field_goal_attempt'))
        if real_snap or field_goal:
            drive_keys[(game_id,drive,posteam)]={'defense':defteam}

    drive_counts={}
    for game_id,drive,posteam in drive_keys:
        drive_counts[(game_id,posteam)] = drive_counts.get((game_id,posteam),0) + 1

    out=[]
    for game_id,g in game_meta.items():
        home,away=g['home'],g['away']
        home_drives=int(drive_counts.get((game_id,home),0)); away_drives=int(drive_counts.get((game_id,away),0))
        # Ignore incomplete/not-yet-played PBP shells with no offensive possessions.
        if home_drives<=0 and away_drives<=0:
            continue
        out.append({
            **g,
            'home_offensive_points':int(offense_points.get((game_id,home),0)),
            'away_offensive_points':int(offense_points.get((game_id,away),0)),
            'home_offensive_drives':home_drives,
            'away_offensive_drives':away_drives,
            'home_coverage_pass_epa':float(coverage_pass_epa.get((game_id,home),0.0)),
            'away_coverage_pass_epa':float(coverage_pass_epa.get((game_id,away),0.0)),
            'home_coverage_pass_attempts':int(coverage_pass_attempts.get((game_id,home),0)),
            'home_pass_yards':float(game_pass_yards.get((game_id,home),0.0)), 'home_pass_tds':int(game_pass_tds.get((game_id,home),0)), 'home_interceptions':int(game_interceptions.get((game_id,home),0)), 'home_sack_yards':float(game_sack_yards.get((game_id,home),0.0)), 'home_sacks':int(game_sacks.get((game_id,home),0)), 'home_cpoe':(float(game_cpoe_sum.get((game_id,home),0.0))/game_cpoe_count[(game_id,home)] if game_cpoe_count.get((game_id,home),0)>0 else None),
            'away_coverage_pass_attempts':int(coverage_pass_attempts.get((game_id,away),0)),
            'away_pass_yards':float(game_pass_yards.get((game_id,away),0.0)), 'away_pass_tds':int(game_pass_tds.get((game_id,away),0)), 'away_interceptions':int(game_interceptions.get((game_id,away),0)), 'away_sack_yards':float(game_sack_yards.get((game_id,away),0.0)), 'away_sacks':int(game_sacks.get((game_id,away),0)), 'away_cpoe':(float(game_cpoe_sum.get((game_id,away),0.0))/game_cpoe_count[(game_id,away)] if game_cpoe_count.get((game_id,away),0)>0 else None),
            'home_coverage_pass_successes':int(coverage_pass_successes.get((game_id,home),0)),
            'away_coverage_pass_successes':int(coverage_pass_successes.get((game_id,away),0)),
            'home_pass_protection_dropbacks':int(pass_protection_dropbacks.get((game_id,home),0)),
            'away_pass_protection_dropbacks':int(pass_protection_dropbacks.get((game_id,away),0)),
            'home_pass_protection_disruptions':int(pass_protection_disruptions.get((game_id,home),0)),
            'away_pass_protection_disruptions':int(pass_protection_disruptions.get((game_id,away),0)),
            'home_qb_rush_epa':float(qb_rush_epa.get((game_id,home),0.0)),
            'away_qb_rush_epa':float(qb_rush_epa.get((game_id,away),0.0)),
            'home_qb_rush_attempts':int(qb_rush_attempts.get((game_id,home),0)),
            'away_qb_rush_attempts':int(qb_rush_attempts.get((game_id,away),0)),
        })
    return sorted(out,key=lambda x:(x['week'],x['game_id']))



def _fumble_recovery_events(row, home, away, qb_ids=None):
    """Return de-duplicated, identifiable live-ball fumble recovery events.

    V113 retains V111's rule that one true loose ball is one opportunity. nflverse can expose two
    indexed fumble slots on the same play; exact duplicate fumbler/recoverer
    records are collapsed while genuinely distinct second fumbles remain.

    Botched/aborted snaps are tagged separately. An offense falling on its own
    botched snap is much more expected than winning a normal loose-ball scramble,
    so those events carry only 30% of an ordinary fumble's luck weight and use an
    80% expected recovery baseline for the fumbling offense (20% for the defense).
    """
    desc=str(row.get('desc') or row.get('play_description') or '')
    upper=desc.upper()
    play_type=str(row.get('play_type') or '').lower()
    # Final PBP normally clears fumble fields after replay. These textual guards
    # prevent an overturned/non-play marker from surviving as a luck event.
    if play_type=='no_play' or re.search(r'\b(NO FUMBLE|NOT A FUMBLE|DOWN BY CONTACT|INCOMPLETE PASS|REVERSED|OVERTURNED)\b',upper):
        return []

    posteam=_canon_team_code(row.get('posteam'))
    botched_text=bool(re.search(r'\b(BAD SNAP|BOTCHED SNAP|ABORTED|MUFF(?:ED|S)? SNAP|SNAP[^.]{0,45}FUMBLE)\b',upper))
    botched_flag=_pbp_true(row.get('aborted_play')) or botched_text
    qb_ids=set(qb_ids or [])
    passer_id=str(row.get('passer_player_id') or '').strip()
    play_id=str(row.get('play_id') or row.get('nflverse_play_id') or '').strip() or None
    special_teams=any(_pbp_true(row.get(k)) for k in ('punt_attempt','kickoff_attempt','field_goal_attempt','extra_point_attempt'))
    events=[]; seen=set()

    for idx in (1,2):
        ft=_canon_team_code(row.get(f'fumbled_{idx}_team'))
        rt=_canon_team_code(row.get(f'fumble_recovery_{idx}_team'))
        if ft not in (home,away) or rt not in (home,away):
            continue
        fumbler=str(row.get(f'fumbled_{idx}_player_id') or row.get(f'fumbled_{idx}_player_name') or '').strip()
        recoverer=str(row.get(f'fumble_recovery_{idx}_player_id') or row.get(f'fumble_recovery_{idx}_player_name') or '').strip()
        # Duplicate indexed fields occasionally describe the same loose ball.
        # If player IDs/names are absent, team-pair duplication on a single play
        # is still more safely treated as one event than two phantom fumbles.
        key=(ft,rt,fumbler or '<team>',recoverer or '<team>')
        if key in seen:
            continue
        seen.add(key)
        # Some center/QB exchange fumbles are encoded as ordinary fumbles even
        # when the text never says "bad snap". If the recovery is by a known
        # quarterback and the fumbler is a different offensive player, treat the
        # exchange as a botched snap. This is league-wide role logic, not a team
        # or player-name exception.
        exchange_like=bool(
            ft==posteam and not special_teams and fumbler and recoverer and fumbler!=recoverer
            and recoverer in qb_ids and fumbler not in qb_ids
        )
        is_botched=bool(ft==posteam and (botched_flag or exchange_like))
        events.append({
            'play_id':play_id,
            'fumble_team':ft,'recovery_team':rt,
            'kind':'botched_snap' if is_botched else 'ordinary',
            'weight':0.30 if is_botched else 1.0,
            'fumble_team_expected_recovery':0.80 if is_botched else 0.50,
            'fumbler':fumbler or None,'recoverer':recoverer or None,
        })

    if events:
        return events

    # Conservative fallback for feeds that lost the indexed fields. Require a
    # real recovery marker and a fumble/muff signal; out-of-bounds/non-recovered
    # loose balls are not recovery-rate opportunities.
    if not (_pbp_true(row.get('fumble_lost')) or 'FUMBLE' in upper or 'MUFF' in upper):
        return []
    ft=_canon_team_code(row.get('posteam'))
    rt=None
    m=re.search(r'RECOVERED\s+by\s+([A-Z]{2,3})\b',upper,re.I)
    if m:
        rt=_canon_team_code(m.group(1))
    if ft in (home,away) and rt in (home,away):
        is_botched=bool(botched_flag and ft==posteam)
        return [{
            'play_id':play_id,
            'fumble_team':ft,'recovery_team':rt,
            'kind':'botched_snap' if is_botched else 'ordinary',
            'weight':0.30 if is_botched else 1.0,
            'fumble_team_expected_recovery':0.80 if is_botched else 0.50,
            'fumbler':None,'recoverer':None,
        }]
    return []


def _performance_luck_games(rows, drive_games=None, calibration=None):
    """Build transparent postgame performance/deserved-win evidence for V113 Luck.

    The game probability is intentionally descriptive rather than predictive. It
    combines score margin with underlying scrimmage efficiency while excluding
    fumble-recovery outcome from the turnover term. Interceptions remain a skill/
    decision signal; fumble recovery is emitted separately as explicit luck.
    """
    drive_by_game={str(g.get('game_id')):g for g in (drive_games or [])}
    # Role context lets the fumble parser identify center/QB exchange fumbles
    # without hard-coding teams or player names.
    qb_ids_by_game_team={}
    for row in rows:
        gid=str(row.get('game_id') or '').strip(); team=_canon_team_code(row.get('posteam'))
        pid=str(row.get('passer_player_id') or '').strip()
        if gid and team in TEAM_NAMES and pid and (_pbp_truthy(row.get('pass_attempt')) or _pbp_truthy(row.get('sack'))):
            qb_ids_by_game_team.setdefault((gid,team),set()).add(pid)
    games={}
    for row in rows:
        season_type=str(row.get('season_type') or row.get('game_type') or '').upper()
        if season_type and season_type!='REG':
            continue
        gid=str(row.get('game_id') or '').strip()
        if not gid:
            continue
        home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
        if home not in TEAM_NAMES or away not in TEAM_NAMES:
            continue
        try: week=int(float(row.get('week') or 0))
        except (TypeError,ValueError): week=0
        g=games.setdefault(gid,{
            'game_id':gid,'week':week,'home':home,'away':away,
            'home':{'epa':0.0,'plays':0,'successes':0,'yards':0.0,'interceptions':0,'fumble_recoveries':0,'fumble_weighted_recoveries':0.0,'fumble_expected_recoveries':0.0},
            'away':{'epa':0.0,'plays':0,'successes':0,'yards':0.0,'interceptions':0,'fumble_recoveries':0,'fumble_weighted_recoveries':0.0,'fumble_expected_recoveries':0.0},
            'fumble_opportunities':0,'fumble_weighted_opportunities':0.0,'botched_snap_fumble_opportunities':0,'ordinary_fumble_opportunities':0,'fumble_events':[],'seen_fumble_event_keys':set(),'home_score':0,'away_score':0,
        })
        hs=_pbp_num(row,'total_home_score'); aws=_pbp_num(row,'total_away_score')
        if hs is not None: g['home_score']=max(g['home_score'],int(hs))
        if aws is not None: g['away_score']=max(g['away_score'],int(aws))
        posteam=_canon_team_code(row.get('posteam'))
        side='home' if posteam==home else ('away' if posteam==away else None)
        down=_pbp_float(row.get('down'))
        scrimmage=(
            side is not None and down is not None and 1 <= down <= 4
            and not _pbp_truthy(row.get('qb_kneel'))
            and not _pbp_truthy(row.get('qb_spike'))
            and not _pbp_truthy(row.get('two_point_attempt'))
            and (_pbp_truthy(row.get('pass_attempt')) or _pbp_truthy(row.get('rush_attempt')) or _pbp_truthy(row.get('sack')))
        )
        if scrimmage:
            epa=_pbp_float(row.get('epa'))
            yards=_pbp_float(row.get('yards_gained'))
            success=_pbp_float(row.get('success'))
            if epa is not None:
                g[side]['epa'] += epa
                g[side]['plays'] += 1
                g[side]['yards'] += yards if yards is not None else 0.0
                if success is not None and success > 0.5:
                    g[side]['successes'] += 1
            if _pbp_truthy(row.get('interception')):
                g[side]['interceptions'] += 1
        qb_ids=qb_ids_by_game_team.get((gid,posteam),set()) if posteam in TEAM_NAMES else set()
        for ev in _fumble_recovery_events(row,home,away,qb_ids):
            ft,rt=ev['fumble_team'],ev['recovery_team']
            # Deduplicate the same recovery marker if a provider repeats it at
            # team and player level. Prefer play_id when present; otherwise use
            # the participant/team identity within the game.
            event_key=(ev.get('play_id') or '',ft,rt,ev.get('fumbler') or '<team>',ev.get('recoverer') or '<team>')
            if event_key in g['seen_fumble_event_keys']:
                continue
            g['seen_fumble_event_keys'].add(event_key)
            weight=float(ev.get('weight') or 1.0)
            fumbling_expected=float(ev.get('fumble_team_expected_recovery') or 0.5)
            g['fumble_opportunities'] += 1
            g['fumble_weighted_opportunities'] += weight
            if ev.get('kind')=='botched_snap': g['botched_snap_fumble_opportunities'] += 1
            else: g['ordinary_fumble_opportunities'] += 1
            g['fumble_events'].append(ev)
            for side,team_code in (('home',home),('away',away)):
                expected=fumbling_expected if team_code==ft else 1.0-fumbling_expected
                g[side]['fumble_expected_recoveries'] += weight*expected
                if rt==team_code:
                    g[side]['fumble_recoveries'] += 1
                    g[side]['fumble_weighted_recoveries'] += weight

    out=[]
    for gid,g in games.items():
        d=drive_by_game.get(gid) or {}
        if not g['home']['plays'] or not g['away']['plays']:
            continue
        home,away=g['home'],g['away']
        def rate(side,key):
            return side[key]/side['plays'] if side['plays'] else 0.0
        home_epa=rate(home,'epa'); away_epa=rate(away,'epa')
        home_sr=home['successes']/home['plays']; away_sr=away['successes']/away['plays']
        home_ypp=home['yards']/home['plays']; away_ypp=away['yards']/away['plays']
        hd=max(1,int(d.get('home_offensive_drives') or 0)); ad=max(1,int(d.get('away_offensive_drives') or 0))
        home_pts=float(d.get('home_offensive_points')) if 'home_offensive_points' in d else float(g['home_score'])
        away_pts=float(d.get('away_offensive_points')) if 'away_offensive_points' in d else float(g['away_score'])
        home_ppd=home_pts/hd
        away_ppd=away_pts/ad
        score_margin=float(g['home_score']-g['away_score'])
        epa_diff=home_epa-away_epa
        success_diff=home_sr-away_sr
        ypp_diff=home_ypp-away_ypp
        yards_diff=float(home['yards']-away['yards'])
        ppd_diff=home_ppd-away_ppd
        interception_diff=float(away['interceptions']-home['interceptions'])
        # V113: deserved-win probability is calibrated from league-wide historical
        # game relationships rather than hand-picked point-equivalent weights.
        # Final score is retained for audit but is deliberately NOT a predictor;
        # the performance model uses EPA/play, success rate, yards/play, total
        # scrimmage yards, offensive points/drive, and interception differential.
        feature_values={
            'epa_diff':epa_diff,'success_diff':success_diff,'ypp_diff':ypp_diff,
            'yards_diff':yards_diff,'ppd_diff':ppd_diff,'interception_diff':interception_diff,
        }
        cal=calibration if isinstance(calibration,dict) and calibration.get('valid') else None
        if cal:
            z=float(cal.get('intercept') or 0.0)
            means=cal.get('means') or {}; scales=cal.get('scales') or {}; coefs=cal.get('coefficients') or {}
            for name,val in feature_values.items():
                scale=max(1e-9,float(scales.get(name) or 1.0))
                z += float(coefs.get(name) or 0.0) * ((float(val)-float(means.get(name) or 0.0))/scale)
            z=max(-6.0,min(6.0,z))
            home_prob=1.0/(1.0+math.exp(-z))
            home_prob=max(0.01,min(0.99,home_prob))
            underlying=4.0*z
            deserved_margin=underlying
            margin_cal=cal.get('epa_margin') or {}
            margin_intercept=float(margin_cal.get('intercept') or 0.0)
            margin_slope=float(margin_cal.get('slope') or 0.0)
            epa_expected_margin=margin_intercept + margin_slope*epa_diff
            epa_margin_residual_sd=max(1e-6,float(margin_cal.get('residual_sd') or 12.0))
            epa_margin_r2=float(margin_cal.get('r2') or 0.0)
            calibration_source=cal.get('version') or 'historical-logistic'
        else:
            # Conservative fallback only when the historical calibration cannot
            # be loaded. This preserves service availability without team-specific
            # exceptions.
            epa_equiv=35.0*epa_diff; success_equiv=40.0*success_diff; ypp_equiv=3.0*ypp_diff
            ppd_equiv=4.0*ppd_diff; int_equiv=4.0*interception_diff
            underlying=(0.35*epa_equiv+0.20*success_equiv+0.20*ypp_equiv+0.15*ppd_equiv+0.10*int_equiv)
            deserved_margin=0.40*score_margin+0.60*underlying
            home_prob=1.0/(1.0+math.exp(-deserved_margin/4.0)); home_prob=max(0.01,min(0.99,home_prob))
            # Conservative EPA-margin fallback. Production should normally use
            # the historical V121 calibration above.
            margin_intercept=0.0; margin_slope=35.0
            epa_expected_margin=margin_slope*epa_diff
            epa_margin_residual_sd=12.0; epa_margin_r2=0.0
            calibration_source='V121-fallback'
        out.append({
            'game_id':gid,'week':g['week'],'home':g['home'] if isinstance(g['home'],str) else None,
        })
        out[-1].update({
            'home_team':g.get('home') if isinstance(g.get('home'),str) else None,
            'away_team':g.get('away') if isinstance(g.get('away'),str) else None,
            'home_score':g['home_score'],'away_score':g['away_score'],'score_margin_home':score_margin,
            'home_epa_per_play':home_epa,'away_epa_per_play':away_epa,'epa_diff_home':epa_diff,
            'home_success_rate':home_sr,'away_success_rate':away_sr,'success_diff_home':success_diff,
            'home_yards_per_play':home_ypp,'away_yards_per_play':away_ypp,'ypp_diff_home':ypp_diff,'yards_diff_home':yards_diff,
            'home_points_per_drive':home_ppd,'away_points_per_drive':away_ppd,'ppd_diff_home':ppd_diff,
            'home_interceptions_thrown':home['interceptions'],'away_interceptions_thrown':away['interceptions'],'interception_diff_home':interception_diff,
            'underlying_margin_home':underlying,'deserved_margin_home':deserved_margin,'home_deserved_win_prob':home_prob,'performance_calibration_source':calibration_source,
            'epa_expected_margin_home':epa_expected_margin,'epa_margin_residual_sd':epa_margin_residual_sd,'epa_margin_r2':epa_margin_r2,
            'fumble_opportunities':g['fumble_opportunities'],
            'fumble_weighted_opportunities':g['fumble_weighted_opportunities'],
            'ordinary_fumble_opportunities':g['ordinary_fumble_opportunities'],
            'botched_snap_fumble_opportunities':g['botched_snap_fumble_opportunities'],
            'home_fumble_recoveries':home['fumble_recoveries'],'away_fumble_recoveries':away['fumble_recoveries'],
            'home_fumble_weighted_recoveries':home['fumble_weighted_recoveries'],'away_fumble_weighted_recoveries':away['fumble_weighted_recoveries'],
            'home_fumble_expected_recoveries':home['fumble_expected_recoveries'],'away_fumble_expected_recoveries':away['fumble_expected_recoveries'],
            'fumble_events':g['fumble_events'],
            'method':'V121 league-wide Luck evidence: EPA/play-implied scoring margin from historical OLS is primary; V113 deserved-win probability retained for outcome-surprise audit; fumble recovery uses play-level deduplication, replay-reversal exclusion, and QB-role botched-snap classification'
        })
    # Repair team labels from metadata (the dict keys above are occupied by stat blocks).
    meta={str(row.get('game_id') or '').strip():(_canon_team_code(row.get('home_team')),_canon_team_code(row.get('away_team'))) for row in rows if str(row.get('game_id') or '').strip()}
    for rec in out:
        h,a=meta.get(rec['game_id'],(None,None)); rec['home']=h; rec['away']=a
        rec.pop('home_team',None); rec.pop('away_team',None)
    return sorted(out,key=lambda x:(x['week'],x['game_id']))


def _solve_linear_system(a,b):
    """Small dense Gaussian-elimination solver used by V113 logistic calibration."""
    n=len(b); m=[list(map(float,a[i]))+[float(b[i])] for i in range(n)]
    for col in range(n):
        pivot=max(range(col,n),key=lambda r:abs(m[r][col]))
        if abs(m[pivot][col])<1e-10: return None
        m[col],m[pivot]=m[pivot],m[col]
        div=m[col][col]
        m[col]=[v/div for v in m[col]]
        for r in range(n):
            if r==col: continue
            f=m[r][col]
            if abs(f)<1e-15: continue
            m[r]=[m[r][c]-f*m[col][c] for c in range(n+1)]
    return [m[i][-1] for i in range(n)]


def _fit_performance_luck_calibration(game_rows):
    """Fit league-wide historical Luck calibrations.

    V121 retains the V113 ridge-logistic deserved-win model for the small
    outcome-surprise audit term, and adds an ordinary-least-squares mapping
    from net EPA/play to actual scoring margin. The EPA->margin mapping is the
    primary Luck anchor: it asks whether scoreboard margin over/under-realized
    the quality of scrimmage play rather than whether a team's W-L record was
    surprising.
    """
    names=['epa_diff','success_diff','ypp_diff','yards_diff','ppd_diff','interception_diff']
    samples=[]
    margin_samples=[]
    for g in game_rows or []:
        hs=_pbp_float(g.get('home_score')); aws=_pbp_float(g.get('away_score'))
        if hs is None or aws is None or hs==aws: continue
        vals=[_pbp_float(g.get(k+'_home')) for k in names]
        if any(v is None or not math.isfinite(v) for v in vals): continue
        samples.append((vals,1.0 if hs>aws else 0.0))
        margin_samples.append((float(vals[0]),float(hs-aws)))
    if len(samples)<200:
        return {'version':'V121-EPA-MARGIN-LUCK-2025-1','valid':False,'sample_count':len(samples),'error':'insufficient historical games'}
    means={}; scales={}
    for j,name in enumerate(names):
        arr=[x[0][j] for x in samples]; mu=sum(arr)/len(arr)
        var=sum((v-mu)**2 for v in arr)/max(1,len(arr)-1); sd=max(1e-6,math.sqrt(var))
        means[name]=mu; scales[name]=sd
    X=[]; y=[]
    for vals,target in samples:
        X.append([1.0]+[(vals[j]-means[names[j]])/scales[names[j]] for j in range(len(names))]); y.append(target)
    p=len(names)+1; beta=[0.0]*p; ridge=2.0
    for _ in range(35):
        grad=[0.0]*p; h=[[0.0]*p for _ in range(p)]
        for xi,yi in zip(X,y):
            z=max(-20.0,min(20.0,sum(beta[j]*xi[j] for j in range(p))))
            pr=1.0/(1.0+math.exp(-z)); w=max(1e-6,pr*(1-pr)); err=yi-pr
            for j in range(p):
                grad[j]+=xi[j]*err
                for k in range(p): h[j][k]+=w*xi[j]*xi[k]
        for j in range(1,p):
            grad[j]-=ridge*beta[j]; h[j][j]+=ridge
        step=_solve_linear_system(h,grad)
        if step is None: break
        beta=[beta[j]+step[j] for j in range(p)]
        if max(abs(v) for v in step)<1e-7: break
    # V121 scoring-realization calibration: actual home scoring margin = a + b * net EPA/play.
    # Keep the historical home-field intercept because a current team's schedule
    # can be temporarily home/away imbalanced; team-perspective margins flip the
    # intercept automatically for road games.
    xs=[x for x,_ in margin_samples]; ys=[y for _,y in margin_samples]
    xbar=sum(xs)/len(xs); ybar=sum(ys)/len(ys)
    sxx=sum((x-xbar)**2 for x in xs)
    slope=(sum((x-xbar)*(y-ybar) for x,y in margin_samples)/sxx) if sxx>1e-12 else 0.0
    margin_intercept=ybar-slope*xbar
    residuals=[y-(margin_intercept+slope*x) for x,y in margin_samples]
    residual_mean=sum(residuals)/len(residuals)
    residual_var=sum((r-residual_mean)**2 for r in residuals)/max(1,len(residuals)-1)
    residual_sd=max(1e-6,math.sqrt(residual_var))
    sst=sum((y-ybar)**2 for y in ys)
    sse=sum(r*r for r in residuals)
    r2=1.0-sse/sst if sst>1e-12 else 0.0
    return {
        'version':'V121-EPA-MARGIN-LUCK-2025-1','valid':True,'season':2025,'sample_count':len(samples),
        'features':names,'intercept':beta[0],'coefficients':{names[j]:beta[j+1] for j in range(len(names))},
        'means':means,'scales':scales,'ridge':ridge,
        'epa_margin':{
            'intercept':margin_intercept,'slope':slope,'residual_sd':residual_sd,'r2':r2,
            'sample_count':len(margin_samples),
            'method':'OLS on 2025 regular-season team-game home-perspective net scrimmage EPA/play versus final scoring margin; intercept retains historical home-field realization.'
        },
        'method':'V121 Luck reference: EPA/play-to-scoring-margin OLS is primary for scoring realization; V113 ridge logistic deserved-win calibration is retained only for the small outcome-surprise audit component.'
    }


def performance_luck_calibration_2025_payload(force=False):
    now=time.time(); key=PERFORMANCE_LUCK_2025_CACHE_KEY
    with LOCK:
        cached=CACHE.get(key)
        if not force and cached:
            try:
                obj=json.loads(cached['body'].decode('utf-8'))
                if obj.get('valid') and int(obj.get('sample_count') or 0)>=200: return obj
            except Exception: pass
    if not force:
        disk=_read_disk_cache(key)
        if disk:
            try:
                obj=json.loads(disk['body'].decode('utf-8'))
                if obj.get('valid') and int(obj.get('sample_count') or 0)>=200:
                    with LOCK:CACHE[key]={'ts':now,'body':disk['body'],'ctype':'application/json'}
                    return obj
            except Exception: pass
    text=_fetch_text(PBP_2025_URL,timeout=90); rows=list(csv.DictReader(io.StringIO(text)))
    drive_games=_defensive_points_per_drive_games(rows)
    feature_games=_performance_luck_games(rows,drive_games,calibration=None)
    obj=_fit_performance_luck_calibration(feature_games)
    if not obj.get('valid'): raise ValueError(f"V113 performance calibration invalid: {obj}")
    body=json.dumps(obj,separators=(',',':')).encode('utf-8')
    with LOCK:CACHE[key]={'ts':now,'body':body,'ctype':'application/json'}
    _write_disk_cache(key,body,'application/json')
    return obj

def _v104_reference_from_drive_games(games, max_window=4):
    """Build same-sized 2025 empirical windows for V104 QB and OL calibration.

    The pass metric is sack-free actual-pass EPA/attempt, matching V101/V102 PBP
    ownership. OL is hit-OR-sack disruption per dropback, matching V102's
    de-duplicated protection definition. Rolling windows are by team games (byes
    therefore do not break a window).
    """
    by_team={}
    for g in games or []:
        for side in ('home','away'):
            team=_canon_team_code(g.get(side))
            if team not in TEAM_NAMES:
                continue
            rec={
                'week':int(g.get('week') or 0),
                'game_id':str(g.get('game_id') or ''),
                'pass_epa':float(g.get(f'{side}_coverage_pass_epa') or 0.0),
                'pass_attempts':int(g.get(f'{side}_coverage_pass_attempts') or 0),
                'pass_successes':int(g.get(f'{side}_coverage_pass_successes') or 0),
                'ol_disruptions':int(g.get(f'{side}_pass_protection_disruptions') or 0),
                'ol_dropbacks':int(g.get(f'{side}_pass_protection_dropbacks') or 0),
            }
            by_team.setdefault(team,[]).append(rec)
    for arr in by_team.values():
        arr.sort(key=lambda x:(x['week'],x['game_id']))
    windows={}
    for n_games in range(1,max_window+1):
        qb_vals=[]; qb_success_vals=[]; ol_vals=[]
        for arr in by_team.values():
            if len(arr)<n_games:
                continue
            for i in range(0,len(arr)-n_games+1):
                seg=arr[i:i+n_games]
                pa=sum(x['pass_attempts'] for x in seg)
                if pa>0:
                    qb_vals.append(sum(x['pass_epa'] for x in seg)/pa)
                    qb_success_vals.append(sum(x['pass_successes'] for x in seg)/pa)
                db=sum(x['ol_dropbacks'] for x in seg)
                if db>0:
                    ol_vals.append(sum(x['ol_disruptions'] for x in seg)/db)
        windows[str(n_games)]={
            'qb_pass_epa':[round(x,8) for x in qb_vals],
            'qb_pass_success_rate':[round(x,8) for x in qb_success_vals],
            'ol_disruption_rate':[round(x,8) for x in ol_vals],
        }
    return windows


def _v106_reference_valid(obj):
    if not isinstance(obj, dict) or obj.get('version') != 'V106-QB-CURRENT-SEASON-REFERENCE-3':
        return False
    # A full 2025 regular season has 272 games and roughly 544 team-game rows.
    # Reject empty/truncated payloads instead of silently blessing them as a valid
    # historical benchmark (the V104 bundle accidentally shipped game_count=0).
    if int(obj.get('game_count') or 0) < 250:
        return False
    windows=obj.get('sample_windows') or {}
    for n_games in ('1','2','3','4'):
        block=windows.get(n_games) or {}
        if len(block.get('qb_pass_epa') or []) < 400:
            return False
        if len(block.get('ol_disruption_rate') or []) < 400:
            return False
        if len(block.get('qb_pass_success_rate') or []) < 400:
            return False
    season_block=windows.get('17') or {}
    if len(season_block.get('qb_pass_epa') or []) < 30:
        return False
    if len(season_block.get('qb_pass_success_rate') or []) < 30:
        return False
    return True


def v104_reference_2025_payload(force=False):
    now=time.time(); key=V104_REFERENCE_2025_CACHE_KEY
    with LOCK:
        cached=CACHE.get(key)
        if not force and cached:
            try:
                obj=json.loads(cached['body'].decode('utf-8'))
                if _v106_reference_valid(obj):
                    return obj
            except Exception:
                pass
    if not force:
        disk=_read_disk_cache(key)
        if disk:
            try:
                obj=json.loads(disk['body'].decode('utf-8'))
                if _v106_reference_valid(obj):
                    with LOCK:CACHE[key]={'ts':now,'body':disk['body'],'ctype':'application/json'}
                    return obj
            except Exception:
                pass
    text=_fetch_text(PBP_2025_URL,timeout=90)
    rows=list(csv.DictReader(io.StringIO(text)))
    drive_games=_defensive_points_per_drive_games(rows)
    sample_windows=_v104_reference_from_drive_games(drive_games,17)
    obj={
        'version':'V106-QB-CURRENT-SEASON-REFERENCE-3',
        'season':2025,
        'source':'nflverse play-by-play 2025 regular season',
        'method':'rolling team-game windows through 17 games; QB=sack-free actual-pass EPA/attempt + pass success rate; OL=de-duplicated QB-hit OR sack disruption/dropback. V106 stabilizes 2026 QB metrics toward the 2026 league environment before scoring them against 2025 full-season distributions.',
        'game_count':len(drive_games),
        'sample_windows':sample_windows,
    }
    if not _v106_reference_valid(obj):
        counts={k:{m:len((v or {}).get(m) or []) for m in ('qb_pass_epa','qb_pass_success_rate','ol_disruption_rate')} for k,v in sample_windows.items()}
        raise ValueError(f'V106 historical reference failed integrity validation: games={len(drive_games)}, windows={counts}')
    body=json.dumps(obj,separators=(',',':')).encode('utf-8')
    with LOCK:CACHE[key]={'ts':now,'body':body,'ctype':'application/json'}
    _write_disk_cache(key,body,'application/json')
    return obj




def _v143_pressure_context(pbp_rows, ftn_rows):
    """V143 live QB pressure context.

    Preferred source is an explicit play-level pressure flag if a future live FTN feed
    exposes one. The current public 29-column 2026 FTN feed does not. In that case FORCE
    uses a deliberately narrow observable-pressure proxy: nflverse QB hit OR sack OR an
    FTN-charted throwaway. FTN still supplies rush count and context. This fallback is
    labelled as a proxy in the API/UI and never presented as charted pressure.
    """
    def truth(v):
        return str(v or '').strip().lower() in ('1','true','t','yes','y')
    def num(v):
        try:return float(v)
        except (TypeError,ValueError):return None
    def explicit_pressure(row):
        if not row:return None
        for field in ('was_pressure','is_qb_pressure','is_pressure','pressure'):
            if field in row and str(row.get(field) or '').strip()!='':
                return truth(row.get(field))
        return None
    fidx={}
    explicit_rows=0
    for r in ftn_rows or []:
        gid=str(r.get('nflverse_game_id') or r.get('game_id') or '').strip()
        pid=str(r.get('nflverse_play_id') or r.get('play_id') or '').strip()
        if explicit_pressure(r) is not None: explicit_rows += 1
        if gid and pid:fidx[(gid,pid)]=r
    source='explicit-charted-pressure' if explicit_rows else 'observable-pressure-proxy'
    out={}
    joined=classified=0
    for r in pbp_rows or []:
        gid=str(r.get('game_id') or '').strip(); pid=str(r.get('play_id') or '').strip()
        posteam=_canon_team_code(r.get('posteam'))
        if not gid or not pid or posteam not in TEAM_NAMES:continue
        down=num(r.get('down'))
        if down is None or not (1<=down<=4) or truth(r.get('qb_spike')):continue
        dropback=truth(r.get('pass_attempt')) or truth(r.get('sack'))
        if not dropback:continue
        f=fidx.get((gid,pid))
        if f: joined += 1
        pressured=explicit_pressure(f)
        if pressured is None:
            # High-specificity live fallback. Do not infer pressure merely from rush count,
            # blitz count, pocket movement, or EPA. Throwaway is FTN-charted.
            pressured=truth(r.get('qb_hit')) or truth(r.get('sack')) or truth((f or {}).get('is_throw_away'))
        classified += 1
        key=(gid,posteam)
        z=out.setdefault(key,{'standard_dropbacks':0,'standard_pressures':0,'pressure_epa':0.0,'pressure_plays':0,'pressure_successes':0,'clean_epa':0.0,'clean_plays':0})
        epa=num(r.get('epa'))
        if epa is not None:
            if pressured:
                z['pressure_epa']+=epa; z['pressure_plays']+=1
                success=num(r.get('success'))
                if success is not None and success > 0.5:z['pressure_successes']+=1
            else:
                z['clean_epa']+=epa; z['clean_plays']+=1
        if not f:continue
        rushers=num(f.get('n_pass_rushers'))
        if rushers is None or rushers<=0 or rushers>4:continue
        if truth(f.get('is_screen_pass')) or truth(f.get('is_screen')) or truth(f.get('screen')):continue
        if truth(f.get('qb_out_of_pocket')) or truth(f.get('is_qb_out_of_pocket')):continue
        if truth(f.get('is_qb_fault_sack')) or truth(f.get('qb_fault_sack')):continue
        z['standard_dropbacks']+=1
        if pressured:z['standard_pressures']+=1
    meta={'source':source,'explicit_pressure_rows':explicit_rows,'ftn_rows':len(ftn_rows or []),'joined_dropbacks':joined,'classified_dropbacks':classified}
    if not ftn_rows: meta['warning']='FTN charting unavailable; standard-rush protection component cannot be calculated.'
    elif not explicit_rows: meta['warning']='Live FTN feed has no pressure flag; using observable proxy (QB hit OR sack OR FTN throwaway).'
    elif joined==0: meta['warning']='FTN pressure rows were present but no nflverse game/play IDs joined to live PBP.'
    return out,meta

def game_flow_2026_payload(force=False):
    """Aggregate 2026 scoring flow plus V97 canonical game-row penalty impact.

    The score is current-season only. 2025 supplies league normalization only;
    every actual/counterfactual WPA uses the same nflfastR no-spread model, and EPA uses the same nflfastR-derived EP state surface on both sides.
    """
    now=time.time(); cache_key='/api/game-flow-2026-v137'
    with LOCK:
        cached=CACHE.get(cache_key)
        if not force and cached and now-cached['ts']<GAME_FLOW_CACHE_TTL:
            return cached['body'],True
    try:
        text=_fetch_text(PBP_2026_URL,timeout=55)
    except Exception:
        disk=_read_disk_cache(cache_key)
        if disk:
            body=disk['body']
            with LOCK: CACHE[cache_key]={'ts':now,'body':body,'ctype':'application/json'}
            return body,True
        raise
    rows=list(csv.DictReader(io.StringIO(text)))
    try:
        ftn_text=_fetch_text(UPSTREAMS['/api/ftn-charting'],timeout=35)
        ftn_rows=list(csv.DictReader(io.StringIO(ftn_text)))
    except Exception:
        ftn_rows=[]
    v143_pressure,v143_pressure_meta=_v143_pressure_context(rows,ftn_rows)
    defensive_drive_games=_defensive_points_per_drive_games(rows)
    for g in defensive_drive_games:
        gid=str(g.get('game_id') or '')
        for side in ('home','away'):
            team=_canon_team_code(g.get(side))
            z=v143_pressure.get((gid,team),{})
            g[f'{side}_standard_rush_dropbacks']=int(z.get('standard_dropbacks',0))
            g[f'{side}_standard_rush_pressures']=int(z.get('standard_pressures',0))
            g[f'{side}_pressure_epa']=float(z.get('pressure_epa',0.0))
            g[f'{side}_pressure_plays']=int(z.get('pressure_plays',0))
            g[f'{side}_pressure_successes']=int(z.get('pressure_successes',0))
            g[f'{side}_clean_epa']=float(z.get('clean_epa',0.0))
            g[f'{side}_clean_plays']=int(z.get('clean_plays',0))
    try:
        performance_luck_calibration=performance_luck_calibration_2025_payload()
    except Exception as e:
        performance_luck_calibration={'version':'V113-PERFORMANCE-LOGIT-2025-1','valid':False,'error':str(e)}
    performance_luck_games=_performance_luck_games(rows,defensive_drive_games,performance_luck_calibration)
    games={}
    for row in rows:
        try:qtr=int(float(row.get('qtr') or 0))
        except (TypeError,ValueError):continue
        if qtr<1 or qtr>4:continue
        season_type=str(row.get('season_type') or row.get('game_type') or '').upper()
        if season_type and season_type!='REG':continue
        game_id=str(row.get('game_id') or '').strip()
        if not game_id:continue
        home=_canon_team_code(row.get('home_team')); away=_canon_team_code(row.get('away_team'))
        if home not in TEAM_NAMES or away not in TEAM_NAMES:continue
        try:
            hs=int(float(row.get('total_home_score') or 0)); aws=int(float(row.get('total_away_score') or 0)); week=int(float(row.get('week') or 0))
        except (TypeError,ValueError):continue
        g=games.setdefault(game_id,{'game_id':game_id,'week':week,'home':home,'away':away,'ends':{}})
        old=g['ends'].get(qtr)
        if old is None or hs+aws>=old[0]+old[1]:g['ends'][qtr]=(hs,aws)
    out_games=[]; profiles={}
    for g in games.values():
        prev_h=prev_a=0; home_q=[]; away_q=[]; valid=True
        for q in range(1,5):
            end=g['ends'].get(q)
            if end is None:valid=False;break
            h,a=end;home_q.append(max(0,h-prev_h));away_q.append(max(0,a-prev_a));prev_h,prev_a=h,a
        if not valid:continue
        out_games.append({'game_id':g['game_id'],'week':g['week'],'home':g['home'],'away':g['away'],'home_q':home_q,'away_q':away_q})
        for team,pf,pa in ((g['home'],home_q,away_q),(g['away'],away_q,home_q)):
            p=profiles.setdefault(team,{'for':[0,0,0,0],'against':[0,0,0,0],'games':0})
            p['for']=[p['for'][i]+pf[i] for i in range(4)];p['against']=[p['against'][i]+pa[i] for i in range(4)];p['games']+=1

    reference=penalty_reference_2025_payload()
    calibration=reference.get('calibration') or {}
    reference_error=None
    try:
        v104_reference=v104_reference_2025_payload()
    except Exception as e:
        v104_reference={'version':'V106-QB-CURRENT-SEASON-REFERENCE-3','season':2025,'valid':False,'game_count':0,'sample_windows':{},'error':str(e)}
        reference_error=str(e)
    ep_surface=_get_ep_surface_2025()
    penalty_games,penalty_profiles=_penalty_context_from_rows(rows,include_postseason=False,wp_model=None,ep_surface=ep_surface)
    _attach_penalty_scores(penalty_games,penalty_profiles,calibration)
    payload={
        'season':2026,'generated_at':datetime.now(timezone.utc).isoformat(),'source':'nflverse play-by-play',
        'pressure_context':v143_pressure_meta,
        'games':sorted(out_games,key=lambda x:(x['week'],x['game_id'])),'profiles':profiles,'game_count':len(out_games),
        'defensive_drive_games':defensive_drive_games,
        'performance_luck_games':performance_luck_games,
        'performance_luck_method':'V121 primary Luck core uses league-wide 2025 net EPA/play-to-scoring-margin calibration; V113 deserved-win/outcome-surprise remains a 5% secondary audit term; penalty and fumble luck remain explicit contextual channels',
        'performance_luck_calibration':performance_luck_calibration,
        'defensive_drive_method':'V106 offensive/defensive points per qualifying possession + sack-free pass-attempt EPA and success rate + de-duplicated pass-protection disruptions + QB rushing EPA/attempts from PBP with kneels excluded; return TDs/safeties excluded; kneel-only drives excluded; overtime included',
        'v104_reference':v104_reference,
        'v106_reference_status':{'valid':_v106_reference_valid(v104_reference),'error':reference_error},
        'penalty_method':PENALTY_MODEL_VERSION,
        'penalty_games':sorted(penalty_games,key=lambda x:(x['week'],x['game_id'])),
        'penalty_profiles':penalty_profiles,
        'penalty_calibration':calibration,
        'penalty_reference':{'season':2025,'role':'league calibration only; no team carryover','wp_model':'fastrmodels::wp_model no-spread','ep_model':'same-state nflfastR-derived 2025 EP surface'},
    }
    body=json.dumps(payload,separators=(',',':')).encode('utf-8')
    with LOCK:CACHE[cache_key]={'ts':now,'body':body,'ctype':'application/json'}
    _write_disk_cache(cache_key, body, 'application/json')
    return body,False


def penalty_debug_payload(team='BUF', force=False):
    """Return an audit that proves where a team's displayed penalty WPA comes from.

    V97 deliberately recomputes the season total from penalty_games instead of
    trusting penalty_profiles. The endpoint exposes both so browser/Chrome QA can
    identify any disagreement without reading private in-process state.
    """
    team=_canon_team_code(team)
    if team not in TEAM_NAMES:
        raise ValueError(f'unknown team {team!r}')
    body,_=game_flow_2026_payload(force=force)
    flow=json.loads(body.decode('utf-8'))
    rows=[]
    wpa_sum=0.0; epa_sum=0.0
    agg=_blank_penalty_team(); agg['games']=0
    for game in flow.get('penalty_games') or []:
        vals=(game.get('teams') or {}).get(team)
        if vals is None:
            continue
        v=dict(vals)
        w=float(v.get('net_penalty_wpa') or 0.0); e=float(v.get('net_penalty_epa') or 0.0)
        wpa_sum += w; epa_sum += e; agg['games'] += 1
        for key in ('first_downs_for','first_downs_against','tds_negated_benefit','tds_negated_harm','turnovers_negated_benefit','turnovers_negated_harm','drive_saves_benefit','drive_saves_harm','events'):
            agg[key] += int(v.get(key,0) or 0)
        agg['net_penalty_wpa'] += w; agg['net_penalty_epa'] += e
        relevant=[]
        for event in game.get('events') or []:
            if event.get('beneficiary')==team or event.get('penalty_team')==team:
                relevant.append({k:event.get(k) for k in ('penalty_team','beneficiary','posteam','defteam','penalty_type','play_type','special_teams','causal_epa','causal_wpa','causal_home_wpa','actual_team_ep','counterfactual_team_ep','actual_team_score_delta','counterfactual_team_score_delta','actual_team_state_value','counterfactual_team_state_value','score_erased_points','actual_ep_source','actual_home_wp_post','counterfactual_home_wp','actual_wp_source','counterfactual_kind','counterfactual_wp_kind','counterfactual_epa_kind','actual_state','counterfactual_state','desc')})
        rows.append({'game_id':game.get('game_id'),'week':game.get('week'),'home':game.get('home'),'away':game.get('away'),'team':v,'events':relevant})
    direct=(flow.get('penalty_profiles') or {}).get(team) or {}
    games=max(0,int(agg.get('games') or 0))
    calc={'games':games,'net_penalty_wpa':wpa_sum,'net_penalty_epa':epa_sum,
          'net_penalty_wpa_per_game':(wpa_sum/games if games else None),
          'net_penalty_epa_per_game':(epa_sum/games if games else None)}
    mismatch={
        'wpa':float(direct.get('net_penalty_wpa') or 0.0)-wpa_sum,
        'epa':float(direct.get('net_penalty_epa') or 0.0)-epa_sum,
        'games':int(direct.get('games') or 0)-games,
    }
    fd_pg=((float(agg.get('first_downs_for') or 0)-float(agg.get('first_downs_against') or 0))/games) if games else 0.0
    td_pg=((float(agg.get('tds_negated_benefit') or 0)-float(agg.get('tds_negated_harm') or 0))/games) if games else 0.0
    scale_breakdown=_penalty_score_breakdown_from_averages(
        epa_sum/games if games else 0.0,wpa_sum/games if games else 0.0,fd_pg,td_pg,flow.get('penalty_calibration') or {}
    ) if games else None
    return {
        'team':team,'app_version':APP_VERSION,'penalty_method':flow.get('penalty_method'),
        'calibration':flow.get('penalty_calibration'),'recomputed_from_games':{**agg,**calc},
        'score_breakdown':scale_breakdown,
        'direct_server_profile':direct,'server_profile_minus_game_sum':mismatch,'games':rows,
    }

def penalty_scale_debug_payload(force=False, limit=30):
    """League-wide V97 Penalty Impact scaling + event outlier audit."""
    body,_=game_flow_2026_payload(force=force)
    flow=json.loads(body.decode('utf-8'))
    teams=[]
    for team,vals in (flow.get('penalty_profiles') or {}).items():
        teams.append({
            'team':team,'games':int(vals.get('games') or 0),
            'score':vals.get('penaltyImpactScore'),
            'net_penalty_epa':vals.get('net_penalty_epa'),
            'net_penalty_wpa':vals.get('net_penalty_wpa'),
            'score_breakdown':vals.get('penaltyImpactBreakdown'),
        })
    teams.sort(key=lambda x:float(x.get('score') if x.get('score') is not None else -1e9),reverse=True)
    events=[]
    for game in flow.get('penalty_games') or []:
        for e in game.get('events') or []:
            events.append({
                'game_id':game.get('game_id'),'week':game.get('week'),'home':game.get('home'),'away':game.get('away'),
                **{k:e.get(k) for k in ('penalty_team','beneficiary','penalty_type','play_type','special_teams','causal_epa','causal_wpa','actual_team_ep','counterfactual_team_ep','actual_team_score_delta','counterfactual_team_score_delta','actual_team_state_value','counterfactual_team_state_value','score_erased_points','actual_ep_source','actual_home_wp_post','counterfactual_home_wp','actual_wp_source','counterfactual_wp_kind','counterfactual_epa_kind','actual_state','counterfactual_state','desc')}
            })
    n=max(1,min(200,int(limit or 30)))
    epa_out=sorted(events,key=lambda e:abs(float(e.get('causal_epa') or 0.0)),reverse=True)[:n]
    wpa_out=sorted(events,key=lambda e:abs(float(e.get('causal_wpa') or 0.0)),reverse=True)[:n]
    finite=[float(t['score']) for t in teams if t.get('score') is not None]
    return {
        'app_version':APP_VERSION,'penalty_method':flow.get('penalty_method'),'calibration':flow.get('penalty_calibration'),
        'team_count':len(teams),'score_range':{
            'max':max(finite) if finite else None,'min':min(finite) if finite else None,
            'exact_100':[t['team'] for t in teams if t.get('score') is not None and float(t['score'])>=99.999999],
            'exact_0':[t['team'] for t in teams if t.get('score') is not None and float(t['score'])<=0.000001],
        },
        'teams':teams,'outliers':{'largest_abs_epa':epa_out,'largest_abs_wpa':wpa_out},
    }


def fetch_upstream(path, force=False):
    now = time.time()
    _server_diag('upstream:request-start', path=path, force=bool(force), upstream=UPSTREAMS.get(path))
    with LOCK:
        cached = CACHE.get(path)
        if not force and cached and now - cached['ts'] < TTL[path]:
            _server_diag('upstream:memory-cache-hit', path=path, age_seconds=round(now-cached['ts'],3), bytes=len(cached.get('body') or b''))
            return cached['body'], cached['ctype'], True
    req = Request(UPSTREAMS[path], headers={
        'User-Agent': 'FORCE-local/97 (+local NFL analytics app)',
        'Accept': 'text/csv,text/plain,*/*',
    })
    try:
        started=time.time()
        with urlopen(req, timeout=30) as r:
            body = r.read()
            ctype = r.headers.get_content_type() or 'text/csv'
            upstream_status=getattr(r, 'status', None)
        _server_diag('upstream:response', path=path, status=upstream_status, elapsed_ms=round((time.time()-started)*1000), bytes=len(body), content_type=ctype, csv=_csv_body_summary(body) if path in {'/api/team-stats','/api/player-stats','/api/schedule','/api/pfr-pass','/api/pfr-pass-prior','/api/ftn-charting'} else None)
        if len(body) < 100:
            raise ValueError('upstream returned unexpectedly small payload')
        # V83: merge a partial in-progress-week asset onto the previous complete
        # weekly snapshot before publishing or persisting it. This prevents a
        # Thursday game from erasing Week 1 rows for the other 30 teams.
        prior_body=None
        prior_source=None
        with LOCK:
            prior_mem=CACHE.get(path)
            if prior_mem:
                prior_body=prior_mem.get('body')
                prior_source='memory'
        if prior_body is None:
            prior_disk=_read_disk_cache(path)
            if prior_disk:
                prior_body=prior_disk.get('body')
                prior_source='disk'
        _server_diag('upstream:prior-snapshot', path=path, source=prior_source, present=bool(prior_body), summary=_csv_body_summary(prior_body) if prior_body and path in {'/api/team-stats','/api/player-stats'} else None)
        body=_merge_weekly_csv(path, prior_body, body)
        with LOCK:
            CACHE[path] = {'ts': now, 'body': body, 'ctype': ctype}
        _write_disk_cache(path, body, ctype)
        _server_diag('upstream:published', path=path, cache='MISS', bytes=len(body), csv=_csv_body_summary(body) if path in {'/api/team-stats','/api/player-stats','/api/schedule'} else None)
        return body, ctype, False
    except Exception as error:
        _server_diag('upstream:error', path=path, error=repr(error))
        # V82: a transient upstream failure may use the last known-good snapshot,
        # including across local-server restarts. Never fall back to model priors
        # and present them as fresh live data.
        with LOCK:
            cached = CACHE.get(path)
            if cached:
                _server_diag('upstream:fallback-memory', path=path, bytes=len(cached.get('body') or b''), csv=_csv_body_summary(cached.get('body')) if path in {'/api/team-stats','/api/player-stats','/api/schedule'} else None)
                return cached['body'], cached['ctype'], True
        disk = _read_disk_cache(path)
        if disk:
            body, ctype = disk['body'], disk['ctype']
            with LOCK:
                CACHE[path] = {'ts': now, 'body': body, 'ctype': ctype}
            _server_diag('upstream:fallback-disk', path=path, bytes=len(body), saved_at=disk.get('saved_at'), csv=_csv_body_summary(body) if path in {'/api/team-stats','/api/player-stats','/api/schedule'} else None)
            return body, ctype, True
        _server_diag('upstream:no-fallback', path=path)
        raise


class ForceHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/current-pressure/manual':
            self.send_response(404)
            self.end_headers()
            return
        try:
            length = int(self.headers.get('Content-Length') or 0)
            if length <= 0 or length > 32768:
                raise ValueError('invalid request size')
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
            saved = save_manual_pressure_override(payload)
            body = json.dumps({'ok': True, 'saved': saved}, separators=(',', ':')).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            body = json.dumps({'ok': False, 'error': str(e)}, separators=(',', ':')).encode('utf-8')
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith('/api/'):
            _server_diag('http:get', path=path, query=parsed.query, client=self.client_address[0] if self.client_address else None)
        if path == '/api/health':
            payload = {
                'ok': True,
                'product': 'FORCE',
                'app_version': APP_VERSION,
                'diagnostic_version': SERVER_DIAG_VERSION,
                'started_at': SERVER_STARTED_AT,
                'port': PORT,
            }
            body = json.dumps(payload, separators=(',', ':')).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-FORCE-Version', APP_VERSION)
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/api/diagnostics':
            body = json.dumps(_server_diagnostic_snapshot(), separators=(',', ':'), default=str).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-FORCE-Diagnostics', SERVER_DIAG_VERSION)
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/api/penalty-debug':
            try:
                params=parse_qs(parsed.query or '')
                team=(params.get('team') or ['BUF'])[0]
                obj=penalty_debug_payload(team, force='force_refresh=' in parsed.query)
                body=json.dumps(obj,separators=(',',':'),default=str).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type','application/json; charset=utf-8')
                self.send_header('Content-Length',str(len(body)))
                self.send_header('Cache-Control','no-store')
                self.end_headers(); self.wfile.write(body)
            except Exception as e:
                body=json.dumps({'ok':False,'error':str(e)},separators=(',',':')).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type','application/json; charset=utf-8')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers(); self.wfile.write(body)
            return
        if path == '/api/penalty-scale-debug':
            try:
                params=parse_qs(parsed.query or '')
                limit=int((params.get('limit') or ['30'])[0])
                obj=penalty_scale_debug_payload(force='force_refresh=' in parsed.query,limit=limit)
                body=json.dumps(obj,separators=(',',':'),default=str).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type','application/json; charset=utf-8')
                self.send_header('Content-Length',str(len(body)))
                self.send_header('Cache-Control','no-store')
                self.end_headers(); self.wfile.write(body)
            except Exception as e:
                body=json.dumps({'ok':False,'error':str(e)},separators=(',',':')).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type','application/json; charset=utf-8')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers(); self.wfile.write(body)
            return
        if path == '/api/game-flow-2026':
            try:
                body, cached = game_flow_2026_payload(force='force_refresh=' in parsed.query)
                try:
                    parsed_body=json.loads(body.decode('utf-8'))
                    _server_diag('game-flow:response', cache='HIT' if cached else 'MISS', bytes=len(body), game_count=parsed_body.get('game_count'), profile_count=len(parsed_body.get('profiles') or {}), penalty_profile_count=len(parsed_body.get('penalty_profiles') or {}))
                except Exception as diag_error:
                    _server_diag('game-flow:response-unparsed', cache='HIT' if cached else 'MISS', bytes=len(body), error=repr(diag_error))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('X-FORCE-Cache', 'HIT' if cached else 'MISS')
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                _server_diag('game-flow:error', error=repr(e))
                msg = ('FORCE game-flow aggregation failed: ' + str(e)).encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)
            return
        if path == '/api/current-pressure':
            try:
                body, cached = current_pressure_payload(force='force_refresh=' in parsed.query)
                try:
                    parsed_body=json.loads(body.decode('utf-8'))
                    _server_diag('current-pressure:response', cache='HIT' if cached else 'MISS', bytes=len(body), row_count=parsed_body.get('row_count'), as_of=parsed_body.get('as_of'), automatic=parsed_body.get('automatic'), manual=parsed_body.get('manual'))
                except Exception as diag_error:
                    _server_diag('current-pressure:response-unparsed', cache='HIT' if cached else 'MISS', bytes=len(body), error=repr(diag_error))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('X-FORCE-Cache', 'HIT' if cached else 'MISS')
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                _server_diag('current-pressure:error', error=repr(e))
                msg = ('FORCE current-pressure aggregation failed: ' + str(e)).encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)
            return
        if path in UPSTREAMS:
            try:
                body, ctype, cached = fetch_upstream(path, force='force_refresh=' in parsed.query)
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8' if 'csv' in ctype or ctype == 'application/octet-stream' else ctype)
                self.send_header('Content-Length', str(len(body)))
                self.send_header('X-FORCE-Upstream', UPSTREAMS[path])
                self.send_header('X-FORCE-Cache', 'HIT' if cached else 'MISS')
                self.end_headers()
                self.wfile.write(body)
            except (HTTPError, URLError, TimeoutError, ValueError, OSError) as e:
                msg = ('FORCE live-data proxy could not reach upstream: ' + str(e)).encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)
            return
        super().do_GET()


def _probe_existing_server():
    try:
        with urlopen(f'http://127.0.0.1:{PORT}/api/health', timeout=1.5) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception:
        return None


def _open_browser_once():
    try:
        time.sleep(0.25)
        webbrowser.open(f'http://localhost:{PORT}', new=1)
    except Exception as e:
        print(f'FORCE could not open the browser automatically: {e}', flush=True)


if __name__ == '__main__':
    os.chdir(BASE_DIR)
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), ForceHandler)
    except OSError as e:
        existing = _probe_existing_server()
        if existing and existing.get('product') == 'FORCE':
            print(f"Port {PORT} is already occupied by FORCE {existing.get('app_version','unknown')}. Close that FORCE server before starting V149.", flush=True)
        else:
            print(f'Port {PORT} is already in use by another application. FORCE V149 will not open the browser against the wrong local server.', flush=True)
        print(f'Bind error: {e}', flush=True)
        raise SystemExit(2)
    print(f'FORCE V137 local server: http://localhost:{PORT}', flush=True)
    print('V136 verifies server identity before data refreshes and opens the browser only after the FORCE server has successfully bound to port 8080.', flush=True)
    print('Live nflverse stats + FTN/PFR pressure fallbacks + fresh StatRankings/current-pressure aggregation are proxied server-side; V46 also accepts local curated Update Center pressure writes.', flush=True)
    print(f'Manual current-pressure escape hatch: {PRESSURE_OVERRIDE_PATH.relative_to(BASE_DIR)}', flush=True)
    threading.Thread(target=_open_browser_once, daemon=True).start()
    server.serve_forever()
