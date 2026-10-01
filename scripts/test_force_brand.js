const fs = require('fs');
const vm = require('vm');
const app = fs.readFileSync('assets/app.js','utf8');
const index = fs.readFileSync('index.html','utf8');
for (const x of ['FORCE Rankings','FORCE Score','FORCEcast','FORCE Adaptive','About FORCE','How FORCE works']) {
  if (!app.includes(x)) throw new Error(`missing FORCE label: ${x}`);
}
if (!index.includes('<title>FORCE - NFL Ratings & Forecasts</title>')) throw new Error('FORCE title missing');
for (const stale of ['<span>Sunday Signal</span>','Sunday Command Center','Name Lab']) {
  if (app.includes(stale)) throw new Error(`stale public identity: ${stale}`);
}
console.log('OK: FORCE identity labels present and stale public identity removed.');
