// CWE-444: HTTP Request Smuggling — insecureHTTPParser enabled on the server
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — insecureHTTPParser accepts malformed/ambiguous
// framing (conflicting Content-Length/Transfer-Encoding), enabling smuggling.
const http = require('http');

const server = http.createServer({ insecureHTTPParser: true }, (req, res) => {
  res.end('ok');
});

server.listen(8080);

module.exports = server;
