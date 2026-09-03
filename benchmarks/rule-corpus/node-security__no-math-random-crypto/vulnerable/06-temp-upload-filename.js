/**
 * VULNERABLE - predictable temporary filename for an in-flight upload.
 *
 * The path lands in a shared, world-writable directory before the file is
 * validated and moved. A local attacker who can predict the name wins the
 * race: symlink the path first and the server writes the upload wherever the
 * symlink points. The weak PRNG is what makes the prediction possible.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function stageUpload(stream, originalName) {
  const tmpName = `upload-${Math.random().toString(36).slice(2)}${path.extname(originalName)}`;
  const tmpPath = path.join(os.tmpdir(), tmpName);

  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(tmpPath, { mode: 0o644 });
    stream.pipe(out);
    out.on('finish', () => resolve(tmpPath));
    out.on('error', reject);
  });
}

module.exports = { stageUpload };
