// CWE-770: Safe — allocation clamped to a hard maximum
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the requested size is bounded by MAX_BYTES before
// any allocation, so a hostile value cannot exceed a small ceiling.
const http = require('http');

const MAX_BYTES = 64 * 1024;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const requested = Number(url.searchParams.get('size')) || 0;
  const size = Math.min(Math.max(requested, 0), MAX_BYTES);
  const buf = Buffer.alloc(size);
  res.end(`allocated ${buf.length} bytes`);
});

module.exports = server;
