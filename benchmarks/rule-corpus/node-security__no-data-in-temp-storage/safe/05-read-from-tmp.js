/**
 * SAFE - reading a path someone else handed us stores nothing. CWE-312 is
 * about data at rest that this code put there; a read creates no new exposure.
 */
const fs = require('fs');

function loadStagedUpload(handle) {
  if (!handle.startsWith('/tmp/')) throw new Error('not a staged upload');
  return fs.readFileSync(handle);
}

module.exports = { loadStagedUpload };
