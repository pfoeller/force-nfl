// MD-08 follow-up research helpers (OL drift, receiver stabilization). Research only:
// nothing in production imports this package. Inputs are files already committed at
// main 6cf05419; no network, provider fetch or private payload is used.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {quantile,rank,correlation} from '../../cycle8/md07_unit_calibration/stats.mjs';
import {fullStats,blendInputs} from '../md08_unit_normalization/lib.mjs';

export {quantile,rank,correlation,fullStats,blendInputs};
export const DIR='research/cycle9/md08_followup_ol_receivers';
export const FROZEN_DIR='research/cycle9/md08_unit_normalization';
export const BASE='6cf05419f89df7c9c8c3af228a3fb80080c6f686';
export const FROZEN_RESEARCH='aa0ad397a08cf2ff6f69e73c979e22667667a716';
export const SNAPSHOT='research/cycle8/md07_unit_calibration/inputs/current_snapshot.json';
export const REFERENCE='data/live-cache/c6cb7af1f41f107e7e3f.bin';
export const CACHE={
  teamStats2026:'data/live-cache/ac994a29342b05dc3e69.bin',
  playerStats2026:'data/live-cache/6c5538f80f72ee7f5aa4.bin',
  pfrPass2026:'data/live-cache/62cf9e3ac57b4b573023.bin',
  pfrPass2025:'data/live-cache/3362f7b501485ee0411e.bin'
};
// Model inputs the frozen MD-08 package pinned. They must be byte-identical (LF) here,
// so the frozen Week-4 baseline still describes the model at BASE. assets/app.js is
// pinned separately: it changed only by the owner-accepted identity presentation seam.
export const FROZEN_MODEL_PINS={
  [SNAPSHOT]:'b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247',
  [REFERENCE]:'ec8023a04119be8f71857c6b732dc1b0aa510ad50d200ce63e4d1fbc45395961',
  'data/matchup-data.js':'88b100a3e10158990398b46740c7d01e2048cf05d1601a03ae3c6b0f1613357d',
  'data/model-data.js':'fa852ce51b25bebd57fa49dca4e2d8e73575ced372e37ea5c6e30fb76217e8ac',
  'model/unit_force_bridge.js':'1882dd71c1efcd479b604e924e3ed547bb60af9c16122a3bc453b1a815a3ac51',
  'model/live_profiles.js':'9b2485b3ba89be8fbdbdbe421e2c8923f09479484dbc598667686206262c16de'
};
export const PINS={
  ...FROZEN_MODEL_PINS,
  'assets/app.js':'8724f2001ae8ab0edb9e367a28348cb85df373304098e15586bf0959acfeef6a',
  [CACHE.teamStats2026]:'a0a869cf320a7e2efceba27bda7094345a5cc19107cb535e9c303e6fb73d0586',
  [CACHE.playerStats2026]:'ff5a780f59bbdccbf2bb88e02aa64fa736b09d31757e528cdebc8caaa2facd34',
  [CACHE.pfrPass2026]:'cb61d6c725fd270edca77d63d244b4746181033622d05fbaeb7a1277c98d810f',
  [CACHE.pfrPass2025]:'79cd92f9a3b46a3fcc50904b3199b39303f7cab8b484040a1cb2b2c3bf51bd40',
  'research/cycle8/md07_unit_calibration/stats.mjs':'45feebea12b9f9396419725b9cefd0ce0611e45e2a7aa10cf7098ebebb8a6058',
  [FROZEN_DIR+'/lib.mjs']:'f89b946151b303c78c50323f9c5bef21194a5687b401fe6794f4ee0671a94649',
  [FROZEN_DIR+'/hashes.json']:'c0af5a7b49d0bc9e7764d1c21b6fd7af8ee263104331e7ce4bb96d0917d2d762'
};

export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export const lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
export const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const close=(a,b,label,tol=1e-10)=>{assert(finite(a)&&finite(b),label+' finite');assert(Math.abs(a-b)<=tol,`${label}: ${a} vs ${b}`);};
export const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
export const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)));};
export const median=a=>quantile(a,.5);
export const r6=v=>Math.round(v*1e6)/1e6;
export const json=v=>JSON.stringify(v,(k,val)=>typeof val==='number'&&!Number.isFinite(val)?(()=>{throw new Error('non-finite '+k);})():val,2)+'\n';

// Deterministic PRNG (mulberry32) and Box-Muller normals for the synthetic probes.
export function rng(seed){let a=seed>>>0;const u=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  let spare=null;const normal=()=>{if(spare!==null){const s=spare;spare=null;return s;}let x,y,q;do{x=2*u()-1;y=2*u()-1;q=x*x+y*y;}while(q===0||q>=1);const m=Math.sqrt(-2*Math.log(q)/q);spare=y*m;return x*m;};
  const binomial=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(u()<p)k++;return k;};
  return {u,normal,binomial};}

// RFC 4180 CSV (quoted fields may contain commas and doubled quotes).
function splitCsvLine(l){const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];
  if(q){if(ch==='"'&&l[i+1]==='"'){cur+='"';i++;}else if(ch==='"')q=false;else cur+=ch;}
  else if(ch==='"')q=true;else if(ch===','){out.push(cur);cur='';}else cur+=ch;}
  out.push(cur);return out;}
export function csv(path){const lines=lf(path).trimEnd().split('\n'),head=splitCsvLine(lines[0]);
  return lines.slice(1).map(l=>{const c=splitCsvLine(l);assert.equal(c.length,head.length,path+' column count');return Object.fromEntries(head.map((h,i)=>[h,c[i]]));});}
export const canon=t=>t==='LA'?'LAR':t;

export function load({pins=PINS}={}){
  for(const [p,pin] of Object.entries(pins))assert.equal(hash(lf(p)),pin,p+' pin');
  // The frozen research package must be untouched: every file still matches its own checksum list.
  const frozen=JSON.parse(lf(FROZEN_DIR+'/hashes.json'));
  for(const [f,h] of Object.entries(frozen))assert.equal(hash(lf(FROZEN_DIR+'/'+f)),h,'frozen '+f);
  const x=JSON.parse(lf(SNAPSHOT));assert.equal(Object.keys(x.teams).length,32);
  const {api,L,context}=appHarness({hooks:'M,D'});
  const U=context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
  const reference=JSON.parse(lf(REFERENCE));
  assert(L.qbReferenceValid(reference),'V149 reference valid');
  return {x,api,L,U,M:api.M,D:api.D,reference};
}

// 2025 reference windows are written team-major, each team's windows in chronological
// order (force_server.py _v104_reference_from_drive_games: games sorted by (week,
// game_id), teams appended home-then-away on first appearance). Every team has 17 games.
export const GAMES=17;
export const windowAt=(reference,metric,len,team,start)=>reference.sample_windows[String(len)][metric][team*(GAMES-len+1)+start];
// Team identity of each team-major slot: Week-1 2025 games sorted by game_id, home then away.
export function referenceTeamOrder(pfr2025){
  const ids=[...new Set(pfr2025.filter(r=>r.week==='1'&&r.game_type==='REG').map(r=>r.game_id))].sort();
  return ids.flatMap(id=>{const [,,away,home]=id.split('_');return [canon(home),canon(away)];});
}
