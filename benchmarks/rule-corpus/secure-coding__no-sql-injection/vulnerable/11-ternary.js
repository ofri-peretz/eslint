/**
 * VULNERABLE (wave 2) - One arm of a ternary is attacker-controlled.
 */
import { db } from '../lib/db';

export function list(req) {
  const order = req.query.sort ? req.query.sort : 'id';
  return db.query('SELECT * FROM users ORDER BY ' + order);
}
