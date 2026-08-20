/** VULNERABLE - and NOT the same as join. Verified: path.resolve honours an
 * absolute second argument, so resolve('/safe','/etc/passwd') is /etc/passwd
 * while join of the same is /safe/etc/passwd. */
import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.resolve('/safe', req.query.f));
}
