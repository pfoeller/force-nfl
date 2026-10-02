// Offline MD-03 research only: no imports from production, network, ratings or eligibility.
const DISQUALIFYING = new Set(['BENCHING','PERMANENT_CHANGE','ROOKIE_TAKEOVER','TRADE','RELEASE','REST','SUSPENSION','ROTATION']);
const id = value => typeof value === 'string' && value.trim() ? value.trim() : null;

// A start is an identity observation, never a snaps/dropbacks/depth-chart estimate.
export function resolveStarter(game) {
  const scheduled = id(game.scheduleStarterId), official = id(game.officialStarterId);
  if (game.starterConflict || (official && scheduled && official !== scheduled)) return {playerId:null,reason:'STARTER_CONFLICT'};
  if (official && !id(game.officialStarterEvidenceId)) return {playerId:null,reason:'OFFICIAL_STARTER_EVIDENCE_MISSING'};
  if (official) return {playerId:official,reason:'OFFICIAL_STARTER'};
  if (scheduled) return {playerId:scheduled,reason:'SCHEDULE_STARTER_PROVISIONAL'};
  return {playerId:null,reason:'STARTER_MISSING'};
}

export function detectQbEpisodes(input) {
  if (!id(input.team) || !Number.isInteger(input.season) || !Array.isArray(input.games)) throw Error('Invalid team/season/games contract');
  const before=JSON.stringify(input), seen=new Set(), trace=[], episodes=[];
  let starter=null, last=null, streak=0, active=null, blocked=false;
  const record=(game,state,reason,episodeId=active?.episodeId ?? null)=>trace.push({gameId:game.gameId,state,reason,episodeId});
  const closeUnknown=(reason)=>{if(active){active.state='UNKNOWN';active.reasons.push(reason);active.tainted=true;}};
  const games=[...input.games].sort((a,b)=>String(a.gameDate).localeCompare(String(b.gameDate)) || String(a.gameId).localeCompare(String(b.gameId)));
  for (const game of games) {
    if (!id(game.gameId) || seen.has(game.gameId)) throw Error('Missing/duplicate game ID');
    seen.add(game.gameId);
    if (game.kind==='BYE') {record(game,active?.state ?? 'NORMAL_STARTER','BYE_NOT_ABSENCE');continue;}
    if (game.season!==input.season || game.team!==input.team || game.completed!==true || !id(game.gameDate)) {
      blocked=true;closeUnknown('INCOMPLETE_GAME_OR_SCOPE');record(game,'UNKNOWN','INCOMPLETE_GAME_OR_SCOPE');continue;
    }
    if (input.asOf && (!game.observedAt || !Number.isFinite(Date.parse(game.observedAt)) || !Number.isFinite(Date.parse(input.asOf)) || Date.parse(game.observedAt)>Date.parse(input.asOf))) {
      blocked=true;closeUnknown('EVIDENCE_NOT_AVAILABLE_AS_OF');record(game,'UNKNOWN','EVIDENCE_NOT_AVAILABLE_AS_OF');continue;
    }
    const resolved=resolveStarter(game), current=resolved.playerId;
    if (!current) {blocked=true;closeUnknown(resolved.reason);record(game,'UNKNOWN',resolved.reason);continue;}
    if (blocked) {record(game,'UNKNOWN','REPLAY_REQUIRED_AFTER_EVIDENCE_GAP');continue;}
    const change=game.change;
    if(change && !DISQUALIFYING.has(change.reason)) {blocked=true;closeUnknown('CHANGE_REASON_UNKNOWN');record(game,'UNKNOWN','CHANGE_REASON_UNKNOWN');continue;}
    if (change && DISQUALIFYING.has(change.reason)) {
      if (!id(change.evidenceId) || !id(change.subjectId)) {
        blocked=true;closeUnknown('CHANGE_EVIDENCE_MISSING');record(game,'UNKNOWN','CHANGE_EVIDENCE_MISSING');continue;
      }
      if (starter===change.subjectId) {
        if(active){active.state='PERMANENT_CHANGE';active.reasons.push(change.reason);active.terminated=true;}
        record(game,'PERMANENT_CHANGE',change.reason);active=null;starter=null;last=null;streak=0;
      }
    }
    if (!starter) {
      streak=current===last ? streak+1 : 1;last=current;
      if(streak>=2) starter=current;
      record(game,starter?'NORMAL_STARTER':'STARTER_UNESTABLISHED',starter?'TWO_OBSERVED_STARTS':'INSUFFICIENT_START_HISTORY');continue;
    }
    if (current===starter) {
      if(active) {
        active.returnGameId=game.gameId;active.returnWeek=game.week;
        active.state=active.tainted?'UNKNOWN':'RETURN_VERIFIED';
        active.injurySupportedReturnCandidate=Boolean(active.injurySupportedOnset && !active.tainted && !active.terminated);
        if(!active.injurySupportedOnset)active.reasons.push('ABSENCE_CAUSE_UNVERIFIED');
        record(game,active.state,active.injurySupportedReturnCandidate?'INJURY_SUPPORTED_ONSET_AND_STARTER_RETURN':'IDENTITY_RETURN_ONLY');
        active=null;
      } else record(game,'NORMAL_STARTER','STARTER_CONTINUES');
      continue;
    }
    if(!active) {
      const injury=(game.injuries||[]).filter(row=>row.playerId===starter);
      const supported=injury.length===1 && injury[0].status==='Out' && Boolean(id(injury[0].injury));
      active={episodeId:`${input.team}|${input.season}|${starter}|${game.gameId}`,team:input.team,season:input.season,
        originalStarterId:starter,onsetGameId:game.gameId,onsetWeek:game.week,missedGameIds:[],replacementIds:[],
        injurySupportedOnset:supported,injuryEvidence:injury,injurySupportedReturnCandidate:false,
        state:supported?'REPLACEMENT_ACTIVE':'STARTER_ABSENT_UNVERIFIED',reasons:[],tainted:false,terminated:false};
      episodes.push(active);
      if(injury.length>1){active.tainted=true;active.state='UNKNOWN';active.reasons.push('CONFLICTING_INJURY_ROWS');}
    }
    // An injured replacement is a nested-role ambiguity, not another original-starter return.
    const priorReplacement=active.replacementIds.at(-1);
    if(priorReplacement && priorReplacement!==current && (game.injuries||[]).some(row=>row.playerId===priorReplacement && row.status==='Out' && id(row.injury)))closeUnknown('MULTIPLE_INJURED_QBS_REQUIRES_ROLE_RESOLUTION');
    active.missedGameIds.push(game.gameId);
    if(!active.replacementIds.includes(current))active.replacementIds.push(current);
    record(game,active.state,active.tainted?'AMBIGUOUS_EPISODE':'COMPLETED_TEAM_GAME_WITH_DIFFERENT_STARTER');
  }
  for(const episode of episodes) {
    episode.missedStarts=episode.missedGameIds.length;
    if(!episode.returnGameId && !episode.terminated)episode.reasons.push('NO_VERIFIED_STARTER_RETURN');
    episode.productionCorrectionAllowed=false;
    episode.reasons.push('RESEARCH_ONLY_NO_PRODUCTION_ELIGIBILITY');
  }
  if(JSON.stringify(input)!==before)throw Error('Research detector mutated input');
  return {schema:1,scope:'RETROSPECTIVE_RESEARCH',team:input.team,season:input.season,
    productionCorrectionAllowed:false,episodes,trace,blocked};
}

export function evaluateSample(fixture) {
  const metrics={injuryAware:{truePositives:0,falsePositives:0,falseNegatives:0,trueNegatives:0,unknown:0},
    participationOnly:{truePositives:0,falsePositives:0,falseNegatives:0,trueNegatives:0,unknown:0}};
  const rows=fixture.cases.map(sample=>{
    const result=detectQbEpisodes({team:sample.team,season:sample.season,games:sample.games});
    const injuryAware=result.episodes.some(e=>e.injurySupportedReturnCandidate);
    const participationOnly=result.episodes.some(e=>e.returnGameId && !e.tainted && !e.terminated);
    for(const [route,prediction] of Object.entries({injuryAware,participationOnly})) {
      const m=metrics[route];
      if(!['injury_return','non_injury_return'].includes(sample.truth))m.unknown++;
      else if(sample.truth==='injury_return')m[prediction?'truePositives':'falseNegatives']++;
      else m[prediction?'falsePositives':'trueNegatives']++;
    }
    return {caseId:sample.caseId,truth:sample.truth,injuryAware,participationOnly,
      productionCorrectionAllowed:false,episodes:result.episodes,blocked:result.blocked};
  });
  return {schema:1,scope:'RETROSPECTIVE_RESEARCH',metrics,rows,productionCorrectionAllowed:false};
}
