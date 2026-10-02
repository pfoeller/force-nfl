#!/usr/bin/env python3
"""Rebuild the frozen MD-03 research sample from local, hash-matched public CSVs.
No network, production calls or correction-magnitude work. OUTPUT is explicit.
Usage: python -B research/md03_build_sample.py SOURCE_DIRECTORY OUTPUT.json
Source directory needs the CSV/gzip files listed in the committed fixture.
That fixture is the frozen source manifest; mutable assets must match it.
No temporary probe manifests are needed.
"""
import csv, gzip, hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'scripts/fixtures/md03_qb_episode_sample.json'

# These are evaluation selections/labels, never detector rules or production presets.
CASES = [
 ('pit-2016-knee',2016,'PIT',5,10,'injury_return',9,'One missed start, Week 8 bye',
  ['https://www.steelers.com/news/tomlin-talks-ben-ladarius-progress-17999236','https://static.www.nfl.com/image/upload/v1677630400/gamecenter/10012016-1106-013b-30ec-6b0227774ca7.pdf']),
 ('gb-2017-collarbone',2017,'GB',4,15,'injury_return',15,'Seven missed team games; IR rows sparse',
  ['https://www.packers.com/news/aaron-rodgers-confirms-he-s-medically-cleared-19970553']),
 ('nyg-2017-benching',2017,'NYG',11,14,'non_injury_return',14,'Benching then reinstatement',
  ['https://www.giants.com/news/geno-smith-ready-for-opportunity-19864474','https://www.giants.com/news/eli-manning-named-starting-qb-vs-dallas-19923495']),
 ('kc-2019-knee',2019,'KC',6,10,'injury_return',10,'Two missed starts; Out then Questionable',
  ['https://www.chiefs.com/news/chiefs-fall-to-titans-35-32-on-sunday-afternoon']),
 ('sf-2020-first-ankle',2020,'SF',1,5,'injury_return',5,'First injury return; return game halftime removal',
  ['https://www.49ers.com/news/jimmy-garoppolo-george-kittle-49ers-injuries-mostert-sherman-bosa']),
 ('sf-2020-second-ankle',2020,'SF',6,17,'open_absence',None,'Second absence has no same-season starter return',
  ['https://www.49ers.com/news/jimmy-garoppolo-george-kittle-49ers-injuries-mostert-sherman-bosa','https://www.49ers.com/team/transactions/2020']),
 ('mia-2020-rookie-change',2020,'MIA',4,12,'non_injury_return',12,'Veteran replaced by rookie; veteran later substitutes for injured rookie',
  ['https://amp.nfl.com/news/brian-flores-starting-tua-tagovailoa-at-qb-the-best-thing-for-the-dolphins','https://www.miamidolphins.com/news/top-news-dolphins-announce-captains-starting-quarterback','https://www.miamidolphins.com/news/the-blitz-resilient-group']),
 ('mia-2020-thumb',2020,'MIA',8,13,'injury_return',13,'Rookie now established; one thumb-injury missed start',
  ['https://www.nfl.com/_amp/brian-flores-tua-tagovailoa-still-dolphins-starting-qb-if-healthy']),
 ('mia-2021-ribs',2021,'MIA',1,6,'injury_return',6,'First of two distinct injury episodes',
  ['https://www.nfl.com/news/dolphins-activate-qb-tua-tagovailoa-off-injured-reserve']),
 ('mia-2021-finger',2021,'MIA',7,11,'injury_return',11,'Participation return Week 10 is not a start; Questionable-only onset',
  ['https://static.clubs.nfl.com/image/upload/ravens/xuq2ylclxmchvzqpmh8o','https://static.www.nfl.com/league/apps/league-site/media-guides/2022/MIA.pdf']),
 ('sea-2021-finger',2021,'SEA',4,10,'injury_return',10,'Three missed starts plus Week 9 bye',
  ['https://www.seahawks.com/news/seahawks-qb-russell-wilson-cleared-for-full-return','https://www.seahawks.com/news/seahawks-qb-russell-wilson-finger-wasn-t-an-issue-but-i-ve-got-to-play-better']),
 ('car-2022-ambiguous',2022,'CAR',4,12,'ambiguous',11,'Injury, demotion, replacement injury, starter-source conflict',
  ['https://www.panthers.com/news/panthers-release-baker-mayfield','https://www.panthers.com/news/inactives-sam-darnold-not-in-uniform-for-thursday-night-football'])]

# Independently documented event targets; these labels never enter the detector.
# (incumbent GSIS, first missed week). The return and truth links are in CASES.
TARGETS = {
 'pit-2016-knee': ('00-0022924',7), 'gb-2017-collarbone': ('00-0023459',7),
 'nyg-2017-benching': ('00-0022803',13), 'kc-2019-knee': ('00-0033873',8),
 'sf-2020-first-ankle': ('00-0031345',3), 'sf-2020-second-ankle': ('00-0031345',9),
 'mia-2020-rookie-change': ('00-0023682',8), 'mia-2020-thumb': ('00-0036212',12),
 'mia-2021-ribs': ('00-0036212',3), 'mia-2021-finger': ('00-0036212',9),
 'sea-2021-finger': ('00-0029263',6), 'car-2022-ambiguous': ('00-0034855',6)}
STRICT_TARGETS = {'pit-2016-knee','gb-2017-collarbone','kc-2019-knee',
                 'sf-2020-first-ankle','mia-2021-ribs','sea-2021-finger'}
CROP_REASONS = {
 'pit-2016-knee': 'Weeks 5-10 include two local anchor starts, the injury absence, bye and return.',
 'gb-2017-collarbone': 'Weeks 4-15 include two local anchor starts, bye, long absence and return.',
 'nyg-2017-benching': 'Weeks 11-14 isolate the two-start anchor and one-game benching/reinstatement.',
 'kc-2019-knee': 'Weeks 6-10 include two local anchor starts and the midseason injury/return.',
 'sf-2020-first-ankle': 'Weeks 1-5 cover the first established-starter injury and halftime-removal return.',
 'sf-2020-second-ankle': 'Weeks 6-17 establish a local anchor after the first return and expose the second open/nested absence.',
 'mia-2020-rookie-change': 'Weeks 4-12 anchor Fitzpatrick and expose the rookie takeover and veteran spot return.',
 'mia-2020-thumb': 'Weeks 8-13 locally establish Tua; this omits earlier Fitzpatrick tenure, which the full-season diagnostic retains.',
 'mia-2021-ribs': 'Weeks 1-6 expose the first injury/IR return.',
 'mia-2021-finger': 'Weeks 7-11 locally anchor Tua after the ribs return; full-season replay retains both episodes.',
 'sea-2021-finger': 'Weeks 4-10 include two anchor starts, the injury absence, bye and return.',
 'car-2022-ambiguous': 'Weeks 4-12 expose the Baker injury/role mix and the adjudicated Week-11 source conflict.'}


def read_csv(file):
 if file.suffix == '.gz':
  with gzip.open(file,'rt',encoding='utf-8',newline='') as handle: return list(csv.DictReader(handle))
 with file.open(encoding='utf-8',newline='') as handle: return list(csv.DictReader(handle))

def build(source):
 frozen=json.loads(FIXTURE.read_text(encoding='utf-8'))
 sources=frozen['sources']
 for info in sources:
  file=source/info['file']
  actual=hashlib.sha256(file.read_bytes()).hexdigest()
  if actual!=info['sha256']: raise ValueError('Source hash mismatch: '+info['file'])
  if file.stat().st_size!=info['bytes']: raise ValueError('Source size mismatch: '+info['file'])
 games=read_csv(source/'games.csv'); injuries={y:read_csv(source/f'injuries_{y}.csv') for y in [2016,2017,2019,2020,2021,2022]}
 def rows_for(year,team,lo=1,hi=99):
  selected=[g for g in games if int(g['season'])==year and g['game_type']=='REG' and team in (g['home_team'],g['away_team']) and lo<=int(g['week'])<=hi]
  selected.sort(key=lambda g:(g['gameday'],int(g['week']),g['game_id']))
  rows=[]
  for g in selected:
   side='home' if g['home_team']==team else 'away'
   inj=[r for r in injuries[year] if r['team']==team and int(r['week'])==int(g['week']) and r['position']=='QB' and r.get('season_type',r.get('game_type'))=='REG']
   row={'gameId':g['game_id'],'gameDate':g['gameday'],'season':year,'team':team,'week':int(g['week']),
    'completed':bool(g['home_score'] and g['away_score']),'scheduleStarterId':g[f'{side}_qb_id'],
    'scheduleStarterName':g[f'{side}_qb_name'],'injuries':[{'playerId':r['gsis_id'],'status':r['report_status'],
     'injury':r['report_primary_injury'],'dateModified':r.get('date_modified')} for r in inj]}
   if year==2022 and team=='CAR' and row['week']==11:
    row['officialStarterId']='00-0034855'
    row['officialStarterEvidenceId']='panthers-2022-12-05-retrospective-account'
   rows.append(row)
  return rows
 cases=[];full={}
 for case_id,year,team,lo,hi,truth,return_week,description,urls in CASES:
  key=(year,team)
  if key not in full: full[key]={'team':team,'season':year,'games':rows_for(year,team)}
  rows=[r for r in full[key]['games'] if lo<=r['week']<=hi]
  incumbent,onset_week=TARGETS[case_id]
  onset=next(r for r in full[key]['games'] if r['week']==onset_week)
  ret=next((r for r in full[key]['games'] if r['week']==return_week),None)
  missed=[r for r in full[key]['games'] if r['week']>=onset_week and (return_week is None or r['week']<return_week)]
  identity=truth in ('injury_return','non_injury_return')
  cropped={'injuryAware':case_id in STRICT_TARGETS,'participationOnly':identity}
  uncropped={'injuryAware':case_id in STRICT_TARGETS,'participationOnly':identity and case_id!='mia-2020-thumb'}
  annotations=[]
  if case_id=='car-2022-ambiguous':
   annotations.append('officialStarterId is manually adjudicated from the Panthers account, not a machine feed; raw games.csv remains unchanged. The same conflict annotation is retained in cropped and full-season evidence.')
  target={'team':team,'season':year,'incumbentId':incumbent,'onsetGameId':onset['gameId'],'onsetWeek':onset_week,
   'missedGameIds':[r['gameId'] for r in missed],'missedWeeks':[r['week'] for r in missed],
   'replacementWindow':'Completed team games from documented onset until the documented starting return; open cases through regular-season end.',
   'returnGameId':ret['gameId'] if ret else None,'returnWeek':return_week,'causeClass':truth,
   'expectedDetectorResult':{'cropped':cropped,'fullSeason':uncropped}}
  cases.append({'caseId':case_id,'season':year,'team':team,'truth':truth,'documentedReturnWeek':return_week,
   'description':description,'truthSources':urls,'annotations':annotations,
   'crop':{'firstWeek':lo,'lastWeek':hi,'reason':CROP_REASONS[case_id]},'target':target,'games':rows})
 coverage=[]
 for year in [2016,2017,2019,2020,2021,2022,2026]:
  rows=[g for g in games if int(g['season'])==year and g['game_type']=='REG' and g['home_score'] and g['away_score']]
  coverage.append({'season':year,'completedGames':len(rows),'starterSlots':2*len(rows),'missingStarterIds':sum(not g[k] for g in rows for k in ['home_qb_id','away_qb_id'])})
 current={}
 for name in ['injuries_2026.csv','snap_counts_2026.csv','roster_2026.csv','depth_charts_2026.csv.gz']:
  rows=read_csv(source/name); current[name]={'rows':len(rows),'teams':len({r.get('team') for r in rows}),'columns':list(rows[0]),
   'weeks':sorted({r['week'] for r in rows if 'week' in r},key=int)}
  if 'dt' in rows[0]:
   dt=max(r['dt'] for r in rows); latest=[r for r in rows if r['dt']==dt]
   current[name].update({'latestDt':dt,'latestSnapshotTeams':len({r['team'] for r in latest}),
    'qbRowsWithMissingGsisId':sum(not r.get('gsis_id') for r in rows if r.get('pos_abb')=='QB')})
 snaps={y:read_csv(source/f'snap_counts_{y}.csv') for y in [2020,2021,2022]}
 disagreements=[]
 for year,team,week in [(2020,'SF',5),(2021,'MIA',2),(2021,'MIA',10),(2022,'CAR',11)]:
  rows=[r for r in snaps[year] if r['team']==team and int(r['week'])==week and r['position']=='QB']
  disagreements.append({'season':year,'team':team,'week':week,'qbSnaps':[{'player':r['player'],'pfrPlayerId':r['pfr_player_id'],'offenseSnaps':int(r['offense_snaps'])} for r in rows]})
 return {'schema':2,'scope':'RETROSPECTIVE_RESEARCH_NOT_PRODUCTION_ELIGIBILITY','base':'bd15a2c682c0dd8c836ecfd42e615a31741988c7',
  'nfldataCommit':frozen['nfldataCommit'],'attribution':'Selected factual rows: nflverse/nfldata and nflverse-data; source URLs/hashes below. nflverse-data carries CC BY 4.0; an express nfldata grant was not established. Upstream rights require review before production adoption.',
  'selection':'Purposive 12 labeled episodes / 8 teams / 6 seasons, not population accuracy. Crops and uncropped regular seasons share the same named targets; all competing episodes remain visible. Labels and official conflict annotation are human evaluation evidence.',
  'sources':sources,'starterCoverage':coverage,'currentSourceCoverage':current,'snapIdentityChecks':disagreements,'cases':cases,'fullSeasons':[full[k] for k in sorted(full)]}

if __name__=='__main__':
 if len(sys.argv)!=3: raise SystemExit(__doc__)
 result=build(Path(sys.argv[1])); Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
 print('Rebuilt',len(result['cases']),'research windows')
