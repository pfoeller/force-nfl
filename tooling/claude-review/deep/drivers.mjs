import {CONFIG} from '../config.mjs';
// Exclusive original-source attribution is a descriptive partition, not dollar causality.
// Overlapping membership is retained separately; serialized maps/output/cache are not allocated.
export function costDrivers(files,{baseline=false,mandatoryTrigger=false}={}){
 const names=['BASELINE','CHANGED_CONTENT','OVERDUE_ROTATION','IMPLEMENTER_RISK','STATIC_RISK','DEPENDENCY_EXPANSION','OPTIONAL_ROTATION','MANDATORY_TRIGGER'],byDriver=Object.fromEntries(names.map(k=>[k,{exclusiveOriginalBytes:0,overlappingOriginalBytes:0,sourceInputProxyUsd:0,incrementalCeilingUsd:null}]));
 let selectedOriginalBytes=0,tier1OriginalBytes=0,rotationOriginalBytes=0;
 for(const f of files.filter(f=>f.directSelected)){const r=f.selectionReasons??[],has=p=>r.some(x=>x.includes(p));selectedOriginalBytes+=f.bytes;if(f.tier===1)tier1OriginalBytes+=f.bytes;if(has('ROTATION'))rotationOriginalBytes+=f.bytes;
 const membership=[];if(baseline||has('TIER_1_')||has('TRUTH_OWNER'))membership.push('BASELINE');if(has('CHANGED_')||has('NEW_ELIGIBLE')||has('PROMOTION'))membership.push('CHANGED_CONTENT');if(has('OVERDUE'))membership.push('OVERDUE_ROTATION');if(has('IMPLEMENTER_'))membership.push('IMPLEMENTER_RISK');if(has('LOCAL_'))membership.push('STATIC_RISK');if(has('DEPENDENCY_')||has('RISK_CONTEXT'))membership.push('DEPENDENCY_EXPANSION');if(has('ROTATION')&&!has('OVERDUE'))membership.push('OPTIONAL_ROTATION');
 const cause=baseline?'BASELINE':['CHANGED_CONTENT','BASELINE','STATIC_RISK','OVERDUE_ROTATION','IMPLEMENTER_RISK','DEPENDENCY_EXPANSION','OPTIONAL_ROTATION'].find(k=>membership.includes(k))??'BASELINE';byDriver[cause].exclusiveOriginalBytes+=f.bytes;for(const k of membership)byDriver[k].overlappingOriginalBytes+=f.bytes;
 }
 for(const d of Object.values(byDriver))d.sourceInputProxyUsd=d.exclusiveOriginalBytes*CONFIG.pricing.input/1e6;
 const primaryDriver=names.filter(k=>k!=='MANDATORY_TRIGGER').sort((a,b)=>byDriver[b].exclusiveOriginalBytes-byDriver[a].exclusiveOriginalBytes||names.indexOf(a)-names.indexOf(b))[0];
 return {primaryDriver,allMaterialDrivers:names.filter(k=>byDriver[k].overlappingOriginalBytes>0||k==='MANDATORY_TRIGGER'&&mandatoryTrigger),byDriver,mandatoryTrigger,selectedOriginalBytes,tier1OriginalBytes,rotationOriginalBytes,partitionMeaning:'Exclusive original-source bytes use changed → standing core/static risk → overdue → declared risk → dependency → optional rotation precedence. Overlapping membership is non-additive. Source input proxy is not an incremental all-in price; maps, framing, serialization, output and cache are unallocated. Mandatory trigger is governance, not inferred marginal bytes.'};
}
