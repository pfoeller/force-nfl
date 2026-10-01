const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const [teamCsv,playerCsv]=process.argv.slice(2);
if(!teamCsv||!playerCsv){
  console.log('SKIP: V29 actual Week 1 replay requires paths to nflverse team and player CSVs.');
  console.log('Usage: node scripts/test_v29_week1_replay.js /path/stats_team_week_2026.csv /path/stats_player_week_2026.csv');
  process.exit(0);
}
function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"')quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  if(!rows.length)return [];
  const hdr=rows[0];
  return rows.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(hdr.map((h,i)=>[h,r[i]??''])));
}
const teamRows=parseCsv(fs.readFileSync(teamCsv,'utf8')).filter(r=>String(r.season)==='2026'&&Number(r.week)===1&&(!r.season_type||r.season_type==='REG'));
const playerRows=parseCsv(fs.readFileSync(playerCsv,'utf8')).filter(r=>String(r.season)==='2026'&&Number(r.week)===1&&(!r.season_type||r.season_type==='REG'));
const ctx={window:{}};vm.createContext(ctx);
for(const rel of ['data/model-data.js','data/matchup-data.js','model/live_profiles.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
const D=ctx.window.MODEL_DATA,M=ctx.window.MATCHUP_DATA,LP=ctx.window.FORCE_LIVE_PROFILE;
const teams=Object.keys(D.teams);
if(!teamRows.length)throw new Error('No 2026 Week 1 regular-season team rows found');
if(!playerRows.length)throw new Error('No 2026 Week 1 regular-season player rows found');
const profiles=LP.buildProfiles({teamRows,playerRows,priorProfiles:M.profiles,teamIds:teams,priorGames:1});
const failures=[];
const rows={};
for(const t of teams){
  const p=profiles[t];
  if(!p){failures.push(`${t}: missing profile`);continue;}
  for(const k of ['passRushIndex','runDefenseIndex','coverageIndex','defenseIndex']){
    if(!Number.isFinite(Number(p[k]))||Number(p[k])<0||Number(p[k])>100)failures.push(`${t}: bad ${k}=${p[k]}`);
  }
  const expected=.36*p.coverageIndex+.16*p.passRushIndex+.28*p.runDefenseIndex+.20*p.pointsAllowedPerDriveIndex;
  if(Math.abs(p.defenseIndex-expected)>1e-8)failures.push(`${t}: defense identity ${p.defenseIndex} != ${expected}`);
  if(Number(p?._live?.games)!==1)failures.push(`${t}: expected one live Week 1 game, got ${p?._live?.games}`);
  rows[t]={games:p?._live?.games,passRushIndex:p.passRushIndex,runDefenseIndex:p.runDefenseIndex,coverageIndex:p.coverageIndex,defenseIndex:p.defenseIndex,legacyFrontIndex:p.frontIndex,pressureRate:p.dl?.pressure_rate,runEpaAllowed:p.dl?.run_epa_allowed,passEpaAllowed:p.cov?.epa_allowed,cpoeAllowed:p.cov?.cpoe_allowed};
}
const report={version:29,source:{teamCsv:path.basename(teamCsv),playerCsv:path.basename(playerCsv)},teamRows:teamRows.length,playerRows:playerRows.length,failures,teams:rows};
fs.writeFileSync(path.join(root,'benchmarks/v29_week1_replay.json'),JSON.stringify(report,null,2));
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`V29 actual Week 1 replay PASS (${teams.length} teams; ${teamRows.length} team rows; ${playerRows.length} player rows)`);
