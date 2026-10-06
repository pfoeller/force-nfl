// MD-08 historical-standing display prototypes. Research only: nothing in production
// imports this file. Every function maps a current value onto 0-100 using a
// historical reference population of the SAME oriented quantity (higher = better).
// None of these is authorized for production.

const sortAsc=a=>a.map(Number).filter(Number.isFinite).sort((p,q)=>p-q);

// Distinct-value knots of a sorted reference, each with its tied block [first,last] (0-based).
function knots(a){const out=[];for(let i=0;i<a.length;i++){if(i&&a[i]===a[i-1])out.at(-1).last=i;else out.push({v:a[i],first:i,last:i});}return out;}
function interp(ks,x,pos){ // piecewise-linear through (k.v, pos(k)) in x
  for(let j=0;j<ks.length;j++){if(x===ks[j].v)return pos(ks[j]);if(j+1<ks.length&&x>ks[j].v&&x<ks[j+1].v){const f=(x-ks[j].v)/(ks[j+1].v-ks[j].v);return pos(ks[j])+f*(pos(ks[j+1])-pos(ks[j]));}}
  throw new Error('interp outside range');}

// Empirical standing used for reporting: 100 * (#strictly worse + 0.5 * #equal) / n.
export function standing(ref,x){const a=sortAsc(ref);return 100*(a.filter(v=>v<x).length+.5*a.filter(v=>v===x).length)/a.length;}

// Candidate A - empirical percentile with exact historical endpoints.
// Knot position of a tied block: 'mid' = (first+last)/2 (default), 'min' = first, 'max' = last;
// the worst distinct value is forced to position 0 and the best to n-1.
// Display at a knot = 100*position/(n-1); linear in x between adjacent distinct values.
// x < worst -> 0 and x > best -> 100 (flagged belowWorst / aboveBest by edge()).
export function candidateA(ref,x,{tie='mid'}={}){
  const a=sortAsc(ref),n=a.length;if(n<2)throw new Error('reference too small');
  if(x<=a[0])return 0;if(x>=a[n-1])return 100;
  const ks=knots(a),last=ks.length-1;
  const pos=k=>k===ks[0]?0:k===ks[last]?n-1:(tie==='min'?k.first:tie==='max'?k.last:(k.first+k.last)/2);
  return 100*interp(ks,x,pos)/(n-1);
}

// Candidate B - smoothed empirical percentile: Gaussian-kernel CDF G with Silverman bandwidth
// h = 0.9*min(sd, IQR/1.34)*n^(-1/5), rescaled so the worst historical value maps to 0 and the
// best to 100: 100*(G(x)-G(min))/(G(max)-G(min)). Strictly increasing inside the range;
// outside it is 0 / 100 exactly as Candidate A (flagged).
const erf=x=>{const s=Math.sign(x);x=Math.abs(x);const t=1/(1+.3275911*x);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));};
export const Phi=z=>.5*(1+erf(z/Math.SQRT2));
export function bandwidth(ref){const a=sortAsc(ref),n=a.length,m=a.reduce((s,v)=>s+v,0)/n,sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(n-1));
  const q=p=>{const i=(n-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};const iqr=q(.75)-q(.25);
  return .9*Math.min(sd,iqr>0?iqr/1.34:sd)*n**-.2;}
export function candidateB(ref,x){
  const a=sortAsc(ref),n=a.length,h=bandwidth(a);if(!(h>0))return candidateA(a,x);
  if(x<=a[0])return 0;if(x>=a[n-1])return 100;
  const G=y=>a.reduce((s,v)=>s+Phi((y-v)/h),0)/n;
  return 100*(G(x)-G(a[0]))/(G(a[n-1])-G(a[0]));
}

// Candidate C - historical quantile mapping with open tails. Interior: Hazen plotting
// positions 100*(midrank+0.5)/n, linear between distinct values, so the best historical
// observation maps to 100*(1-0.5/n), not 100. Beyond the historical range the remaining
// headroom is filled by a normal tail fitted to the reference (mean, SD):
// x > best: P(best) + (100-P(best))*(Phi(z(x))-Phi(z(best)))/(1-Phi(z(best))), approaching but
// never reaching 100; mirrored below the worst. 0 and 100 are asymptotes, not historical extremes.
export function candidateC(ref,x){
  const a=sortAsc(ref),n=a.length,ks=knots(a),pos=k=>100*((k.first+k.last)/2+.5)/n;
  const m=a.reduce((s,v)=>s+v,0)/n,sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(n-1)),z=v=>(v-m)/sd;
  const lo=pos(ks[0]),hi=pos(ks.at(-1));
  if(x>a[n-1]){const p0=Phi(z(a[n-1]));return p0>=1?hi:hi+(100-hi)*(Phi(z(x))-p0)/(1-p0);}
  if(x<a[0]){const p0=Phi(z(a[0]));return p0<=0?lo:lo*(Phi(z(x))/p0);}
  if(x===a[0])return lo;if(x===a[n-1])return hi;
  return interp(ks,x,pos);
}

// Dynamic record semantics: the reference is extended with the current season's observations
// at the same stage before mapping, so a new record becomes the new 100 (Candidate A or B).
export const dynamicReference=(ref,current)=>[...ref,...current];

// Raw min/max interpolation: NOT a candidate. Kept only so the checker can prove the
// candidates are not this.
export function rawMinMax(ref,x){const a=sortAsc(ref);return Math.max(0,Math.min(100,100*(x-a[0])/(a.at(-1)-a[0])));}

export function edge(ref,x){const a=sortAsc(ref);return {belowWorst:x<a[0],atWorst:x===a[0],atBest:x===a.at(-1),aboveBest:x>a.at(-1)};}
export const CANDIDATES={A:candidateA,B:candidateB,C:candidateC};
