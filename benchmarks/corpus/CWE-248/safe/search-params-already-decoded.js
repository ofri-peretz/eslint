// URLSearchParams values are decoded by the URL parser, which never throws
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// on a stray '%', so there is nothing to guard.
const http = require('node:http');

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.end(url.searchParams.get('q') ?? '');
  })
  .listen(3000);
