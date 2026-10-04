import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';

// UX-19 (Cycle 6): the public QB-return what-if tool is removed while the
// internal manual-override chain (O4) and the retired V33 research stay. Every
// check drives the real ordered browser bundle. Golden values in
// scripts/fixtures/ux19_golden.json were captured from the reviewed pre-removal
// tree (fe09e67) with `node scripts/test_ux19_qb_return_removal.mjs --capture`.
// Normal runs only read the fixture. Recapture is a deliberate, reviewed action
// with an auditable source SHA; see "Golden fixture" in scripts/TESTING.md.
const CAPTURE=process.argv.includes('--capture');
const goldenPath='scripts/fixtures/ux19_golden.json';
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const hooks='week2EntryState,canonicalGameTeamState,ratingLedger,qbDebug,effectiveQbCorrection,ratingsWithQBCarryover,sortedSchedule,seasonProjection,exactScoreProjection,render,gameKey,score,model,home,teams,names,lab,qbCarryoverUnitEffect,forcecastSlatePage,divisionsPage,playoffPicturePage';
const sha=(s)=>crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,20);
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');

const played=(S)=>{let i=0;S.schedule=S.schedule.map(g=>g.homeScore!=null?g:({...g,homeScore:17+(i%5)*3,awayScore:20+((i++)%4)*2,status:'closed'}));};
function build({sources={},mutate=null,document=null}={}) {
  const h=appHarness({sources,document,hooks});
  if (mutate) { mutate(h.api.S); h.api.S.scheduleVersion++; h.api.S.engineCache=null; }
  return h;
}

// Canonical outputs that UX-19 must not change (A5, A7, A8, A10, A13).
function golden(h) {
  const {api,context}=h, S=api.S;
  const teams=Object.keys(context.window.MODEL_DATA.teams).sort();
  const ratings=api.currentRatings(), active=api.ratingsWithActiveQBCarryover();
  const units=['offenseComposite','defenseIndex','qbIndex','olIndex','rbIndex','receiverIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsScoredPerDriveIndex','pointsAllowedPerDriveIndex'];
  const out={ratings,active,teams:{},games:{},projection:{},lab:{},qbRankings:{}};
  for (const t of teams) {
    const st=api.currentTeamState(t), w=api.week2EntryState(t), l=api.ratingLedger(t), q=api.qbDebug(t);
    out.teams[t]={elo:st.elo,force:st.forceScore,units:units.map(k=>st.profile?.[k]??null),week2:w.elo,ledgerForceDelta:l.forceDelta,
      teamPagePath:api.ratingsWithQBCarryover(t)[t],qbDisplayed:q.displayedQbIndex,qbMeasured:q.measuredQbIndex};
  }
  for (const g of api.sortedSchedule()) {
    const fc=api.forecastFor(g,active), p=api.exactScoreProjection(g,fc);
    const row={prob:fc.probability,home:p.home,away:p.away,margin:p.margin,total:p.total};
    if (g.homeScore!=null) for (const t of [g.home,g.away]) for (const ph of ['pre','post']) {
      const c=api.canonicalGameTeamState(g,t,ph); row[`${t}:${ph}`]=[c.elo,c.qbRestore];
    }
    out.games[api.gameKey(g)]=row;
  }
  const sim=api.seasonProjection();
  for (const [t,v] of Object.entries(sim.teams)) out.projection[t]=[v.expectedWins,v.playoffPct,v.divisionPct,v.projectedRecord];
  for (const t of ['KC','BUF','MIA']) {
    S.team=t; S.scenario={removed:new Set(),add:null};
    const html=api.lab(); out.lab[t]=sha(html);
    const first=html.match(/data-remove="([^"]+)"/)?.[1];
    if (first) { S.scenario={removed:new Set([first]),add:null}; out.lab[`${t}:remove`]=sha(api.lab()); }
    S.scenario={removed:new Set(),add:null};
  }
  for (const mode of ['default','custom']) { S.qbRankingMode=mode; out.qbRankings[mode]=sha(api.qbRankingsPage()); }
  S.qbRankingMode='default';
  return JSON.parse(JSON.stringify(out));
}

if (CAPTURE) {
  const g={bundled:golden(build()),played:golden(build({mutate:played}))};
  fs.mkdirSync('scripts/fixtures',{recursive:true});
  fs.writeFileSync(goldenPath,JSON.stringify(g,null,1)+'\n');
  console.log('captured',goldenPath);
  process.exit(0);
}

// A1, A2, A11. Public controls, tool strings and MANUAL/OFF state are absent.
const forbidden=['data-qbquick','qb-quick','QB Return Lab','qbCarryoverQB','qbCarryoverElo','qbCarryoverValue','applyQBCarryover','clearQBCarryover',
  '<th>QB return</th>','qb-action-cell','No verified QB-return preset','Apply QB fix','Clear QB fix','QB manual','base projection',
  'returning-QB adjustment active','QB-return scenario','returning-QB scenario overlay','carryover-card','carryover-warning','carryover-on',
  'carryover-inline','muted-strike','manual what-if','>MANUAL<','unit-scenario-note','scenario-unit'];
function surfaces(h) {
  const {api,context}=h, S=api.S, out=[];
  out.push(['home',api.home()]);
  for (const view of ['power','penalties','advanced','units','luck']) { S.ratingView=view; out.push([`rankings:${view}`,api.rankings()]); }
  S.ratingView='power';
  out.push(['teams',api.teams()]);
  for (const t of ['KC','BUF','MIA']) out.push([`team:${t}`,api.teamPage(t)]);
  for (const view of ['units','penalties']) { S.ratingView=view; out.push([`team:KC:${view}`,api.teamPage('KC')]); }
  S.ratingView='power';
  const kcGame=api.sortedSchedule().find(g=>g.home==='KC'||g.away==='KC');
  out.push(['matchup:KC',api.matchupPage(kcGame)]);
  for (const mode of ['default','custom']) { S.qbRankingMode=mode; out.push([`qb:${mode}`,api.qbRankingsPage()]); }
  S.qbRankingMode='default';
  out.push(['method',api.model()],['about',api.names()],['slate',api.forcecastSlatePage()],['playoffs',api.playoffPicturePage()],['divisions',api.divisionsPage()]);
  for (const t of ['KC','BUF']) { S.team=t; out.push([`lab:${t}`,api.lab()]); }
  return out;
}
const defaultTree=build({mutate:played});
const defaultSurfaces=surfaces(defaultTree);
for (const [label,html] of defaultSurfaces) for (const s of forbidden) ok(!html.includes(s),`A1/A2: ${label} must not contain "${s}"`);
// Even an internal manual value (O4) produces no public manual-state display.
const internal=build({mutate:played});
internal.api.S.qbCarryover={enabled:true,team:'KC',qb:'Patrick Mahomes',restoreElo:47.3};
const internalSurfaces=[['home',internal.api.home()],['rankings:power',internal.api.rankings()],['teams',internal.api.teams()],['team:KC',internal.api.teamPage('KC')],['team:BUF',internal.api.teamPage('BUF')]];
internal.api.S.ratingView='units'; internalSurfaces.push(['rankings:units',internal.api.rankings()],['team:KC:units',internal.api.teamPage('KC')]); internal.api.S.ratingView='power';
internalSurfaces.push(['matchup:KC',internal.api.matchupPage(internal.api.sortedSchedule().find(g=>g.home==='KC'||g.away==='KC'))],['qb:default',internal.api.qbRankingsPage()]);
for (const [label,html] of internalSurfaces) for (const s of forbidden) ok(!html.includes(s),`A2: internal manual value leaks "${s}" into ${label}`);
// A11. The export pipeline renders these same pages; the rankings and team clones carry no tool remnants.
const exportRankings=defaultSurfaces.find(([l])=>l==='rankings:power')[1];
ok(!/QB return/.test(exportRankings) && !/<select id="qbCarryover|type="range"/.test(defaultSurfaces.find(([l])=>l==='team:KC')[1]),'A11: export sources carry no QB-return column or Lab form elements');
ok(app.includes(".footer, .matchup-warning, .matchup-back, .qb-quick"),'A11: export cleanup selector kept (harmless)');
ok(!/\.carryover|\.qb-quick|\.qb-action-cell|\.home-qb-fix|\.team-quick-fix|\.range-line|\.primary-action|\.unit-scenario-note|\.scenario-unit|\.muted-strike/.test(css),'A1: tool-only CSS removed');
ok(/\.scenario-hero/.test(css) && /\.scenario-stat/.test(css),'A10: shared Roster Lab CSS kept');
ok(!/grid-template-columns:36px 1fr 74px 72px 78px minmax\(0,92px\)/.test(css),'A1: home rank-row sixth track removed');

// A3. No public writer by source: the initializer is the only assignment.
const writes=[...app.matchAll(/S\.qbCarryover(?:\.\w+)?\s*=(?!=)/g)];
ok(writes.length===0,`A3: no assignment to S.qbCarryover outside the initializer (${writes.length})`);
ok((app.match(/qbCarryover:\s*\{\s*enabled:\s*false/g)||[]).length===1,'A3: initializer stays enabled:false');
ok(!/localStorage[^\n]*qbCarryover|sessionStorage|URLSearchParams[^\n]*qb|qbquick|location\.search[^\n]*qb/i.test(app),'A3: no storage, URL or route writer');
ok(!/window\.\w+\s*=\s*S\b|window\.FORCE_\w*\s*=\s*\{[^}]*\bS\b/.test(app),'A3: application state is not exposed as a public global');

// A4. No public writer by behaviour. Render public routes with a DOM stub built
// from the rendered markup, record what bind() attaches, then actually invoke
// those handlers (clicks, changes, inputs, searches, sorts, view tabs, QB
// Customize, team/game navigation, Roster Lab) and check that the internal
// QB-return state never becomes active. A3 remains the source-level audit.
const INITIAL_QBC={enabled:false,team:'KC',qb:'Patrick Mahomes',restoreElo:47.3};
// Routes cover every handler bind() attaches; home, divisions and playoffs only
// repeat the team/game/nav links already exercised here and are slow to render.
const A4_ROUTES=['rankings','qbs','teams','teams/KC','matchups','lab','model','slate','names'];
function a4Harness(sources={}) {
  const ids=new Map(), snapshot=[]; let capture=null;
  const camel=(s)=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  const element=(key,dataset={},value='')=>{
    const el={key,dataset,value,checked:false,disabled:false,innerHTML:'',textContent:'',style:{},_listeners:{},
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
      addEventListener(type,fn){this._listeners[type]=fn;},querySelectorAll(){return [];},querySelector(){return null;},
      closest(){return null;},getAttribute(){return null;},setAttribute(){},focus(){},blur(){},scrollIntoView(){}};
    return el;
  };
  const doc={
    getElementById(id){if(!ids.has(id))ids.set(id,element('#'+id,{},id==='weekFilter'||id==='slateWeek'?'1':id==='rankSearch'||id==='gameSearch'?'kansas':''));const el=ids.get(id);capture?.push(el);return el;},
    querySelector(){return null;},
    querySelectorAll(sel){
      const html=ids.get('app')?.innerHTML||'';
      const m=sel.match(/^\[data-([\w-]+)\]$/);
      let els=[];
      if (m) {
        const values=[...new Set([...html.matchAll(new RegExp(`data-${m[1]}="([^"]*)"`,'g'))].map(x=>x[1]))];
        // One real value per selector (KC first) keeps the run bounded but realistic.
        values.sort((a,b)=>(b.includes('KC')-a.includes('KC')));
        els=values.slice(0,1).map(v=>element(sel,{[camel(m[1])]:v},m[1]==='qb-weight'?'40':v));
      } else if (sel.startsWith('.')||sel.startsWith('#')) els=[element(sel)];
      capture?.push(...els);
      return els;
    },
    addEventListener(){},body:element('body'),documentElement:element('html'),createElement:()=>element('created')
  };
  const h=appHarness({sources,document:doc,hooks,fetch:()=>new Promise(()=>{})});
  played(h.api.S); h.api.S.scheduleVersion++; h.api.S.engineCache=null;
  return {...h,doc,ids,setCapture:(arr)=>{capture=arr;}};
}
async function behaviouralA4(h, routes=A4_ROUTES) {
  const {api,context}=h, S=api.S;
  const before=JSON.stringify(api.currentRatings());
  const invoked=new Set(), violations=[];
  const ev={preventDefault(){},stopPropagation(){},target:null,key:'Enter'};
  const fire=async(el,type,fn)=>{
    try { const r=fn.call(el,{...ev,target:el,currentTarget:el,type}); if (r&&typeof r.then==='function') await Promise.race([r.catch(()=>{}),new Promise(res=>setImmediate(res))]); } catch (_) {}
    invoked.add(`${el.key}:${type}`);
    const q=S.qbCarryover;
    if (JSON.stringify(q)!==JSON.stringify(INITIAL_QBC)) violations.push(`${el.key}:${type} changed S.qbCarryover to ${JSON.stringify(q)}`);
  };
  for (const route of routes) {
    context.location.hash=`#${route}`;
    const captured=[]; h.setCapture(captured); api.render(); h.setCapture(null);
    for (const el of captured) {
      const handlers=[...Object.entries(el).filter(([k,v])=>/^on/.test(k)&&typeof v==='function').map(([k,v])=>[k.slice(2),v]),...Object.entries(el._listeners)];
      for (const [type,fn] of handlers) {
        if (invoked.has(`${el.key}:${type}`)) continue;
        context.location.hash=`#${route}`;
        await fire(el,type,fn);
      }
    }
  }
  for (const t of Object.keys(api.currentRatings())) if (api.effectiveQbCorrection(t)!==0) violations.push(`${t} effective correction ${api.effectiveQbCorrection(t)}`);
  if (JSON.stringify(api.ratingsWithActiveQBCarryover())!==JSON.stringify(api.currentRatings())) violations.push('active ratings differ from canonical ratings');
  if (JSON.stringify(api.currentRatings())!==before) violations.push('canonical ratings changed during public interactions');
  return {invoked,violations};
}
const a4=await behaviouralA4(a4Harness());
for (const key of ['[data-team]:click','[data-nav]:click','[data-ratingview]:click','[data-ranksort]:click','[data-qb-mode]:click','[data-qb-weight]:input','#rankSearch:input','[data-labteam]:click','[data-remove]:change','[data-game]:click'])
  ok(a4.invoked.has(key),`A4: behavioural pass invoked ${key} (${[...a4.invoked].join(', ')})`);
ok(a4.invoked.size>=15,`A4: behavioural pass invoked a broad set of public handlers (${a4.invoked.size})`);
ok(a4.violations.length===0,`A4: invoking public handlers never activates the internal QB-return state: ${a4.violations.join('; ')}`);
for (const id of ['qbCarryoverQB','qbCarryoverElo','qbCarryoverValue','applyQBCarryover','clearQBCarryover']) ok(![...a4.invoked].some(k=>k.startsWith('#'+id+':')),`A4: nothing bound to #${id}`);
ok(![...a4.invoked].some(k=>k.startsWith('[data-qbquick]')),'A4: no quick-button binding');
// A4 negative control: the exact weakness found in validation. A public writer
// injected into the reachable team-link handler must be caught by the same path.
const teamHandler="document.querySelectorAll('[data-team]').forEach((b) => { b.onclick = () => { navigateRoute('teams/' + b.dataset.team); }; });";
ok(app.includes(teamHandler),'A4 control: team-link handler found for injection');
const injected=app.replace(teamHandler,"document.querySelectorAll('[data-team]').forEach((b) => { b.onclick = () => { Object.assign(S.qbCarryover,{ enabled:true, team:'KC', restoreElo:47.3 }); navigateRoute('teams/' + b.dataset.team); }; });");
const a4Bad=await behaviouralA4(a4Harness({'assets/app.js':injected}),['rankings']);
ok(a4Bad.invoked.has('[data-team]:click') && a4Bad.violations.some(v=>v.startsWith('[data-team]:click changed S.qbCarryover')) && a4Bad.violations.some(v=>/^KC effective correction 47\.3/.test(v)),`A4 control: injected public writer is detected (${a4Bad.violations.slice(0,2).join('; ')})`);

// A5, A7, A8, A10, A13. Canonical outputs equal the reviewed pre-removal tree.
const G=JSON.parse(fs.readFileSync(goldenPath,'utf8'));
for (const [state,h] of [['bundled',build()],['played',build({mutate:played})]]) {
  const now=golden(h), was=G[state];
  for (const key of ['ratings','active','teams']) assert.deepEqual(now[key],was[key],`A5/A13: ${state} ${key} unchanged`),checks++;
  assert.deepEqual(now.games,was.games,`A7/A8: ${state} forecasts, Monte Carlo scores and historical states unchanged`); checks++;
  assert.deepEqual(now.projection,was.projection,`A7: ${state} season projection unchanged`); checks++;
  assert.deepEqual(now.lab,was.lab,`A10: ${state} Roster Lab unchanged`); checks++;
  assert.deepEqual(now.qbRankings,was.qbRankings,`A13: ${state} QB Rankings Default and Customize unchanged`); checks++;
  for (const [t,x] of Object.entries(now.teams)) ok(x.qbDisplayed===x.qbMeasured,`A13: ${state} ${t} QB Default equals the measured value`);
}

// A6. Automatic correction stays zero; legacy preset and gate stay inert.
const legacy={'data/qb-carryover.js':fs.readFileSync('data/qb-carryover.js','utf8').replace('"defaultEnabled":false','"defaultEnabled":true').replace('"autoEligible":false','"autoEligible":true'),
  'data/predictive-feature-gates.js':fs.readFileSync('data/predictive-feature-gates.js','utf8').replace("qbCarryover: { status: 'retired-md03-cycle6', predictiveWeight: 0,","qbCarryover: { status: 'accepted-verified-regime', predictiveWeight: 1.0,")};
ok(legacy['data/qb-carryover.js'].includes('"autoEligible":true') && legacy['data/predictive-feature-gates.js'].includes("predictiveWeight: 1.0,"),'A6: legacy fixture restores the old flags');
const L=build({sources:legacy,mutate:played}), D=build({mutate:played});
assert.deepEqual(JSON.parse(JSON.stringify(L.api.ratingsWithActiveQBCarryover())),JSON.parse(JSON.stringify(D.api.currentRatings())),'A6: legacy preset and gate change nothing'); checks++;
for (const t of Object.keys(D.api.currentRatings())) ok(D.api.effectiveQbCorrection(t)===0,`A6: ${t} has no QB-return correction`);
ok(!app.includes('automaticQbRegimeCorrection') && !app.includes('QR.correction(') && !app.includes("brierEligible('qbCarryover')"),'A6: no automatic resolver, V33 call or gate read');

// A9. Internal and research capability preserved (O4).
const I=build({mutate:played}), base=I.api.currentRatings();
I.api.S.qbCarryover={enabled:true,team:'KC',qb:'Patrick Mahomes',restoreElo:47.3};
ok(Math.abs(I.api.ratingsWithActiveQBCarryover().KC-(base.KC+47.3))<1e-9 && Math.abs(I.api.currentTeamState('KC').elo-(base.KC+47.3))<1e-9,'A9: internal manual value still propagates');
ok(I.api.ratingsWithQBCarryover('KC').KC===base.KC+47.3,'A9: team-page path still applies it');
I.api.S.qbCarryover.enabled=false;
ok(I.api.qbCarryoverUnitEffect('KC',base,30,'Patrick Mahomes')?.restoreElo===30,'A9: qbCarryoverUnitEffect what-if entry point works');
const LP=I.context.window.FORCE_LIVE_PROFILE, kcProfile=I.api.currentTeamState('KC').profile;
ok(typeof LP.applyQbCarryoverScenario==='function' && LP.applyQbCarryoverScenario(kcProfile,40,45)?.profile,'A9: unit overlay transform works');
for (const hook of ['FORCE_QB_DEBUG','FORCE_CURRENT_TEAM_STATE','FORCE_RATING_LEDGER','FORCE_CANONICAL_GAME_TEAM_STATE']) ok(typeof I.context.window[hook]==='function',`A9: ${hook} hook kept`);
const R=I.context.window.FORCE_QB_REGIME, Q=I.context.window.QB_CARRYOVER;
ok(Math.abs(R.correction({...Q.presets.KC,autoEligible:true},0)-15.75)<1e-12 && R.correction(Q.presets.KC,0)===0,'A9: V33 research math reproduces on a re-enabled copy only');

// A12. Method copy matches N1(a).
const method=I.api.model();
const section=method.slice(method.indexOf('<h2>QB return adjustment</h2>'),method.indexOf('<h2>FORCE Adaptive</h2>'));
ok(section.includes('FORCE does not apply an automatic QB-return adjustment.') && section.includes('Historical testing found a small effect that varied depending on which cases were included, so the automatic correction was retired.') && section.includes('The research is preserved for future evaluation.'),'A12: N1(a) note present');
ok(!/FIRST FOUR WEEKS|FIRST EIGHT WEEKS|-0\.0104|-0\.0094|NOT APPLIED|brier-grid/.test(section),'A12: historical KPIs moved out of public Method');
ok(!/manual|what-if|disproven|no effect|zero/i.test(section) && !/—/.test(section),'A12: no manual clause, no disproven/zero claim, no em dash');
ok(!method.includes('<h2>QB return correction</h2>'),'A12: old section heading replaced');

console.log(`OK: ${checks} UX-19 QB-return removal checks`);
