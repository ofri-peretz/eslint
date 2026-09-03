/**
 * SAFE (pg driver in file) - Placeholders with a values array - the correct fix.
 */
import { Pool } from 'pg';
const db = new Pool();

export function findUser(req) {
  return db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
}
