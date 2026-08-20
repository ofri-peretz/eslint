/**
 * VULNERABLE (wave 3) - The `|| 'id'` default does not stop the left arm reaching the statement.
 */
import { db } from '../lib/db';

export function list(req) {
  const column = req.query.sort || 'id';
  return db.query('SELECT * FROM users ORDER BY ' + column);
}
