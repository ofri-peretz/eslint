/** SAFE - the guard that actually holds. Verified: appending path.sep stops
 * '/safebad' from passing a '/safe' prefix test. Contrast vulnerable/05. */
import fs from 'fs';
import path from 'path';
const BASE = '/safe';
export function read(req) {
  const p = path.resolve(BASE, req.query.f);
  if (!p.startsWith(BASE + path.sep)) throw new Error('denied');
  return fs.readFileSync(p);
}
