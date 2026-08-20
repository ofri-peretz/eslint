/** SAFE - membership in a closed set. The attacker can only pick from names the
 * program chose, so there is no traversal to perform. */
import fs from 'fs';
const ALLOWED = ['summary.json', 'detail.json'];
export function read(req) {
  const name = req.query.name;
  if (!ALLOWED.includes(name)) throw new Error('denied');
  return fs.readFileSync('/reports/' + name);
}
