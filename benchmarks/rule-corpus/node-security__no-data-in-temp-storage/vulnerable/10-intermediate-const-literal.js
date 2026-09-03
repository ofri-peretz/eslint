/**
 * VULNERABLE - the temp path reaches the sink through one intermediate `const`,
 * which is how anybody actually writes this. The build script caches the
 * registry auth token at a fixed /tmp name.
 */
const fs = require('fs');

const TOKEN_CACHE = '/tmp/npm-registry-token.json';

async function refreshRegistryToken(client) {
  const grant = await client.refresh();
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify(grant));
  return grant;
}

module.exports = { refreshRegistryToken };
