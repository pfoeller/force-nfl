const fs = require('fs');
const app = fs.readFileSync(require('path').join(__dirname,'..','assets','app.js'),'utf8');
const must = [
  'function freezeExportTextStyles',
  "'color', 'font-family', 'font-size', 'font-weight'",
  "el.style.setProperty('-webkit-text-fill-color', cs.color)",
  'freezeExportTextStyles(clone);'
];
for (const token of must) {
  if (!app.includes(token)) throw new Error('Missing V18 export style guard: '+token);
}
const freezePos = app.indexOf('freezeExportTextStyles(clone);');
const removePos = app.indexOf('staging.remove(); staging = null;', freezePos);
if (freezePos < 0 || removePos < 0 || freezePos > removePos) throw new Error('Computed styles must be frozen before staging clone is removed');
console.log('V18 export style tests: PASS');
