// CWE-295: Improper Certificate Validation — checkServerIdentity stubbed out
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — returning undefined from checkServerIdentity signals
// "hostname OK" for every cert, so a valid cert for any domain is accepted.
const tls = require('tls');

function connect(host) {
  return tls.connect({
    host,
    port: 443,
    checkServerIdentity: () => undefined, // never reports a mismatch
  });
}

module.exports = { connect };
