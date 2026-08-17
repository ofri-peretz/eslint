/** VULNERABLE - the DESTINATION of a write, not a read. An attacker choosing
 * where bytes land is arbitrary file write. */
import fs from 'fs';
import path from 'path';
export function save(req) {
  return fs.writeFileSync(path.join('/var/data', req.body.name), req.body.content);
}
