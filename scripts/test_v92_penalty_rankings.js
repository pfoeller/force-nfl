const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
let n=0; function ok(x,m){n++;if(!x)throw new Error(m)}
ok(app.includes("['penalties', 'Penalty Impact']"),'Penalty Impact tab missing');
ok(app.includes("if (S.ratingView === 'penalties') S.rankSort = { key: 'penEPA', dir: 'desc' }"),'default most-benefit sort missing');
ok(app.includes('Most benefit first')&&app.includes('Least benefit first'),'sort toggle missing');
ok(app.includes("if (key === 'penEPA')")&&app.includes('a._sort.penEPA == null'),'missing-data sort guard missing');
ok(app.includes("sortHeader('Penalty impact','penEPA')"),'Penalty Impact header sort missing');
ok(app.includes('<th>Causal EPA / WPA</th><th>Net penalty 1st downs</th><th>Net erased TDs</th>'),'current-season audit columns missing');
ok(!app.includes('<th>2025 prior</th>'),'historical team prior column must be absent');
ok(css.includes('.penalty-sort-toolbar')&&css.includes('.penalty-sort-toggle'),'sort styling missing');
console.log(`PASS: V92 Penalty Impact rankings (${n} checks)`);
