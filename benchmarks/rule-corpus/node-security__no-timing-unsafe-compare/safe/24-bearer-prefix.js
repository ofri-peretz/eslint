/**
 * SAFE (wave 2) - `startsWith` against a literal scheme prefix.
 *
 * The new comparison-API surface must not fire on this. `'Bearer '` is in the
 * RFC; the whole world knows it. Only the prefix is compared, and the prefix
 * is a source constant.
 */
'use strict';

function parseAuthorization(req) {
  const header = String(req.headers.authorization);

  if (!header.startsWith('Bearer ')) {
    return null;
  }
  if (req.path.startsWith('/internal/')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

module.exports = { parseAuthorization };
