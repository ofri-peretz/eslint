/**
 * SAFE (wave 2) - The parameter is a caller inlet, but every write to it is a literal, so nothing caller-supplied reaches the statement.
 */
import { db } from '../lib/db';

export function ordered(column) {
  column = 'created_at';
  return db.query('SELECT * FROM users ORDER BY ' + column);
}
