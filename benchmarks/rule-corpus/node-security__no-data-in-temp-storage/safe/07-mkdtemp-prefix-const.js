/**
 * SAFE - mkdtemp's argument is a PREFIX, not a path. Node appends six random
 * characters to it and creates the directory 0700. Hoisting that prefix into a
 * `const` is ordinary style and changes nothing: the resolved directory is
 * still unpredictable. This is the rule's own prescribed remediation.
 */
const os = require('os');
const path = require('path');
const fsp = require('node:fs/promises');

const WORKDIR_PREFIX = path.join(os.tmpdir(), 'ingest-');

async function withWorkdir(fn) {
  const dir = await fsp.mkdtemp(WORKDIR_PREFIX);
  try {
    return await fn(dir);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

module.exports = { withWorkdir };
