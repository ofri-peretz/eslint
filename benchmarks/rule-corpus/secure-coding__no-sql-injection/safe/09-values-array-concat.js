/**
 * SAFE (wave 2) - The concatenation is in the BOUND VALUES, not in the statement - a LIKE pattern done correctly.
 */
import { db } from '../lib/db';

export function search(req) {
  return db.query('SELECT * FROM items WHERE name LIKE $1', ['%' + req.query.term + '%']);
}
