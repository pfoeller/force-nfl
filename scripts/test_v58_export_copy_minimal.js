const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
let n = 0;
const ok = (x, m) => { n++; if (!x) throw new Error(m); };

ok(app.includes('function prepareCloneForSocialExport(clone)'), 'export-only copy minimizer missing');
ok(app.includes("clone.querySelectorAll('.sub, small').forEach((el) => el.remove());"), 'row-level helper/explanation text must be stripped from PNG exports');
ok(app.includes("'.matchup-footnote'"), 'matchup explanatory footnotes must be stripped from PNG exports');
ok(app.includes("'.forecast-audit-strip'"), 'forecast audit explanation strip must be stripped from PNG exports');
ok(app.includes("'.market-detail'"), 'market explanation detail must be stripped from PNG exports');
ok(app.includes('prepareCloneForSocialExport(clone);'), 'copy minimizer must run on the cloned export DOM');
// Live duel rendering must still contain both the calculated values and its explanatory notes;
// export cleanup removes only the cloned <small> elements.
ok(app.includes("${av==null?'-':fmt(av, 0)}</strong><small>${awayNote}</small>"), 'live matchup row must retain calculated rating plus explanation');
ok(app.includes("${hv==null?'-':fmt(hv, 0)}</strong><small>${homeNote}</small>"), 'live matchup home row must retain calculated rating plus explanation');

console.log(`OK: ${n} V58 export-copy assertions`);
