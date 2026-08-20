// CWE-248: Safe — error listener attached before piping
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the 'error' event is handled, so a failed read
// responds with 404 instead of throwing an uncaught exception.
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

function download(req, res) {
  const stream = fs.createReadStream(path.join('./uploads', path.basename(req.params.id)));
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
  });
  stream.pipe(res);
}

module.exports = { download };
