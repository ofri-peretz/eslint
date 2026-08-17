/** SAFE - path.basename strips every directory component. Verified:
 * basename('../../etc/passwd') is 'passwd'. This is also the remediation this
 * rule's own message recommends, and a rule that reports its own advice is
 * unsatisfiable. */
import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.join('/uploads', path.basename(req.query.f)));
}
