/**
 * VULNERABLE - identical exposure to 01, spelled with a destructured CJS
 * import. `const { writeFileSync } = require('node:fs')` is the ordinary
 * modern spelling; the OAuth refresh token lands in the same world-readable
 * directory under a fixed name.
 */
const { writeFileSync } = require('node:fs');

function cacheRefreshToken(grant) {
  writeFileSync('/tmp/oauth-refresh.json', JSON.stringify(grant), { mode: 0o600 });
}

module.exports = { cacheRefreshToken };
