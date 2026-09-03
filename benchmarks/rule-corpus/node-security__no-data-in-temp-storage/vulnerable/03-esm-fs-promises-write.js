/**
 * VULNERABLE - an upload worker stages the incoming multipart body in the
 * shared temp directory under a name derived only from the field name, so two
 * concurrent uploads collide and any local user can read or pre-create it.
 * Written with the promises API, which is the default in new ESM code.
 */
import { writeFile } from 'node:fs/promises';

export async function stageUpload(field, buffer) {
  await writeFile(`/var/tmp/upload-${field}.part`, buffer);
  return `/var/tmp/upload-${field}.part`;
}
