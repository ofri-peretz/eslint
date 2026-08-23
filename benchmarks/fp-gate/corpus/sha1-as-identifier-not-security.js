// Provenance: ahaenggli/AzureAD-LDAP-wrapper src/graph.auth.js:43 and
// shardeum/json-rpc-server src/api.ts:1494 (HEAD 2026-08-22).
//
// Benign because: SHA-1 here is an *identifier*, never a security control.
// Azure AD / MSAL certificate auth REQUIRES the SHA-1 x5t thumbprint — it is
// mandated by the protocol and cannot be upgraded to SHA-256. ETags and log
// correlation tickets have no security property at all.
const crypto = require('crypto');

// X.509 thumbprint — the `x5t` value MSAL sends for certificate client auth.
function calculateThumbprint(certificate) {
  const certContent = certificate
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s/g, '');
  const certBuffer = Buffer.from(certContent, 'base64');
  return crypto
    .createHash('sha1')
    .update(certBuffer)
    .digest('hex')
    .toUpperCase();
}

// Log correlation ticket — used to join a request's start and end log lines.
function newTicket(apiName) {
  return crypto
    .createHash('sha1')
    .update(apiName + Date.now())
    .digest('hex');
}

// HTTP ETag — a cache validator.
function etagFor(body) {
  return crypto.createHash('sha1').update(body).digest('hex');
}

module.exports = { calculateThumbprint, newTicket, etagFor };
