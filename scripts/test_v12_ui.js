const fs = require('fs');
const app = fs.readFileSync('assets/app.js','utf8');
if (app.includes('function teamHelmet(') || app.includes('helmet-shell')) {
  console.error('V12 synthetic helmet treatment should be retired in V13');
  process.exit(1);
}
console.log('v12 helmet retirement check: PASS');
