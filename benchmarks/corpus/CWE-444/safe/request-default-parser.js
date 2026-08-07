// CWE-444: Safe — outbound request uses the default strict parser
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — options omit insecureHTTPParser, so responses with
// ambiguous framing are rejected rather than silently accepted.
const https = require('https');

function fetchProfile(host, path, cb) {
  const req = https.request({ host, path, method: 'GET' }, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => cb(null, body));
  });
  req.on('error', cb);
  req.end();
}

module.exports = { fetchProfile };
