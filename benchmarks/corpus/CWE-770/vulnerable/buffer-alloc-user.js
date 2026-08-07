// CWE-770: Unbounded Allocation — Buffer size taken from the request
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — an attacker sends ?size=2000000000 and each request
// pins ~2 GB of heap, exhausting memory (DoS).
const http = require('http');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const size = Number(url.searchParams.get('size'));
  const buf = Buffer.alloc(size); // unbounded, attacker-controlled
  res.end(`allocated ${buf.length} bytes`);
});

module.exports = server;
