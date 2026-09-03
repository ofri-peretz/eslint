// CWE-377: Insecure Temporary File — predictable path in a shared directory
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — a fixed /tmp path is world-predictable; an attacker
// can pre-create or symlink it to clobber or hijack the written data.
const fs = require('fs');

function exportData(records) {
  const file = '/tmp/app-export.json';
  fs.writeFileSync(file, JSON.stringify(records));
  return file;
}

module.exports = { exportData };
