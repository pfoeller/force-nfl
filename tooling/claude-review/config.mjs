export const CONFIG=Object.freeze({
 model:'claude-opus-5-5', endpoint:'https://api.anthropic.com/v1/messages', apiVersion:'2023-06-01',
 handoff:'research/handoffs/CHATGPT_TO_CLAUDE_BANK.md', artifacts:'research/claude-api-reviews',
 remote:'pfoeller/force-nfl', maxPacketBytes:131072, maxFileBytes:65536, maxScanBytes:4194304,
 maxOutputTokens:8192, maxEstimatedUsd:1, timeoutMs:180000, maxResponseBytes:2097152,
 pricing:Object.freeze({input:4,output:20,cacheWrite5m:5,cacheWrite1h:8,cacheRead:.20}),
 pricingChecked:'2026-10-07',
 pricingSource:'https://platform.claude.com/docs/en/about-claude/pricing',
 modelSource:'https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5',
 cachingSource:'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'
});
