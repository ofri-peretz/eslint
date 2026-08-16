/**
 * VULNERABLE (pg driver in file) - Same, built by concatenation.
 */
import { Pool } from 'pg';
const db = new Pool();

export function search(term) {
  return db.query("SELECT * FROM items WHERE name LIKE '%" + term + "%'");
}
