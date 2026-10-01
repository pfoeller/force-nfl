const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const required=[
  'new XMLSerializer().serializeToString(node)',
  'function stripExportTeamLogos',
  'function exportSvgMarkup',
  'function loadExportSvg',
  "img.remove();",
  'FORCE PNG export retrying without image assets',
  'PNG export failed: ${detail}'
];
for(const token of required){if(!app.includes(token)) throw new Error('missing V15 export behavior: '+token);}
if(/const markup\s*=\s*clone\.outerHTML/.test(app)) throw new Error('export still serializes clone with outerHTML');
if(app.includes('Try serving FORCE locally instead of opening the file directly')) throw new Error('misleading local-server error remains');
console.log('v15 PNG export reliability checks: PASS');
