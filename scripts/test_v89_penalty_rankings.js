const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
let n=0; function ok(x,m){n++;if(!x)throw new Error(m);}
ok(app.includes("['penalties', 'Penalty Impact']"),'rankings must expose a Penalty Impact tab');
ok(app.includes("if (S.ratingView === 'penalties') S.rankSort = { key: 'penEPA', dir: 'desc' }"),'restored Penalty Impact tab must default to most benefit first');
ok(app.includes("if (nextView === 'penalties') S.rankSort = { key: 'penEPA', dir: 'desc' }"),'entering Penalty Impact must reset to most benefit first');
ok(app.includes('Most benefit first')&&app.includes('Least benefit first'),'Penalty Impact tab must expose both sort directions');
ok(app.includes("S.rankSort = { key: 'penEPA', dir: b.dataset.penaltysort === 'asc' ? 'asc' : 'desc' }"),'sort toggle must control Penalty Impact direction');
ok(app.includes("if (key === 'penEPA')")&&app.includes('a._sort.penEPA == null'),'missing penalty values must receive explicit sort handling');
ok(app.includes("penUnavailable: Boolean(pen.unavailable)"),'penalty ranking rows must carry an unavailable flag');
ok(app.includes("sortHeader('Penalty impact','penEPA')"),'Penalty Impact must remain sortable from its table header');
ok(app.includes('<th>2026 raw</th><th>2025 prior</th><th>Causal EPA / WPA</th>'),'Penalty board must expose current-season and historical audit columns');
ok(css.includes('.penalty-sort-toolbar')&&css.includes('.penalty-sort-toggle'),'Penalty sort control must be styled');
const server=fs.readFileSync(path.join(root,'force_server.py'),'utf8');
ok(server.includes("APP_VERSION = 'V89'")&&server.includes("SERVER_DIAG_VERSION = 'V89-DIAG-1'"),'server identity must be V87');
ok(server.includes("PENALTY_MODEL_VERSION = 'V89 fixed-team causal WPA + approved 40/25/20/15 blend'"),'V89 must not silently change the V86 causal penalty model');
console.log(`PASS: V89 Penalty Impact rankings (${n} checks)`);
