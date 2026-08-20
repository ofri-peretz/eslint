/**
 * SAFE (wave 2) - A statement that only LOOKS concatenated: both operands are literals and the values are bound.
 */
import { db } from '../lib/db';

const WHERE = ' WHERE id = $1';

export function byId(req) {
  return db.query('SELECT id, name FROM users' + WHERE, [req.params.id]);
}
