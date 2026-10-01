const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m);};
for (const asset of [
  'assets/force-approved-mark.png',
  'assets/force-approved-logo.png',
  'assets/force-approved-board.png',
  'assets/force-approved-export-logo.png',
  'assets/force-approved-favicon.png',
]) {
  ok(fs.existsSync(path.join(root, asset)), `${asset} should exist`);
}
ok(app.includes('src="assets/force-approved-mark.png"'), 'topbar should use approved PNG mark');
ok(app.includes('src="assets/force-approved-board.png"'), 'About FORCE should use approved PNG board');
ok(app.includes('src="assets/force-approved-export-logo.png"'), 'export logo should use approved PNG asset');
ok(!app.includes('forceExportTeal') && !app.includes('forceExportShine'), 'export logo should no longer reconstruct logo as inline SVG');
ok(app.includes('inlineExportBrandImages'), 'PNG export path must still inline brand images for serialization');
ok(index.includes('assets/force-approved-favicon.png'), 'favicon should use approved PNG mark');
ok(css.includes('V52 approved PNG brand assets'), 'V52 brand sizing overrides missing');
console.log(`OK: ${n} V52 approved-PNG brand assertions`);
