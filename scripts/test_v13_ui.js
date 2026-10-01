const fs = require('fs');
const app = fs.readFileSync('assets/app.js','utf8');
const css = fs.readFileSync('assets/styles.css','utf8');
const checks = [
  ['real logo source', app.includes('NFL-Team-Logos-Transparent-Squared/main/logos')],
  ['team mark helper', app.includes('function teamMark(')],
  ['no synthetic helmet helper', !app.includes('function teamHelmet(')],
  ['no synthetic helmet path', !app.includes('helmet-shell') && !css.includes('.helmet-shell')],
  ['matchup away logo', app.includes("teamMark(g.away, 'lg', 'right')")],
  ['matchup home logo', app.includes("teamMark(g.home, 'lg', 'left')")],
  ['team profile logo', app.includes("teamMark(t, 'xl')")],
  ['logo-only mark policy', !app.includes('team-mark-fallback') && app.includes("onerror=\"this.parentElement.style.display='none'\"")],
  ['png logo inlining', app.includes('inlineExportTeamLogos') && app.includes('blobToDataUrl')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('V13 UI failures:', failed.map(([n])=>n).join(', '));
  process.exit(1);
}
console.log('v13 real-logo UI checks: PASS');
