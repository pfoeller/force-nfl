import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real ordered browser bundle without starting timers/network/UI.
// Expose lexical functions only inside this test VM, at the existing test gate.
export function appHarness({fetch = async () => { throw new Error('unexpected fetch'); }, now = Date.now(), hooks = '', hostname = 'forceratings.com', document = null, timers = {}, sources = {}} = {}) {
  class Clock extends Date { static now() { return typeof now==='function'?now():now; } }
  const context = {window:{__FORCE_TEST_MODE__:true},console:{log(){},warn(){},info(){}},
    document:document || {getElementById(){return {innerHTML:''};},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){}},
    localStorage:{getItem(){return null;},setItem(){}},location:{hostname,pathname:'/qb-rankings',hash:'',protocol:'https:',origin:`https://${hostname}`},
    history:{pushState(){}},navigator:{onLine:true},Date:Clock,fetch,AbortController,URL,Blob,
    setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},queueMicrotask,...timers};
  context.window.addEventListener=()=>{};
  vm.createContext(context);
  const html=fs.readFileSync('index.html','utf8');
  for (const [,path] of html.matchAll(/<script src="([^"]+)"/g)) {
    // Optional per-file source overrides let a test load stale or legacy data.
    let source=Object.hasOwn(sources,path)?sources[path]:fs.readFileSync(path,'utf8');
    if (path==='assets/app.js') source=source.replace('if (window.__FORCE_TEST_MODE__) {',
      `window.TEST={S,liveProfiles,currentRatings,currentTeamState,ratingsWithActiveQBCarryover,unitForceBridge,forecastFor,displayProfile,offenseCompositeFrom,qbRankingsPage,teamPage,rankings,matchupPage,fetchBootstrapSnapshot,initialCanonicalBootstrap,refreshPublishedSnapshot,snapshotAgePolicy,connectionLabel,defensiveDriveContextMapBeforeWeek,${hooks}};\n  if (window.__FORCE_TEST_MODE__) {`);
    vm.runInContext(source,context,{filename:path});
  }
  return {context,api:context.window.TEST,L:context.window.FORCE_LIVE_PROFILE};
}
