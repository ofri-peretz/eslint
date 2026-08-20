/** VULNERABLE - the fs/promises spelling of the same sink. A sink list that
 * covers only the callback API misses every modern handler. */
import { readFile } from 'fs/promises';
export async function read(req) {
  return readFile(req.query.f, 'utf8');
}
