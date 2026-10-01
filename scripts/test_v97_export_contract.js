const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(app.includes('.penalty-sort-toolbar'),'rankings export strips penalty sort toolbar');
ok(app.includes('page.forcePage ? Math.max(config.minHeight,needed)'),'forced 16-row export pages are not max-height clipped');
ok(app.includes('data-export-row-group="16"'),'rankings remain 16 rows per page');
console.log('PASS: V97 two-page 16-team rankings export contract');
