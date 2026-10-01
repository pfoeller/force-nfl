const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
function must(re, msg) { if (!re.test(app)) throw new Error(msg); }
must(/minHeight:\s*675[\s\S]*maxHeight:\s*980/, 'desktop adaptive export height band missing');
must(/function stampExportHeight\(/, 'detached fragment height stamping missing');
must(/chunkLimit[\s\S]*maxHeight \* 0\.48/, 'duel-card chunking for dense packing missing');
must(/last\.used < usable \* 0\.42/, 'trailing-page rebalance missing');
must(/\.footer, \.matchup-warning, \.matchup-back, \.qb-quick/, 'low-value export cleanup missing');
must(/renderExportPngBlob\(page\.node, cssText, page\.width \|\| config\.layoutWidth, page\.height/, 'variable page-width\/height rendering missing');
if (/config\.targetHeight/.test(app)) throw new Error('legacy fixed targetHeight export path still present');
console.log('V21 export packing checks: PASS');
