const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const model=fs.readFileSync(path.join(root,'data/model-data.js'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};

ok(app.includes("const TEAM_LOGO_CODES = { LAR: 'LA' }"),'Rams provider alias LAR -> LA missing');
ok(app.includes('return `${TEAM_LOGO_BASE}/${teamLogoCode(t)}.png`;'),'logo URL must use provider code, not model code directly');
ok(!app.includes('`${TEAM_LOGO_BASE}/${canon(t)}.png`'),'legacy direct canonical-ID logo lookup must be removed');

const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(model,sandbox);
const D=sandbox.window.MODEL_DATA;
const providerCodes=new Set(['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS','LA']);
const aliases={LAR:'LA'};
const teams=Object.keys(D.teams);
ok(teams.length===32,`expected 32 canonical teams, got ${teams.length}`);
for(const team of teams){
  const provider=aliases[team]||team;
  ok(providerCodes.has(provider),`${team} resolves to missing provider logo code ${provider}`);
}
ok((aliases.LAR||'LAR')==='LA','Rams must specifically resolve to LA.png');
console.log(`OK: ${n} V59 team-logo provider alias assertions`);
