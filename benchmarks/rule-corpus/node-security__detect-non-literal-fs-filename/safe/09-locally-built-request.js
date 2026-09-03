/** SAFE - a `req` this file BUILDS is a fixture or a default, not an inbound
 * request. The initialiser is right there. */
import fs from 'fs';
const req = { query: { file: 'seed.json' } };
export function seed() {
  return fs.readFileSync('/data/' + req.query.file);
}
