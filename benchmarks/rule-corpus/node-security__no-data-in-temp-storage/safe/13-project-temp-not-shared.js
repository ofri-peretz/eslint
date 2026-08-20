/**
 * SAFE (adversarial) - `template`, `attempted` and `contemporary` all contain
 * the letters of a temp path. None of them is one, and the write goes to the
 * build output directory.
 */
const fs = require('node:fs');
const path = require('node:path');

function emitBuildLog(outDir, entries) {
  const lines = entries.map((e) => `attempted ${e.template} at ${e.contemporaryTs}`);
  fs.writeFileSync(path.join(outDir, 'templates', 'build.log'), lines.join('\n'));
}

module.exports = { emitBuildLog };
