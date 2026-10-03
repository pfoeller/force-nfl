import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';

// MD-03 (Cycle 6): the automatic V33 returning-QB correction is retired from
// production. These checks drive the real ordered browser bundle and prove that
// it contributes exactly zero on every production route, that legacy preset or
// gate data cannot bring it back, and that the manual QB Return Lab still works.
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const hooks='week2EntryState,canonicalGameTeamState,ratingLedger,qbDebug,effectiveQbCorrection,ratingsWithQBCarryover,sortedSchedule,seasonProjection,render,gameKey,coreCurrentRatings,score,model';
const app=fs.readFileSync('assets/app.js','utf8');

const preseason=(S)=>{S.schedule=S.schedule.map(g=>({...g,homeScore:null,awayScore:null,status:'scheduled'}));};
// Every bundled game completed with fixed scores, so KC has played after the old start.
const played=(S)=>{let i=0;S.schedule=S.schedule.map(g=>g.homeScore!=null?g:({...g,homeScore:17+(i%5)*3,awayScore:20+((i++)%4)*2,status:'closed'}));};
function build({sources={},mutate=null,document=null}={}) {
  const h=appHarness({sources,document,hooks});
  if (mutate) { mutate(h.api.S); h.api.S.scheduleVersion++; h.api.S.engineCache=null; }
  return h;
}

// Legacy pre-retirement data: KC auto-eligible again, gate accepted again.
const legacyCarryover=fs.readFileSync('data/qb-carryover.js','utf8')
  .replace('"defaultEnabled":false','"defaultEnabled":true')
  .replace('"promotionDecision":"retired-md03-cycle6"','"promotionDecision":"verified-regime-auto"')
  .replace('"autoEligible":false','"autoEligible":true');
const legacyGates=fs.readFileSync('data/predictive-feature-gates.js','utf8')
  .replace("qbCarryover: { status: 'retired-md03-cycle6', predictiveWeight: 0,","qbCarryover: { status: 'accepted-verified-regime', predictiveWeight: 1.0,");
ok(legacyCarryover.includes('"autoEligible":true') && legacyGates.includes("status: 'accepted-verified-regime', predictiveWeight: 1.0"),'legacy fixture must actually restore the old flags');
const legacySources={'data/qb-carryover.js':legacyCarryover,'data/predictive-feature-gates.js':legacyGates};

// Everything a production route reads, for every team and game.
function snapshot({api,context}) {
  const teams=Object.keys(context.window.MODEL_DATA.teams).sort();
  const ratings=api.currentRatings(), active=api.ratingsWithActiveQBCarryover();
  const out={ratings,active,teams:{},games:{}};
  for (const t of teams) {
    const s=api.currentTeamState(t), w=api.week2EntryState(t), l=api.ratingLedger(t);
    out.teams[t]={elo:s.elo,rawElo:s.rawElo,force:s.forceScore,qbRegimeCorrection:s.qbRegimeCorrection,qbScenario:s.qbScenario,
      teamPage:api.ratingsWithQBCarryover(t)[t],effective:api.effectiveQbCorrection(t),
      week2:{elo:w.elo,qbRestore:w.qbRestore},ledger:{entry:l.entry.qbElo,current:l.current.qbElo,delta:l.deltas.qbElo,residual:l.residual}};
  }
  for (const g of api.sortedSchedule()) {
    const row={prob:api.forecastFor(g,active).probability};
    if (g.homeScore!=null) for (const t of [g.home,g.away]) for (const ph of ['pre','post']) {
      const c=api.canonicalGameTeamState(g,t,ph); row[`${t}:${ph}`]={elo:c.elo,qbRestore:c.qbRestore};
    }
    out.games[api.gameKey(g)]=row;
  }
  // Each harness is its own realm; JSON round-trips doubles exactly and drops realm prototypes.
  return JSON.parse(JSON.stringify(out));
}

function assertNoAutomatic(h,label) {
  const {api,context}=h, snap=snapshot(h);
  for (const [t,x] of Object.entries(snap.teams)) {
    ok(x.effective===0,`${label}: ${t} has no QB-return correction without a manual value`);
    ok(snap.active[t]===snap.ratings[t] && x.teamPage===snap.ratings[t],`${label}: ${t} active and team-page ratings equal canonical ratings`);
    ok(x.elo===snap.ratings[t] && x.rawElo===snap.ratings[t],`${label}: ${t} current state carries no overlay`);
    ok(x.qbRegimeCorrection===null && x.qbScenario===null,`${label}: ${t} has no QB regime or unit overlay`);
    ok(x.week2.qbRestore===0 && x.ledger.entry===0 && x.ledger.current===0 && x.ledger.delta===0,`${label}: ${t} ledger carries no QB restore`);
    const core=api.coreCurrentRatings()[t];
    ok(Math.abs(api.unitForceBridge(t,core).elo-snap.ratings[t])<1e-9,`${label}: ${t} rating is the bridge rating alone`);
  }
  for (const [k,row] of Object.entries(snap.games)) for (const [key,c] of Object.entries(row)) {
    if (key==='prob') continue;
    ok(c.qbRestore===0,`${label}: historical ${k} ${key} applies no QB restore`);
  }
  const kc=api.qbDebug('KC');
  ok(kc.qbRegimeCorrection===null && kc.scenarioAdjustment===0,`${label}: KC QB debug shows no regime correction`);
  ok(!context.window.FORCE_QB_REGIME.eligiblePreset(context.window.QB_CARRYOVER.presets.KC)||label.startsWith('legacy'),`${label}: bundled KC preset is not auto-eligible`);
  return snap;
}

// 1. Former positive case: KC, before any game (old V33 start +15.75) and after games.
const pre=build({mutate:preseason});
const preResearch=pre.context.window.FORCE_QB_REGIME.correction({...pre.context.window.QB_CARRYOVER.presets.KC,autoEligible:true},0);
ok(Math.abs(preResearch-15.75)<1e-12,'research copy reproduces the old +15.75 KC start, so this case is a real former positive');
ok(pre.api.sortedSchedule().every(g=>g.homeScore==null),'preseason fixture has no completed games');
const preSnap=assertNoAutomatic(pre,'preseason');
assertNoAutomatic(build(),'bundled');
const now=build({mutate:played});
const kcGames=now.api.sortedSchedule().filter(g=>g.homeScore!=null&&(g.home==='KC'||g.away==='KC'));
ok(kcGames.length>0,'bundled state includes a completed KC game, after the old correction would have applied');
const nowSnap=assertNoAutomatic(now,'played');

// 2 and 3. Stale autoEligible preset plus a reopened predictive gate cannot reactivate it.
const legacyPre=build({sources:legacySources,mutate:preseason});
ok(Math.abs(legacyPre.context.window.FORCE_QB_REGIME.correction(legacyPre.context.window.QB_CARRYOVER.presets.KC,0)-15.75)<1e-12,'legacy preset is live for the research module');
ok(legacyPre.context.window.FORCE_PREDICTIVE_FEATURES.brierEligible('qbCarryover'),'legacy gate is open');
eq(assertNoAutomatic(legacyPre,'legacy preseason'),preSnap,'legacy preset/gate leaves every preseason production output unchanged');
eq(assertNoAutomatic(build({sources:legacySources,mutate:played}),'legacy played'),nowSnap,'legacy preset/gate leaves every current production output unchanged');

// 4. The automatic resolver is gone, not merely returning zero, and nothing calls the module.
assert.throws(()=>appHarness({hooks:'automaticQbRegimeCorrection'}),(e)=>e?.name==='ReferenceError' && /automaticQbRegimeCorrection/.test(e.message)); checks++;
ok(!app.includes('QR.correction(') && !app.includes('window.FORCE_QB_REGIME') && !app.includes("brierEligible('qbCarryover')"),'production app does not reach the V33 module or gate');

// 5. Major routes on the played state.
const {api}=now;
const rankingsHtml=api.rankings();
ok(!rankingsHtml.includes('QB auto') && !rankingsHtml.includes('qb-quick active'),'rankings show no automatic QB fix');
const teamHtml=api.teamPage('KC');
ok(teamHtml.includes('QB Return Lab') && teamHtml.includes('>OFF<') && teamHtml.includes('Apply QB fix'),'KC team page shows the manual lab, off');
ok(!teamHtml.includes('>AUTO<') && !teamHtml.includes('muted-strike') && !teamHtml.includes('automatic correction is now'),'KC team page shows no automatic overlay');
const kcFuture=api.sortedSchedule().find(g=>g.homeScore==null&&(g.home==='KC'||g.away==='KC')) || kcGames[0];
ok(api.forecastFor(kcFuture,api.ratingsWithActiveQBCarryover()).probability===api.forecastFor(kcFuture,api.currentRatings()).probability,'KC FORCEcast uses canonical ratings only');
ok(!api.matchupPage(kcFuture).includes('returning-QB adjustment active'),'KC matchup discloses no QB adjustment');
const sim=api.seasonProjection();
ok(sim.teams.KC.force===api.score(api.currentRatings().KC),'playoff projection uses the canonical KC rating');
const method=api.model();
ok(method.includes('NOT APPLIED') && !method.includes('LIMITED USE') && !method.includes('limited returning-QB correction'),'Method copy states no automatic correction');

// 6. Rendered copy must describe retirement even with legacy data or a manual value.
for (const [label,sources] of [['default',{}],['legacy',legacySources]]) {
  const h=build({sources});
  for (const manual of [false,true]) {
    h.api.S.qbCarryover={enabled:manual,team:'KC',qb:'Patrick Mahomes',restoreElo:47.3};
    for (const t of ['KC','BUF']) {
      const html=h.api.teamPage(t), context=`${label}: ${t}, manual ${manual?'on':'off'}`;
      const warning=html.match(/<div class="warning carryover-warning">([\s\S]*?)<\/div>/)?.[1];
      ok(Boolean(warning),`${context}: research warning remains visible`);
      ok(warning.includes('FORCE does not apply an automatic correction.'),`${context}: warning states the retired policy`);
      ok(!/Why the automatic correction is cautious:|FORCE therefore uses it only for verified replacement-QB cases|cuts that correction in half about every four team games/.test(warning),`${context}: warning does not claim active automatic use or decay`);
      ok(['id="qbCarryoverQB"','id="qbCarryoverElo"','id="applyQBCarryover"','id="clearQBCarryover"'].every(id=>html.includes(id)),`${context}: manual controls remain available`);
      ok(html.includes(manual&&t==='KC'?'>MANUAL<':'>OFF<'),`${context}: rendered manual state matches the fixture`);
    }
  }
}

// 9. Manual QB Return Lab still works through its real handlers.
const els={app:{innerHTML:''},qbCarryoverQB:{value:'Patrick Mahomes'},qbCarryoverElo:{value:'47.3'},qbCarryoverValue:{textContent:''},
  applyQBCarryover:{onclick:null},clearQBCarryover:{onclick:null}};
const quick={dataset:{qbquick:'KC'},onclick:null};
const doc={getElementById(id){return els[id]||null;},querySelector(){return null;},querySelectorAll(sel){return sel==='[data-qbquick]'?[quick]:[];},addEventListener(){}};
const m=build({document:doc,mutate:played}); m.context.location.hash='#teams/KC';
const base=m.api.currentRatings();
m.api.render();
ok(els.app.innerHTML.includes('>OFF<') && typeof els.applyQBCarryover.onclick==='function','manual lab renders with live Apply control');
els.applyQBCarryover.onclick();
ok(m.api.S.qbCarryover.enabled && m.api.S.qbCarryover.team==='KC' && m.api.S.qbCarryover.restoreElo===47.3,'Apply stores the manual value');
ok(els.app.innerHTML.includes('>MANUAL<') && els.app.innerHTML.includes('QB manual +47.3 Elo') && els.app.innerHTML.includes('base projection'),'manual state is shown');
ok(Math.abs(m.api.ratingsWithActiveQBCarryover().KC-(base.KC+47.3))<1e-9 && Math.abs(m.api.currentTeamState('KC').elo-(base.KC+47.3))<1e-9,'manual value moves KC everywhere as before');
ok(Math.abs(m.api.ratingLedger('KC').current.qbElo-47.3)<1e-9 && m.api.ratingLedger('KC').entry.qbElo===0,'ledger attributes the manual value only');
for (const t of Object.keys(base)) if (t!=='KC') ok(m.api.ratingsWithActiveQBCarryover()[t]===base[t],`manual KC value leaves ${t} unchanged`);
ok(kcGames.every(g=>m.api.canonicalGameTeamState(g,'KC','post').qbRestore===0),'manual what-if never rewrites historical states');
els.clearQBCarryover.onclick();
ok(!m.api.S.qbCarryover.enabled && els.app.innerHTML.includes('>OFF<') && m.api.ratingsWithActiveQBCarryover().KC===base.KC,'Reset returns to no correction');
quick.onclick({preventDefault(){},stopPropagation(){}});
ok(m.api.S.qbCarryover.enabled && m.api.S.qbCarryover.restoreElo===47.3 && els.app.innerHTML.includes('Clear QB fix'),'quick button applies the KC preset value');
quick.onclick({preventDefault(){},stopPropagation(){}});
ok(!m.api.S.qbCarryover.enabled && m.api.ratingsWithActiveQBCarryover().KC===base.KC,'quick button clears it');
// Pre-retirement behaviour for a team without a preset is preserved: team page only.
m.api.S.qbCarryover={enabled:true,team:'BUF',qb:'QB',restoreElo:20};
ok(m.api.ratingsWithQBCarryover('BUF').BUF===base.BUF+20 && m.api.ratingsWithActiveQBCarryover().BUF===base.BUF,'non-preset manual value keeps its pre-retirement scope');

// 10. Fresh state: nothing persisted can resurrect a correction.
const fresh=build();
ok(fresh.api.S.qbCarryover.enabled===false && fresh.api.ratingsWithActiveQBCarryover().KC===fresh.api.currentRatings().KC,'fresh start has no correction');
ok(!/localStorage[^\n]*qbCarryover|qbCarryover[^\n]*localStorage/.test(app),'QB carryover state is never persisted');

console.log(`OK: ${checks} MD-03 automatic QB-return retirement checks`);
