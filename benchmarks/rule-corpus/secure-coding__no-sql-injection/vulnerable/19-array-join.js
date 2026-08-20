/**
 * VULNERABLE (wave 3) - Concatenation spelled as an array join.
 */
import { db } from '../lib/db';

export function search(req) {
  const parts = ['SELECT * FROM items WHERE name =', "'" + req.query.term + "'"];
  return db.query(parts.join(' '));
}
