/**
 * SAFE (pg driver in file) - `?` placeholders with values.
 */
import { Pool } from 'pg';
const db = new Pool();

export function byId(req) {
  return db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
}
