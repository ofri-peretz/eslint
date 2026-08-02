// CWE-295: Safe — default certificate verification
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — no verification options are overridden, so Node
// validates the chain and hostname with its built-in defaults.
const https = require('https');

function fetchSecret(host, cb) {
  const req = https.request({ host, path: '/secret', method: 'GET' }, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => cb(null, body));
  });
  req.on('error', cb);
  req.end();
}

module.exports = { fetchSecret };
