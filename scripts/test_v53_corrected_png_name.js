const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
let n=0; const ok=(x,m)=>{n++;if(!x)throw new Error(m)};
ok(app.includes('Football Objective Rating & Comparative Efficiency'),'canonical app name must remain Comparative Efficiency');
ok(app.includes('assets/force-approved-board.png'),'About must use corrected approved board PNG');
ok(app.includes('assets/force-approved-export-logo.png'),'exports must use corrected approved export PNG');
for(const f of ['force-approved-logo.png','force-approved-board.png','force-approved-export-logo.png']){
  const p=path.join(root,'assets',f); ok(fs.existsSync(p)&&fs.statSync(p).size>100000,`${f} missing/too small`);
}
console.log(`OK: ${n} V53 corrected-PNG assertions`);
