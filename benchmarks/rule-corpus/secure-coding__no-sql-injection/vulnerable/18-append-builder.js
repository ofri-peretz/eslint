/**
 * VULNERABLE (wave 3) - The base clause and the injected clause are separate writes to one binding.
 */
import { db } from '../lib/db';

export function search(req) {
  let sql = 'SELECT * FROM users WHERE 1=1';
  sql += " AND name = '" + req.query.name + "'";
  return db.query(sql);
}
