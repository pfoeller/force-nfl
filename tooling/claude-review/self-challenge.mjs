export const REVIEW_PRIORITIES=Object.freeze(['CRITICAL REVIEW','HIGH REVIEW','REVIEW','UNCERTAIN']);
export const SELF_CHALLENGE_FIELDS=Object.freeze(['highestRiskChange','highestBlastRadiusChange','lowestConfidenceAssumption','mostFragileValidation','validationNotPerformed','hiddenDependencyConsumer','parallelImplementation','plausibleButWrongOutput','reviewerAttackFirst']);
export const INDEPENDENT_CHALLENGE="Treat the implementer's declaration as useful evidence, not as the boundary of review. What material risk did the implementer fail to identify? Implementer self-assessment may only add review priority; unflagged areas are not established safe. Never suppress critical, changed, static-risk, required rotation, independently selected context or reviewer-triggered escalation.";
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=10000;
export function assessSelfChallenge(brief){
 if(!Object.hasOwn(brief,'implementationClassification')&&!Object.hasOwn(brief,'selfChallenge'))return null; // Unclassified legacy briefs retain exact packet behavior; no housekeeping inference.
 const classification=brief.implementationClassification??'SUBSTANTIVE';if(!['SUBSTANTIVE','HOUSEKEEPING'].includes(classification))throw Error('INVALID_IMPLEMENTATION_CLASSIFICATION');
 if(classification==='HOUSEKEEPING'&&!text(brief.classificationRationale))throw Error('EXPLICIT_HOUSEKEEPING_RATIONALE_REQUIRED');
 const block=brief.selfChallenge??{};if(typeof block!=='object'||Array.isArray(block))throw Error('INVALID_SELF_CHALLENGE');
 const reviewPriority=block.reviewPriority??(classification==='SUBSTANTIVE'?'UNCERTAIN':null);if(reviewPriority!==null&&!REVIEW_PRIORITIES.includes(reviewPriority))throw Error('INVALID_SELF_CHALLENGE_PRIORITY');
 const missingFields=classification==='SUBSTANTIVE'?SELF_CHALLENGE_FIELDS.filter(k=>!text(block[k])):[],declaration=Object.fromEntries(SELF_CHALLENGE_FIELDS.filter(k=>text(block[k])).map(k=>[k,block[k]]));
 return {classification,classificationRationale:classification==='HOUSEKEEPING'?brief.classificationRationale:null,required:classification==='SUBSTANTIVE',status:missingFields.length?'MISSING IMPLEMENTER SELF-CHALLENGE — uncertainty, not no risks':classification==='HOUSEKEEPING'?'EXPLICIT HOUSEKEEPING EXEMPTION — not a safety finding':'IMPLEMENTER SELF-CHALLENGE PROVIDED — not independent acceptance',missingFields,reviewPriority,elevatedAttention:missingFields.length>0||['CRITICAL REVIEW','HIGH REVIEW','UNCERTAIN'].includes(reviewPriority),declaration,additiveOnly:true,independentChallenge:INDEPENDENT_CHALLENGE};
}
