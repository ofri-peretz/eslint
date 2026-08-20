/**
 * SAFE - the correct remediation. fs.mkdtempSync appends six random characters
 * to the prefix and creates the directory with mode 0700, so the final path is
 * unpredictable and unreadable by other local users. Everything is written
 * inside that directory.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

function stageExport(rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
  const file = path.join(dir, 'rows.json');
  fs.writeFileSync(file, JSON.stringify(rows));
  return { dir, file };
}

module.exports = { stageExport };
