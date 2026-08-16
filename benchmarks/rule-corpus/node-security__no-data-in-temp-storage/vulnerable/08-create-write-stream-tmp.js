/**
 * VULNERABLE - a streamed write to the shared temp directory. Streaming does
 * not change where the bytes come to rest: the archive is assembled at a fixed
 * /tmp name that any local user can read while it is being built.
 */
const fs = require('node:fs');
const archiver = require('archiver');

function buildBackupArchive(entries) {
  const out = fs.createWriteStream('/tmp/tenant-backup.zip');
  const zip = archiver('zip');
  zip.pipe(out);
  for (const entry of entries) zip.append(entry.body, { name: entry.name });
  return zip.finalize();
}

module.exports = { buildBackupArchive };
