// CWE-248: Uncaught Exception — proxied upload request with no error listener
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-24
// This MUST be detected — shape of parse-server's GraphQL createFile. A refused
// or reset connection makes the ClientRequest emit 'error' with no listener; Node
// throws it from the event loop, so the try/catch around the await never sees it
// and the whole process exits.
const http = require('http');

function handleUpload(stream, url) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'POST' }, (res) => resolve(res));
    stream.pipe(req); // no req.on('error', ...)
  });
}

module.exports = { handleUpload };
