import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';

// MD-04 (Cycle 7) decision-free Roster Lab accounting / identity tranche.
// Drives the real ordered browser bundle. Rows are addressed by team, position
// and name; removals apply before the single addition, and a QB addition's
// incumbent excludes removed rows. Impacts, signed-removal behaviour and the
// forced-replacement rule are deliberately unchanged (open owner decisions).
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const NOW=Date.parse('2026-10-04T12:00:00Z');
const hooks='lab,labPlayerKey,labPlayer,projected,score,render';
const app=fs.readFileSync('assets/app.js','utf8');
const build=(sources={},document=null)=>appHarness({now:NOW,hooks,sources,document});

const h=build(), {api,context}=h, S=api.S;
const D=context.window.MODEL_DATA, P=D.players, F=context.window.SIGNAL_FORECAST_V2;
const teams=Object.keys(D.teams).sort();
const key=(p)=>api.labPlayerKey(p);
const row=(team,name,pos)=>{const r=P.filter(p=>p.team===team&&p.name===name&&(!pos||p.pos===pos));assert.equal(r.length,1,`${team} ${name} ${pos||''} row`);return r[0];};
const offered=(t)=>P.filter(p=>p.team!==t).sort((a,b)=>b.impact-a.impact).slice(0,100);
const fmt=(n)=>Number(n).toFixed(1);
function render(team,add=null,removed=[]) {
  S.team=team; S.scenario={add:add?key(add):null,removed:new Set(removed.map(key))};
  return api.lab();
}
const rawDelta=(html)=>Number(html.match(/Raw rating delta<\/span><strong>([^<]+)/)[1]);
const delta=(team,add=null,removed=[])=>rawDelta(render(team,add,removed));
const canonical=JSON.stringify(api.currentRatings());
const unitKeys=['offenseComposite','defenseIndex','qbIndex','olIndex','rbIndex','receiverIndex','coverageIndex','passRushIndex','runDefenseIndex','pointsScoredPerDriveIndex','pointsAllowedPerDriveIndex'];
const units=()=>JSON.stringify(teams.map(t=>unitKeys.map(k=>api.currentTeamState(t).profile?.[k]??null)));
const forecasts=()=>JSON.stringify(S.schedule.map(g=>api.forecastFor(g,api.currentRatings()).probability));
const canonicalUnits=units(), canonicalForecasts=forecasts();

// A4. Keys are unique across every bundled row, including all 13 bare-name collision groups.
const keys=P.map(key);
eq(new Set(keys).size,P.length,'A4: every player row has a distinct Lab key');
const collisions=[...new Set(P.filter((p,i)=>P.findIndex(x=>x.name===p.name)!==i).map(p=>p.name))];
eq(collisions.length,13,'A4: the 13 known bare-name collision groups are present');
for (const p of P) ok(api.labPlayer(key(p))===p,`A4: ${key(p)} resolves to its own row`);
ok(api.labPlayer('J.Williams')===null && api.labPlayer('Ty.Johnson')===null,'A4: a bare name is not a key');
ok(api.labPlayer('')===null && api.labPlayer('NOPE|QB|Nobody')===null,'A4: unknown keys resolve to nothing');

// A1-A3. Every offered option on every team selects exactly its own row.
let offeredChecks=0;
for (const t of teams) {
  const html=render(t), options=[...html.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);
  eq(JSON.stringify(options),JSON.stringify(offered(t).map(key)),`A1: ${t} offers its top-100 rows by key`);
  const qbs=P.filter(p=>p.team===t&&p.pos==='QB').sort((a,b)=>b.impact-a.impact);
  for (const p of offered(t)) {
    const r=api.labPlayer(key(p));
    ok(r===p && r.team===p.team && r.pos===p.pos,`A2/A3: ${t} option ${key(p)} resolves to the same team and position`);
    const expected=p.pos==='QB' ? p.impact-(qbs[0]?.impact||0) : p.impact;
    ok(Math.abs(delta(t,p)-expected)<0.051,`A1: ${t} add ${key(p)} uses that row's impact`);
    offeredChecks++;
  }
}
eq(offeredChecks,3200,'A1: 32 teams x 100 offered rows checked');

// A5. Known collision regressions from the reviewed research.
const detWilliams=row('DET','J.Williams','WR'), sfRobinson=row('SF','B.Robinson','RB');
const bufTyRb=row('BUF','Ty.Johnson','RB'), bufTyWr=row('BUF','Ty.Johnson','WR');
eq(delta('DAL',detWilliams),5.9,'A5: DAL add DET J.Williams WR adds +5.9, not DAL RB +5.6');
eq(delta('MIA',sfRobinson),3.4,'A5: SF B.Robinson RB adds +3.4, not ATL WR +0.5');
eq(delta('MIA',bufTyWr),2.4,'A5: BUF Ty.Johnson WR row adds +2.4, not the RB row +8');
eq(delta('MIA',bufTyRb),8,'A5: BUF Ty.Johnson RB row adds +8');

// A4/A9. The two BUF Ty.Johnson rows are independent controls.
const bufHtml=render('BUF');
eq((bufHtml.match(/data-remove="BUF\|RB\|Ty\.Johnson"/g)||[]).length,1,'A9: one RB checkbox');
eq((bufHtml.match(/data-remove="BUF\|WR\|Ty\.Johnson"/g)||[]).length,1,'A9: one WR checkbox');
eq(delta('BUF',null,[bufTyRb]),-8,'A9: removing the RB row subtracts only +8');
eq(delta('BUF',null,[bufTyWr]),-2.4,'A9: removing the WR row subtracts only +2.4');
eq(delta('BUF',null,[bufTyRb,bufTyWr]),-10.4,'A9: removing both rows subtracts both');
const bufWrChecked=render('BUF',null,[bufTyWr]);
ok(/data-remove="BUF\|WR\|Ty\.Johnson" checked/.test(bufWrChecked) && !/data-remove="BUF\|RB\|Ty\.Johnson" checked/.test(bufWrChecked),'A9: checking the WR row leaves the RB row unchecked');

// A6-A9. Removals apply first; the QB incumbent excludes removed rows.
const tua=row('MIA','Tua Tagovailoa'), lamar=row('BAL','Lamar Jackson'), cousins=row('ATL','Kirk Cousins');
const huntley=row('BAL','Tyler Huntley'), rush=row('BAL','Cooper Rush');
eq(delta('MIA',lamar,[tua]),56,'A8: MIA remove Tua + add Lamar is +56 (was +64 double incumbent subtraction)');
eq(delta('MIA',lamar,[tua]),delta('MIA',lamar),'A6: removing the incumbent first equals replacing it once');
eq(delta('BAL',cousins,[lamar]),-48+(cousins.impact-huntley.impact),'A7/A9: BAL remove Lamar + add Cousins replaces Huntley, the remaining top QB (-72)');
eq(delta('BAL',cousins,[lamar,huntley]),-48-33+(cousins.impact-rush.impact),'A7: with two QBs removed, Cousins replaces Rush');
eq(delta('BAL',cousins,[lamar,huntley,rush]),-48-33+67+cousins.impact,'A7: with the whole QB room removed, the addition has no incumbent');
eq(delta('BAL',cousins,[huntley]),-33+(cousins.impact-lamar.impact),'A7: removing a non-top QB leaves Lamar as incumbent');

// A14. Deferred owner-policy behaviour is unchanged.
for (const [t,add,rem,v,label] of [['MIA',null,[tua],8,'MIA remove Tua (signed removal)'],['NYJ',null,[row('NYJ','Tyrod Taylor')],119,'NYJ remove Tyrod Taylor'],
  ['BAL',null,[rush],67,'BAL remove Cooper Rush'],['BAL',cousins,[],-39,'BAL add Cousins (forced replacement)'],['MIA',lamar,[],56,'MIA add Lamar'],
  ['MIA',null,[row('MIA','O.Gordon')],7.9,'MIA remove Gordon'],['MIA',null,[row('MIA','M.Washington')],5.6,'MIA remove Washington'],
  ['ARI',row('MIA','D.Waller'),[],9.8,'ARI add Waller'],['MIA',bufTyRb,[],8,'MIA add Ty.Johnson RB']]) eq(delta(t,add,rem),v,`A14: ${label} stays ${v} (open policy)`);

// A10-A13. Baseline identity, canonical/unit/forecast isolation, propagation and reset.
for (const t of teams) {
  const html=render(t);
  eq(rawDelta(html),0,`A10: ${t} no-scenario delta is zero`);
  const r=api.currentRatings()[t];
  ok(html.includes(`<span>FORCE Score</span><strong>${fmt(api.score(r))}</strong>`),`A10: ${t} no-scenario FORCE Score equals canonical`);
}
eq(JSON.stringify(api.currentRatings()),canonical,'A11: Lab scenarios never write canonical ratings');
eq(units(),canonicalUnits,'A11: canonical unit ratings unchanged by Lab scenarios');
eq(forecasts(),canonicalForecasts,'A12: canonical forecasts unchanged by Lab scenarios');
{
  const html=render('MIA',lamar,[tua]), ratings=api.currentRatings(), d=56;
  const before=api.projected('MIA',ratings), after=api.projected('MIA',ratings,d);
  ok(html.includes(`<span>FORCE Score</span><strong>${fmt(api.score(ratings.MIA+d))}</strong>`),'A12: scenario FORCE Score is canonical rating + delta');
  ok(html.includes(`<span>Expected wins</span><strong>${fmt(after.ew)}</strong>`) && after.ew>before.ew,'A12: expected wins use projected(team, ratings, delta)');
  const rows=[...html.matchAll(/(\d+)% → <b>(\d+)%<\/b>/g)];
  const games=S.schedule.filter(g=>g.homeScore==null&&(g.home==='MIA'||g.away==='MIA'));
  eq(rows.length,games.length,'A12: one schedule row per remaining game');
  games.forEach((g,i)=>{
    const fc=api.forecastFor(g,ratings), home=g.home==='MIA', newHome=F.applyEloDelta(fc.probability,d,home,D.config.scale);
    eq(Number(rows[i][2]),Math.round((home?newHome:1-newHome)*100),`A12: ${g.away}@${g.home} propagates once through applyEloDelta`);
  });
}
for (const t of ['MIA','BUF','BAL']) {
  const base=render(t); render(t,lamar.team===t?cousins:lamar,P.filter(p=>p.team===t).slice(0,2));
  S.scenario={removed:new Set(),add:null};
  eq(api.lab(),base,`A13: ${t} reset returns the exact baseline Lab`);
}

// A15. Public controls stay human-readable and accessible.
for (const t of ['BUF','DAL','MIA']) {
  const html=render(t,null,[]), text=html.replace(/<[^>]*>/g,' ');
  ok(!/[A-Z]{2,3}\|(QB|RB|WR)\|/.test(text),`A15: ${t} keys never appear in visible text`);
  ok(/<label class="player"><input type="checkbox" data-remove="[^"]+"/.test(html),`A15: ${t} checkboxes stay inside their labels`);
  ok(!/\sid="[^"]*\|/.test(html),`A15: ${t} keys are not used as element ids`);
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  eq(new Set(ids).size,ids.length,`A15: ${t} has no duplicate DOM ids`);
  for (const p of P.filter(x=>x.team===t)) ok(text.includes(p.name),`A15: ${t} roster still shows ${p.name}`);
}
ok(render('MIA').includes('>J.Williams · WR · DET (+5.9)</option>'),'A15: option label text unchanged');

// A15. Real bind() handlers carry keys into scenario state.
{
  const els=new Map(); let appEl;
  const el=(k,extra={})=>({key:k,dataset:{},value:'',checked:false,innerHTML:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},querySelectorAll(){return [];},querySelector(){return null;},setAttribute(){},getAttribute(){return null;},focus(){},...extra});
  const doc={getElementById(id){if(!els.has(id))els.set(id,el('#'+id));return els.get(id);},querySelector(){return null;},addEventListener(){},body:el('body'),documentElement:el('html'),createElement:()=>el('created'),
    querySelectorAll(sel){if(sel!=='[data-remove]')return [];const html=els.get('app')?.innerHTML||'';return [...html.matchAll(/data-remove="([^"]+)"/g)].map(m=>{const x=el(sel);x.dataset={remove:m[1]};els.set('rm:'+m[1],x);return x;});}};
  const b=build({},doc), BS=b.api.S;
  b.context.location.hash='#lab'; BS.team='BUF'; BS.scenario={removed:new Set(),add:null}; b.api.render();
  const wr=els.get('rm:BUF|WR|Ty.Johnson'); ok(wr && typeof wr.onchange==='function','A15: BUF WR row checkbox is bound');
  wr.checked=true; wr.onchange(); ok(BS.scenario.removed.has('BUF|WR|Ty.Johnson') && !BS.scenario.removed.has('BUF|RB|Ty.Johnson'),'A15: checkbox handler stores the row key');
  const ap=els.get('addPlayer'); ap.value=key(detWilliams); ap.onchange(); eq(BS.scenario.add,'DET|WR|J.Williams','A15: add handler stores the offered row key');
  const lt=els.get('labTeam'); lt.value='DAL'; lt.onchange(); ok(BS.team==='DAL' && BS.scenario.add===null && BS.scenario.removed.size===0,'A13: team change resets the scenario');
}

// Mutation controls: each reintroduced defect must fail this contract.
const mutations={
  'name-only global lookup':[["return `${p.team}|${p.pos}|${p.name}`;",'return p.name;'],['return rows.length === 1 ? rows[0] : null;','return rows[0] || null;']],
  'removed-incumbent inclusion':[["const cur = remaining.filter((x) => x.pos === 'QB')","const cur = teamPlayers.filter((x) => x.pos === 'QB')"]],
  'old sequencing (removals not applied before addition)':[['const remaining = teamPlayers.filter((p) => !removed.includes(p));','const remaining = teamPlayers;']],
};
for (const [label,edits] of Object.entries(mutations)) {
  let src=app; for (const [from,to] of edits) { ok(src.includes(from),`mutation ${label}: source anchor present`); src=src.replace(from,to); }
  const m=build({'assets/app.js':src}), mS=m.api.S, mk=(p)=>m.api.labPlayerKey(p);
  const md=(t,add,rem=[])=>{mS.team=t;mS.scenario={add:add?mk(add):null,removed:new Set(rem.map(mk))};return rawDelta(m.api.lab());};
  const failures=[md('DAL',detWilliams)!==5.9,md('MIA',sfRobinson)!==3.4,md('BUF',null,[bufTyWr])!==-2.4,md('MIA',lamar,[tua])!==56,md('BAL',cousins,[lamar])!==-72].filter(Boolean).length;
  ok(failures>0,`mutation ${label}: detected by the identity/accounting contract (${failures} failing cases)`);
}

console.log(`MD-04 Roster Lab accounting: ${checks} checks passed`);
