// MD-08 research helpers. Research only: nothing in production imports this package.
// Inputs are the frozen MD-07 Week-4 snapshot plus committed repository data/source.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {appHarness} from '../../../scripts/lib/force_app_harness.js';
import {quantile,rank,correlation,distribution,packing} from '../../cycle8/md07_unit_calibration/stats.mjs';

export {quantile,rank,correlation,distribution,packing};
export const DIR='research/cycle9/md08_unit_normalization';
export const BASE='65170f7dd9e17ac6ece1ab97790e944624d3f66f';
export const SNAPSHOT_BASE='fd585891214db483112f52d4746106c606afeb43';
export const SNAPSHOT='research/cycle8/md07_unit_calibration/inputs/current_snapshot.json';
export const MD07_RB_AUDIT='research/cycle8/md07_unit_calibration/results/rb_prior_call_audit.json';
export const REFERENCE='data/live-cache/c6cb7af1f41f107e7e3f.bin';
// LF-normalized SHA-256 pins. The snapshot and reference are frozen; the two data
// bundles and bridge must be unchanged since the snapshot base; live_profiles.js must
// be the owner-accepted post-MD-07 RB prior-frame source at BASE.
export const PINS={
  [SNAPSHOT]:'b84d5d17e49f5114053bcc2c69ca31024a0a088136b6047b75460fef34e8b247',
  [REFERENCE]:'ec8023a04119be8f71857c6b732dc1b0aa510ad50d200ce63e4d1fbc45395961',
  'data/matchup-data.js':'88b100a3e10158990398b46740c7d01e2048cf05d1601a03ae3c6b0f1613357d',
  'data/model-data.js':'fa852ce51b25bebd57fa49dca4e2d8e73575ced372e37ea5c6e30fb76217e8ac',
  'model/unit_force_bridge.js':'1882dd71c1efcd479b604e924e3ed547bb60af9c16122a3bc453b1a815a3ac51',
  'model/live_profiles.js':'9b2485b3ba89be8fbdbdbe421e2c8923f09479484dbc598667686206262c16de',
  'assets/app.js':'edf63f78105a6d539bda2c3605b02ef3df66283cbd6a9cc95ab14802b32e0ce0'
};
export const POST_FIX_ONLY_DRIFT='model/live_profiles.js';

export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export const lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
export const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
export const close=(a,b,label,tol=1e-10)=>{assert(finite(a)&&finite(b),label+' finite');assert(Math.abs(a-b)<=tol,`${label}: ${a} vs ${b}`);};

// Nine canonical bridge keys, read from the production module at analysis time and
// asserted equal to this research table (see check.mjs).
export const UNITS=[
  {key:'pointsScoredPerDriveIndex',label:'Scoring/drive',family:'current-rank',raw:'offensivePointsPerDrive',higher:true,publicRow:false,
    measurement:'Qualifying offensive points per drive (offensive TDs/FGs; return TDs and safeties excluded; kneel-only drives excluded)',
    adjustment:'None (no opponent, field-position or pace adjustment)',
    stabilization:'None inside the live grade; blended with prior by drive games',
    liveMap:'percentileMap: 100*midrank/(n-1) among current teams',
    prior:'Regressed bundled 2025 offenseIndex (legacy team-EPA grade; construct differs from points/drive)'},
  {key:'qbIndex',label:'QB play',family:'multicomponent',raw:'qbEpaPerPlay',higher:true,publicRow:true,
    measurement:'Five components: 30% all-play EPA/play, 30% ANY/A, 20% actual-pass success, 10% additional QB rushing value, 10% CPOE',
    adjustment:'V139 leave-one-matchup-out opponent adjustment 4*(50-allowed)/50; V137 pressure-context adjustment; V148 recency +/-4 after prior blend',
    stabilization:'EPA 150 plays, success 100 attempts, CPOE 60 attempts toward current league means',
    liveMap:'EPA and success: 2025 full-season (17-game, n=32) continuous CDF; ANY/A: current rank; CPOE: 50+50*tanh(dev/7.5); rushing: 50+50*bonus/12 (floor 50); weighted, then 50+1.20*(x-50) clamped',
    prior:'Regressed bundled 2025 qbIndex'},
  {key:'receiverIndex',label:'Receivers',family:'historical-cdf',raw:'receiverCalibratedResidual',higher:true,publicRow:true,
    measurement:'WR/TE receiving EPA/target',
    adjustment:'Partial QB-environment subtraction: residual = EPA - beta*(QB pass EPA - centre), ridge-fitted beta on 2025 bundled teams',
    stabilization:'80 targets toward current league residual mean, then aligned so current centre maps to the 2025 median',
    liveMap:'continuousPercentileValue against 32 bundled 2025 team residuals',
    prior:'2025 residual percentile, regressed'},
  {key:'olIndex',label:'Offensive line',family:'historical-window-cdf',raw:'pbpPressureAllowedRate',higher:false,publicRow:true,
    measurement:'De-duplicated PBP hit-or-sack disruptions allowed per dropback (pass protection only)',
    adjustment:'None (no opponent or run-blocking input)',
    stabilization:'None; same-sized 2025 rolling windows absorb sample-size variance',
    liveMap:'continuousPercentileValue (lower better) against 2025 rolling windows of the same game count (n=448 for 4 games)',
    prior:'Regressed bundled 2025 olIndex'},
  {key:'rbIndex',label:'RB',family:'historical-cdf',raw:'rbCalibratedComposite',higher:true,publicRow:true,
    measurement:'RB/FB room: 70% rushing EPA/carry + 30% partially QB-residualized receiving EPA/target',
    adjustment:'Receiving part only: ridge-fitted partial QB-environment subtraction; no run-block adjustment',
    stabilization:'50 carries and 40 targets toward current league means, then aligned to the 2025 median',
    liveMap:'continuousPercentileValue against 32 bundled 2025 room composites (LIVE_FITTED frame)',
    prior:'2025 room-composite percentile in the same LIVE_FITTED frame (MD-07 correction), regressed'},
  {key:'coverageIndex',label:'Coverage',family:'current-rank-composite',raw:'oppPassEpa',higher:false,publicRow:true,
    measurement:'75% sack-free pass-attempt EPA allowed + 25% CPOE allowed',
    adjustment:'None (no opponent-QB or pass-rush adjustment)',
    stabilization:'None inside the live grade',
    liveMap:'0.75*inverse current rank of EPA allowed + 0.25*inverse current rank of CPOE allowed',
    prior:'Regressed bundled 2025 coverageIndex'},
  {key:'passRushIndex',label:'Pass rush',family:'mixed-provider',raw:'frontPressureRate',higher:true,publicRow:true,
    measurement:'Provider dependent: weekly nflverse hit+sack disruption per opponent dropback (28 teams); PFR charted pressure composite (4 teams)',
    adjustment:'None',
    stabilization:'None inside the live grade',
    liveMap:'Weekly: current rank of disruption among all 32; PFR: continuous CDF against same-sized 2025 charted windows',
    prior:'2025 PFR composite percentile when available, else 2025 dl.pressure_rate percentile, regressed'},
  {key:'runDefenseIndex',label:'Run defense',family:'current-rank',raw:'oppRushEpa',higher:false,publicRow:true,
    measurement:'Opponent rushing EPA per carry allowed (includes QB runs)',
    adjustment:'None',
    stabilization:'None inside the live grade',
    liveMap:'percentileMap inverse current rank',
    prior:'Regressed percentile of bundled 2025 dl.run_stop_rate (different construct)'},
  {key:'pointsAllowedPerDriveIndex',label:'Pts/drive prevention',family:'current-rank',raw:'defensivePointsPerDrive',higher:false,publicRow:true,
    measurement:'Opponent qualifying offensive points per drive',
    adjustment:'None',
    stabilization:'Fixed neutral one-game prior (k=1)',
    liveMap:'percentileMap inverse current rank',
    prior:'Neutral 50 (no 2025 drive prior)'}
];
export const BRIDGE_KEYS=UNITS.map(u=>u.key);
export const DISPLAY_ONLY=[
  {key:'offenseComposite',label:'Overall offense',config:'offense',weights:'20% scoring/drive + 30% QB + 15% WR + 15% OL + 20% RB',map:'soft-tail tanh softness 35'},
  {key:'defenseIndex',label:'Overall defense',config:'defense',weights:'36% coverage + 16% pass rush + 28% run defense + 20% prevention/drive',map:'soft-tail tanh softness 42'},
  {key:'offenseIndex',label:'Team efficiency (diagnostic)',config:null,weights:'team offensive EPA/play current rank',map:'current rank blended with legacy prior'}
];

// Exact production blend inputs per key (verified against every frozen display value).
export function blendInputs(z,key){
  const m=z.metadata,r=z.raw;
  if(key==='qbIndex')return {g:m.playerStatGames,k:m.qbPriorGames};
  if(key==='receiverIndex'||key==='rbIndex')return {g:m.playerStatGames,k:m.priorGames};
  if(key==='passRushIndex')return {g:m.passRushGames,k:m.priorGames};
  if(key==='pointsScoredPerDriveIndex')return {g:r.offensiveDriveGames,k:m.priorGames};
  if(key==='pointsAllowedPerDriveIndex')return {g:r.defensiveDriveGames,k:1};
  return {g:m.statGames,k:m.priorGames};
}

export function load(){
  for(const [p,pin] of Object.entries(PINS))assert.equal(hash(lf(p)),pin,p+' pin');
  const x=JSON.parse(lf(SNAPSHOT));
  assert.equal(x.base,SNAPSHOT_BASE);assert.equal(Object.keys(x.teams).length,32);
  // Every snapshot source except live_profiles.js is byte-identical (LF) at BASE.
  for(const [p,h] of Object.entries(x.sourceHashes)){
    if(p===POST_FIX_ONLY_DRIFT)assert.notEqual(hash(lf(p)),h,'live_profiles must carry the post-MD-07 RB frame');
    else assert.equal(hash(lf(p)),h,p+' unchanged since snapshot base');
  }
  const src=lf('model/live_profiles.js');
  assert(src.includes('const v115RbPriorComposite=(p)=>priorRbOrthogonalComposite(p,rbRecvPassBeta,orthogonalQbCenter);'));
  const {api,L,context}=appHarness({hooks:'M,D'});
  const U=context.window.FORCE_UNIT_FORCE_BRIDGE_MODEL;
  const reference=JSON.parse(lf(REFERENCE));
  assert(L.qbReferenceValid(reference),'V149 QB/OL historical reference valid');
  return {x,api,L,U,M:api.M,D:api.D,reference};
}

// Inverse of production continuousPercentileValue on the same sorted reference.
// Tied reference values make the production map jump: x equal to a tied value maps to
// the first tied position, and the open interval up to the last tied position is never
// produced. A target inside such a jump is reported as tieJump with that tied value.
export function inverseCdf(values,pct,higher=true){
  const arr=values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b),n=arr.length,pos=i=>100*(i+.5)/n;
  const p=higher?pct:100-pct;
  if(p<=pos(0))return {value:arr[0],bound:'floor',attainable:Math.abs(p-pos(0))<1e-12};
  if(p>=pos(n-1))return {value:arr[n-1],bound:'ceiling',attainable:Math.abs(p-pos(n-1))<1e-12};
  const knots=[];for(let i=0;i<n;i++){if(i&&arr[i]===arr[i-1])knots.at(-1).last=i;else knots.push({v:arr[i],first:i,last:i});}
  for(let j=0;j<knots.length;j++){const k=knots[j];
    if(p>=pos(k.first)&&p<=pos(k.last))return {value:k.v,bound:p===pos(k.first)?null:'tieJump',attainable:p===pos(k.first)};
    const nx=knots[j+1];
    if(nx&&p>pos(k.last)&&p<pos(nx.first)){const f=(p-pos(k.last))/(pos(nx.first)-pos(k.last));return {value:k.v+f*(nx.v-k.v),bound:null,attainable:true};}
  }
  throw new Error('inverseCdf failed');
}

// Acklam rational approximation to the inverse standard normal CDF (|rel err| < 1.2e-9).
export function normInv(p){
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
  const pl=.02425;
  if(p<pl){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){const q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  const q=p-.5,r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

export const THRESHOLDS=[50,60,70,80,90];
export function fullStats(values,{floor=null,ceiling=null}={}){
  const a=values.filter(finite).sort((x,y)=>x-y),n=a.length,m=a.reduce((s,v)=>s+v,0)/n;
  const q=p=>quantile(a,p),tie=(f)=>{const c={};for(const v of a){const k=f(v);c[k]=(c[k]||0)+1;}const top=Math.max(...Object.values(c));return {distinct:Object.keys(c).length,largestTieGroup:top,valuesInTies:Object.values(c).filter(x=>x>1).reduce((s,x)=>s+x,0)};};
  return {n,mean:m,median:q(.5),sd:Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/n),min:a[0],max:a[n-1],
    p05:q(.05),p10:q(.1),p25:q(.25),p50:q(.5),p75:q(.75),p90:q(.9),p95:q(.95),
    atOrAbove:Object.fromEntries([60,70,80,90].map(t=>[t,a.filter(v=>v>=t).length])),
    below:Object.fromEntries([40,30].map(t=>[t,a.filter(v=>v<t).length])),
    floorCeiling:{theoreticalFloor:floor,theoreticalCeiling:ceiling,atFloor:floor==null?null:a.filter(v=>Math.abs(v-floor)<1e-9).length,atCeiling:ceiling==null?null:a.filter(v=>Math.abs(v-ceiling)<1e-9).length,within2Of0:a.filter(v=>v<=2).length,within2Of100:a.filter(v=>v>=98).length},
    ties:{exact:tie(v=>v),oneDecimal:tie(v=>v.toFixed(1)),integer:tie(v=>v.toFixed(0))}};
}
export const empiricalPercentile=(values,x)=>{const a=values.filter(finite);return 100*(a.filter(v=>v<x).length+.5*a.filter(v=>v===x).length)/a.length;};
export const json=v=>JSON.stringify(v,(k,val)=>typeof val==='number'&&!Number.isFinite(val)?(()=>{throw new Error('non-finite '+k);})():val,2)+'\n';
