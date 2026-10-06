import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';

// MD-08 (Cycle 9): the nine canonical unit grades are model inputs; Units
// board/table cells, team strengths, matchup duels/subedges, unit-change rows
// and the two display-only composites read them through the unitDisplayGrade()
// presentation seam. Production presentation is the identity. This contract
// proves the seam is identity by default, that a TEST-ONLY synthetic
// presentation transform changes presentation without moving any canonical
// model output, and that bridge-reads-presentation or consumer-bypass source
// mutations are detected. No transform here is production behaviour.
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);checks++;};

const MODEL_KEYS=['pointsScoredPerDriveIndex','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsAllowedPerDriveIndex'];
const PRESENTATION_KEYS=[...MODEL_KEYS,'offenseComposite','defenseIndex'];
const hooks='rawUnitCell,unitBoardRow,profileStrengths,matchupBreakdown,unitChangeRows,matchupPage,sortedSchedule,seasonProjection,exactScoreProjection,canonicalGameTeamState,week2EntryState,ratingLedger,gameKey,profile';
const APP=fs.readFileSync('assets/app.js','utf8').replace(/\r\n/g,'\n');

// The bundled schedule has completed and future games, so historical states,
// ledgers, unit-change rows and future forecasts are all exercised.
function build(appSource=null) {
  const h=appHarness({hooks,sources:appSource?{'assets/app.js':appSource}:{}});
  return {...h,P:h.context.window.FORCE_UNIT_PRESENTATION_TEST_HOOKS,U:h.context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL};
}
const teamsOf=(h)=>Object.keys(h.context.window.MODEL_DATA.teams).sort();

// Every canonical model output this tranche must leave bit-identical.
function canonical(h) {
  const {api}=h, out={ratings:api.currentRatings(),teams:{},games:{},projection:{}};
  const active=api.ratingsWithActiveQBCarryover();
  for (const t of teamsOf(h)) {
    const st=api.currentTeamState(t), w=api.week2EntryState(t), l=api.ratingLedger(t);
    out.teams[t]={elo:st.elo,force:st.forceScore,units:MODEL_KEYS.map(k=>st.profile?.[k]),composites:[st.profile?.offenseComposite,st.profile?.defenseIndex],
      bridge:st.unitBridge.components.map(c=>[c.key,c.current,c.prior,c.contribution]),bridgePoints:st.unitBridge.bridgePoints,week2:w.elo,ledger:[l.forceDelta,l.residual]};
  }
  for (const g of api.sortedSchedule()) {
    const fc=api.forecastFor(g,active), p=api.exactScoreProjection(g,fc), row={prob:fc.probability,home:p.home,away:p.away,margin:p.margin,total:p.total};
    if (g.homeScore!=null) for (const t of [g.home,g.away]) for (const ph of ['pre','post']) { const c=api.canonicalGameTeamState(g,t,ph); row[`${t}:${ph}`]=[c.elo,c.forceScore,...MODEL_KEYS.map(k=>c.profile?.[k])]; }
    out.games[api.gameKey(g)]=row;
  }
  for (const [t,v] of Object.entries(api.seasonProjection().teams)) out.projection[t]=[v.expectedWins,v.playoffPct,v.divisionPct,v.byePct,v.projectedRecord];
  return JSON.stringify(out);
}

const completedGame=(h)=>h.api.sortedSchedule().filter(g=>g.homeScore!=null).at(-1);
const futureGame=(h)=>h.api.sortedSchedule().find(g=>g.homeScore==null);
function surfaces(h) {
  const {api}=h, S=api.S, g=completedGame(h), f=futureGame(h);
  S.ratingView='units'; const units=api.rankings(), teamKC=api.teamPage('KC'), teamBUF=api.teamPage('BUF'); S.ratingView='power';
  return {units,teamKC,teamBUF,matchupPlayed:api.matchupPage(g),matchupFuture:api.matchupPage(f)};
}

// Per-consumer routing probes. Each returns true when the consumer reflects a
// presentation-only change to key k. A bypassed consumer returns false.
const duelLabels={offenseComposite:'Offensive profile',defenseIndex:'Defensive profile',qbIndex:'Quarterback play',olIndex:'Offensive line',passRushIndex:'Pass rush',runDefenseIndex:'Run defense',coverageIndex:'Coverage',receiverIndex:'Receiving efficiency',rbIndex:'RB efficiency'};
const duelBlock=(html,label)=>{const i=html.indexOf(`<div class="duel-title">${label}</div>`);return i<0?null:html.slice(i,html.indexOf('</div>\n    </div>',i));};
const strengthKeys=['offenseComposite','qbIndex','rbIndex','receiverIndex','olIndex','passRushIndex','runDefenseIndex','coverageIndex','defenseIndex'];
const strengthLabel={offenseComposite:'Offense',qbIndex:'QB play',rbIndex:'RB',receiverIndex:'Receivers',olIndex:'Offensive line',passRushIndex:'Pass rush',runDefenseIndex:'Run defense',coverageIndex:'Coverage',defenseIndex:'Defense'};
const breakdownKeys=['offenseComposite','defenseIndex','qbIndex','receiverIndex','olIndex','rbIndex','coverageIndex','passRushIndex','runDefenseIndex'];
const changeKeys=['offenseComposite','pointsScoredPerDriveIndex','defenseIndex','qbIndex','olIndex','rbIndex','receiverIndex','passRushIndex','runDefenseIndex','coverageIndex','pointsAllowedPerDriveIndex'];
const sortKey={offenseComposite:'off',defenseIndex:'def',qbIndex:'qb',olIndex:'ol',passRushIndex:'passRush',runDefenseIndex:'runDef',coverageIndex:'cov',rbIndex:'rb',receiverIndex:'rec'};
// Probes use a future game between teams with no completed games, whose
// (prior-held) grades are all finite, so every key is observable.
const fresh=(h)=>{const done=new Set(h.api.sortedSchedule().filter(x=>x.homeScore!=null).flatMap(x=>[x.home,x.away]));return h.api.sortedSchedule().find(x=>x.homeScore==null&&!done.has(x.home)&&!done.has(x.away));};
const finiteGrade=(v)=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v));
function routing(h) {
  const {api,P}=h, S=api.S, issues=[], g=fresh(h);
  const p=api.profile(g.home), ap=api.profile(g.away), hp=api.profile(g.home);
  for (const k of PRESENTATION_KEYS) if (!finiteGrade(p[k])||!finiteGrade(ap[k])) issues.push(`probe-input-not-finite:${k}`);
  const only=(k,f)=>(key,v)=>key===k?f(v):v;
  for (const k of PRESENTATION_KEYS) {
    const id={cell:api.rawUnitCell(p,k),board:api.unitBoardRow(p,'X',k),change:api.unitChangeRows(g.home,1,hp),breakdown:api.matchupBreakdown(g.away,g.home,ap,hp),page:api.matchupPage(g)};
    P.setTransform(only(k,()=>3.25));
    if (api.rawUnitCell(p,k)===id.cell) issues.push(`rawUnitCell:${k}`);
    if (api.unitBoardRow(p,'X',k)===id.board) issues.push(`unitBoardRow:${k}`);
    if (changeKeys.includes(k) && api.unitChangeRows(g.home,1,hp)===id.change) issues.push(`unitChangeRows:${k}`);
    if (breakdownKeys.includes(k) && api.matchupBreakdown(g.away,g.home,ap,hp)===id.breakdown) issues.push(`matchupBreakdown:${k}`);
    if (duelLabels[k]) { const page=api.matchupPage(g); if (duelBlock(page,duelLabels[k])===duelBlock(id.page,duelLabels[k])) issues.push(`matchupDuel:${k}`); }
    if (strengthKeys.includes(k)) { P.setTransform(only(k,()=>999)); if (!api.profileStrengths(g.home,p).high.some(([label])=>label===strengthLabel[k])) issues.push(`profileStrengths:${k}`); }
    if (sortKey[k]) {
      P.setTransform(only(k,v=>100-v)); S.ratingView='units'; S.rankSort={key:sortKey[k],dir:'desc'};
      const first=api.rankings().match(/<tr data-filter="[^"]*?\b([a-z]{2,3})"/)?.[1]?.toUpperCase();
      const lowest=teamsOf(h).map(t=>[t,api.currentTeamState(t).profile?.[k]]).filter(([,v])=>finiteGrade(v)).map(([t,v])=>[t,Number(v)]).sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0][0];
      if (first!==lowest) issues.push(`rankingsSort:${k}`);
      S.ratingView='power'; S.rankSort={key:'force',dir:'desc'};
    }
    P.reset();
  }
  return issues;
}

// A1: canonical bridge keys and seam inventory.
const H=build();
ok(H.P&&typeof H.P.unitDisplayGrade==='function','A1: presentation seam test hook exists in test mode');
eq([...H.P.modelKeys],MODEL_KEYS,'A1: seam model keys are the nine bridge keys');
eq(Object.keys(H.U.WEIGHTS),MODEL_KEYS,'A1: production bridge weights cover exactly the nine keys');
eq([...H.P.presentationKeys],PRESENTATION_KEYS,'A1: presentation keys = nine units + two display-only composites');
ok(H.P.isIdentity(),'A2: production presentation transform is the identity');

// A2: identity for 11 keys x 32 teams (and the composites).
const baseCanonical=canonical(H), baseSurfaces=surfaces(H);
for (const t of teamsOf(H)) { const p=H.api.profile(t); for (const k of PRESENTATION_KEYS) ok(Object.is(H.P.unitDisplayGrade(p,k),p[k]),`A2: ${t} ${k} display === model`); }
ok(H.P.unitDisplayGrade({qbIndex:NaN},'qbIndex')!==H.P.unitDisplayGrade({qbIndex:NaN},'qbIndex'),'A2: unavailable (NaN) model grade passes through unchanged');
eq(H.P.unitDisplayGrade({offenseIndex:7},'offenseIndex'),7,'A2: non-seam diagnostic keys pass through');

// A3/A5/A6/A7/A12: synthetic presentation transform moves presentation only.
H.P.setTransform((k,v)=>Math.min(100,v+10));
eq(canonical(H),baseCanonical,'A7: ratings, FORCE, bridge, forecasts, scores, projections, week-2 and historical states bit-identical under a synthetic display transform');
const moved=surfaces(H);
for (const [name,html] of Object.entries(moved)) ok(html!==baseSurfaces[name],`A6/A7: presentation surface ${name} reflects the synthetic transform`);
for (const t of teamsOf(H)) { const st=H.api.currentTeamState(t); for (const c of st.unitBridge.components) ok(Object.is(c.current,Number.isFinite(Number(st.profile[c.key]))&&st.profile[c.key]!==null?Number(st.profile[c.key]):null),`A3: ${t} bridge reads the model value for ${c.key}`); }
// A11: reset returns to identity with no leaked state in caches or renders.
H.P.reset();
ok(H.P.isIdentity(),'A11: reset restores identity');
eq(surfaces(H),baseSurfaces,'A11: presentation surfaces return byte-identical after reset');
eq(canonical(H),baseCanonical,'A11: canonical state unchanged after transform/render/reset cycle');
H.api.S.engineCache=null; H.api.S.liveProfilesCache=null;
eq(canonical(H),baseCanonical,'A11/A12: rebuilt caches reproduce canonical state');

// A6: every classified presentation consumer routes through the seam.
eq(routing(H),[],'A6: every presentation consumer reflects a single-key presentation change');

// A8: a bridge that reads presentation values must be caught by the neutrality check.
const bridgeLine='const live=liveProfile || priorProfile(t), prior=';
ok(APP.split(bridgeLine).length===2,'A8: bridge input line located');
const leaky=build(APP.replace(bridgeLine,'const live0=liveProfile || priorProfile(t), live=Object.fromEntries(Object.keys(live0||{}).map((k)=>[k,unitDisplayGrade(live0,k)])), prior='));
const leakyBase=canonical(leaky); leaky.P.setTransform((k,v)=>Math.min(100,v+10));
ok(canonical(leaky)!==leakyBase,'A8: bridge-reads-presentation mutation moves canonical output and is detected');
// A9: a consumer bypassing the seam must be caught by the routing probes.
const cellLine='  function rawUnitCell(p, key) {\n    const raw = unitDisplayGrade(p, key);';
const duelCall="unitDisplayGrade(ap,'qbIndex'), unitDisplayGrade(hp,'qbIndex')";
ok(APP.includes(cellLine)&&APP.split(duelCall).length===2,'A9: mutation targets located');
const bypassCell=routing(build(APP.replace(cellLine,'  function rawUnitCell(p, key) {\n    const raw = p?.[key];')));
ok(bypassCell.some(x=>x.startsWith('rawUnitCell:')),'A9: Units-table cell bypass is detected');
const bypassDuel=routing(build(APP.replace(duelCall,'ap.qbIndex, hp.qbIndex')));
eq(bypassDuel,['matchupDuel:qbIndex'],'A9: matchup duel bypass is detected precisely');

// Static boundary: model code never references the presentation seam.
for (const f of fs.readdirSync('model').filter(f=>f.endsWith('.js'))) ok(!/unitDisplayGrade|unitPresentationTransform/.test(fs.readFileSync(`model/${f}`,'utf8')),`A3: model/${f} does not reference the presentation seam`);
const body=(name)=>{const i=APP.indexOf(`function ${name}(`);return APP.slice(i,APP.indexOf('\n  }\n',i));};
for (const fn of ['unitForceBridgeForProfile','currentRatings','currentTeamState','canonicalGameTeamState','week2EntryState','ratingLedger','liveProfiles'])
  ok(!/unitDisplayGrade|unitPresentationTransform/.test(body(fn)),`A3: ${fn} does not read the presentation seam`);
ok(/window\.__FORCE_TEST_MODE__\) \{\n    window\.FORCE_UNIT_PRESENTATION_TEST_HOOKS/.test(APP),'Transform setter exists only inside the test-mode block');
ok((APP.match(/unitPresentationTransform = /g)||[]).length===3 && APP.includes('let unitPresentationTransform = identityUnitPresentation;'),'Transform is declared as the identity and reassigned only by the two test-hook methods');

// A10: generated public mirror matches source.
for (const f of ['assets/app.js','model/unit_force_bridge.js','model/live_profiles.js']) ok(fs.readFileSync(`public/${f}`,'utf8').replace(/\r\n/g,'\n')===fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'),`A10: public/${f} matches source`);

console.log(`MD-08 model/presentation separation contract: ${checks} checks passed`);
