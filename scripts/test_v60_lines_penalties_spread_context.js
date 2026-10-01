const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const live=fs.readFileSync(path.join(root,'model/live_profiles.js'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};

// 1) Predicted-line display remains true nearest-half sportsbook notation, with one decimal.
ok(app.includes('const spread = roundHalf(proj.spread);'),'predicted line must still round to nearest half-point');
ok(app.includes('fmt(Math.abs(spread), 1)'),'predicted lines must render one decimal (.0 or .5)');
ok(app.includes('NFL sportsbook spreads legitimately use both whole and half points'),'method copy should explain .0 and .5 are both valid sportsbook lines');

// 2) Current penalty context must use the team feed that actually carries penalties/penalty_yards.
ok(live.includes("sum(own,'penalties')") && live.includes("sum(own,'penalty_yards')"),'own penalty totals must come from team stats');
ok(live.includes("sum(opp,'penalties')") && live.includes("sum(opp,'penalty_yards')"),'opponent penalty totals must come from team stats');
ok(live.includes("Object.prototype.hasOwnProperty.call(x,'penalties')") && live.includes("Object.prototype.hasOwnProperty.call(x,'penalty_yards')"),'penalty availability gate must inspect team penalty fields');
ok(!live.includes("playerRows.some((x) => Object.prototype.hasOwnProperty.call(x,'def_penalty')"),'legacy missing player-level penalty gate must be gone');

// 3) Clarify the adaptive residual is team history, not a mirrored matchup stat.
ok(app.includes('Recent vs spread'),'context cards should use the clearer Recent vs spread label');
ok(app.includes('RECENT VS SPREAD'),'advanced view should use the clearer label');
ok(app.includes('team history, not head-to-head') || app.includes('team history, not a matchup mirror'),'UI must explicitly say the two team values are independent histories');
ok(!app.includes('<span>Vs Vegas</span>'),'ambiguous matchup label should be removed');

console.log(`OK: ${n} V60 line/penalty/spread-context assertions`);
