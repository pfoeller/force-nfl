const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
let n=0; function ok(x,m){n++; if(!x) throw new Error(m)}
ok(app.includes("if (view === 'units') return `<tr><th class=\"metric-rank-head\">${rankLabel()} rank</th><th>Team</th>${sortHeader('FORCE','force')}${sortHeader('Offense','off')"),'Units header must put FORCE before unit columns');
ok(/const unitLead = `<td>\$\{displayRank\}<\/td><td><button class="team-link" data-team="\$\{r\.team\}">[\s\S]*?<\/button><\/td><td class="rating-cell"><b class="score \$\{bandClass\(score\(r\.liveElo\)\)\}">\$\{fmt\(score\(r\.liveElo\)\)\}<\/b><\/td>`;/.test(app),'Units row must show FORCE score');
ok(app.includes("S.ratingView === 'units' ? '' : diagnosticNotice(S.ratingView, { afterFlagIntro: S.ratingView === 'penalties' })"),'Units notes remain suppressed');
ok(app.includes('data-export-row-group="16"'),'Rankings export is 16 teams per page');
ok(!/if \(S\.ratingView === 'units'\)[^\n]+\$\{action\}/.test(app),'Units row must not regain QB-return action');
console.log(`OK: ${n} V38 Units/FORCE assertions`);
