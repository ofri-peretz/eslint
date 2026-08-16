/**
 * SAFE (wave 3) - `String` here is a local escaper, not the global conversion.
 */
import { db } from '../lib/db';
import { escapeLiteral } from '../lib/escape';

function String(value) {
  return escapeLiteral(value);
}

export function byOwner(req) {
  return db.query('SELECT * FROM reports WHERE owner = ' + String(req.query.owner));
}
