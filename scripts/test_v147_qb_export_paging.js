const fs=require('fs'); const app=fs.readFileSync('assets/app.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(app.includes("Math.ceil(qbRows / 2)"),'balanced QB row group missing');
ok(app.includes("clone.querySelectorAll('.qb-builder, p.raw')"),'QB export detail stripping missing');
ok(app.includes("health?.app_version!=='V147'"),'V147 bootstrap comparison missing');
ok(app.includes("V147-DIAG-1"),'V147 diagnostic identity missing');
console.log('OK V147 QB export paging');
