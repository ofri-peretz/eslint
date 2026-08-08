// CWE-248: Safe — error listener attached before piping
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the 'error' event is handled, so a failed read
// responds with 404 instead of throwing an uncaught exception.
const fs = require('fs');

function download(req, res) {
  const stream = fs.createReadStream(`./uploads/${req.params.id}`);
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
  });
  stream.pipe(res);
}

module.exports = { download };
