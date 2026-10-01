const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};

// Static contract: a single reusable identity path owns logos across dense and full-name references.
ok(appSource.includes('function teamIdentity('),'teamIdentity helper missing');
ok(appSource.includes('function teamToken('),'teamToken helper missing');
ok(appSource.includes('function logoizeTeamCodes('),'team-code logoizer missing');
ok(appSource.includes("teamIdentity(r.team, { size: 'xs', sub: subRank })"),'rankings rows must use team logo identity');
ok(appSource.includes("teamIdentity(r.team, { size: 'xs' })"),'Units rows must use team logo identity');
ok(appSource.includes("teamIdentity(g.away, { size: 'xs', extra: 'game-team game-team-away' })"),'game cards away team logo missing');
ok(appSource.includes("teamIdentity(g.home, { size: 'xs', extra: 'game-team game-team-home' })"),'game cards home team logo missing');
ok(appSource.includes("teamIdentity(opp, { size: 'xs' })"),'schedule opponent logo missing');
ok(appSource.includes('logoizeTeamCodes(audit.line)'),'forecast line team logos missing');
ok(appSource.includes('logoizeTeamCodes(audit.score)'),'forecast score team logos missing');
ok(appSource.includes('teamIdentity(x.t, { size: \'xs\' })'),'adaptive team table logo missing');
ok(css.includes('.team-mark-xxs'),'dense logo size missing');
ok(css.includes('.team-identity{'),'team identity CSS missing');

// Render smoke: home -> rankings -> units -> game -> team page and verify real image marks are emitted.
const callbacks={}; const mount={innerHTML:''};
global.window=global;
global.__FORCE_ALLOW_DEGRADED_TEST_DATA__=true;
global.location={hash:''};
global.localStorage={getItem(){return null;},setItem(){}};
global.document={
  visibilityState:'visible',
  getElementById(id){return id==='app'?mount:null;},
  querySelectorAll(){return [];},
  addEventListener(name,cb){callbacks['doc:'+name]=cb;},
  styleSheets:[]
};
global.addEventListener=(name,cb)=>{callbacks[name]=cb;};
global.window.addEventListener=global.addEventListener;
global.setInterval=()=>0; global.clearInterval=()=>{};
global.fetch=async()=>{throw new Error('offline test');};
function run(rel){vm.runInThisContext(fs.readFileSync(path.join(root,rel),'utf8'),{filename:rel});}
for (const rel of ['data/model-data.js','data/opening-lines.js','data/matchup-data.js','data/predictive-feature-gates.js','data/qb-carryover.js','model/forecast_v2.js','model/adaptive_v3.js','model/predictive_features.js','model/qb_regime.js','model/early_regime.js','model/unit_prior_controller.js','model/score_normalizer.js','model/unit_force_bridge.js','model/live_profiles.js','assets/app.js']) { if (fs.existsSync(path.join(root,rel))) run(rel); }
const countMarks=()=> (mount.innerHTML.match(/class="team-mark /g)||[]).length;
ok(countMarks()>=16,'home should render many team logos');
const unitButton={dataset:{ratingview:'units'},onclick:null};
document.querySelectorAll=(sel)=> sel==='[data-ratingview]' ? [unitButton] : [];
location.hash='#rankings'; callbacks.hashchange();
ok(countMarks()>=32,'rankings should render a logo for every team row');
ok(/diagnostic-table[\s\S]*team-mark-xs/.test(mount.innerHTML),'rankings table logo markup missing');
ok(typeof unitButton.onclick==='function','Units tab handler not bound');
unitButton.onclick();
ok(mount.innerHTML.includes('O-Line') && mount.innerHTML.includes('Coverage'),'Units view did not render');
ok(countMarks()>=32,'Units view should render a logo for every team row');
const gameMatch=mount.innerHTML.match(/data-game="([^"]+)"/);
document.querySelectorAll=()=>[];
location.hash='#matchups'; callbacks.hashchange();
const gm=mount.innerHTML.match(/data-game="([^"]+)"/);
ok(gm,'no game found');
location.hash='#game/'+gm[1]; callbacks.hashchange();
ok((mount.innerHTML.match(/class="team-mark /g)||[]).length>=20,'matchup page should logoize repeated team references');
location.hash='#teams/KC'; callbacks.hashchange();
ok(mount.innerHTML.includes('Kansas City Chiefs'),'KC team page missing');
ok(countMarks()>=2,'team page/schedule should render logos');
console.log(`OK: ${n} V40 ubiquitous-team-logo assertions`);
