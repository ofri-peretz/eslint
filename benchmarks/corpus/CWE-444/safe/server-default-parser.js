// CWE-444: Safe — server uses the strict default HTTP parser
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — no insecureHTTPParser option is set; Node's strict
// llhttp parser rejects ambiguous message framing.
const http = require('http');

const server = http.createServer((req, res) => {
  res.end('ok');
});

server.listen(8080);

module.exports = server;
