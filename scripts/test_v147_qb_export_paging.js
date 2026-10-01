const {appVersion,diagnosticVersion}=require('./lib/current_version.cjs');
const fs=require('fs'); const app=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(app.includes("Math.ceil(qbRows / 2)"),'balanced QB row group missing');
ok(app.includes("clone.querySelectorAll('.qb-builder, p.raw')"),'QB export detail stripping missing');
ok(app.includes(`health?.app_version!=='${appVersion}'`),'current release bootstrap comparison missing');
ok(app.includes(diagnosticVersion),'current release diagnostic identity missing');
console.log('OK V147 QB export paging');
