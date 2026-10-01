import assert from 'node:assert/strict';
import fs from 'node:fs';
import {appHarness} from './lib/force_app_harness.js';

// UX-16: FORCE is no longer a prototype. Public positioning must not label the
// product or its name as a prototype, while the FORCE brand itself stays intact.
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const visibleText=html=>html.replace(/<[^>]*>/g,' ');

const {api}=appHarness({hooks:'layout,names'});
const shell=api.layout('<p>content</p>','home');
const about=api.names();
for (const [label,html] of [['shell',shell],['About FORCE',about]]) {
  ok(!/prototype/i.test(visibleText(html)),`${label} must not show prototype positioning`);
  ok(!/class="working"/.test(html),`${label} must not render the prototype badge`);
}
ok(/<div class="brand"><img class="force-brand-logo force-brand-logo-topbar" src="assets\/force-approved-mark\.png"/.test(shell),'header keeps the FORCE brand mark');
ok(/<div class="footer">FORCE \| Ratings and forecasts refresh/.test(shell),'footer keeps FORCE identity and its explanation');
ok(about.includes('Football Objective Rating & Comparative Efficiency'),'About keeps the current expanded name (UX-31 is still open)');

for (const file of ['assets/styles.css','public/assets/styles.css']) {
  ok(!/\.working\{/.test(fs.readFileSync(file,'utf8')),`${file} has no orphaned prototype badge style`);
}
const source=fs.readFileSync('assets/app.js','utf8');
ok(source===fs.readFileSync('public/assets/app.js','utf8'),'public app mirror matches canonical source');

console.log(`OK: UX-16 public prototype positioning removed (${checks} checks).`);
