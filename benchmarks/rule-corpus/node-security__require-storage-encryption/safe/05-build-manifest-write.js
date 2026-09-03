/**
 * SAFE - build output. A manifest of chunk hashes is public by construction and
 * is written on every build of every project that uses a bundler.
 */
const fs = require('node:fs');
const path = require('node:path');

function emitManifest(outDir, chunks) {
  const manifest = Object.fromEntries(chunks.map((c) => [c.name, c.hash]));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

module.exports = { emitManifest };
