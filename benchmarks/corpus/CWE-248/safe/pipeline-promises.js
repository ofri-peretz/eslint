// CWE-248: Safe — stream/promises pipeline centralizes error handling
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — pipeline() forwards and awaits errors, cleans up
// every stream, and surfaces failures via the rejected promise.
// NOTE: the path is basename()d, and deliberately so. These fixtures test
// CWE-248 (a failed read must not throw an uncaught exception), and an earlier
// revision wrote `./uploads/${req.params.id}` — which is a genuine CWE-22:
// `req.params.id = '../../etc/passwd'` escapes the directory. That made
// detect-non-literal-fs-filename report, correctly, and the harness counted a
// true finding of a DIFFERENT weakness against this corpus's false-positive
// budget. A fixture named `safe/` should be safe in every respect, not only the
// one it is filed under.
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

async function download(req, res) {
  try {
    await pipeline(fs.createReadStream(path.join('./uploads', path.basename(req.params.id))), res);
  } catch {
    if (!res.headersSent) res.status(404).end();
  }
}

module.exports = { download };
