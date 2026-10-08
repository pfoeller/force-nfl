import {fail,SHA,HASH,isId,iso,json,hash} from './util.mjs';
import {declarationHash} from './risks.mjs';
export const emptyMembership=()=>({schema:1,integrations:[],triggers:[]});
export function integrationIdentity(e){return {id:e.id,previousMain:e.previousMain,main:e.main,classification:e.classification,riskManifest:e.riskManifest??null,riskDeclarationHash:e.riskDeclarationHash??null,tags:[...(e.tags??[])].sort()};}
export function triggerIdentity(t){return {id:t.id,category:t.category,sourceIntegration:t.sourceIntegration??null,time:t.time,rationale:t.rationale};}
export function captureMembership(state){return {schema:1,integrations:state.integrations.filter(e=>e.classification==='SUBSTANTIVE').map(integrationIdentity).sort((a,b)=>a.id.localeCompare(b.id)),triggers:state.triggers.filter(t=>t.active).map(triggerIdentity).sort((a,b)=>a.id.localeCompare(b.id))};}
export function validateMembership(m,options=null){
 fail(m?.schema===1&&Array.isArray(m.integrations)&&Array.isArray(m.triggers),'INVALID_PINNED_PLAN_MEMBERSHIP');const ids=new Set(),triggers=new Set();
 for(const e of m.integrations){fail(isId(e.id)&&!ids.has(e.id)&&SHA.test(e.previousMain)&&SHA.test(e.main)&&e.classification==='SUBSTANTIVE'&&Array.isArray(e.tags)&&e.tags.every(t=>typeof t==='string')&&new Set(e.tags).size===e.tags.length&&(e.riskDeclarationHash===null||HASH.test(e.riskDeclarationHash))&&(e.riskManifest===null||typeof e.riskManifest==='string'&&e.riskManifest.length>0)&&((e.riskManifest===null)===(e.riskDeclarationHash===null))&&json(e)===json(integrationIdentity(e)),'INVALID_PINNED_INTEGRATION_IDENTITY');ids.add(e.id);}
 for(const t of m.triggers){fail(isId(t.id)&&!triggers.has(t.id)&&typeof t.category==='string'&&t.category.length>0&&(t.sourceIntegration===null||isId(t.sourceIntegration))&&typeof t.rationale==='string'&&t.rationale.trim().length>0&&json(t)===json(triggerIdentity(t)),'INVALID_PINNED_TRIGGER_IDENTITY');iso(t.time);triggers.add(t.id);}
 if(options){fail(json([...ids].sort())===json((options.substantiveIntegrations??[]).map(e=>e.id).sort()),'PINNED_INTEGRATION_PLAN_LIST_MISMATCH');fail(!m.triggers.length||options.mandatoryTrigger===true,'PINNED_TRIGGERS_REQUIRE_MANDATORY_TREATMENT');for(const e of m.integrations)if(e.riskDeclarationHash!==null){const d=(options.riskDeclarations??[]).find(d=>d.integrationId===e.id);fail(d&&d.baseSha===e.previousMain&&d.resultSha===e.main&&declarationHash(d)===e.riskDeclarationHash,'PINNED_INTEGRATION_DECLARATION_MISMATCH');}}
 return m;
}
export const membershipHash=m=>hash(json(validateMembership(m)));
export function integrationInPlan(event,m){const pin=m.integrations.find(e=>e.id===event.id);if(!pin)return false;fail(json(pin)===json(integrationIdentity(event)),'PINNED_INTEGRATION_IDENTITY_MISMATCH: '+event.id);return true;}
export function triggerInPlan(trigger,m){const pin=m.triggers.find(t=>t.id===trigger.id);if(!pin)return false;fail(json(pin)===json(triggerIdentity(trigger)),'PINNED_TRIGGER_IDENTITY_MISMATCH: '+trigger.id);return true;}
