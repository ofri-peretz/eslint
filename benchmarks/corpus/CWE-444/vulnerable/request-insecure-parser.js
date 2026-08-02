// CWE-444: HTTP Request Smuggling — insecureHTTPParser on an outbound request
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — a lenient client parser trusts sloppy upstream
// framing, which can desync a shared proxy and poison other responses.
const https = require('https');

function fetchProfile(host, path, cb) {
  const req = https.request(
    { host, path, method: 'GET', insecureHTTPParser: true },
    (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => cb(null, body));
    }
  );
  req.on('error', cb);
  req.end();
}

module.exports = { fetchProfile };
