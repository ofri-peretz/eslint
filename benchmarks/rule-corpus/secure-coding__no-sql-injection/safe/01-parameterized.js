/**
 * SAFE - Placeholders with a values array - the correct fix.
 */
import { db } from '../lib/db';

export function findUser(req) {
  return db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
}
