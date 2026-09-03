/** VULNERABLE - normalize COLLAPSES `..`, it does not reject it. Verified:
 * path.normalize('/safe/../etc/passwd') is '/etc/passwd'. */
import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.normalize(req.query.f));
}
