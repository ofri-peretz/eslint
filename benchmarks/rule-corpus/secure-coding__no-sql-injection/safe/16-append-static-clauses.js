/**
 * SAFE (wave 3) - The same append shape, but every clause written into it is a literal.
 */
import { db } from '../lib/db';

export function list(activeOnly) {
  let sql = 'SELECT id, name FROM users WHERE 1=1';
  if (activeOnly) {
    sql += ' AND active = true';
  }
  return db.query(sql);
}
