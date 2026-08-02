// CWE-295: Improper Certificate Validation — rejectUnauthorized: false
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — disabling rejectUnauthorized accepts any certificate,
// including a MITM attacker's self-signed one, breaking TLS trust entirely.
const https = require('https');

function fetchSecret(host, cb) {
  const req = https.request(
    { host, path: '/secret', rejectUnauthorized: false },
    (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => cb(null, body));
    }
  );
  req.on('error', cb);
  req.end();
}

module.exports = { fetchSecret };
