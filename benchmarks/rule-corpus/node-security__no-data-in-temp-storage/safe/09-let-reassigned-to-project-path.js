/**
 * SAFE - the destination starts as a temp path but every write to the binding
 * before the sink replaces it with a project-local path, so nothing reaches
 * shared temp storage. A rule that reads only the declarator answers the wrong
 * question here.
 */
const fs = require('fs');
const path = require('path');

function writeManifest(projectRoot, manifest) {
  let dest = '/tmp/placeholder.json';
  dest = path.join(projectRoot, 'dist', 'manifest.json');
  fs.writeFileSync(dest, JSON.stringify(manifest));
  return dest;
}

module.exports = { writeManifest };
