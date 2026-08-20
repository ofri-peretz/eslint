/**
 * VULNERABLE (wave 2) - The sink name reached through a const, not written at the call site.
 */
import { db } from '../lib/db';

const METHOD = 'query';

export function byId(req) {
  return db[METHOD]('SELECT * FROM users WHERE id = ' + req.params.id);
}
