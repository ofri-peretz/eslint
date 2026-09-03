/** VULNERABLE - the classic INCOMPLETE fix. Verified: '/safebad'.startsWith('/safe')
 * is true, so a sibling directory whose name merely begins with the base passes.
 * Anchoring to path.sep is what makes it hold — see safe/03. */
import fs from 'fs';
import path from 'path';
const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE)) throw new Error('denied');
  return fs.readFileSync(p);
}
