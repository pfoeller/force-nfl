const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
function must(re, msg){ if(!re.test(app)){ console.error('FAIL:', msg); process.exit(1); } }
must(/function exportSvgDataUrl\(svg\)/, 'data-URL SVG encoder exists');
must(/reader\.readAsDataURL\(blob\)/, 'SVG is converted to a data URL');
must(/img\.src = src/, 'export image loads from encoded data URL');
must(/renderExportPngBlob/, 'rasterization helper exists');
must(/stripExportTeamLogos\((?:pages\[i\]|page\.node)\)/, 'image-free retry exists');
must(/retrying without image assets/, 'retry path is explicit');
// The SVG rasterization path must no longer create a blob URL before drawImage.
const svgBlock = app.slice(app.indexOf('function exportSvgDataUrl'), app.indexOf('async function exportCurrentPagePng'));
if (/URL\.createObjectURL\(/.test(svgBlock)) { console.error('FAIL: SVG rasterization still uses blob URL'); process.exit(1); }
console.log('v17 PNG export data-URL + security retry: PASS');
