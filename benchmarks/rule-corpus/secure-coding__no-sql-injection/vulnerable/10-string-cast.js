/**
 * VULNERABLE (wave 2) - `String(x)` is a call, but it is not an escaper: the value reaches the statement unchanged.
 */
import { db } from '../lib/db';

export function byOwner(req) {
  return db.query('SELECT * FROM reports WHERE owner = ' + String(req.query.owner));
}
