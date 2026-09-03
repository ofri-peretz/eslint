/**
 * VULNERABLE - `localeCompare(...) === 0` on a bearer token.
 *
 * Collation is a byte-by-byte walk with locale rules on top, so it leaks the
 * same prefix information and, worse, may declare two DIFFERENT strings equal
 * under locale-sensitive folding.
 */
'use strict';

async function authorizeBearer(req, tokenStore) {
  const presented = String(req.headers.authorization || '').replace(/^Bearer /, '');
  const storedToken = await tokenStore.currentToken();

  if (presented.localeCompare(storedToken) === 0) {
    return true;
  }
  return false;
}

module.exports = { authorizeBearer };
