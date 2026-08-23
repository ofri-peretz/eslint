// Provenance: hzi-braunschweig/pia-system
// psa.lib.service-core/src/auth/tsoaAuthenticator.ts:57 (HEAD 2026-08-22).
//
// Benign because: the token IS validated — by RFC 7662 token introspection against
// the identity provider, which answers `active: true/false` after checking signature,
// expiry AND revocation. That is stronger than a local `verify()`, which cannot see a
// revoked token. `decode()` only reads claims from a string the IdP has already
// vouched for, and the guard fails closed.
//
// A rule that looks for a `verify()` call near a `decode()` cannot see this. The
// repository is a public-health research platform; telling its auth library it does
// not verify tokens would be wrong in a way that is expensive to walk back.
const { decode } = require('jsonwebtoken');
const fetch = require('node-fetch');

async function isTokenValid(authToken, settings) {
  try {
    const res = await fetch(
      `${settings.url}/realms/${settings.realm}/protocol/openid-connect/token/introspect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // RFC 6749 §2.3.1: client credentials belong in the form-encoded BODY of a
        // POST. This is the prescribed transport, not a query string.
        body: `client_id=${encodeURIComponent(settings.clientId)}&client_secret=${encodeURIComponent(settings.secret)}&token=${encodeURIComponent(authToken)}`,
      },
    );
    return (await res.json()).active;
  } catch (e) {
    return false; // fail closed
  }
}

async function verifyToken(authToken, settings) {
  const decodedToken = decode(authToken, { json: true });
  if (decodedToken === null || !(await isTokenValid(authToken, settings))) {
    throw new Error('No or invalid authorization token provided');
  }
  return decodedToken;
}

module.exports = { verifyToken };
