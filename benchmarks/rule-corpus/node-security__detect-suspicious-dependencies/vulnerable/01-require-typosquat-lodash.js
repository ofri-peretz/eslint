/**
 * VULNERABLE - `loadsh` is the real, documented npm typosquat of `lodash`
 * (transposed `da` -> `ad`), pulled in by the most common Node loader form.
 * A build script is exactly where a squat lands: it runs with full developer
 * credentials before anyone reads the diff.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chunk } = require('loadsh');

const MANIFEST = path.join(__dirname, '..', 'dist', 'manifest.json');

function writeManifest(entries) {
  const batches = chunk(entries, 50);
  fs.writeFileSync(MANIFEST, JSON.stringify({ batches }, null, 2));
  return batches.length;
}

module.exports = { writeManifest };
