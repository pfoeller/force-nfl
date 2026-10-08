import {CONFIG,MODEL_CONTEXTS} from './config.mjs';
// Same one-UTF8-byte/token proxy as costing, plus the two existing 4096 framing buffers.
export function contextAdmission(contentBytes,maxTokens,systemBytes,config=CONFIG){
 const c=config.modelContext,known=MODEL_CONTEXTS[config.model];if(!known||!c||c.model!==config.model||c.contextTokens!==known.contextTokens||c.framingReserveTokens!==known.framingReserveTokens||!Number.isSafeInteger(c.contextTokens)||c.contextTokens<=0||!Number.isSafeInteger(c.framingReserveTokens)||c.framingReserveTokens<0||!c.source||!c.verified)throw Error('MODEL_CONTEXT_LIMIT_UNVERIFIED');
 for(const n of [contentBytes,maxTokens,systemBytes])if(!Number.isSafeInteger(n)||n<0)throw Error('INVALID_CONTEXT_ESTIMATE');
 const conservativeInputTokens=contentBytes+systemBytes+c.framingReserveTokens,totalTokens=conservativeInputTokens+maxTokens;if(!Number.isSafeInteger(totalTokens)||totalTokens>c.contextTokens)throw Error('MODEL_CONTEXT_WINDOW_EXCEEDED');
 return {model:config.model,contextTokens:c.contextTokens,conservativeInputTokens,maxTokens,framingReserveTokens:c.framingReserveTokens,totalTokens,remainingTokens:c.contextTokens-totalTokens,source:c.source,verified:c.verified,estimator:'One UTF8 byte per token; includes full system/suffix and 8192 framing tokens. Admission is separate from price and byte-size limits.'};
}
