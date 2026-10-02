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
 cases=[]
 for case_id,year,team,lo,hi,truth,return_week,description,urls in CASES:
  selected=[g for g in games if int(g['season'])==year and g['game_type']=='REG' and team in (g['home_team'],g['away_team']) and lo<=int(g['week'])<=hi]
  rows=[]
  for g in selected:
   side='home' if g['home_team']==team else 'away'
   inj=[r for r in injuries[year] if r['team']==team and int(r['week'])==int(g['week']) and r['position']=='QB' and r.get('season_type',r.get('game_type'))=='REG']
   rows.append({'gameId':g['game_id'],'gameDate':g['gameday'],'season':year,'team':team,'week':int(g['week']),
    'completed':bool(g['home_score'] and g['away_score']),'scheduleStarterId':g[f'{side}_qb_id'],
    'scheduleStarterName':g[f'{side}_qb_name'],'injuries':[{'playerId':r['gsis_id'],'status':r['report_status'],
     'injury':r['report_primary_injury'],'dateModified':r.get('date_modified')} for r in inj]})
  annotations=[]
  if case_id=='car-2022-ambiguous':
   row=next(r for r in rows if r['week']==11)
   row['officialStarterId']=rows[0]['scheduleStarterId']
   row['officialStarterEvidenceId']='panthers-2022-12-05-retrospective-account'
   annotations.append('officialStarterId is manually adjudicated from the Panthers account, not a machine feed; raw games.csv remains unchanged.')
  cases.append({'caseId':case_id,'season':year,'team':team,'truth':truth,'documentedReturnWeek':return_week,
   'description':description,'truthSources':urls,'annotations':annotations,'games':rows})
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
 return {'schema':1,'scope':'RETROSPECTIVE_RESEARCH_NOT_PRODUCTION_ELIGIBILITY','base':'bd15a2c682c0dd8c836ecfd42e615a31741988c7',
  'nfldataCommit':frozen['nfldataCommit'],'attribution':'Selected factual rows: nflverse/nfldata and nflverse-data; source URLs/hashes below. nflverse-data carries CC BY 4.0; an express nfldata grant was not established. Upstream rights require review before production adoption.',
  'selection':'Purposive 12 windows / 8 teams / 6 seasons, not an unbiased cohort. Labels and official conflict annotation are separately documented human evaluation evidence.',
  'sources':sources,'starterCoverage':coverage,'currentSourceCoverage':current,'snapIdentityChecks':disagreements,'cases':cases}

if __name__=='__main__':
 if len(sys.argv)!=3: raise SystemExit(__doc__)
 result=build(Path(sys.argv[1])); Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
 print('Rebuilt',len(result['cases']),'research windows')
