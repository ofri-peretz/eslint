/**
 * SAFE (wave 2) - The vulnerable spelling exists only as a comment; the real call is parameterised.
 *
 * Was: db.query("SELECT * FROM users WHERE email = '" + req.query.email + "'")
 */
import { db } from '../lib/db';

export function findUser(req) {
  // db.query(`SELECT * FROM users WHERE email = '${req.query.email}'`);
  return db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
}
