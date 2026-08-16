/**
 * VULNERABLE - Same, built by concatenation.
 */
import { db } from '../lib/database';

export function search(term) {
  return db.query("SELECT * FROM items WHERE name LIKE '%" + term + "%'");
}
