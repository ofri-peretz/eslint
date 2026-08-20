/** VULNERABLE - path.join('/uploads', '../etc/passwd') resolves to /etc/passwd.
 * Verified in Node 24: join does not contain a `..` segment. */
import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.join('/uploads', req.params.name));
}
