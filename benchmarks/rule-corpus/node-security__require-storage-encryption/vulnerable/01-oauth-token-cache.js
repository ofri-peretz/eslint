/**
 * VULNERABLE - a CLI writes the OAuth refresh token to its config directory in
 * cleartext. Anything that reads the user's home directory — a backup agent, a
 * synced folder, another tool's postinstall script — walks off with a
 * long-lived credential.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN_CACHE = path.join(os.homedir(), '.mycli', 'auth.json');

function persistGrant(refreshToken) {
  fs.mkdirSync(path.dirname(TOKEN_CACHE), { recursive: true });
  fs.writeFileSync(TOKEN_CACHE, refreshToken, { mode: 0o600 });
}

module.exports = { persistGrant };
