// CWE-377: Safe — unique temp directory via mkdtempSync
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — mkdtempSync creates a fresh 0700 directory with a
// random suffix, so the path is unpredictable and not race-able.
const fs = require('fs');
const os = require('os');
const path = require('path');

function exportData(records) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-export-'));
  const file = path.join(dir, 'export.json');
  fs.writeFileSync(file, JSON.stringify(records));
  return file;
}

module.exports = { exportData };
