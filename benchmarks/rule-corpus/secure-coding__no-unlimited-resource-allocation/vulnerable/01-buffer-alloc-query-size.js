/**
 * VULNERABLE - The canonical CWE-770. A single request with ?size=2000000000
 * reserves ~2 GB of heap; a handful of them exhaust the process.
 */
const http = require('http');

module.exports = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const size = Number(url.searchParams.get('size'));
  const buf = Buffer.alloc(size);
  res.end(`allocated ${buf.length} bytes`);
});
