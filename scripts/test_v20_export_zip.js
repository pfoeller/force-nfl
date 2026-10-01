const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');

function must(re, msg) {
  if (!re.test(app)) throw new Error(msg);
}

must(/async function buildExportZip\(entries\)/, 'missing browser ZIP builder');
must(/0x04034B50/, 'missing ZIP local-file signature');
must(/0x02014B50/, 'missing ZIP central-directory signature');
must(/0x06054B50/, 'missing ZIP end-of-central-directory signature');
must(/pngEntries\.length === 1[\s\S]*triggerExportDownload\(pngEntries\[0\]\.blob/, 'single-page PNG download path missing');
must(/const zip = await buildExportZip\(pngEntries\);[\s\S]*triggerExportDownload\(zip, exportZipFileName/, 'multi-page single-ZIP download path missing');
if (/for \(let i = 0; i < pages\.length; i\+\+\)[\s\S]{0,1800}a\.click\(\)/.test(app)) {
  throw new Error('per-page automatic download loop still present');
}
console.log('V20 export ZIP checks: PASS');
