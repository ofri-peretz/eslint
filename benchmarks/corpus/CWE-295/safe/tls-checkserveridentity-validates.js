// CWE-295: Safe — custom checkServerIdentity that still validates
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — it delegates to tls.checkServerIdentity and
// returns the Error on mismatch, then additionally pins the allowed host.
const tls = require('tls');

function connect(host) {
  return tls.connect({
    host,
    port: 443,
    checkServerIdentity: (hostname, cert) => {
      const err = tls.checkServerIdentity(hostname, cert);
      if (err) return err; // propagate the verification failure
      if (hostname !== 'api.internal.example') {
        return new Error(`unexpected host: ${hostname}`);
      }
      return undefined;
    },
  });
}

module.exports = { connect };
