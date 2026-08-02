// CWE-248: Safe — stream/promises pipeline centralizes error handling
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — pipeline() forwards and awaits errors, cleans up
// every stream, and surfaces failures via the rejected promise.
const fs = require('fs');
const { pipeline } = require('stream/promises');

async function download(req, res) {
  try {
    await pipeline(fs.createReadStream(`./uploads/${req.params.id}`), res);
  } catch {
    if (!res.headersSent) res.status(404).end();
  }
}

module.exports = { download };
