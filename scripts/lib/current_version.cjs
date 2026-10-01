const fs = require('node:fs');
const path = require('node:path');

// Current identity tests follow the server; frozen historical tests keep theirs.
const source = fs.readFileSync(path.resolve(__dirname, '../../force_server.py'), 'utf8');
const appVersion = source.match(/^APP_VERSION\s*=\s*['"]([^'"]+)['"]/m)?.[1];
const diagnosticVersion = source.match(/^SERVER_DIAG_VERSION\s*=\s*['"]([^'"]+)['"]/m)?.[1];
if (!appVersion || !diagnosticVersion) throw new Error('Current server identity is missing');
module.exports = { appVersion, diagnosticVersion };
