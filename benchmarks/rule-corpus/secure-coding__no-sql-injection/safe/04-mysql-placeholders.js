/**
 * SAFE - `?` placeholders with values.
 */
import { db } from '../lib/db';

export function byId(req) {
  return db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
}
