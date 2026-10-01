import fs from 'node:fs';const app=fs.readFileSync('assets/app.js','utf8');function ok(x,m){if(!x)throw new Error(m)}
ok(app.includes("health?.app_version!=='V149'"),'V148 bootstrap comparison');
ok(app.includes('qbRecencyAdjustmentFromProfiles'),'canonical recency helper missing');
ok(app.includes('p.qbIndex=Math.max(0,Math.min(100,Number(p.qbIndex)+recency))'),'recency not promoted into canonical qbIndex');
ok(app.includes('q.canonical_force_qb_rating=p.qbIndex'),'canonical QB rating not exposed');
ok(app.includes("const rating=custom?qbCustomScore(c):Math.max(0,Math.min(100,Number(q.displayedQbIndex??q.measuredQbIndex??50)));"),'QB leaderboard still double-adds recency');
ok(app.includes("['Offense composite', 'offenseComposite'], ['Scoring/drive', 'pointsScoredPerDriveIndex'], ['Team efficiency', 'offenseIndex'], ['Defense', 'defenseIndex'], ['QB', 'qbIndex']"),'unit surfaces not keyed to qbIndex');
ok(app.includes("matchupSubedge('QB vs coverage', offTeam, defTeam, offProfile.qbIndex, defProfile.coverageIndex)"),'matchup does not consume qbIndex');
console.log('PASS: V148 canonical FORCE QB rating everywhere (7 checks)');