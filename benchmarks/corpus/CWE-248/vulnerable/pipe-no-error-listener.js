// CWE-248: Uncaught Exception — piping a file stream with no error handler
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — if the file is missing or the read fails, the stream
// emits 'error' with no listener, which throws and crashes the process.
const fs = require('fs');

function download(req, res) {
  const filePath = `./uploads/${req.params.id}`;
  fs.createReadStream(filePath).pipe(res); // no .on('error', ...)
}

module.exports = { download };
