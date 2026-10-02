const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
let n=0; const ok=(x,m)=>{n++; if(!x) throw new Error(m)};

// One canonical historical-state constructor must own pre/post FORCE.
ok(app.includes("function canonicalGameTeamState(g, t, phase = 'pre')"),'canonical historical state helper missing');
ok(app.includes("const p=profileBeforeWeek(t, Number(g.week) + (isPost ? 1 : 0))"),'historical units must be timestamped pre/post game');
ok(app.includes('const bridge=unitForceBridgeForProfile(t, coreElo, p)'),'historical FORCE must use unit bridge');
// MD-03 (Cycle 6): the retired automatic QB regime is never reapplied historically.
ok(!app.includes('QR.correction(') && app.includes('profile:p,qbRestore:0,gamesPlayed};'),'historical FORCE must not reapply the retired automatic QB regime');
ok(app.includes('forceScore:score(elo)'),'historical FORCE must transform final canonical Elo only after overlays');

// Pregame and postgame UI/audit must consume that same helper.
ok(app.includes("const preHomeState=canonicalGameTeamState(g,g.home,'pre')"),'home pregame state not canonical');
ok(app.includes("const preAwayState=canonicalGameTeamState(g,g.away,'pre')"),'away pregame state not canonical');
ok(app.includes("const postHomeState=canonicalGameTeamState(g,g.home,'post')"),'home postgame state not canonical');
ok(app.includes("const postAwayState=canonicalGameTeamState(g,g.away,'post')"),'away postgame state not canonical');
ok(app.includes("const historicalPostHome = g.homeScore != null ? canonicalGameTeamState(g,g.home,'post') : null"),'matchup postgame display not canonical');
ok(app.includes("const historicalPostAway = g.homeScore != null ? canonicalGameTeamState(g,g.away,'post') : null"),'matchup postgame display not canonical');

// Immediate rematch must seed from complete postgame state, not legacy raw-Elo snapshots.
ok(app.includes('F.independentProbability(postHomeState.elo,postAwayState.elo'),'rematch is not seeded from canonical postgame state');
ok(!app.includes('F.independentProbability(hist.postHome,hist.postAway'),'legacy raw-Elo rematch path still present');
ok(!app.includes('score(hist?.postAway'),'legacy score(Elo) postgame display still present');

// Delta shown to users must be FORCE delta, not raw Elo movement.
ok(app.includes('homePowerDelta:postHomeState.forceScore-preHomeState.forceScore'),'home FORCE delta incorrect');
ok(app.includes('awayPowerDelta:postAwayState.forceScore-preAwayState.forceScore'),'away FORCE delta incorrect');
ok(app.includes('FORCE ${fmt(post.preHomeForce)} → ${fmt(post.postHomeForce)}'),'home postgame card must display canonical FORCE endpoints');
ok(app.includes('FORCE ${fmt(post.preAwayForce)} → ${fmt(post.postAwayForce)}'),'away postgame card must display canonical FORCE endpoints');

// All-team QA hook: every team uses this same generic path; latest postgame can be
// compared against current canonical state when no later completed game exists.
ok(app.includes('window.FORCE_V69_STATE_AUDIT = () =>'),'all-team V69 audit hook missing');
ok(app.includes('post.forceScore-current.forceScore'),'latest-post/current invariant missing from audit');

console.log(`OK: ${n} V69 canonical historical-state assertions`);
