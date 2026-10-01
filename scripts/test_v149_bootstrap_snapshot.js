#!/usr/bin/env node
import fs from 'node:fs';

const worker = fs.readFileSync('src/index.js', 'utf8');
const app = fs.readFileSync('assets/app.js', 'utf8');
const css = fs.readFileSync('assets/styles.css', 'utf8');
const wrangler = fs.readFileSync('wrangler.jsonc', 'utf8');

const checks = [
  [worker.includes('refreshBootstrapSnapshot'), 'worker refreshBootstrapSnapshot'],
  [worker.includes('getBootstrapSnapshot'), 'worker getBootstrapSnapshot'],
  [worker.includes('this.ctx.storage.put'), 'persistent Durable Object storage'],
  [worker.includes('sleepAfter = "1m"'), 'container sleeps after one idle minute'],
  [worker.includes('async scheduled('), 'scheduled handler'],
  [wrangler.includes('"*/30 * * * *"'), '30-minute cron'],
  [app.includes('FORCE_BOOT_MIN_MS = 3000'), '3-second loader floor'],
  [app.includes("fetchBootstrapSnapshot('initial')"), 'snapshot-first bootstrap'],
  [app.includes("refreshPublishedSnapshot('snapshot-poll')"), 'public snapshot polling'],
  [app.includes("renderOnComplete:false"), 'fallback loader holds render'],
  [css.includes('forceBootProgress 3s'), '3-second progress animation'],
];

for (const [ok, label] of checks) {
  if (!ok) {
    console.error('FAIL:', label);
    process.exit(1);
  }
  console.log('PASS:', label);
}
console.log(`PASS: ${checks.length} bootstrap snapshot checks`);

