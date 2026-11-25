// CWE-248: Uncaught Exception — request with an error listener, source destroyed on failure
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-24
// Must NOT be detected — the request's 'error' is routed to reject.
const http = require('http');

function handleUpload(stream, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, (res) => resolve(res));
    req.on('error', reject);
    stream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
    stream.pipe(req);
  });
}

module.exports = { handleUpload };
