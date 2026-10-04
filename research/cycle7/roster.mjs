// RESEARCH ONLY: real bundled Lab reproductions and two isolated allocators.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {appHarness} from '../../scripts/lib/force_app_harness.js';
process.chdir(fileURLToPath(new URL('../..', import.meta.url)));
const {api,context}=appHarness({now:Date.parse('2026-10-04T12:00:00Z'),hooks:'lab,score,projected,coreCurrentRatings'});
const D=context.window.MODEL_DATA,players=D.players,canonical=JSON.stringify(api.currentRatings());
function scenario(team,add=null,removed=[]){
 api.S.team=team;api.S.scenario={add,removed:new Set(removed)};
 const html=api.lab(),m=html.match(/Raw rating delta<\/span><strong>([^<]+)/);
 assert(m,'real rendered Raw rating delta');
 const incoming=players.find(p=>p.name===add),roster=players.filter(p=>p.team===team);
 let formula=removed.reduce((sum,n)=>sum-(roster.find(p=>p.name===n)?.impact||0),0);
 if(incoming)formula+=incoming.impact-(incoming.pos==='QB'?Math.max(...roster.filter(p=>p.pos==='QB').map(p=>p.impact)):0);
 assert(Math.abs(Number(m[1])-formula)<.06,'actual rendering agrees to its one-decimal precision');
 assert.equal(JSON.stringify(api.currentRatings()),canonical,'Lab does not mutate canonical current ratings');
 const before=api.projected(team,api.currentRatings()),after=api.projected(team,api.currentRatings(),formula);
 return {team,add,removed,delta:formula,renderedDelta:m[1],forceDelta:api.score(api.currentRatings()[team]+formula)-api.score(api.currentRatings()[team]),expectedWinsDelta:after.ew-before.ew,uiReachable:!add||players.filter(p=>p.team!==team).sort((a,b)=>b.impact-a.impact).slice(0,100).some(p=>p.name===add)};
}
const current=[scenario('MIA',null,['Tua Tagovailoa']),scenario('BAL','Kirk Cousins'),scenario('MIA','Lamar Jackson'),scenario('MIA','Lamar Jackson',['Tua Tagovailoa']),scenario('MIA',null,['O.Gordon']),scenario('MIA',null,['M.Washington']),scenario('ARI','D.Waller'),scenario('MIA',players.filter(p=>p.pos==='RB'&&p.team!=='MIA').sort((a,b)=>b.impact-a.impact)[0].name)];
// Policy parameters below are SYNTHETIC, not validated usage/depth estimates.
const weights={role:{QB:[1],RB:[.5,.5],WR:[1/3,1/3,1/3]},usage:{QB:[1],RB:[.65,.25,.10],WR:[.5,.3,.2]}};
// Optional occupied slots, empty replacement benchmark 0; negative values may be unused.
function value(room,w,replacement=0){const sorted=room.map(p=>p.impact).sort((a,b)=>b-a);return w.reduce((v,share,i)=>v+share*Math.max(replacement,sorted[i]??replacement),0);}
function delta(room,adds,removed,pos,kind,replacement=0){
 const before=room.filter(p=>p.pos===pos),after=before.filter(p=>!removed.includes(p.name));
 const ids=new Set(after.map(p=>p.name));for(const p of adds.filter(p=>p.pos===pos)){assert(!ids.has(p.name),'duplicate identity rejected');ids.add(p.name);after.push(p);}
 return value(after,weights[kind][pos],replacement)-value(before,weights[kind][pos],replacement);
}
const synthetic=[];let checks=0;
for(const pos of ['QB','RB','WR']){
 const mk=(name,impact)=>({name,impact,pos}),elite=[mk('E1',50),mk('E2',35),mk('E3',20)],weak=[mk('W1',8),mk('W2',3),mk('W3',-5)];
 for(const kind of ['role','usage'])for(const [name,room,adds,remove] of [
 ['elite-to-elite',elite,[mk('A',45)],[]],['elite-to-weak',weak,[mk('A',45)],[]],['weaker-behind-elite',elite,[mk('A',5)],[]],['replace-upgrade',elite,[mk('A',60)],['E1']],['replace-downgrade',elite,[mk('A',5)],['E1']],['multiple-additions',weak,[mk('A',45),mk('B',40),mk('C',30),mk('D',10)],[]],['remove-then-add',elite,[mk('A',45)],['E1']],['remove-negative',weak,[],['W3']]]){
  const d=delta(room,adds,remove,pos,kind);synthetic.push({pos,kind,case:name,delta:d});
  const after=room.filter(p=>!remove.includes(p.name)).concat(adds);
  assert(Math.abs(d+delta(after,room.filter(p=>remove.includes(p.name)),adds.map(p=>p.name),pos,kind))<1e-10,'round-trip');checks++;
  if(name==='weaker-behind-elite')assert.equal(d,0);
 }
 for(const kind of ['role','usage']){
  const successive=[45,40,30,10].map((v,i)=>mk(`A${i}`,v));let room=[...weak],margins=[];
  for(const p of successive){margins.push(delta(room,[p],[],pos,kind));room.push(p);}
  assert(margins.every((v,i)=>i===0||v<=margins[i-1]+1e-10),'ordered additions have diminishing returns');
  synthetic.push({pos,kind,case:'successive-margins',margins});checks++;
  assert.throws(()=>delta(elite,[elite[0]],[],pos,kind));checks++;
 }
}
assert.equal(current[0].delta,8);assert.equal(current[1].delta,-39);assert.equal(current[3].delta-current[2].delta,8);
const source=fs.readFileSync('assets/app.js','utf8');assert(source.includes('delta -= p.impact;'));
const mutant=appHarness({now:Date.parse('2026-10-04T12:00:00Z'),hooks:'lab',sources:{'assets/app.js':source.replace('delta -= p.impact;','delta += p.impact;')}});
mutant.api.S.team='MIA';mutant.api.S.scenario={add:null,removed:new Set(['Tua Tagovailoa'])};
const mutantDelta=Number(mutant.api.lab().match(/Raw rating delta<\/span><strong>([^<]+)/)[1]);assert.equal(mutantDelta,-8,'source sign mutation changes real rendered evidence');
const duplicateGroups=[...new Set(players.filter((p,i)=>players.findIndex(x=>x.name===p.name)!==i).map(p=>p.name))].map(name=>({name,rows:players.filter(p=>p.name===name)}));
const aliasCase=scenario('DAL','J.Williams');assert.equal(aliasCase.delta,5.6);
const selectedOptions=players.filter(p=>p.team!=='DAL').sort((a,b)=>b.impact-a.impact).slice(0,100).filter(p=>p.name==='J.Williams');assert(selectedOptions.some(p=>p.team==='DET'&&p.pos==='WR'&&p.impact===5.9));
const resolved=players.find(p=>p.name==='J.Williams');assert.equal(resolved.team,'DAL');
const realCandidates=[];
for(const c of current.filter(c=>c.add||c.removed.length)){
 const room=players.filter(p=>p.team===c.team),adds=c.add?[players.find(p=>p.name===c.add)]:[],pos=adds[0]?.pos||room.find(p=>p.name===c.removed[0]).pos;
 for(const kind of ['role','usage'])realCandidates.push({...c,kind,candidateDelta:delta(room,adds,c.removed,pos,kind)});
}
// Falsifier: availability-weighted backup value can legitimately be positive.
const negativeReplacementSensitivity=[0,-20].map(replacement=>({replacement,delta:delta(players.filter(p=>p.team==='MIA'),[],['Tua Tagovailoa'],'QB','role',replacement)}));
api.S.team='MIA';api.S.scenario={add:null,removed:new Set()};assert.equal(scenario('MIA').delta,0,'public reset restores baseline');
const insurance={healthy:0,starterAbsenceProbability:.10,backupUpgrade:25,valueAtTenPercent:2.5};
const profiles=context.window.MATCHUP_DATA.profiles,unitKeys=Object.keys(context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL.WEIGHTS);
const profileRows=Object.keys(profiles).sort().map(team=>({team,currentElo:api.currentRatings()[team],coreElo:api.coreCurrentRatings()[team],...Object.fromEntries(unitKeys.map(k=>[k,profiles[team][k]??null]))}));
const bridgeSensitivity=unitKeys.map(key=>{const prior=Object.fromEntries(unitKeys.map(k=>[k,50])),live={...prior,[key]:60};return {key,...context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL.compute(D.meta.meanElo,live,prior,D.meta)};});
const output={base:'cf391daa2d43a44fe9d742ea0b96cc537d1a7136',supportedPositions:Object.fromEntries(['QB','RB','WR'].map(p=>[p,players.filter(x=>x.pos===p).length])),duplicateGroups,nameAliasCases:[{...aliasCase,offered:selectedOptions,resolved}],duplicateNames:players.filter((p,i)=>players.findIndex(x=>x.name===p.name)!==i).map(p=>p.name),current,synthetic,realCandidates,insurance,negativeReplacementSensitivity,profileRows,bridgeSensitivity,checks,sourceMutation:{signedRemovalDelta:mutantDelta},meta:D.meta};
fs.writeFileSync('research/cycle7/results/roster_and_bridge.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({positions:output.supportedPositions,current,candidates:realCandidates.map(x=>({team:x.team,add:x.add,removed:x.removed,kind:x.kind,delta:x.candidateDelta})),checks}));
