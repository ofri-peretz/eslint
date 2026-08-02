// CWE-377: Insecure Temporary File — os.tmpdir() joined with a static name
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — the filename is constant, so the full path is
// guessable and subject to a symlink race in the shared temp directory.
const fs = require('fs');
const os = require('os');
const path = require('path');

function cacheReport(buffer) {
  const file = path.join(os.tmpdir(), 'report-cache.tmp');
  fs.writeFileSync(file, buffer);
  return file;
}

module.exports = { cacheReport };
