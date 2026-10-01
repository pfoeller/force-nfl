const {appVersion,diagnosticVersion}=require('./lib/current_version.cjs');
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..'); const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(app.includes("clone.querySelector('.qb-ranking-table')"),'QB export detection missing');
ok(app.includes('config.layoutWidth = Math.max(config.layoutWidth, 1600)'),'QB export width expansion missing');
ok(app.includes(`health?.app_version!=='${appVersion}'`),'current release bootstrap comparison missing');
ok(app.includes(diagnosticVersion),'current release diagnostic identity missing');
console.log('OK V146 QB export width');
