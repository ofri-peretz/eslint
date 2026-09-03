/** VULNERABLE - a fixed prefix an attacker extends: `../../etc/passwd` walks
 * out of /uploads. */
import fs from 'fs';
export function read(req) {
  return fs.readFileSync(`/uploads/${req.query.f}`);
}
